# Automation Framework — FMT OS & FMT Pro

Playwright + Cucumber BDD framework for automating **FMT OS** (web) and **FMT Pro** (PWA).

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Language | JavaScript (ES Modules) |
| Browser Automation | Playwright |
| Test Runner / BDD | Cucumber JS |
| Reports | @cucumber/html-formatter |
| Env Management | dotenv |

---

## Project Structure

```
automation-framework/
│
├── rulesets/                        # PM requirement → structured ruleset (source of truth)
│   └── fmt-os/
│       ├── purchase-order.md        # Human-readable breakdown
│       └── purchase-order.json      # Machine-readable breakdown
│
├── src/
│   ├── config/
│   │   ├── env.config.js            # Reads .env, exports config object
│   │   ├── cucumber.fmt-os.config.cjs
│   │   ├── cucumber.fmt-pro.config.cjs
│   │   └── cucumber.all.config.cjs
│   │
│   ├── hooks/
│   │   ├── world.js                 # Cucumber World: browser + page context
│   │   └── before-after.hooks.js    # Browser launch, session check, screenshot on fail
│   │
│   ├── shared/
│   │   ├── pages/
│   │   │   └── base.page.js         # Base class for all Page Objects
│   │   └── utils/
│   │       ├── wait.utils.js        # waitForVisible, waitForNetworkIdle, retry
│   │       ├── string.utils.js      # randomString, normalise, generateTestEmail
│   │       └── date.utils.js        # todayISO, offsetDate, formatDDMMYYYY
│   │
│   └── products/
│       ├── fmt-os/
│       │   ├── features/            # Gherkin .feature files
│       │   ├── step-definitions/    # Step implementations
│       │   └── pages/               # FMT OS Page Objects
│       └── fmt-pro/
│           ├── features/
│           ├── step-definitions/
│           └── pages/
│
├── reports/                         # Auto-generated HTML + JSON (gitignored)
├── screenshots/                     # Failure screenshots (gitignored)
├── .env                             # Local env vars (gitignored)
├── .env.example                     # Template for .env
└── package.json
```

---

## First-Time Setup

### 1. Install dependencies

```bash
cd automation-framework
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your app URLs and credentials (see `.env.example` for all variables).

### 3. That's it — login is automatic

Every test scenario opens Chrome, logs into the app via Google SSO using the credentials in `.env`, then runs the test — all in the same browser session. No saved sessions, no expiry issues.

---

## Running Tests

| Command | What it runs |
|---------|--------------|
| `npm run test:fmt-os` | All FMT OS tests |
| `npm run test:fmt-os:smoke` | FMT OS smoke tests only |
| `npm run test:fmt-pro` | All FMT Pro tests |
| `npm run test:regression` | Full suite across both products |
| `npm run test:wip` | Scenarios tagged `@wip` |
| `npm run clean:reports` | Delete all reports and screenshots |

---

## Adding a New Feature

When a PM requirement arrives:

**1. Create the Ruleset** — paste the requirement and let AI generate:
- `rulesets/<product>/<feature>.md` (human-readable)
- `rulesets/<product>/<feature>.json` (machine-readable)

**2. Create the Feature File** — `src/products/<product>/features/<feature>.feature`

Tag every scenario with its product and priority:
```gherkin
@fmt-os @smoke
Scenario: Short description
  Given ...
  When ...
  Then ...
```

**3. Create the Page Object** — `src/products/<product>/pages/<feature>.page.js`

Extend `BasePage`, keep all selectors in a `selectors` object at the top.

**4. Create Step Definitions** — `src/products/<product>/step-definitions/<feature>.steps.js`

---

## Tagging Strategy

| Tag | Meaning |
|-----|---------|
| `@fmt-os` | FMT OS product |
| `@fmt-pro` | FMT Pro product |
| `@smoke` | Critical, fast — run on every deploy |
| `@regression` | Full regression |
| `@wip` | In-progress — excluded from CI |
