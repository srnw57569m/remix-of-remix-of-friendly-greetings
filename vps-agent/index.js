/**
 * SonicForge VPS Agent
 * Receives HTTPS commands from the Lovable app and manages per-bot processes
 * with pm2. Each bot = one pm2 process named `bot-<botId>`, living in
 * `${BOTS_DIR}/<botId>` which is a fresh clone of $BOT_REPO_URL with the
 * user's config.json injected.
 *
 * Env vars (read from /opt/sonicforge-agent/.env via systemd):
 *   AGENT_SECRET  — shared secret with the Lovable app (required)
 *   PORT          — default 8787
 *   BOT_REPO_URL  — git clone URL of the bot template
 *   BOTS_DIR      — default /opt/sonicforge-agent/bots
 *   PYTHON        — default python3
 */
import express from "express";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.AGENT_SECRET;
const REPO_URL = process.env.BOT_REPO_URL || "";
const BOTS_DIR = process.env.BOTS_DIR || "/opt/sonicforge-agent/bots";
// Base interpreter used ONLY to create each bot's venv. Defaults to python3.11.
let PYTHON = process.env.PYTHON || "python3.11";

/** Path to a bot's dedicated venv python interpreter. */
const venvPython = (dir) => path.join(dir, ".venv", "bin", "python");

/** Pick an available Python interpreter, preferring 3.11. */
async function resolvePython() {
  const candidates = [PYTHON, "python3.11", "python3", "python"];
  for (const c of candidates) {
    if (!c) continue;
    const r = await run(c, ["--version"]);
    if (r.code === 0) return c;
  }
  return PYTHON;
}

if (!SECRET) {
  console.error("FATAL: AGENT_SECRET env var is required");
  process.exit(1);
}

await fs.mkdir(BOTS_DIR, { recursive: true });

/** Run a shell command, returning {code, stdout, stderr}. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { ...opts, shell: false });
    let stdout = "";
    let stderr = "";
    p.stdout?.on("data", (d) => (stdout += d.toString()));
    p.stderr?.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    p.on("error", (err) => resolve({ code: 1, stdout, stderr: String(err) }));
  });
}

const botDir = (botId) => path.join(BOTS_DIR, botId);
const procName = (botId) => `bot-${botId}`;

/** Find a single bot in pm2's JSON listing. */
async function pmInfo(botId) {
  const r = await run("pm2", ["jlist"]);
  if (r.code !== 0) return null;
  try {
    const list = JSON.parse(r.stdout || "[]");
    return list.find((p) => p.name === procName(botId)) || null;
  } catch {
    return null;
  }
}

/** Tail the last N lines of a log file. */
async function tail(file, lines = 200) {
  if (!file) return "";
  try {
    const buf = await fs.readFile(file, "utf8");
    const arr = buf.split("\n");
    return arr.slice(-lines).join("\n");
  } catch {
    return "";
  }
}

const app = express();
app.use(express.json({ limit: "1mb" }));

// Auth middleware
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (req.get("x-agent-secret") !== SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true, agent: "sonicforge", version: 1 }));

/**
 * POST /deploy { botId, config }
 * Fresh clone of $BOT_REPO_URL into BOTS_DIR/<botId>, writes config.json,
 * installs requirements, registers (but does not start) the pm2 process.
 */
app.post("/deploy", async (req, res) => {
  const { botId, config } = req.body || {};
  if (!botId || typeof botId !== "string") {
    return res.status(400).json({ ok: false, error: "botId required" });
  }
  if (!REPO_URL) return res.status(500).json({ ok: false, error: "BOT_REPO_URL not set on VPS" });

  const dir = botDir(botId);

  // Tear down any previous version
  await run("pm2", ["delete", procName(botId)]);
  await fs.rm(dir, { recursive: true, force: true });

  const clone = await run("git", ["clone", "--depth=1", REPO_URL, dir]);
  if (clone.code !== 0) {
    return res.status(500).json({ ok: false, error: "git clone failed", detail: clone.stderr });
  }

  // Write user config.json (overwrites template's)
  if (config && typeof config === "object") {
    await fs.writeFile(path.join(dir, "config.json"), JSON.stringify(config, null, 2), "utf8");
  }

  // Remove any virtualenv / caches that were accidentally committed to the repo,
  // so we always build a clean, dedicated venv for this host.
  await fs.rm(path.join(dir, "venv"), { recursive: true, force: true });
  await fs.rm(path.join(dir, ".venv"), { recursive: true, force: true });
  await fs.rm(path.join(dir, "__pycache__"), { recursive: true, force: true });

  // Pick an interpreter, preferring Python 3.11, and create a dedicated venv.
  const basePy = await resolvePython();
  const venv = await run(basePy, ["-m", "venv", path.join(dir, ".venv")]);
  if (venv.code !== 0) {
    return res.status(500).json({
      ok: false,
      error: `venv creation failed using ${basePy} (is python3.11 installed?)`,
      detail: venv.stderr.slice(-2000),
    });
  }
  const py = venvPython(dir);

  // Upgrade pip tooling inside the venv (best-effort).
  await run(py, ["-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"]);

  // Install all Python deps from requirements.txt into the venv.
  const reqPath = path.join(dir, "requirements.txt");
  if (await fs.stat(reqPath).then(() => true).catch(() => false)) {
    const pip = await run(py, ["-m", "pip", "install", "-r", reqPath]);
    if (pip.code !== 0) {
      return res.status(500).json({
        ok: false,
        error: "pip install failed",
        detail: (pip.stderr || pip.stdout).slice(-2000),
      });
    }
  }

  // Match the bot's nixpacks setup: always pull the latest yt-dlp.
  await run(py, ["-m", "pip", "install", "-U", "yt-dlp"]);


  // Register with pm2 (stopped state). `start` will launch it via the venv python.
  const reg = await run("pm2", [
    "start", "main.py",
    "--name", procName(botId),
    "--interpreter", py,
    "--cwd", dir,
    "--no-autorestart",
  ]);
  if (reg.code !== 0) {
    return res.status(500).json({ ok: false, error: "pm2 register failed", detail: reg.stderr });
  }
  await run("pm2", ["stop", procName(botId)]);
  await run("pm2", ["save"]);

  res.json({ ok: true, botId, dir });
});

