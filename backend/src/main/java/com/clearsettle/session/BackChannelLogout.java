package com.clearsettle.session;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.SecurityEvents;
import com.clearsettle.web.ApiJson;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.oidc.authentication.logout.OidcLogoutToken;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * OpenID Connect Back-Channel Logout 1.0 (D-SEC-13, D-SEC-18). When a user's session at the identity provider ends
 * (the user signs out there, or an administrator signs the user out, for example during an MFA reset) the provider
 * posts a signed logout token to {@code /logout/connect/back-channel/{registrationId}}, and the user's ClearSettle
 * sessions for that provider session end on every instance.
 *
 * <p>Spring Security's back-channel support receives and verifies the token before {@link Handler} runs: the
 * signature against the provider's published keys, the issuer and audience of the client registration, the
 * back-channel logout event, {@code iat} and {@code jti} present, {@code sub} or {@code sid} present, no
 * {@code nonce}, and {@code exp} when present. {@link Handler} then applies ClearSettle's own rules (age, subject,
 * replay) and ends the sessions through {@link SessionRevocation}. {@link AuditFilter} records the requests Spring
 * Security refused, which never reach the handler.
 *
 * <p>The endpoint serves the identity provider, not browsers: it takes no session, CSRF token or custom header (the
 * provider cannot send them), and only a token signed by the provider can end a session. It keeps no access or
 * refresh token, and the provider-session link it uses is the {@code sid} already in each session's ID token. The
 * local stack does not expose it on the public origin (deploy/nginx).
 */
public final class BackChannelLogout {

	/** Spring Security's back-channel logout endpoint. */
	public static final String ENDPOINT = "/logout/connect/back-channel/{registrationId}";

	/** How old a logout token may be on arrival, beyond the clock-skew allowance. Providers send it at once. */
	static final Duration MAX_TOKEN_AGE = Duration.ofMinutes(2);

	/** Request attribute: the outcome has already been recorded as a security event. */
	private static final String RECORDED = "cs.backChannelLogoutRecorded";

	private BackChannelLogout() {
	}

	/** The registration id from the path, as recorded in security events: sanitised and at most 64 characters. */
	private static String registration(HttpServletRequest req) {
		String uri = req.getRequestURI();
		String id = uri.substring(uri.lastIndexOf('/') + 1);
		return id.substring(0, Math.min(id.length(), 64)).replaceAll("[^A-Za-z0-9_-]", "?");
	}

	/**
	 * Ends the sessions named by a verified logout token, once.
	 * <ul>
	 *   <li>The token must have been issued within {@link #MAX_TOKEN_AGE} (plus the clock-skew allowance) and not in
	 *       the future, so a captured token stops working within minutes.</li>
	 *   <li>It must carry {@code sub}: ClearSettle users are keyed by {@code (iss, sub)} and found that way; a token
	 *       with only {@code sid} is refused rather than matched against every stored session.</li>
	 *   <li>Its {@code jti} is accepted once per issuer, across instances (table {@code oidc_logout_token_seen}). A
	 *       replay is refused and changes nothing, so a replayed token without {@code sid} cannot end sessions
	 *       signed in after the original logout.</li>
	 *   <li>With {@code sid}, only that provider session's ClearSettle sessions end; without it, all of the user's.
	 *       A token for a user or session ClearSettle does not have ends nothing and is answered 200.</li>
	 * </ul>
	 * The replay marker is committed before the sessions are deleted, so a concurrent copy of the same token is
	 * refused at once, and removed again if the deletion fails, so the revocation can be retried. No transaction is
	 * held while sessions are deleted: Spring Session JDBC runs each of its operations in a new transaction on a
	 * connection of its own, so holding one here would make every logout need two connections at once, and enough
	 * simultaneous logouts would exhaust the pool.
	 */
	public static final class Handler implements LogoutHandler {

		private static final Logger log = LoggerFactory.getLogger(Handler.class);

		private final AppUserService users;
		private final SessionRevocation revocation;
		private final SecurityEvents events;
		private final JdbcTemplate jdbc;
		private final Duration skew;
		private final Clock clock;

		public Handler(AppUserService users, SessionRevocation revocation, SecurityEvents events, JdbcTemplate jdbc,
				AuthProperties props, Clock clock) {
			this.users = users;
			this.revocation = revocation;
			this.events = events;
			this.jdbc = jdbc;
			this.skew = Duration.ofSeconds(props.getClockSkewSeconds());
			this.clock = clock;
		}

