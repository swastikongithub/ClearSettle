package com.clearsettle.auth;

import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import com.clearsettle.config.AuthProperties;
import com.clearsettle.security.AppUserService;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

/**
 * Adds step-up parameters when a signed-in user re-authenticates for one of their own PENDING sensitive
 * actions: {@code prompt=login}, {@code max_age=0}, and (where the provider supports it)
 * {@code acr_values}. The expected identity {@code (iss, sub)} and the action id are carried in the
 * authorization request's attributes so the success handler can enforce same-user binding whichever
 * login-state store is in use.
 */
public class StepUpAuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

	public static final String ATTR_ISS = "cs_step_up_iss";
	public static final String ATTR_SUB = "cs_step_up_sub";
	public static final String ATTR_ACTION = "cs_step_up_action";
	/** Links the step-up to its originating session (see {@code SessionAttributes.STEP_UP_NONCE}). */
	public static final String ATTR_SESSION_NONCE = "cs_step_up_session_nonce";

	private final DefaultOAuth2AuthorizationRequestResolver delegate;
	private final AppUserService users;
	private final StepUpService stepUp;
	private final AuthProperties props;
	private final ThreadLocal<StepUp> current = new ThreadLocal<>();

	private record StepUp(String registrationId, String iss, String sub, String actionId, String sessionNonce) {
	}

	private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

	public StepUpAuthorizationRequestResolver(ClientRegistrationRepository repo, AppUserService users,
			StepUpService stepUp, AuthProperties props) {
		this.delegate = new DefaultOAuth2AuthorizationRequestResolver(repo, "/oauth2/authorization");
		this.users = users;
		this.stepUp = stepUp;
		this.props = props;
		this.delegate.setAuthorizationRequestCustomizer(builder -> {
			StepUp s = current.get();
			if (s == null) {
				return;
			}
			builder.additionalParameters(p -> {
				p.put("prompt", "login");
				p.put("max_age", "0");
				String acr = props.getStepUpAcrValues().get(s.registrationId());
				if (acr != null) {
					p.put("acr_values", acr);
				}
			});
			builder.attributes(a -> {
				a.put(ATTR_ISS, s.iss());
				a.put(ATTR_SUB, s.sub());
				a.put(ATTR_ACTION, s.actionId());
				a.put(ATTR_SESSION_NONCE, s.sessionNonce());
			});
		});
	}

	@Override
	public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
		return withStepUp(request, () -> delegate.resolve(request));
	}

	@Override
	public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
		return withStepUp(request, () -> delegate.resolve(request, clientRegistrationId));
	}

	private OAuth2AuthorizationRequest withStepUp(HttpServletRequest request, Supplier<OAuth2AuthorizationRequest> call) {
		current.set(stepUpFor(request).orElse(null));
		try {
			return call.get();
		}
		finally {
			current.remove();
		}
	}

	/** Only a signed-in user's own PENDING, unexpired action can start a step-up. */
	private Optional<StepUp> stepUpFor(HttpServletRequest request) {
		String actionParam = request.getParameter("step_up");
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (actionParam == null || !(auth instanceof OAuth2AuthenticationToken token)
				|| !(token.getPrincipal() instanceof OidcUser user)) {
			return Optional.empty();
		}
		UUID actionId;
		try {
			actionId = UUID.fromString(actionParam);
		}
		catch (IllegalArgumentException e) {
			return Optional.empty();
		}
		String iss = user.getIssuer().toString();
		String sub = user.getSubject();
		jakarta.servlet.http.HttpSession session = request.getSession(false);
		if (session == null) {
			return Optional.empty();
		}
		return users.find(iss, sub)
				.filter(u -> stepUp.isPendingForUser(actionId, u.id()))
				.map(u -> {
					byte[] b = new byte[24];
					RANDOM.nextBytes(b);
					String nonce = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(b);
					session.setAttribute(com.clearsettle.security.SessionAttributes.STEP_UP_NONCE, nonce);
					return new StepUp(token.getAuthorizedClientRegistrationId(), iss, sub, actionId.toString(), nonce);
				});
	}
}
