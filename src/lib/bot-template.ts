export type InjectionConfig = {
  botToken: string;
  roomId: string;
  ownerUsername: string;
  icecastServer: string;
  icecastPort: number;
  mountPoint: string;
  icecastUsername: string;
  icecastPassword: string;
};

/**
 * Inject user-provided values into the template `config.json`.
 * Only the fields the user supplies in the wizard are overwritten — every
 * other key (commands, messages, branding, …) is preserved verbatim.
 */
export function injectConfigJson(content: string, cfg: InjectionConfig): string {
  const parsed = safeParse(content);

  const bot = asObject(parsed.bot);
  bot.token = cfg.botToken;
  bot.room_id = cfg.roomId;
  bot.owner = cfg.ownerUsername;
  bot.admins = [];
  parsed.bot = bot;

  const radio = asObject(parsed.radio);
  radio.icecast_server = cfg.icecastServer;
  radio.icecast_port = cfg.icecastPort;
  radio.mount_point = cfg.mountPoint;
  radio.username = cfg.icecastUsername;
  radio.password = cfg.icecastPassword;
  parsed.radio = radio;

  return JSON.stringify(parsed, null, 2);
}

export type PartialBotPatch = {
  ownerUsername?: string;
  admins?: string[];
  icecastServer?: string;
  icecastPort?: number;
  mountPoint?: string;
  icecastUsername?: string;
  icecastPassword?: string;
};

/**
 * Patch an existing config.json with only the fields supplied. Used by the
 * bot management dashboard when the user updates a subset of settings.
 */
export function patchConfigJson(content: string, patch: PartialBotPatch): string {
  const parsed = safeParse(content);

  if (patch.ownerUsername !== undefined || patch.admins !== undefined) {
    const bot = asObject(parsed.bot);
    if (patch.ownerUsername !== undefined) bot.owner = patch.ownerUsername;
    if (patch.admins !== undefined) bot.admins = patch.admins;
    parsed.bot = bot;
  }

  const radioKeys: Array<[keyof PartialBotPatch, string]> = [
    ["icecastServer", "icecast_server"],
    ["icecastPort", "icecast_port"],
    ["mountPoint", "mount_point"],
    ["icecastUsername", "username"],
    ["icecastPassword", "password"],
  ];
  if (radioKeys.some(([k]) => patch[k] !== undefined)) {
    const radio = asObject(parsed.radio);
    for (const [k, target] of radioKeys) {
      const v = patch[k];
      if (v !== undefined) radio[target] = v;
    }
    parsed.radio = radio;
  }

  return JSON.stringify(parsed, null, 2);
}

function safeParse(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`config.json is not valid JSON: ${(e as Error).message}`);
  }
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
