import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanDuration = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export const PLAN_CATALOG: Record<PlanDuration, { price: number; label: string; intervalSql: string }> = {
  hourly:  { price: 50,    label: "1 Hour",   intervalSql: "1 hour" },
  daily:   { price: 500,   label: "1 Day",    intervalSql: "1 day" },
  weekly:  { price: 2500,  label: "1 Week",   intervalSql: "7 days" },
  monthly: { price: 8000,  label: "1 Month",  intervalSql: "30 days" },
  yearly:  { price: 80000, label: "1 Year",   intervalSql: "365 days" },
};

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: tx } = await supabase
      .from("wallet_transactions")
      .select("id, kind, amount, balance_after, reference, detail, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25);
    return {
      balance: profile?.wallet_balance ?? 0,
      transactions: tx ?? [],
    };
  });

export const purchaseBotPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid(),
      duration: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const plan = PLAN_CATALOG[data.duration];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("purchase_bot_plan", {
      _user_id: userId,
      _bot_id: data.botId,
      _duration: data.duration,
      _price: plan.price,
      _interval: plan.intervalSql,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;

    // Best-effort: start the bot on the VPS once paid
    try {
      const { agent, isAgentConfigured, buildBotConfig } = await import("./vps-agent.server");
      if (isAgentConfigured()) {
        try {
          await agent.start(data.botId);
        } catch (e) {
          if (/not deployed/i.test((e as Error).message)) {
            const { data: full } = await supabaseAdmin.from("bots").select("*").eq("id", data.botId).single();
            if (full) {
              await agent.deploy(full.id, buildBotConfig({
                ...full,
                admins: Array.isArray(full.admins) ? (full.admins as string[]) : [],
              }));
              await agent.start(data.botId);
            }
          }
        }
        await supabaseAdmin.from("bots").update({ status: "Online" }).eq("id", data.botId);
      }
    } catch {
      // non-fatal
    }

    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      bot_id: data.botId,
      action: "plan_purchased",
      detail: `${data.duration} (-${plan.price}g)`,
    });

    return {
      botId: row?.bot_id ?? data.botId,
      expiresAt: row?.expires_at ?? null,
      balanceAfter: row?.balance_after ?? 0,
    };
  });
