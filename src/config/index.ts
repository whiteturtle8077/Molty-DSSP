/**
 * Config module — single source of truth for all environment and app configuration.
 *
 * Auth secrets (username, password) come from .env.enc — an AES-256-GCM encrypted
 * blob that is decrypted at runtime using MOLTY_MASTER_KEY (injected by the user).
 * The 2Captcha API key can come from a separate env var or the environment.
 *
 * The master key NEVER touches this machine's disk. It is provided at runtime via
 * environment variable or piped over SSH:
 *
 *   MOLTY_MASTER_KEY=xxxxxxxx npm run test:bdd
 *
 * Security invariants:
 *   - .env.enc is the only secrets file on disk — ciphertext only
 *   - Plaintext secrets exist only in memory during the test run
 *   - .env.enc CAN be committed to GitHub — it's useless without the master key
 *     (but .env must NEVER be committed)
 *
 * Usage:
 *   import { config } from './config/index.js';
 *   console.log(config.auth.protonUsername);
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- File locators ----
function findProjectRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function findFile(...names: string[]): string | null {
  const root = findProjectRoot();
  for (const name of names) {
    const p1 = path.join(root, name);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(process.cwd(), name);
    if (p2 !== p1 && fs.existsSync(p2)) return p2;
  }
  return null;
}

// ---- .env loader (non-secret config) ----
function loadEnvFile(): void {
  const envPath = findFile('.env');
  if (!envPath) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ---- .env.enc decrypter (secrets, AES-256-GCM) ----
interface SecretsPayload {
  username: string;
  password: string;
}

// ---- Master key sources (priority order) ----
function resolveMasterKey(): string {
  // 1. Runtime env var (inline MOLTY_MASTER_KEY=xxx, highest priority)
  const envKey = process.env['MOLTY_MASTER_KEY'];
  if (envKey) return envKey;

  // 2. OS env var PROTON_WHITETURTLE_MASTER_KEY (set in bashrc / system env)
  const osKey = process.env['PROTON_WHITETURTLE_MASTER_KEY'];
  if (osKey) return osKey;

  // 3. File-based key — outside project tree, never git-tracked
  const keyFile = '/home/melataka/.secrets/proton-master-key';
  try {
    return fs.readFileSync(keyFile, 'utf-8').trim();
  } catch {
    return '';
  }
}

function decryptSecrets(): SecretsPayload {
  const masterKeyHex = resolveMasterKey();
  if (!masterKeyHex) {
    return { username: '', password: '' };
  }

  const encPath = findFile('.env.enc');
  if (!encPath) {
    return { username: '', password: '' };
  }

  try {
    const ciphertextB64 = fs.readFileSync(encPath, 'utf-8').trim();
    const combined = Buffer.from(ciphertextB64, 'base64');

    const nonce = combined.subarray(0, 12);
    const tag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const key = Buffer.from(masterKeyHex, 'hex');
    if (key.length !== 32) {
      throw new Error(`Master key must be 64 hex chars (32 bytes), got ${key.length * 2} hex chars`);
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf-8')) as SecretsPayload;
  } catch (err) {
    console.error('❌ Failed to decrypt .env.enc — wrong master key or corrupted file');
    console.error(`   ${(err as Error).message}`);
    return { username: '', password: '' };
  }
}

// ---- Load on module init ----
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

export interface CaptchaConfig {
  apiKey: string;
}

export interface Config {
  app: AppConfig;
  auth: AuthConfig;
  report: ReportConfig;
  captcha: CaptchaConfig;
}

function getEnv(name: string, defaultValue: string = ''): string {
  return process.env[name] || process.env[name.toLowerCase()] || defaultValue;
}

// Decrypt secrets at module load time
const secrets = decryptSecrets();

export const config: Config = {
  app: {
    baseUrl: getEnv('MOLTY_BASE_URL', 'https://mail.proton.me'),
  },
  auth: {
    protonUsername: getEnv('MOLTY_PROTON_USERNAME', secrets.username),
    protonPassword: getEnv('MOLTY_PROTON_PASSWORD', secrets.password),
  },
  report: {
    outputDir: getEnv('MOLTY_REPORT_DIR', 'test-results'),
    format: (getEnv('MOLTY_REPORT_FORMAT', 'json') as 'json' | 'junit'),
  },
  captcha: {
    // Try multiple env var names for 2Captcha key
    apiKey: getEnv('MOLTY_2CAPTCHA_KEY',
      getEnv('_2CAPTCHA_API_KEY',
        getEnv('2CAPTCHA_API_KEY', ''))),
  },
};
