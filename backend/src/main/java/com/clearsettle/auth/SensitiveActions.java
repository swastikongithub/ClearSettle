package com.clearsettle.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.clearsettle.auth.StepUpService.ClaimResult;
import com.clearsettle.auth.StepUpService.PendingAction;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.SecurityEvents;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The sensitive-operation policy (D-SEC-13/14, NFR-SEC-024):
 * <ol>
 *   <li>{@link #request}: a feature endpoint records the requested operation as a pending action bound to the
 *       user, the action type and its parameters, and learns whether the user must step up first (the
 *       authentication is older than 5 minutes, or lacks the required {@code acr}/{@code amr} evidence).
 *       Nothing is executed.</li>
 *   <li>Step-up, where required: re-authentication with {@code prompt=login}, {@code max_age=0} and
 *       {@code acr_values}, bound to the same user ({@link StepUpAuthorizationRequestResolver}, the login
 *       success handler). It ends on the review page; nothing is executed.</li>
 *   <li>{@link #confirm}: the user's explicit confirmation. The authentication evidence is checked again
 *       (fail closed), then the action is claimed exactly once and executed in one transaction.</li>
 * </ol>
 * What executes is what the user reviewed: the operation's {@link SensitiveOperation#reviewedVersion} is
 * recorded at the request, and a confirmation is refused and the action withdrawn if it has changed (checked
 * before the claim and again by the operation under lock).
 * Missing, malformed, weak, stale or future-dated evidence never authorizes; another user's, an executed,
 * cancelled or expired action is refused. The absolute session lifetime is unaffected (a step-up keeps the
 * originating session's anchor).
 */
@Service
public class SensitiveActions {

	/** What a feature endpoint returns to the client after {@link #request}. */
	public record Challenge(UUID actionId, String actionType, boolean stepUpRequired, List<String> reasons,
			Instant expiresAt) {
	}

	/** What the review page shows before the user confirms. {@code changed}: confirming now would be refused. */
	public record Review(PendingAction action, String summary, boolean supported, boolean changed,
			boolean stepUpRequired, List<String> reasons) {
	}

	public enum Outcome {
		EXECUTED, STEP_UP_REQUIRED, NOT_FOUND, NOT_PENDING, EXPIRED, UNSUPPORTED, CHANGED, FAILED
	}

	public record Confirmation(Outcome outcome, String actionType, List<String> reasons, Map<String, Object> result) {
	}

	private final Map<String, SensitiveOperation> operations = new HashMap<>();
	private final StepUpService pending;
	private final FreshAuthEvaluator freshAuth;
	private final SecurityEvents events;
	private final TransactionTemplate tx;
	private final Clock clock;

	/** The registered operations are every {@link SensitiveOperation} bean; there may be none. */
	@Autowired
	public SensitiveActions(ObjectProvider<SensitiveOperation> operations, StepUpService pending,
			FreshAuthEvaluator freshAuth, SecurityEvents events, PlatformTransactionManager transactions, Clock clock) {
		this(operations.orderedStream().toList(), pending, freshAuth, events, transactions, clock);
	}

	public SensitiveActions(List<SensitiveOperation> operations, StepUpService pending, FreshAuthEvaluator freshAuth,
			SecurityEvents events, PlatformTransactionManager transactions, Clock clock) {
		for (SensitiveOperation op : operations) {
			if (this.operations.putIfAbsent(op.type(), op) != null) {
				throw new IllegalStateException("duplicate sensitive operation type: " + op.type());
			}
		}
		this.pending = pending;
		this.freshAuth = freshAuth;
		this.events = events;
		this.tx = new TransactionTemplate(transactions);
		this.clock = clock;
	}

	/**
	 * Records a request for a registered sensitive operation. Never executes it. The caller returns the
	 * challenge to the client (see {@code SensitiveActionResponses}).
	 *
	 * @throws IllegalArgumentException if {@code actionType} is not a registered sensitive operation
	 */
	public Challenge request(AppUser user, OAuth2AuthenticationToken auth, String actionType, Map<String, String> params) {
		SensitiveOperation op = operations.get(actionType);
		if (op == null) {
			throw new IllegalArgumentException("not a registered sensitive operation: " + actionType);
		}
		Map<String, String> requested = params == null ? Map.of() : params;
		FreshAuthEvaluator.Decision fresh = evaluate(auth);
		UUID id = pending.begin(user.id(), actionType, requested, op.reviewedVersion(user.id(), requested));
		events.record("sensitive_action_requested", user.id(),
				"type=" + actionType + " action=" + id + " step_up_required=" + !fresh.ok());
		Instant expiresAt = pending.find(id, user.id()).map(PendingAction::expiresAt).orElseThrow();
		return new Challenge(id, actionType, !fresh.ok(), fresh.reasons(), expiresAt);
	}

	/** The user's own action, with what confirming it now would require. Empty for anyone else's action. */
	public Optional<Review> review(AppUser user, OAuth2AuthenticationToken auth, UUID actionId) {
		return pending.find(actionId, user.id()).map(a -> {
			SensitiveOperation op = operations.get(a.actionType());
			FreshAuthEvaluator.Decision fresh = evaluate(auth);
			boolean changed = op != null && !reviewedVersionHolds(op, user, a);
			return new Review(a, op == null ? null : op.summary(a.params()), op != null, changed, !fresh.ok(),
					fresh.reasons());
		});
	}

	/**
	 * The explicit, single-use confirmation. Refused unless the action is this user's, pending, unexpired and
	 * of a registered type, and the current authentication evidence is fresh and strong; then it is claimed and
	 * executed in one transaction, so it runs at most once even under concurrent confirmations.
	 */
	public Confirmation confirm(AppUser user, OAuth2AuthenticationToken auth, UUID actionId) {
		Optional<PendingAction> found = pending.find(actionId, user.id());
		if (found.isEmpty()) {
			return refused(user, actionId, null, Outcome.NOT_FOUND, List.of());
		}
		PendingAction action = found.get();
		if (!action.pending()) {
			return refused(user, actionId, action.actionType(), Outcome.NOT_PENDING, List.of());
		}
		if (action.expiredAt(clock.instant())) {
			return refused(user, actionId, action.actionType(), Outcome.EXPIRED, List.of());
		}
		SensitiveOperation op = operations.get(action.actionType());
		if (op == null) {
			return refused(user, actionId, action.actionType(), Outcome.UNSUPPORTED, List.of());
		}
		FreshAuthEvaluator.Decision fresh = evaluate(auth);
		if (!fresh.ok()) {
			return refused(user, actionId, action.actionType(), Outcome.STEP_UP_REQUIRED, fresh.reasons());
		}
		if (!reviewedVersionHolds(op, user, action)) {
			return withdrawn(user, action);
		}
		Confirmation done;
		try {
			done = tx.execute(status -> {
				ClaimResult claim = pending.claim(actionId, user.id());
				if (claim != ClaimResult.OK) {
					return new Confirmation(claim == ClaimResult.EXPIRED ? Outcome.EXPIRED
							: claim == ClaimResult.NOT_FOUND ? Outcome.NOT_FOUND : Outcome.NOT_PENDING,
							action.actionType(), List.of(), Map.of());
				}
				Map<String, Object> result = op.execute(user.id(), action.params(), action.reviewedVersion());
				return new Confirmation(Outcome.EXECUTED, action.actionType(), List.of(), result == null ? Map.of() : result);
			});
		}
		catch (ReviewedStateChangedException e) {
			// Changed between the check above and the operation's own check under lock: rolled back, withdrawn.
			return withdrawn(user, action);
		}
		catch (RuntimeException e) {
			// The claim was rolled back with the operation: the action is still pending.
			events.record("sensitive_action_failed", user.id(),
					"type=" + action.actionType() + " action=" + actionId + " error=" + e.getClass().getSimpleName());
			return new Confirmation(Outcome.FAILED, action.actionType(), List.of(), Map.of());
		}
		if (done.outcome() != Outcome.EXECUTED) {
			return refused(user, actionId, action.actionType(), done.outcome(), List.of());
		}
		events.record("sensitive_action_executed", user.id(), "type=" + action.actionType() + " action=" + actionId);
		return done;
	}

	/** Cancels the user's own pending action. */
	public boolean cancel(AppUser user, UUID actionId) {
		boolean cancelled = pending.cancel(actionId, user.id());
		if (cancelled) {
			events.record("sensitive_action_cancelled", user.id(), "action=" + actionId);
		}
		return cancelled;
	}

	/** True only when the action carries a reviewed version and the operation still reports the same one. */
	private static boolean reviewedVersionHolds(SensitiveOperation op, AppUser user, PendingAction action) {
		return action.reviewedVersion() != null
				&& action.reviewedVersion().equals(op.reviewedVersion(user.id(), action.params()));
	}

	/** What the user reviewed has changed: the action can never be confirmed, so it is withdrawn. */
	private Confirmation withdrawn(AppUser user, PendingAction action) {
		pending.cancel(action.id(), user.id());
		return refused(user, action.id(), action.actionType(), Outcome.CHANGED, List.of());
	}

	private FreshAuthEvaluator.Decision evaluate(OAuth2AuthenticationToken auth) {
		OidcUser u = (OidcUser) auth.getPrincipal();
		return freshAuth.evaluate(auth.getAuthorizedClientRegistrationId(), u.getIdToken().getClaims(), clock.instant());
	}

	private Confirmation refused(AppUser user, UUID actionId, String type, Outcome outcome, List<String> reasons) {
		events.record("sensitive_action_refused", user.id(), "type=" + (type == null ? "unknown" : type) + " action="
				+ actionId + " reason=" + outcome.name().toLowerCase() + (reasons.isEmpty() ? "" : " evidence=" + String.join(",", reasons)));
		return new Confirmation(outcome, type, reasons, Map.of());
	}
}
