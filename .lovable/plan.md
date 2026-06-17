## Plan

1. **Restore working files** — the current branch is empty, but commit `241253e` (origin/main) contains your full SonicForge project. Restore all tracked files from that commit into the working tree, with no content changes.

2. **Update `VPS_AGENT_URL` and `VPS_AGENT_SECRET`** — these are runtime secrets used by `src/lib/vps-agent.server.ts`. Trigger the secrets update form so you can enter the new values securely. No code changes will be made.

That's it — nothing else will be touched.