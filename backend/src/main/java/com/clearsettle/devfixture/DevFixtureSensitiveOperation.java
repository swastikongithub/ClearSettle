package com.clearsettle.devfixture;

import java.util.Map;
import java.util.UUID;

import com.clearsettle.auth.SensitiveOperation;
import com.clearsettle.security.SecurityEvents;

import org.springframework.stereotype.Component;

/**
 * LOCAL DEVELOPMENT FIXTURE, not a product feature. ClearSettle has no sensitive business operation yet, so
 * the local stack registers this no-op one to validate the sensitive-action policy end to end in a browser
 * (request, step-up, review, single-use confirmation). Executing it changes nothing; it only records a
 * {@code dev_fixture_operation_executed} security event so tests can count executions. Registered only for the
 * local development stack ({@link LocalDevFixture}: the {@code local-dev} profile and an explicit property, on a
 * loopback origin).
 */
@Component
@LocalDevFixture
public class DevFixtureSensitiveOperation implements SensitiveOperation {

	public static final String TYPE = "dev.fixture.noop";

	private final SecurityEvents events;

	public DevFixtureSensitiveOperation(SecurityEvents events) {
		this.events = events;
	}

	@Override
	public String type() {
		return TYPE;
	}

	@Override
	public String summary(Map<String, String> params) {
		return "Development fixture: a no-op sensitive operation (changes nothing)";
	}

	@Override
	public String reviewedVersion(UUID userId, Map<String, String> params) {
		return "dev-fixture-noop-v1"; // the no-op has no state that could change after review
	}

	@Override
	public Map<String, Object> execute(UUID userId, Map<String, String> params, String reviewedVersion) {
		events.record("dev_fixture_operation_executed", userId, "type=" + TYPE);
		return Map.of("changed", false);
	}
}
