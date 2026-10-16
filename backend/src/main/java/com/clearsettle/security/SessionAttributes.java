package com.clearsettle.security;

/** Keys for the attributes ClearSettle stores on the server-side session. */
public final class SessionAttributes {

	/** Epoch seconds of the successful authentication. Anchors the absolute session lifetime (D-SEC-13). */
	public static final String AUTHENTICATED_AT = "cs.authenticatedAt";

	/**
	 * Random nonce written to the ORIGINATING session when a step-up starts. Under SameSite=Strict the
	 * step-up callback arrives without the session cookie, so the success handler uses this nonce
	 * (carried inside the encrypted login-state cookie) to find the originating session, preserve its
	 * absolute-lifetime anchor and retire it.
	 */
	public static final String STEP_UP_NONCE = "cs.stepUpNonce";

	/** Request attribute holding the resolved application user for the current request. */
	public static final String APP_USER = "cs.appUser";

	private SessionAttributes() {
	}
}
