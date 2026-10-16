package com.clearsettle.session;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import jakarta.servlet.http.Cookie;

import static org.assertj.core.api.Assertions.assertThat;

/** D-SEC-15 / ADR-0004: the __Host-CSLOGIN login-state cookie round-trips, resists tampering, and
 *  carries the required Lax/__Host- attributes. */
class LoginStateCookieRepositoryTest {

	private final LoginStateCookieRepository repo = new LoginStateCookieRepository("test-secret-value");

	private OAuth2AuthorizationRequest sampleRequest() {
		return OAuth2AuthorizationRequest.authorizationCode()
				.authorizationUri("https://idp.example.net/auth")
				.clientId("clearsettle-web")
				.redirectUri("https://app.example.com/login/oauth2/code/keycloak")
				.scope("openid")
				.state("state-abc-123")
				.build();
	}

	private String saveAndGetCookieValue(MockHttpServletResponse res) {
		repo.saveAuthorizationRequest(sampleRequest(), new MockHttpServletRequest(), res);
		String setCookie = res.getHeader("Set-Cookie");
		assertThat(setCookie).isNotNull();
		return setCookie;
	}

	@Test
	void cookieHasRequiredV3Attributes() {
		MockHttpServletResponse res = new MockHttpServletResponse();
		String setCookie = saveAndGetCookieValue(res);
		assertThat(setCookie).startsWith("__Host-CSLOGIN=");
		assertThat(setCookie).contains("Secure");
		assertThat(setCookie).contains("HttpOnly");
		assertThat(setCookie).contains("SameSite=Lax");
		assertThat(setCookie).contains("Path=/");
		assertThat(setCookie).doesNotContain("Domain="); // host-only, required by the __Host- prefix
	}

	@Test
	void roundTripsTheAuthorizationRequest() {
		MockHttpServletResponse res = new MockHttpServletResponse();
		String value = res.getCookie("__Host-CSLOGIN") == null
				? extractValue(saveAndGetCookieValue(res)) : res.getCookie("__Host-CSLOGIN").getValue();

		MockHttpServletRequest req = new MockHttpServletRequest();
		req.setCookies(new Cookie("__Host-CSLOGIN", value));
		req.setParameter("state", "state-abc-123");

		OAuth2AuthorizationRequest loaded = repo.loadAuthorizationRequest(req);
		assertThat(loaded).isNotNull();
		assertThat(loaded.getState()).isEqualTo("state-abc-123");
		assertThat(loaded.getClientId()).isEqualTo("clearsettle-web");
		assertThat(loaded.getRedirectUri()).isEqualTo("https://app.example.com/login/oauth2/code/keycloak");
		assertThat(loaded.getScopes()).containsExactly("openid");
	}

	@Test
	void tamperedCookieIsTreatedAsAbsent() {
		MockHttpServletResponse res = new MockHttpServletResponse();
		String value = extractValue(saveAndGetCookieValue(res));
		// Flip the last character to break the GCM tag.
		char last = value.charAt(value.length() - 1);
		String tampered = value.substring(0, value.length() - 1) + (last == 'A' ? 'B' : 'A');

		MockHttpServletRequest req = new MockHttpServletRequest();
		req.setCookies(new Cookie("__Host-CSLOGIN", tampered));
		req.setParameter("state", "state-abc-123");
		assertThat(repo.loadAuthorizationRequest(req)).isNull();
	}

	@Test
	void stateMismatchReturnsNull() {
		MockHttpServletResponse res = new MockHttpServletResponse();
		String value = extractValue(saveAndGetCookieValue(res));
		MockHttpServletRequest req = new MockHttpServletRequest();
		req.setCookies(new Cookie("__Host-CSLOGIN", value));
		req.setParameter("state", "a-different-state");
		assertThat(repo.loadAuthorizationRequest(req)).isNull();
	}

	@Test
	void removeExpiresTheCookie() {
		MockHttpServletResponse res = new MockHttpServletResponse();
		String value = extractValue(saveAndGetCookieValue(res));
		MockHttpServletRequest req = new MockHttpServletRequest();
		req.setCookies(new Cookie("__Host-CSLOGIN", value));
		req.setParameter("state", "state-abc-123");
		MockHttpServletResponse res2 = new MockHttpServletResponse();
		OAuth2AuthorizationRequest removed = repo.removeAuthorizationRequest(req, res2);
		assertThat(removed).isNotNull();
		assertThat(res2.getHeader("Set-Cookie")).contains("Max-Age=0");
	}

	private static String extractValue(String setCookie) {
		String afterName = setCookie.substring(setCookie.indexOf('=') + 1);
		int semi = afterName.indexOf(';');
		return semi >= 0 ? afterName.substring(0, semi) : afterName;
	}
}
