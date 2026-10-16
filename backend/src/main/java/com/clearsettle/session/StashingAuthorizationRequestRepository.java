package com.clearsettle.session;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Wraps the chosen login-state store and keeps the consumed authorization request on the callback
 * request, so the success handler can read step-up expectations whichever store is in use.
 */
public class StashingAuthorizationRequestRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

	public static final String CONSUMED = "cs.consumedAuthorizationRequest";

	private final AuthorizationRequestRepository<OAuth2AuthorizationRequest> delegate;

	public StashingAuthorizationRequestRepository(AuthorizationRequestRepository<OAuth2AuthorizationRequest> delegate) {
		this.delegate = delegate;
	}

	@Override
	public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
		return delegate.loadAuthorizationRequest(request);
	}

	@Override
	public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request,
			HttpServletResponse response) {
		delegate.saveAuthorizationRequest(authorizationRequest, request, response);
	}

	@Override
	public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
		OAuth2AuthorizationRequest removed = delegate.removeAuthorizationRequest(request, response);
		if (removed != null) {
			request.setAttribute(CONSUMED, removed);
		}
		return removed;
	}
}
