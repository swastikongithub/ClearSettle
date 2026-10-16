package com.clearsettle.config;

import java.util.List;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Authentication and session policy, bound from {@code clearsettle.auth.*}.
 *
 * <p>Defaults encode the owner-approved decisions:
 * <ul>
 *   <li>D-SEC-13: 15-minute idle, 8-hour absolute lifetime (absolute anchored to authentication time,
 *       never extended by activity).</li>
 *   <li>D-SEC-14: universal MFA; a short fresh-authentication window for sensitive actions
 *       (proposed default 5 minutes, pending the owner fixing the exact window).</li>
 *   <li>D-SEC-15: V3 cookies — Strict {@code __Host-} session cookie, Lax {@code __Host-CSLOGIN}.</li>
 * </ul>
 * The pure predicates here ({@link #absoluteExpired}, {@link #freshEnough}) are unit-tested with a
 * controlled clock so the expiration logic does not depend on fragile timing.
 */
@ConfigurationProperties(prefix = "clearsettle.auth")
public class AuthProperties {

	/** Idle timeout in seconds. D-SEC-13: 15 minutes. */
	private final long idleTimeoutSeconds;
	/** Absolute session lifetime in seconds, anchored to authentication time. D-SEC-13: 8 hours. */
	private final long absoluteLifetimeSeconds;
	/** Fresh-authentication window for sensitive actions, in seconds. D-SEC-14 proposed default: 5 minutes. */
	private final long stepUpFreshnessSeconds;
	/** Clock-skew tolerance for future-dated auth_time, in seconds. */
	private final long clockSkewSeconds;
	/** Session cookie SameSite value. D-SEC-15: Strict. */
	private final String sessionCookieSameSite;
	/** Session cookie name (host-only; __Host- prefix requires Secure + Path=/ + no Domain). */
	private final String sessionCookieName;
	/** CSRF cookie name. D-SEC-15: __Host- prefixed. */
	private final String csrfCookieName;
	/** Required custom header on unsafe requests (NFR-SEC-022). */
	private final String customHeaderName;
	/** Require the custom header on unsafe requests. Must be true in production. */
	private final boolean requireCustomHeader;
	/** Per-registration mapping of acr values that count as "strong enough" for a sensitive action. */
	private final Map<String, List<String>> strongAcrByRegistration;
	/** acr_values to request per registration when stepping up. */
	private final Map<String, String> stepUpAcrValues;
	/**
	 * Per-registration AMR values, at least one of which must be present for MFA assurance (D-SEC-14).
	 * Keycloak's {@code acr} level alone does not prove a previously enrolled factor was verified (on the
	 * enrolment login it reports level 2 with an empty {@code amr}); requiring e.g. {@code otp} in
	 * {@code amr} makes contradictory or insufficient evidence fail closed. No entry = no AMR requirement.
	 */
	private final Map<String, List<String>> mfaAmrAnyOfByRegistration;

	/** Convenience constructor without an AMR requirement (used by unit tests). */
	public AuthProperties(long idleTimeoutSeconds, long absoluteLifetimeSeconds, long stepUpFreshnessSeconds,
			long clockSkewSeconds, String sessionCookieSameSite, String sessionCookieName, String csrfCookieName,
			String customHeaderName, boolean requireCustomHeader, Map<String, List<String>> strongAcrByRegistration,
			Map<String, String> stepUpAcrValues) {
		this(idleTimeoutSeconds, absoluteLifetimeSeconds, stepUpFreshnessSeconds, clockSkewSeconds, sessionCookieSameSite,
				sessionCookieName, csrfCookieName, customHeaderName, requireCustomHeader, strongAcrByRegistration,
				stepUpAcrValues, Map.of());
	}

	@org.springframework.boot.context.properties.bind.ConstructorBinding
	public AuthProperties(
			@DefaultValue("900") long idleTimeoutSeconds,
			@DefaultValue("28800") long absoluteLifetimeSeconds,
			@DefaultValue("300") long stepUpFreshnessSeconds,
			@DefaultValue("30") long clockSkewSeconds,
			@DefaultValue("Strict") String sessionCookieSameSite,
			@DefaultValue("__Host-CSSESSION") String sessionCookieName,
			@DefaultValue("__Host-XSRF-TOKEN") String csrfCookieName,
			@DefaultValue("X-CS-Request") String customHeaderName,
			@DefaultValue("true") boolean requireCustomHeader,
			Map<String, List<String>> strongAcrByRegistration,
			Map<String, String> stepUpAcrValues,
			Map<String, List<String>> mfaAmrAnyOfByRegistration) {
		this.idleTimeoutSeconds = idleTimeoutSeconds;
		this.absoluteLifetimeSeconds = absoluteLifetimeSeconds;
		this.stepUpFreshnessSeconds = stepUpFreshnessSeconds;
		this.clockSkewSeconds = clockSkewSeconds;
		this.sessionCookieSameSite = sessionCookieSameSite;
		this.sessionCookieName = sessionCookieName;
		this.csrfCookieName = csrfCookieName;
		this.customHeaderName = customHeaderName;
		this.requireCustomHeader = requireCustomHeader;
		this.strongAcrByRegistration = strongAcrByRegistration == null ? Map.of() : strongAcrByRegistration;
		this.stepUpAcrValues = stepUpAcrValues == null ? Map.of() : stepUpAcrValues;
		this.mfaAmrAnyOfByRegistration = mfaAmrAnyOfByRegistration == null ? Map.of() : mfaAmrAnyOfByRegistration;
	}

	/**
	 * Whether the ID token's {@code amr} claim satisfies the registration's AMR requirement. With no
	 * requirement configured this is true; otherwise {@code amr} must be a list containing at least one of
	 * the required values (a missing or malformed claim fails closed).
	 */
	public boolean hasRequiredAmr(String registrationId, Object amrClaim) {
		List<String> required = mfaAmrAnyOfByRegistration.getOrDefault(registrationId, List.of());
		if (required.isEmpty()) {
			return true;
		}
		if (!(amrClaim instanceof java.util.Collection<?> values)) {
			return false;
		}
		return values.stream().anyMatch(v -> v instanceof String s && required.contains(s));
	}

	/** True when the registration has an AMR requirement configured. */
	public boolean requiresAmr(String registrationId) {
		return !mfaAmrAnyOfByRegistration.getOrDefault(registrationId, List.of()).isEmpty();
	}

	/**
	 * True when the session has exceeded its absolute lifetime. Anchored to {@code authEpoch} (the
	 * successful authentication time), so ongoing activity cannot extend it (D-SEC-13).
	 */
	public boolean absoluteExpired(long authEpoch, long nowEpoch) {
		return nowEpoch - authEpoch > absoluteLifetimeSeconds;
	}

	/**
	 * True when authentication is recent enough for a sensitive action. Fails closed: a missing
	 * (non-positive) auth time is never fresh; a future auth time beyond the skew tolerance is rejected.
	 */
	public boolean freshEnough(long authTimeEpoch, long nowEpoch) {
		if (authTimeEpoch <= 0) {
			return false;
		}
		long age = nowEpoch - authTimeEpoch;
		if (age < -clockSkewSeconds) {
			return false; // implausibly future-dated
		}
		return age <= stepUpFreshnessSeconds;
	}

	/** Whether the given acr value is strong enough for a sensitive action under the registration. */
	public boolean isStrongAcr(String registrationId, String acr) {
		List<String> strong = strongAcrByRegistration.getOrDefault(registrationId, List.of());
		return acr != null && strong.contains(acr);
	}

	public long getIdleTimeoutSeconds() {
		return idleTimeoutSeconds;
	}

	public long getAbsoluteLifetimeSeconds() {
		return absoluteLifetimeSeconds;
	}

	public long getStepUpFreshnessSeconds() {
		return stepUpFreshnessSeconds;
	}

	public long getClockSkewSeconds() {
		return clockSkewSeconds;
	}

	public String getSessionCookieSameSite() {
		return sessionCookieSameSite;
	}

	public String getSessionCookieName() {
		return sessionCookieName;
	}

	public String getCsrfCookieName() {
		return csrfCookieName;
	}

	public String getCustomHeaderName() {
		return customHeaderName;
	}

	public boolean isRequireCustomHeader() {
		return requireCustomHeader;
	}

	public Map<String, List<String>> getStrongAcrByRegistration() {
		return strongAcrByRegistration;
	}

	public Map<String, String> getStepUpAcrValues() {
		return stepUpAcrValues;
	}
}
