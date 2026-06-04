// Stub for the `server-only` package under vitest. The real module throws on
// import outside a server bundle; in the node test runner we want importing the
// DB client (which is `import 'server-only'`) to be a no-op. See vitest.config.
export {}
