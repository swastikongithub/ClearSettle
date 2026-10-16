package com.clearsettle.config;

import com.clearsettle.config.ClientRegistrationProperties.Registration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.ClientRegistrations;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

/**
 * Builds the Keycloak confidential client in code, because Spring Boot 4.1.1 exposes no property for
 * {@code ClientSettings.requireProofKey}; explicit PKCE (S256) for a confidential client must be set
 * here (D-SEC-12). The redirect URI is a fixed absolute base so it never depends on request headers.
 */
@Configuration
@ConditionalOnProperty(name = "clearsettle.oidc.enabled", havingValue = "true", matchIfMissing = true)
public class ClientRegistrationConfig {

	private static final Logger log = LoggerFactory.getLogger(ClientRegistrationConfig.class);

	@Bean
	ClientRegistrationRepository clientRegistrationRepository(ClientRegistrationProperties props) {
		Registration kc = props.keycloak();
		ClientRegistration keycloak = ClientRegistrations.fromIssuerLocation(kc.issuerUri())
				.registrationId("keycloak")
				.clientId(kc.clientId())
				.clientSecret(kc.clientSecret())
				.clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
				.authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
				.redirectUri(props.appBaseUrl() + "/login/oauth2/code/{registrationId}")
				.scope("openid", "profile", "email")
				// Force PKCE for the confidential client (S256 is applied by Spring's resolver).
				.clientSettings(ClientRegistration.ClientSettings.builder().requireProofKey(true).build())
				.build();
		log.info("OIDC client registered: issuer={} clientId={} pkce=required", kc.issuerUri(), kc.clientId());
		return new InMemoryClientRegistrationRepository(keycloak);
	}
}
