package com.clearsettle.web;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import com.clearsettle.auth.ReviewedStateChangedException;
import com.clearsettle.auth.SensitiveActions;
import com.clearsettle.auth.SensitiveOperation;
import com.clearsettle.auth.StepUpService;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.SessionAttributes;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * The sensitive-operation policy end to end through the real security chain (D-SEC-13/14, NFR-SEC-024,
 * AC-164/165), with a TEST-ONLY sensitive operation: ClearSettle has no real one yet, so production-domain
 * integration remains outstanding. The fixture's effect is a database write in the claim's transaction, so
 * "executed" is observed in the database, not inferred from a response.
 *
 * <p>The authentication evidence (acr, amr, auth_time) is set per request; the step-up re-authentication
 * itself is covered by the live tests (H group) and {@code LoginSuccessMfaGateTest}.
 */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:csstepup;DB_CLOSE_DELAY=-1;MODE=PostgreSQL")
@ActiveProfiles("test")
class SensitiveActionFlowTest {

	private static final String ISS = "https://idp.example.net/realms/clearsettle";
	private static final String TYPE = "test.fixture.transfer";
	private static final String CSRF = "csrf-test-token-value-0002";
	private static final JsonMapper JSON = JsonMapper.builder().build();

	/**
	 * Test-only sensitive operation: writes one effect row, optionally failing after the write. Its reviewed
	 * state has a version the test can change before the confirmation, or just before the operation's own check.
	 */
	static final class FixtureOperation implements SensitiveOperation {

		final AtomicInteger failuresToInject = new AtomicInteger();
		final AtomicReference<String> version = new AtomicReference<>("v1");
		final AtomicReference<String> changeAtExecution = new AtomicReference<>();
		private final JdbcTemplate jdbc;

		FixtureOperation(JdbcTemplate jdbc) {
			this.jdbc = jdbc;
		}

		@Override
		public String type() {
			return TYPE;
		}

		@Override
		public String summary(Map<String, String> params) {
			return "Test fixture: " + params.get("what");
		}

		@Override
		public String reviewedVersion(UUID userId, Map<String, String> params) {
			return version.get();
		}

		@Override
		public Map<String, Object> execute(UUID userId, Map<String, String> params, String reviewedVersion) {
			String late = changeAtExecution.getAndSet(null);
			if (late != null) {
				version.set(late); // changed after the framework's check, before this one
			}
			if (!version.get().equals(reviewedVersion)) {
				throw new ReviewedStateChangedException("fixture state changed since review");
			}
			jdbc.update("insert into security_event(event, app_user_id, detail) values ('fixture_effect', ?, ?)",
					userId, "what=" + params.get("what"));
			if (failuresToInject.getAndUpdate(n -> Math.max(0, n - 1)) > 0) {
				throw new IllegalStateException("injected failure after the effect was written");
			}
			return Map.of("done", true);
		}
	}

	/** Test-only feature endpoint, shaped like a real sensitive endpoint: request, return the challenge. */
	@RestController
	static class FixtureEndpoint {

		private final SensitiveActions actions;

		FixtureEndpoint(SensitiveActions actions) {
			this.actions = actions;
		}

		@PostMapping("/api/test-fixture/transfer")
		ResponseEntity<Map<String, Object>> request(OAuth2AuthenticationToken token,
				@RequestAttribute(SessionAttributes.APP_USER) AppUser user) {
			return SensitiveActionResponses.challenge(actions.request(user, token, TYPE, Map.of("what", "fixture-42")),
					token.getAuthorizedClientRegistrationId());
		}
	}

	@TestConfiguration
	static class Fixture {

		@Bean
		ClientRegistrationRepository clientRegistrationRepository() {
			return new InMemoryClientRegistrationRepository(SecurityChainSliceTest.keycloakRegistration());
		}

		@Bean
		FixtureOperation fixtureOperation(JdbcTemplate jdbc) {
			return new FixtureOperation(jdbc);
		}

		@Bean
		FixtureEndpoint fixtureEndpoint(SensitiveActions actions) {
			return new FixtureEndpoint(actions);
		}
	}

	@Autowired
	WebApplicationContext wac;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	FixtureOperation operation;

	@Autowired
	StepUpService pendingActions;

	@Autowired
	SensitiveActions sensitiveActions;

	MockMvc mvc;

	UUID alice;

