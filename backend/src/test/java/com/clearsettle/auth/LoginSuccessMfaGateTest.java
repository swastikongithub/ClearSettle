package com.clearsettle.auth;

import java.util.List;
import java.util.Map;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.SecurityEvents;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * D-SEC-14 universal MFA gate at login: a login whose authentication evidence does NOT carry MFA
 * assurance (acr not strong) must not obtain a session. This is the control the M0 spike did not prove
 * (it exercised MFA only within step-up). Verified here at the success-handler level with mock servlet
 * objects, so it does not depend on a live IdP.
 */
class LoginSuccessMfaGateTest {

	private final AuthProperties props = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION",
			"__Host-XSRF-TOKEN", "X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of());

	private OAuth2AuthenticationToken tokenWithAcr(String acr) {
		OidcIdToken idToken = OidcIdToken.withTokenValue("dummy-id-token")
				.claim("iss", "https://idp.example.net/realms/clearsettle")
				.claim("sub", "alice-subject")
				.claim("acr", acr)
				.build();
		OidcUser user = new DefaultOidcUser(AuthorityUtils.createAuthorityList("ROLE_USER"), idToken);
		return new OAuth2AuthenticationToken(user, user.getAuthorities(), "keycloak");
	}

	@Test
	void loginWithoutMfaAssuranceIsRefusedAndNoUserProvisioned() throws Exception {
		AppUserService users = Mockito.mock(AppUserService.class);
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users, events, "https://app.example.test");

		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, tokenWithAcr("pwd")); // single-factor only

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/?auth_error=mfa_required");
		assertThat(req.getSession(false)).isNull(); // session invalidated / not established
		// The gate fires before provisioning, so no account is created for a non-MFA login.
		verify(users, never()).findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any());
		verify(events).record(Mockito.eq("login_refused_mfa_required"), Mockito.isNull(), Mockito.anyString());
	}

	@Test
	void loginWithMfaAssuranceProceedsToProvisioning() throws Exception {
		AppUserService users = Mockito.mock(AppUserService.class);
		Mockito.when(users.findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any()))
				.thenReturn(new com.clearsettle.security.AppUser(java.util.UUID.randomUUID(),
						"https://idp.example.net/realms/clearsettle", "alice-subject", "alice@example.test", false));
		SecurityEvents events = Mockito.mock(SecurityEvents.class);
		var handler = new LoginHandlers.Success(props, users, events, "https://app.example.test");

		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, tokenWithAcr("mfa")); // MFA satisfied

		// Proceeds: provisions the user and lands on the app, not an mfa_required error.
		verify(users).findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any());
		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/");
	}
}
