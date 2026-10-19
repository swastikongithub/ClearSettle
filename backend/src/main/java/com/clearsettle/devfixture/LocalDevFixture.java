package com.clearsettle.devfixture;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;

/**
 * Registers a bean only for the local development stack: the Spring profile {@value #PROFILE} must be active
 * AND {@code clearsettle.dev-fixtures.enabled=true} must be set, so one stray setting cannot enable it. Once
 * registered, {@link DevFixtureGuard} refuses to start the application unless it is served from a loopback
 * origin. Nothing in the product depends on these beans.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Profile(LocalDevFixture.PROFILE)
@ConditionalOnProperty(name = "clearsettle.dev-fixtures.enabled", havingValue = "true")
public @interface LocalDevFixture {

	/** The Spring profile of the local development stack (deploy/docker-compose.yml). */
	String PROFILE = "local-dev";
}
