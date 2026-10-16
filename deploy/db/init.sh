#!/bin/sh
# ClearSettle local-dev database initialization. Creates a least-privilege application role and the
# M1 authentication schema. The application connects as app_rw, never as the schema owner.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
CREATE ROLE app_rw LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER;
EOSQL

# Apply the product schema (mounted read-only from backend/src/main/resources/db/schema.sql).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /schema/schema.sql

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;
EOSQL
echo "ClearSettle dev database initialised"
