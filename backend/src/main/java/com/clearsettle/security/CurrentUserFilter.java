package com.clearsettle.security;

import java.io.IOException;

import com.clearsettle.web.ApiJson;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Resolves the application user from the authenticated principal's {@code (iss, sub)} on EVERY
 * authenticated API request and refuses a disabled or unknown user immediately — so an authorization
 * change takes effect on the next request without waiting for the session to expire (AC-163,
 * NFR-SEC-027). Nothing authorization-relevant is trusted from the session; it is re-read from the
 * database each request. The resolved {@link AppUser} is placed on the request for controllers.
 */
public class CurrentUserFilter extends OncePerRequestFilter {

	private final AppUserService users;
	private final SecurityEvents events;

	public CurrentUserFilter(AppUserService users, SecurityEvents events) {
		this.users = users;
		this.events = events;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
			throws ServletException, IOException {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (req.getRequestURI().startsWith("/api/") && auth instanceof OAuth2AuthenticationToken token
				&& token.getPrincipal() instanceof OidcUser user) {
			var found = users.find(user.getIssuer().toString(), user.getSubject());
			if (found.isEmpty() || found.get().disabled()) {
				HttpSession session = req.getSession(false);
				if (session != null) {
					session.invalidate();
				}
				SecurityContextHolder.clearContext();
				events.record("disabled_or_unknown_user_request",
						found.map(AppUser::id).orElse(null), "path=" + req.getRequestURI());
				ApiJson.reject(req, res, 401, "account_disabled");
				return;
			}
			req.setAttribute(SessionAttributes.APP_USER, found.get());
		}
		chain.doFilter(req, res);
	}
}
