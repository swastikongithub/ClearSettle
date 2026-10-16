package com.clearsettle.web;

import java.util.List;
import java.util.Map;

import com.clearsettle.config.AuthProperties;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/** NFR-SEC-022: the required custom header gates unsafe requests; safe methods are exempt. */
class RequiredHeaderFilterTest {

	private AuthProperties props(boolean require) {
		return new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", require, Map.of("keycloak", List.of("mfa")), Map.of());
	}

	private MockFilterChain run(MockHttpServletRequest req, MockHttpServletResponse res, boolean require) throws Exception {
		MockFilterChain chain = new MockFilterChain();
		new RequiredHeaderFilter(props(require)).doFilter(req, res, chain);
		return chain;
	}

	@Test
	void unsafePostWithoutCustomHeaderIsRejected() throws Exception {
		MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/x");
		MockHttpServletResponse res = new MockHttpServletResponse();
		MockFilterChain chain = run(req, res, true);
		assertThat(res.getStatus()).isEqualTo(403);
		assertThat(res.getContentAsString()).contains("custom_header_missing");
		assertThat(chain.getRequest()).as("chain must not proceed").isNull();
	}

	@Test
	void unsafePostWithCustomHeaderProceeds() throws Exception {
		MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/x");
		req.addHeader("X-CS-Request", "1");
		MockHttpServletResponse res = new MockHttpServletResponse();
		MockFilterChain chain = run(req, res, true);
		assertThat(res.getStatus()).isEqualTo(200);
		assertThat(chain.getRequest()).isNotNull();
	}

	@Test
	void safeGetIsExemptEvenWithoutHeader() throws Exception {
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/x");
		MockHttpServletResponse res = new MockHttpServletResponse();
		MockFilterChain chain = run(req, res, true);
		assertThat(chain.getRequest()).isNotNull();
	}

	@Test
	void whenDisabledPostWithoutHeaderProceeds() throws Exception {
		MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/x");
		MockHttpServletResponse res = new MockHttpServletResponse();
		MockFilterChain chain = run(req, res, false);
		assertThat(chain.getRequest()).isNotNull();
	}
}
