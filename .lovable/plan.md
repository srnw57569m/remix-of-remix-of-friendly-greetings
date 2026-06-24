
## Goal

Add a second bot type — **Moderation Bot** — that lives side-by-side with the existing Music Bot. Same lifecycle (create → rent → suspend/expire → renew), but with its own simpler config (`token`, `room`, `owner`, `welcome_message`, `bye_message`, `admins`) and its own pricing.

## 1. Database (single migration — needs approval)

Add a bot-type discriminator and moderation-specific fields:

- `bots.bot_type` text NOT NULL DEFAULT `'music'`, CHECK in `('music','moderation')`.
- `bots.welcome_messages` jsonb NOT NULL DEFAULT `'[]'` — string array.
- `bots.bye_messages` jsonb NOT NULL DEFAULT `'[]'` — string array.
- Make music-only columns nullable for moderation rows: `icecast_server`, `icecast_port`, `mount_point`, `icecast_username`, `icecast_password`.
- `plan_prices.bot_type` text NOT NULL DEFAULT `'music'`, CHECK in `('music','moderation')`. Repoint PK to `(bot_type, duration)`. Seed moderation rows mirroring the current music plan list at the same prices (you can edit them in /admin/plans afterwards).
- Update `protect_bot_sensitive_columns` trigger to also guard `bot_type`.

Admin Plans page will gain a tab/segmented control to switch between Music and Moderation pricing.

## 2. Moderation bot template upload

The template at `https://github.com/srnw57569m/mojs.git` will be uploaded into the `bot-templates` bucket under a `moderation/` prefix (`config.json`, `bot_pos.json`, `index.js`, `package.json`, `musicbot.txt`, `package-lock.json`, `starttest.bat`). Existing music files stay at the bucket root (back-compat). Done once via a server-side bootstrap; no user action needed.

## 3. Create page — type picker

`/dashboard/create` shows two cards:

```text
┌──────────────┐  ┌──────────────┐
│ Music Bot    │  │ Moderation   │
│  (existing)  │  │     Bot      │
└──────────────┘  └──────────────┘
```

Clicking opens the matching wizard.

## 4. Moderation wizard (`CreateModerationBotWizard`)

Steps:
1. **Basics** — Token, Room ID
2. **Owner** — Owner username
3. **Messages** — Welcome messages (add/remove list), Bye messages (add/remove list)
4. **Terms** — agreement
5. **Plan** — same plan picker, filtered to `bot_type='moderation'`
6. **Review** — summary + Create

`config.json` written exactly as you specified:
```json
{ "token": "...", "room": "...", "owner": "...",
  "welcome_message": ["..."], "bye_message": ["..."], "admins": [] }
```
`bot_pos.json` initialized from the template with `admins: []`.

## 5. Moderation dashboard (`/dashboard/bot/$botId` reused)

Route detects `bot.bot_type` and renders:

- **Header / Start-Stop-Restart / Suspension banners / Plans / Activity / Delete** — shared with music.
- **Owner card** — editable when not locked.
- **Welcome & Bye Messages card** — list editor (add / remove rows), saves to DB + `config.json`.
- **Admins card** — same as music; writes both `config.json` `admins` and `bot_pos.json` `admins`.
- **Bot Commands card** — static list (placeholder commands you can edit later, e.g. `!kick`, `!mute`, `!warn`, `!welcome on/off`, `!byemsg add <text>`).
- Stream/Icecast card is **hidden** for moderation bots.

Editing is blocked in the same conditions as music (admin-suspended or rent expired).

## 6. Server functions

- New `createModerationBot` server fn (separate Zod schema with `welcomeMessages: string[]`, `byeMessages: string[]`).
- `updateBotConfig` extended with optional `welcomeMessages`, `byeMessages` (writes DB + patches moderation `config.json` keys `welcome_message`/`bye_message`).
- `addBotAdmin`/`removeBotAdmin` already work; the storage patcher will detect `bot_type` and write the correct config shape (music keeps `bot.admins`, moderation uses top-level `admins` + `bot_pos.json`).
- `listPlans` accepts `botType` filter; wizard + PlansCard pass it. Existing `purchaseBotPlan` keys plans by `(bot_type, duration)`.
- VPS-agent `buildBotConfig` branches on `bot_type` to emit the right JSON.

## 7. Files touched

**New**
- `src/lib/moderation-bot-template.ts` (config builders)
- `src/lib/moderation-wizard-schema.ts`
- `src/components/wizard/CreateModerationBotWizard.tsx`
- `src/components/wizard/steps/ModStep1Basic.tsx`
- `src/components/wizard/steps/ModStep2Owner.tsx`
- `src/components/wizard/steps/ModStep3Messages.tsx`
- `src/components/wizard/steps/ModStepSummary.tsx`
- `src/components/dashboard/MessagesCard.tsx`
- `src/components/dashboard/CommandsCard.tsx`
- `supabase/migrations/<ts>_moderation_bot.sql`

**Edited**
- `src/routes/_authenticated/dashboard.create.tsx` — type picker
- `src/routes/_authenticated/dashboard.bot.$botId.tsx` — conditional render by `bot_type`
- `src/routes/_authenticated/admin.plans.tsx` — bot-type tab
- `src/lib/bots.functions.ts` — new createModerationBot, updateBotConfig accepts messages, storage patcher branch
- `src/lib/wallet.functions.ts` — `listPlans({ botType })`, `purchaseBotPlan` keyed by `(bot_type, duration)`
- `src/lib/vps-agent.server.ts` — `buildBotConfig` branch
- `src/lib/admin.functions.ts` — admin plan CRUD with `bot_type`
- `src/integrations/supabase/types.ts` — regenerated after migration
- `src/components/dashboard/BotCard.tsx` — small "Moderation"/"Music" badge

## 8. Order of execution

1. Submit migration (you approve).
2. After approval: upload moderation template files into the `bot-templates/moderation/` prefix.
3. Implement code changes (above).
4. I'll list every file edited at the end so you can copy them into your main project.

## What I need from you

Just approve the migration when prompted — everything else proceeds automatically. The seeded moderation plan prices will match the music ones; tweak in **/admin/plans → Moderation** tab afterward.
