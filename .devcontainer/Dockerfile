# Dev container image for the workspace service (see docker-compose.yml).
# Node 24 to match `engines.node` (>=24) and the .nvmrc; pnpm comes from
# corepack, pinned by the root package.json `packageManager` field.
FROM mcr.microsoft.com/devcontainers/typescript-node:24-bookworm

# pnpm via corepack (version pinned by package.json#packageManager).
RUN corepack enable

# psql / redis-cli for poking at the local Postgres + Redis services.
RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client redis-tools \
  && rm -rf /var/lib/apt/lists/*

# Keep the pnpm store on a named volume (mounted in docker-compose.yml) so it
# survives rebuilds and is shared across installs.
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
