/**
 * JSON BDD Runner — lightweight test executor for JSON feature files.
 *
 * Reads a JSON feature file, parses scenarios, and executes
 * the corresponding step definitions. Built for Playwright + TypeScript.
 *
 * Usage:
 *   node --import ts-node/esm src/runner/index.ts <path-to-feature.json>
 *
 * Or via npm:
 *   npm run test:bdd
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ---- Config ----
const HEADLESS = process.env['MOLTY_HEADLESS'] !== 'true';

// ---- Types ----
interface Scenario {
  name: string;
  given: string;
  when?: string;
  then: string | string[];
}

interface Feature {
  feature: string;
  description?: string;
  scenarios: Scenario[];
}

type StepRegistry = Record<string, (page: Page, context: Record<string, unknown>) => Promise<void>>;

// ---- Runner ----
class BddRunner {
  private browser!: Browser;
  private browserContext!: import('playwright').BrowserContext;
  private steps: StepRegistry = {};
  private passed = 0;
  private failed = 0;
  private total = 0;

  registerStep(stepType: 'given' | 'when' | 'then', pattern: string, handler: (page: Page, context: Record<string, unknown>) => Promise<void>): void {
    const key = `${stepType}:${pattern}`;
    this.steps[key] = handler;
  }

  registerSteps(stepMap: StepRegistry): void {
    Object.assign(this.steps, stepMap);
  }

  private async runScenario(scenario: Scenario): Promise<void> {
    process.stdout.write(`\n  📋 Scenario: ${scenario.name}\n`);
    const context: Record<string, unknown> = {};
    this.total++;

    // Fresh page per scenario — resilient, simulates clean user session
    const page = await this.browserContext.newPage();

    try {
      // Execute Given
      const givenKey = `given:${scenario.given}`;
      if (this.steps[givenKey]) {
        process.stdout.write(`    ✓ Given ${scenario.given}\n`);
        await this.steps[givenKey](page, context);
      }

      // Execute When
      if (scenario.when) {
        const whenKey = `when:${scenario.when}`;
        if (this.steps[whenKey]) {
          process.stdout.write(`    ✓ When ${scenario.when}\n`);
          await this.steps[whenKey](page, context);
        }
      }

      // Execute Then
      const thenStatements = Array.isArray(scenario.then) ? scenario.then : [scenario.then];
      for (const assertion of thenStatements) {
        const thenKey = `then:${assertion}`;
        if (this.steps[thenKey]) {
          process.stdout.write(`    ✓ Then ${assertion}\n`);
          await this.steps[thenKey](page, context);
        }
      }

      this.passed++;
    } catch (error) {
      this.failed++;
      process.stdout.write(`    ❌ ${(error as Error).message}\n`);
    } finally {
      await page.close();
    }
  }

  async run(featurePath: string): Promise<void> {
    const feature: Feature = JSON.parse(fs.readFileSync(featurePath, 'utf-8'));

    process.stdout.write(`\n🔬 Feature: ${feature.feature}\n`);
    if (feature.description) {
      process.stdout.write(`   ${feature.description}\n`);
    }

    // Single browser instance, fresh page per scenario
    this.browser = await chromium.launch({
      headless: HEADLESS,
      args: HEADLESS ? [] : ['--start-maximized'],
    });
    this.browserContext = await this.browser.newContext();

    // Run scenarios
    for (const scenario of feature.scenarios) {
      await this.runScenario(scenario);
    }

    // Cleanup
    await this.browser.close();

    // Summary
    process.stdout.write(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    process.stdout.write(`  Results: ${this.passed}/${this.total} passed, ${this.failed} failed\n`);
    process.stdout.write(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// ---- Main ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const featureArg = args[0] || path.join(__dirname, '..', 'features', 'proton-login.json');

async function main() {
  const runner = new BddRunner();

  // Use dynamic import with proper ts-node/module resolution
  const { default: protonSteps } = await import(/* @vite-ignore */ '../steps/proton-login.js');
  runner.registerSteps(protonSteps);

  await runner.run(featureArg);
}

main().catch((err) => {
  console.error('Runner error:', err);
  process.exit(1);
});
