#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { toKitiumError } from '@kitiumai/error';
import { Command } from 'commander';

import { loadSpec } from './config.js';
import { STATE_DIR } from './constants.js';
import { runDoctor } from './doctor.js';
import { getEnvkitLogger } from './logger.js';
import { provisionEnvironment } from './provision.js';
import { SecretsBroker } from './secrets.js';
import { createSnapshot } from './snapshot.js';
import { ensureStateDirectories } from './state.js';

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

function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Create a starter envkit.yaml spec and state directories')
    .action(async () => {
      const cwd = process.cwd();
      const specPath = path.join(cwd, program.opts()['path'] ?? DEFAULT_SPEC);
      await ensureStateDirectories(cwd);
      await writeSampleSpec(specPath);
      const logger = getEnvkitLogger({ component: 'cli', command: 'init' });
      logger.info(`Initialized spec at ${specPath}`);
    });
}

function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Run environment health checks defined in envkit.yaml')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options['path'] ?? DEFAULT_SPEC);
      await runDoctor(spec, { cwd: process.cwd() });
    });
}

function registerProvisionCommand(program: Command): void {
  program
    .command('provision')
    .description('Provision toolchains and secrets defined in envkit.yaml')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options['path'] ?? DEFAULT_SPEC);
      await provisionEnvironment(spec, { cwd: process.cwd() });
    });
}

function registerSnapshotCommand(program: Command): void {
  program
    .command('snapshot')
    .description('Create deterministic lockfile for the current spec')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options['path'] ?? DEFAULT_SPEC);
      await createSnapshot(spec, { cwd: process.cwd() });
    });
}

function registerDestroyCommand(program: Command): void {
  program
    .command('destroy')
    .description('Remove envkit state from the current workspace')
    .option('--preserve-logs', 'Keep envkit logs', false)
    .action(async (commandOptions) => {
      const cwd = process.cwd();
      const target = path.join(cwd, STATE_DIR);
      let entries: string[] = [];
      try {
        entries = await fs.readdir(target);
      } catch {
        entries = [];
      }
      for (const entry of entries) {
        if (!commandOptions.preserveLogs || entry !== 'envkit.log') {
          await fs.rm(path.join(target, entry), { recursive: true, force: true });
        }
      }
      const logger = getEnvkitLogger({ component: 'cli', command: 'destroy' });
      logger.warn('Destroyed envkit state', { preserveLogs: commandOptions.preserveLogs });
    });
}

function registerSecretsCommand(program: Command): void {
  program
    .command('secrets')
    .description('Fetch all secrets via the configured broker')
    .action(async () => {
      const options = program.opts();
      const spec = await loadSpec(options['path'] ?? DEFAULT_SPEC);
      const broker = new SecretsBroker(spec, { cwd: process.cwd() });
      const secrets = broker.fetchAll();
      console.info(JSON.stringify(secrets, null, 2));
    });
}

function registerPluginsCommand(program: Command): void {
  program
    .command('plugins')
    .description('Describe plugin capabilities (registry is runtime configurable)')
    .action(() => {
      console.info(
        'Plugins can be registered via the PluginRegistry class inside your automation scripts.'
      );
    });
}

export async function main(): Promise<void> {
  const program = new Command();
  program
    .name('envkit')
    .description('Environment toolkit for reproducible, policy-aware setups')
    .option('-p, --path <path>', 'Path to envkit spec', DEFAULT_SPEC);

  registerInitCommand(program);
  registerDoctorCommand(program);
  registerProvisionCommand(program);
  registerSnapshotCommand(program);
  registerDestroyCommand(program);
  registerSecretsCommand(program);
  registerPluginsCommand(program);

  await program.parseAsync(process.argv);
}

const isCliEntry = import.meta.url === pathToFileURL(process.argv[1] ?? '').href;

if (isCliEntry) {
  try {
    await main();
  } catch (error) {
    const kitiumError = toKitiumError(error, {
      code: 'envkit/cli_error',
      message: 'An error occurred while running envkit CLI',
      severity: 'error',
      kind: 'internal',
      retryable: false,
      source: '@kitiumai/envkit',
    });
    console.error(kitiumError.message);
    if (kitiumError.cause) {
      console.error('Cause:', kitiumError.cause);
    }
    process.exitCode = 1;
  }
}
