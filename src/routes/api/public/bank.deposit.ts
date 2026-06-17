import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bank/deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.VPS_AGENT_SECRET;
        const provided = request.headers.get("x-agent-secret");
        if (!expected || !provided || provided !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        let body: { highrise_id?: string; username?: string; amount?: number };
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const highriseId = String(body.highrise_id ?? "").trim();
        const username = String(body.username ?? "").trim();
        const amount = Math.floor(Number(body.amount));
        if (!highriseId || !username || !Number.isFinite(amount) || amount <= 0) {
          return new Response(
            JSON.stringify({ error: "highrise_id, username and positive amount are required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("bank_deposit_by_highrise", {
          _highrise_id: highriseId,
          _username: username,
          _amount: amount,
        });

        if (error) {
          const status = /no profile linked/i.test(error.message) ? 404 : 500;
          return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const row = Array.isArray(data) ? data[0] : data;
        return new Response(
          JSON.stringify({
            ok: true,
            user_id: row?.user_id,
            balance_after: row?.balance_after,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
