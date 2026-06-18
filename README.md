# BeatlY — Premium Sound. Power Servers.

A full-stack bot hosting and management platform for Highrise music bots. Users create, configure and control radio bots through a modern dashboard, with real-time start/stop/restart, live logs, CPU/RAM stats, and a wallet system powered by in-game gold tipping.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + Vite 7 + SSR) |
| Styling | Tailwind CSS v4 + shadcn/ui components |
| Database / Auth / Storage | Supabase (PostgreSQL + Auth + Storage) |
| Bot Runtime | Custom Node.js VPS Agent (`vps-agent/`) |
| Package Manager | Bun (npm/pnpm also work) |
| Node Version | 20+ |

---

## What You Need

1. **Node 20+** and **Bun** installed locally.
2. A **Supabase project** (free tier works) for the database, auth and storage.
3. A **VPS / server** running the `vps-agent/` Node service — this is what actually spawns the Highrise bot processes. The web app orchestrates the agent over HTTPS; it cannot run bots by itself.
4. A **domain** (recommended) so OAuth redirects and webhook URLs are stable.

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd <repo-folder>
bun install
```

---

## 2. Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Open **Project Settings → API** and copy:
   - `Project URL` → used for `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` / `publishable` key → used for `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → used for `SUPABASE_SERVICE_ROLE_KEY` (**keep this secret**)
3. Apply the database migrations:
   ```bash
   bunx supabase link --project-ref YOUR-PROJECT-REF
   bunx supabase db push
   ```
   This creates all tables, Row-Level Security (RLS) policies, functions and triggers from the files in `supabase/migrations/`.
4. Create two **Storage buckets** (Storage tab → New bucket):
   - `bot-templates` — private
   - `user-bots` — private
5. Enable auth providers:
   - **Authentication → Providers → Email** — enable Email auth.
   - **Authentication → Providers → Google** — add your Google OAuth client ID and secret.
6. Set redirect URLs:
   - **Authentication → URL Configuration**
   - Site URL: `https://yourdomain.com`
   - Redirect URLs: `https://yourdomain.com/auth/callback` and `https://yourdomain.com/profile`

---

## 3. Configure Environment Variables

