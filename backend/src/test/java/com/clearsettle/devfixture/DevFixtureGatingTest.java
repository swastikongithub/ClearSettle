package com.clearsettle.devfixture;

import com.clearsettle.auth.SensitiveActions;
import com.clearsettle.security.SecurityEvents;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The no-op sensitive operation of the local stack can only be registered deliberately: it needs the
 * {@code local-dev} profile AND {@code clearsettle.dev-fixtures.enabled=true}, and even then the application
 * refuses to start unless it is served from a loopback origin.
 */
class DevFixtureGatingTest {

	private final ApplicationContextRunner runner = new ApplicationContextRunner()
			.withBean(SensitiveActions.class, () -> Mockito.mock(SensitiveActions.class))
			.withBean(SecurityEvents.class, () -> Mockito.mock(SecurityEvents.class))
			.withUserConfiguration(DevFixtureGuard.class, DevFixtureSensitiveOperation.class, DevFixtureController.class);

	@Test
	void absentByDefault() {
		runner.withPropertyValues("clearsettle.oidc.app-base-url=https://localhost:8443")
				.run(ctx -> assertThat(ctx).hasNotFailed().doesNotHaveBean(DevFixtureSensitiveOperation.class)
						.doesNotHaveBean(DevFixtureController.class).doesNotHaveBean(DevFixtureGuard.class));
	}

	@Test
	void thePropertyAloneDoesNotEnableIt() {
		runner.withPropertyValues("clearsettle.dev-fixtures.enabled=true", "clearsettle.oidc.app-base-url=https://localhost:8443")
				.run(ctx -> assertThat(ctx).hasNotFailed().doesNotHaveBean(DevFixtureSensitiveOperation.class)
						.doesNotHaveBean(DevFixtureController.class));
	}

	@Test
	void theProfileAloneDoesNotEnableIt() {
		runner.withPropertyValues("spring.profiles.active=local-dev", "clearsettle.oidc.app-base-url=https://localhost:8443")
				.run(ctx -> assertThat(ctx).hasNotFailed().doesNotHaveBean(DevFixtureSensitiveOperation.class)
						.doesNotHaveBean(DevFixtureController.class));
	}

	@Test
	void theProfileAndThePropertyOnALoopbackOriginEnableIt() {
		runner.withPropertyValues("spring.profiles.active=local-dev", "clearsettle.dev-fixtures.enabled=true",
				"clearsettle.oidc.app-base-url=https://localhost:8443")
				.run(ctx -> assertThat(ctx).hasNotFailed().hasSingleBean(DevFixtureSensitiveOperation.class)
						.hasSingleBean(DevFixtureController.class));
	}

	@Test
	void enablingItOnAnyOtherOriginStopsTheApplication() {
		for (String origin : new String[] { "https://app.clearsettle.example", "https://localhost.example.com", "" }) {
			runner.withPropertyValues("spring.profiles.active=local-dev", "clearsettle.dev-fixtures.enabled=true",
					"clearsettle.oidc.app-base-url=" + origin)
					.run(ctx -> assertThat(ctx).as(origin).hasFailed().getFailure()
							.rootCause().hasMessageContaining("loopback origin"));
		}
	}
}
