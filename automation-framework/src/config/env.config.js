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
    screenshotDir: process.env.SCREENSHOT_DIR || 'screenshots',
  },
};

export default config;
