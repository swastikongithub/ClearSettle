package com.clearsettle.devfixture;

import java.util.Map;

import com.clearsettle.auth.SensitiveActions;
import com.clearsettle.security.AppUser;
import com.clearsettle.security.SessionAttributes;
import com.clearsettle.web.SensitiveActionResponses;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;

/**
 * LOCAL DEVELOPMENT FIXTURE: the "feature endpoint" of {@link DevFixtureSensitiveOperation}, shaped the way a
 * real sensitive endpoint uses the policy (request, then return the challenge; never execute directly).
 * Registered only when {@code clearsettle.dev-fixtures.enabled=true}.
 */
@RestController
@ConditionalOnProperty(name = "clearsettle.dev-fixtures.enabled", havingValue = "true")
public class DevFixtureController {

	private static final Logger log = LoggerFactory.getLogger(DevFixtureController.class);

	private final SensitiveActions actions;

	public DevFixtureController(SensitiveActions actions) {
		this.actions = actions;
		log.warn("DEV FIXTURES ENABLED: the no-op sensitive operation '{}' is registered. Local development only.",
				DevFixtureSensitiveOperation.TYPE);
	}

	@PostMapping("/api/dev-fixture/sensitive-actions")
	ResponseEntity<Map<String, Object>> request(OAuth2AuthenticationToken token,
			@RequestAttribute(SessionAttributes.APP_USER) AppUser user) {
		SensitiveActions.Challenge c = actions.request(user, token, DevFixtureSensitiveOperation.TYPE, Map.of());
		return SensitiveActionResponses.challenge(c, token.getAuthorizedClientRegistrationId());
	}
}
