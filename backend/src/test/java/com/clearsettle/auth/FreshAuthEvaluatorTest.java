package com.clearsettle.auth;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.clearsettle.config.AuthProperties;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Mirrors the M0 spike's U-04 fail-closed evidence check, as pure product logic: strength ({@code acr})
 * and recency ({@code auth_time}) must both hold; anything missing/weak/malformed/stale refuses.
 */
class FreshAuthEvaluatorTest {

	private final FreshAuthEvaluator evaluator = new FreshAuthEvaluator(new AuthProperties(
			900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN", "X-CS-Request", true,
			Map.of("keycloak", List.of("mfa")), Map.of("keycloak", "mfa")));

	private final Instant now = Instant.ofEpochSecond(2_000_000L);

	private Map<String, Object> claims(Object acr, Object authTime) {
		Map<String, Object> m = new HashMap<>();
		if (acr != null) {
			m.put("acr", acr);
		}
		if (authTime != null) {
			m.put("auth_time", authTime);
		}
		return m;
	}

	@Test
	void strongAcrAndFreshAuthTimePasses() {
		var d = evaluator.evaluate("keycloak", claims("mfa", now.getEpochSecond()), now);
		assertThat(d.ok()).isTrue();
		assertThat(d.reasons()).isEmpty();
	}

	@Test
	void missingAcrFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims(null, now.getEpochSecond()), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("acr_missing");
	}

	@Test
	void weakAcrFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims("pwd", now.getEpochSecond()), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("acr_insufficient");
	}

	@Test
	void malformedAcrFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims(2, now.getEpochSecond()), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("acr_malformed");
	}

	@Test
	void missingAuthTimeFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims("mfa", null), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("auth_time_missing");
	}

	@Test
	void malformedAuthTimeFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims("mfa", "yesterday"), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("auth_time_malformed");
	}

	@Test
	void staleAuthTimeFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims("mfa", now.getEpochSecond() - 301), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("auth_time_too_old");
	}

	@Test
	void futureAuthTimeFailsClosed() {
		var d = evaluator.evaluate("keycloak", claims("mfa", now.getEpochSecond() + 31), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("auth_time_in_future");
	}

	// ---- method evidence (amr) where the provider issues it ----
	private final FreshAuthEvaluator amrEvaluator = new FreshAuthEvaluator(new AuthProperties(
			900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN", "X-CS-Request", true,
			Map.of("keycloak", List.of("mfa")), Map.of("keycloak", "mfa"), Map.of("keycloak", List.of("otp"))));

	@Test
	void strongAcrFreshAndOtpAmrPasses() {
		Map<String, Object> c = claims("mfa", now.getEpochSecond());
		c.put("amr", List.of("otp"));
		assertThat(amrEvaluator.evaluate("keycloak", c, now).ok()).isTrue();
	}

	@Test
	void strongAcrWithMissingAmrFailsClosed() {
		var d = amrEvaluator.evaluate("keycloak", claims("mfa", now.getEpochSecond()), now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("amr_missing");
	}

	@Test
	void strongAcrWithEmptyAmrFailsClosed() {
		Map<String, Object> c = claims("mfa", now.getEpochSecond());
		c.put("amr", List.of());
		var d = amrEvaluator.evaluate("keycloak", c, now);
		assertThat(d.ok()).isFalse();
		assertThat(d.reasons()).contains("amr_insufficient");
	}

	@Test
	void instantAuthTimeAlsoAccepted() {
		var d = evaluator.evaluate("keycloak", claims("mfa", now), now);
		assertThat(d.ok()).isTrue();
	}
}
