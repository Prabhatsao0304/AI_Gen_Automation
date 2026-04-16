# Automation Framework — FMT OS & FMT Pro

Playwright + Cucumber BDD framework for automating **FMT OS** (web) and **FMT Pro** (PWA).

---

## Tech stack

| Layer | Tool |
|-------|------|
| Language | JavaScript (ES Modules) |
| Browser automation | Playwright |
| Test runner / BDD | Cucumber JS |
| Reports | Cucumber HTML + JSON formatters (via `@cucumber/cucumber`) |
| Environment | `dotenv` |
| Slack (optional) | Incoming webhook + `node-fetch` |
| IDE debugging (optional) | Use Playwright tracing/screenshots or browser devtools manually |

**Recommended:** Node.js **18 LTS** or **20 LTS**.

**Failure reports:** the Cucumber **HTML** report attaches an *Automation debug context* block (URL, self-heal summary).

---

## Getting started — full setup (new user)

Follow these steps in order on a clean machine. Commands assume a terminal (Terminal.app, iTerm, VS Code integrated terminal, etc.).

### Step 1 — Install prerequisites

1. **Git** — [Install Git](https://git-scm.com/downloads) if you do not already have it.
2. **Node.js + npm** — Install from [nodejs.org](https://nodejs.org/) (LTS). After install, verify:

   ```bash
   node -v
   npm -v
   ```

3. **Google Chrome (stable)** — Required for the current login flow. The framework launches **system Chrome** (not only Playwright’s bundled browser) so **Google SSO** works reliably.

4. **Operating system** — The default Chrome path in code is **macOS**. If you are on Windows or Linux, you must change `executablePath` in `src/hooks/world.js` to your Chrome / Chromium binary (see [Troubleshooting](#troubleshooting)).

### Step 2 — Get the repository on your machine

**Option A — Clone with Git**

```bash
cd ~/Desktop
git clone <YOUR_REPO_URL> AI_Gen_Automation
cd AI_Gen_Automation/automation-framework
```

**Option B — You already have the folder**

If the project is already on disk (for example after a zip download), go to the framework folder. Example path on macOS:

```bash
cd /Users/<YOUR_USERNAME>/Desktop/AI_Gen_Automation/automation-framework
```

Replace `<YOUR_USERNAME>` with your macOS account name. You can drag the `automation-framework` folder into the terminal to paste the full path after `cd `.

Confirm you are in the right place:

```bash
pwd
ls package.json
```

You should see `package.json` in the listing.

### Step 3 — Install Node dependencies

From the `automation-framework` directory:

```bash
npm install
```

This installs Playwright, Cucumber, dotenv, and the rest of the dependencies listed in `package.json`.

### Step 4 — Install Playwright browsers (recommended)

Even though login uses **Google Chrome** from Applications, installing Playwright’s browser binaries avoids surprises and matches Playwright’s supported versions:

```bash
npx playwright install chromium
```

If the download is blocked on your network, run the same command on a network that allows access to Playwright’s CDN, or ask your IT team to allow it.

### Step 5 — Create your local environment file

Create a local `.env` file in `automation-framework/`, then set at least:

| Variable | Required | Description |
|----------|----------|-------------|
| `FMT_OS_URL` | Yes | Base URL of FMT OS (no `/login` suffix). Example: `https://your-env.preview.farmartos.com` |
| `FMT_PRO_URL` | Yes | Base URL of FMT Pro |
| `USERNAME` | Yes | Google account email used for SSO |
| `PASSWORD` | Yes | Account password |
| `SLACK_WEBHOOK_URL` | Yes for default scripts | Slack incoming webhook; after each run the reporter posts results. Without it, `npm run test:*` may still run tests but the Slack step will fail. |
| `SLACK_BOT_TOKEN` | Optional | Slack bot token used when you want the reporter to post via Slack Web API and upload focused design-mismatch screenshots into the same thread. |
| `SLACK_CHANNEL_ID` | Optional | Channel ID used together with `SLACK_BOT_TOKEN` for threaded screenshot uploads. |
| `HEADLESS` | No | `true` / `false` — Google SSO is easiest with `false` |
| `BROWSER` | No | `chromium` (default), `firefox`, or `webkit` — launch still uses `executablePath` to Chrome on macOS as configured in `world.js` |

Do **not** commit `.env`; it stays local (see `.gitignore`).

### Step 6 — Run the tests

From `automation-framework`:

```bash
npm run test:fmt-os
```

What this does:

1. Starts **one** browser session and logs in **once** (Google SSO) before all scenarios.
2. Runs all FMT OS Cucumber scenarios.
3. Uses the **full locator stack** for every step: ordered strategies → self-heal fallbacks → optional page `retryRecovery` where coded → **CDP / accessibility recovery** (on by default; set `RUNTIME_CDP_RECOVERY=false` in `.env` only if you need to disable it). Selector cache + JSON/Markdown reports run unless turned off with `SELECTOR_*` env vars.
4. Writes reports under `reports/` (HTML + JSON).
5. Sends a summary to Slack using `SLACK_WEBHOOK_URL`.
6. If `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` are also set, the reporter uploads the focused design-mismatch screenshots into the same Slack thread.

Other useful commands:

| Command | What it runs |
|---------|----------------|
| `npm run test:fmt-os` | All FMT OS tests (full self-heal + CDP recovery by default) + Slack report |
| `npm run test:fmt-os:smoke` | FMT OS smoke profile + Slack |
| `npm run test:fmt-pro` | FMT Pro + Slack |
| `npm run test:smoke` | Smoke across products + Slack |
| `npm run test:regression` | Full suite + Slack |
| `npm run test:wip` | Only `@wip` tags (no Slack in script) |
| `npm run clean:reports` | Deletes generated HTML/JSON/JSONL under `reports/` |

Open the HTML report after a run (macOS):

```bash
npm run report:fmt-os
```

On Linux you can open the file manually, for example:

```bash
xdg-open reports/fmt-os-report.html
```

On Windows, open `reports\fmt-os-report.html` in a browser from Explorer.

### Cucumber: one config, many products

All suites use **`src/config/cucumber.config.cjs`**. Products are listed in the **`PRODUCTS`** array (folder name under `src/products/<id>/`). Each product expects `features/**/*.feature` and `step-definitions/**/*.js`.

**Profiles:** `fmt-os`, `fmt-os-smoke`, `fmt-pro`, `fmt-pro-smoke`, `all` (full regression), `all-smoke`, `wip`. Omitting `--profile` runs the same as **`all`** (default).

**Add a new product:** (1) Add `{ id: 'your-product-id' }` to `PRODUCTS`, (2) create `src/products/your-product-id/features/` and `step-definitions/`, (3) add `npm` scripts that call `cucumber-js --config src/config/cucumber.config.cjs --profile your-product-id` and point Slack at the matching `reports/<slug>-report.json` name.

---

## Project structure

```
automation-framework/
│
├── rulesets/                        # PM requirement → ruleset (design / flow / logic)
│   └── fmt-os/
│       ├── purchase-order.md
│       └── (md only)
│
├── src/
│   ├── config/
│   │   ├── env.config.js            # Loads .env, exports config
│   │   └── cucumber.config.cjs      # Cucumber: products, profiles, reports
│   │
│   ├── hooks/
│   │   ├── world.js                 # Shared browser + Google SSO login
│   │   └── before-after.hooks.js    # BeforeAll login once, AfterAll teardown
│   │
│   ├── shared/
│   │   ├── pages/
│   │   │   └── base.page.js
│   │   └── scripts/
│   │       └── slack-reporter.js    # JSON report → Slack
│   │
│   └── products/
│       ├── fmt-os/
│       │   ├── features/
│       │   ├── step-definitions/
│       │   └── pages/
│       └── fmt-pro/
│           ├── features/
│           ├── step-definitions/
│           └── pages/
│
├── reports/                         # Generated (gitignored)
├── .env                             # Local only (gitignored)
└── package.json
```

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `Missing SLACK_WEBHOOK_URL in .env` | Add a valid `SLACK_WEBHOOK_URL` to `.env`, or temporarily point it to a test webhook. The npm scripts always invoke the reporter after Cucumber. |
| Slack report shows design findings but no screenshots | Add `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` to `.env`. Webhook-only Slack setup can post the report, but focused design-mismatch screenshots are uploaded only through the Slack Web API bot flow. |
| `Missing required environment variable` | Ensure `FMT_OS_URL`, `FMT_PRO_URL`, `USERNAME`, and `PASSWORD` are set in `.env`. |
| Browser does not start / wrong Chrome | On macOS the code expects Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. On Windows/Linux, set `executablePath` in `src/hooks/world.js` to your Chrome path. |
| Google login times out | Use `HEADLESS=false`, run on a stable network, and complete any account prompts manually once if your org requires 2FA (automation may need an app-specific flow for 2FA). |
| Playwright install fails | Run `npx playwright install chromium` with network access allowed; use a VPN or corporate proxy as required. |

---

## Adding a new feature

When a PM requirement arrives:

1. **Ruleset (MD only)** — Add `rulesets/<product>/<feature>.md`.
2. **Feature file** — `src/products/<product>/features/<feature>.feature`
3. **Page object** — `src/products/<product>/pages/<feature>.page.js` (keep selectors grouped).
4. **Steps** — `src/products/<product>/step-definitions/<feature>.steps.js`

Tag scenarios with product and priority, for example:

```gherkin
@fmt-os @smoke
Scenario: Short description
  Given ...
  When ...
  Then ...
```

---

## Tagging strategy

| Tag | Meaning |
|-----|---------|
| `@fmt-os` | FMT OS |
| `@fmt-pro` | FMT Pro |
| `@smoke` | Fast critical path |
| `@regression` | Full regression |
| `@wip` | Work in progress |
