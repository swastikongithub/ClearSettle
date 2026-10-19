package com.clearsettle.web;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.clearsettle.auth.SensitiveActions;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * HTTP form of the sensitive-action policy, shared by every feature endpoint that starts a sensitive
 * operation: {@code 202 confirmation_required} (authentication is fresh; the user reviews and confirms) or
 * {@code 401 step_up_required} (re-authenticate first). Neither executes anything.
 */
public final class SensitiveActionResponses {

	private SensitiveActionResponses() {
	}

	/** The response a feature endpoint returns after {@link SensitiveActions#request}. */
	public static ResponseEntity<Map<String, Object>> challenge(SensitiveActions.Challenge c, String registrationId) {
		Map<String, Object> body = new LinkedHashMap<>();
		if (c.stepUpRequired()) {
			body.put("error", "step_up_required");
		}
		else {
			body.put("status", "confirmation_required");
		}
		body.put("actionId", c.actionId());
		body.put("actionType", c.actionType());
		body.put("expiresAt", c.expiresAt().getEpochSecond());
		if (c.stepUpRequired()) {
			body.put("stepUpUrl", stepUpUrl(registrationId, c.actionId()));
			body.put("reasons", c.reasons());
		}
		else {
			body.put("reviewUrl", reviewUrl(c.actionId()));
		}
		return json(c.stepUpRequired() ? HttpStatus.UNAUTHORIZED : HttpStatus.ACCEPTED, body);
	}

	/** Starts the step-up re-authentication for the user's own pending action (same origin). */
	public static String stepUpUrl(String registrationId, UUID actionId) {
		return "/oauth2/authorization/" + registrationId + "?step_up=" + actionId;
	}

	/** The page on which the user reviews and confirms the action; also the step-up landing page. */
	public static String reviewUrl(UUID actionId) {
		return "/review?action=" + actionId;
	}

	static ResponseEntity<Map<String, Object>> json(HttpStatus status, Map<String, Object> body) {
		return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
	}
}
