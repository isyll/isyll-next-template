#!/bin/bash
set -euo pipefail

# Provisioned once at first DB init (as the Postgres superuser), BEFORE the
# extension script (00 sorts before 01). Establishes the least-privilege login
# roles the app and migrations connect as:
#
#   app_migrator   owns DDL, may create the `app` and `admin` schemas
#   app            DML on the end-user `app` schema only (reads `public` refs)
#   admin_service  DML on the isolated `admin` schema only (granted in 000011)
#
# Schema layout (created by the migrations, which run as app_migrator):
#   public  global reference data (currencies/countries/timezones) + shared objects
#   app     end-user site data (users/sessions/accounts/verifications) + audit logs
#   admin   isolated operator (administrator) data
#
# Passwords come from the environment (compose). The migrations grant the
# concrete table privileges; the default privileges here cover future tables.

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v db="$POSTGRES_DB" \
  -v app_pw="${APP_DB_PASSWORD:-app}" \
  -v migrator_pw="${MIGRATOR_DB_PASSWORD:-migrator}" \
  -v admin_pw="${ADMIN_DB_PASSWORD:-admin_service}" <<-'EOSQL'
	CREATE ROLE app_migrator LOGIN PASSWORD :'migrator_pw';
	CREATE ROLE app LOGIN PASSWORD :'app_pw';
	CREATE ROLE admin_service LOGIN PASSWORD :'admin_pw';

	GRANT CONNECT ON DATABASE :"db" TO app_migrator, app, admin_service;

	-- The migrator owns `public` (free DDL there) and may create the admin schema.
	ALTER SCHEMA public OWNER TO app_migrator;
	GRANT CREATE ON DATABASE :"db" TO app_migrator;

	GRANT USAGE ON SCHEMA public TO app, admin_service;

	-- `public` holds immutable reference data: future tables the migrator creates
	-- there are readable by both service roles (the migrations also grant
	-- explicitly). Read/write privileges on the end-user `app` schema are granted
	-- by migration 000002 once that schema exists.
	ALTER DEFAULT PRIVILEGES FOR ROLE app_migrator IN SCHEMA public
	  GRANT SELECT ON TABLES TO app, admin_service;
EOSQL
