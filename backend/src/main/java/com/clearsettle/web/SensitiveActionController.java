package com.clearsettle.web;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.clearsettle.auth.SensitiveActions;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.SessionAttributes;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Review, confirmation and cancellation of the signed-in user's own pending sensitive actions (D-SEC-14).
 * Pending actions are created only by the feature endpoint of a sensitive operation
 * ({@link SensitiveActions#request}); there is deliberately no endpoint that creates one for an arbitrary
 * type. Confirm and cancel are unsafe POSTs and need the CSRF token and the custom header like any other.
 */
@RestController
@RequestMapping("/api/sensitive-actions")
public class SensitiveActionController {

	private final SensitiveActions actions;

	public SensitiveActionController(SensitiveActions actions) {
		this.actions = actions;
	}

	@GetMapping("/{actionId}")
	ResponseEntity<Map<String, Object>> review(@PathVariable UUID actionId, OAuth2AuthenticationToken token,
			@RequestAttribute(SessionAttributes.APP_USER) AppUser user) {
		return actions.review(user, token, actionId).map(r -> {
			Map<String, Object> body = new LinkedHashMap<>();
			body.put("actionId", r.action().id());
			body.put("actionType", r.action().actionType());
			body.put("summary", r.summary());
			body.put("status", r.action().status());
			body.put("expiresAt", r.action().expiresAt().getEpochSecond());
			body.put("supported", r.supported());
			body.put("stepUpRequired", r.stepUpRequired());
			if (r.stepUpRequired()) {
				body.put("stepUpUrl", SensitiveActionResponses.stepUpUrl(token.getAuthorizedClientRegistrationId(), actionId));
			}
			return SensitiveActionResponses.json(HttpStatus.OK, body);
		}).orElseGet(() -> error(HttpStatus.NOT_FOUND, "action_not_found", null));
	}

	@PostMapping("/{actionId}/confirm")
	ResponseEntity<Map<String, Object>> confirm(@PathVariable UUID actionId, OAuth2AuthenticationToken token,
			@RequestAttribute(SessionAttributes.APP_USER) AppUser user) {
		SensitiveActions.Confirmation c = actions.confirm(user, token, actionId);
		return switch (c.outcome()) {
			case EXECUTED -> {
				Map<String, Object> body = new LinkedHashMap<>();
				body.put("status", "executed");
				body.put("actionId", actionId);
				body.put("actionType", c.actionType());
				body.put("result", c.result());
				yield SensitiveActionResponses.json(HttpStatus.OK, body);
			}
			case STEP_UP_REQUIRED -> {
				Map<String, Object> body = new LinkedHashMap<>();
				body.put("error", "step_up_required");
				body.put("actionId", actionId);
				body.put("stepUpUrl", SensitiveActionResponses.stepUpUrl(token.getAuthorizedClientRegistrationId(), actionId));
				body.put("reasons", c.reasons());
				yield SensitiveActionResponses.json(HttpStatus.UNAUTHORIZED, body);
			}
			case NOT_FOUND -> error(HttpStatus.NOT_FOUND, "action_not_found", actionId);
			case NOT_PENDING -> error(HttpStatus.CONFLICT, "action_not_pending", actionId);
			case EXPIRED -> error(HttpStatus.GONE, "action_expired", actionId);
			case UNSUPPORTED -> error(HttpStatus.UNPROCESSABLE_CONTENT, "action_type_unsupported", actionId);
			case FAILED -> error(HttpStatus.INTERNAL_SERVER_ERROR, "operation_failed", actionId);
		};
	}

	@PostMapping("/{actionId}/cancel")
	ResponseEntity<Map<String, Object>> cancel(@PathVariable UUID actionId,
			@RequestAttribute(SessionAttributes.APP_USER) AppUser user) {
		if (actions.cancel(user, actionId)) {
			return SensitiveActionResponses.json(HttpStatus.OK, Map.of("status", "cancelled", "actionId", actionId));
		}
		return error(HttpStatus.CONFLICT, "action_not_pending", actionId);
	}

	private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, UUID actionId) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("error", code);
		if (actionId != null) {
			body.put("actionId", actionId);
		}
		return SensitiveActionResponses.json(status, body);
	}
}
