package com.clearsettle.security;

import java.util.UUID;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * TEST ONLY: user creation for the H2 slice tests that sign in through the real filter chain. H2 cannot parse
 * PostgreSQL's targeted {@code ON CONFLICT (iss, sub)}, so these tests use H2's own form here. This is not the
 * production statement and proves nothing about it: {@link AppUserService#findOrCreate} is tested on
 * PostgreSQL, including concurrent first sign-ins, by {@code AppUserServicePostgresTest}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class H2UserProvisioning {

	@Bean
	@Primary
	AppUserService h2AppUserService(JdbcTemplate jdbc) {
		return new AppUserService(jdbc) {
			@Override
			public AppUser findOrCreate(String iss, String sub, String email) {
				jdbc.update("insert into app_user(id, iss, sub, email) values (?,?,?,?) on conflict do nothing",
						UUID.randomUUID(), iss, sub, email);
				return find(iss, sub).orElseThrow();
			}
		};
	}
}
