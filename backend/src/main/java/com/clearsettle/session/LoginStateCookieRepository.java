package com.clearsettle.session;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import tools.jackson.databind.json.JsonMapper;

/**
 * V3 login-state store (ADR-0004 / D-SEC-15). The in-progress OIDC authorization request (state, nonce,
 * PKCE verifier) travels in an AES-256-GCM encrypted, {@code HttpOnly}, {@code Secure}, host-only,
 * {@code SameSite=Lax} cookie named {@code __Host-CSLOGIN}, expiring after a short TTL. Because it is
 * {@code Lax}, it is sent on the cross-site OIDC callback navigation, which lets the main session cookie
 * remain {@code SameSite=Strict} (D-SEC-15). The expiry is also enforced inside the encrypted payload.
 *
 * <p>This store carries ONLY login-in-progress state; it is not the session. It is cleared when the
 * authorization request is consumed at the callback.
 */
public class LoginStateCookieRepository implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

	public static final String COOKIE = "__Host-CSLOGIN";
	private static final long TTL_SECONDS = 300;

	private final JsonMapper json = JsonMapper.builder().build();
	private final SecureRandom random = new SecureRandom();
	private final SecretKeySpec key;

	/** Derives the cookie-encryption key from an application secret (never the literal secret). */
	public LoginStateCookieRepository(String secret) {
		try {
			byte[] k = MessageDigest.getInstance("SHA-256")
					.digest(("clearsettle-login-state:" + secret).getBytes(StandardCharsets.UTF_8));
			this.key = new SecretKeySpec(k, "AES");
		}
		catch (GeneralSecurityException e) {
			throw new IllegalStateException(e);
		}
	}

	@Override
	public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
		String state = request.getParameter(OAuth2ParameterNames.STATE);
		if (state == null) {
			return null;
		}
		OAuth2AuthorizationRequest stored = read(request);
		return (stored != null && state.equals(stored.getState())) ? stored : null;
	}

	@Override
	public void saveAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest, HttpServletRequest request,
			HttpServletResponse response) {
		if (authorizationRequest == null) {
			expire(response);
			return;
		}
		Map<String, Object> m = new HashMap<>();
		m.put("exp", Instant.now().getEpochSecond() + TTL_SECONDS);
		m.put("authorizationUri", authorizationRequest.getAuthorizationUri());
		m.put("clientId", authorizationRequest.getClientId());
		m.put("redirectUri", authorizationRequest.getRedirectUri());
		m.put("scopes", List.copyOf(authorizationRequest.getScopes()));
		m.put("state", authorizationRequest.getState());
		m.put("additionalParameters", authorizationRequest.getAdditionalParameters());
		m.put("attributes", authorizationRequest.getAttributes());
		m.put("authorizationRequestUri", authorizationRequest.getAuthorizationRequestUri());
		write(response, encrypt(json.writeValueAsBytes(m)), TTL_SECONDS);
	}

	@Override
	public OAuth2AuthorizationRequest removeAuthorizationRequest(HttpServletRequest request, HttpServletResponse response) {
		OAuth2AuthorizationRequest stored = loadAuthorizationRequest(request);
		if (stored != null) {
			expire(response);
		}
		return stored;
	}

	@SuppressWarnings("unchecked")
	private OAuth2AuthorizationRequest read(HttpServletRequest request) {
		Cookie[] cookies = request.getCookies();
		if (cookies == null) {
			return null;
		}
		for (Cookie c : cookies) {
			if (!COOKIE.equals(c.getName())) {
				continue;
			}
			byte[] plain = decrypt(c.getValue());
			if (plain == null) {
				return null;
			}
			Map<String, Object> m = json.readValue(plain, Map.class);
			if (((Number) m.get("exp")).longValue() < Instant.now().getEpochSecond()) {
				return null;
			}
			return OAuth2AuthorizationRequest.authorizationCode()
					.authorizationUri((String) m.get("authorizationUri"))
					.clientId((String) m.get("clientId"))
					.redirectUri((String) m.get("redirectUri"))
					.scopes(new LinkedHashSet<>((List<String>) m.get("scopes")))
					.state((String) m.get("state"))
					.additionalParameters((Map<String, Object>) m.get("additionalParameters"))
					.attributes((Map<String, Object>) m.get("attributes"))
					.authorizationRequestUri((String) m.get("authorizationRequestUri"))
					.build();
		}
		return null;
	}

	private String encrypt(byte[] plain) {
		try {
			byte[] iv = new byte[12];
			random.nextBytes(iv);
			Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
			c.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
			c.updateAAD(COOKIE.getBytes(StandardCharsets.US_ASCII));
			byte[] ct = c.doFinal(plain);
			byte[] out = new byte[iv.length + ct.length];
			System.arraycopy(iv, 0, out, 0, iv.length);
			System.arraycopy(ct, 0, out, iv.length, ct.length);
			return Base64.getUrlEncoder().withoutPadding().encodeToString(out);
		}
		catch (GeneralSecurityException e) {
			throw new IllegalStateException(e);
		}
	}

	private byte[] decrypt(String value) {
		try {
			byte[] in = Base64.getUrlDecoder().decode(value);
			Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
			c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, in, 0, 12));
			c.updateAAD(COOKIE.getBytes(StandardCharsets.US_ASCII));
			return c.doFinal(in, 12, in.length - 12);
		}
		catch (GeneralSecurityException | IllegalArgumentException e) {
			return null; // tampered, truncated, or from another key: treated as absent
		}
	}

	private static void write(HttpServletResponse response, String value, long maxAge) {
		ResponseCookie cookie = ResponseCookie.from(COOKIE, value)
				.httpOnly(true).secure(true).path("/").sameSite("Lax").maxAge(maxAge).build();
		response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
	}

	private static void expire(HttpServletResponse response) {
		write(response, "", 0);
	}
}
