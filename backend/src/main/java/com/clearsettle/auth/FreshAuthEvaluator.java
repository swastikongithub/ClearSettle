package com.clearsettle.auth;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.clearsettle.config.AuthProperties;

import org.springframework.stereotype.Component;

/**
 * Fresh-authentication evidence check for sensitive actions (D-SEC-14, NFR-SEC-024). Fails closed: a
 * missing, malformed, insufficient, or stale claim refuses the action. It is provider-aware — the set of
 * acr values that count as "strong" is configured per registration (Keycloak uses an acr level; a future
 * Auth0 integration would instead inspect {@code amr} containing {@code mfa}).
 */
@Component
public class FreshAuthEvaluator {

	/** Result of the evidence check: {@code ok} is true only when no reason to refuse was found. */
	public record Decision(boolean ok, List<String> reasons) {
	}

	private final AuthProperties props;

	public FreshAuthEvaluator(AuthProperties props) {
		this.props = props;
	}

	/**
	 * Evaluate the ID-token claims for a sensitive action.
	 *
	 * @param registrationId the OIDC client registration (selects the provider-aware acr rule)
	 * @param claims the validated ID-token claims (as issued)
	 * @param now current time
	 */
	public Decision evaluate(String registrationId, Map<String, Object> claims, Instant now) {
		List<String> reasons = new ArrayList<>();

		Object acr = claims.get("acr");
		if (acr == null) {
			reasons.add("acr_missing");
		}
		else if (!(acr instanceof String acrStr)) {
			reasons.add("acr_malformed");
		}
		else if (!props.isStrongAcr(registrationId, acrStr)) {
			reasons.add("acr_insufficient");
		}

		// Method evidence: where the provider issues amr, a strong acr must be backed by a second-factor
		// method actually executed in this authentication (contradictory/insufficient evidence fails closed).
		if (props.requiresAmr(registrationId)) {
			Object amr = claims.get("amr");
			if (amr == null) {
				reasons.add("amr_missing");
			}
			else if (!props.hasRequiredAmr(registrationId, amr)) {
				reasons.add("amr_insufficient");
			}
		}

		Object authTime = claims.get("auth_time");
		Long authEpoch = toEpochSeconds(authTime);
		if (authTime == null) {
			reasons.add("auth_time_missing");
		}
		else if (authEpoch == null) {
			reasons.add("auth_time_malformed");
		}
		else if (!props.freshEnough(authEpoch, now.getEpochSecond())) {
			// Distinguish future vs stale for clearer audit reasons.
			long age = now.getEpochSecond() - authEpoch;
			reasons.add(age < 0 ? "auth_time_in_future" : "auth_time_too_old");
		}

		return new Decision(reasons.isEmpty(), List.copyOf(reasons));
	}

	private static Long toEpochSeconds(Object authTime) {
		if (authTime instanceof Instant i) {
			return i.getEpochSecond();
		}
		if (authTime instanceof Number n) {
			return n.longValue();
		}
		return null; // e.g. a String like "yesterday" -> malformed
	}
}
