import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = ['FMT_OS_URL', 'FMT_PRO_URL', 'USERNAME', 'PASSWORD'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}. Check your .env file.`);
  }
}

const config = {
  products: {
    'fmt-os': {
      baseUrl: process.env.FMT_OS_URL,
      name: 'FMT OS',
    },
    'fmt-pro': {
      baseUrl: process.env.FMT_PRO_URL,
      name: 'FMT Pro',
    },
  },
  credentials: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
  },
  browser: {
    type: process.env.BROWSER || 'chromium',
    headless: process.env.HEADLESS === 'true',
  },
  timeouts: {
    default: parseInt(process.env.DEFAULT_TIMEOUT || '30000', 10),
    navigation: parseInt(process.env.NAVIGATION_TIMEOUT || '60000', 10),
  },
  reporting: {
    reportDir: process.env.REPORT_DIR || 'reports',
  },
  selfHeal: {
    /** Console warnings when a non-primary locator wins. */
    logFallbacks: process.env.SELF_HEAL_LOG === 'true',
    /** Append JSON lines to reports/self-heal-events.jsonl (truncated at each run). Set SELF_HEAL_DRIFT_LOG=false to disable. */
    driftLogEnabled: process.env.SELF_HEAL_DRIFT_LOG !== 'false',
  },
  /**
   * Learn preferred strategy name after a successful fallback; reorder next run.
   * Report: reports/selector-resolution-report.json + selector-intelligence-summary.md
   */
  selectorIntelligence: {
    cacheEnabled: process.env.SELECTOR_CACHE !== 'false',
    reportEnabled: process.env.SELECTOR_REPORT !== 'false',
  },
  /**
   * CDP / AX recovery after scripted strategies (+ optional retryRecovery) fail.
   * Default **on** so `npm run test:fmt-os` runs the full locator pipeline without extra env.
   * Set RUNTIME_CDP_RECOVERY=false to disable.
   */
  runtimeCdpRecovery: {
    enabled: process.env.RUNTIME_CDP_RECOVERY !== 'false',
    maxExtraStrategies: parseInt(process.env.CDP_RECOVERY_MAX_STRATEGIES || '8', 10),
    writeDebugArtifact: process.env.CDP_RECOVERY_DEBUG === 'true',
  },
};

export default config;
