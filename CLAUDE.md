# eva-work — Eva Journal prototype

A clickable product prototype (the "Eva Journal" / Kassekladde experience) built with
**Vite + React + `@economic/taco`**. It is deployed to GitHub Pages and shared with
customers for feedback.

- **Live site:** https://rasmus-weber.github.io/eva-work/
- **Repo:** https://github.com/rasmus-weber/eva-work (public)
- **App source:** `prototypes/eva-journal-prototype/`

## Directory layout

```
eva-work/
├─ .github/workflows/deploy.yml      # builds + deploys to GitHub Pages on push to main
└─ prototypes/eva-journal-prototype/
   ├─ src/                            # ← edit here
   │  ├─ App.jsx                      # main app
   │  ├─ components/                  # TopNav, Sidebar, SideNav, LogTab, eva/…
   │  ├─ data.js                      # mock data shown in the UI
   │  ├─ App.css / eva.css            # styles
   │  └─ main.jsx
   ├─ public/                         # static assets
   ├─ vite.config.js                  # base = /eva-work/ in production only
   └─ package.json
```

## Run locally

```bash
cd prototypes/eva-journal-prototype
npm install          # first time only
npm run dev          # serves http://localhost:5182/
```

(If using Claude Code's preview tooling, the `eva-journal` launch config starts this.)

## Make a change and ship it

1. Edit files under `prototypes/eva-journal-prototype/src/`.
2. Verify locally — dev server hot-reloads on save (`http://localhost:5182/`).
3. Commit and push to `main`:
   ```bash
   cd /Users/rasmusweber/Documents/Claude/eva-work
   git add -A
   git commit -m "describe the change"
   git push
   ```
4. The **Deploy eva-journal to GitHub Pages** GitHub Action runs automatically
   (~1–2 min) and publishes to the live site. Watch it under the repo's **Actions** tab.
5. Confirm at https://rasmus-weber.github.io/eva-work/ (hard-refresh / cache-bust if needed).

## Gotchas (already handled — don't undo)

- **`base: '/eva-work/'`** in `vite.config.js` applies to **production builds only**; dev
  stays at `/`. If the repo is ever renamed, update this base to match the new repo name.
- **CI uses `npm install`, not `npm ci`** — the inherited lockfile has minor drift that
  older npm versions reject under `ci`.
- The **site is fully public** (no access control). Don't put anything confidential in it.
- Pushing changes to files under `.github/workflows/` requires the GitHub token to have
  the **`workflow`** scope.
- `@economic/taco` installs from the public npm registry — **no auth token needed** in CI
  or locally.
