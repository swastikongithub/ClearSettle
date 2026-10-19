package com.clearsettle.auth;

import java.sql.Connection;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import javax.sql.DataSource;

import com.clearsettle.auth.SensitiveActions.Outcome;
import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.SecurityEvents;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Single-use confirmation on the production database engine. Runs only when {@code CS_TEST_PG_URL} (plus
 * {@code CS_TEST_PG_USER} / {@code CS_TEST_PG_PASSWORD}) points at a disposable PostgreSQL database; the
 * production schema ({@code db/schema.sql}) is applied to it. H2 does not reproduce PostgreSQL's row locking,
 * so the concurrency guarantee is asserted here only.
 */
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_URL", matches = ".+")
class PendingActionPostgresTest {

	private static final String ISS = "https://idp.example.net/realms/clearsettle";
	private static final String TYPE = "test.fixture.pg";
	private static DataSource dataSource;

	/** A clock the test moves: expiry is decided by the application clock, not the database clock. */
	static final class MovableClock extends Clock {
		volatile Instant now = Instant.now();

		@Override
		public ZoneOffset getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(java.time.ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return now;
		}
	}

	/** Writes one effect row in the claim's transaction and holds it briefly so concurrent claims overlap. */
	static final class SlowOperation implements SensitiveOperation {
		final AtomicInteger failuresToInject = new AtomicInteger();
		private final JdbcTemplate jdbc;

		SlowOperation(JdbcTemplate jdbc) {
			this.jdbc = jdbc;
		}

		@Override
		public String type() {
			return TYPE;
		}

		@Override
		public String summary(Map<String, String> params) {
			return "pg fixture";
		}

		@Override
		public Map<String, Object> execute(UUID userId, Map<String, String> params) {
			jdbc.update("insert into security_event(event, app_user_id) values ('pg_fixture_effect', ?)", userId);
			try {
				Thread.sleep(300);
			}
			catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
			if (failuresToInject.getAndUpdate(n -> Math.max(0, n - 1)) > 0) {
				throw new IllegalStateException("injected failure");
			}
			return Map.of();
		}
	}

	JdbcTemplate jdbc;
	MovableClock clock;
	SlowOperation operation;
	SensitiveActions actions;
	StepUpService pending;
	AppUser user;

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
		jdbc = new JdbcTemplate(dataSource);
		clock = new MovableClock();
		AuthProperties props = new AuthProperties(900, 28800, 300, 30, "Strict", "__Host-CSSESSION", "__Host-XSRF-TOKEN",
				"X-CS-Request", true, Map.of("keycloak", List.of("mfa")), Map.of(), Map.of("keycloak", List.of("otp")), 300);
		pending = new StepUpService(jdbc, props, clock);
		operation = new SlowOperation(jdbc);
		actions = new SensitiveActions(List.of(operation), pending, new FreshAuthEvaluator(props), new SecurityEvents(jdbc),
				new DataSourceTransactionManager(dataSource), clock);
		String sub = "pg-" + UUID.randomUUID();
		UUID id = jdbc.queryForObject("insert into app_user(iss, sub, email) values (?,?,?) returning id", UUID.class, ISS, sub, sub + "@example.test");
		user = new AppUser(id, ISS, sub, sub + "@example.test", false);
	}

	@AfterEach
	void tearDown() {
		jdbc.update("delete from pending_action where user_id = ?", user.id());
		jdbc.update("delete from security_event where app_user_id = ?", user.id());
		jdbc.update("delete from app_user where id = ?", user.id());
	}

	private OAuth2AuthenticationToken fresh() {
		OidcIdToken t = OidcIdToken.withTokenValue("t").claim("iss", ISS).claim("sub", user.sub()).claim("acr", "mfa")
				.claim("amr", List.of("otp")).claim("auth_time", clock.instant().minusSeconds(5)).build();
		return new OAuth2AuthenticationToken(new DefaultOidcUser(AuthorityUtils.NO_AUTHORITIES, t), AuthorityUtils.NO_AUTHORITIES, "keycloak");
	}

	private int effects() {
		return jdbc.queryForObject("select count(*) from security_event where event = 'pg_fixture_effect' and app_user_id = ?",
				Integer.class, user.id());
	}

	@Test
	void concurrentConfirmationsExecuteTheActionExactlyOnce() throws Exception {
		UUID id = actions.request(user, fresh(), TYPE, Map.of()).actionId();
		int threads = 12;
		ExecutorService pool = Executors.newFixedThreadPool(threads);
		CountDownLatch go = new CountDownLatch(1);
		List<Future<Outcome>> results = new ArrayList<>();
		for (int i = 0; i < threads; i++) {
			results.add(pool.submit(() -> {
				go.await();
				return actions.confirm(user, fresh(), id).outcome();
			}));
		}
		go.countDown();
		List<Outcome> outcomes = new ArrayList<>();
		for (Future<Outcome> f : results) {
			outcomes.add(f.get(30, TimeUnit.SECONDS));
		}
		pool.shutdown();

		assertThat(outcomes).filteredOn(o -> o == Outcome.EXECUTED).hasSize(1);
		assertThat(outcomes).filteredOn(o -> o != Outcome.EXECUTED).allMatch(o -> o == Outcome.NOT_PENDING);
		assertThat(effects()).isEqualTo(1);
		assertThat(jdbc.queryForObject("select status from pending_action where id = ?", String.class, id)).isEqualTo("EXECUTED");
	}

	@Test
	void aFailedOperationRollsBackTheClaimOnPostgres() {
		UUID id = actions.request(user, fresh(), TYPE, Map.of()).actionId();
		operation.failuresToInject.set(1);

		assertThat(actions.confirm(user, fresh(), id).outcome()).isEqualTo(Outcome.FAILED);
		assertThat(jdbc.queryForObject("select status from pending_action where id = ?", String.class, id)).isEqualTo("PENDING");
		assertThat(effects()).isZero();

		assertThat(actions.confirm(user, fresh(), id).outcome()).isEqualTo(Outcome.EXECUTED);
		assertThat(effects()).isEqualTo(1);
	}

	@Test
	void expiryFollowsTheApplicationClock() {
		UUID late = actions.request(user, fresh(), TYPE, Map.of()).actionId();
		UUID inTime = actions.request(user, fresh(), TYPE, Map.of()).actionId();

		clock.now = clock.now.plusSeconds(299);
		assertThat(pending.claim(inTime, user.id())).isEqualTo(StepUpService.ClaimResult.OK);

		clock.now = clock.now.plusSeconds(2); // 301 s after the request
		assertThat(pending.isPendingForUser(late, user.id())).isFalse();
		assertThat(actions.confirm(user, fresh(), late).outcome()).isEqualTo(Outcome.EXPIRED);
		assertThat(pending.claim(late, user.id())).isEqualTo(StepUpService.ClaimResult.EXPIRED);
		assertThat(effects()).isZero();
	}

	@Test
	void anotherUsersClaimDoesNotMatch() {
		UUID id = actions.request(user, fresh(), TYPE, Map.of()).actionId();
		assertThat(pending.claim(id, UUID.randomUUID())).isEqualTo(StepUpService.ClaimResult.NOT_FOUND);
		assertThat(jdbc.queryForObject("select status from pending_action where id = ?", String.class, id)).isEqualTo("PENDING");
	}
}
