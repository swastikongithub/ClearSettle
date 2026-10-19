package com.clearsettle.auth;

import java.util.UUID;

import javax.sql.DataSource;

import com.clearsettle.security.SessionAttributes;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;

import static com.clearsettle.auth.StepUpPostgresFixture.APP;
import static com.clearsettle.auth.StepUpPostgresFixture.handler;
import static com.clearsettle.auth.StepUpPostgresFixture.mfaToken;
import static com.clearsettle.auth.StepUpPostgresFixture.partialPrincipalIndex;
import static com.clearsettle.auth.StepUpPostgresFixture.stepUpCallback;
import static com.clearsettle.auth.StepUpPostgresFixture.storedSession;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression for defect 12 (M1 wall-clock finding LR-03) on the production engine and the real Spring Session
 * JDBC store. Runs only with {@code CS_TEST_PG_URL} (plus user and password) pointing at a disposable database.
 *
 * <p>Spring Session JDBC's principal query can return a session without some of its attributes when PostgreSQL
 * interleaves the rows of several sessions. Whether it does depends on the query plan, so these tests do not
 * rely on it: the principal index is made to return partial sessions deterministically, and the step-up must
 * still find the originating session by reading it by id. The planner-dependent reproduction of the library
 * behaviour itself is {@link SpringSessionPrincipalQueryDiagnosticTest}, outside the standard suite.
 */
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_URL", matches = ".+")
class StepUpOriginPostgresTest {

	private static DataSource dataSource;

	private final UUID userId = UUID.randomUUID();
	private JdbcIndexedSessionRepository store;

	@BeforeAll
	static void schema() throws Exception {
		dataSource = StepUpPostgresFixture.database();
	}

	@BeforeEach
	void setUp() {
		store = StepUpPostgresFixture.sessionStore(dataSource);
	}

	@AfterEach
	void tearDown() {
		store.findByPrincipalName(userId.toString()).keySet().forEach(store::deleteById);
	}

	@Test
	void stepUpFindsAndRetiresTheOriginatingSessionWhenThePrincipalIndexReturnsPartialSessions() throws Exception {
		long anchor = 1_700_000_000L;
		String first = storedSession(store, userId, anchor, null);
		String second = storedSession(store, userId, anchor + 1, null);
		String origin = storedSession(store, userId, anchor + 2, "nonce-pg");
		String action = UUID.randomUUID().toString();
		MockHttpServletRequest req = stepUpCallback(action, "nonce-pg");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler(userId, partialPrincipalIndex(store)).onAuthenticationSuccess(req, res, mfaToken());

		assertThat(res.getRedirectedUrl()).isEqualTo(APP + "/review?action=" + action);
		assertThat(req.getSession(false).getAttribute(SessionAttributes.AUTHENTICATED_AT))
				.as("the originating session's sign-in time carries over").isEqualTo(anchor + 2);
		assertThat(store.findById(origin)).as("originating session retired").isNull();
		assertThat(store.findById(first)).as("the user's other sessions are untouched").isNotNull();
		assertThat(store.findById(second)).isNotNull();
	}

	@Test
	void stepUpWithANonceNoStoredSessionCarriesFailsClosed() throws Exception {
		String other = storedSession(store, userId, 1_700_000_000L, "a-different-nonce");
		MockHttpServletRequest req = stepUpCallback(UUID.randomUUID().toString(), "nonce-pg");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler(userId, partialPrincipalIndex(store)).onAuthenticationSuccess(req, res, mfaToken());

		assertThat(res.getRedirectedUrl()).isEqualTo(APP + "/?auth_error=session_expired");
		assertThat(req.getSession(false)).as("no session is created").isNull();
		assertThat(store.findById(other)).as("an unrelated session is not touched").isNotNull();
	}
}
