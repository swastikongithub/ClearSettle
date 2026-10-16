package com.clearsettle.config;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

import static org.assertj.core.api.Assertions.assertThat;

/** AC-159 / D-SEC-15: the session cookie carries the required security attributes. */
class CookieSerializerTest {

	private AuthProperties props() {
		return new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of());
	}

	@Test
	void sessionCookieIsHostPrefixedSecureHttpOnlyStrict() {
		CookieSerializer serializer = new SecurityConfig().cookieSerializer(props());

		MockHttpServletRequest req = new MockHttpServletRequest();
		req.setSecure(true);
		MockHttpServletResponse res = new MockHttpServletResponse();
		((DefaultCookieSerializer) serializer).writeCookieValue(new CookieSerializer.CookieValue(req, res, "session-id-value"));

		String setCookie = res.getHeader("Set-Cookie");
		assertThat(setCookie).isNotNull();
		assertThat(setCookie).startsWith("__Host-CSSESSION=");
		assertThat(setCookie).contains("Secure");
		assertThat(setCookie).contains("HttpOnly");
		assertThat(setCookie).contains("SameSite=Strict");
		assertThat(setCookie).contains("Path=/");
		assertThat(setCookie).doesNotContain("Domain="); // host-only, required by the __Host- prefix
	}
}
