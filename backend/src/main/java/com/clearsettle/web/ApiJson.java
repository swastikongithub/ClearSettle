package com.clearsettle.web;

import java.io.IOException;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/** Small JSON response helper for filters and handlers. Never writes tokens, codes or session material. */
public final class ApiJson {

	/** Request attribute recording why a request was rejected, for security-event logging (never a secret). */
	public static final String REJECT_ATTR = "cs.rejectReason";

	private static final JsonMapper MAPPER = JsonMapper.builder().build();

	private ApiJson() {
	}

	public static void write(HttpServletResponse res, int status, Map<String, ?> body) throws IOException {
		res.setStatus(status);
		res.setContentType("application/json");
		res.setHeader("Cache-Control", "no-store");
		res.getWriter().write(MAPPER.writeValueAsString(body));
	}

	public static void reject(HttpServletRequest req, HttpServletResponse res, int status, String reason) throws IOException {
		req.setAttribute(REJECT_ATTR, reason);
		write(res, status, Map.of("error", reason));
	}
}
