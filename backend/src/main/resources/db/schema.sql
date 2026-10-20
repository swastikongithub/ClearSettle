-- ClearSettle M1 authentication-foundation schema (PostgreSQL).
-- Applied by the deployment/migration tooling (e.g. Flyway in a later increment) or the dev stack;
-- it is NOT auto-run by the application (spring.sql.init.mode=never, spring.session.jdbc.initialize-schema=never).
-- The application connects as a least-privilege role, never as the schema owner.

-- Spring Session JDBC schema, verbatim from spring-session-jdbc 4.1.x (schema-postgresql.sql).
CREATE TABLE IF NOT EXISTS SPRING_SESSION (
    PRIMARY_ID CHAR(36) NOT NULL,
    SESSION_ID CHAR(36) NOT NULL,
    CREATION_TIME BIGINT NOT NULL,
    LAST_ACCESS_TIME BIGINT NOT NULL,
    MAX_INACTIVE_INTERVAL INT NOT NULL,
    EXPIRY_TIME BIGINT NOT NULL,
    PRINCIPAL_NAME VARCHAR(100),
    CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
);
CREATE UNIQUE INDEX IF NOT EXISTS SPRING_SESSION_IX1 ON SPRING_SESSION (SESSION_ID);
CREATE INDEX IF NOT EXISTS SPRING_SESSION_IX2 ON SPRING_SESSION (EXPIRY_TIME);
CREATE INDEX IF NOT EXISTS SPRING_SESSION_IX3 ON SPRING_SESSION (PRINCIPAL_NAME);

CREATE TABLE IF NOT EXISTS SPRING_SESSION_ATTRIBUTES (
    SESSION_PRIMARY_ID CHAR(36) NOT NULL,
    ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
    ATTRIBUTE_BYTES BYTEA NOT NULL,
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID)
        REFERENCES SPRING_SESSION(PRIMARY_ID) ON DELETE CASCADE
);

-- Application users. Identity is (iss, sub); email is display-only and never used to match an account.
CREATE TABLE IF NOT EXISTS app_user (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    iss text NOT NULL,
    sub text NOT NULL,
    email text,
    disabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT app_user_iss_sub UNIQUE (iss, sub)
);

-- Append-only security events (NFR-SEC-025). No session ids, tokens, codes or secrets are stored here.
CREATE TABLE IF NOT EXISTS security_event (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    correlation_id text,
    event text NOT NULL,
    app_user_id uuid,
    detail text
);

-- Pending sensitive actions for step-up (D-SEC-14). Generic: action_type identifies the operation a
-- later milestone wires to step-up; single-use is enforced by the status transition.
CREATE TABLE IF NOT EXISTS pending_action (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app_user(id),
    action_type text NOT NULL,
    context text,
    reviewed_version text,
    status text NOT NULL CHECK (status IN ('PENDING','EXECUTED','CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    executed_at timestamptz
);
CREATE INDEX IF NOT EXISTS pending_action_user ON pending_action (user_id, status);
-- Added 19 October 2026; re-applying this file upgrades an existing database. Rows without it never confirm.
ALTER TABLE pending_action ADD COLUMN IF NOT EXISTS reviewed_version text;

-- OIDC back-channel logout tokens already accepted, so a replayed token is refused on every instance
-- (BackChannelLogout). Only the issuer and the token's jti are kept: no token, subject or session id. A row
-- is purged once its token is past the acceptance window, after which the token is refused for its age.
-- Added 20 October 2026; re-applying this file upgrades an existing database.
CREATE TABLE IF NOT EXISTS oidc_logout_token_seen (
    iss text NOT NULL,
    jti text NOT NULL,
    seen_at timestamptz NOT NULL,
    CONSTRAINT oidc_logout_token_seen_pk PRIMARY KEY (iss, jti)
);
CREATE INDEX IF NOT EXISTS oidc_logout_token_seen_at ON oidc_logout_token_seen (seen_at);
