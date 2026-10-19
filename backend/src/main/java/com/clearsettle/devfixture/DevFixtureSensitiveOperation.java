package com.clearsettle.devfixture;

import java.util.Map;
import java.util.UUID;

import com.clearsettle.auth.SensitiveOperation;
import com.clearsettle.security.SecurityEvents;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * LOCAL DEVELOPMENT FIXTURE, not a product feature. ClearSettle has no sensitive business operation yet, so
 * the local stack registers this no-op one to validate the sensitive-action policy end to end in a browser
 * (request, step-up, review, single-use confirmation). Executing it changes nothing; it only records a
 * {@code dev_fixture_operation_executed} security event so tests can count executions. Registered only when
 * {@code clearsettle.dev-fixtures.enabled=true} (set by deploy/docker-compose.yml); never enable it elsewhere.
 */
@Component
@ConditionalOnProperty(name = "clearsettle.dev-fixtures.enabled", havingValue = "true")
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
	public Map<String, Object> execute(UUID userId, Map<String, String> params) {
		events.record("dev_fixture_operation_executed", userId, "type=" + TYPE);
		return Map.of("changed", false);
	}
}
