package com.clearsettle.auth;

import java.util.UUID;

import javax.sql.DataSource;

import com.clearsettle.security.SessionAttributes;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;

import static com.clearsettle.auth.StepUpPostgresFixture.APP;
import static com.clearsettle.auth.StepUpPostgresFixture.handler;
import static com.clearsettle.auth.StepUpPostgresFixture.mfaToken;
import static com.clearsettle.auth.StepUpPostgresFixture.stepUpCallback;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * DIAGNOSTIC, not part of the standard suite: reproduces the Spring Session JDBC 4.1.1 behaviour behind defect
 * 12 on a real PostgreSQL database. Runs only with {@code CS_TEST_PG_URL} and {@code CS_TEST_PG_DIAGNOSTICS=true}.
 *
 * <p>The library's principal query has no ORDER BY, and its row extractor merges a row only into the session it
 * built last. Whether PostgreSQL interleaves the rows of several sessions depends on its query plan (observed: a
 * hash join over a sequential scan of the attribute rows once statistics are current), so the outcome of the
 * first test is not deterministic across versions and settings. Use it to check whether a Spring Session
 * upgrade has changed the behaviour; the product's regression tests are in {@link StepUpOriginPostgresTest}.
 */
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_URL", matches = ".+")
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_DIAGNOSTICS", matches = "true")
class SpringSessionPrincipalQueryDiagnosticTest {

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

	@SuppressWarnings("rawtypes")
	private FindByIndexNameSessionRepository repository() {
		return store;
	}

	/** Three sessions of one user, the nonce on the third, then updates that interleave their attribute rows. */
	@SuppressWarnings("unchecked")
	private String[] threeSessionsWithInterleavedUpdates(long anchor) {
		String[] ids = new String[3];
		for (int i = 0; i < 3; i++) {
			Session s = (Session) repository().createSession();
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
		new JdbcTemplate(dataSource).execute("ANALYZE spring_session; ANALYZE spring_session_attributes");
		return ids;
	}

	@SuppressWarnings("unchecked")
	private void update(String id, String name, Object value) {
		Session s = (Session) repository().findById(id);
		s.setAttribute(name, value);
		repository().save(s);
	}

	@Test
	void theLibrarysPrincipalQueryReturnsASessionWithoutSomeOfItsAttributes() {
		String[] ids = threeSessionsWithInterleavedUpdates(1_700_000_000L);

		Session viaIndex = (Session) repository().findByPrincipalName(userId.toString()).get(ids[2]);
		Session viaId = (Session) repository().findById(ids[2]);

		assertThat(viaId.<String>getAttribute(SessionAttributes.STEP_UP_NONCE)).isEqualTo("nonce-pg");
		assertThat(viaIndex.getAttributeNames())
				.as("the principal query returned the session split (fails if the library or the plan changed)")
				.hasSizeLessThan(viaId.getAttributeNames().size());
	}

	@Test
	void stepUpSucceedsWithTheLibrarysOwnPrincipalIndex() throws Exception {
		long anchor = 1_700_000_000L;
		String[] ids = threeSessionsWithInterleavedUpdates(anchor);
		String action = UUID.randomUUID().toString();
		MockHttpServletRequest req = stepUpCallback(action, "nonce-pg");
		MockHttpServletResponse res = new MockHttpServletResponse();

		handler(userId, store).onAuthenticationSuccess(req, res, mfaToken());

		assertThat(res.getRedirectedUrl()).isEqualTo(APP + "/review?action=" + action);
		assertThat(req.getSession(false).getAttribute(SessionAttributes.AUTHENTICATED_AT)).isEqualTo(anchor + 2);
		assertThat(store.findById(ids[2])).isNull();
		assertThat(store.findById(ids[0])).isNotNull();
		assertThat(store.findById(ids[1])).isNotNull();
	}
}
