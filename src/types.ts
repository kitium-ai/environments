export interface SecretProvider {
  provider: string;
  path: string;
  rotationDays?: number;
}

export interface Toolchain {
  name: string;
  version: string;
  cacheKey?: string;
}

export interface EnvironmentSpec {
  name: string;
  description?: string;
  secrets?: SecretProvider[];
  toolchains?: Toolchain[];
  policies?: string[];
  checks?: string[];
}

export interface DoctorCheckResult {
  command: string;
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface DoctorReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    timestamp: string;
  };
  results: DoctorCheckResult[];
}

export interface Snapshot {
  spec: EnvironmentSpec;
  fingerprint: string;
  createdAt: string;
}

export type PluginHook = (context: Record<string, unknown>) => Promise<void> | void;
