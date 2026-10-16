package com.clearsettle.security;

import java.util.UUID;

/**
 * An application user, identified by the OIDC issuer and subject pair — never by email (AF-125,
 * D-SEC-12). Email is stored for display only and is never used to match an account.
 */
public record AppUser(UUID id, String iss, String sub, String email, boolean disabled) {
}
