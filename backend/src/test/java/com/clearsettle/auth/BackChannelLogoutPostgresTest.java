package com.clearsettle.auth;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.IntFunction;

import com.clearsettle.ClearSettleApplication;
import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.type.classreading.MetadataReader;
import org.springframework.core.type.classreading.MetadataReaderFactory;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * OIDC back-channel logout on the production engine: two application instances (two separate Spring contexts, as
 * two containers would be) share one disposable PostgreSQL database as their session store, and sign in through
 * the real security filter chain against {@link StubOidcProvider}. Spring Security verifies the logout token; these
 * tests check what reaches the sessions: only the named sessions end, on both instances; the old cookie cannot
 * restore them; replays, forgeries and malformed tokens end nothing; concurrent and repeated deliveries are safe;
 * sign out everywhere still works. Runs only with {@code CS_TEST_PG_URL} (plus user and password).
 */
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_URL", matches = ".+")
class BackChannelLogoutPostgresTest {

	static final String CLIENT_SECRET = "stub-client-secret-0123456789abcdefghij";
	static final String APP = "https://app.example.test";
	static final String REDIRECT_URI = APP + "/login/oauth2/code/keycloak";
	static final String BACK_CHANNEL = APP + "/logout/connect/back-channel/keycloak";
	static final String SESSION_COOKIE = "__Host-CSSESSION";
	static final JsonMapper JSON = JsonMapper.builder().build();

	static StubOidcProvider idp;
	static Instance one;
	static Instance two;

	/** One application instance: its own Spring context, beans and in-memory state; the database is shared. */
	record Instance(ConfigurableApplicationContext context, MockMvc mvc) {
		JdbcTemplate jdbc() {
			return context.getBean(JdbcTemplate.class);
		}

		JdbcIndexedSessionRepository store() {
			return context.getBean(JdbcIndexedSessionRepository.class);
		}
	}

	@BeforeAll
	static void start() throws Exception {
		StepUpPostgresFixture.database(); // applies db/schema.sql to the disposable database
		idp = new StubOidcProvider("clearsettle-web", CLIENT_SECRET);
		one = instance();
		two = instance();
	}

	@AfterAll
	static void stop() {
		for (Instance i : new Instance[] { one, two }) {
			if (i != null) {
				i.context().close();
			}
		}
		if (idp != null) {
			idp.close();
		}
	}

	/**
	 * Keeps the test-only {@code @TestConfiguration} classes on the classpath out of these contexts: they are started
	 * outside the Spring test framework, which would otherwise exclude them, so each instance holds exactly the
	 * production beans.
	 */
	static final class ExcludeTestConfiguration extends TypeExcludeFilter {
		@Override
		public boolean match(MetadataReader reader, MetadataReaderFactory factory) {
			return reader.getAnnotationMetadata().hasAnnotation(TestConfiguration.class.getName());
		}
	}

	private static Instance instance(String... extraArgs) {
		List<String> args = new ArrayList<>(List.of(
				"--server.port=0",
				"--spring.datasource.url=" + System.getenv("CS_TEST_PG_URL"),
				"--spring.datasource.username=" + System.getenv("CS_TEST_PG_USER"),
				"--spring.datasource.password=" + System.getenv("CS_TEST_PG_PASSWORD"),
				"--clearsettle.oidc.enabled=true",
				"--clearsettle.oidc.app-base-url=" + APP,
				"--clearsettle.oidc.login-state-secret=test-login-state-secret-value",
				"--clearsettle.oidc.keycloak.issuer-uri=" + idp.issuer,
				"--clearsettle.oidc.keycloak.client-id=clearsettle-web",
				"--clearsettle.oidc.keycloak.client-secret=" + CLIENT_SECRET));
		args.addAll(List.of(extraArgs));
		ConfigurableApplicationContext ctx = new SpringApplicationBuilder(ClearSettleApplication.class)
				.initializers(c -> c.getBeanFactory().registerSingleton("excludeTestConfiguration",
						new ExcludeTestConfiguration()))
				.run(args.toArray(String[]::new));
		Filter sessions = ctx.getBean("springSessionRepositoryFilter", Filter.class);
		MockMvc mvc = MockMvcBuilders.webAppContextSetup((WebApplicationContext) ctx).addFilters(sessions)
				.apply(springSecurity()).build();
		return new Instance(ctx, mvc);
	}

	long eventsBefore;

	@BeforeEach
	void mark() {
		eventsBefore = one.jdbc().queryForObject("select coalesce(max(id), 0) from security_event", Long.class);
	}

