import { createFileRoute } from "@tanstack/react-router";

/**
 * Called by pg_cron every minute. Finds active bots whose subscription has
 * expired, stops + deletes them on the VPS, and marks the row as Expired.
 *
 * Authenticated with the same shared agent secret used elsewhere.
 */
export const Route = createFileRoute("/api/public/cron/expire-bots")({
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();

        const { data: expired, error } = await supabaseAdmin
          .from("bots")
          .select("id, user_id, storage_path, bot_name")
          .eq("subscription_status", "Active")
          .lt("subscription_expires_at", nowIso);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const list = expired ?? [];
        if (list.length === 0) {
          return new Response(JSON.stringify({ ok: true, expired: 0 }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { agent, isAgentConfigured } = await import("@/lib/vps-agent.server");
        const agentReady = isAgentConfigured();

        const results: Array<{ id: string; ok: boolean; error?: string }> = [];
        for (const bot of list) {
          let err: string | null = null;
          if (agentReady) {
            try { await agent.stop(bot.id); } catch (e) { err = (e as Error).message; }
          }
          await supabaseAdmin.from("bots").update({
            subscription_status: "Expired",
            status: "Suspended",
          }).eq("id", bot.id);
          await supabaseAdmin.from("activity_logs").insert({
            user_id: bot.user_id,
            bot_id: bot.id,
            action: "bot_expired",
            detail: err ? `agent error: ${err}` : "rent time finished — bot suspended, renew to resume",
          });
          results.push({ id: bot.id, ok: !err, error: err ?? undefined });
        }

        return new Response(JSON.stringify({ ok: true, expired: results.length, results }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
