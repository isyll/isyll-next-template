-- Transactional outbox for reliable domain-event delivery.
--
-- How it works:
--   1. Business logic writes an event row in the SAME transaction as the domain
--      mutation (e.g. INSERT user + INSERT outbox_event). Atomicity guarantees
--      the event is never lost and never fires on rollback.
--   2. The outbox relay polls due rows (`status IN ('pending','failed')` AND
--      `scheduled_at <= now()`) with FOR UPDATE SKIP LOCKED, runs the matching
--      handler, and marks the row 'processed'. On failure it bumps `attempts`
--      and reschedules `scheduled_at` with exponential back-off.
--   3. Rows that exhaust `max_attempts` are marked 'dead' for manual inspection.
--
-- No external broker: the relay and handlers are plain Postgres + app code.
-- Status: pending → processed on success; on failure → failed (retried with
-- back-off) → … → dead after max_attempts. Claiming uses FOR UPDATE SKIP LOCKED
-- inside the relay's transaction, so there is no separate in-flight state — a
-- crash mid-dispatch rolls back to pending/failed. Timestamps UTC.
CREATE TABLE app.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened (e.g. 'user.registered', 'user.new_connection').
  event_type text NOT NULL
  CONSTRAINT outbox_events_type_not_blank CHECK (length(btrim(event_type)) > 0),

  -- The primary entity involved (user_id, order_id, …).
  aggregate_id text NOT NULL,
  aggregate_type text NOT NULL DEFAULT 'unknown'
  CONSTRAINT outbox_events_aggregate_type_not_blank
  CHECK (length(btrim(aggregate_type)) > 0),

  -- Structured event payload (matches the DomainEvent variant).
  payload jsonb NOT NULL DEFAULT '{}',

  -- Processing state.
  status text NOT NULL DEFAULT 'pending'
  CONSTRAINT outbox_events_status_check
  CHECK (status IN ('pending', 'processed', 'failed', 'dead')),

  -- Retry tracking (smallint: a handful of attempts, never more).
  attempts smallint NOT NULL DEFAULT 0
  CONSTRAINT outbox_events_attempts_non_negative CHECK (attempts >= 0),
  max_attempts smallint NOT NULL DEFAULT 5
  CONSTRAINT outbox_events_max_attempts_positive CHECK (max_attempts > 0),

  -- Optional publisher-set key for at-most-once publishing (deduplication).
  idempotency_key text UNIQUE,

  -- When the row becomes due; bumped forward on each retry (back-off).
  scheduled_at timestamptz NOT NULL DEFAULT now(),

  -- Observability.
  processed_at timestamptz,
  failed_at timestamptz,
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Relay query: grab due events in order, skipping locked rows.
CREATE INDEX outbox_events_due_idx ON app.outbox_events (scheduled_at)
WHERE status IN ('pending', 'failed');

-- Observability: look up all events for an aggregate.
CREATE INDEX outbox_events_aggregate_idx ON app.outbox_events (aggregate_type, aggregate_id);

-- Idempotency lookup.
CREATE INDEX outbox_events_idempotency_idx ON app.outbox_events (idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Retention prune predicate (the due index above only covers pending/failed).
CREATE INDEX outbox_events_processed_at_idx ON app.outbox_events (processed_at)
WHERE status = 'processed';

-- Dead-letter queue listing for the operator dashboard (newest failures first).
CREATE INDEX outbox_events_dlq_idx ON app.outbox_events (failed_at DESC)
WHERE status IN ('failed', 'dead');

CREATE TRIGGER outbox_events_set_updated_at BEFORE UPDATE ON app.outbox_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The schema-wide ALTER DEFAULT PRIVILEGES (000002) already granted the app
-- role SELECT/INSERT/UPDATE/DELETE on every future app table, so a bare GRANT of
-- a subset would NOT withhold DELETE. Revoke first, then grant only the three
-- verbs the app needs, so the prune can only run as the owner (SECURITY DEFINER).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    REVOKE ALL ON app.outbox_events FROM app;
    GRANT SELECT, INSERT, UPDATE ON app.outbox_events TO app;
  END IF;
END;
$$;

-- Scheduled retention (worker:jobs). The app role has no DELETE here, so the
-- prune runs as the table owner (SECURITY DEFINER); 'dead' rows are kept.
CREATE OR REPLACE FUNCTION app.prune_outbox_events(retain interval)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  removed bigint;
BEGIN
  DELETE FROM app.outbox_events
  WHERE
    status = 'processed'
    AND processed_at IS NOT NULL
    AND processed_at < now() - retain;
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE EXECUTE ON FUNCTION app.prune_outbox_events(interval) FROM public;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT EXECUTE ON FUNCTION app.prune_outbox_events(interval) TO app;
  END IF;
END;
$$;

-- Operator action: permanently discard a single dead event. DELETE is revoked
-- from the app role above, so the discard runs as the table owner (SECURITY
-- DEFINER), scoped to a 'dead' row. Returns true when a row was removed.
CREATE OR REPLACE FUNCTION app.discard_outbox_event(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  affected integer;
BEGIN
  DELETE FROM app.outbox_events WHERE id = p_id AND status = 'dead';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION app.discard_outbox_event(uuid) FROM public;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT EXECUTE ON FUNCTION app.discard_outbox_event(uuid) TO app;
  END IF;
END;
$$;
