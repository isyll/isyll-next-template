// Stub for the `server-only` package under vitest (jsdom). The real module
// throws on import outside a server bundle; in tests we want importing server
// modules to be a no-op. Aliased in vitest.config.mts.
export {}
