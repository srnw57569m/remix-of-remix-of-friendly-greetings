import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, user_id, username, email, highrise_username, highrise_connected_at, created_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const connectHighrise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) => ({ code: String(d.code ?? "").trim() }))
  .handler(async ({ data, context }) => {
    if (!data.code) throw new Error("Code is required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: codeRow, error: codeErr } = await supabaseAdmin
      .from("highrise_codes")
      .select("code, highrise_username, highrise_id, used_at")
      .eq("code", data.code)
      .maybeSingle();

    if (codeErr) throw new Error(codeErr.message);
    if (!codeRow) throw new Error("Invalid code. Make sure you typed it exactly as the bot whispered it.");
    if (codeRow.used_at) throw new Error("This code has already been used.");

    const now = new Date().toISOString();

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        highrise_username: codeRow.highrise_username,
        highrise_id: codeRow.highrise_id,
        highrise_connected_at: now,
      })
      .eq("user_id", context.userId);
    if (profErr) throw new Error(profErr.message);

    const { error: useErr } = await supabaseAdmin
      .from("highrise_codes")
      .update({ used_at: now, claimed_by: context.userId })
      .eq("code", codeRow.code);
    if (useErr) throw new Error(useErr.message);

    return { ok: true, highrise_username: codeRow.highrise_username };
  });

export const disconnectHighrise = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ highrise_username: null, highrise_id: null, highrise_connected_at: null })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