	UUID bob;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
		jdbc.update("delete from pending_action");
		jdbc.update("delete from security_event");
		jdbc.update("delete from app_user where sub in ('alice-sa', 'bob-sa')");
		alice = UUID.randomUUID();
		bob = UUID.randomUUID();
		jdbc.update("insert into app_user(id, iss, sub, email, disabled) values (?,?,?,?,false)", alice, ISS, "alice-sa", "a@example.test");
		jdbc.update("insert into app_user(id, iss, sub, email, disabled) values (?,?,?,?,false)", bob, ISS, "bob-sa", "b@example.test");
		operation.failuresToInject.set(0);
		operation.version.set("v1");
		operation.changeAtExecution.set(null);
	}

	// ---------- authentication evidence ----------

	/** MFA evidence as Keycloak issues it, authenticated {@code ageSeconds} ago. */
	private static RequestPostProcessor as(String sub, long ageSeconds) {
		return as(sub, t -> t.claim("acr", "mfa").claim("amr", List.of("otp")).claim("auth_time", Instant.now().minusSeconds(ageSeconds)));
	}

	private static RequestPostProcessor as(String sub, Consumer<OidcIdToken.Builder> claims) {
		return oidcLogin().clientRegistration(SecurityChainSliceTest.keycloakRegistration())
				.idToken(t -> claims.accept(t.subject(sub).issuer(ISS)));
	}

	private static MockHttpServletRequestBuilder unsafe(MockHttpServletRequestBuilder b) {
		return b.cookie(new Cookie("__Host-XSRF-TOKEN", CSRF)).header("X-XSRF-TOKEN", CSRF).header("X-CS-Request", "1");
	}

	private JsonNode perform(MockHttpServletRequestBuilder b, int expectedStatus) throws Exception {
		MvcResult r = mvc.perform(b).andReturn();
		assertThat(r.getResponse().getStatus()).as(r.getResponse().getContentAsString()).isEqualTo(expectedStatus);
		return JSON.readTree(r.getResponse().getContentAsString());
	}

	private UUID requestAsFreshAlice() throws Exception {
		JsonNode body = perform(unsafe(post("/api/test-fixture/transfer")).with(as("alice-sa", 10)), 202);
		return UUID.fromString(body.get("actionId").asString());
	}

	private JsonNode confirm(UUID id, RequestPostProcessor who, int expectedStatus) throws Exception {
		return perform(unsafe(post("/api/sensitive-actions/" + id + "/confirm")).with(who), expectedStatus);
	}

	private int effects() {
		return jdbc.queryForObject("select count(*) from security_event where event = 'fixture_effect'", Integer.class);
	}

	private String status(UUID id) {
		return jdbc.queryForObject("select status from pending_action where id = ?", String.class, id);
	}

	// ---------- 1-2: request; the server decides whether a step-up is needed; nothing executes ----------

	@Test
	void freshAuthenticationGetsAConfirmationChallengeAndNothingExecutes() throws Exception {
		JsonNode body = perform(unsafe(post("/api/test-fixture/transfer")).with(as("alice-sa", 10)), 202);

		UUID id = UUID.fromString(body.get("actionId").asString());
		assertThat(body.get("status").asString()).isEqualTo("confirmation_required");
		assertThat(body.get("reviewUrl").asString()).isEqualTo("/review?action=" + id);
		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();
	}

	@Test
	void authenticationOlderThanFiveMinutesGetsStepUpRequiredAndNothingExecutes() throws Exception {
		JsonNode body = perform(unsafe(post("/api/test-fixture/transfer")).with(as("alice-sa", 301)), 401);

		UUID id = UUID.fromString(body.get("actionId").asString());
		assertThat(body.get("error").asString()).isEqualTo("step_up_required");
		assertThat(body.get("stepUpUrl").asString()).isEqualTo("/oauth2/authorization/keycloak?step_up=" + id);
		assertThat(body.get("reasons").toString()).contains("auth_time_too_old");
		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();
	}

	@Test
	void missingWeakOrFutureEvidenceGetsStepUpRequired() throws Exception {
		Map<String, Consumer<OidcIdToken.Builder>> cases = Map.of(
				"acr_insufficient", t -> t.claim("acr", "pwd").claim("amr", List.of("pwd")).claim("auth_time", Instant.now()),
				"amr_insufficient", t -> t.claim("acr", "mfa").claim("amr", List.of()).claim("auth_time", Instant.now()),
				"amr_missing", t -> t.claim("acr", "mfa").claim("auth_time", Instant.now()),
				"auth_time_missing", t -> t.claim("acr", "mfa").claim("amr", List.of("otp")),
				"auth_time_in_future", t -> t.claim("acr", "mfa").claim("amr", List.of("otp")).claim("auth_time", Instant.now().plusSeconds(600)));
		for (var c : cases.entrySet()) {
			JsonNode body = perform(unsafe(post("/api/test-fixture/transfer")).with(as("alice-sa", c.getValue())), 401);
			assertThat(body.get("reasons").toString()).as(c.getKey()).contains(c.getKey());
		}
		assertThat(effects()).isZero();
	}

	// ---------- 5-7: explicit, single-use confirmation bound to the user and the action ----------

	@Test
	void confirmationExecutesTheReviewedActionExactlyOnceAndAReplayIsRefused() throws Exception {
		UUID id = requestAsFreshAlice();
		JsonNode review = perform(get("/api/sensitive-actions/" + id).with(as("alice-sa", 10)), 200);
		assertThat(review.get("summary").asString()).isEqualTo("Test fixture: fixture-42");
		assertThat(review.get("stepUpRequired").asBoolean()).isFalse();
		assertThat(effects()).isZero();

		JsonNode done = confirm(id, as("alice-sa", 20), 200);

		assertThat(done.get("status").asString()).isEqualTo("executed");
		assertThat(done.get("result").get("done").asBoolean()).isTrue();
		assertThat(effects()).isEqualTo(1);
		assertThat(jdbc.queryForObject("select detail from security_event where event = 'fixture_effect'", String.class))
				.isEqualTo("what=fixture-42"); // the stored, reviewed parameters were executed
		assertThat(status(id)).isEqualTo("EXECUTED");

		assertThat(confirm(id, as("alice-sa", 20), 409).get("error").asString()).isEqualTo("action_not_pending");
		assertThat(effects()).isEqualTo(1);
	}

	@Test
	void confirmationWithStaleAuthenticationRequiresAStepUpAndSucceedsOnlyAfterFreshAuthentication() throws Exception {
		UUID id = requestAsFreshAlice();

		JsonNode refused = confirm(id, as("alice-sa", 400), 401);
		assertThat(refused.get("error").asString()).isEqualTo("step_up_required");
		assertThat(refused.get("stepUpUrl").asString()).isEqualTo("/oauth2/authorization/keycloak?step_up=" + id);
		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();
		JsonNode review = perform(get("/api/sensitive-actions/" + id).with(as("alice-sa", 400)), 200);
		assertThat(review.get("stepUpRequired").asBoolean()).isTrue();

		// After the step-up the session carries a fresh authentication (auth_time just now).
		confirm(id, as("alice-sa", 5), 200);
		assertThat(effects()).isEqualTo(1);
	}

	@Test
	void confirmationWithoutAVerifiedSecondFactorIsRefused() throws Exception {
		UUID id = requestAsFreshAlice();
		JsonNode refused = confirm(id, as("alice-sa", t -> t.claim("acr", "mfa").claim("amr", List.of()).claim("auth_time", Instant.now())), 401);
		assertThat(refused.get("reasons").toString()).contains("amr_insufficient");
		assertThat(effects()).isZero();
	}

	@Test
	void anotherUsersActionCannotBeReviewedConfirmedOrCancelled() throws Exception {
		UUID id = requestAsFreshAlice();

		perform(get("/api/sensitive-actions/" + id).with(as("bob-sa", 10)), 404);
		assertThat(confirm(id, as("bob-sa", 10), 404).get("error").asString()).isEqualTo("action_not_found");
		perform(unsafe(post("/api/sensitive-actions/" + id + "/cancel")).with(as("bob-sa", 10)), 409);

		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();
		confirm(id, as("alice-sa", 10), 200); // still the owner's to confirm
	}

	@Test
	void unknownActionIsRefused() throws Exception {
		assertThat(confirm(UUID.randomUUID(), as("alice-sa", 10), 404).get("error").asString()).isEqualTo("action_not_found");
	}

	@Test
	void expiredActionIsRefusedAndCanNoLongerStartAStepUp() throws Exception {
		UUID id = requestAsFreshAlice();
		jdbc.update("update pending_action set created_at = ? where id = ?",
				OffsetDateTime.ofInstant(Instant.now().minusSeconds(301), ZoneOffset.UTC), id);

		assertThat(confirm(id, as("alice-sa", 5), 410).get("error").asString()).isEqualTo("action_expired");
		assertThat(pendingActions.isPendingForUser(id, alice)).isFalse();
		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();
	}

	@Test
	void cancelledActionCannotBeConfirmed() throws Exception {
		UUID id = requestAsFreshAlice();
		perform(unsafe(post("/api/sensitive-actions/" + id + "/cancel")).with(as("alice-sa", 10)), 200);
		assertThat(confirm(id, as("alice-sa", 10), 409).get("error").asString()).isEqualTo("action_not_pending");
		assertThat(status(id)).isEqualTo("CANCELLED");
		assertThat(effects()).isZero();
	}

	@Test
	void confirmationNeedsTheCsrfTokenAndTheCustomHeader() throws Exception {
		UUID id = requestAsFreshAlice();
		String path = "/api/sensitive-actions/" + id + "/confirm";

		assertThat(perform(post(path).with(as("alice-sa", 10)).header("X-CS-Request", "1"), 403).get("error").asString())
				.startsWith("csrf");
		assertThat(perform(post(path).with(as("alice-sa", 10)).cookie(new Cookie("__Host-XSRF-TOKEN", CSRF))
				.header("X-XSRF-TOKEN", CSRF), 403).get("error").asString()).isEqualTo("custom_header_missing");
		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();
	}

	@Test
	void aFailedOperationRollsBackItsClaimAndItsEffect() throws Exception {
		UUID id = requestAsFreshAlice();
		operation.failuresToInject.set(1);

		assertThat(confirm(id, as("alice-sa", 10), 500).get("error").asString()).isEqualTo("operation_failed");
		assertThat(status(id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();

		confirm(id, as("alice-sa", 10), 200);
		assertThat(effects()).isEqualTo(1);
	}

	@Test
	void anUnregisteredActionTypeIsNeverExecuted() throws Exception {
		UUID id = pendingActions.begin(alice, "unregistered.type", Map.of(), "v1");
		assertThat(confirm(id, as("alice-sa", 10), 422).get("error").asString()).isEqualTo("action_type_unsupported");
		assertThat(status(id)).isEqualTo("PENDING");
	}

	// ---------- what executes is what was reviewed ----------

	@Test
	void aChangeAfterTheReviewIsRefusedAndWithdrawsTheAction() throws Exception {
		UUID id = requestAsFreshAlice();
		assertThat(perform(get("/api/sensitive-actions/" + id).with(as("alice-sa", 10)), 200).get("changed").asBoolean()).isFalse();
		operation.version.set("v2");

		assertThat(perform(get("/api/sensitive-actions/" + id).with(as("alice-sa", 10)), 200).get("changed").asBoolean()).isTrue();
		assertThat(confirm(id, as("alice-sa", 10), 409).get("error").asString()).isEqualTo("action_changed");
		assertThat(status(id)).as("withdrawn: it can never be confirmed").isEqualTo("CANCELLED");
		assertThat(effects()).isZero();
		operation.version.set("v1");
		assertThat(confirm(id, as("alice-sa", 10), 409).get("error").asString()).isEqualTo("action_not_pending");
		assertThat(effects()).isZero();
	}

	@Test
	void aChangeTheOperationDetectsUnderLockRollsBackAndWithdrawsTheAction() throws Exception {
		UUID id = requestAsFreshAlice();
		operation.changeAtExecution.set("v2");

		assertThat(confirm(id, as("alice-sa", 10), 409).get("error").asString()).isEqualTo("action_changed");
		assertThat(status(id)).isEqualTo("CANCELLED");
		assertThat(effects()).isZero();
	}

	@Test
	void anActionWithoutAReviewedVersionIsNeverExecuted() throws Exception {
		UUID id = UUID.randomUUID();
		jdbc.update("insert into pending_action(id, user_id, action_type, context, status, created_at) values (?,?,?,?, 'PENDING', ?)",
				id, alice, TYPE, "{\"what\":\"fixture-42\"}", OffsetDateTime.now(ZoneOffset.UTC));

		assertThat(confirm(id, as("alice-sa", 10), 409).get("error").asString()).isEqualTo("action_changed");
		assertThat(effects()).isZero();
	}

	@Test
	void requestingAnUnregisteredOperationIsAProgrammingError() {
		AppUser user = new AppUser(alice, ISS, "alice-sa", "a@example.test", false);
		OidcIdToken idToken = OidcIdToken.withTokenValue("t").claim("iss", ISS).claim("sub", "alice-sa").build();
		var token = new OAuth2AuthenticationToken(new DefaultOidcUser(AuthorityUtils.NO_AUTHORITIES, idToken),
				AuthorityUtils.NO_AUTHORITIES, "keycloak");
		assertThatThrownBy(() -> sensitiveActions.request(user, token, "not.registered", Map.of()))
				.isInstanceOf(IllegalArgumentException.class);
		assertThat(jdbc.queryForObject("select count(*) from pending_action", Integer.class)).isZero();
	}

	@Test
	void everyStepIsRecordedAsASecurityEvent() throws Exception {
		UUID id = requestAsFreshAlice();
		confirm(id, as("alice-sa", 400), 401);
		confirm(id, as("alice-sa", 10), 200);
		confirm(id, as("alice-sa", 10), 409);
		List<String> events = jdbc.queryForList(
				"select event || ':' || coalesce(detail, '') from security_event where app_user_id = ? and event like 'sensitive_action%' order by id",
				String.class, alice);
		assertThat(events).hasSize(4);
		assertThat(events.get(0)).startsWith("sensitive_action_requested:type=" + TYPE).contains("step_up_required=false");
		assertThat(events.get(1)).startsWith("sensitive_action_refused:").contains("reason=step_up_required", "evidence=auth_time_too_old");
		assertThat(events.get(2)).startsWith("sensitive_action_executed:type=" + TYPE);
		assertThat(events.get(3)).startsWith("sensitive_action_refused:").contains("reason=not_pending");
	}
}
