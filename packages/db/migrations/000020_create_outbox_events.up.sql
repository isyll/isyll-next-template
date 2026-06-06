-- Transactional outbox for reliable, exactly-once event publishing.
--
-- How it works:
--   1. Business logic writes an event row in the SAME transaction as the
--      domain mutation (e.g. INSERT user + INSERT outbox_event). Atomicity
--      ensures the event is never lost, even if Redis or the worker is down.
--   2. The outbox worker polls this table, publishes the payload to a Redis
--      stream, and marks the row as 'processed'. On failure it increments
--      `attempts` and retries with exponential back-off.
--   3. Events that exhaust `max_attempts` are marked 'dead' and moved to the
--      Redis dead-letter queue (`dlq:{event_type}`) for manual inspection.
--
-- Status values: pending → processing → processed | dead (after max retries).
-- All timestamps are UTC.
CREATE TABLE app.outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifies what happened (e.g. 'user.registered', 'user.new_connection').
  event_type text NOT NULL
  CONSTRAINT outbox_events_type_not_blank CHECK (length(btrim(event_type)) > 0),

  -- The primary entity involved (user_id, order_id, …).
  aggregate_id text NOT NULL,
  aggregate_type text NOT NULL DEFAULT 'unknown',

  -- Structured event payload (consumer-defined schema).
  payload jsonb NOT NULL DEFAULT '{}',

  -- Processing state.
  status text NOT NULL DEFAULT 'pending'
  CONSTRAINT outbox_events_status_check
  CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'dead')),

  -- Retry tracking.
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,

  -- Prevent duplicate processing across retries (set by the publisher).
  idempotency_key text UNIQUE,

  -- Scheduling (allows delayed / future events).
  scheduled_at timestamptz NOT NULL DEFAULT now(),

  -- Timestamps for observability.
  processed_at timestamptz,
  failed_at timestamptz,
  next_retry_at timestamptz,
  error_message text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Worker query: grab pending events in order, skip locked rows.
CREATE INDEX outbox_events_pending_idx ON app.outbox_events (scheduled_at)
WHERE status IN ('pending', 'failed');

-- Observability: look up all events for an aggregate.
CREATE INDEX outbox_events_aggregate_idx ON app.outbox_events (aggregate_type, aggregate_id);

-- Idempotency lookup.
CREATE INDEX outbox_events_idempotency_idx ON app.outbox_events (idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE TRIGGER outbox_events_set_updated_at BEFORE UPDATE ON app.outbox_events
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    GRANT SELECT, INSERT, UPDATE ON app.outbox_events TO app;
  END IF;
END;
$$;
