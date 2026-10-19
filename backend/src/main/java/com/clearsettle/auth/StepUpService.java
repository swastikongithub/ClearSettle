package com.clearsettle.auth;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.clearsettle.config.AuthProperties;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

/**
 * Store for pending sensitive actions (D-SEC-14, NFR-SEC-024). A requested sensitive action is recorded as
 * a PENDING {@code pending_action} bound to the requesting user, its action type, its parameters and the
 * version of what the user reviews ({@link SensitiveOperation#reviewedVersion}); it can
 * be claimed for execution exactly once, and only within the pending-action lifetime counted from the
 * request. The policy that decides when a claim may be attempted is {@link SensitiveActions}.
 *
 * <p>Times come from the injected {@link Clock} (also for {@code created_at}), so expiry is consistent and
 * testable without depending on the database clock.
 */
@Service
public class StepUpService {

	/** Outcome of attempting to claim a pending action for execution. */
	public enum ClaimResult {
		/** Claimed exactly once; the caller may execute. */ OK,
		/** No such pending action for this user. */ NOT_FOUND,
		/** Already executed or cancelled (single use). */ NOT_PENDING,
		/** Older than the pending-action lifetime. */ EXPIRED
	}

	/**
	 * A pending sensitive action as stored. {@code params} are the parameters the user reviews and confirms;
	 * {@code reviewedVersion} is the version of what they review, captured at the request (null only for rows
	 * written before it existed, which can never be confirmed).
	 */
	public record PendingAction(UUID id, UUID userId, String actionType, Map<String, String> params,
			String reviewedVersion, String status, Instant createdAt, Instant expiresAt) {

		public boolean pending() {
			return "PENDING".equals(status);
		}

		public boolean expiredAt(Instant now) {
			return !now.isBefore(expiresAt);
		}
	}

	private static final JsonMapper JSON = JsonMapper.builder().build();

	private final JdbcTemplate jdbc;
	private final AuthProperties props;
	private final Clock clock;

	public StepUpService(JdbcTemplate jdbc, AuthProperties props, Clock clock) {
		this.jdbc = jdbc;
		this.props = props;
		this.clock = clock;
	}

	/** Records a PENDING action of the given type, parameters and reviewed version for the user; returns its id. */
	public UUID begin(UUID userId, String actionType, Map<String, String> params, String reviewedVersion) {
		if (reviewedVersion == null) {
			throw new IllegalArgumentException("a sensitive action needs the version of what the user reviews");
		}
		UUID id = UUID.randomUUID();
		jdbc.update("insert into pending_action(id, user_id, action_type, context, reviewed_version, status, created_at) "
				+ "values (?,?,?,?,?, 'PENDING', ?)", id, userId, actionType,
				JSON.writeValueAsString(params == null ? Map.of() : params), reviewedVersion, utc(clock.instant()));
		return id;
	}

	/** True when this user's action is PENDING and not expired (only such an action may start a step-up). */
	public boolean isPendingForUser(UUID actionId, UUID userId) {
		return find(actionId, userId).filter(a -> a.pending() && !a.expiredAt(clock.instant())).isPresent();
	}

	/** The action, if it exists AND belongs to this user. Another user's action is indistinguishable from none. */
	public Optional<PendingAction> find(UUID actionId, UUID userId) {
		return jdbc.query("select id, user_id, action_type, context, reviewed_version, status, created_at "
				+ "from pending_action where id = ? and user_id = ?",
				(rs, i) -> {
					Instant created = rs.getObject("created_at", OffsetDateTime.class).toInstant();
					return new PendingAction(rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
							rs.getString("action_type"), params(rs.getString("context")), rs.getString("reviewed_version"),
							rs.getString("status"), created,
							created.plusSeconds(props.getPendingActionTtlSeconds()));
				}, actionId, userId).stream().findFirst();
	}

	/**
	 * Atomically claims a PENDING, unexpired action for a user: one conditional UPDATE marks it EXECUTED, so
	 * a repeated or concurrent claim cannot succeed twice (a concurrent claim waits for the row lock and then
	 * no longer matches {@code status='PENDING'}). Run it in the same transaction as the operation, so a
	 * failed operation rolls the claim back.
	 */
	public ClaimResult claim(UUID actionId, UUID userId) {
		Instant now = clock.instant();
		int claimed = jdbc.update("update pending_action set status = 'EXECUTED', executed_at = ? "
						+ "where id = ? and user_id = ? and status = 'PENDING' and created_at > ?",
				utc(now), actionId, userId, utc(now.minusSeconds(props.getPendingActionTtlSeconds())));
		if (claimed == 1) {
			return ClaimResult.OK;
		}
		return find(actionId, userId).map(a -> a.pending() ? ClaimResult.EXPIRED : ClaimResult.NOT_PENDING)
				.orElse(ClaimResult.NOT_FOUND);
	}

	/**
	 * Cancels this user's PENDING action; also used to withdraw an action whose reviewed state has changed.
	 * Returns false when there is no such pending action.
	 */
	public boolean cancel(UUID actionId, UUID userId) {
		return jdbc.update("update pending_action set status = 'CANCELLED' where id = ? and user_id = ? and status = 'PENDING'",
				actionId, userId) == 1;
	}

	private static OffsetDateTime utc(Instant instant) {
		return OffsetDateTime.ofInstant(instant, ZoneOffset.UTC);
	}

	private static Map<String, String> params(String json) {
		if (json == null || json.isBlank()) {
			return Map.of();
		}
		Map<String, String> out = new LinkedHashMap<>();
		((Map<?, ?>) JSON.readValue(json, Map.class))
				.forEach((k, v) -> out.put(String.valueOf(k), v == null ? null : String.valueOf(v)));
		return Collections.unmodifiableMap(out);
	}
}
