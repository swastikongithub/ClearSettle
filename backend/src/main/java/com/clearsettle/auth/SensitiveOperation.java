package com.clearsettle.auth;

import java.util.Map;
import java.util.UUID;

/**
 * An operation classified as sensitive (D-SEC-14, NFR-SEC-004/024). A feature makes an operation sensitive
 * by implementing this interface and starting it through {@link SensitiveActions#request}; its endpoint never
 * executes the operation directly. The operation then runs only from {@link SensitiveActions#confirm}: an
 * explicit, single-use confirmation by the same user, within the pending-action lifetime, while that user's
 * authentication is fresh (5 minutes) and carries the required MFA evidence. Completing a step-up never
 * executes anything by itself.
 *
 * <p>The pending action records who asked and what was asked; it is not a grant of authority. {@link #execute}
 * must re-check the user's current authorization (for example workspace membership and role) and validate the
 * parameters again, because both may have changed since the request.
 */
public interface SensitiveOperation {

	/** Stable action type stored with the pending action, for example {@code posting.approve}. */
	String type();

	/** A short, non-secret description of what will happen, shown to the user before confirmation. */
	String summary(Map<String, String> params);

	/**
	 * Performs the operation for the confirming user. It runs in the transaction that claims the pending
	 * action: throwing rolls the claim back and leaves the action pending. Returns a small, non-secret result.
	 */
	Map<String, Object> execute(UUID userId, Map<String, String> params);
}
