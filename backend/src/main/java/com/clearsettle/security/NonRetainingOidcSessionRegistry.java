package com.clearsettle.security;

import java.util.List;

import org.springframework.security.oauth2.client.oidc.authentication.logout.OidcLogoutToken;
import org.springframework.security.oauth2.client.oidc.session.OidcSessionInformation;
import org.springframework.security.oauth2.client.oidc.session.OidcSessionRegistry;

/**
 * Keeps no links between provider sessions and application sessions: the back-channel-logout counterpart of
 * {@link NonRetainingAuthorizedClientRepository}.
 *
 * <p>With back-channel logout enabled, Spring Security records each sign-in in an OIDC session registry. Its
 * default keeps them in an in-memory map: local to one instance, never cleared when Spring Session JDBC expires a
 * session, and holding each user's ID token and the session's CSRF token. ClearSettle does not use it. The link it
 * needs is the {@code sid} in the ID token already stored with each session in the shared session store, where
 * {@link com.clearsettle.session.BackChannelLogout} finds the sessions to end. Nothing is recorded here, so nothing
 * is ever found here.
 */
public final class NonRetainingOidcSessionRegistry implements OidcSessionRegistry {

	@Override
	public void saveSessionInformation(OidcSessionInformation info) {
		// Intentionally not retained.
	}

	@Override
	public OidcSessionInformation removeSessionInformation(String clientSessionId) {
		return null;
	}

	@Override
	public Iterable<OidcSessionInformation> removeSessionInformation(OidcLogoutToken logoutToken) {
		return List.of();
	}
}
