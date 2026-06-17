import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanDuration = "hourly" | "daily" | "weekly" | "monthly" | "yearly";

export const PLAN_ORDER: PlanDuration[] = ["hourly", "daily", "weekly", "monthly", "yearly"];

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("plan_prices")
    .select("duration, label, price, interval_sql, sort_order, updated_at")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: planErr } = await supabaseAdmin
      .from("plan_prices")
      .select("price, interval_sql")
      .eq("duration", data.duration)
      .maybeSingle();
    if (planErr) throw new Error(planErr.message);
    if (!plan) throw new Error("Plan not found");

    const { data: result, error } = await supabaseAdmin.rpc("purchase_bot_plan", {
      _user_id: userId,
      _bot_id: data.botId,
      _duration: data.duration,
      _price: plan.price,
      _interval: plan.interval_sql,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;

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

export const updatePlanPrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      duration: z.enum(["hourly", "daily", "weekly", "monthly", "yearly"]),
      price: z.coerce.number().int().min(0).max(10_000_000),
      label: z.string().trim().min(1).max(64).optional(),
      interval_sql: z.string().trim().min(2).max(64).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"]);
    if (!roles || roles.length === 0) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = {
      price: data.price,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      ...(data.label ? { label: data.label } : {}),
      ...(data.interval_sql ? { interval_sql: data.interval_sql } : {}),
    };

    const { error } = await supabaseAdmin
      .from("plan_prices")
      .update(patch)
      .eq("duration", data.duration);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("activity_logs").insert({
      user_id: userId,
      action: "admin_update_plan_price",
      detail: `${data.duration} -> ${data.price}g`,
    });
    return { ok: true };
  });

export const getTrialStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("free_trial_used")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { freeTrialUsed: Boolean((data as any)?.free_trial_used) };
  });

export const startFreeTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ botId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("start_free_trial", {
      _bot_id: data.botId,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;

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

    void userId;
    return {
      botId: row?.bot_id ?? data.botId,
      expiresAt: row?.expires_at ?? null,
    };
  });

export const adminGrantBotTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid(),
      hours: z.coerce.number().int().min(1).max(24 * 365 * 5),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"]);
    if (!roles || roles.length === 0) throw new Error("Forbidden: admin role required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("admin_grant_bot_time", {
      _bot_id: data.botId,
      _hours: data.hours,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(result) ? result[0] : result;
    return {
      botId: row?.bot_id ?? data.botId,
      expiresAt: row?.expires_at ?? null,
    };
  });