Copy the example file and fill in your real values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (public, ships to browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key (public) |
| `VITE_SUPABASE_PROJECT_ID` | Yes | Supabase project reference ID |
| `SUPABASE_URL` | Yes | Same as above (server-side) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Same as above (server-side) |
| `SUPABASE_PROJECT_ID` | Yes | Same as above (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (**server only, never expose**) |
| `VPS_AGENT_URL` | Yes | Public HTTPS URL of your VPS agent |
| `VPS_AGENT_SECRET` | Yes | Shared secret between web app and VPS agent |
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | No | Port the SSR server listens on (default `3000`) |

**On hosted platforms** (Vercel, Netlify, Railway, etc.) add these variables in their dashboard — **never commit a real `.env` file to git.**

---

## 4. Deploy the VPS Agent

The agent lives in the `vps-agent/` folder. It is a small Node service that runs your bots as `pm2` processes.

### One-line install on an Ubuntu VPS

```bash
# Generate a long random shared secret (save it — you need it in step 3)
openssl rand -hex 32

# Copy the vps-agent folder to your server, then:
cd /root/vps-agent
AGENT_SECRET="paste-your-secret-here" \
BOT_REPO_URL="https://github.com/srnw57569m/mu.git" \
bash install.sh
```

At the end it prints `http://<your-ip>:8787` — that is the agent URL.

### Environment variables on the VPS

Create a systemd override or `.env` file on the VPS with:

```
SUPABASE_URL=<same as web app>
SUPABASE_SERVICE_ROLE_KEY=<same as web app>
AGENT_SECRET=<same as VPS_AGENT_SECRET in web app>
```

### Expose the agent over HTTPS

- **Option A (recommended):** Point a subdomain (`agent.yourdomain.com`) at your VPS IP with **DNS only** (grey cloud in Cloudflare). Install **Caddy** on the VPS and reverse-proxy port `8787` to HTTPS on port 443. Caddy auto-manages Let's Encrypt certificates.
- **Option B (quick test):** Use the raw IP and port `http://<vps-ip>:8787`. Make sure port `8787` is open in your firewall (`ufw allow 8787/tcp`).

> **Important:** If your VPS IP is behind Cloudflare's orange cloud (proxied), the agent must run on a Cloudflare-supported HTTPS port: `443`, `2053`, `2083`, `2087`, `2096`, or `8443`. Port `8787` is **not** forwarded by Cloudflare's proxy.

Set the final public URL as `VPS_AGENT_URL` in your web app environment.

---

## 5. Run Locally

```bash
bun run dev
```

The dev server starts on `http://localhost:3000` (or whatever port the Vite dev plugin chooses).

---

## 6. Build for Production

```bash
bun install
bun run build
```

This produces a production SSR bundle. To preview it locally:

```bash
bun run preview
```

---

## 7. Deploy to Hosting

### Vercel

1. Import your repository on [vercel.com](https://vercel.com).
2. Framework preset: **Vite**.
3. Add all environment variables from Step 3 in the project dashboard.
4. Build command is auto-detected; leave it as `vite build`.
5. Deploy.

### Netlify

1. Import your repository on [netlify.com](https://netlify.com).
2. Build command: `bun run build`
3. Publish directory: `dist`
4. Add environment variables in **Site settings → Environment variables**.
5. Deploy.

### Railway / Fly.io / Render

1. Connect your repository.
2. Set the start command to `bun run start` (or `node dist/server/index.mjs` depending on the platform).
3. Add all environment variables.
4. Deploy.

### Plain VPS (Node + Nginx/Caddy)

```bash
bun install
bun run build
bun run start
```

The SSR server listens on `PORT` (default `3000`). Put **Nginx** or **Caddy** in front of it to terminate TLS and reverse-proxy to `localhost:3000`.

### Cloudflare Workers

TanStack Start ships an edge-compatible build. Set the env vars under **Workers → Settings → Variables**. `nodejs_compat` is already enabled in the template, so it works out of the box.

---

## 8. Set Up the Cron Job

The endpoint `POST /api/public/cron/expire-bots` flips expired bot subscriptions and stops them. It must be called once per minute with the header:

```
x-agent-secret: <your-VPS_AGENT_SECRET>
```

### Options

- **pg_cron inside Supabase** (recommended — stays inside your database project).
- **Cron on your VPS:**
  ```bash
  # crontab -e
  * * * * * curl -X POST -H "x-agent-secret: YOUR_SECRET" https://yourdomain.com/api/public/cron/expire-bots
  ```
- **Vercel Cron Jobs** or a scheduled Cloudflare Worker.

---

## 9. Verify Everything

After deploying, test in this order:

1. **Sign up / log in** on `/auth`.
2. **Create a bot** via the wizard dashboard.
3. **Tip the connector bot from inside Highrise** → your wallet balance should credit via `POST /api/public/bank/deposit`.
4. **Enter a connect PIN** on your profile page → your Highrise account should link.
5. **Start / stop / restart** the bot from the dashboard → the VPS agent should respond with real `pm2` status.
6. **Check live logs and stats** → CPU/RAM numbers should appear.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| App fails to start with Supabase errors | Missing `VITE_SUPABASE_URL` or `VITE_SUPABASE_PUBLISHABLE_KEY` | Double-check env vars in the hosting dashboard |
| Build fails with `Failed to resolve import` | Strict TypeScript — file or package missing | Install the missing package (`bun add <pkg>`) or create the missing file |
| Bot start/stop does nothing | VPS agent unreachable or misconfigured | Check `VPS_AGENT_URL` and `VPS_AGENT_SECRET`. Verify agent is running: `systemctl status sonicforge-agent` |
| Agent returns 403 / 1003 | Cloudflare proxy blocking non-standard port | Use a subdomain with DNS-only, or move agent to port `443` |
| OAuth redirect fails | Redirect URL mismatch in Supabase | Add your domain to **Authentication → URL Configuration** |
| Wallet not crediting | Bank deposit endpoint failing | Check that `VPS_AGENT_SECRET` matches on both web app and agent |

---

## Project Structure

```
├── src/
│   ├── components/          # React components (wizard, dashboard, UI)
│   ├── routes/              # TanStack Start file-based routes
│   │   ├── api/public/    # Public API endpoints (webhooks, cron, bank)
│   │   ├── _authenticated/# Protected routes (dashboard, profile, admin)
│   │   └── __root.tsx     # Root layout (Navbar, Footer)
│   ├── lib/               # Server functions, helpers, schemas
│   ├── integrations/      # Supabase client, auth middleware, types
│   └── styles.css         # Tailwind v4 global styles + design tokens
├── supabase/
│   └── migrations/        # Database schema, RLS policies, functions
├── vps-agent/             # Node service that runs bots on the VPS
│   ├── install.sh         # One-line Ubuntu installer
│   └── index.js           # Agent HTTP server
├── .env.example           # Template for all environment variables
├── vite.config.ts         # Vite + TanStack Start config
└── package.json           # Dependencies + scripts
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the Vite dev server with HMR |
| `bun run build` | Production SSR build |
| `bun run build:dev` | Development mode build |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bun run format` | Run Prettier |

---

## License

This project is private and proprietary. All rights reserved.

---

© 2026 BeatlY — Premium sound. Power servers.
