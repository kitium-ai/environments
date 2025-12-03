#!/usr/bin/env node
import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { loadSpec } from './config';
import { runDoctor } from './doctor';
import { provisionEnvironment } from './provision';
import { createSnapshot } from './snapshot';
import { SecretsBroker } from './secrets';
import { ensureStateDirectories } from './state';
import { StructuredLogger } from './logger';
import { STATE_DIR } from './constants';

const DEFAULT_SPEC = 'envkit.yaml';
const SAMPLE_SPEC_CONTENT = `name: sample-service
description: Local + CI environment with reproducible toolchains and secrets
secrets:
  - provider: vault
    path: kv/services/sample-service
    rotationDays: 30
toolchains:
  - name: node
    version: "20"
  - name: python
    version: "3.11"
policies:
  - policies/baseline.rego
checks:
  - node --version
  - npm --version
`;

async function writeSampleSpec(specPath: string): Promise<void> {
  await fs.writeFile(specPath, SAMPLE_SPEC_CONTENT, 'utf-8');
}

export async function main(): Promise<void> {
  const program = new Command();
  program
    .name('envkit')
    .description('Environment toolkit for reproducible, policy-aware setups')
    .option('-p, --path <path>', 'Path to envkit spec', DEFAULT_SPEC);

  program
    .command('init')
    .description('Create a starter envkit.yaml spec and state directories')
    .action(async () => {
      const cwd = process.cwd();
      const specPath = path.join(cwd, program.opts().path);
      await ensureStateDirectories(cwd);
      await writeSampleSpec(specPath);
      const logger = new StructuredLogger(cwd);
      await logger.log('info', `Initialized spec at ${specPath}`);
    });

  program
    .command('doctor')
    .description('Run environment health checks defined in envkit.yaml')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options.path);
      await runDoctor(spec, { cwd: process.cwd() });
    });

  program
    .command('provision')
    .description('Provision toolchains and secrets defined in envkit.yaml')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options.path);
      await provisionEnvironment(spec, { cwd: process.cwd() });
    });

  program
    .command('snapshot')
    .description('Create deterministic lockfile for the current spec')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options.path);
      await createSnapshot(spec, { cwd: process.cwd() });
    });

  program
    .command('destroy')
    .description('Remove envkit state from the current workspace')
    .option('--preserve-logs', 'Keep envkit logs', false)
    .action(async (commandOptions) => {
      const cwd = process.cwd();
      const target = path.join(cwd, STATE_DIR);
      const entries = await fs.readdir(target).catch(() => []);
      for (const entry of entries) {
        if (!commandOptions.preserveLogs || entry !== 'envkit.log') {
          await fs.rm(path.join(target, entry), { recursive: true, force: true });
        }
      }
      const logger = new StructuredLogger(cwd);
      await logger.log('warn', 'Destroyed envkit state', { preserveLogs: commandOptions.preserveLogs });
    });

  program
    .command('secrets')
    .description('Fetch all secrets via the configured broker')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options.path);
      const broker = new SecretsBroker(spec, { cwd: process.cwd() });
      const secrets = await broker.fetchAll();
      console.log(JSON.stringify(secrets, null, 2));
    });

  program
    .command('plugins')
    .description('Describe plugin capabilities (registry is runtime configurable)')
    .action(async () => {
      console.log('Plugins can be registered via the PluginRegistry class inside your automation scripts.');
    });

  await program.parseAsync(process.argv);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
