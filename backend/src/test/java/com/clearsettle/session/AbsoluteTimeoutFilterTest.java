package com.clearsettle.session;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.SessionAttributes;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;

import static org.assertj.core.api.Assertions.assertThat;

/** D-SEC-13: absolute lifetime anchored to authentication time, not extended by activity. */
class AbsoluteTimeoutFilterTest {

	private static final long ABSOLUTE = 28800; // 8 hours

	private AuthProperties props() {
		return new AuthProperties(900, ABSOLUTE, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of());
	}

	private Clock at(long epochSeconds) {
		return Clock.fixed(Instant.ofEpochSecond(epochSeconds), ZoneOffset.UTC);
	}

	private MockFilterChain run(MockHttpSession session, Clock clock) throws Exception {
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/me");
		if (session != null) {
			req.setSession(session);
		}
		MockHttpServletResponse res = new MockHttpServletResponse();
		MockFilterChain chain = new MockFilterChain();
		new AbsoluteTimeoutFilter(props(), clock).doFilter(req, res, chain);
		req.setAttribute("res", res);
		return chain;
	}

	@Test
	void withinAbsoluteLifetimeProceeds() throws Exception {
		long authEpoch = 1_000_000L;
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(SessionAttributes.AUTHENTICATED_AT, authEpoch);
		MockFilterChain chain = run(session, at(authEpoch + ABSOLUTE)); // exactly at limit, not past
		assertThat(chain.getRequest()).isNotNull();
		assertThat(session.isInvalid()).isFalse();
	}

	@Test
	void pastAbsoluteLifetimeIsRefusedAndSessionInvalidatedDespiteActivity() throws Exception {
		long authEpoch = 1_000_000L;
		MockHttpSession session = new MockHttpSession();
		session.setAttribute(SessionAttributes.AUTHENTICATED_AT, authEpoch);
		// "now" is well past the 8h anchor; activity in between is irrelevant.
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/me");
		req.setSession(session);
		MockHttpServletResponse res = new MockHttpServletResponse();
		MockFilterChain chain = new MockFilterChain();
		new AbsoluteTimeoutFilter(props(), at(authEpoch + ABSOLUTE + 1)).doFilter(req, res, chain);
		assertThat(res.getStatus()).isEqualTo(401);
		assertThat(res.getContentAsString()).contains("session_expired");
		assertThat(chain.getRequest()).as("chain must not proceed").isNull();
		assertThat(session.isInvalid()).isTrue();
	}

	@Test
	void noSessionProceeds() throws Exception {
		MockFilterChain chain = run(null, at(1_000_000L));
		assertThat(chain.getRequest()).isNotNull();
	}

	@Test
	void sessionWithoutAuthMarkerProceeds() throws Exception {
		MockHttpSession session = new MockHttpSession(); // no AUTHENTICATED_AT
		MockFilterChain chain = run(session, at(1_000_000L));
		assertThat(chain.getRequest()).isNotNull();
	}
}
