# quest_log desktop: notes for Claude Code

Read [ARCHITECTURE.md](ARCHITECTURE.md) (layers, storage, deploy) and [DESIGN.md](DESIGN.md) (tokens, layout) first.

## Rules
- **The phone app is off limits.** Don't edit anything in `~/projects/quest_log`, and don't run its scripts (`release-android.sh`, `deploy-web.sh`). Read it only for reference. The user lifts this when they want phone work.
- **Comments are required.** Every file gets a header comment (purpose and layer). Every exported function, component, hook and store action gets a doc comment (what it does, inputs and outputs, side effects). Non-obvious logic and each shell-script step get a short *why* comment.
- **TypeScript** is `strict` with no `any`. ESLint includes the React Compiler rules. Keep to them:
  - no `setState` in effects (use the previous-props pattern);
  - no refs or impure calls (`Date.now`) during render.
- **No network code and no analytics.** The app is static files; tasks stay in the browser.
- **Imports go downward:** `app` → `store` → `lib`. `lib` stays pure (no React, no browser APIs).
- **Saved data is real.** A schema change needs a migration (`store/migrations`) and a fixture test. The backup format must stay readable by the phone app (`areas` is optional for that reason).
- **New dependencies** need a one-line justification in the commit message.
- **Servers:** start `serve` directly (not `npx serve`), on 127.0.0.1 only. Stop it by PID, and check with `ss -ltnp`. The e2e scripts already do this.

## Commands
```bash
npm run check                      # typecheck + lint + Vitest (must pass before every commit)
npm run build && npm run e2e       # full Playwright walk (every path), screenshots in e2e/screenshots/
QUESTLOG_BASE=/quest_log_desktop/ npm run build && npm run e2e:pages   # the Pages build at its sub-path
npm run build && npm run e2e:motion   # frame and layout cost of each animation (4× CPU slowdown); compare before/after
npm run deploy                     # all of the above, then publish to GitHub Pages (public: ask first)
```

## Releasing
1. Bump `version` in `package.json`.
2. Add a `## x.y.z (build N)` section at the top of `CHANGELOG.md`, with N one more than before.
3. Commit.
4. `npm run deploy`.

Publishing is public, so confirm with the user before each deploy.
