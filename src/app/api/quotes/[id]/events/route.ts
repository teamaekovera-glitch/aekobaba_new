import { Client } from "pg";

import { jsonError } from "@/lib/auth/api";
import { notificationToEvent } from "@/lib/quotes/notifications";

// GET /api/quotes/[id]/events — dev realtime bridge for the brand's request
// page. Streams SSE frames from the `aekobaba_quote_items` Postgres NOTIFY
// channel (trigger: 20260930160000_quote_item_notify), filtered to this
// request's items. Used when Supabase env is not configured yet (spec open
// question); with credentials, the browser subscribes to Supabase Realtime
// and never opens this route. A LISTEN session needs a dedicated connection
// — its own pg Client, not the Prisma pool.
//
// This is a read-only status wire: it carries item id + status only, and it
// does not authorize (no session concept in the dev bridge) — which is
// exactly why it must never carry more than the status fields, and why it is
// a fallback, not the production path.

const NOTIFY_CHANNEL = "aekobaba_quote_items";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: requestId } = await params;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return jsonError(503, "realtime_unavailable");
  }

  const client = new Client({ connectionString });
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const close = async () => {
        if (closed) return;
        closed = true;
        try {
          await client.end();
        } catch (endError) {
          console.error("[aekobaba] SSE bridge: client end failed", endError);
        }
        try {
          controller.close();
        } catch {
          // Already closed by the abort path — nothing to do.
        }
      };
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      client.on("notification", (message) => {
        const event = notificationToEvent(message.payload, requestId);
        if (event) send(event);
      });

      request.signal.addEventListener("abort", () => {
        void close();
      });

      try {
        await client.connect();
        await client.query(`LISTEN ${NOTIFY_CHANNEL}`);
        send({ requestId }); // open frame so the client knows the bridge is live
      } catch (listenError) {
        console.error("[aekobaba] SSE bridge: LISTEN failed", listenError);
        send({ error: "listen_failed" });
        await close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
