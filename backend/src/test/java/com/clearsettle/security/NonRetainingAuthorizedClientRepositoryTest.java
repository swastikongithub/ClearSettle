package com.clearsettle.security;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;

import static org.assertj.core.api.Assertions.assertThat;

/** F-3: an authorized client (access + refresh token) handed to the repository is never retained. */
class NonRetainingAuthorizedClientRepositoryTest {

	@Test
	void savedAuthorizedClientIsNotRetained() {
		ClientRegistration reg = ClientRegistration.withRegistrationId("keycloak")
				.clientId("c").clientSecret("s").authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
				.redirectUri("{baseUrl}/login/oauth2/code/keycloak").authorizationUri("https://idp/auth")
				.tokenUri("https://idp/token").build();
		OAuth2AccessToken access = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "access-token-value",
				Instant.now(), Instant.now().plusSeconds(300));
		OAuth2AuthorizedClient client = new OAuth2AuthorizedClient(reg, "alice", access,
				new OAuth2RefreshToken("refresh-token-value", Instant.now()));
		var principal = new TestingAuthenticationToken("alice", "n/a");
		var repo = new NonRetainingAuthorizedClientRepository();
		var req = new MockHttpServletRequest();

		repo.saveAuthorizedClient(client, principal, req, new MockHttpServletResponse());

		OAuth2AuthorizedClient loaded = repo.loadAuthorizedClient("keycloak", principal, req);
		assertThat(loaded).isNull();
		assertThat(req.getSession(false)).as("nothing written to the HTTP session either").isNull();
	}
}
