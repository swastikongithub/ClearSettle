package com.clearsettle.web;

import java.io.IOException;
import java.util.Set;

import com.clearsettle.config.AuthProperties;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * NFR-SEC-022: every state-changing (unsafe) request must carry the required custom header
 * ({@code X-CS-Request} by default). This is a second, independent CSRF control alongside the
 * double-submit token: a cross-origin HTML form cannot add a custom header, and — unlike SameSite —
 * it does not vary by browser. F-4 showed that removing this control (together with the {@code __Host-}
 * cookie prefix) makes the double-submit forgeable by a same-site sibling, so it is mandatory.
 *
 * <p>Safe methods (GET/HEAD/OPTIONS/TRACE) are never state-changing and are exempt.
 */
public class RequiredHeaderFilter extends OncePerRequestFilter {

	private static final Set<String> SAFE = Set.of("GET", "HEAD", "OPTIONS", "TRACE");
	private final AuthProperties props;

	public RequiredHeaderFilter(AuthProperties props) {
		this.props = props;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
			throws ServletException, IOException {
		if (props.isRequireCustomHeader() && !SAFE.contains(req.getMethod())
				&& req.getHeader(props.getCustomHeaderName()) == null) {
			ApiJson.reject(req, res, 403, "custom_header_missing");
			return;
		}
		chain.doFilter(req, res);
	}
}
