# @kitiumai/environments

**Enterprise-Grade Environment Management for TypeScript Applications**

A comprehensive, TypeScript-native toolkit for managing complex application environments with security, compliance, and operational excellence. Provides unified APIs for secrets management, authentication, audit logging, deployment pipelines, change management, and rich ecosystem integrations.

## What is this package?

`@kitiumai/environments` is a complete environment management platform that bridges the gap between development and production operations. It provides:

- **Unified Environment Abstraction**: Single API for managing secrets, configurations, and infrastructure across all environments
- **Enterprise Security**: Built-in authentication, RBAC, audit logging, and compliance reporting
- **Operational Excellence**: Deployment pipelines, change management, monitoring, and automated operations
- **Developer Experience**: TypeScript-native APIs with full type safety and IntelliSense support
- **Extensibility**: Plugin architecture for custom integrations and organization-specific workflows

## Why we need this package?

Modern applications require sophisticated environment management that goes beyond simple configuration files. Organizations need:

- **Security & Compliance**: Centralized secrets management with audit trails and compliance reporting
- **Operational Efficiency**: Automated deployment pipelines and change management workflows
- **Developer Productivity**: Type-safe APIs that prevent configuration errors and provide excellent DX
- **Scalability**: Multi-environment hierarchies with inheritance and overrides
- **Observability**: Monitoring, alerting, and operational insights across all environments

Without proper environment management, teams face:
- ❌ Secrets scattered across multiple systems
- ❌ Manual deployment processes prone to errors
- ❌ Lack of audit trails for compliance
- ❌ Inconsistent configurations between environments
- ❌ Poor visibility into operational health

## Competitor Comparison

| Feature | @kitiumai/environments | AWS Systems Manager | Azure App Configuration | HashiCorp Vault | Kubernetes ConfigMaps |
|---------|----------------------|-------------------|----------------------|------------------|----------------------|
| **TypeScript Native** | ✅ Full type safety | ❌ | ❌ | ❌ | ❌ |
| **Secrets Management** | ✅ Multi-provider | ✅ AWS only | ❌ | ✅ Enterprise | ❌ |
| **Authentication/RBAC** | ✅ Built-in | ✅ AWS IAM | ✅ Azure AD | ✅ Enterprise | ❌ |
| **Audit Logging** | ✅ Structured events | ✅ CloudTrail | ✅ Activity logs | ✅ Enterprise | ❌ |
| **Deployment Pipelines** | ✅ Native support | ❌ | ❌ | ❌ | ❌ |
| **Change Management** | ✅ Request workflows | ❌ | ❌ | ❌ | ❌ |
| **Multi-Environment** | ✅ Hierarchies | ✅ Stacks | ✅ Environments | ❌ | ❌ |
| **Infrastructure as Code** | ✅ Provider abstraction | ✅ CloudFormation | ✅ ARM | ❌ | ❌ |
| **Monitoring/Alerting** | ✅ Built-in | ✅ CloudWatch | ✅ Azure Monitor | ❌ | ❌ |
| **Plugin Ecosystem** | ✅ Extensible | ❌ | ❌ | ✅ Enterprise | ❌ |
| **Open Source** | ✅ MIT License | ❌ | ❌ | ✅ Enterprise | ✅ Apache |

## Unique Selling Points (USPs)

### 🔒 **TypeScript-First Security**
- **Zero-config secrets**: Type-safe secrets access with compile-time validation
- **RBAC as code**: Define permissions and roles in TypeScript with full type checking
- **Audit as infrastructure**: Structured audit events with compliance reporting built-in

### 🚀 **Developer Experience Excellence**
- **IntelliSense everywhere**: Full autocomplete for all APIs and configurations
- **Type-safe configurations**: Catch configuration errors at compile time
- **Unified API surface**: Single import for all environment operations

### 🏗️ **Enterprise-Grade Operations**
- **Deployment pipelines**: Native CI/CD pipeline management with approvals and rollback
- **Change management**: Structured change request workflows with review processes
- **Multi-region HA**: Built-in high availability with automatic failover

