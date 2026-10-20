package com.clearsettle.web;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import com.clearsettle.auth.FreshAuthEvaluator;
import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.SecurityEvents;
import com.clearsettle.security.SessionAttributes;
import com.clearsettle.session.SessionRevocation;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;

/**
 * Identity and session endpoints for the authenticated SPA. There are no financial domain operations yet;
 * sensitive operations, when built, go through {@link com.clearsettle.auth.SensitiveActions} (request, step-up,
 * review, single-use confirmation).
 */
@RestController
public class AuthController {

	private final AuthProperties props;
	private final FreshAuthEvaluator freshAuth;
	private final SecurityEvents events;
	private final SessionRevocation revocation;

	public AuthController(AuthProperties props, FreshAuthEvaluator freshAuth, SecurityEvents events,
			SessionRevocation revocation) {
		this.props = props;
		this.freshAuth = freshAuth;
		this.events = events;
		this.revocation = revocation;
	}

	@GetMapping("/api/me")
	Map<String, Object> me(OAuth2AuthenticationToken token,
			@RequestAttribute(SessionAttributes.APP_USER) AppUser user, HttpSession session) {
		OidcUser u = (OidcUser) token.getPrincipal();
		Map<String, Object> claims = u.getIdToken().getClaims();
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("appUserId", user.id());
		m.put("registrationId", token.getAuthorizedClientRegistrationId());
		m.put("iss", u.getIssuer().toString());
		m.put("sub", u.getSubject());
		m.put("email", u.getEmail());
		m.put("idTokenClaimNames", claims.keySet());
		m.put("acr", String.valueOf(claims.get("acr")));
		m.put("authTimePresent", claims.get("auth_time") != null);
		m.put("sessionAuthenticatedAt", session.getAttribute(SessionAttributes.AUTHENTICATED_AT));
		m.put("freshAuth", freshAuth.evaluate(token.getAuthorizedClientRegistrationId(), claims, Instant.now()));
		return m;
	}

	@GetMapping("/api/session")
	Map<String, Object> session(HttpSession session) {
		Object at = session.getAttribute(SessionAttributes.AUTHENTICATED_AT);
		return Map.of(
				"idleTimeoutSeconds", session.getMaxInactiveInterval(),
				"absoluteExpiresAt", at instanceof Long l ? l + props.getAbsoluteLifetimeSeconds() : -1);
	}

	/** Touches the deferred CSRF token so the cookie is written. Returns no token value. */
	@GetMapping("/api/csrf")
	Map<String, Object> csrf(CsrfToken token) {
		token.getToken();
		return Map.of("headerName", token.getHeaderName(), "cookieName", props.getCsrfCookieName());
	}

	/** Global sign-out: invalidate all of this user's sessions across instances, then the current one. */
	@PostMapping("/api/session/logout-everywhere")
	Map<String, Object> logoutEverywhere(@RequestAttribute(SessionAttributes.APP_USER) AppUser user,
			HttpServletRequest req) {
		int deleted = revocation.revokeAll(user.id());
		HttpSession current = req.getSession(false);
		if (current != null) {
			current.invalidate();
		}
		events.record("logout_everywhere", user.id(), "deleted=" + deleted);
		return Map.of("deletedSessions", deleted);
	}
}