app.post("/start", async (req, res) => {
  const { botId } = req.body || {};
  if (!botId) return res.status(400).json({ ok: false, error: "botId required" });
  const dir = botDir(botId);
  // If the process doesn't exist yet (e.g. agent restarted with no save), register it.
  const info = await pmInfo(botId);
  if (!info) {
    const exists = await fs.stat(dir).then(() => true).catch(() => false);
    if (!exists) return res.status(404).json({ ok: false, error: "Bot not deployed" });
    const reg = await run("pm2", [
      "start", "main.py",
      "--name", procName(botId),
      "--interpreter", venvPython(dir),
      "--cwd", dir,
    ]);
    if (reg.code !== 0) return res.status(500).json({ ok: false, error: reg.stderr });
  } else {
    const r = await run("pm2", ["start", procName(botId)]);
    if (r.code !== 0) return res.status(500).json({ ok: false, error: r.stderr });
  }
  await run("pm2", ["save"]);

  // Verify it's actually running and didn't crash on launch.
  await new Promise((r) => setTimeout(r, 1500));
  const after = await pmInfo(botId);
  const status = after?.pm2_env?.status;
  if (status !== "online") {
    const out = await tail(after?.pm2_env?.pm_out_log_path, 40);
    const err = await tail(after?.pm2_env?.pm_err_log_path, 40);
    return res.status(500).json({
      ok: false,
      error: `Bot failed to start (status: ${status || "unknown"})`,
      detail: [out, err].filter(Boolean).join("\n").slice(-2000),
    });
  }
  res.json({ ok: true, status: "online" });
});

app.post("/stop", async (req, res) => {
  const { botId } = req.body || {};
  if (!botId) return res.status(400).json({ ok: false, error: "botId required" });
  const r = await run("pm2", ["stop", procName(botId)]);
  if (r.code !== 0) return res.status(500).json({ ok: false, error: r.stderr });
  res.json({ ok: true });
});

app.post("/restart", async (req, res) => {
  const { botId } = req.body || {};
  if (!botId) return res.status(400).json({ ok: false, error: "botId required" });
  const r = await run("pm2", ["restart", procName(botId)]);
  if (r.code !== 0) return res.status(500).json({ ok: false, error: r.stderr });
  res.json({ ok: true });
});

app.post("/delete", async (req, res) => {
  const { botId } = req.body || {};
  if (!botId) return res.status(400).json({ ok: false, error: "botId required" });
  await run("pm2", ["delete", procName(botId)]);
  await run("pm2", ["save"]);
  await fs.rm(botDir(botId), { recursive: true, force: true });
  res.json({ ok: true });
});

/** GET /stats?botId=... — current cpu/mem/uptime/status. */
app.get("/stats", async (req, res) => {
  const botId = String(req.query.botId || "");
  if (!botId) return res.status(400).json({ ok: false, error: "botId required" });
  const info = await pmInfo(botId);
  if (!info) return res.json({ ok: true, deployed: false, status: "Offline" });
  const memMB = (info.monit?.memory ?? 0) / 1024 / 1024;
  res.json({
    ok: true,
    deployed: true,
    status: info.pm2_env?.status === "online" ? "Online" : "Offline",
    cpu: info.monit?.cpu ?? 0,
    memoryMB: Math.round(memMB * 10) / 10,
    uptime: info.pm2_env?.pm_uptime ?? null,
    restarts: info.pm2_env?.restart_time ?? 0,
  });
});

/** GET /logs?botId=...&lines=200 — last N lines of stdout+stderr. */
app.get("/logs", async (req, res) => {
  const botId = String(req.query.botId || "");
  const lines = Math.min(Math.max(Number(req.query.lines || 200), 1), 2000);
  if (!botId) return res.status(400).json({ ok: false, error: "botId required" });
  const info = await pmInfo(botId);
  if (!info) return res.json({ ok: true, logs: "" });
  const out = await tail(info.pm2_env?.pm_out_log_path, lines);
  const err = await tail(info.pm2_env?.pm_err_log_path, lines);
  const merged = [out, err].filter(Boolean).join("\n");
  res.json({ ok: true, logs: merged });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SonicForge agent listening on :${PORT} (bots in ${BOTS_DIR})`);
});