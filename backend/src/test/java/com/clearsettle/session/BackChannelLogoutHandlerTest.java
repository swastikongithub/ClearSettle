package com.clearsettle.session;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.SecurityEvents;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.client.oidc.authentication.logout.OidcLogoutToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link BackChannelLogout.Handler} after Spring Security has verified the token (H2). The PostgreSQL behaviour, on
 * two instances, is in {@code BackChannelLogoutPostgresTest}; these cover what that test cannot provoke.
 */
class BackChannelLogoutHandlerTest {

	static final String ISS = "https://idp.example.test/realms/clearsettle";
	static final String SUB = "sub-alice";
	static final Instant NOW = Instant.parse("2026-10-20T08:00:00Z");

	JdbcTemplate jdbc;
	UUID alice;

	@BeforeEach
	void database() {
		DriverManagerDataSource ds = new DriverManagerDataSource(
				"jdbc:h2:mem:bcl-" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1;MODE=PostgreSQL", "sa", "");
		new ResourceDatabasePopulator(new ClassPathResource("test-schema.sql")).execute(ds);
		jdbc = new JdbcTemplate(ds);
		alice = UUID.randomUUID();
		jdbc.update("insert into app_user(id, iss, sub, email) values (?,?,?,?)", alice, ISS, SUB, "alice@example.test");
	}

	private BackChannelLogout.Handler handler(Supplier<Integer> revocation) {
		SessionRevocation sessions = new SessionRevocation(null) {
			@Override
			public int revokeProviderSession(UUID userId, String sid) {
				return revocation.get();
			}

			@Override
			public int revokeAll(UUID userId) {
				return revocation.get();
			}
		};
		AuthProperties props = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION",
				"__Host-XSRF-TOKEN", "X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of());
		return new BackChannelLogout.Handler(new AppUserService(jdbc), sessions, new SecurityEvents(jdbc), jdbc, props,
				Clock.fixed(NOW, ZoneOffset.UTC));
	}

	private static TestingAuthenticationToken logoutToken(String jti) {
		OidcLogoutToken token = OidcLogoutToken.withTokenValue("logout-token").issuer(ISS).subject(SUB)
				.sessionId("kc-session-1").audience(List.of("clearsettle-web")).issuedAt(NOW.minusSeconds(1)).jti(jti)
				.events(Map.of("http://schemas.openid.net/event/backchannel-logout", Map.of())).build();
		return new TestingAuthenticationToken(token, null);
	}

	private static MockHttpServletRequest request(String registration) {
		return new MockHttpServletRequest("POST", "/logout/connect/back-channel/" + registration);
	}

	private int markers() {
		return jdbc.queryForObject("select count(*) from oidc_logout_token_seen", Integer.class);
	}

	private List<String> events() {
		return jdbc.queryForList("select event || ' ' || detail from security_event order by id", String.class);
	}

	@Test
	void aFailedRevocationForgetsTheTokenSoThatTheProviderCanDeliverItAgain() throws Exception {
		RuntimeException storeDown = new DataAccessResourceFailureException("session store unavailable");
		int[] calls = { 0 };
		BackChannelLogout.Handler handler = handler(() -> {
			if (calls[0]++ == 0) {
				throw storeDown;
			}
			return 2;
		});
		TestingAuthenticationToken token = logoutToken("jti-1");

		assertThatThrownBy(() -> handler.logout(request("keycloak"), new MockHttpServletResponse(), token))
				.isSameAs(storeDown);
		assertThat(markers()).as("the token is not counted as seen").isZero();
		assertThat(events()).as("nothing is recorded as done").isEmpty();

		MockHttpServletResponse again = new MockHttpServletResponse();
		handler.logout(request("keycloak"), again, token);
		assertThat(again.getStatus()).isEqualTo(200);
		assertThat(markers()).isEqualTo(1);

		MockHttpServletResponse replay = new MockHttpServletResponse();
		handler.logout(request("keycloak"), replay, token);
		assertThat(replay.getStatus()).isEqualTo(400);
		assertThat(calls[0]).as("the replay touches no session").isEqualTo(2);
		assertThat(events()).containsExactly(
				"backchannel_logout registration=keycloak scope=provider_session known_user=true revoked=2",
				"backchannel_logout_rejected registration=keycloak reason=replayed");
	}

	@Test
	void theRegistrationFromThePathIsRecordedSanitisedAndShort() throws Exception {
		BackChannelLogout.Handler handler = handler(() -> 0);

		handler.logout(request("x".repeat(500)), new MockHttpServletResponse(), logoutToken("jti-2"));
		handler.logout(request("key<cloak>"), new MockHttpServletResponse(), logoutToken("jti-3"));

		assertThat(events()).containsExactly(
				"backchannel_logout registration=" + "x".repeat(64) + " scope=provider_session known_user=true revoked=0",
				"backchannel_logout registration=key?cloak? scope=provider_session known_user=true revoked=0");
	}
}