	// ---------- helpers ----------

	private static String sub() {
		return "sub-" + UUID.randomUUID();
	}

	private static String sid() {
		return "kc-session-" + UUID.randomUUID();
	}

	/** A full sign-in on {@code on} for {@code sub}, whose ID token names the provider session {@code sid}. */
	private static Cookie signIn(Instance on, String sub, String sid) throws Exception {
		MvcResult r = on.mvc().perform(get(APP + "/oauth2/authorization/keycloak")).andReturn();
		Map<String, String> q = query(r.getResponse().getRedirectedUrl());
		Cookie loginState = r.getResponse().getCookie("__Host-CSLOGIN");
		JWTClaimsSet.Builder claims = idp.validClaims(sub, q.get("nonce"));
		if (sid != null) {
			claims.claim("sid", sid);
		}
		String code = "code-" + UUID.randomUUID();
		idp.issue(code, q.get("code_challenge"), REDIRECT_URI, StubOidcProvider.tokenResponse(idp.signed(claims.build())));
		MvcResult cb = on.mvc().perform(get(REDIRECT_URI).param("code", code).param("state", q.get("state"))
				.cookie(new Cookie(loginState.getName(), loginState.getValue()))).andReturn();
		assertThat(cb.getResponse().getRedirectedUrl()).as("signed in").isEqualTo(APP + "/");
		Cookie session = cb.getResponse().getCookie(SESSION_COOKIE);
		assertThat(session).isNotNull();
		return new Cookie(session.getName(), session.getValue());
	}

	private static int me(Instance on, Cookie session) throws Exception {
		return on.mvc().perform(get(APP + "/api/me").cookie(session)).andReturn().getResponse().getStatus();
	}

	/** {@code /api/me} on both instances: {status on one, status on two}. */
	private static List<Integer> meOnBoth(Cookie session) throws Exception {
		return List.of(me(one, session), me(two, session));
	}

	private static Object absoluteExpiresAt(Instance on, Cookie session) throws Exception {
		String body = on.mvc().perform(get(APP + "/api/session").cookie(session)).andReturn().getResponse()
				.getContentAsString();
		return JSON.readValue(body, Map.class).get("absoluteExpiresAt");
	}

	/** Posts a logout token as the provider does. Returns the status, or -1 if the request ended in an exception. */
	private static int backChannel(Instance on, String uri, String logoutToken) {
		try {
			var req = post(uri).contentType(MediaType.APPLICATION_FORM_URLENCODED);
			if (logoutToken != null) {
				req.param("logout_token", logoutToken);
			}
			MockHttpServletResponse res = on.mvc().perform(req).andReturn().getResponse();
			if (res.getStatus() == 200) {
				assertThat(res.getHeader("Cache-Control")).isEqualTo("no-store");
			}
			return res.getStatus();
		}
		catch (Exception e) {
			return -1;
		}
	}

	private static int backChannel(Instance on, String logoutToken) {
		return backChannel(on, BACK_CHANNEL, logoutToken);
	}

	private static UUID appUser(String sub) {
		return one.jdbc().queryForObject("select id from app_user where iss = ? and sub = ?", UUID.class, idp.issuer, sub);
	}

	private static int sessionRows(UUID user) {
		return one.jdbc().queryForObject("select count(*) from spring_session where principal_name = ?", Integer.class,
				user.toString());
	}

	private List<Map<String, Object>> events() {
		return one.jdbc().queryForList("select event, app_user_id, detail from security_event where id > ? order by id",
				eventsBefore);
	}

	private List<Map<String, Object>> events(String name) {
		return events().stream().filter(e -> name.equals(e.get("event"))).toList();
	}

	private static Map<String, String> query(String url) {
		Map<String, String> m = new LinkedHashMap<>();
		for (String pair : URI.create(url).getRawQuery().split("&")) {
			int i = pair.indexOf('=');
			m.put(pair.substring(0, i), URLDecoder.decode(pair.substring(i + 1), StandardCharsets.UTF_8));
		}
		return m;
	}

	// ---------- revocation reaches every instance, and only the named sessions ----------

