import { createFileRoute } from "@tanstack/react-router";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars

function generateCode(len = 6) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export const Route = createFileRoute("/api/public/bank/issue")({
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

        let body: { highrise_id?: string; username?: string };
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
        if (!highriseId || !username) {
          return new Response(
            JSON.stringify({ error: "highrise_id and username are required" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Try up to 5 times to avoid PK collision on the 6-char code
        let code = "";
        let lastErr: string | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateCode(6);
          const { error } = await supabaseAdmin.from("highrise_codes").insert({
            code: candidate,
            highrise_username: username,
            highrise_id: highriseId,
          });
          if (!error) {
            code = candidate;
            lastErr = null;
            break;
          }
          lastErr = error.message;
          // 23505 = unique_violation → retry; otherwise bail
          if (!/duplicate key|unique/i.test(error.message)) break;
        }

        if (!code) {
          return new Response(
            JSON.stringify({ error: lastErr ?? "Failed to issue code" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ code }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
