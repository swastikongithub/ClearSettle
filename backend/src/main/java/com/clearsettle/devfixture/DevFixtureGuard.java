package com.clearsettle.devfixture;

import java.net.URI;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Fails startup when the local development fixtures are enabled anywhere but a loopback origin. The fixtures
 * already need both the {@value LocalDevFixture#PROFILE} profile and an explicit property; this third check
 * ties them to the one place they belong, a developer's machine, whatever the configuration says.
 */
@Component
@LocalDevFixture
public class DevFixtureGuard {

	private static final Set<String> LOOPBACK = Set.of("localhost", "127.0.0.1", "[::1]");

	public DevFixtureGuard(@Value("${clearsettle.oidc.app-base-url:}") String appBaseUrl) {
		String host = appBaseUrl.isBlank() ? null : URI.create(appBaseUrl).getHost();
		if (host == null || !LOOPBACK.contains(host.toLowerCase())) {
			throw new IllegalStateException("Development fixtures are enabled, but the application is not served from a "
					+ "loopback origin (clearsettle.oidc.app-base-url). Refusing to start: they are for local development only.");
		}
	}
}
