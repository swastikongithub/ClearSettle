package com.clearsettle.auth;

/**
 * Thrown by {@link SensitiveOperation#execute} when what the user reviewed has changed since the action was
 * requested. The claim is rolled back and the action is withdrawn; nothing is executed.
 */
public class ReviewedStateChangedException extends RuntimeException {

	public ReviewedStateChangedException(String message) {
		super(message);
	}
}
