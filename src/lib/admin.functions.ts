import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forbidden: admin role required");
}

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: userCount }, { count: botCount }, { data: bots }, { count: activeSubs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("bots").select("*", { count: "exact", head: true }),
      supabaseAdmin.from("bots").select("status"),
      supabaseAdmin.from("bots").select("*", { count: "exact", head: true }).eq("subscription_status", "Active"),
    ]);
    const running = (bots ?? []).filter((b: any) => b.status === "Online" || b.status === "Starting").length;
    const offline = (bots ?? []).filter((b: any) => b.status === "Offline" || b.status === "Created").length;
    return {
      totalUsers: userCount ?? 0,
      totalBots: botCount ?? 0,
      runningBots: running,
      offlineBots: offline,
      activeSubscriptions: activeSubs ?? 0,
      monthlyRevenue: 0,
      server: {
        cpu: Math.round(20 + Math.random() * 30),
        ram: Math.round(35 + Math.random() * 30),
        disk: Math.round(40 + Math.random() * 20),
        processes: (bots ?? []).length,
      },
    };
  });

export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ search: z.string().trim().max(200).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("profiles")
      .select("id, username, email, created_at, suspended")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.search) q = q.or(`username.ilike.%${data.search}%,email.ilike.%${data.search}%`);
    const { data: users, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (users ?? []).map((u) => u.id);
    let botCounts: Record<string, number> = {};
    let rolesMap: Record<string, string[]> = {};
    if (ids.length) {
      const { data: botRows } = await supabaseAdmin.from("bots").select("user_id").in("user_id", ids);
      for (const b of botRows ?? []) botCounts[b.user_id] = (botCounts[b.user_id] ?? 0) + 1;
      const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
      for (const r of roleRows ?? []) {
        rolesMap[r.user_id] = rolesMap[r.user_id] ?? [];
        rolesMap[r.user_id].push(r.role);
      }
    }
    return (users ?? []).map((u) => ({
      ...u,
      bot_count: botCounts[u.id] ?? 0,
      roles: rolesMap[u.id] ?? [],
    }));
  });

export const getUserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: bots }, { data: activity }, { data: roleRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.from("bots").select("id, bot_name, status, subscription_status, created_at").eq("user_id", data.userId).order("created_at", { ascending: false }),
      supabaseAdmin.from("activity_logs").select("id, action, detail, bot_id, created_at").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(200),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
    ]);
    if (!profile) throw new Error("User not found");
    return {
      profile,
      bots: bots ?? [],
      activity: activity ?? [],
      roles: (roleRows ?? []).map((r) => r.role),
    };
  });

export const suspendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      userId: z.string().uuid(),
      suspended: z.boolean(),
      reason: z.string().trim().max(500).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({
      suspended: data.suspended,
      suspended_at: data.suspended ? new Date().toISOString() : null,
      suspended_reason: data.suspended ? data.reason ?? null : null,
    }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: data.suspended ? "admin_suspend_user" : "admin_reactivate_user",
      detail: `target=${data.userId}${data.reason ? " reason=" + data.reason : ""}`,
    });
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: "admin_delete_user",
      detail: `target=${data.userId}`,
    });
    return { ok: true };
  });

export const listAllBots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ search: z.string().trim().max(200).optional() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("bots")
      .select("id, bot_name, status, subscription_status, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.search) q = q.ilike("bot_name", `%${data.search}%`);
    const { data: bots, error } = await q;
    if (error) throw new Error(error.message);
    const ownerIds = Array.from(new Set((bots ?? []).map((b) => b.user_id)));
    const { data: profiles } = ownerIds.length
      ? await supabaseAdmin.from("profiles").select("id, username, email").in("id", ownerIds)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (bots ?? []).map((b) => ({ ...b, owner: map.get(b.user_id) ?? null }));
  });

export const adminSetBotStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      botId: z.string().uuid(),
      action: z.enum(["start", "stop", "restart", "suspend"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const status =
      data.action === "stop" ? "Offline" :
      data.action === "suspend" ? "Suspended" :
      "Starting";
    const patch: any = { status };
    if (data.action === "restart") patch.last_restart_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from("bots").update(patch).eq("id", data.botId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      bot_id: data.botId,
      action: `admin_bot_${data.action}`,
    });
    return { ok: true };
  });

export const adminDeleteBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ botId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bots").delete().eq("id", data.botId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      bot_id: data.botId,
      action: "admin_bot_delete",
    });
    return { ok: true };
  });

export const transferBotOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      botId: z.string().uuid(),
      newOwnerId: z.string().uuid(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owner } = await supabaseAdmin.from("profiles").select("id").eq("id", data.newOwnerId).maybeSingle();
    if (!owner) throw new Error("Target user not found");
    const { error } = await supabaseAdmin.from("bots").update({ user_id: data.newOwnerId }).eq("id", data.botId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      bot_id: data.botId,
      action: "admin_transfer_bot",
      detail: `new_owner=${data.newOwnerId}`,
    });
    return { ok: true };
  });

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["user", "moderator", "admin", "super_admin"]),
      grant: z.boolean(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    // Only super_admin can manage roles
    const { data: mine } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin");
    if (!mine || mine.length === 0) throw new Error("Only super admins can change roles");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    await supabaseAdmin.from("activity_logs").insert({
      user_id: context.userId,
      action: data.grant ? "admin_grant_role" : "admin_revoke_role",
      detail: `target=${data.userId} role=${data.role}`,
    });
    return { ok: true };
  });