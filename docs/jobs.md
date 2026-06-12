# Background jobs & the dead-letter queue

Two complementary mechanisms move work off the request path, plus an operator
dashboard to watch and recover them.

- **`@/lib/jobs` (pg-boss)** — arbitrary deferred work you `enqueue`, processed
  by `work(...)` handlers in a long-lived worker. pg-boss owns retries,
  concurrency and scheduling, all in PostgreSQL (no extra infra).
- **Transactional outbox** — domain events published atomically with a DB change
  and delivered at-least-once by the outbox relay. See `docs/events.md`.

## The operator dashboard — `/admin/jobs`

A console page (PBAC: `jobs.read` to view, `jobs.write` to act) that shows:

- **Outbox tiles** — counts of `pending`, `failed` (retrying), `dead`
  (exhausted) and `processed` rows.
- **pg-boss queues** — each queue's `queued` / `active` / `deferred` / `total`
  backlog (`listQueueStates()` in `@/lib/jobs`).
- **The dead-letter queue** — every `failed` and `dead` outbox row with its
  event type, attempts, last error and failure time.

### Recovering events

The outbox is a small state machine: `pending → processed | failed → … → dead`.
A row goes `dead` once it exhausts `max_attempts`; the retention job
deliberately keeps `dead` rows (it only prunes `processed`), so nothing is lost
silently.

From the DLQ, an operator with `jobs.write` can:

- **Replay** a `failed` or `dead` row — resets it to `pending` with a fresh
  attempt budget and makes it due now, so the outbox worker re-delivers it.
  Handlers are idempotent (delivery is at-least-once), so a replay is safe.
- **Replay all dead** — re-queue every dead row in one click.
- **Discard** a `dead` row — permanently delete it once you've decided it should
  never be delivered (e.g. a malformed legacy event).

The replay/discard logic lives in `@/features/admin-jobs/queries` and is invoked
by `jobs.write`-gated Server Actions; the worker (`pnpm --filter web
worker:outbox`) does the actual redelivery.

### Before replaying

A row reached the DLQ because its handler kept throwing. Replaying without
fixing the cause just sends it back to `dead`. Read `errorMessage`, fix the
handler (or the bad data), deploy, **then** replay.
