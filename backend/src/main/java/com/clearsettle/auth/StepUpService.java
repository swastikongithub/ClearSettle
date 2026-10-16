package com.clearsettle.auth;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Step-up sensitive-action lifecycle (D-SEC-14). A sensitive action that lacks fresh strong
 * authentication creates a PENDING {@code pending_action} bound to the requesting user; the action
 * executes only through an explicit, single-use confirmation after a successful step-up re-authentication
 * for the SAME user.
 *
 * <p>This is reusable infrastructure. ClearSettle has no financial domain operations yet (the ledger and
 * approval workflows arrive in later milestones); when they do, they call {@link #begin} / {@link #claim}
 * to require step-up. The sensitive-action set (posting approval, period reopening, role changes,
 * offboarding, original-file download — OQ-38) and the exact freshness window are owner decisions; the
 * mechanism here enforces whatever set is wired to it, fail-closed.
 */
@Service
public class StepUpService {

	/** Outcome of attempting to claim a pending action for execution. */
	public enum ClaimResult {
		/** Claimed exactly once; caller may execute. */ OK,
		/** No such pending action for this user. */ NOT_FOUND,
		/** Already executed or cancelled (single-use violated). */ NOT_PENDING,
		/** Older than the allowed confirmation window. */ EXPIRED
	}

	private final JdbcTemplate jdbc;

	public StepUpService(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	/** Creates a PENDING action of the given type for the user and returns its id. */
	public UUID begin(UUID userId, String actionType, Map<String, String> context) {
		UUID id = UUID.randomUUID();
		jdbc.update("insert into pending_action(id, user_id, action_type, context, status) values (?,?,?,?, 'PENDING')",
				id, userId, actionType, contextToString(context));
		return id;
	}

	/** True when a PENDING action with this id belongs to this user (used to authorize a step-up start). */
	public boolean isPendingForUser(UUID actionId, UUID userId) {
		Integer n = jdbc.queryForObject(
				"select count(*) from pending_action where id = ? and user_id = ? and status = 'PENDING'",
				Integer.class, actionId, userId);
		return n != null && n == 1;
	}

	/**
	 * Atomically claims a PENDING action for a user, enforcing single use and a confirmation window.
	 * On {@link ClaimResult#OK} the action is marked EXECUTED in the same statement, so a concurrent or
	 * repeated confirm cannot double-execute.
	 */
	public ClaimResult claim(UUID actionId, UUID userId, long maxAgeSeconds) {
		List<Map<String, Object>> rows = jdbc.queryForList(
				"select status, extract(epoch from (now() - created_at)) as age_s "
						+ "from pending_action where id = ? and user_id = ?",
				actionId, userId);
		if (rows.isEmpty()) {
			return ClaimResult.NOT_FOUND;
		}
		Map<String, Object> row = rows.get(0);
		if (!"PENDING".equals(row.get("status"))) {
			return ClaimResult.NOT_PENDING;
		}
		double ageSeconds = ((Number) row.get("age_s")).doubleValue();
		if (ageSeconds > maxAgeSeconds) {
			return ClaimResult.EXPIRED;
		}
		int claimed = jdbc.update(
				"update pending_action set status='EXECUTED', executed_at=now() where id=? and user_id=? and status='PENDING'",
				actionId, userId);
		return claimed == 1 ? ClaimResult.OK : ClaimResult.NOT_PENDING;
	}

	public Optional<String> actionType(UUID actionId, UUID userId) {
		return jdbc.queryForList("select action_type from pending_action where id = ? and user_id = ?",
				String.class, actionId, userId).stream().findFirst();
	}

	private static String contextToString(Map<String, String> context) {
		if (context == null || context.isEmpty()) {
			return null;
		}
		StringBuilder sb = new StringBuilder();
		context.forEach((k, v) -> sb.append(k).append('=').append(v).append(';'));
		return sb.toString();
	}
}
