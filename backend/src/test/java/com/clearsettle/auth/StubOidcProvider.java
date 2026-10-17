package com.clearsettle.auth;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.PlainJWT;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.json.JsonMapper;

/**
 * A controlled OpenID provider for tests: OIDC discovery, a JWKS endpoint and a token endpoint that behaves
 * like a strict real provider (client authentication, single-use codes, exact {@code redirect_uri}, PKCE S256).
 * Each test decides exactly which ID token the token endpoint returns for a code, so the real Spring Security
 * client code can be fed tampered tokens. Test-only; no network access beyond 127.0.0.1.
 */
final class StubOidcProvider implements AutoCloseable {

	/** A code the provider will redeem once, for the authorization request it was issued to. */
	record Grant(String codeChallenge, String redirectUri, String tokenResponse, AtomicBoolean used) {
	}

	private static final JsonMapper JSON = JsonMapper.builder().build();

	final String issuer;
	final String clientId;
	private final String clientSecret;
	private final HttpServer server;
	private final RSAKey signingKey;
	/** Same key id as the real signing key, different key material: a forged signature. */
	private final RSAKey forgingKey;
	private final Map<String, Grant> grants = new ConcurrentHashMap<>();
	/** Why the token endpoint refused requests (e.g. {@code pkce_mismatch}), in order. */
	final List<String> tokenRefusals = new CopyOnWriteArrayList<>();
	final List<String> redeemedCodes = new CopyOnWriteArrayList<>();

	StubOidcProvider(String clientId, String clientSecret) {
		this.clientId = clientId;
		this.clientSecret = clientSecret;
		try {
			this.signingKey = new RSAKeyGenerator(2048).keyID("stub-k1").generate();
			this.forgingKey = new RSAKeyGenerator(2048).keyID("stub-k1").generate();
			this.server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		}
		catch (JOSEException | IOException e) {
			throw new IllegalStateException(e);
		}
		this.issuer = "http://127.0.0.1:" + server.getAddress().getPort() + "/realms/clearsettle";
		server.createContext("/", this::handle);
		server.start();
	}

	@Override
	public void close() {
		server.stop(0);
	}

	/** Lets the token endpoint redeem {@code code} once, for the given PKCE challenge and redirect URI. */
	void issue(String code, String codeChallenge, String redirectUri, String tokenResponse) {
		grants.put(code, new Grant(codeChallenge, redirectUri, tokenResponse, new AtomicBoolean()));
	}

	/** Claims of a valid ID token for this provider and client, with MFA evidence (acr=mfa, amr=[otp]). */
	JWTClaimsSet.Builder validClaims(String sub, String nonce) {
		Instant now = Instant.now();
		return new JWTClaimsSet.Builder().issuer(issuer).subject(sub).audience(clientId).claim("azp", clientId)
				.issueTime(Date.from(now)).expirationTime(Date.from(now.plusSeconds(300)))
				.claim("auth_time", now.getEpochSecond()).claim("nonce", nonce).claim("acr", "mfa")
				.claim("amr", List.of("otp")).claim("email", sub + "@example.test");
	}

	String signed(JWTClaimsSet claims) {
		return sign(signingKey, claims);
	}

	String signedWithForgedKey(JWTClaimsSet claims) {
		return sign(forgingKey, claims);
	}

	static String unsigned(JWTClaimsSet claims) {
		return new PlainJWT(claims).serialize();
	}