### 🔌 **Rich Ecosystem Integrations**
- **Webhook support**: Real-time notifications and external system integration
- **Plugin architecture**: Extend functionality with custom plugins and extensions
- **Multi-provider secrets**: Support for Vault, AWS, GCP, Azure, and custom providers

### 📊 **Operational Visibility**
- **Structured monitoring**: Metrics collection with alerting and dashboards
- **Compliance reporting**: Automated compliance checks and violation detection
- **Backup & recovery**: Encrypted backups with integrity verification

## Installation

```bash
npm install @kitiumai/environments
# or
pnpm add @kitiumai/environments
# or
yarn add @kitiumai/environments
```

## Quick Start

### Basic Environment Setup

```typescript
import { EnvironmentResolver, SecretsBroker } from '@kitiumai/environments';

async function setupEnvironment() {
  // Create environment hierarchy
  const resolver = new EnvironmentResolver();
  const env = await resolver.resolve('production', {
    name: 'web-app',
    secrets: [
      { provider: 'vault', path: 'kv/prod/database' },
      { provider: 'aws', path: 'secrets/api-keys' }
    ]
  });

  // Initialize secrets broker
  const broker = new SecretsBroker(env);
  const secrets = await broker.fetchAll();

  console.log('Environment ready:', env.name);
  console.log('Secrets loaded:', Object.keys(secrets));
}
```

### Authentication & Authorization

```typescript
import { AuthProvider, RBACAuthProvider } from '@kitiumai/environments';

async function authenticateUser() {
  const auth = new RBACAuthProvider();

  // Authenticate user
  const user = await auth.authenticate('user123:john.doe:admin,developer');

  // Check permissions
  const canDeploy = await auth.authorize(user, {
    resource: 'environments',
    action: 'deploy',
    conditions: { environment: 'production' }
  });

  console.log(`User ${user.username} can deploy:`, canDeploy);
}
```

### Audit Logging & Compliance

```typescript
import { AuditLogger, ComplianceReport } from '@kitiumai/environments';

async function auditOperations() {
  const audit = new AuditLogger();

  // Log an operation
  await audit.log({
    type: 'environment_update',
    userId: 'user123',
    resource: 'web-app',
    action: 'deploy',
    success: true,
    details: { version: '1.2.3' }
  });

  // Generate compliance report
  const report = await audit.generateComplianceReport(
    new Date('2025-01-01'),
    new Date('2025-12-31')
  );

  console.log('Compliance violations:', report.violations.length);
}
```

### Deployment Pipelines

```typescript
import { DeploymentPipelineManager } from '@kitiumai/environments';

async function runDeployment() {
  const manager = new DeploymentPipelineManager();

  // Create deployment pipeline
  const pipelineId = manager.createPipeline({
    name: 'web-app-deploy',
    description: 'Production deployment pipeline',
    environments: ['staging', 'production'],
    stages: [
      {
        name: 'build',
        actions: [{ type: 'provision', name: 'build-app' }]
      },
      {
        name: 'test',
        actions: [{ type: 'test', name: 'run-tests' }],
        requiresApproval: true
      },
      {
        name: 'deploy',
        actions: [{ type: 'provision', name: 'deploy-to-prod' }],
        rollbackOnFailure: true
      }
    ]
  });

  // Execute pipeline
  const executionId = await manager.executePipeline(
    pipelineId,
    'production',
    'user123'
  );

  console.log('Deployment started:', executionId);
}
```

### Change Management

```typescript
import { ChangeManagementSystem } from '@kitiumai/environments';

async function manageChanges() {
  const cms = new ChangeManagementSystem();

  // Create change request
  const changeId = cms.createChangeRequest({
    title: 'Update database schema',
    description: 'Add new user table for authentication',
    environment: 'production',
    changes: [
      {
        type: 'add',
        resource: 'database.migrations',
        newValue: '001_create_users_table.sql',
        description: 'New migration file'
      }
    ],
    createdBy: 'developer123'
  });

  // Submit for review
  cms.submitForReview(changeId);

  // Approve change
  cms.approveChangeRequest(changeId, 'architect456');

  // Implement change
  cms.implementChangeRequest(changeId);

  console.log('Change implemented:', changeId);
}
```

### Ecosystem Integrations

