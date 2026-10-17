package com.clearsettle.auth;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.SecurityEvents;
import com.clearsettle.security.SessionAttributes;
import com.clearsettle.session.StashingAuthorizationRequestRepository;
import com.clearsettle.web.ApiJson;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.InvalidCsrfTokenException;
import org.springframework.security.web.csrf.MissingCsrfTokenException;
import org.springframework.session.FindByIndexNameSessionRepository;

/** OIDC success/failure/logout handlers and JSON auth-error responses. */
public final class LoginHandlers {

	private LoginHandlers() {
	}

	static String safeClaim(OidcUser u, String name) {
		Object v = u.getIdToken().getClaims().get(name);
		return v == null ? "absent" : String.valueOf(v).replaceAll("[^A-Za-z0-9:._,\\[\\] -]", "?");
	}

	/**
	 * Successful OIDC callback: enforce step-up same-user binding, enforce the universal-MFA gate
	 * (D-SEC-14), provision the {@code (iss, sub)} user, and set session attributes.
	 */
	public static final class Success implements AuthenticationSuccessHandler {

		private final AuthProperties props;
		private final AppUserService users;
		private final SecurityEvents events;
		private final String appBaseUrl;
		private final FindByIndexNameSessionRepository<? extends org.springframework.session.Session> sessions;

		public Success(AuthProperties props, AppUserService users, SecurityEvents events, String appBaseUrl,
				FindByIndexNameSessionRepository<? extends org.springframework.session.Session> sessions) {
			this.props = props;
			this.users = users;
			this.events = events;
			this.appBaseUrl = appBaseUrl;
			this.sessions = sessions;
		}

		/**
		 * Finds the session that started the step-up. Under SameSite=Strict the IdP callback arrives without
		 * the session cookie, so the originating session is located by the user's principal index and the
		 * nonce carried in the encrypted login-state cookie.
		 */
		private java.util.Optional<org.springframework.session.Session> originatingSession(UUID userId, String nonce) {
			if (userId == null || nonce == null) {
				return java.util.Optional.empty();
			}
			return sessions.findByPrincipalName(userId.toString()).values().stream()
					.map(s -> (org.springframework.session.Session) s)
					.filter(s -> nonce.equals(s.getAttribute(SessionAttributes.STEP_UP_NONCE)))
					.findFirst();
		}

		@Override
		public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth)
				throws IOException {
			OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) auth;
			OidcUser u = (OidcUser) token.getPrincipal();
			String reg = token.getAuthorizedClientRegistrationId();
			String iss = u.getIssuer().toString();
			String sub = u.getSubject();
			String acr = stringClaim(u, "acr");
			OAuth2AuthorizationRequest consumed =
					(OAuth2AuthorizationRequest) req.getAttribute(StashingAuthorizationRequestRepository.CONSUMED);
			String expIss = consumed == null ? null : consumed.getAttribute(StepUpAuthorizationRequestResolver.ATTR_ISS);
			HttpSession session = req.getSession();

			// Step-up: locate the originating session's STORED record (by user + nonce) and require the
			// re-authenticated identity to be the user who started the action. Normally (SameSite=Strict) the
			// callback runs in a NEW session. If the session cookie did reach the callback (a browser without
			// SameSite enforcement, or a Lax deployment) the callback runs INSIDE the originating session; Spring
			// has then already rotated its in-memory id while the record is still stored under the old one, so
			// the record is always addressed by the id it was found under, never by the current session's id.
			org.springframework.session.Session origin = null;
			boolean callbackInOrigin = false;
			if (expIss != null) {
				String expSub = consumed.getAttribute(StepUpAuthorizationRequestResolver.ATTR_SUB);
				String nonce = consumed.getAttribute(StepUpAuthorizationRequestResolver.ATTR_SESSION_NONCE);
				UUID expected = users.find(expIss, expSub).map(AppUser::id).orElse(null);
				origin = originatingSession(expected, nonce).orElse(null);
				callbackInOrigin = nonce != null && nonce.equals(session.getAttribute(SessionAttributes.STEP_UP_NONCE));
				if (!expIss.equals(iss) || !expSub.equals(sub)) {
					// A different person completed the step-up: the victim's originating session is ended too.
					events.record("reauth_user_mismatch", expected,
							"registration=" + reg + " originating_session_ended=" + (origin != null));
					abort(req, res, session, origin, "reauth_user_mismatch");
					return;
				}
				if (origin == null) {
					// The originating session expired or was revoked meanwhile: do not resurrect it.
					events.record("step_up_origin_session_missing", expected, "registration=" + reg);
					abort(req, res, session, null, "session_expired");
					return;
				}
			}

