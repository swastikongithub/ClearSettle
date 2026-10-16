package com.clearsettle.session;

import java.io.IOException;
import java.time.Clock;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.SessionAttributes;
import com.clearsettle.web.ApiJson;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Enforces the absolute session lifetime (D-SEC-13). Spring Session enforces only the idle timeout;
 * the absolute cap is anchored to the authentication time stored at login and is therefore NOT extended
 * by ongoing activity. When exceeded, the session is invalidated and the request is refused.
 *
 * <p>The {@link Clock} is injected so expiration is testable deterministically rather than with long
 * timing tests.
 */
public class AbsoluteTimeoutFilter extends OncePerRequestFilter {

	private final AuthProperties props;
	private final Clock clock;

	public AbsoluteTimeoutFilter(AuthProperties props, Clock clock) {
		this.props = props;
		this.clock = clock;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
			throws ServletException, IOException {
		HttpSession session = req.getSession(false);
		Object at = session == null ? null : session.getAttribute(SessionAttributes.AUTHENTICATED_AT);
		if (at instanceof Long authEpoch && props.absoluteExpired(authEpoch, clock.instant().getEpochSecond())) {
			session.invalidate();
			SecurityContextHolder.clearContext();
			ApiJson.reject(req, res, 401, "session_expired");
			return;
		}
		chain.doFilter(req, res);
	}
}
