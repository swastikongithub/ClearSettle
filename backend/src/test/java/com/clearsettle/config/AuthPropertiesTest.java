package com.clearsettle.config;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure, deterministic tests of the session/freshness policy logic. No Spring context, no clock
 * dependency: the "now" is passed in, so absolute-expiration and freshness are tested exactly.
 */
class AuthPropertiesTest {

	private AuthProperties props() {
		// Approved production values: 15-min idle, 8-h absolute, 5-min freshness, 30s skew.
		return new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of("keycloak", "mfa"));
	}

	@Test
	void absoluteLifetimeIsEightHoursAndNotExtendedByActivity() {
		AuthProperties p = props();
		long auth = 1_000_000L;
		// Within 8h: not expired, regardless of how "active" (now) is.
		assertThat(p.absoluteExpired(auth, auth + 28800)).isFalse();
		assertThat(p.absoluteExpired(auth, auth + 28800 - 1)).isFalse();
		// Past 8h from the ANCHOR (authentication time), it is expired even if the user was active since.
		assertThat(p.absoluteExpired(auth, auth + 28800 + 1)).isTrue();
		assertThat(p.absoluteExpired(auth, auth + 100000)).isTrue();
	}

	@Test
	void freshnessWindowIsFiveMinutesAndFailsClosed() {
		AuthProperties p = props();
		long now = 2_000_000L;
		assertThat(p.freshEnough(now, now)).isTrue();                 // just authenticated
		assertThat(p.freshEnough(now - 300, now)).isTrue();           // exactly 5 min
		assertThat(p.freshEnough(now - 301, now)).isFalse();          // older than 5 min
		assertThat(p.freshEnough(0, now)).isFalse();                  // missing auth_time -> fail closed
		assertThat(p.freshEnough(-1, now)).isFalse();                 // invalid -> fail closed
		assertThat(p.freshEnough(now + 31, now)).isFalse();           // implausibly future (beyond skew)
		assertThat(p.freshEnough(now + 20, now)).isTrue();            // small future within skew tolerance
	}

	@Test
	void strongAcrIsProviderAware() {
		AuthProperties p = props();
		assertThat(p.isStrongAcr("keycloak", "mfa")).isTrue();
		assertThat(p.isStrongAcr("keycloak", "pwd")).isFalse();
		assertThat(p.isStrongAcr("keycloak", null)).isFalse();
		assertThat(p.isStrongAcr("unknown-registration", "mfa")).isFalse();
	}

	@Test
	void amrRequirementIsAnyOfAndFailsClosed() {
		AuthProperties p = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of(), Map.of("keycloak", List.of("otp", "hwk")));
		assertThat(p.hasRequiredAmr("keycloak", List.of("pwd", "otp"))).isTrue();
		assertThat(p.hasRequiredAmr("keycloak", List.of("hwk"))).isTrue();
		assertThat(p.hasRequiredAmr("keycloak", List.of("pwd"))).isFalse();
		assertThat(p.hasRequiredAmr("keycloak", List.of())).isFalse();
		assertThat(p.hasRequiredAmr("keycloak", null)).isFalse();
		assertThat(p.hasRequiredAmr("keycloak", "otp")).as("malformed (not a list)").isFalse();
		assertThat(p.hasRequiredAmr("other", null)).as("no requirement configured").isTrue();
	}

	@Test
	void approvedDefaultsArePresent() {
		AuthProperties p = props();
		assertThat(p.getIdleTimeoutSeconds()).isEqualTo(900);        // 15 minutes
		assertThat(p.getAbsoluteLifetimeSeconds()).isEqualTo(28800); // 8 hours
		assertThat(p.getSessionCookieSameSite()).isEqualTo("Strict");
		assertThat(p.getSessionCookieName()).startsWith("__Host-");
		assertThat(p.getCsrfCookieName()).startsWith("__Host-");
		assertThat(p.isRequireCustomHeader()).isTrue();
	}
}
