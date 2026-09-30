-- Quote-item change notifications for the brand's live request page.
--
-- Supabase Realtime (postgres_changes) reads these updates from WAL on a
-- deployed Supabase project, so the trigger is not the production wire — it
-- powers the dev SSE bridge (/api/quotes/[id]/events, Postgres LISTEN/NOTIFY)
-- used before Supabase credentials exist. On Supabase the trigger remains
-- harmless: it adds one NOTIFY per item update.
--
-- QuoteRequestItem.status changes (SENT → QUOTED/DECLINED/EXPIRED) are what
-- both sides watch; creates are fan-out noise for the brand, so only UPDATE
-- notifies.

CREATE OR REPLACE FUNCTION aekobaba_notify_quote_item_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(
    'aekobaba_quote_items',
    json_build_object(
      'id', NEW.id,
      'quoteRequestId', NEW."quoteRequestId",
      'status', NEW.status::text
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quote_request_item_notify ON "QuoteRequestItem";

CREATE TRIGGER quote_request_item_notify
AFTER UPDATE ON "QuoteRequestItem"
FOR EACH ROW
EXECUTE FUNCTION aekobaba_notify_quote_item_change();
