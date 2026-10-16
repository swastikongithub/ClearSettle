package com.clearsettle.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * OIDC client and application-origin configuration ({@code clearsettle.oidc.*}). Secrets come from the
 * environment; the login-state secret encrypts the {@code __Host-CSLOGIN} cookie (D-SEC-15).
 */
@ConfigurationProperties(prefix = "clearsettle.oidc")
public record ClientRegistrationProperties(
		String appBaseUrl,
		String loginStateSecret,
		Registration keycloak) {

	public record Registration(String issuerUri, String clientId, String clientSecret) {
	}
}
