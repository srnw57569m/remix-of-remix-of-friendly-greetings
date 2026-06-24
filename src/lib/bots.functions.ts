import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { wizardSchema, type WizardData } from "./wizard-schema";
import { moderationWizardSchema, type ModerationWizardData } from "./moderation-wizard-schema";
import {
  injectConfigJson,
  patchConfigJson,
  type InjectionConfig,
  type PartialBotPatch,
} from "./bot-template";
import {
  buildModerationConfigJson,
  defaultModerationBotPos,
  patchModerationConfigJson,
  patchModerationBotPos,
} from "./moderation-template";

const TEMPLATE_BUCKET = "bot-templates";
const TEMPLATE_PREFIX: string = ""; // files live at the root of the bot-templates bucket
const USER_BUCKET = "user-bots";

type AdminClient = Awaited<ReturnType<typeof loadAdmin>>;

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Lazy-load the VPS agent client (server-only module). */
async function loadAgent() {
  return await import("./vps-agent.server");
}

async function listTemplateFiles(admin: AdminClient, prefix: string): Promise<string[]> {
  const results: string[] = [];
  const queue: string[] = [prefix];
  while (queue.length) {
    const dir = queue.shift()!;
    const { data, error } = await admin.storage.from(TEMPLATE_BUCKET).list(dir, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Failed to list template: ${error.message}`);
    if (!data) continue;
    for (const entry of data) {
      const fullPath = dir ? `${dir}/${entry.name}` : entry.name;
      // Folders have id === null in Supabase storage listings
      if (entry.id === null) {
        queue.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  return results;
}

export const createBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => wizardSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const wizard = data as WizardData;

    // 1) Determine next bot_index
    const { data: existing, error: idxErr } = await supabase
      .from("bots")
      .select("bot_index")
      .eq("user_id", userId)
      .order("bot_index", { ascending: false })
      .limit(1);
    if (idxErr) throw new Error(`Database error: ${idxErr.message}`);
    const nextIndex = ((existing?.[0]?.bot_index as number | undefined) ?? 0) + 1;
    const botName = `MusicBot${nextIndex}`;
    const storagePath = `${userId}/${botName}`;

    // 2) Load template from storage (legacy path). When the VPS agent is
    //    configured, it does a fresh `git clone` of BOT_REPO_URL on the VPS,
    //    so the storage copy is optional.
    const { isAgentConfigured: agentConfiguredCheck } = await loadAgent();
    const agentReady = agentConfiguredCheck();

    const admin = await loadAdmin();
    const templateFiles = agentReady
      ? []
      : await listTemplateFiles(admin, TEMPLATE_PREFIX);
    if (!agentReady && templateFiles.length === 0) {
      throw new Error(
        "Bot template has not been uploaded yet. Please contact the administrator.",
      );
    }

    const cfg: InjectionConfig = {
      botToken: wizard.botToken,
      roomId: wizard.roomId,
      ownerUsername: wizard.ownerUsername,
      icecastServer: wizard.icecastServer,
      icecastPort: wizard.icecastPort,
      mountPoint: wizard.mountPoint,
      icecastUsername: wizard.icecastUsername,
      icecastPassword: wizard.icecastPassword,
    };

    // 3) Copy every template file to the user's folder, injecting wizard
    //    values into config.json only. Skipped when the VPS agent is in
    //    charge of provisioning.
    for (const srcPath of templateFiles) {
      const relPath = TEMPLATE_PREFIX
        ? srcPath.slice(TEMPLATE_PREFIX.length + 1)
        : srcPath;
      const destPath = `${storagePath}/${relPath}`;

      const { data: blob, error: dlErr } = await admin.storage
        .from(TEMPLATE_BUCKET)
        .download(srcPath);
      if (dlErr || !blob) throw new Error(`Failed to read template ${srcPath}: ${dlErr?.message}`);

      let body: Blob | string = blob;
      let contentType: string = blob.type || "application/octet-stream";
      const baseName = relPath.split("/").pop() ?? "";

      if (baseName === "config.json") {
        const text = await blob.text();
        body = injectConfigJson(text, cfg);
        contentType = "application/json";
      }

      const { error: upErr } = await admin.storage
        .from(USER_BUCKET)
        .upload(destPath, body, { upsert: true, contentType });
      if (upErr) throw new Error(`Failed to write ${destPath}: ${upErr.message}`);
    }


    // 4) Insert bot row
    const { data: bot, error: insErr } = await supabase
      .from("bots")
      .insert({
        user_id: userId,
        bot_name: botName,
        bot_index: nextIndex,
        bot_token: wizard.botToken,
        room_id: wizard.roomId,
        owner_username: wizard.ownerUsername,
        icecast_server: wizard.icecastServer,
        icecast_port: wizard.icecastPort,
        mount_point: wizard.mountPoint,
        icecast_username: wizard.icecastUsername,
        icecast_password: wizard.icecastPassword,
        status: "Created",
        storage_path: storagePath,
      })
      .select("id, bot_name, status, created_at, storage_path")
      .single();
    if (insErr) throw new Error(`Database error: ${insErr.message}`);

    // 5) Try to deploy to the VPS agent (best-effort — preview works without it)
    const { agent, isAgentConfigured, buildBotConfig } = await loadAgent();
    let deployed = false;
    let deployError: string | null = null;
    if (isAgentConfigured()) {
      try {
        await agent.deploy(
          bot.id,
          buildBotConfig({
            bot_token: wizard.botToken,
            room_id: wizard.roomId,
            owner_username: wizard.ownerUsername,
            icecast_server: wizard.icecastServer,
            icecast_port: wizard.icecastPort,
            mount_point: wizard.mountPoint,
            icecast_username: wizard.icecastUsername,
            icecast_password: wizard.icecastPassword,
            admins: [],
          }),
        );
        deployed = true;
        await supabase.from("bots").update({ status: "Offline" }).eq("id", bot.id);
      } catch (e) {
        deployError = (e as Error).message;
      }
    }

    return { ...bot, deployed, deployError };
  });

// ============================================================
//               MODERATION BOT — CREATE
// ============================================================

export const createModerationBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moderationWizardSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const wizard = data as ModerationWizardData;

    // 1) Determine next bot_index
    const { data: existing, error: idxErr } = await supabase
      .from("bots")
      .select("bot_index")
      .eq("user_id", userId)
      .order("bot_index", { ascending: false })
      .limit(1);
    if (idxErr) throw new Error(`Database error: ${idxErr.message}`);
    const nextIndex = ((existing?.[0]?.bot_index as number | undefined) ?? 0) + 1;
    const botName = `ModBot${nextIndex}`;
    const storagePath = `${userId}/${botName}`;

    // 2) Write moderation config.json + bot_pos.json to user storage
    const admin = await loadAdmin();
    const cfgJson = buildModerationConfigJson({
      token: wizard.botToken,
      room: wizard.roomId,
      owner: wizard.ownerUsername,
      welcomeMessages: wizard.welcomeMessages,
      byeMessages: wizard.byeMessages,
      admins: [],
    });
    const posJson = defaultModerationBotPos([]);

    const upCfg = await admin.storage.from(USER_BUCKET)
      .upload(`${storagePath}/config.json`, cfgJson, { upsert: true, contentType: "application/json" });
    if (upCfg.error) throw new Error(`Failed to write config.json: ${upCfg.error.message}`);
    const upPos = await admin.storage.from(USER_BUCKET)
      .upload(`${storagePath}/bot_pos.json`, posJson, { upsert: true, contentType: "application/json" });
    if (upPos.error) throw new Error(`Failed to write bot_pos.json: ${upPos.error.message}`);

    // 3) Insert bot row
    const { data: bot, error: insErr } = await supabase
      .from("bots")
      .insert({
        user_id: userId,
        bot_name: botName,
        bot_index: nextIndex,
        bot_type: "moderation",
        bot_token: wizard.botToken,
        room_id: wizard.roomId,
        owner_username: wizard.ownerUsername,
        welcome_messages: wizard.welcomeMessages,
        bye_messages: wizard.byeMessages,
        status: "Created",
        storage_path: storagePath,
      } as any)
      .select("id, bot_name, status, created_at, storage_path")
      .single();
    if (insErr) throw new Error(`Database error: ${insErr.message}`);

    // 4) Best-effort deploy via VPS agent
    const { agent, isAgentConfigured, buildBotConfig } = await loadAgent();
    let deployed = false;
    let deployError: string | null = null;
    if (isAgentConfigured()) {
      try {
        await agent.deploy(bot.id, buildBotConfig({
          bot_type: "moderation",
          bot_token: wizard.botToken,
          room_id: wizard.roomId,
          owner_username: wizard.ownerUsername,
          welcome_messages: wizard.welcomeMessages,
          bye_messages: wizard.byeMessages,
          admins: [],
        }));
        deployed = true;
        await supabase.from("bots").update({ status: "Offline" }).eq("id", bot.id);
      } catch (e) {
        deployError = (e as Error).message;
      }
    }

    return { ...bot, deployed, deployError };
  });


// ============================================================
//                  BOT MANAGEMENT SERVER FNS
// ============================================================

const idInput = z.object({ botId: z.string().uuid() });

/** Throws when the bot can't be edited (admin-suspended or rent expired). */
function assertBotEditable(bot: {
  status?: string | null;
  admin_suspended?: boolean | null;
  admin_suspended_reason?: string | null;
  subscription_status?: string | null;
  subscription_expires_at?: string | null;
}) {
  if (bot.admin_suspended) {
    throw new Error(
      `Bot is suspended by admin${bot.admin_suspended_reason ? `: ${bot.admin_suspended_reason}` : ""}. Editing is locked.`,
    );
  }
  const expired =
    bot.subscription_status === "Expired" ||
    bot.status === "Expired" ||
    bot.status === "Suspended" ||
    (bot.subscription_expires_at && new Date(bot.subscription_expires_at).getTime() < Date.now());
  if (expired) {
    throw new Error("Rent time finished. Renew a plan to edit this bot again.");
  }
}

async function logActivity(
  supabase: any,
  userId: string,
  botId: string | null,
  action: string,
  detail?: string,
) {
  await supabase.from("activity_logs").insert({
    user_id: userId,
    bot_id: botId,
    action,
    detail: detail ?? null,
  });
}

export const listBots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("bots")
      .select(
        "id, bot_name, bot_index, status, owner_username, created_at, updated_at, last_restart_at, subscription_status, subscription_expires_at, admins, icecast_server, icecast_port, mount_point, icecast_username, room_id, storage_path, admin_suspended, admin_suspended_reason, admin_suspended_at, bot_type, welcome_messages, bye_messages",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getBot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error } = await supabase
      .from("bots")
      .select("*")
      .eq("id", data.botId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!bot) throw new Error("Bot not found");
    return bot;
  });

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("activity_logs")
      .select("id, action, detail, created_at, bot_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.botId) q = q.eq("bot_id", data.botId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setBotStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid(),
      action: z.enum(["start", "stop", "restart"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify ownership and check suspension state
    const { data: owned, error: ownErr } = await supabase
      .from("bots")
      .select("id, status, admin_suspended, admin_suspended_reason, subscription_status, subscription_expires_at")
      .eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (ownErr) throw new Error(ownErr.message);
    if (!owned) throw new Error("Bot not found");
    if (owned.admin_suspended) {
      throw new Error(
        `Bot is suspended by admin${owned.admin_suspended_reason ? `: ${owned.admin_suspended_reason}` : ""}. Contact support.`,
      );
    }
    const subExpired =
      owned.subscription_status === "Expired" ||
      owned.status === "Expired" ||
      owned.status === "Suspended" ||
      (owned.subscription_expires_at && new Date(owned.subscription_expires_at as string).getTime() < Date.now());
    if (subExpired) {
      throw new Error("Rent time finished. Renew a plan to use this bot again.");
    }

    // Call the VPS agent if configured
    const { agent, isAgentConfigured, buildBotConfig } = await loadAgent();
    let agentError: string | null = null;
    if (isAgentConfigured()) {
      const runAction = async () => {
        if (data.action === "start") await agent.start(data.botId);
        else if (data.action === "stop") await agent.stop(data.botId);
        else await agent.restart(data.botId);
      };
      try {
        await runAction();
      } catch (e) {
        const msg = (e as Error).message || "";
        // Bot exists in our DB but was never deployed to the VPS
        // (e.g. created before the agent was reachable). Deploy then retry.
        if (data.action !== "stop" && /not deployed/i.test(msg)) {
          try {
            const { data: full } = await supabase
              .from("bots").select("*").eq("id", data.botId).eq("user_id", userId).single();
            if (full) {
              await agent.deploy(full.id, buildBotConfig({
                ...full,
                admins: Array.isArray(full.admins) ? (full.admins as string[]) : [],
              }));
              await runAction();
            } else {
              agentError = msg;
            }
          } catch (e2) {
            agentError = (e2 as Error).message;
          }
        } else {
          agentError = msg;
        }
      }
    }

    const nextStatus = data.action === "stop" ? "Offline" : "Online";
    const patch: TablesUpdate<"bots"> = { status: nextStatus };
    if (data.action === "restart" || data.action === "start") {
      patch.last_restart_at = new Date().toISOString();
    }
    const { data: updated, error } = await supabase
      .from("bots").update(patch)
      .eq("id", data.botId).eq("user_id", userId)
      .select("id, status, last_restart_at").maybeSingle();
    if (error) throw new Error(error.message);
    await logActivity(
      supabase, userId, data.botId, "bot_" + data.action,
      agentError ? `agent error: ${agentError}` : undefined,
    );
    if (agentError) return { ...(updated ?? {}), agentError } as typeof updated & { agentError?: string };
    return updated;
  });

const configPatchInput = z.object({
  botId: z.string().uuid(),
  ownerUsername: z.string().trim().min(1).max(200).optional(),
  icecastServer: z.string().trim().min(1).max(255).optional(),
  icecastPort: z.coerce.number().int().min(1).max(65535).optional(),
  mountPoint: z.string().trim().min(1).max(255).optional(),
  icecastUsername: z.string().trim().min(1).max(200).optional(),
  icecastPassword: z.string().min(1).max(500).optional(),
});

export const updateBotConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => configPatchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error: loadErr } = await supabase
      .from("bots")
      .select("id, user_id, storage_path, admins, status, bot_type, admin_suspended, admin_suspended_reason, subscription_status, subscription_expires_at")
      .eq("id", data.botId)
      .eq("user_id", userId)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!bot) throw new Error("Bot not found");
    assertBotEditable(bot as any);

    const dbPatch: TablesUpdate<"bots"> = {};
    if (data.ownerUsername !== undefined) dbPatch.owner_username = data.ownerUsername;
    if (data.icecastServer !== undefined) dbPatch.icecast_server = data.icecastServer;
    if (data.icecastPort !== undefined) dbPatch.icecast_port = data.icecastPort;
    if (data.mountPoint !== undefined) dbPatch.mount_point = data.mountPoint;
    if (data.icecastUsername !== undefined) dbPatch.icecast_username = data.icecastUsername;
    if (data.icecastPassword !== undefined) dbPatch.icecast_password = data.icecastPassword;
    if (Object.keys(dbPatch).length > 0) {
      const { error } = await supabase.from("bots").update(dbPatch)
        .eq("id", data.botId).eq("user_id", userId);
      if (error) throw new Error(error.message);
    }

    await patchConfigInStorage(bot.storage_path, {
      ownerUsername: data.ownerUsername,
      icecastServer: data.icecastServer,
      icecastPort: data.icecastPort,
      mountPoint: data.mountPoint,
      icecastUsername: data.icecastUsername,
      icecastPassword: data.icecastPassword,
    }, data.botId, (bot as any).bot_type);
    await logActivity(supabase, userId, data.botId, "config_updated");
    return { ok: true as const };
  });

/** Replace welcome/bye message arrays on a moderation bot. */
export const updateModerationMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid(),
      welcomeMessages: z.array(z.string().trim().max(500)).optional(),
      byeMessages: z.array(z.string().trim().max(500)).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error: loadErr } = await supabase.from("bots")
      .select("id, bot_type, storage_path, admins, status, admin_suspended, admin_suspended_reason, subscription_status, subscription_expires_at")
      .eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!bot) throw new Error("Bot not found");
    if ((bot as any).bot_type !== "moderation") throw new Error("Only moderation bots have welcome/bye messages.");
    assertBotEditable(bot as any);

    const dbPatch: Record<string, unknown> = {};
    if (data.welcomeMessages !== undefined) dbPatch.welcome_messages = data.welcomeMessages;
    if (data.byeMessages !== undefined) dbPatch.bye_messages = data.byeMessages;
    if (Object.keys(dbPatch).length > 0) {
      const { error } = await supabase.from("bots").update(dbPatch as any)
        .eq("id", data.botId).eq("user_id", userId);
      if (error) throw new Error(error.message);
    }

    await patchModerationInStorage(bot.storage_path, {
      welcomeMessages: data.welcomeMessages,
      byeMessages: data.byeMessages,
    }, data.botId);

    await logActivity(supabase, userId, data.botId, "messages_updated");
    return { ok: true as const };
  });

const adminInput = z.object({
  botId: z.string().uuid(),
  username: z.string().trim().min(1).max(64),
});

export const addBotAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error: loadErr } = await supabase.from("bots")
      .select("id, admins, storage_path, status, bot_type, admin_suspended, admin_suspended_reason, subscription_status, subscription_expires_at")
      .eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!bot) throw new Error("Bot not found");
    assertBotEditable(bot as any);
    const current = Array.isArray(bot.admins) ? (bot.admins as string[]) : [];
    if (current.includes(data.username)) return { admins: current };
    const admins = [...current, data.username];
    const { error: upErr } = await supabase.from("bots").update({ admins })
      .eq("id", data.botId).eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);
    await patchConfigInStorage(bot.storage_path, { admins }, data.botId, (bot as any).bot_type);
    await logActivity(supabase, userId, data.botId, "admin_added", data.username);
    return { admins };
  });

export const removeBotAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error: loadErr } = await supabase.from("bots")
      .select("id, admins, storage_path, status, bot_type, admin_suspended, admin_suspended_reason, subscription_status, subscription_expires_at")
      .eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!bot) throw new Error("Bot not found");
    assertBotEditable(bot as any);
    const current = Array.isArray(bot.admins) ? (bot.admins as string[]) : [];
    const admins = current.filter((u) => u !== data.username);
    const { error: upErr } = await supabase.from("bots").update({ admins })
      .eq("id", data.botId).eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);
    await patchConfigInStorage(bot.storage_path, { admins }, data.botId, (bot as any).bot_type);
    await logActivity(supabase, userId, data.botId, "admin_removed", data.username);
    return { admins };
  });

export const setSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid(),
      action: z.enum(["activate", "disable"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch = data.action === "activate"
      ? {
          subscription_status: "Active",
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : { subscription_status: "Disabled", subscription_expires_at: null };
    const { data: updated, error } = await supabase.from("bots").update(patch)
      .eq("id", data.botId).eq("user_id", userId)
      .select("subscription_status, subscription_expires_at").maybeSingle();
    if (error) throw new Error(error.message);
    if (!updated) throw new Error("Bot not found");
    await logActivity(supabase, userId, data.botId, "subscription_" + data.action);
    return updated;
  });

export const deleteBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error: loadErr } = await supabase.from("bots")
      .select("id, storage_path, bot_name").eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!bot) throw new Error("Bot not found");

    const admin = await loadAdmin();
    const files = await listUserBotFiles(admin, bot.storage_path);
    if (files.length > 0) {
      const { error: rmErr } = await admin.storage.from(USER_BUCKET).remove(files);
      if (rmErr) throw new Error("Failed to remove files: " + rmErr.message);
    }

    // Best-effort teardown on the VPS too
    try {
      const { agent, isAgentConfigured } = await loadAgent();
      if (isAgentConfigured()) await agent.delete(data.botId);
    } catch { /* ignore — DB delete still proceeds */ }

    const { error: delErr } = await supabase.from("bots").delete()
      .eq("id", data.botId).eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);
    await logActivity(supabase, userId, null, "bot_deleted", bot.bot_name);
    return { ok: true as const };
  });

async function listUserBotFiles(admin: AdminClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const queue: string[] = [prefix];
  while (queue.length) {
    const dir = queue.shift()!;
    const { data, error } = await admin.storage.from(USER_BUCKET)
      .list(dir, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    if (!data) continue;
    for (const entry of data) {
      const full = dir + "/" + entry.name;
      if (entry.id === null) queue.push(full);
      else out.push(full);
    }
  }
  return out;
}

async function patchConfigInStorage(
  storagePath: string,
  patch: PartialBotPatch,
  botId?: string,
  botType?: string | null,
) {
  if (Object.values(patch).every((v) => v === undefined)) return;
  if (botType === "moderation") {
    // Route admins-only changes through the moderation patcher
    await patchModerationInStorage(
      storagePath,
      { ownerUsername: patch.ownerUsername, admins: patch.admins },
      botId,
    );
    return;
  }
  const admin = await loadAdmin();
  const cfgPath = storagePath + "/config.json";
  const { data: blob, error: dlErr } = await admin.storage.from(USER_BUCKET).download(cfgPath);
  if (blob) {
    const text = await blob.text();
    const next = patchConfigJson(text, patch);
    const { error: upErr } = await admin.storage.from(USER_BUCKET)
      .upload(cfgPath, next, { upsert: true, contentType: "application/json" });
    if (upErr) throw new Error("Cannot write config.json: " + upErr.message);
  } else if (dlErr && !/not.?found|not.?exist/i.test(dlErr.message)) {
    throw new Error("Cannot read config.json: " + dlErr.message);
  }
  if (patch.admins !== undefined) {
    await patchMusicbotPosAdmins(storagePath, patch.admins, botId);
  }
}

async function patchModerationInStorage(
  storagePath: string,
  patch: { ownerUsername?: string; welcomeMessages?: string[]; byeMessages?: string[]; admins?: string[] },
  botId?: string,
) {
  const admin = await loadAdmin();
  const cfgPath = storagePath + "/config.json";
  const { data: blob } = await admin.storage.from(USER_BUCKET).download(cfgPath);
  const currentText = blob ? await blob.text() : "{}";
  const nextCfg = patchModerationConfigJson(currentText, patch);
  const { error: upErr } = await admin.storage.from(USER_BUCKET)
    .upload(cfgPath, nextCfg, { upsert: true, contentType: "application/json" });
  if (upErr) throw new Error("Cannot write config.json: " + upErr.message);

  if (patch.admins !== undefined) {
    const posPath = storagePath + "/bot_pos.json";
    const { data: posBlob } = await admin.storage.from(USER_BUCKET).download(posPath);
    const posText = posBlob ? await posBlob.text() : "{}";
    const nextPos = patchModerationBotPos(posText, patch.admins);
    const { error: upPosErr } = await admin.storage.from(USER_BUCKET)
      .upload(posPath, nextPos, { upsert: true, contentType: "application/json" });
    if (upPosErr) throw new Error("Cannot write bot_pos.json: " + upPosErr.message);
    if (botId) {
      try {
        const { agent, isAgentConfigured } = await loadAgent();
        if (isAgentConfigured()) {
          await agent.updateFile(botId, "config.json", nextCfg);
          await agent.updateFile(botId, "bot_pos.json", nextPos);
        }
      } catch { /* best-effort */ }
    }
  } else if (botId) {
    try {
      const { agent, isAgentConfigured } = await loadAgent();
      if (isAgentConfigured()) await agent.updateFile(botId, "config.json", nextCfg);
    } catch { /* best-effort */ }
  }
}

async function patchMusicbotPosAdmins(storagePath: string, admins: string[], botId?: string) {
  const admin = await loadAdmin();
  const posPath = storagePath + "/musicbot_pos.json";
  let current: Record<string, unknown> = {
    bot_position: { x: 18.5, y: 0.25, z: 14.5 },
    ctoggle: false,
    nightcore: false,
    daycore: false,
    admins: [],
  };
  const { data: blob } = await admin.storage.from(USER_BUCKET).download(posPath);
  if (blob) {
    try {
      const parsed = JSON.parse(await blob.text());
      if (parsed && typeof parsed === "object") current = { ...current, ...parsed };
    } catch { /* keep defaults */ }
  }
  current.admins = admins;
  const serialized = JSON.stringify(current, null, 2);
  const { error: upErr } = await admin.storage.from(USER_BUCKET)
    .upload(posPath, serialized, { upsert: true, contentType: "application/json" });
  if (upErr) throw new Error("Cannot write musicbot_pos.json: " + upErr.message);
  if (botId) {
    try {
      const { agent, isAgentConfigured } = await loadAgent();
      if (isAgentConfigured()) {
        await agent.updateFile(botId, "musicbot_pos.json", serialized);
      }
    } catch { /* best-effort: VPS may not expose /file endpoint yet */ }
  }
}

// ============================================================
//                  REAL RUNTIME (from the VPS agent)
// ============================================================

/** Returns live stats + the latest logs for a bot, straight from pm2. */
export const getBotRuntime = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      botId: z.string().uuid(),
      logLines: z.number().int().min(1).max(2000).default(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ownership check
    const { data: owned, error } = await supabase.from("bots")
      .select("id").eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!owned) throw new Error("Bot not found");

    const { agent, isAgentConfigured } = await loadAgent();
    if (!isAgentConfigured()) {
      return {
        configured: false as const,
        deployed: false,
        status: "Offline" as const,
        cpu: 0, memoryMB: 0, uptime: null as number | null, restarts: 0,
        logs: "",
      };
    }
    try {
      const [stats, logs] = await Promise.all([
        agent.stats(data.botId),
        agent.logs(data.botId, data.logLines),
      ]);
      return {
        configured: true as const,
        deployed: stats.deployed,
        status: stats.status,
        cpu: stats.cpu ?? 0,
        memoryMB: stats.memoryMB ?? 0,
        uptime: stats.uptime ?? null,
        restarts: stats.restarts ?? 0,
        logs: logs.logs ?? "",
      };
    } catch (e) {
      return {
        configured: true as const,
        deployed: false,
        status: "Offline" as const,
        cpu: 0, memoryMB: 0, uptime: null as number | null, restarts: 0,
        logs: "",
        error: (e as Error).message,
      };
    }
  });

/** Re-deploy a bot to the VPS (fresh clone + current config). Useful after config edits. */
export const redeployBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bot, error } = await supabase.from("bots")
      .select("*").eq("id", data.botId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!bot) throw new Error("Bot not found");
    const { agent, isAgentConfigured, buildBotConfig } = await loadAgent();
    if (!isAgentConfigured()) {
      throw new Error("VPS agent is not configured yet.");
    }
    await agent.deploy(bot.id, buildBotConfig({
      ...bot,
      admins: Array.isArray(bot.admins) ? (bot.admins as string[]) : [],
    }));
    await logActivity(supabase, userId, bot.id, "bot_redeployed");
    return { ok: true as const };
  });

/** Fetch the template requirements.txt so the UI can offer a download. */
export const downloadRequirements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = await loadAdmin();
    const { data: blob, error } = await admin.storage
      .from(TEMPLATE_BUCKET)
      .download("requirements.txt");
    if (error || !blob) throw new Error("requirements.txt not found in template: " + (error?.message ?? "missing"));
    const text = await blob.text();
    return { content: text };
  });