	@Test
	void aLogoutTokenForOneProviderSessionEndsOnlyThatSessionOnBothInstances() throws Exception {
		String alice = sub();
		String aliceLaptop = sid();
		String alicePhone = sid();
		Cookie laptop = signIn(one, alice, aliceLaptop);
		Cookie phone = signIn(two, alice, alicePhone);
		// Another user whose provider session id happens to be the same: a sid is only meaningful for its user.
		Cookie bob = signIn(one, sub(), aliceLaptop);
		Object phoneExpiry = absoluteExpiresAt(two, phone);
		String token = idp.signedLogoutToken(idp.logoutClaims(alice, aliceLaptop).build());

		assertThat(backChannel(one, token)).isEqualTo(200);

		assertThat(meOnBoth(laptop)).as("the named session is refused on both instances").containsExactly(401, 401);
		assertThat(meOnBoth(phone)).as("the user's other provider session is kept").containsExactly(200, 200);
		assertThat(meOnBoth(bob)).as("another user is not affected").containsExactly(200, 200);
		assertThat(absoluteExpiresAt(one, phone)).as("the 8-hour limit of the kept session is unchanged")
				.isEqualTo(phoneExpiry);
		String laptopId = new String(Base64.getDecoder().decode(laptop.getValue()), StandardCharsets.UTF_8);
		assertThat(one.jdbc().queryForObject("select count(*) from spring_session where session_id = ?", Integer.class,
				laptopId)).as("the old cookie did not bring the session back").isZero();
		List<Map<String, Object>> done = events("backchannel_logout");
		assertThat(done).hasSize(1);
		assertThat(done.get(0).get("app_user_id")).isEqualTo(appUser(alice));
		assertThat((String) done.get(0).get("detail")).contains("scope=provider_session", "revoked=1")
				.doesNotContain(aliceLaptop);
	}

	@Test
	void aLogoutTokenWithoutSidEndsAllOfTheUsersSessionsAndNoOneElses() throws Exception {
		String alice = sub();
		Cookie laptop = signIn(one, alice, sid());
		Cookie phone = signIn(two, alice, sid());
		Cookie bob = signIn(two, sub(), sid());

		assertThat(backChannel(two, idp.signedLogoutToken(idp.logoutClaims(alice, null).build()))).isEqualTo(200);

		assertThat(meOnBoth(laptop)).containsExactly(401, 401);
		assertThat(meOnBoth(phone)).containsExactly(401, 401);
		assertThat(meOnBoth(bob)).containsExactly(200, 200);
		assertThat(sessionRows(appUser(alice))).isZero();
		assertThat((String) events("backchannel_logout").get(0).get("detail")).contains("scope=all_sessions", "revoked=2");
	}

	@Test
	void aSessionWhoseIdTokenHasNoSidEndsWithAnyLogoutOfItsUser() throws Exception {
		String alice = sub();
		Cookie unlinked = signIn(one, alice, null);
		Cookie other = signIn(one, alice, sid());

		assertThat(backChannel(two, idp.signedLogoutToken(idp.logoutClaims(alice, sid()).build()))).isEqualTo(200);

		assertThat(meOnBoth(unlinked)).as("a session that cannot be linked is ended (the safe choice)")
				.containsExactly(401, 401);
		assertThat(meOnBoth(other)).as("a session linked to another provider session is kept").containsExactly(200, 200);
	}

	@Test
	void aTokenForAnUnknownUserOrProviderSessionEndsNothingAndIsAcknowledged() throws Exception {
		String alice = sub();
		Cookie session = signIn(one, alice, sid());

		assertThat(backChannel(one, idp.signedLogoutToken(idp.logoutClaims(sub(), sid()).build()))).isEqualTo(200);
		assertThat(backChannel(two, idp.signedLogoutToken(idp.logoutClaims(alice, sid()).build()))).isEqualTo(200);

		assertThat(meOnBoth(session)).containsExactly(200, 200);
		List<Map<String, Object>> done = events("backchannel_logout");
		assertThat(done).hasSize(2);
		assertThat((String) done.get(0).get("detail")).contains("known_user=false", "revoked=0");
		assertThat((String) done.get(1).get("detail")).contains("known_user=true", "revoked=0");
	}

	// ---------- an in-flight request cannot bring a revoked session back ----------

	@Test
	@SuppressWarnings({ "rawtypes", "unchecked" })
	void aRequestThatLoadedTheSessionBeforeRevocationCannotSaveItBack() throws Exception {
		String alice = sub();
		String providerSession = sid();
		Cookie cookie = signIn(one, alice, providerSession);
		String id = new String(Base64.getDecoder().decode(cookie.getValue()), StandardCharsets.UTF_8);
		// A request on instance two has loaded the session and changed it, but not yet saved it.
		SessionRepository store = two.store();
		Session inFlight = (Session) store.findById(id);
		inFlight.setAttribute("cs.inFlight", 1);
		inFlight.setLastAccessedTime(Instant.now());

		assertThat(backChannel(one, idp.signedLogoutToken(idp.logoutClaims(alice, providerSession).build()))).isEqualTo(200);
		store.save(inFlight);

		assertThat(store.findById(id)).as("not recreated by the late save").isNull();
		assertThat(sessionRows(appUser(alice))).isZero();
		assertThat(meOnBoth(cookie)).containsExactly(401, 401);
	}

