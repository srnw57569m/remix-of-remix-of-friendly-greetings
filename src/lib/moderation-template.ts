/**
 * Builders for the Moderation Bot config files: `config.json` and `bot_pos.json`.
 * Shape mirrors the upstream template at https://github.com/srnw57569m/mojs.
 */

export type ModerationConfig = {
  token: string;
  room: string;
  owner: string;
  welcomeMessages: string[];
  byeMessages: string[];
  admins?: string[];
};

export function buildModerationConfigJson(cfg: ModerationConfig): string {
  const obj = {
    token: cfg.token,
    room: cfg.room,
    owner: cfg.owner,
    welcome_message: cfg.welcomeMessages.length ? cfg.welcomeMessages : [""],
    bye_message: cfg.byeMessages.length ? cfg.byeMessages : [""],
    admins: cfg.admins && cfg.admins.length ? cfg.admins : [""],
  };
  return JSON.stringify(obj, null, 2);
}

export function defaultModerationBotPos(admins: string[] = []): string {
  return JSON.stringify(
    {
      bot_position: {
        x: 10.710113525390625,
        y: 0.25,
        z: 7.5694122314453125,
        facing: "FrontLeft",
      },
      admins: admins.length ? admins : [""],
    },
    null,
    2,
  );
}

export type ModerationPatch = {
  ownerUsername?: string;
  welcomeMessages?: string[];
  byeMessages?: string[];
  admins?: string[];
};

export function patchModerationConfigJson(content: string, patch: ModerationPatch): string {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  if (patch.ownerUsername !== undefined) parsed.owner = patch.ownerUsername;
  if (patch.welcomeMessages !== undefined)
    parsed.welcome_message = patch.welcomeMessages.length ? patch.welcomeMessages : [""];
  if (patch.byeMessages !== undefined)
    parsed.bye_message = patch.byeMessages.length ? patch.byeMessages : [""];
  if (patch.admins !== undefined)
    parsed.admins = patch.admins.length ? patch.admins : [""];
  return JSON.stringify(parsed, null, 2);
}

export function patchModerationBotPos(content: string, admins: string[]): string {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(content); } catch { parsed = {}; }
  if (!parsed.bot_position) {
    parsed.bot_position = {
      x: 10.710113525390625,
      y: 0.25,
      z: 7.5694122314453125,
      facing: "FrontLeft",
    };
  }
  parsed.admins = admins.length ? admins : [""];
  return JSON.stringify(parsed, null, 2);
}
