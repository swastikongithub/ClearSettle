package com.clearsettle.auth;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.SecurityEvents;
import com.clearsettle.security.SessionAttributes;
import com.clearsettle.session.StashingAuthorizationRequestRepository;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.MapSession;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * The OIDC success handler's security decisions, with mock servlet objects (no live IdP):
 * <ul>
 *   <li>D-SEC-14 universal MFA gate: acr must be strong AND amr must contain a second factor (Keycloak
 *       reports acr=mfa with an empty amr on the enrolment login — found in M1 integration testing).</li>
 *   <li>Step-up under SameSite=Strict (M1 integration defect): the callback arrives in a NEW session, so
 *       the originating session must be found via the nonce, its absolute anchor preserved, and it must be
 *       retired; a different person completing the step-up must end the victim's originating session.</li>
 * </ul>
 */
class LoginSuccessMfaGateTest {

	private static final String ISS = "https://idp.example.net/realms/clearsettle";
	private static final String SUB = "alice-subject";
	private static final UUID ALICE = UUID.randomUUID();

	private final AuthProperties props = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION",
			"__Host-XSRF-TOKEN", "X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of(),
			Map.of("keycloak", List.of("otp")));

	/** Minimal in-memory session repository with principal-name indexing. */
	static final class Sessions implements FindByIndexNameSessionRepository<MapSession> {
		final Map<String, MapSession> store = new ConcurrentHashMap<>();
		public MapSession createSession() { return new MapSession(); }
		public void save(MapSession s) { store.put(s.getId(), s); }
		public MapSession findById(String id) { return store.get(id); }
		public void deleteById(String id) { store.remove(id); }
		public Map<String, MapSession> findByIndexNameAndIndexValue(String indexName, String indexValue) {
			Map<String, MapSession> out = new HashMap<>();
			store.forEach((id, s) -> { if (indexValue.equals(s.getAttribute(PRINCIPAL_NAME_INDEX_NAME))) out.put(id, s); });
			return out;
		}
	}

	private OAuth2AuthenticationToken token(String sub, String acr, List<String> amr) {
		OidcIdToken.Builder b = OidcIdToken.withTokenValue("dummy-id-token").claim("iss", ISS).claim("sub", sub).claim("acr", acr);
		if (amr != null) {
			b.claim("amr", amr);
		}
		OidcUser user = new DefaultOidcUser(AuthorityUtils.createAuthorityList("ROLE_USER"), b.build());
		return new OAuth2AuthenticationToken(user, user.getAuthorities(), "keycloak");
	}

	private AppUserService users() {
		AppUserService users = Mockito.mock(AppUserService.class);
		AppUser alice = new AppUser(ALICE, ISS, SUB, "alice@example.test", false);
		Mockito.when(users.find(ISS, SUB)).thenReturn(Optional.of(alice));
		Mockito.when(users.findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any())).thenReturn(alice);
		return users;
	}

	private MockHttpServletRequest stepUpCallback(String nonce, String actionId) {
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		req.setSession(new MockHttpSession()); // a NEW session: the Strict cookie was not sent
		OAuth2AuthorizationRequest consumed = OAuth2AuthorizationRequest.authorizationCode()
				.authorizationUri("https://idp/auth").clientId("c").redirectUri("https://app/cb").state("s")
				.attributes(a -> {
					a.put(StepUpAuthorizationRequestResolver.ATTR_ISS, ISS);
					a.put(StepUpAuthorizationRequestResolver.ATTR_SUB, SUB);
					a.put(StepUpAuthorizationRequestResolver.ATTR_ACTION, actionId);
					a.put(StepUpAuthorizationRequestResolver.ATTR_SESSION_NONCE, nonce);
				}).build();
		req.setAttribute(StashingAuthorizationRequestRepository.CONSUMED, consumed);
		return req;
	}

	private MapSession originatingSession(Sessions sessions, String nonce, long anchor) {
		MapSession s = new MapSession();
		s.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, ALICE.toString());
		s.setAttribute(SessionAttributes.STEP_UP_NONCE, nonce);
		s.setAttribute(SessionAttributes.AUTHENTICATED_AT, anchor);
		sessions.save(s);
		return s;
	}

	// ---- universal MFA gate ----

	@Test
	void loginWithWeakAcrIsRefusedAndNoUserProvisioned() throws Exception {
		AppUserService users = users();
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users, events, "https://app.example.test", new Sessions());
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "pwd", List.of("pwd")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=mfa_required");
		assertThat(req.getSession(false)).isNull();
		verify(users, never()).findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any());
		verify(events).record(Mockito.eq("login_refused_mfa_required"), Mockito.isNull(), Mockito.contains("reason=acr_insufficient"));
	}

	@Test
	void strongAcrWithoutSecondFactorAmrIsRefused() throws Exception {
		// Exactly what Keycloak issues on the enrolment login: acr=mfa, amr=[].
		AppUserService users = users();
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users, events, "https://app.example.test", new Sessions());
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of()));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=mfa_required");
		verify(users, never()).findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any());
		verify(events).record(Mockito.eq("login_refused_mfa_required"), Mockito.isNull(), Mockito.contains("reason=amr_insufficient"));
	}

	@Test
	void strongAcrWithMissingAmrClaimIsRefused() throws Exception {
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users(), events, "https://app.example.test", new Sessions());
		MockHttpServletResponse res = new MockHttpServletResponse();
		handler.onAuthenticationSuccess(new MockHttpServletRequest(), res, token(SUB, "mfa", null));
		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=mfa_required");
	}

	@Test
	void strongAcrWithOtpAmrProceedsToProvisioning() throws Exception {
		AppUserService users = users();
		var handler = new LoginHandlers.Success(props, users, Mockito.mock(SecurityEvents.class), "https://app.example.test", new Sessions());
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of("otp")));

		verify(users).findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any());
		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/");
		assertThat(req.getSession(false).getAttribute(SessionAttributes.AUTHENTICATED_AT)).isNotNull();
	}

	// ---- step-up continuity under SameSite=Strict ----

	@Test
	void stepUpPreservesTheOriginalAbsoluteAnchorAndRetiresTheOriginatingSession() throws Exception {
		Sessions sessions = new Sessions();
		long anchor = 1_700_000_000L; // the original authentication time
		MapSession origin = originatingSession(sessions, "nonce-1", anchor);
		var handler = new LoginHandlers.Success(props, users(), Mockito.mock(SecurityEvents.class), "https://app.example.test", sessions);
		String action = UUID.randomUUID().toString();
		MockHttpServletRequest req = stepUpCallback("nonce-1", action);
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of("otp")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/review?action=" + action);
		assertThat(req.getSession(false).getAttribute(SessionAttributes.AUTHENTICATED_AT))
				.as("step-up must not reset the absolute-lifetime anchor").isEqualTo(anchor);
		assertThat(sessions.findById(origin.getId())).as("originating session retired").isNull();
	}

	@Test
	void stepUpWithoutAnOriginatingSessionFailsClosed() throws Exception {
		var handler = new LoginHandlers.Success(props, users(), Mockito.mock(SecurityEvents.class), "https://app.example.test", new Sessions());
		MockHttpServletRequest req = stepUpCallback("nonce-unknown", UUID.randomUUID().toString());
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of("otp")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=session_expired");
		assertThat(req.getSession(false)).isNull();
	}

	/**
	 * Regression (M1 integration defect, found with a browser that does not enforce SameSite): the callback
	 * carried the originating session, Spring rotated its id before the success handler, and an id-based
	 * guard then deleted the CURRENT session's row. The originating session must be recognised by its nonce.
	 */
	@Test
	void stepUpCallbackInsideTheOriginatingSessionKeepsItAndItsAnchor() throws Exception {
		Sessions sessions = new Sessions();
		long anchor = 1_700_000_000L;
		// The DB row of the current session, still under its pre-rotation id.
		MapSession storedRow = originatingSession(sessions, "nonce-3", anchor);
		var handler = new LoginHandlers.Success(props, users(), Mockito.mock(SecurityEvents.class), "https://app.example.test", sessions);
		String action = UUID.randomUUID().toString();
		MockHttpServletRequest req = stepUpCallback("nonce-3", action);
		// The callback request runs IN the originating session (its id already rotated by Spring).
		MockHttpSession current = (MockHttpSession) req.getSession();
		current.setAttribute(SessionAttributes.STEP_UP_NONCE, "nonce-3");
		current.setAttribute(SessionAttributes.AUTHENTICATED_AT, anchor);
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of("otp")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/review?action=" + action);
		assertThat(sessions.findById(storedRow.getId())).as("the live session's row must not be deleted").isNotNull();
		assertThat(current.getAttribute(SessionAttributes.AUTHENTICATED_AT)).isEqualTo(anchor);
		assertThat(current.getAttribute(SessionAttributes.STEP_UP_NONCE)).as("nonce consumed").isNull();
	}

	/**
	 * Regression (M1 integration defect, found live): with the callback inside the originating session,
	 * invalidating the current session addressed the ROTATED id, so the stored record survived the mismatch.
	 */
	@Test
	void differentPersonCompletingStepUpInsideTheOriginatingSessionEndsItsStoredRecord() throws Exception {
		Sessions sessions = new Sessions();
		MapSession storedRow = originatingSession(sessions, "nonce-4", 1_700_000_000L);
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users(), events, "https://app.example.test", sessions);
		MockHttpServletRequest req = stepUpCallback("nonce-4", UUID.randomUUID().toString());
		req.getSession().setAttribute(SessionAttributes.STEP_UP_NONCE, "nonce-4");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token("mallory-subject", "mfa", List.of("otp")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=reauth_user_mismatch");
		assertThat(sessions.findById(storedRow.getId())).as("stored record under the pre-rotation id is deleted").isNull();
		assertThat(req.getSession(false)).as("the current (rotated) session is invalidated").isNull();
		verify(events).record(Mockito.eq("reauth_user_mismatch"), Mockito.eq(ALICE), Mockito.contains("originating_session_ended=true"));
	}

	@Test
	void stepUpWithoutVerifiedSecondFactorEndsTheOriginatingSession() throws Exception {
		Sessions sessions = new Sessions();
		MapSession origin = originatingSession(sessions, "nonce-5", 1_700_000_000L);
		var handler = new LoginHandlers.Success(props, users(), Mockito.mock(SecurityEvents.class), "https://app.example.test", sessions);
		MockHttpServletRequest req = stepUpCallback("nonce-5", UUID.randomUUID().toString());
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of()));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=mfa_required");
		assertThat(sessions.findById(origin.getId())).as("no orphaned originating session").isNull();
		assertThat(req.getSession(false)).isNull();
	}

	@Test
	void stepUpByADisabledUserEndsTheOriginatingSession() throws Exception {
		Sessions sessions = new Sessions();
		MapSession origin = originatingSession(sessions, "nonce-6", 1_700_000_000L);
		AppUserService users = users();
		Mockito.when(users.findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any()))
				.thenReturn(new AppUser(ALICE, ISS, SUB, "alice@example.test", true));
		var handler = new LoginHandlers.Success(props, users, Mockito.mock(SecurityEvents.class), "https://app.example.test", sessions);
		MockHttpServletRequest req = stepUpCallback("nonce-6", UUID.randomUUID().toString());
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token(SUB, "mfa", List.of("otp")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=account_disabled");
		assertThat(sessions.findById(origin.getId())).as("no orphaned originating session").isNull();
		assertThat(req.getSession(false)).isNull();
	}

	@Test
	void differentPersonCompletingStepUpEndsTheVictimsOriginatingSession() throws Exception {
		Sessions sessions = new Sessions();
		MapSession origin = originatingSession(sessions, "nonce-2", 1_700_000_000L);
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users(), events, "https://app.example.test", sessions);
		MockHttpServletRequest req = stepUpCallback("nonce-2", UUID.randomUUID().toString());
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token("mallory-subject", "mfa", List.of("otp")));

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=reauth_user_mismatch");
		assertThat(sessions.findById(origin.getId())).as("victim's originating session ended").isNull();
		assertThat(req.getSession(false)).isNull();
		verify(events).record(Mockito.eq("reauth_user_mismatch"), Mockito.eq(ALICE), Mockito.contains("originating_session_ended=true"));
	}
}