	// ---------- replays and concurrent deliveries ----------

	@Test
	void aReplayedTokenIsRefusedOnEitherInstanceAndEndsNoLaterSession() throws Exception {
		String alice = sub();
		signIn(one, alice, sid());
		String token = idp.signedLogoutToken(idp.logoutClaims(alice, null).build());
		assertThat(backChannel(one, token)).isEqualTo(200);
		Cookie later = signIn(two, alice, sid()); // signed in again after the logout

		assertThat(backChannel(two, token)).as("replayed on the other instance").isEqualTo(400);
		assertThat(backChannel(one, token)).as("replayed on the same instance").isEqualTo(400);

		assertThat(meOnBoth(later)).as("a replay ends nothing").containsExactly(200, 200);
		assertThat(events("backchannel_logout_rejected")).hasSize(2)
				.allSatisfy(e -> assertThat((String) e.get("detail")).contains("reason=replayed"))
				.allSatisfy(e -> assertThat(e.get("app_user_id")).isEqualTo(appUser(alice)));
	}

	@Test
	void concurrentDeliveriesOfOneTokenToBothInstancesActExactlyOnce() throws Exception {
		String alice = sub();
		Cookie laptop = signIn(one, alice, sid());
		Cookie phone = signIn(two, alice, sid());
		String token = idp.signedLogoutToken(idp.logoutClaims(alice, null).build());

		List<Integer> statuses = concurrently(8, i -> backChannel(i % 2 == 0 ? one : two, token));

		assertThat(statuses).filteredOn(s -> s == 200).hasSize(1);
		assertThat(statuses).filteredOn(s -> s == 400).hasSize(7);
		assertThat(meOnBoth(laptop)).containsExactly(401, 401);
		assertThat(meOnBoth(phone)).containsExactly(401, 401);
		assertThat(events("backchannel_logout")).hasSize(1);
		assertThat(events("backchannel_logout_rejected")).hasSize(7);
	}

	@Test
	void concurrentDistinctTokensForTheSameUserAreSafe() throws Exception {
		String alice = sub();
		List<Cookie> sessions = new ArrayList<>();
		for (int i = 0; i < 3; i++) {
			sessions.add(signIn(i % 2 == 0 ? one : two, alice, sid()));
		}
		List<String> tokens = new ArrayList<>();
		for (int i = 0; i < 6; i++) {
			tokens.add(idp.signedLogoutToken(idp.logoutClaims(alice, null).build()));
		}

		List<Integer> statuses = concurrently(6, i -> backChannel(i % 2 == 0 ? one : two, tokens.get(i)));

		assertThat(statuses).containsOnly(200);
		for (Cookie c : sessions) {
			assertThat(meOnBoth(c)).containsExactly(401, 401);
		}
		assertThat(sessionRows(appUser(alice))).isZero();
	}

	/**
	 * Spring Session JDBC runs each store operation in a new transaction of its own, on a connection of its own. If
	 * the handler held a connection (an open transaction) while ending sessions, every logout would need two
	 * connections at once, and as many simultaneous logouts as the pool has connections would stall the instance's
	 * whole pool. An instance with a one-connection pool shows it deterministically: it must still handle logouts,
	 * one after another and simultaneously, and still refuse a replay.
	 */
	@Test
	void theHandlerNeverNeedsTwoDatabaseConnectionsAtOnce() throws Exception {
		Instance small = instance("--spring.datasource.hikari.maximum-pool-size=1",
				"--spring.datasource.hikari.connection-timeout=1000");
		try {
			String alice = sub();
			String laptop = sid();
			Cookie onLaptop = signIn(one, alice, laptop);
			Cookie onPhone = signIn(two, alice, sid());
			String token = idp.signedLogoutToken(idp.logoutClaims(alice, laptop).build());

			assertThat(backChannel(small, token)).as("a provider-session logout").isEqualTo(200);
			assertThat(meOnBoth(onLaptop)).containsExactly(401, 401);
			assertThat(meOnBoth(onPhone)).containsExactly(200, 200);
			assertThat(backChannel(small, token)).as("its replay").isEqualTo(400);

			List<Cookie> sessions = new ArrayList<>(List.of(onPhone));
			sessions.add(signIn(one, alice, sid()));
			List<String> tokens = new ArrayList<>();
			for (int i = 0; i < 4; i++) {
				tokens.add(idp.signedLogoutToken(idp.logoutClaims(alice, null).build()));
			}
			assertThat(concurrently(4, i -> backChannel(small, tokens.get(i)))).as("simultaneous logouts")
					.containsOnly(200);
			for (Cookie c : sessions) {
				assertThat(meOnBoth(c)).containsExactly(401, 401);
			}
		}
		finally {
			small.context().close();
		}
	}