		@Override
		public void logout(HttpServletRequest req, HttpServletResponse res, Authentication auth) {
			OidcLogoutToken token = (OidcLogoutToken) auth.getPrincipal();
			String iss = token.getIssuer().toString();
			String sub = token.getSubject();
			String sid = token.getSessionId();
			Instant now = clock.instant();
			Instant iat = token.getIssuedAt(); // present: Spring Security refuses a logout token without iat
			UUID userId = sub == null ? null : users.find(iss, sub).map(AppUser::id).orElse(null);
			String registration = registration(req);

			String refusal = iat.isAfter(now.plus(skew)) ? "issued_in_future"
					: iat.isBefore(now.minus(MAX_TOKEN_AGE).minus(skew)) ? "too_old"
					: sub == null ? "no_subject" : null;
			if (refusal != null) {
				refuse(req, res, userId, registration, refusal);
				return;
			}
			try {
				jdbc.update("insert into oidc_logout_token_seen(iss, jti, seen_at) values (?,?,?)", iss, token.getId(),
						Timestamp.from(now));
			}
			catch (DuplicateKeyException replay) {
				refuse(req, res, userId, registration, "replayed");
				return;
			}
			int revoked;
			try {
				revoked = userId == null ? 0
						: sid != null ? revocation.revokeProviderSession(userId, sid) : revocation.revokeAll(userId);
			}
			catch (RuntimeException e) {
				release(iss, token.getId());
				throw e;
			}
			req.setAttribute(RECORDED, true);
			events.record("backchannel_logout", userId, "registration=" + registration + " scope="
					+ (sid != null ? "provider_session" : "all_sessions") + " known_user=" + (userId != null)
					+ " revoked=" + revoked);
			purgeExpiredMarkers(now);
			res.setStatus(HttpServletResponse.SC_OK);
			res.setHeader("Cache-Control", "no-store");
		}

		private void refuse(HttpServletRequest req, HttpServletResponse res, UUID userId, String registration,
				String reason) {
			req.setAttribute(RECORDED, true);
			events.record("backchannel_logout_rejected", userId, "registration=" + registration + " reason=" + reason);
			try {
				ApiJson.write(res, HttpServletResponse.SC_BAD_REQUEST, Map.of("error", "invalid_request"));
			}
			catch (IOException e) {
				throw new UncheckedIOException(e);
			}
		}

		/** After a failed revocation: forgets the token, so that the provider can deliver it again. */
		private void release(String iss, String jti) {
			try {
				jdbc.update("delete from oidc_logout_token_seen where iss = ? and jti = ?", iss, jti);
			}
			catch (DataAccessException e) {
				log.warn("oidc_logout_token_seen release failed; this logout token will be refused if delivered again");
			}
		}

		/**
		 * Deletes markers whose tokens are past the acceptance window: such a token is refused for its age, so its
		 * marker is no longer needed. Kept for twice the window, to allow for clock differences between instances.
		 */
		private void purgeExpiredMarkers(Instant now) {
			Duration window = MAX_TOKEN_AGE.plus(skew.multipliedBy(2));
			try {
				jdbc.update("delete from oidc_logout_token_seen where seen_at < ?",
						Timestamp.from(now.minus(window.multipliedBy(2))));
			}
			catch (DataAccessException e) {
				log.warn("oidc_logout_token_seen purge failed; retried on the next logout token");
			}
		}
	}

	/**
	 * Records back-channel logout requests that Spring Security refused before {@link Handler} ran (a bad signature,
	 * a wrong issuer or audience, a malformed or missing token, an unknown registration). Spring Security answers
	 * those 400 and records nothing; a forged logout token is worth an audit entry.
	 */
	public static final class AuditFilter extends OncePerRequestFilter {

		private final RequestMatcher endpoint = PathPatternRequestMatcher.withDefaults()
				.matcher(HttpMethod.POST, ENDPOINT);
		private final SecurityEvents events;

		public AuditFilter(SecurityEvents events) {
			this.events = events;
		}

		@Override
		protected boolean shouldNotFilter(HttpServletRequest req) {
			return !endpoint.matches(req);
		}

		@Override
		protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
				throws ServletException, IOException {
			try {
				chain.doFilter(req, res);
			}
			catch (ServletException | IOException | RuntimeException e) {
				record(req, "processing_error");
				throw e;
			}
			if (res.getStatus() >= 400) {
				record(req, "invalid_request status=" + res.getStatus());
			}
		}

		private void record(HttpServletRequest req, String reason) {
			if (req.getAttribute(RECORDED) == null) {
				events.record("backchannel_logout_rejected", null, "registration=" + registration(req) + " reason=" + reason);
			}
		}
	}
}
