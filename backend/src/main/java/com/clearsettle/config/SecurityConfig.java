package com.clearsettle.config;

import java.time.Clock;

import com.clearsettle.auth.LoginHandlers;
import com.clearsettle.auth.StepUpAuthorizationRequestResolver;
import com.clearsettle.auth.StepUpService;
import com.clearsettle.security.AppUserService;
import com.clearsettle.security.CurrentUserFilter;
import com.clearsettle.security.SecurityEvents;
import com.clearsettle.session.AbsoluteTimeoutFilter;
import com.clearsettle.session.LoginStateCookieRepository;
import com.clearsettle.session.StashingAuthorizationRequestRepository;
import com.clearsettle.web.CorrelationIdFilter;
import com.clearsettle.web.RequiredHeaderFilter;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

/**
 * ClearSettle HTTP security (D-SEC-11 to D-SEC-15):
 * <ul>
 *   <li>OIDC Authorization Code + PKCE login with Keycloak; login-state in the Lax {@code __Host-CSLOGIN}
 *       cookie so the session cookie can be {@code SameSite=Strict} (V3).</li>
 *   <li>CSRF: double-submit {@code __Host-} cookie (SPA handler) PLUS a required custom header
 *       (NFR-SEC-022, F-4).</li>
 *   <li>Session: server-side (Spring Session JDBC); session-id rotation at authentication; idle timeout
 *       (Spring Session) and an absolute lifetime filter anchored to authentication time.</li>
 *   <li>Per-request re-resolution of the user and a universal-MFA gate at login.</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, AuthProperties props,
			ClientRegistrationProperties oidc, ClientRegistrationRepository repo, AppUserService users,
			StepUpService stepUp, SecurityEvents events, Clock clock) throws Exception {

		AuthorizationRequestRepository<OAuth2AuthorizationRequest> store =
				new LoginStateCookieRepository(oidc.loginStateSecret());
		var loginState = new StashingAuthorizationRequestRepository(store);
		var resolver = new StepUpAuthorizationRequestResolver(repo, users, stepUp, props);

		CookieCsrfTokenRepository csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
		csrfRepo.setCookieName(props.getCsrfCookieName());
		csrfRepo.setCookieCustomizer(c -> c.secure(true).path("/").sameSite("Strict"));
		var errors = new LoginHandlers.Errors(events);

		http
			.csrf(c -> c.spa().csrfTokenRepository(csrfRepo))
			.authorizeHttpRequests(a -> a
				.requestMatchers("/actuator/health", "/error").permitAll()
				.anyRequest().authenticated())
			.oauth2Login(o -> o
				// F-3: retain no access/refresh tokens (the app never calls resource servers with them).
				.authorizedClientRepository(authorizedClientRepository())
				.authorizationEndpoint(e -> e.authorizationRequestResolver(resolver)
						.authorizationRequestRepository(loginState))
				.successHandler(new LoginHandlers.Success(props, users, events, oidc.appBaseUrl()))
				.failureHandler(new LoginHandlers.Failure(events, oidc.appBaseUrl())))
			.logout(l -> l.logoutUrl("/logout")
					.logoutSuccessHandler(new LoginHandlers.Logout(repo, users, events, oidc.appBaseUrl())))
			.exceptionHandling(e -> e.authenticationEntryPoint(errors).accessDeniedHandler(errors))
			.sessionManagement(sm -> sm.sessionFixation(f -> f.changeSessionId()))
			.addFilterAfter(new AbsoluteTimeoutFilter(props, clock), SecurityContextHolderFilter.class)
			.addFilterAfter(new RequiredHeaderFilter(props), CsrfFilter.class)
			.addFilterAfter(new CurrentUserFilter(users, events), AuthorizationFilter.class);
		return http.build();
	}

	/**
	 * F-3: no OAuth2 authorized clients (access/refresh tokens) are retained. Replaces Spring's
	 * default, which keeps them in an unbounded in-memory map that logout does not clear.
	 */
	@Bean
	org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository authorizedClientRepository() {
		return new com.clearsettle.security.NonRetainingAuthorizedClientRepository();
	}

	/** Session cookie: __Host- prefixed, HttpOnly, Secure, host-only, Path=/, SameSite per policy (Strict). */
	@Bean
	CookieSerializer cookieSerializer(AuthProperties props) {
		DefaultCookieSerializer c = new DefaultCookieSerializer();
		c.setCookieName(props.getSessionCookieName());
		c.setUseSecureCookie(true);
		c.setUseHttpOnlyCookie(true);
		c.setSameSite(props.getSessionCookieSameSite());
		c.setCookiePath("/");
		return c;
	}

	/** Correlation id for every request, so security events can be traced (NFR-SEC-025). */
	@Bean
	FilterRegistrationBean<CorrelationIdFilter> correlationIdFilter() {
		FilterRegistrationBean<CorrelationIdFilter> r = new FilterRegistrationBean<>(new CorrelationIdFilter());
		r.setOrder(Ordered.HIGHEST_PRECEDENCE);
		return r;
	}
}
