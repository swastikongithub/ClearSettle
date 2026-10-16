package com.clearsettle.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

/**
 * Retains no OAuth2 authorized clients (access and refresh tokens) — F-3.
 *
 * <p>ClearSettle uses OIDC only to authenticate the user; it never calls a resource server with the
 * user's access token, and it does not refresh tokens. Spring's default repository keeps every user's
 * access and refresh tokens in an unbounded in-memory map that logout does not clear, which would retain
 * token material the application does not need. This repository discards them instead: the only
 * identity material kept is the validated ID token inside the server-side security context, bounded by
 * the session's idle and absolute lifetimes and deleted on logout.
 */
public final class NonRetainingAuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

	@Override
	public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(String clientRegistrationId, Authentication principal,
			HttpServletRequest request) {
		return null;
	}

	@Override
	public void saveAuthorizedClient(OAuth2AuthorizedClient authorizedClient, Authentication principal,
			HttpServletRequest request, HttpServletResponse response) {
		// Intentionally not retained.
	}

	@Override
	public void removeAuthorizedClient(String clientRegistrationId, Authentication principal, HttpServletRequest request,
			HttpServletResponse response) {
		// Nothing retained, nothing to remove.
	}
}