```typescript
import { IntegrationRegistry, WebhookProvider } from '@kitiumai/environments';

async function setupIntegrations() {
  const registry = new IntegrationRegistry();

  // Register webhook integration
  registry.registerProvider('webhook', new WebhookProvider());

  await registry.registerIntegration({
    id: 'slack-notifications',
    name: 'Slack Notifications',
    type: 'webhook',
    config: {
      url: 'https://hooks.slack.com/services/...',
      events: ['deployment_complete', 'security_alert']
    }
  });

  // Execute integration
  await registry.executeIntegration('slack-notifications', {
    event: 'deployment_complete',
    payload: { app: 'web-app', version: '1.2.3' }
  });

  console.log('Notification sent to Slack');
}
```

## API Reference

### Core Classes

#### EnvironmentResolver
Manages multi-environment hierarchies with inheritance.

```typescript
class EnvironmentResolver {
  resolve(name: string, spec: EnvironmentSpec): Promise<EnvironmentSpec>
  validate(spec: EnvironmentSpec): ValidationResult
}
```

#### SecretsBroker
Unified interface for secrets management across multiple providers.

```typescript
class SecretsBroker {
  constructor(spec: EnvironmentSpec, options?: SecretsOptions)
  fetchAll(): Promise<Record<string, string>>
  rotateSecrets(): Promise<void>
  getProvider(name: string): SecretsProvider | undefined
}
```

#### AuthProvider (Interface)
Authentication and authorization interface.

```typescript
interface AuthProvider {
  authenticate(token: string): Promise<User>
  authorize(user: User, permission: Permission): Promise<boolean>
}
```

#### AuditLogger
Structured audit logging with compliance reporting.

```typescript
class AuditLogger {
  constructor(sink: AuditSink, config?: AuditConfig)
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void>
  query(filter: AuditQuery): Promise<AuditEvent[]>
  generateComplianceReport(start: Date, end: Date): Promise<ComplianceReport>
}
```

#### DeploymentPipelineManager
Manages deployment pipelines with approvals and rollback.

```typescript
class DeploymentPipelineManager {
  constructor(executor?: DeploymentExecutor)
  createPipeline(pipeline: Omit<DeploymentPipeline, 'id' | 'createdAt' | 'updatedAt'>): string
  executePipeline(pipelineId: string, environment: string, triggeredBy: string): Promise<string>
  getExecution(id: string): DeploymentExecution | undefined
}
```

#### ChangeManagementSystem
Structured change request management.

```typescript
class ChangeManagementSystem {
  createChangeRequest(request: Omit<ChangeRequest, 'id' | 'status' | 'createdAt' | 'comments'>): string
  submitForReview(id: string): boolean
  approveChangeRequest(id: string, reviewedBy: string): boolean
  implementChangeRequest(id: string): boolean
}
```

#### IntegrationRegistry
Manages ecosystem integrations (webhooks, APIs, plugins, etc.).

```typescript
class IntegrationRegistry {
  registerProvider(type: IntegrationType, provider: IntegrationProvider): void
  registerIntegration(config: Omit<IntegrationConfig, 'createdAt' | 'updatedAt'>): Promise<ValidationResult>
  executeIntegration(id: string, context: IntegrationContext): Promise<IntegrationResult>
  getIntegrationStats(): IntegrationStats
}
```

### Type Definitions

#### EnvironmentSpec
Core environment specification with secrets, toolchains, and policies.

```typescript
type EnvironmentSpec = {
  name: string;
  description?: string;
  secrets?: SecretProvider[];
  toolchains?: Toolchain[];
  policies?: string[];
  checks?: string[];
  environments?: EnvironmentHierarchy[];
  region?: string;
  backup?: BackupConfig;
}
```

#### User & Permission
Authentication and authorization types.

```typescript
type User = {
  id: string;
  username: string;
  roles: string[];
  tenant?: string;
  metadata?: Record<string, unknown>;
}

type Permission = {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}
```

#### AuditEvent
Structured audit event with compliance information.

```typescript
type AuditEvent = {
  id: string;
  type: AuditEventType;
  timestamp: Date;
  userId?: string;
  username?: string;
  tenant?: string;
  resource: string;
  action: string;
  success: boolean;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}
```

