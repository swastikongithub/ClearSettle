package com.clearsettle.auth;

import java.sql.Connection;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import javax.sql.DataSource;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.SecurityEvents;
import com.clearsettle.security.SessionAttributes;
import com.clearsettle.session.StashingAuthorizationRequestRepository;

import org.mockito.Mockito;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.MapSession;
import org.springframework.session.Session;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.transaction.support.TransactionTemplate;

/** Shared set-up for the step-up tests that run on PostgreSQL's real Spring Session JDBC store. */
final class StepUpPostgresFixture {

	static final String ISS = "https://idp.example.net/realms/clearsettle";
	static final String SUB = "pg-step-up-subject";
	static final String APP = "https://app.example.test";

	private StepUpPostgresFixture() {
	}

	static DataSource database() throws Exception {
		DataSource ds = new DriverManagerDataSource(System.getenv("CS_TEST_PG_URL"), System.getenv("CS_TEST_PG_USER"),
				System.getenv("CS_TEST_PG_PASSWORD"));
		try (Connection c = ds.getConnection()) {
			ScriptUtils.executeSqlScript(c, new ClassPathResource("db/schema.sql"));
		}
		return ds;
	}

	static JdbcIndexedSessionRepository sessionStore(DataSource ds) {
		JdbcIndexedSessionRepository repo = new JdbcIndexedSessionRepository(new JdbcTemplate(ds),
				new TransactionTemplate(new DataSourceTransactionManager(ds)));
		repo.setDefaultMaxInactiveInterval(Duration.ofMinutes(15));
		return repo;
	}

	/** One stored session of the user, signed in at {@code anchor}, carrying {@code nonce} if it started a step-up. */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	static String storedSession(FindByIndexNameSessionRepository repo, UUID userId, long anchor, String nonce) {
		Session s = (Session) repo.createSession();
		s.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, userId.toString());
		s.setAttribute(SessionAttributes.AUTHENTICATED_AT, anchor);
		if (nonce != null) {
			s.setAttribute(SessionAttributes.STEP_UP_NONCE, nonce);
		}
		repo.save(s);
		return s.getId();
	}

	static LoginHandlers.Success handler(UUID userId,
			FindByIndexNameSessionRepository<? extends Session> sessions) {
		AuthProperties props = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of(), Map.of("keycloak", List.of("otp")));
		AppUserService users = Mockito.mock(AppUserService.class);
		AppUser user = new AppUser(userId, ISS, SUB, "pg@example.test", false);
		Mockito.when(users.find(ISS, SUB)).thenReturn(Optional.of(user));
		Mockito.when(users.findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any())).thenReturn(user);
		return new LoginHandlers.Success(props, users, Mockito.mock(SecurityEvents.class), APP, sessions);
	}

	/** The step-up callback, arriving in a new session as it does under SameSite=Strict. */
	static MockHttpServletRequest stepUpCallback(String action, String nonce) {
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		req.setSession(new MockHttpSession());
		req.setAttribute(StashingAuthorizationRequestRepository.CONSUMED, OAuth2AuthorizationRequest.authorizationCode()
				.authorizationUri("https://idp/auth").clientId("c").redirectUri("https://app/cb").state("s")
				.attributes(a -> {
					a.put(StepUpAuthorizationRequestResolver.ATTR_ISS, ISS);
					a.put(StepUpAuthorizationRequestResolver.ATTR_SUB, SUB);
					a.put(StepUpAuthorizationRequestResolver.ATTR_ACTION, action);
					a.put(StepUpAuthorizationRequestResolver.ATTR_SESSION_NONCE, nonce);
				}).build());
		return req;
	}

	static OAuth2AuthenticationToken mfaToken() {
		OidcIdToken idToken = OidcIdToken.withTokenValue("t").claim("iss", ISS).claim("sub", SUB).claim("acr", "mfa")
				.claim("amr", List.of("otp")).build();
		return new OAuth2AuthenticationToken(new DefaultOidcUser(AuthorityUtils.NO_AUTHORITIES, idToken),
				AuthorityUtils.NO_AUTHORITIES, "keycloak");
	}

	/**
	 * The real store, except that its principal index returns each session with only the principal attribute:
	 * the worst case of the library behaviour behind defect 12, made deterministic. Reads by id are real.
	 */
	@SuppressWarnings({ "rawtypes", "unchecked" })
	static FindByIndexNameSessionRepository<Session> partialPrincipalIndex(FindByIndexNameSessionRepository real) {
		return new FindByIndexNameSessionRepository<>() {
			@Override
			public Map<String, Session> findByIndexNameAndIndexValue(String indexName, String indexValue) {
				Map<String, Session> partial = new HashMap<>();
				((Map<String, Session>) real.findByIndexNameAndIndexValue(indexName, indexValue)).forEach((id, s) -> {
					MapSession fragment = new MapSession(id);
					fragment.setAttribute(PRINCIPAL_NAME_INDEX_NAME, s.getAttribute(PRINCIPAL_NAME_INDEX_NAME));
					partial.put(id, fragment);
				});
				return partial;
			}

			@Override
			public Session createSession() {
				return (Session) real.createSession();
			}

			@Override
			public void save(Session session) {
				real.save(session);
			}

			@Override
			public Session findById(String id) {
				return (Session) real.findById(id);
			}

			@Override
			public void deleteById(String id) {
				real.deleteById(id);
			}
		};
	}
}
