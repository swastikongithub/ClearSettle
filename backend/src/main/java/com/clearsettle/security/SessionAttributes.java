package com.clearsettle.security;

/** Keys for the attributes ClearSettle stores on the server-side session. */
public final class SessionAttributes {

	/** Epoch seconds of the successful authentication. Anchors the absolute session lifetime (D-SEC-13). */
	public static final String AUTHENTICATED_AT = "cs.authenticatedAt";

	/** Request attribute holding the resolved application user for the current request. */
	public static final String APP_USER = "cs.appUser";

	private SessionAttributes() {
	}
}
