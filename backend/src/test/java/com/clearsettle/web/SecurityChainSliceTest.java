package com.clearsettle.web;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real {@link com.clearsettle.config.SecurityConfig} chain (CSRF SPA repository, required
 * custom header, authorization, JSON errors) against H2, with no Keycloak/PostgreSQL. Verifies
 * AC-160 / NFR-SEC-022 outcomes and that the CSRF layer — not an incidental error — rejects (F-4).
 *
 * <p>MockMvc is built from the WebApplicationContext with the Spring Security configurer, avoiding the
 * Boot 4 webmvc-test-autoconfigure module.
 */
@SpringBootTest
@ActiveProfiles("test")
class SecurityChainSliceTest {

	private static final String ISS = "https://idp.example.net/realms/clearsettle";
	private static final String SUB = "alice-subject";

	@TestConfiguration
	static class StubOidc {
		@Bean
		ClientRegistrationRepository clientRegistrationRepository() {
			return new InMemoryClientRegistrationRepository(keycloakRegistration());
		}
	}

	static ClientRegistration keycloakRegistration() {
		return ClientRegistration.withRegistrationId("keycloak")
				.clientId("test").clientSecret("test")
				.authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
				.redirectUri("{baseUrl}/login/oauth2/code/keycloak")
				.authorizationUri("https://idp.example.net/authorize")
				.tokenUri("https://idp.example.net/token")
				.jwkSetUri("https://idp.example.net/jwks")
				.issuerUri(ISS)
				.userNameAttributeName("sub")
				.scope("openid")
				.build();
	}

	@Autowired
	WebApplicationContext wac;

	@Autowired
	JdbcTemplate jdbc;

	MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
		jdbc.update("delete from app_user where iss = ? and sub = ?", ISS, SUB);
		jdbc.update("insert into app_user(id, iss, sub, email, disabled) values (?,?,?,?,false)",
				UUID.randomUUID(), ISS, SUB, "alice@example.test");
	}

	private RequestPostProcessor alice() {
		return oidcLogin()
				.clientRegistration(keycloakRegistration())
				.idToken(t -> t.subject(SUB).issuer(ISS).claim("acr", "mfa"));
	}

	@Autowired
	org.springframework.session.FindByIndexNameSessionRepository<?> sessionRepository;

	/**
	 * Regression (M1 integration defect): with a raw spring-session-jdbc dependency, Boot 4 created no
	 * session repository and sessions silently fell back to in-memory servlet sessions. The server-side
	 * session store must be the JDBC repository (D-SEC-11).
	 */
	@Test
	void sessionStoreIsTheJdbcRepository() {
		org.assertj.core.api.Assertions.assertThat(sessionRepository)
				.isInstanceOf(org.springframework.session.jdbc.JdbcIndexedSessionRepository.class);
	}

	@Autowired
	org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository authorizedClients;

	/**
	 * Regression (M1 integration finding, F-3): Spring's default kept every user's access and refresh
	 * tokens in an in-memory map (AuthenticatedPrincipalOAuth2AuthorizedClientRepository ->
	 * InMemoryOAuth2AuthorizedClientService) that logout does not clear. ClearSettle must retain none.
	 */
	@Test
	void noAccessOrRefreshTokensAreRetained() {
		org.assertj.core.api.Assertions.assertThat(authorizedClients)
				.isInstanceOf(com.clearsettle.security.NonRetainingAuthorizedClientRepository.class);
	}

	@Test
	void unauthenticatedApiIsRejected() throws Exception {
		mvc.perform(get("/api/me"))
				.andExpect(status().isUnauthorized())
				.andExpect(content().string(org.hamcrest.Matchers.containsString("unauthenticated")));
	}

	@Test
	void authenticatedGetSucceeds() throws Exception {
		mvc.perform(get("/api/me").with(alice()))
				.andExpect(status().isOk())
				.andExpect(content().string(org.hamcrest.Matchers.containsString("appUserId")));
	}

	@Test
	void unsafePostWithoutCsrfTokenIsRejectedByCsrfLayer() throws Exception {
		mvc.perform(post("/api/session/logout-everywhere").with(alice()).header("X-CS-Request", "1"))
				.andExpect(status().isForbidden())
				.andExpect(content().string(org.hamcrest.Matchers.containsString("csrf")));
	}

	// A valid double-submit token for the cookie-based CSRF repository: the __Host-XSRF-TOKEN cookie value
	// is the expected token, and the X-XSRF-TOKEN header must echo it (the SPA handler reads the header raw).
	private static final String CSRF = "csrf-test-token-value-0001";

	@Test
	void unsafePostWithCsrfButNoCustomHeaderIsRejected() throws Exception {
		mvc.perform(post("/api/session/logout-everywhere").with(alice())
						.cookie(new jakarta.servlet.http.Cookie("__Host-XSRF-TOKEN", CSRF))
						.header("X-XSRF-TOKEN", CSRF))
				.andExpect(status().isForbidden())
				.andExpect(content().string(org.hamcrest.Matchers.containsString("custom_header_missing")));
	}

	@Test
	void unsafePostWithCsrfAndCustomHeaderSucceeds() throws Exception {
		mvc.perform(post("/api/session/logout-everywhere").with(alice())
						.cookie(new jakarta.servlet.http.Cookie("__Host-XSRF-TOKEN", CSRF))
						.header("X-XSRF-TOKEN", CSRF)
						.header("X-CS-Request", "1"))
				.andExpect(status().isOk())
				.andExpect(content().string(org.hamcrest.Matchers.containsString("deletedSessions")));
	}
}
