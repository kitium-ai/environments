/* eslint-disable @typescript-eslint/require-await, require-await, @typescript-eslint/prefer-nullish-coalescing, max-depth, security/detect-non-literal-fs-filename */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { BackupConfig } from "./types.js";

export type BackupMetadata = {
  id: string;
  environment: string;
  createdAt: Date;
  size: number;
  checksum: string;
  regions: string[];
  retentionDays: number;
  encrypted: boolean;
};

export type BackupResult = {
  success: boolean;
  backupId: string;
  size: number;
  durationMs: number;
  regions: string[];
};

export type RestoreResult = {
  success: boolean;
  environment: string;
  restoredFrom: string;
  durationMs: number;
};

export type BackupProvider = {
  name: string;
  createBackup(data: unknown, config: BackupConfig): Promise<BackupResult>;
  restoreBackup(backupId: string): Promise<RestoreResult>;
  listBackups(environment?: string): Promise<BackupMetadata[]>;
  deleteBackup(backupId: string): Promise<void>;
};

export class FileSystemBackupProvider implements BackupProvider {
  readonly name = "filesystem";

  constructor(private readonly basePath: string) {}

  async createBackup(
    data: unknown,
    config: BackupConfig,
  ): Promise<BackupResult> {
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const backupPath = path.join(this.basePath, `${backupId}.json`);

    const backupData = {
      id: backupId,
      data,
      metadata: {} as BackupMetadata,
    };

    // Calculate checksum of the data only
    const dataJson = JSON.stringify({ id: backupId, data }, null, 2);
    const checksum = createHash("sha256").update(dataJson).digest("hex");

    backupData.metadata = {
      id: backupId,
      environment: "unknown", // TODO: Pass environment name
      createdAt: new Date(),
      size: Buffer.byteLength(dataJson),
      checksum,
      regions: config.regions ?? ["local"],
      retentionDays: config.retentionDays,
      encrypted: false,
    };

     
    await fs.mkdir(this.basePath, { recursive: true });
     
    await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));

    return {
      success: true,
      backupId,
      size: Buffer.byteLength(dataJson),
      durationMs: 100,
      regions: config.regions ?? ["local"],
    };
  }

  async restoreBackup(backupId: string): Promise<RestoreResult> {
    const backupPath = path.join(this.basePath, `${backupId}.json`);

    try {
      const data = await fs.readFile(backupPath, "utf-8");
      const backup = JSON.parse(data);

      // Verify checksum
      const jsonData = JSON.stringify(backup, null, 2);
      const checksum = createHash("sha256").update(jsonData).digest("hex");

      if (checksum !== backup.metadata.checksum) {
        throw new Error("Backup integrity check failed");
      }

      return {
        success: true,
        environment: backup.metadata.environment ?? "unknown",
        restoredFrom: backupId,
        durationMs: 50,
      };
    } catch (_error) {
      return {
        success: false,
        environment: "unknown",
        restoredFrom: backupId,
        durationMs: 0,
      };
    }
  }

  async listBackups(environment?: string): Promise<BackupMetadata[]> {
    try {
       
      const files = await fs.readdir(this.basePath);
      const backups: BackupMetadata[] = [];

      for (const file of files) {
        if (file.endsWith(".json")) {
          try {
            const filePath = path.join(this.basePath, file);
             
            const data = await fs.readFile(filePath, "utf-8");
            const backup = JSON.parse(data);

            const metadata: BackupMetadata = {
              id: backup.id,
              environment: backup.metadata.environment ?? "unknown",
              createdAt: new Date(backup.metadata.createdAt),
              size: Buffer.byteLength(data),
              checksum: backup.metadata.checksum,
              regions: backup.metadata.regions ?? ["local"],
              retentionDays: backup.metadata.retentionDays ?? 30,
              encrypted: backup.metadata.encrypted ?? false,
            };

            if (!environment || metadata.environment === environment) {
              backups.push(metadata);
            }
          } catch (_error) {
            // Skip invalid backup files
            continue;
          }
        }
      }

      return backups.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    } catch (_error) {
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backupPath = path.join(this.basePath, `${backupId}.json`);
     
    await fs.unlink(backupPath);
  }
}

export class S3BackupProvider implements BackupProvider {
  readonly name = "s3";

  constructor(
    private readonly config: {
      bucket: string;
      region: string;
      prefix?: string;
    },
  ) {}

  async createBackup(
    _data: unknown,
    _config: BackupConfig,
  ): Promise<BackupResult> {
    // TODO: Implement actual S3 backup
    console.info(`Creating S3 backup in bucket: ${this.config.bucket}`);

    return {
      success: true,
      backupId: `s3-backup-${Date.now()}`,
      size: 1024,
      durationMs: 500,
      regions: _config.regions ?? [this.config.region],
    };
  }

  async restoreBackup(backupId: string): Promise<RestoreResult> {
    // TODO: Implement actual S3 restore
    console.info(`Restoring from S3 backup: ${backupId}`);

    return {
      success: true,
      environment: "unknown",
      restoredFrom: backupId,
      durationMs: 300,
    };
  }

