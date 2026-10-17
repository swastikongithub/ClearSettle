package com.clearsettle.auth;

import java.sql.Connection;
import java.time.Duration;
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

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.mockito.Mockito;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression for the M1 wall-clock finding LR-03, on the production engine and the real Spring Session JDBC
 * repository. Runs only with {@code CS_TEST_PG_URL} (plus user and password) pointing at a disposable database.
 *
 * <p>Spring Session JDBC 4.1.1 reads a user's sessions with a principal-name query that has no ORDER BY, and
 * its row extractor merges a row only into the session it built last. On PostgreSQL the rows of several
 * sessions interleave once their attributes have been updated, so a session comes back split and the copy
 * kept can lack attributes. The step-up lookup must not depend on that query's attributes.
 */
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_URL", matches = ".+")
class StepUpOriginPostgresTest {

	private static final String ISS = "https://idp.example.net/realms/clearsettle";
	private static final String SUB = "pg-step-up-subject";
	private static DataSource dataSource;

	private final UUID userId = UUID.randomUUID();
	private JdbcIndexedSessionRepository sessions;

	@BeforeAll
	static void schema() throws Exception {
		dataSource = new DriverManagerDataSource(System.getenv("CS_TEST_PG_URL"), System.getenv("CS_TEST_PG_USER"),
				System.getenv("CS_TEST_PG_PASSWORD"));
		try (Connection c = dataSource.getConnection()) {
			ScriptUtils.executeSqlScript(c, new ClassPathResource("db/schema.sql"));
		}
	}

	@BeforeEach
	void setUp() {
		sessions = new JdbcIndexedSessionRepository(new JdbcTemplate(dataSource),
				new TransactionTemplate(new DataSourceTransactionManager(dataSource)));
		sessions.setDefaultMaxInactiveInterval(Duration.ofMinutes(15));
	}

	@AfterEach
	void tearDown() {
		sessions.findByPrincipalName(userId.toString()).keySet().forEach(sessions::deleteById);
	}

	/** The repository through its public interface (its session class is package-private). */
	@SuppressWarnings("rawtypes")
	private FindByIndexNameSessionRepository repository() {
		return sessions;
	}

	/** Three sessions of one user, the nonce on the third, then updates that interleave their attribute rows. */
	@SuppressWarnings("unchecked")
	private String[] threeSessionsWithInterleavedUpdates(long anchor) {
		String[] ids = new String[3];
		for (int i = 0; i < 3; i++) {
			Session s = repository().createSession();
			s.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, userId.toString());
			s.setAttribute(SessionAttributes.AUTHENTICATED_AT, anchor + i);
			s.setAttribute("e2e.counter", 0);
			repository().save(s);
			ids[i] = s.getId();
		}
		update(ids[2], SessionAttributes.STEP_UP_NONCE, "nonce-pg");
		update(ids[0], "e2e.counter", 1);
		update(ids[2], "e2e.counter", 1);
		update(ids[1], "e2e.counter", 1);
		// Current statistics, as autovacuum keeps them on a live database: the planner then joins the two
		// tables with a hash join over a sequential scan of the attribute rows (as observed on the dev stack),
		// so rows come back in physical order rather than grouped by session.
		new JdbcTemplate(dataSource).execute("ANALYZE spring_session; ANALYZE spring_session_attributes");
		return ids;
	}

	@SuppressWarnings("unchecked")
	private void update(String id, String name, Object value) {
		Session s = repository().findById(id);
		s.setAttribute(name, value);
		repository().save(s);
	}

	@Test
	void theLibrarysPrincipalQueryCanReturnASessionWithoutSomeOfItsAttributes() {
		String[] ids = threeSessionsWithInterleavedUpdates(1_700_000_000L);

		Session viaIndex = (Session) repository().findByPrincipalName(userId.toString()).get(ids[2]);
		Session viaId = repository().findById(ids[2]);

		// Documents the behaviour the fix works around. If a future Spring Session orders its rows, this
		// fails and the workaround in LoginHandlers can be reviewed.
		assertThat(viaId.<String>getAttribute(SessionAttributes.STEP_UP_NONCE)).isEqualTo("nonce-pg");
		assertThat(viaIndex.getAttributeNames()).hasSizeLessThan(viaId.getAttributeNames().size());
	}

	@Test
	void stepUpFindsAndRetiresTheOriginatingSessionDespiteInterleavedRows() throws Exception {
		long anchor = 1_700_000_000L;
		String[] ids = threeSessionsWithInterleavedUpdates(anchor);
		AuthProperties props = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of(), Map.of("keycloak", List.of("otp")));
		AppUserService users = Mockito.mock(AppUserService.class);
		AppUser user = new AppUser(userId, ISS, SUB, "pg@example.test", false);
		Mockito.when(users.find(ISS, SUB)).thenReturn(Optional.of(user));
		Mockito.when(users.findOrCreate(Mockito.anyString(), Mockito.anyString(), Mockito.any())).thenReturn(user);
		var handler = new LoginHandlers.Success(props, users, Mockito.mock(SecurityEvents.class), "https://app.example.test", sessions);

		String action = UUID.randomUUID().toString();
		MockHttpServletRequest req = new MockHttpServletRequest("GET", "/login/oauth2/code/keycloak");
		req.setSession(new MockHttpSession()); // the callback arrives in a new session (SameSite=Strict)
		req.setAttribute(StashingAuthorizationRequestRepository.CONSUMED, OAuth2AuthorizationRequest.authorizationCode()
				.authorizationUri("https://idp/auth").clientId("c").redirectUri("https://app/cb").state("s")
				.attributes(a -> {
					a.put(StepUpAuthorizationRequestResolver.ATTR_ISS, ISS);
					a.put(StepUpAuthorizationRequestResolver.ATTR_SUB, SUB);
					a.put(StepUpAuthorizationRequestResolver.ATTR_ACTION, action);
					a.put(StepUpAuthorizationRequestResolver.ATTR_SESSION_NONCE, "nonce-pg");
				}).build());
		OidcIdToken idToken = OidcIdToken.withTokenValue("t").claim("iss", ISS).claim("sub", SUB).claim("acr", "mfa")
				.claim("amr", List.of("otp")).build();
		var token = new OAuth2AuthenticationToken(new DefaultOidcUser(AuthorityUtils.NO_AUTHORITIES, idToken),
				AuthorityUtils.NO_AUTHORITIES, "keycloak");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler.onAuthenticationSuccess(req, res, token);

		assertThat(res.getRedirectedUrl()).isEqualTo("https://app.example.test/review?action=" + action);
		assertThat(req.getSession(false).getAttribute(SessionAttributes.AUTHENTICATED_AT)).isEqualTo(anchor + 2);
		assertThat(sessions.findById(ids[2])).as("originating session retired").isNull();
		assertThat(sessions.findById(ids[0])).as("the user's other sessions are untouched").isNotNull();
		assertThat(sessions.findById(ids[1])).isNotNull();
	}
}
