# Automation Framework — FMT OS & FMT Pro

Playwright + Cucumber BDD framework for automating **FMT OS** (web) and **FMT Pro** (PWA).

---

## Tech stack

| Layer | Tool |
|-------|------|
| Language | JavaScript (ES Modules) |
| Browser automation | Playwright |
| Test runner / BDD | Cucumber JS |
| Reports | `@cucumber/html-formatter` |
| Environment | `dotenv` |
| Slack (optional) | Incoming webhook + `node-fetch` |

**Recommended:** Node.js **18 LTS** or **20 LTS** (anything that supports native `fetch` / ESM is fine).

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

```bash
cp .env.example .env
```

Then open `.env` in your editor and set at least:

| Variable | Required | Description |
|----------|----------|-------------|
| `FMT_OS_URL` | Yes | Base URL of FMT OS (no `/login` suffix). Example: `https://your-env.preview.farmartos.com` |
| `FMT_PRO_URL` | Yes | Base URL of FMT Pro |
| `USERNAME` | Yes | Google account email used for SSO |
| `PASSWORD` | Yes | Account password |
| `SLACK_WEBHOOK_URL` | Yes for default scripts | Slack incoming webhook; after each run the reporter posts results. Without it, `npm run test:*` may still run tests but the Slack step will fail. |
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
3. Writes reports under `reports/` (HTML + JSON).
4. Sends a summary to Slack using `SLACK_WEBHOOK_URL`.

Other useful commands:

| Command | What it runs |
|---------|----------------|
| `npm run test:fmt-os` | All FMT OS tests + Slack report |
| `npm run test:fmt-os:smoke` | FMT OS smoke profile + Slack |
| `npm run test:fmt-pro` | FMT Pro + Slack |
| `npm run test:smoke` | Smoke across products + Slack |
| `npm run test:regression` | Full suite + Slack |
| `npm run test:wip` | Only `@wip` tags (no Slack in script) |
| `npm run clean:reports` | Deletes generated HTML/JSON under `reports/` and files under `screenshots/` |

Open the HTML report after a run (macOS):

```bash
npm run report:fmt-os
```

On Linux you can open the file manually, for example:

```bash
xdg-open reports/fmt-os-report.html
```

On Windows, open `reports\fmt-os-report.html` in a browser from Explorer.

---

## Project structure

```
automation-framework/
│
├── rulesets/                        # PM requirement → ruleset (design / flow / logic)
│   └── fmt-os/
│       ├── purchase-order.md
│       ├── purchase-order.json
│       ├── purchase-order-search.md
│       └── purchase-order-search.json
│
├── templates/                       # Copy-ready templates for new ruleset-driven features
│   └── new-feature/
│       ├── README.md
│       ├── feature.template.feature
│       ├── page.template.js
│       ├── ruleset.template.json
│       ├── ruleset.template.md
│       └── steps.template.js
│
├── src/
│   ├── config/
│   │   ├── env.config.js            # Loads .env, exports config
│   │   ├── cucumber.fmt-os.config.cjs
│   │   ├── cucumber.fmt-pro.config.cjs
│   │   └── cucumber.all.config.cjs
│   │
│   ├── hooks/
│   │   ├── world.js                 # Shared browser + Google SSO login
│   │   └── before-after.hooks.js    # BeforeAll login once, screenshots on failure
│   │
│   ├── shared/
│   │   ├── pages/
│   │   │   └── base.page.js
│   │   ├── scripts/
│   │   │   └── slack-reporter.js    # JSON report → Slack
│   │   └── utils/
│   │       ├── wait.utils.js
│   │       ├── string.utils.js
│   │       └── date.utils.js
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
├── screenshots/                     # Failure screenshots (gitignored)
├── .env                             # Local only (gitignored)
├── .env.example
└── package.json
```

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `Missing SLACK_WEBHOOK_URL in .env` | Add a valid `SLACK_WEBHOOK_URL` to `.env`, or temporarily point it to a test webhook. The npm scripts always invoke the reporter after Cucumber. |
| `Missing required environment variable` | Ensure `FMT_OS_URL`, `FMT_PRO_URL`, `USERNAME`, and `PASSWORD` are set in `.env`. |
| Browser does not start / wrong Chrome | On macOS the code expects Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. On Windows/Linux, set `executablePath` in `src/hooks/world.js` to your Chrome path. |
| Google login times out | Use `HEADLESS=false`, run on a stable network, and complete any account prompts manually once if your org requires 2FA (automation may need an app-specific flow for 2FA). |
| Playwright install fails | Run `npx playwright install chromium` with network access allowed; use a VPN or corporate proxy as required. |

---

## Adding a new feature

When a PM requirement arrives:

1. **Start from the requirement** and choose one kebab-case feature slug.
2. **Write the ruleset first** at `rulesets/<product>/<feature-slug>.md` and `rulesets/<product>/<feature-slug>.json`.
3. **Create the automation only after the ruleset is ready** using the same feature slug:
   `src/products/<product>/features/<feature-slug>.feature`
   `src/products/<product>/pages/<feature-slug>.page.js`
   `src/products/<product>/step-definitions/<feature-slug>.steps.js`
4. **Keep naming identical across all files** so requirement, automation, and reports are easy to trace.
5. **Use the starter files in `templates/new-feature/`** to keep structure and wording consistent.

Example:

```text
rulesets/fmt-os/purchase-order-search.md
rulesets/fmt-os/purchase-order-search.json
src/products/fmt-os/features/purchase-order-search.feature
src/products/fmt-os/pages/purchase-order-search.page.js
src/products/fmt-os/step-definitions/purchase-order-search.steps.js
```

### Ruleset-First Workflow

1. Capture the requirement in the ruleset `.md`.
2. Mirror the same requirement structure in the ruleset `.json`.
3. Create or update automation code only for that same feature slug.
4. Run a dry run first.
5. Run the tagged automation suite.

Suggested validation commands:

```bash
npx cucumber-js --dry-run --config src/config/cucumber.fmt-os.config.cjs --tags @smoke
npm run test:fmt-os
```

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
