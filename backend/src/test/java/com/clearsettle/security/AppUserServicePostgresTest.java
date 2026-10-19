package com.clearsettle.security;

import java.sql.Connection;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import javax.sql.DataSource;

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
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * User provisioning on the production engine (D-SEC-12). Runs only when {@code CS_TEST_PG_URL} (plus
 * {@code CS_TEST_PG_USER} / {@code CS_TEST_PG_PASSWORD}) points at a disposable PostgreSQL database; the
 * production schema ({@code db/schema.sql}) is applied to it. H2 cannot run the production statement.
 *
 * <p>The concurrency tests call {@code findOrCreate} inside caller transactions that keep working afterwards,
 * because a uniqueness violation inside a PostgreSQL transaction aborts it: provisioning must never raise one.
 */
@EnabledIfEnvironmentVariable(named = "CS_TEST_PG_URL", matches = ".+")
class AppUserServicePostgresTest {

	private static final String ISS = "https://idp.example.net/realms/clearsettle";
	private static final String OTHER_ISS = "https://other-idp.example.net/realms/clearsettle";
	private static final int SIGN_INS = 16;
	private static DataSource dataSource;

	private final String run = UUID.randomUUID().toString();
	private JdbcTemplate jdbc;
	private TransactionTemplate tx;
	private AppUserService users;

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
		tx = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
		users = new AppUserService(jdbc);
	}

	@AfterEach
	void tearDown() {
		jdbc.update("delete from app_user where sub like ?", run + "%");
	}

	private String sub(String name) {
		return run + "-" + name;
	}

	private int rows(String iss, String sub) {
		return jdbc.queryForObject("select count(*) from app_user where iss = ? and sub = ?", Integer.class, iss, sub);
	}

	@Test
	void firstSignInCreatesTheUserAndLaterSignInsReturnItUnchanged() {
		AppUser created = users.findOrCreate(ISS, sub("a"), "a@example.test");
		AppUser again = users.findOrCreate(ISS, sub("a"), "changed@example.test");

		assertThat(created.id()).isNotNull();
		assertThat(created.disabled()).isFalse();
		assertThat(again).isEqualTo(created);
		assertThat(again.email()).as("email is set only on creation and never used to match").isEqualTo("a@example.test");
		assertThat(rows(ISS, sub("a"))).isEqualTo(1);
	}

	@Test
	void identityIsIssuerAndSubjectNotEmail() {
		AppUser here = users.findOrCreate(ISS, sub("same"), "same@example.test");
		AppUser elsewhere = users.findOrCreate(OTHER_ISS, sub("same"), "same@example.test");
		AppUser otherSubjectSameEmail = users.findOrCreate(ISS, sub("other"), "same@example.test");

		assertThat(Set.of(here.id(), elsewhere.id(), otherSubjectSameEmail.id())).hasSize(3);
		jdbc.update("delete from app_user where iss = ? and sub = ?", OTHER_ISS, sub("same"));
	}

	@Test
	void concurrentFirstSignInsInsideTransactionsCreateExactlyOneUserAndAbortNone() throws Exception {
		for (int round = 0; round < 10; round++) {
			String sub = sub("race-" + round);
			CyclicBarrier start = new CyclicBarrier(SIGN_INS);
			ExecutorService pool = Executors.newFixedThreadPool(SIGN_INS);
			try {
				List<Future<UUID>> results = new ArrayList<>();
				for (int i = 0; i < SIGN_INS; i++) {
					results.add(pool.submit(() -> tx.execute(status -> {
						try {
							start.await(10, TimeUnit.SECONDS);
						}
						catch (Exception e) {
							throw new IllegalStateException(e);
						}
						AppUser u = users.findOrCreate(ISS, sub, "race@example.test");
						// The caller's transaction must still be usable: an aborted one refuses every statement.
						jdbc.update("insert into security_event(event, app_user_id) values ('pg_provisioning_test', ?)", u.id());
						return u.id();
					})));
				}
				Set<UUID> ids = new java.util.HashSet<>();
				for (Future<UUID> f : results) {
					ids.add(f.get(30, TimeUnit.SECONDS)); // rethrows any failed sign-in
				}
				assertThat(ids).as("every concurrent sign-in resolves to the same user").hasSize(1);
				assertThat(rows(ISS, sub)).isEqualTo(1);
				UUID id = ids.iterator().next();
				assertThat(jdbc.queryForObject("select count(*) from security_event where event = 'pg_provisioning_test' and app_user_id = ?",
						Integer.class, id)).as("every caller's transaction committed its follow-up work").isEqualTo(SIGN_INS);
				jdbc.update("delete from security_event where event = 'pg_provisioning_test' and app_user_id = ?", id);
			}
			finally {
				pool.shutdownNow();
			}
		}
	}

	@Test
	void theConflictPathReturnsTheExistingRowWithItsStateUnchanged() {
		// The race outcome made deterministic: the caller saw no user, but one exists by the time it inserts.
		jdbc.update("insert into app_user(iss, sub, email, disabled) values (?,?,?,true)", ISS, sub("late"), "first@example.test");
		AppUser existing = users.find(ISS, sub("late")).orElseThrow();
		AppUserService racing = new AppUserService(jdbc) {
			@Override
			public Optional<AppUser> find(String iss, String sub) {
				return Optional.empty();
			}
		};

		AppUser result = tx.execute(status -> {
			AppUser u = racing.findOrCreate(ISS, sub("late"), "second@example.test");
			jdbc.queryForObject("select 1", Integer.class); // still usable
			return u;
		});

		assertThat(result).isEqualTo(existing);
		assertThat(result.disabled()).as("a disabled user stays disabled; provisioning never re-enables").isTrue();
		assertThat(result.email()).isEqualTo("first@example.test");
		assertThat(rows(ISS, sub("late"))).isEqualTo(1);
	}

	@Test
	void concurrentFirstSignInsOfDifferentIdentitiesDoNotInterfere() throws Exception {
		CyclicBarrier start = new CyclicBarrier(SIGN_INS);
		ExecutorService pool = Executors.newFixedThreadPool(SIGN_INS);
		try {
			List<Future<AppUser>> results = new ArrayList<>();
			for (int i = 0; i < SIGN_INS; i++) {
				String sub = sub("distinct-" + i);
				results.add(pool.submit(() -> {
					start.await(10, TimeUnit.SECONDS);
					return users.findOrCreate(ISS, sub, null);
				}));
			}
			List<AppUser> created = new ArrayList<>();
			for (Future<AppUser> f : results) {
				created.add(f.get(30, TimeUnit.SECONDS));
			}
			assertThat(created.stream().map(AppUser::id).collect(Collectors.toSet())).hasSize(SIGN_INS);
			assertThat(created).allSatisfy(u -> assertThat(u.sub()).startsWith(run));
		}
		finally {
			pool.shutdownNow();
		}
	}
}