  async listBackups(_environment?: string): Promise<BackupMetadata[]> {
    // TODO: Implement actual S3 listing
    return [];
  }

  async deleteBackup(backupId: string): Promise<void> {
    // TODO: Implement actual S3 deletion
    console.info(`Deleting S3 backup: ${backupId}`);
  }
}

export class MultiRegionManager {
  private readonly regions: string[];
  private readonly primaryRegion: string;

  constructor(primaryRegion: string, replicaRegions: string[] = []) {
    this.primaryRegion = primaryRegion;
    this.regions = [primaryRegion, ...replicaRegions];
  }

  getRegions(): string[] {
    return [...this.regions];
  }

  getPrimaryRegion(): string {
    return this.primaryRegion;
  }

  getReplicaRegions(): string[] {
    return this.regions.filter((r) => r !== this.primaryRegion);
  }

  async replicateToRegions<T>(
    data: T,
    replicator: (region: string, data: T) => Promise<void>,
  ): Promise<{ success: boolean; failedRegions: string[] }> {
    const failedRegions: string[] = [];

    // Replicate to all regions concurrently
    const replicationPromises = this.regions.map(async (region) => {
      try {
        await replicator(region, data);
      } catch (_error) {
        failedRegions.push(region);
      }
    });

    await Promise.allSettled(replicationPromises);

    return {
      success: failedRegions.length === 0,
      failedRegions,
    };
  }

  async failover(): Promise<string> {
    // Simple failover logic - promote first replica
    const replicas = this.getReplicaRegions();
    if (replicas.length === 0) {
      throw new Error("No replica regions available for failover");
    }

    const primaryReplica = replicas[0];
    if (!primaryReplica) {
      throw new Error("No replica regions available for failover");
    }

    return primaryReplica;
  }
}

export class BackupRecoveryManager {
  private readonly providers: Map<string, BackupProvider> = new Map();
  private readonly multiRegionManager?: MultiRegionManager;

  constructor(
    private readonly config: {
      defaultProvider?: string;
      basePath?: string;
      multiRegion?: { primaryRegion: string; replicaRegions?: string[] };
    } = {},
  ) {
    this.initializeDefaultProviders();

    if (config.multiRegion) {
      this.multiRegionManager = new MultiRegionManager(
        config.multiRegion.primaryRegion,
        config.multiRegion.replicaRegions,
      );
    }
  }

  private initializeDefaultProviders(): void {
    // Initialize filesystem provider by default
    const basePath = this.config.basePath || "./backups";
    this.providers.set("filesystem", new FileSystemBackupProvider(basePath));

    // Initialize S3 provider if AWS credentials are available
    if (
      process.env["AWS_ACCESS_KEY_ID"] &&
      process.env["AWS_SECRET_ACCESS_KEY"]
    ) {
      this.providers.set(
        "s3",
        new S3BackupProvider({
          bucket: process.env["AWS_S3_BACKUP_BUCKET"] || "envkit-backups",
          region: process.env["AWS_REGION"] || "us-east-1",
        }),
      );
    }
  }

  async createBackup(
    environment: string,
    data: unknown,
    config: BackupConfig,
  ): Promise<BackupResult> {
    const provider = this.providers.get(
      this.config.defaultProvider || "filesystem",
    );
    if (!provider) {
      throw new Error("No backup provider available");
    }

    const result = await provider.createBackup(data, config);

    // If multi-region is enabled, replicate the backup
    if (
      this.multiRegionManager &&
      config.regions &&
      config.regions.length > 1
    ) {
      await this.multiRegionManager.replicateToRegions(
        { environment, data, backupId: result.backupId },
        async (region, _replicationData) => {
          // TODO: Implement cross-region replication
          console.info(`Replicating backup to region: ${region}`);
        },
      );
    }

    return result;
  }

  async restoreBackup(backupId: string): Promise<RestoreResult> {
    // Try each provider to find the backup
    for (const provider of this.providers.values()) {
      try {
        const result = await provider.restoreBackup(backupId);
        if (result.success) {
          return result;
        }
      } catch (_error) {
        // Continue to next provider
        continue;
      }
    }

    throw new Error(`Backup not found: ${backupId}`);
  }

  async listBackups(environment?: string): Promise<BackupMetadata[]> {
    const allBackups: BackupMetadata[] = [];

    for (const provider of this.providers.values()) {
      const backups = await provider.listBackups(environment);
      allBackups.push(...backups);
    }

    return allBackups.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async cleanupExpiredBackups(): Promise<void> {
    const allBackups = await this.listBackups();

    for (const backup of allBackups) {
      const ageDays =
        (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > backup.retentionDays) {
        // Find the provider and delete
        for (const provider of this.providers.values()) {
          try {
            await provider.deleteBackup(backup.id);
            break;
          } catch (_error) {
            // Continue to next provider
            continue;
          }
        }
      }
    }
  }

  registerProvider(provider: BackupProvider): void {
    this.providers.set(provider.name, provider);
  }

  getMultiRegionManager(): MultiRegionManager | undefined {
    return this.multiRegionManager;
  }
}
