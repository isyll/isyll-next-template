# Infrastructure

Reverse proxy, database, and container configuration for every environment.

## Layout

```text
infra/
  docker/web.Dockerfile        Multi-stage Next.js image (installer · builder · migrator · runner)
  docker/.env.example          Compose / production environment template
  nginx/nginx.conf             Reverse-proxy base config
  nginx/conf.d/default.conf    Server block — proxies to web, blocks /admin
  postgres/initdb/00-roles.sh  Creates least-privilege roles (first init)
  postgres/initdb/01-extensions.sql  Installs extensions (first init)
```

Compose files live at the repo root:

- `compose.yaml` — local dev: Postgres + Adminer; run the app on the host with `pnpm dev`.
- `compose.dev.yaml` — fully containerized stack, no proxy (uses the Postgres superuser).
- `compose.prod.yaml` — production: nginx → web, one-shot migrator, least-privilege roles.

## Commands

```sh
docker compose up -d                              # local dev database + Adminer
docker compose -f compose.dev.yaml up --build     # full stack in containers
cp infra/docker/.env.example .env                 # then edit the secrets
docker compose -f compose.prod.yaml up -d --build # production
```

## Database roles (principle of least privilege)

- `app_migrator` — owns DDL, runs the migrations (`MIGRATION_DATABASE_URL`).
- `app` — DML on the public user tables only (`DATABASE_URL`).
- `admin_service` — DML on the isolated `admin` schema only (`ADMIN_DATABASE_URL`).

## Admin isolation

In production nginx returns `404` for `/admin`, so the admin panel is
unreachable from the public internet. To expose it internally, edit
`infra/nginx/conf.d/default.conf` (allow-list your VPN/office CIDRs and
uncomment the proxy block).