#### DeploymentPipeline
Complete deployment pipeline specification.

```typescript
type DeploymentPipeline = {
  id: string;
  name: string;
  description?: string;
  stages: DeploymentStage[];
  environments: string[];
  triggers?: DeploymentTrigger[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### ChangeRequest
Change management request with approval workflow.

```typescript
type ChangeRequest = {
  id: string;
  title: string;
  description: string;
  environment: string;
  changes: ChangeItem[];
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'implemented';
  createdBy: string;
  createdAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  implementedAt?: Date;
  comments?: ChangeComment[];
}
```

#### IntegrationConfig
Configuration for ecosystem integrations.

```typescript
type IntegrationConfig = {
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
}
```

## Advanced Usage

### Custom Secret Providers

```typescript
import { SecretsProvider } from '@kitiumai/environments';

class CustomSecretProvider implements SecretsProvider {
  readonly name = 'custom';

  async fetchSecret(path: string): Promise<string> {
    // Implement custom secret fetching logic
    return `secret-for-${path}`;
  }

  async rotateSecret?(path: string): Promise<void> {
    // Implement secret rotation
  }
}

// Register custom provider
const broker = new SecretsBroker(spec);
broker.registerProvider(new CustomSecretProvider());
```

### Plugin Development

```typescript
import { Plugin } from '@kitiumai/environments';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  hooks: {
    onEnvironmentCreate: async (context) => {
      console.log('Environment created:', context.environment.name);
    },
    onSecretFetch: async (context) => {
      console.log('Secret fetched:', context.path);
    }
  }
};

// Register plugin
import { getPluginManager } from '@kitiumai/environments';
const pluginManager = getPluginManager();
pluginManager.register(myPlugin);
```

### Monitoring Integration

```typescript
import { MonitoringProvider, Metric } from '@kitiumai/environments';

class DataDogProvider implements MonitoringProvider {
  async recordMetric(metric: Metric): Promise<void> {
    // Send to DataDog
    console.log('Metric recorded:', metric.name, metric.value);
  }

  async queryMetrics(query: MetricQuery): Promise<Metric[]> {
    // Query DataDog metrics
    return [];
  }
}

// Use monitoring
const monitoring = new MonitoringProvider(new DataDogProvider());
await monitoring.recordCounter('deployments', 1, { environment: 'prod' });
```

## Configuration

### Environment Variables

```bash
# Vault Configuration
VAULT_ADDR=https://vault.example.com
VAULT_TOKEN=your-vault-token

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Azure Configuration
AZURE_KEYVAULT_URL=https://myvault.vault.azure.net
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# GCP Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GCP_PROJECT_ID=your-project-id
```

### YAML Configuration

```yaml
# envkit.yaml
name: my-application
description: Production environment configuration

secrets:
  - provider: vault
    path: kv/prod/database
    rotationDays: 30
  - provider: aws
    path: secrets/api-keys

toolchains:
  - name: node
    version: "20"
  - name: python
    version: "3.11"

policies:
  - policies/security.rego
  - policies/compliance.rego

checks:
  - node --version
  - python --version

backup:
  enabled: true
  retentionDays: 30
  regions: ['us-east-1', 'us-west-2']
```

## Security & Compliance

- **SOC 2 Type II**: Full audit trails and compliance reporting
- **HIPAA**: Encrypted secrets with access logging
- **PCI DSS**: Secure secrets management for payment data
- **GDPR**: Data minimization and consent management
- **Zero Trust**: Every operation is authenticated and authorized

## Performance

- **Sub-millisecond**: Secrets fetching with caching
- **Horizontal scaling**: Multi-region deployments with automatic failover
- **Async operations**: Non-blocking API calls with proper error handling
- **Memory efficient**: Lazy loading and garbage collection

## Contributing

We welcome contributions! Please see our [Contributing Guide](../CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../LICENSE) file for details.

## Support

- 📖 [Documentation](https://docs.kitium.ai)
- 💬 [Discord Community](https://discord.gg/kitium)
- 🐛 [Issue Tracker](https://github.com/kitium-ai/environments/issues)
- 📧 [Security Issues](mailto:security@kitium.ai)
