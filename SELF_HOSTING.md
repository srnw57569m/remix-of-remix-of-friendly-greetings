# Self-Hosting SonicForge

This guide explains how to run SonicForge on any host (Vercel, Netlify,
Cloudflare Workers, Railway, Fly.io, a plain VPS with Node, etc).

## 1. What you need

- **Node 20+** and **bun** (or npm/pnpm) for building.
- A **Supabase project** (free tier works) — provides the database, auth
  and storage.
- A **VPS / server** running the `vps-agent/` Node service — this is what
  actually spawns the Highrise bot processes. The web app cannot run bots
  by itself; it only orchestrates the agent over HTTPS.
- A **domain** (recommended) so OAuth redirects and webhooks have stable
  URLs.

## 2. Create your Supabase project

1. Sign up at https://supabase.com and create a new project.
2. From **Project Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` / `publishable` key → `SUPABASE_PUBLISHABLE_KEY` /
     `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
3. Apply migrations:
   ```bash
   bunx supabase link --project-ref YOUR-PROJECT-REF
   bunx supabase db push
   ```
   This creates every table, RLS policy, function and trigger under
   `supabase/migrations/`.
4. Create two **storage buckets** (Storage tab):
   - `bot-templates` (private)
   - `user-bots` (private)
5. Under **Authentication → Providers**, enable **Email** and
   **Google** (add your Google OAuth client ID + secret).
6. Under **Authentication → URL Configuration**, set the Site URL and
   Redirect URLs to your domain (e.g. `https://yourdomain.com`).

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in every value. See the comments
in `.env.example` for what each one does.

On hosted platforms (Vercel/Netlify/Railway/etc) add the same variables
in their dashboard instead of committing a `.env` file. **Never commit
the `service_role` key.**

## 4. Deploy the VPS agent

The agent lives in `vps-agent/`. On any Linux VPS:

```bash
cd vps-agent
bash install.sh
```

Set its environment so it can talk back to Supabase and verify requests:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — same values as the web app
- `AGENT_SECRET` — must match `VPS_AGENT_SECRET` in the web app's `.env`

Expose the agent over HTTPS (Caddy / Nginx / Cloudflare Tunnel) and put
that public URL into `VPS_AGENT_URL`.

## 5. Build and run the web app

```bash
bun install
bun run build
bun run start
```

This serves the SSR app on `PORT` (default 3000). Put it behind your
reverse proxy or platform of choice.

### Platform notes

- **Vercel / Netlify**: import the repo, set the env vars in the
  dashboard, framework preset = "Vite". The build command is the
  default; no special config needed.
- **Cloudflare Workers**: works out of the box (TanStack Start ships an
  edge-compatible build). Set the env vars under
  **Workers → Settings → Variables**. Remember `nodejs_compat` is
  required (already enabled in the template).
- **Railway / Fly.io / VPS**: run `bun run start` as a long-lived
  process behind Nginx/Caddy.

## 6. Set up the cron job

The endpoint `POST /api/public/cron/expire-bots` flips expired bot
subscriptions and stops them. Hit it once a minute with the
`x-agent-secret: $VPS_AGENT_SECRET` header. Easiest options:

- pg_cron inside Supabase (recommended)
- A cron job on your VPS (`curl` with the secret header)
- A scheduled Cloudflare Worker / Vercel Cron

## 7. Verify

After deploy, test:

1. Sign up / sign in on `/auth`.
2. Create a bot via the wizard.
3. From inside Highrise, tip the connector bot → balance should credit
   via `POST /api/public/bank/deposit`.
4. Enter a connect PIN → profile should link.

If something fails, check:

- Web app logs for `SUPABASE_*` env errors.
- Agent logs for `AGENT_SECRET` mismatch (401).
- Supabase **Auth → Logs** for OAuth/redirect URL issues.

## 8. What you do NOT need

- No Lovable account is required to run the deployed site.
- `LOVABLE_API_KEY` is only needed if you keep the Lovable AI Gateway
  features. Without it, AI-powered calls will fail — but the core
  bot/wallet/subscription flow keeps working.
