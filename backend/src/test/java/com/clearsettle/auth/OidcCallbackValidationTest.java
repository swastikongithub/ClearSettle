package com.clearsettle.auth;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * AC-157 token and callback tampering, deterministic: the REAL client registration (built by
 * {@code ClientRegistrationConfig} from OIDC discovery), the real security filter chain and the real Spring
 * Session JDBC store (H2) run against {@link StubOidcProvider}, which returns exactly the ID token each test
 * chooses. Every tampered callback must be rejected, leave no persisted security context, provision no
 * application user, and be recorded as a security event. Spring Security performs the cryptographic and claim
 * validation; nothing here relaxes it.
 */
@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:csoidc;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
		"clearsettle.oidc.enabled=true",
		"clearsettle.oidc.keycloak.client-id=clearsettle-web",
		"clearsettle.oidc.keycloak.client-secret=" + OidcCallbackValidationTest.CLIENT_SECRET })
@ActiveProfiles("test")
class OidcCallbackValidationTest {

	/** Long enough to be a valid HS256 key, so the algorithm-confusion forgery is well-formed. */
	static final String CLIENT_SECRET = "stub-client-secret-0123456789abcdefghij";
	static final String APP = "https://app.example.test";
	static final String REDIRECT_URI = APP + "/login/oauth2/code/keycloak";

	static final StubOidcProvider IDP = new StubOidcProvider("clearsettle-web", CLIENT_SECRET);

	@DynamicPropertySource
	static void issuer(DynamicPropertyRegistry registry) {
		registry.add("clearsettle.oidc.keycloak.issuer-uri", () -> IDP.issuer);
	}

	@AfterAll
	static void stop() {
		IDP.close();
	}

	@Autowired
	WebApplicationContext wac;

	@Autowired
	@Qualifier("springSessionRepositoryFilter")
	Filter sessionRepositoryFilter;

	@Autowired
	JdbcTemplate jdbc;

	MockMvc mvc;

	long eventsBefore;

	@BeforeEach
	void setUp() {
		// The Spring Session filter is added so sessions really go through the JDBC repository.
		mvc = MockMvcBuilders.webAppContextSetup(wac).addFilters(sessionRepositoryFilter).apply(springSecurity()).build();
		jdbc.update("delete from SPRING_SESSION");
		eventsBefore = jdbc.queryForObject("select coalesce(max(id), 0) from security_event", Long.class);
	}

	/** The browser's view of one started login: the authorization request and the login-state cookie. */
	record Started(Map<String, String> query, Cookie loginState) {
		String state() { return query.get("state"); }
		String nonce() { return query.get("nonce"); }
		String challenge() { return query.get("code_challenge"); }
	}

	private Started start(String origin) throws Exception {
		MvcResult r = mvc.perform(get(origin + "/oauth2/authorization/keycloak")).andReturn();
		assertThat(r.getResponse().getStatus()).isEqualTo(302);
		assertThat(r.getResponse().getCookie("__Host-CSSESSION")).as("no session before authentication").isNull();
		Cookie login = r.getResponse().getCookie("__Host-CSLOGIN");
		assertThat(login).isNotNull();
		return new Started(query(r.getResponse().getRedirectedUrl()), new Cookie(login.getName(), login.getValue()));
	}

	private Started start() throws Exception {
		return start(APP);
	}

	private MvcResult callback(Started s, String code, String state) throws Exception {
		return mvc.perform(get(REDIRECT_URI).param("code", code).param("state", state).cookie(s.loginState())).andReturn();
	}

	/** Issues a code bound to this authorization request and delivers it to the callback with that request's state. */
	private MvcResult loginWith(Started s, String tokenResponse) throws Exception {
		String code = "code-" + UUID.randomUUID();
		IDP.issue(code, s.challenge(), REDIRECT_URI, tokenResponse);
		return callback(s, code, s.state());
	}

