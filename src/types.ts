export type SecretProvider = {
  provider: string;
  path: string;
  rotationDays?: number;
};

export type Toolchain = {
  name: string;
  version: string;
  cacheKey?: string;
};

export type EnvironmentSpec = {
  name: string;
  description?: string;
  secrets?: SecretProvider[];
  toolchains?: Toolchain[];
  policies?: string[];
  checks?: string[];
  environments?: EnvironmentHierarchy[];
  region?: string;
  backup?: BackupConfig;
};

export type EnvironmentHierarchy = {
  name: string;
  extends?: string;
  overrides?: {
    description?: string;
    secrets?: SecretProvider[];
    toolchains?: Toolchain[];
    policies?: string[];
    checks?: string[];
  };
};

export type BackupConfig = {
  enabled: boolean;
  retentionDays: number;
  schedule?: string;
  regions?: string[];
};

export type DoctorCheckResult = {
  command: string;
  success: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type DoctorReport = {
  summary: {
    total: number;
    passed: number;
    failed: number;
    timestamp: string;
  };
  results: DoctorCheckResult[];
};

export type Snapshot = {
  spec: EnvironmentSpec;
  fingerprint: string;
  createdAt: string;
};

export type PluginHook = (
  context: Record<string, unknown>,
) => Promise<void> | void;

// Deployment and Pipeline Types
export type DeploymentStage = {
  name: string;
  actions: DeploymentAction[];
  requiresApproval?: boolean;
  timeoutMinutes?: number;
  rollbackOnFailure?: boolean;
};

export type DeploymentAction = {
  type: "provision" | "test" | "validate" | "notify" | "wait" | "custom";
  name: string;
  config?: Record<string, unknown>;
  timeoutSeconds?: number;
};

export type DeploymentPipeline = {
  id: string;
  name: string;
  description?: string;
  stages: DeploymentStage[];
  environments: string[];
  triggers?: DeploymentTrigger[];
  createdAt: Date;
  updatedAt: Date;
};

export type DeploymentTrigger = {
  type: "manual" | "schedule" | "webhook" | "commit";
  config?: Record<string, unknown>;
};

export type DeploymentExecution = {
  id: string;
  pipelineId: string;
  environment: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  stages: DeploymentStageExecution[];
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy: string;
  approvals?: DeploymentApproval[];
};

export type DeploymentStageExecution = {
  stageName: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  actions: DeploymentActionExecution[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
};

export type DeploymentActionExecution = {
  actionName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
};

export type DeploymentApproval = {
  stageName: string;
  approvedBy: string;
  approvedAt: Date;
  comment?: string;
};

export type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  environment: string;
  changes: ChangeItem[];
  status: "draft" | "pending_review" | "approved" | "rejected" | "implemented";
  createdBy: string;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  implementedAt?: Date;
  comments?: ChangeComment[];
};

export type ChangeItem = {
  type: "add" | "modify" | "delete";
  resource: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
};

export type ChangeComment = {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
};

// Ecosystem Integration Types
export type IntegrationType =
  | "webhook"
  | "api"
  | "plugin"
  | "extension"
  | "cli"
  | "ui";

export type IntegrationStatus = "active" | "inactive" | "error" | "pending";

export type IntegrationConfig = {
  id: string;
  name: string;
  type: IntegrationType;
  description?: string;
  version: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  metadata: IntegrationMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
};

export type IntegrationMetadata = {
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  dependencies?: string[];
  permissions?: string[];
};

export type ValidationResult = {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
};

export type IntegrationInstance = {
  id: string;
  config: Record<string, unknown>;
  state: Record<string, unknown>;
  dispose(): Promise<void>;
};

export type IntegrationContext = {
  event?: string;
  payload?: unknown;
  environment?: string;
  user?: string;
  correlationId?: string;
};

export type IntegrationResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  logs?: string[];
};

export type IntegrationStats = {
  total: number;
  byType: Record<IntegrationType, number>;
  byStatus: Record<IntegrationStatus, number>;
  activeInstances: number;
};
