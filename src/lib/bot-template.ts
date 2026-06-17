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
 * Canonical config.json shape used when creating a new bot. Wizard values
 * overwrite the `bot` and `radio` sections; every other section
 * (command_prefix, commands, messages, branding) is filled in from this
 * default so the generated file is always complete.
 */
function defaultConfig(): Record<string, unknown> {
  return {
    bot: {
      token: "",
      room_id: "",
      owner: "",
      admins: [],
    },
    radio: {
      icecast_server: "",
      icecast_port: 8000,
      mount_point: "",
      username: "source",
      password: "",
    },
    command_prefix: "/",
    commands: {
      reload: ["reload"],
      play: ["play", "p"],
      skip: ["skip", "s"],
      queue: ["q"],
      now_playing: ["np"],
      balance: ["bal"],
      buy: ["buy"],
      clear_queue: ["clearq"],
      delete_from_queue: ["delq"],
      paid: ["paid"],
      refresh: ["refresh"],
      shutdown: ["shutdown"],
      setpos: ["setpos"],
      admin: ["admin"],
      deladmin: ["deladmin"],
      cadmin: ["cadmin"],
      add_credits: ["ac"],
      remove_credits: ["rc"],
      check_credits: ["cc"],
      confirm_clear_credits: ["cac"],
      sfx: ["sfx"],
    },
    messages: {
      initialization_in_progress: "Initialization in progress. Please wait.",
      initialization_complete: "Initialization is complete.",

      no_song_currently_playing: "No song is currently playing.",
      queue_empty: "The queue is currently empty.",
      queue_now_empty: "The queue is now empty.",
      invalid_page_number: "Invalid page number.",

      sfx_no_permission: "❌ You don't have permission to use this command.",
      sfx_cant_during_play: "@{user} You can't add an sfx while a song is playing.",
      sfx_invalid_effect: "Invalid effect. Use one of the following: {effects}.",
      sfx_selected_nightcore: "@{user} Nightcore effect selected.",
      sfx_selected_daycore: "@{user} Daycore effect selected.",
      sfx_selected_normal: "@{user} Normal mode selected.",

      radio_started: "🎶 Radio started successfully.",
      radio_stopped: "⏹️ Radio stopped.",

      credits_enabled: "Credits requirement has been enabled.",
      credits_disabled: "Credits requirement has been disabled.",
      credits_invalid_option:
        "Invalid option. Use `{on_off_on}` to enable or `{on_off_off}` to disable.",

      song_added_to_queue:
        "New song added to the queue!\nTitle: {song}\nDuration: {duration}\nRequested By: @{user}\n\nQueue Position: #{position}\n\nStay Tuned, It's Coming Up Next! ",
      song_queue_limit:
        "[@{user}], you can only queue up to 3 songs. Please wait until one finishes.",

      unable_retrieve_song_details:
        "[@{user}], I couldn't retrieve details for your song request. Please try a different keyword(s) or URL.",
      song_duration_limit:
        "[@{user}], your song: '{song}' exceeds the 12-minute duration limit and cannot be added.",
      need_credit_to_queue: "[@{user}], you need at least 1 credit to queue a song.",

      insufficient_balance:
        "You don't have enough balance to buy the song. Check your balance using `{bal_cmd}`.",
      no_balance_tip: "You don't have a balance yet. Tip the bot to get started!",
      invalid_amount: "Invalid amount. Please enter a valid number for the song(s) to buy.",
      buy_usage: "Usage: /buy <amount> song(s). Example: /buy 10 song",

      admin_refresh_wait:
        "The bot is still initializing. Please wait a moment before using the /shutdown command.",
      refreshing_bot: "Refreshing the bot. Please wait.",
      initializing_shutdown: "Initializing shut down.",
      shutting_down: "Shutting down.",

      bot_position_set: "Bot position set!",

      only_skipper_or_admin: "Only the requester of the song or an admin can skip it.",
      skip_action_in_progress: "A skip action is already in progress. Please wait.",
      no_song_to_skip: "No song is currently playing to skip.",

      use_reload: "Config reloaded successfully.",
    },
    branding: {
      enabled: true,
      footer: "Powered by Beatly",
    },
  };
}

/**
 * Inject user-provided values into the template `config.json`. Starts from
 * the canonical default so the generated file always contains every
 * section, then overlays whatever the storage template provides, then
 * finally overwrites `bot` and `radio` with the wizard values.
 */
export function injectConfigJson(content: string, cfg: InjectionConfig): string {
  const base = defaultConfig();
  const fromStorage = safeParseOrEmpty(content);
  const parsed = mergeTopLevel(base, fromStorage);

  parsed.bot = {
    ...asObject(parsed.bot),
    token: cfg.botToken,
    room_id: cfg.roomId,
    owner: cfg.ownerUsername,
    admins: [],
  };

  parsed.radio = {
    ...asObject(parsed.radio),
    icecast_server: cfg.icecastServer,
    icecast_port: cfg.icecastPort,
    mount_point: cfg.mountPoint,
    username: cfg.icecastUsername,
    password: cfg.icecastPassword,
  };

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
function safeParseOrEmpty(content: string): Record<string, unknown> {
  if (!content || !content.trim()) return {};
  try {
    const v = JSON.parse(content);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
function mergeTopLevel(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