	private MvcResult loginWithIdToken(Started s, String idToken) throws Exception {
		return loginWith(s, StubOidcProvider.tokenResponse(idToken));
	}

	private static String sub() {
		return "sub-" + UUID.randomUUID();
	}

	// ---------- positive control ----------

	@Test
	void validCallbackEstablishesAPersistedSessionForTheIssuerSubjectPair() throws Exception {
		Started s = start();
		assertThat(s.query()).containsEntry("response_type", "code").containsEntry("code_challenge_method", "S256")
				.containsEntry("redirect_uri", REDIRECT_URI).containsKeys("state", "nonce");
		assertThat(s.challenge()).hasSize(43);
		String sub = sub();
		int refusals = IDP.tokenRefusals.size();
		int redeemed = IDP.redeemedCodes.size();

		MvcResult r = loginWithIdToken(s, IDP.signed(IDP.validClaims(sub, s.nonce()).build()));

		assertThat(r.getResponse().getRedirectedUrl()).isEqualTo(APP + "/");
		Cookie session = r.getResponse().getCookie("__Host-CSSESSION");
		assertThat(session).isNotNull();
		assertThat(mvc.perform(get(APP + "/api/me").cookie(session)).andReturn().getResponse().getStatus()).isEqualTo(200);
		assertThat(jdbc.queryForObject("select count(*) from app_user where iss = ? and sub = ?", Integer.class, IDP.issuer, sub))
				.isEqualTo(1);
		assertThat(persistedSecurityContexts()).isEqualTo(1);
		assertThat(events("login_success")).isEqualTo(1);
		// The code was redeemed, which the provider does only after client authentication, the exact
		// redirect URI and the PKCE verifier have all matched; nothing was refused on the way.
		assertThat(IDP.redeemedCodes).hasSize(redeemed + 1);
		assertThat(IDP.tokenRefusals).hasSize(refusals);
		// F-3: the access and refresh tokens the provider returned are not in the persisted session.
		assertThat(sessionBytesContain("stub-access-token-value-0001")).isFalse();
		assertThat(sessionBytesContain("stub-refresh-token-value-0001")).isFalse();
	}

	@Test
	void redirectUriNeverDependsOnTheRequestHost() throws Exception {
		Started s = start("https://evil.example");
		assertThat(s.query()).containsEntry("redirect_uri", REDIRECT_URI);
	}

	// ---------- ID token tampering ----------