	private static List<Integer> concurrently(int n, IntFunction<Integer> call) throws Exception {
		ExecutorService pool = Executors.newFixedThreadPool(n);
		try {
			CountDownLatch go = new CountDownLatch(1);
			List<Future<Integer>> results = new ArrayList<>();
			for (int i = 0; i < n; i++) {
				int k = i;
				results.add(pool.submit(() -> {
					go.await();
					return call.apply(k);
				}));
			}
			go.countDown();
			List<Integer> statuses = new ArrayList<>();
			for (Future<Integer> f : results) {
				statuses.add(f.get());
			}
			return statuses;
		}
		finally {
			pool.shutdownNow();
		}
	}

	// ---------- forged, invalid and malformed tokens end nothing ----------

	@Test
	void forgedInvalidAndMalformedTokensAreRefusedAndEndNothing() throws Exception {
		String alice = sub();
		String providerSession = sid();
		Cookie session = signIn(one, alice, providerSession);
		Instant now = Instant.now();
		String event = "http://schemas.openid.net/event/backchannel-logout";
		JWTClaimsSet valid = idp.logoutClaims(alice, providerSession).build();
		JWTClaimsSet idToken = idp.validClaims(alice, "a-nonce").claim("sid", providerSession).build();

		Map<String, String> refused = new LinkedHashMap<>();
		refused.put("signed with another key under the provider's key id", idp.signedWithForgedKey(valid));
		refused.put("unsigned (alg none)", StubOidcProvider.unsigned(valid));
		refused.put("HS256 with the client secret", idp.hmacWithClientSecret(valid));
		refused.put("another issuer", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.issuer("https://idp.attacker.example/realms/clearsettle").build()));
		refused.put("another audience", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid).audience("other-client").build()));
		refused.put("not a back-channel logout event", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.claim("events", Map.of("http://schemas.openid.net/event/other", Map.of())).build()));
		refused.put("a nonce (an ID token's claim)", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.claim("nonce", "n").build()));
		refused.put("neither sub nor sid", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.subject(null).claim("sid", null).build()));
		refused.put("typed as an access token", idp.signedWithType(valid, "at+jwt"));
		refused.put("expired", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.issueTime(Date.from(now.minusSeconds(200))).expirationTime(Date.from(now.minusSeconds(100))).build()));
		refused.put("issued too long ago (ClearSettle's age limit)", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.issueTime(Date.from(now.minusSeconds(600))).expirationTime(Date.from(now.plusSeconds(600))).build()));
		refused.put("issued in the future", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.issueTime(Date.from(now.plusSeconds(300))).expirationTime(Date.from(now.plusSeconds(600))).build()));
		refused.put("sid without sub (ClearSettle needs sub)", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid)
				.subject(null).build()));
		refused.put("not a JWT", "not-a-jwt");
		refused.put("no logout_token parameter", null);

		// Spring Security 7.1.1 throws instead of answering 400 when one of these claims is missing; nothing is ended.
		Map<String, String> failed = new LinkedHashMap<>();
		failed.put("an ID token presented as a logout token (no events)", idp.signed(idToken));
		failed.put("no events claim", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid).claim("events", null).build()));
		failed.put("no jti", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid).jwtID(null).build()));
		failed.put("no issuer", idp.signedLogoutToken(new JWTClaimsSet.Builder(valid).issuer(null).build()));

		Map<String, Integer> outcome = new LinkedHashMap<>();
		refused.forEach((name, token) -> outcome.put(name, backChannel(one, token)));
		outcome.put("an unknown registration", backChannel(two, APP + "/logout/connect/back-channel/other",
				idp.signedLogoutToken(valid)));
		failed.forEach((name, token) -> outcome.put(name, backChannel(two, token)));

		Map<String, Integer> expected = new LinkedHashMap<>();
		refused.keySet().forEach(name -> expected.put(name, 400));
		expected.put("an unknown registration", 400);
		failed.keySet().forEach(name -> expected.put(name, -1));
		assertThat(outcome).isEqualTo(expected);
		assertThat(meOnBoth(session)).as("no refused token ended the session").containsExactly(200, 200);
		assertThat(events("backchannel_logout")).isEmpty();
		List<Map<String, Object>> rejected = events("backchannel_logout_rejected");
		assertThat(rejected).as("every refusal is recorded").hasSize(expected.size());
		assertThat(rejected).extracting(e -> (String) e.get("detail")).filteredOn(d -> d.contains("reason=too_old"))
				.hasSize(1);
		assertThat(rejected).extracting(e -> (String) e.get("detail"))
				.filteredOn(d -> d.contains("reason=issued_in_future")).hasSize(1);
		assertThat(rejected).extracting(e -> (String) e.get("detail")).filteredOn(d -> d.contains("reason=no_subject"))
				.hasSize(1);
		assertThat(rejected).extracting(e -> (String) e.get("detail"))
				.filteredOn(d -> d.contains("reason=processing_error")).hasSize(failed.size());
		assertThat(rejected).extracting(e -> (String) e.get("detail")).noneMatch(d -> d.contains(providerSession));

		// The valid token still works afterwards: none of the refusals consumed it.
		assertThat(backChannel(one, idp.signedLogoutToken(valid))).isEqualTo(200);
		assertThat(meOnBoth(session)).containsExactly(401, 401);
	}

	@Test
	void theEndpointTakesNoCsrfTokenButOnlyPost() throws Exception {
		MockHttpServletResponse res = one.mvc().perform(get(BACK_CHANNEL)).andReturn().getResponse();
		assertThat(res.getStatus()).as("GET is not a back-channel logout").isEqualTo(401);
		// The successful POSTs in the other tests carry no session, CSRF token or custom header.
	}

	// ---------- replay markers ----------

	@Test
	void replayMarkersArePurgedOnceTheirTokensArePastTheAcceptanceWindow() throws Exception {
		String old = "old-" + UUID.randomUUID();
		one.jdbc().update("insert into oidc_logout_token_seen(iss, jti, seen_at) values (?,?,?)", idp.issuer, old,
				Timestamp.from(Instant.now().minusSeconds(3600)));
		JWTClaimsSet claims = idp.logoutClaims(sub(), null).build();

		assertThat(backChannel(two, idp.signedLogoutToken(claims))).isEqualTo(200);

		assertThat(one.jdbc().queryForObject("select count(*) from oidc_logout_token_seen where jti = ?", Integer.class, old))
				.isZero();
		assertThat(one.jdbc().queryForObject("select count(*) from oidc_logout_token_seen where jti = ?", Integer.class,
				claims.getJWTID())).isEqualTo(1);
		assertThat(one.jdbc().queryForList("select column_name from information_schema.columns "
				+ "where table_name = 'oidc_logout_token_seen' order by ordinal_position", String.class))
				.as("only the issuer, the jti and when it was seen are kept").containsExactly("iss", "jti", "seen_at");
	}

	// ---------- existing sign-out paths ----------

	@Test
	void signOutEverywhereStillEndsAllOfTheUsersSessionsOnBothInstances() throws Exception {
		String alice = sub();
		Cookie laptop = signIn(one, alice, sid());
		Cookie phone = signIn(two, alice, sid());
		MockHttpServletResponse csrf = two.mvc().perform(get(APP + "/api/csrf").cookie(phone)).andReturn().getResponse();
		Cookie xsrf = csrf.getCookie("__Host-XSRF-TOKEN");

		MockHttpServletResponse out = two.mvc().perform(post(APP + "/api/session/logout-everywhere")
				.cookie(phone, new Cookie(xsrf.getName(), xsrf.getValue()))
				.header("X-XSRF-TOKEN", xsrf.getValue()).header("X-CS-Request", "1")).andReturn().getResponse();

		assertThat(out.getStatus()).isEqualTo(200);
		assertThat(JSON.readValue(out.getContentAsString(), Map.class).get("deletedSessions")).isEqualTo(2);
		assertThat(meOnBoth(laptop)).containsExactly(401, 401);
		assertThat(meOnBoth(phone)).containsExactly(401, 401);
		assertThat(events("logout_everywhere")).hasSize(1);
	}
}
