package com.clearsettle.security;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Records security events to the application log and to the {@code security_event} table
 * (NFR-SEC-025). Callers must never pass session IDs, tokens, authorization codes or secrets in
 * {@code detail}: only event names, user ids, and non-sensitive context (NFR-SEC-026).
 */
@Component
public class SecurityEvents {

	private static final Logger log = LoggerFactory.getLogger("security-event");
	private final JdbcTemplate jdbc;

	public SecurityEvents(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public void record(String event, UUID appUserId, String detail) {
		String correlationId = MDC.get("cid");
		log.info("event={} user={} detail={}", event, appUserId, detail);
		try {
			jdbc.update("insert into security_event(correlation_id, event, app_user_id, detail) values (?,?,?,?)",
					correlationId, event, appUserId, detail);
		}
		catch (DataAccessException e) {
			// Never let an audit-store failure break the request path; it is logged for follow-up.
			log.warn("security_event persistence failed event={}", event);
		}
	}
}