			// Universal MFA gate (D-SEC-14): the authentication itself must carry MFA assurance, read
			// provider-aware from acr AND (where configured) amr. Keycloak reports acr=mfa on the enrolment
			// login with an empty amr, so acr alone is insufficient evidence. No assurance -> no session.
			// The two refusals get distinct codes so the UI can explain them: mfa_not_verified is the expected
			// first sign-in after enrolling an authenticator (sign in once more with a code from it, owner
			// decision 17 October 2026); mfa_required means the provider did not perform MFA at all.
			if (!props.isStrongAcr(reg, acr) || !props.hasRequiredAmr(reg, u.getIdToken().getClaims().get("amr"))) {
				boolean strongAcr = props.isStrongAcr(reg, acr);
				String why = strongAcr ? "amr_insufficient" : "acr_insufficient";
				events.record("login_refused_mfa_required", null,
						"registration=" + reg + " reason=" + why + " acr=" + safeClaim(u, "acr") + " amr=" + safeClaim(u, "amr"));
				abort(req, res, session, origin, strongAcr ? "mfa_not_verified" : "mfa_required");
				return;
			}

			AppUser user = users.findOrCreate(iss, sub, u.getEmail());
			if (user.disabled()) {
				events.record("login_refused_disabled", user.id(), "registration=" + reg);
				abort(req, res, session, origin, "account_disabled");
				return;
			}

			// Absolute lifetime anchor (D-SEC-13): a step-up carries over the ORIGINATING session's anchor so
			// re-authentication can never extend the 8-hour lifetime, and exactly one session remains.
			if (origin != null && !callbackInOrigin) {
				// Callback in a new session: carry the anchor over and retire the originating session.
				Object anchor = origin.getAttribute(SessionAttributes.AUTHENTICATED_AT);
				if (anchor != null) {
					session.setAttribute(SessionAttributes.AUTHENTICATED_AT, anchor);
				}
				sessions.deleteById(origin.getId());
			}
			// Callback inside the originating session: it continues (under its rotated id) with its anchor unchanged.
			session.removeAttribute(SessionAttributes.STEP_UP_NONCE);
			if (session.getAttribute(SessionAttributes.AUTHENTICATED_AT) == null) {
				session.setAttribute(SessionAttributes.AUTHENTICATED_AT, Instant.now().getEpochSecond());
			}
			session.setAttribute(FindByIndexNameSessionRepository.PRINCIPAL_NAME_INDEX_NAME, user.id().toString());

			events.record(expIss != null ? "step_up_success" : "login_success", user.id(),
					"registration=" + reg + " acr=" + safeClaim(u, "acr")
							+ " auth_time_present=" + (u.getIdToken().getClaims().get("auth_time") != null));

