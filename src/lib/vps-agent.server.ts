/**
 * SonicForge VPS Agent HTTP client.
 *
 * Server-only. Talks to the Node agent running on the user's VPS.
 * If the secrets aren't configured yet, every call short-circuits with
 * `{ configured: false }` so the UI keeps working in "preview" mode.
 */

function getAgentConfig() {
  return {
    base: (process.env.VPS_AGENT_URL || "").replace(/\/+$/, ""),
    secret: process.env.VPS_AGENT_SECRET || "",
  };
}

export type AgentStats = {
  ok: true;
  deployed: boolean;
  status: "Online" | "Offline";
  cpu?: number;
  memoryMB?: number;
  uptime?: number | null;
  restarts?: number;
};

export function isAgentConfigured(): boolean {
  const { base, secret } = getAgentConfig();
  return Boolean(base && secret);
}

async function call<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  if (!isAgentConfigured()) {
    throw new Error(
      "VPS agent is not configured. Set VPS_AGENT_URL and VPS_AGENT_SECRET in project secrets.",
    );
  }
  const { base, secret } = getAgentConfig();
  const url = `${base}${path}`;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60_000);
  try {
    const r = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-agent-secret": secret,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
    const text = await r.text();
    let parsed: any;
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }
    if (!r.ok || parsed?.ok === false) {
      const base = parsed?.error || `Agent ${r.status}`;
      const detail = parsed?.detail ? `: ${String(parsed.detail).slice(0, 600)}` : (parsed?.error ? "" : `: ${text.slice(0, 200)}`);
      throw new Error(`${base}${detail}`);
    }
    return parsed as T;
  } finally {
    clearTimeout(timer);
  }
}

export const agent = {
  deploy: (botId: string, config: Record<string, unknown>) =>
    call("POST", "/deploy", { botId, config }),
  start: (botId: string) => call("POST", "/start", { botId }),
  stop: (botId: string) => call("POST", "/stop", { botId }),
  restart: (botId: string) => call("POST", "/restart", { botId }),
  delete: (botId: string) => call("POST", "/delete", { botId }),
  stats: (botId: string) =>
    call<AgentStats>("GET", `/stats?botId=${encodeURIComponent(botId)}`),
  logs: (botId: string, lines = 200) =>
    call<{ ok: true; logs: string }>(
      "GET",
      `/logs?botId=${encodeURIComponent(botId)}&lines=${lines}`,
    ),
};

/** Build the config.json object the bot expects from a DB bot row. */
export function buildBotConfig(bot: {
  bot_token: string;
  room_id: string;
  owner_username: string;
  icecast_server: string;
  icecast_port: number;
  mount_point: string;
  icecast_username: string;
  icecast_password: string;
  admins?: string[] | null;
}) {
  return {
    bot: {
      token: bot.bot_token,
      room_id: bot.room_id,
      owner: bot.owner_username,
      admins: Array.isArray(bot.admins) ? bot.admins : [],
    },
    radio: {
      icecast_server: bot.icecast_server,
      icecast_port: bot.icecast_port,
      mount_point: bot.mount_point,
      username: bot.icecast_username,
      password: bot.icecast_password,
    },
  };
}