package com.clearsettle.session;

import java.util.Set;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Component;

/**
 * Ends a user's server-side sessions in the shared Spring Session JDBC store (D-SEC-13, NFR-SEC-023). The store is
 * PostgreSQL, so the effect is the same on every application instance: a deleted session is refused on its next
 * request wherever that request arrives, and the browser's cookie for it no longer resolves to a session. Spring
 * Session JDBC does not recreate a deleted session when a request that loaded it earlier saves it afterwards (its
 * update matches no row), so a request in flight cannot bring a revoked session back.
 *
 * <p>Used by sign out everywhere and by OIDC back-channel logout. It records nothing itself: each caller records
 * its own security event. Sessions are found through the principal index (the application user id), and each one
 * is then read by its id, because Spring Session JDBC's principal query can return a session without some of its
 * attributes (see {@code LoginHandlers.Success}).
 */
@Component
public class SessionRevocation {

	/** The provider's session id claim in an ID token (OpenID Connect Front-Channel and Back-Channel Logout). */
	static final String SID = "sid";

	private final FindByIndexNameSessionRepository<? extends Session> sessions;

	public SessionRevocation(FindByIndexNameSessionRepository<? extends Session> sessions) {
		this.sessions = sessions;
	}

	/** Deletes every session of the user. Returns how many were found and deleted. */
	public int revokeAll(UUID userId) {
		Set<String> ids = sessions.findByPrincipalName(userId.toString()).keySet();
		ids.forEach(sessions::deleteById);
		return ids.size();
	}

	/**
	 * Deletes the user's sessions that belong to the identity provider's session {@code sid}: those whose ID token
	 * carries that {@code sid}. A session linked to a different provider session of the same user is kept. A session
	 * that cannot be linked to any provider session (no ID token, or no {@code sid} in it) is deleted as well: when
	 * the link is unknown, ending the session is the safe choice. Returns how many were deleted.
	 */
	public int revokeProviderSession(UUID userId, String sid) {
		int deleted = 0;
		for (String id : sessions.findByPrincipalName(userId.toString()).keySet()) {
			Session s = sessions.findById(id);
			if (s == null || linkedToAnotherProviderSession(s, sid)) {
				continue;
			}
			sessions.deleteById(id);
			deleted++;
		}
		return deleted;
	}

	private static boolean linkedToAnotherProviderSession(Session s, String sid) {
		Object stored = s.getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
		Authentication auth = stored instanceof SecurityContext c ? c.getAuthentication() : null;
		if (auth != null && auth.getPrincipal() instanceof OidcUser user
				&& user.getIdToken().getClaims().get(SID) instanceof String own) {
			return !own.equals(sid);
		}
		return false;
	}
}