	/** HS256 with the client secret as the key: the classic algorithm-confusion forgery. */
	String hmacWithClientSecret(JWTClaimsSet claims) {
		try {
			SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).keyID("stub-k1").build(), claims);
			jwt.sign(new MACSigner(clientSecret.getBytes(StandardCharsets.UTF_8)));
			return jwt.serialize();
		}
		catch (JOSEException e) {
			throw new IllegalStateException(e);
		}
	}

	static String tokenResponse(String idToken) {
		Map<String, Object> m = new LinkedHashMap<>();
		m.put("access_token", "stub-access-token-value-0001");
		m.put("token_type", "Bearer");
		m.put("expires_in", 300);
		m.put("refresh_token", "stub-refresh-token-value-0001");
		m.put("scope", "openid profile email");
		if (idToken != null) {
			m.put("id_token", idToken);
		}
		return JSON.writeValueAsString(m);
	}

	static String s256(String verifier) {
		try {
			byte[] d = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
			return Base64.getUrlEncoder().withoutPadding().encodeToString(d);
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}

	private static String sign(RSAKey key, JWTClaimsSet claims) {
		try {
			SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
			jwt.sign(new RSASSASigner(key));
			return jwt.serialize();
		}
		catch (JOSEException e) {
			throw new IllegalStateException(e);
		}
	}

	private void handle(HttpExchange ex) throws IOException {
		String path = ex.getRequestURI().getPath();
		String base = "/realms/clearsettle";
		if (path.equals(base + "/.well-known/openid-configuration")) {
			Map<String, Object> m = new LinkedHashMap<>();
			m.put("issuer", issuer);
			m.put("authorization_endpoint", issuer + "/protocol/openid-connect/auth");
			m.put("token_endpoint", issuer + "/protocol/openid-connect/token");
			m.put("jwks_uri", issuer + "/protocol/openid-connect/certs");
			m.put("end_session_endpoint", issuer + "/protocol/openid-connect/logout");
			m.put("response_types_supported", List.of("code"));
			m.put("subject_types_supported", List.of("public"));
			m.put("id_token_signing_alg_values_supported", List.of("RS256"));
			m.put("code_challenge_methods_supported", List.of("S256"));
			m.put("token_endpoint_auth_methods_supported", List.of("client_secret_basic"));
			m.put("scopes_supported", List.of("openid", "profile", "email"));
			respond(ex, 200, JSON.writeValueAsString(m));
		}
		else if (path.equals(base + "/protocol/openid-connect/certs")) {
			respond(ex, 200, new JWKSet(signingKey.toPublicJWK()).toString());
		}
		else if (path.equals(base + "/protocol/openid-connect/token") && "POST".equals(ex.getRequestMethod())) {
			token(ex);
		}
		else {
			respond(ex, 404, "{\"error\":\"not_found\"}");
		}
	}

	private void token(HttpExchange ex) throws IOException {
		String expectedAuth = "Basic " + Base64.getEncoder().encodeToString(
				(enc(clientId) + ":" + enc(clientSecret)).getBytes(StandardCharsets.UTF_8));
		if (!expectedAuth.equals(ex.getRequestHeaders().getFirst("Authorization"))) {
			refuse(ex, 401, "invalid_client", "client_authentication");
			return;
		}
		Map<String, String> form = form(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
		Grant grant = grants.get(String.valueOf(form.get("code")));
		if (!"authorization_code".equals(form.get("grant_type")) || grant == null) {
			refuse(ex, 400, "invalid_grant", "unknown_code");
			return;
		}
		if (!grant.used().compareAndSet(false, true)) {
			refuse(ex, 400, "invalid_grant", "code_reused");
			return;
		}
		if (!grant.redirectUri().equals(form.get("redirect_uri"))) {
			refuse(ex, 400, "invalid_grant", "redirect_uri_mismatch");
			return;
		}
		String verifier = form.get("code_verifier");
		if (verifier == null || !s256(verifier).equals(grant.codeChallenge())) {
			refuse(ex, 400, "invalid_grant", "pkce_mismatch");
			return;
		}
		redeemedCodes.add(form.get("code"));
		respond(ex, 200, grant.tokenResponse());
	}

	private void refuse(HttpExchange ex, int status, String error, String why) throws IOException {
		tokenRefusals.add(why);
		respond(ex, status, "{\"error\":\"" + error + "\"}");
	}

	private static Map<String, String> form(String body) {
		Map<String, String> m = new LinkedHashMap<>();
		for (String pair : body.split("&")) {
			int i = pair.indexOf('=');
			if (i > 0) {
				m.put(URLDecoder.decode(pair.substring(0, i), StandardCharsets.UTF_8),
						URLDecoder.decode(pair.substring(i + 1), StandardCharsets.UTF_8));
			}
		}
		return m;
	}

	private static String enc(String s) {
		return java.net.URLEncoder.encode(s, StandardCharsets.UTF_8);
	}

	private static void respond(HttpExchange ex, int status, String body) throws IOException {
		byte[] b = body.getBytes(StandardCharsets.UTF_8);
		ex.getResponseHeaders().set("Content-Type", "application/json");
		ex.getResponseHeaders().set("Cache-Control", "no-store");
		ex.sendResponseHeaders(status, b.length);
		try (OutputStream out = ex.getResponseBody()) {
			out.write(b);
		}
	}
}
