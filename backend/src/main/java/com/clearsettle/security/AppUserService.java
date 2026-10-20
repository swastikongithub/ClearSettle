package com.clearsettle.security;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

/**
 * Resolves and provisions application users keyed on {@code (iss, sub)} (D-SEC-12). Email is persisted
 * for display only and never used to match or merge accounts, so the same email at two issuers maps to
 * two distinct users and a changed email keeps the same account.
 */
@Service
public class AppUserService {

	private static final RowMapper<AppUser> USER = (rs, i) -> new AppUser(rs.getObject(1, UUID.class),
			rs.getString(2), rs.getString(3), rs.getString(4), rs.getBoolean(5));

	private final JdbcTemplate jdbc;

	public AppUserService(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public Optional<AppUser> find(String iss, String sub) {
		return jdbc.query("select id, iss, sub, email, disabled from app_user where iss = ? and sub = ?", USER, iss, sub)
				.stream().findFirst();
	}

	/**
	 * Provisions on first login; identity is {@code (iss, sub)}. An existing user is returned unchanged.
	 *
	 * <p>Creation is one atomic PostgreSQL statement on the {@code app_user_iss_sub} unique constraint. A
	 * concurrent first login of the same identity therefore never raises a uniqueness violation, which on
	 * PostgreSQL would abort a surrounding transaction: the statement waits for the other insert and returns
	 * that row instead. The conflict branch only re-asserts {@code iss}; email, {@code disabled} and every other
	 * column of the existing row are left as they are. PostgreSQL-specific by design, and tested on PostgreSQL
	 * ({@code AppUserServicePostgresTest}).
	 */
	public AppUser findOrCreate(String iss, String sub, String email) {
		Optional<AppUser> existing = find(iss, sub);
		if (existing.isPresent()) {
			return existing.get();
		}
		return jdbc.queryForObject("insert into app_user(iss, sub, email) values (?,?,?) "
				+ "on conflict (iss, sub) do update set iss = excluded.iss "
				+ "returning id, iss, sub, email, disabled", USER, iss, sub, email);
	}
}