	@Test
	void forgedSignatureIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		assertRefused(loginWithIdToken(s, IDP.signedWithForgedKey(IDP.validClaims(sub, s.nonce()).build())), "invalid_id_token", sub);
	}

	@Test
	void unsignedTokenIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		assertRefused(loginWithIdToken(s, StubOidcProvider.unsigned(IDP.validClaims(sub, s.nonce()).build())), "invalid_id_token", sub);
	}

	@Test
	void tokenSignedWithTheClientSecretIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		assertRefused(loginWithIdToken(s, IDP.hmacWithClientSecret(IDP.validClaims(sub, s.nonce()).build())), "invalid_id_token", sub);
	}

	@Test
	void wrongIssuerIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		JWTClaimsSet c = IDP.validClaims(sub, s.nonce()).issuer("https://attacker.example/realms/clearsettle").build();
		assertRefused(loginWithIdToken(s, IDP.signed(c)), "invalid_id_token", sub);
	}

	@Test
	void wrongAudienceIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		JWTClaimsSet c = IDP.validClaims(sub, s.nonce()).audience("another-client").claim("azp", "another-client").build();
		assertRefused(loginWithIdToken(s, IDP.signed(c)), "invalid_id_token", sub);
	}

	@Test
	void expiredTokenIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		Instant now = Instant.now();
		JWTClaimsSet c = IDP.validClaims(sub, s.nonce()).issueTime(Date.from(now.minusSeconds(900)))
				.expirationTime(Date.from(now.minusSeconds(120))).build();
		assertRefused(loginWithIdToken(s, IDP.signed(c)), "invalid_id_token", sub);
	}

	@Test
	void missingNonceIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		JWTClaimsSet c = IDP.validClaims(sub, s.nonce()).claim("nonce", null).build();
		assertRefused(loginWithIdToken(s, IDP.signed(c)), "invalid_nonce", sub);
	}

	@Test
	void mismatchedNonceIsRejected() throws Exception {
		Started s = start();
		String sub = sub();
		assertRefused(loginWithIdToken(s, IDP.signed(IDP.validClaims(sub, "nonce-from-another-login").build())), "invalid_nonce", sub);
	}

	@Test
	void tokenResponseWithoutAnIdTokenIsRejected() throws Exception {
		Started s = start();
		assertRefused(loginWith(s, StubOidcProvider.tokenResponse(null)), "invalid_id_token", null);
	}

	// ---------- MFA assurance (the token is valid; the evidence is not) ----------

	@Test
	void validTokenWithoutVerifiedSecondFactorGetsNoSession() throws Exception {
		Started s = start();
		String sub = sub();
		// What Keycloak issues for the TOTP enrolment login: acr=mfa with no verified factor in amr.
		JWTClaimsSet c = IDP.validClaims(sub, s.nonce()).claim("amr", List.of()).build();
		assertRefused(loginWithIdToken(s, IDP.signed(c)), "mfa_not_verified", sub, "login_refused_mfa_required");
	}

	@Test
	void validPasswordOnlyTokenGetsNoSession() throws Exception {
		Started s = start();
		String sub = sub();
		JWTClaimsSet c = IDP.validClaims(sub, s.nonce()).claim("acr", "pwd").claim("amr", List.of("pwd")).build();
		assertRefused(loginWithIdToken(s, IDP.signed(c)), "mfa_required", sub, "login_refused_mfa_required");
	}

	// ---------- state, login-state cookie, PKCE, code replay ----------

	@Test
	void wrongStateIsRejectedBeforeAnyCodeIsRedeemed() throws Exception {
		Started s = start();
		int refusals = IDP.tokenRefusals.size();
		int redeemed = IDP.redeemedCodes.size();
		String code = "code-" + UUID.randomUUID();
		IDP.issue(code, s.challenge(), REDIRECT_URI, StubOidcProvider.tokenResponse(IDP.signed(IDP.validClaims(sub(), s.nonce()).build())));
		assertRefused(callback(s, code, "attacker-chosen-state"), "authorization_request_not_found", null);
		assertThat(IDP.tokenRefusals).hasSize(refusals);
		assertThat(IDP.redeemedCodes).hasSize(redeemed);
	}

	@Test
	void callbackWithoutTheLoginStateCookieIsRejected() throws Exception {
		Started s = start();
		MvcResult r = mvc.perform(get(REDIRECT_URI).param("code", "code-" + UUID.randomUUID()).param("state", s.state())).andReturn();
		assertRefused(r, "authorization_request_not_found", null);
	}

	@Test
	void tamperedLoginStateCookieIsRejected() throws Exception {
		Started s = start();
		char[] v = s.loginState().getValue().toCharArray();
		v[v.length / 2] = v[v.length / 2] == 'A' ? 'B' : 'A';
		MvcResult r = mvc.perform(get(REDIRECT_URI).param("code", "code-" + UUID.randomUUID()).param("state", s.state())
				.cookie(new Cookie("__Host-CSLOGIN", new String(v)))).andReturn();
		assertRefused(r, "authorization_request_not_found", null);
	}

	@Test
	void codeFromAnotherLoginAttemptFailsPkceAndGetsNoSession() throws Exception {
		// The attacker's code was issued to THEIR authorization request (their code_challenge); it is injected
		// into the victim's callback with the victim's state and login-state cookie.
		Started attacker = start();
		Started victim = start();
		String sub = sub();
		String code = "code-" + UUID.randomUUID();
		IDP.issue(code, attacker.challenge(), REDIRECT_URI,
				StubOidcProvider.tokenResponse(IDP.signed(IDP.validClaims(sub, victim.nonce()).build())));
		assertRefused(callback(victim, code, victim.state()), "invalid_grant", sub);
		assertThat(IDP.tokenRefusals).last().isEqualTo("pkce_mismatch");
	}

	@Test
	void replayedCallbackIsRejectedAndCreatesNoSecondSession() throws Exception {
		Started s = start();
		String sub = sub();
		String code = "code-" + UUID.randomUUID();
		IDP.issue(code, s.challenge(), REDIRECT_URI, StubOidcProvider.tokenResponse(IDP.signed(IDP.validClaims(sub, s.nonce()).build())));
		MvcResult first = callback(s, code, s.state());
		assertThat(first.getResponse().getRedirectedUrl()).isEqualTo(APP + "/");
		long before = jdbc.queryForObject("select coalesce(max(id), 0) from security_event", Long.class);

		// The same callback again, with the same (stateless) login-state cookie value.
		MvcResult replay = callback(s, code, s.state());

		assertThat(replay.getResponse().getRedirectedUrl()).isEqualTo(APP + "/?auth_error=invalid_grant");
		assertThat(replay.getResponse().getCookie("__Host-CSSESSION")).isNull();
		assertThat(IDP.tokenRefusals).last().isEqualTo("code_reused");
		assertThat(persistedSecurityContexts()).isEqualTo(1);
		assertThat(jdbc.queryForObject("select count(*) from security_event where id > ? and event = 'login_failure'",
				Integer.class, before)).isEqualTo(1);
	}

	// ---------- helpers ----------

	private void assertRefused(MvcResult r, String code, String sub) throws Exception {
		assertRefused(r, code, sub, "login_failure");
	}

	private void assertRefused(MvcResult r, String code, String sub, String event) throws Exception {
		assertThat(r.getResponse().getStatus()).isEqualTo(302);
		assertThat(r.getResponse().getRedirectedUrl()).isEqualTo(APP + "/?auth_error=" + code);
		Cookie session = r.getResponse().getCookie("__Host-CSSESSION");
		if (session != null && !session.getValue().isEmpty()) {
			assertThat(mvc.perform(get(APP + "/api/me").cookie(session)).andReturn().getResponse().getStatus()).isEqualTo(401);
		}
		assertThat(persistedSecurityContexts()).as("no persisted security context").isZero();
		if (sub != null) {
			assertThat(jdbc.queryForObject("select count(*) from app_user where sub = ?", Integer.class, sub))
					.as("no application user provisioned").isZero();
		}
		assertThat(events(event)).as("refusal recorded as a security event").isEqualTo(1);
	}

	private int persistedSecurityContexts() {
		return jdbc.queryForObject("select count(*) from SPRING_SESSION_ATTRIBUTES where ATTRIBUTE_NAME = 'SPRING_SECURITY_CONTEXT'",
				Integer.class);
	}

	private boolean sessionBytesContain(String needle) {
		return jdbc.queryForList("select ATTRIBUTE_BYTES from SPRING_SESSION_ATTRIBUTES", byte[].class).stream()
				.anyMatch(b -> new String(b, StandardCharsets.ISO_8859_1).contains(needle));
	}

	private int events(String event) {
		return jdbc.queryForObject("select count(*) from security_event where id > ? and event = ?", Integer.class,
				eventsBefore, event);
	}

	private static Map<String, String> query(String url) {
		Map<String, String> m = new LinkedHashMap<>();
		String q = URI.create(url).getRawQuery();
		for (String pair : q.split("&")) {
			int i = pair.indexOf('=');
			m.put(URLDecoder.decode(pair.substring(0, i), StandardCharsets.UTF_8),
					URLDecoder.decode(pair.substring(i + 1), StandardCharsets.UTF_8));
		}
		return m;
	}
}