			String action = expIss == null ? null : consumed.getAttribute(StepUpAuthorizationRequestResolver.ATTR_ACTION);
			res.sendRedirect(appBaseUrl + (action != null ? "/review?action=" + action : "/"));
		}

		/**
		 * Refuses the authentication. A step-up's originating session is ended with it: the abort response
		 * clears the browser's session cookie, so the originating session must not linger server-side.
		 */
		private void abort(HttpServletRequest req, HttpServletResponse res, HttpSession session,
				org.springframework.session.Session origin, String code) throws IOException {
			if (origin != null) {
				sessions.deleteById(origin.getId()); // the stored id, valid even if the current id was rotated
			}
			session.invalidate();
			SecurityContextHolder.clearContext();
			req.setAttribute(ApiJson.REJECT_ATTR, code);
			res.sendRedirect(appBaseUrl + "/?auth_error=" + code);
		}

		private static String stringClaim(OidcUser u, String name) {
			Object v = u.getIdToken().getClaims().get(name);
			return v instanceof String s ? s : null;
		}
	}

	/** Authentication failure: redirect with a safe code; never leak tokens/codes. */
	public static final class Failure implements AuthenticationFailureHandler {

		private final SecurityEvents events;
		private final String appBaseUrl;

		public Failure(SecurityEvents events, String appBaseUrl) {
			this.events = events;
			this.appBaseUrl = appBaseUrl;
		}

		@Override
		public void onAuthenticationFailure(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex)
				throws IOException {
			String code = "authentication_failed";
			String description = ex.getClass().getSimpleName();
			if (ex instanceof OAuth2AuthenticationException o) {
				code = o.getError().getErrorCode();
				if (o.getError().getDescription() != null) {
					description = o.getError().getDescription();
				}
			}
			code = code.replaceAll("[^a-z_]", "");
			// Defensive: never let anything token-like reach the log.
			description = description.replaceAll("eyJ[A-Za-z0-9._-]+", "[jwt-redacted]")
					.replaceAll("[A-Za-z0-9_-]{40,}", "[redacted]");
			if (description.length() > 300) {
				description = description.substring(0, 300);
			}
			events.record("login_failure", null, "code=" + code + " description=" + description);
			req.setAttribute(ApiJson.REJECT_ATTR, "login_failure:" + code);
			res.sendRedirect(appBaseUrl + "/?auth_error=" + code);
		}
	}

	/** Local logout; returns the provider logout URL (client_id form, no ID token in the URL). */
	public static final class Logout implements LogoutSuccessHandler {

		private final ClientRegistrationRepository repo;
		private final AppUserService users;
		private final SecurityEvents events;
		private final String appBaseUrl;

		public Logout(ClientRegistrationRepository repo, AppUserService users, SecurityEvents events, String appBaseUrl) {
			this.repo = repo;
			this.users = users;
			this.events = events;
			this.appBaseUrl = appBaseUrl;
		}

		@Override
		public void onLogoutSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth) throws IOException {
			Map<String, Object> body = new LinkedHashMap<>();
			body.put("loggedOut", true);
			UUID userId = null;
			if (auth instanceof OAuth2AuthenticationToken t && t.getPrincipal() instanceof OidcUser u) {
				userId = users.find(u.getIssuer().toString(), u.getSubject()).map(AppUser::id).orElse(null);
				ClientRegistration reg = repo.findByRegistrationId(t.getAuthorizedClientRegistrationId());
				Object endSession = reg == null ? null
						: reg.getProviderDetails().getConfigurationMetadata().get("end_session_endpoint");
				if (endSession != null) {
					body.put("providerLogoutUrl", endSession
							+ "?client_id=" + URLEncoder.encode(reg.getClientId(), StandardCharsets.UTF_8)
							+ "&post_logout_redirect_uri=" + URLEncoder.encode(appBaseUrl + "/", StandardCharsets.UTF_8));
				}
			}
			events.record("logout", userId, "local");
			ApiJson.write(res, 200, body);
		}
	}

	/** JSON 401/403. CSRF rejections are labelled by type so tests can attribute them (F-4). */
	public static final class Errors implements AuthenticationEntryPoint, AccessDeniedHandler {

		private final SecurityEvents events;

		public Errors(SecurityEvents events) {
			this.events = events;
		}

		@Override
		public void commence(HttpServletRequest req, HttpServletResponse res, AuthenticationException ex) throws IOException {
			ApiJson.reject(req, res, 401, "unauthenticated");
		}

		@Override
		public void handle(HttpServletRequest req, HttpServletResponse res, AccessDeniedException ex) throws IOException {
			String reason = ex instanceof MissingCsrfTokenException ? "csrf_missing"
					: ex instanceof InvalidCsrfTokenException ? "csrf_invalid"
					: ex instanceof CsrfException ? "csrf_rejected" : "forbidden";
			if (reason.startsWith("csrf")) {
				events.record("csrf_rejected", null, "type=" + reason + " path=" + req.getRequestURI());
			}
			ApiJson.reject(req, res, 403, reason);
		}
	}
}
