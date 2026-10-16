package com.clearsettle.web;

import java.io.IOException;
import java.util.UUID;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

/** Assigns a correlation id to each request for security-event tracing. Never logs request content. */
public class CorrelationIdFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
			throws ServletException, IOException {
		String cid = UUID.randomUUID().toString();
		MDC.put("cid", cid);
		res.setHeader("X-Correlation-Id", cid);
		try {
			chain.doFilter(req, res);
		}
		finally {
			MDC.remove("cid");
		}
	}
}
