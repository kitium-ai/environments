export type SecretProvider = {
  provider: string;
  path: string;
  rotationDays?: number;
}

export type Toolchain = {
  name: string;
  version: string;
  cacheKey?: string;
}

export type EnvironmentSpec = {
  name: string;
  description?: string;
  secrets?: SecretProvider[];
  toolchains?: Toolchain[];
  policies?: string[];
  checks?: string[];
}

export type DoctorCheckResult = {
  command: string;
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export type DoctorReport = {
  summary: {
    total: number;
    passed: number;
    failed: number;
    timestamp: string;
  };
  results: DoctorCheckResult[];
}

export type Snapshot = {
  spec: EnvironmentSpec;
  fingerprint: string;
  createdAt: string;
}

export type PluginHook = (context: Record<string, unknown>) => Promise<void> | void;
