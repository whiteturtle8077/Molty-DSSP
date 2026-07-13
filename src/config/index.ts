/**
 * Config module — single source of truth for all environment and app configuration.
 *
 * Loads from environment variables (prefixed with MOLTY_) with fallback defaults.
 * Secrets (username, passwords, API keys) MUST come from .env or environment,
 * never from code or checked into git.
 *
 * Usage:
 *   import { config } from './config/index.js';
 *   console.log(config.app.baseUrl);
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file manually (avoids dotenv dependency)
function loadEnvFile(): void {
  // Walk up from src/config/ to project root
  let envPath = path.resolve(__dirname, '..', '..', '.env');

  // If not found, also check cwd (in case run from output/ root)
  if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), '.env');
  }

  if (!fs.existsSync(envPath)) {
    return; // No .env file — rely on actual env vars
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    // Only set if not already present (actual env vars take priority)
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Load .env on module import
loadEnvFile();

export interface AppConfig {
  baseUrl: string;
}

export interface AuthConfig {
  protonUsername: string;
  protonPassword: string;
}

export interface ReportConfig {
  outputDir: string;
  format: 'json' | 'junit';
}

export interface Config {
  app: AppConfig;
  auth: AuthConfig;
  report: ReportConfig;
}

function getEnv(name: string, defaultValue: string = ''): string {
  return process.env[name] || process.env[name.toLowerCase()] || defaultValue;
}

export const config: Config = {
  app: {
    baseUrl: getEnv('MOLTY_BASE_URL', 'https://mail.proton.me'),
  },
  auth: {
    protonUsername: getEnv('MOLTY_PROTON_USERNAME', ''),
    protonPassword: getEnv('MOLTY_PROTON_PASSWORD', ''),
  },
  report: {
    outputDir: getEnv('MOLTY_REPORT_DIR', 'test-results'),
    format: (getEnv('MOLTY_REPORT_FORMAT', 'json') as 'json' | 'junit'),
  },
};
