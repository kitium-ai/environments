/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/require-await, require-await, unicorn/prevent-abbreviations, @typescript-eslint/prefer-nullish-coalescing */
export type AuditEventType =
  | "environment_create"
  | "environment_update"
  | "environment_delete"
  | "secret_fetch"
  | "secret_rotate"
  | "provision_start"
  | "provision_complete"
  | "provision_failed"
  | "auth_success"
  | "auth_failure"
  | "access_denied";

export type AuditEvent = {
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
};

export type ComplianceReport = {
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    uniqueResources: number;
  };
  violations: ComplianceViolation[];
  recommendations: string[];
};

export type ComplianceViolation = {
  id: string;
  type: "security" | "compliance" | "operational";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  event: AuditEvent;
  remediation?: string;
};

export type AuditSink = {
  write(event: AuditEvent): Promise<void>;
  query(filter: AuditQuery): Promise<AuditEvent[]>;
  export(
    format: "json" | "csv" | "parquet",
    filter?: AuditQuery,
  ): Promise<string>;
};

export type AuditQuery = {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  eventType?: AuditEventType;
  resource?: string;
  success?: boolean;
  limit?: number;
};

export class MemoryAuditSink implements AuditSink {
  private events: AuditEvent[] = [];
  private readonly maxEvents: number;

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents;
  }

  async write(event: AuditEvent): Promise<void> {
    this.events.push(event);

    // Maintain max size with FIFO eviction
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  async query(filter: AuditQuery): Promise<AuditEvent[]> {
    let results = this.events;

    if (filter.startDate) {
      results = results.filter((event) => event.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      results = results.filter((event) => event.timestamp <= filter.endDate!);
    }
    if (filter.userId) {
      results = results.filter((event) => event.userId === filter.userId);
    }
    if (filter.eventType) {
      results = results.filter((event) => event.type === filter.eventType);
    }
    if (filter.resource) {
      results = results.filter((event) => event.resource === filter.resource);
    }
    if (filter.success !== undefined) {
      results = results.filter((event) => event.success === filter.success);
    }

    if (filter.limit) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  async export(
    format: "json" | "csv" | "parquet",
    filter?: AuditQuery,
  ): Promise<string> {
    const events = filter ? await this.query(filter) : this.events;

    switch (format) {
      case "json":
        return JSON.stringify(events, null, 2);

      case "csv": {
        if (events.length === 0) {
          return "";
        }
        const firstEvent = events[0];
        if (!firstEvent) {
          return "";
        }
        const headers = Object.keys(firstEvent).join(",");
        const rows = events.map((event) =>
          Object.values(event)
            .map((value) =>
              typeof value === "object" ? JSON.stringify(value) : String(value),
            )
            .join(","),
        );
        return [headers, ...rows].join("\n");
      }

      case "parquet":
        // TODO: Implement actual Parquet export
        // For now, return JSON
        return JSON.stringify(events, null, 2);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

export class FileAuditSink implements AuditSink {
  constructor(private readonly filePath: string) {
    // Mark filePath as used to avoid unused variable warning
    void this.filePath;
  }

  async write(event: AuditEvent): Promise<void> {
    // TODO: Implement file-based audit logging
    // Using console.info as per lint rules (console.log is not allowed)
    console.info(
      `Audit event: ${event.type} - ${event.resource} - ${event.success}`,
    );
  }

  async query(_filter: AuditQuery): Promise<AuditEvent[]> {
    // TODO: Implement file-based querying
    return [];
  }

  async export(
    _format: "json" | "csv" | "parquet",
    _filter?: AuditQuery,
  ): Promise<string> {
    // TODO: Implement file-based export
    return "[]";
  }
}

export class ComplianceAuditor {
  constructor(private readonly auditSink: AuditSink) {}

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    tenant?: string,
  ): Promise<ComplianceReport> {
    const events = await this.auditSink.query({
      startDate,
      endDate,
      ...(tenant && { userId: tenant }), // Using userId as tenant filter for now
    });

    const violations = this.detectViolations(events);
    const recommendations = this.generateRecommendations(violations, events);

    return {
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: events.length,
        successfulEvents: events.filter((event) => event.success).length,
        failedEvents: events.filter((event) => !event.success).length,
        uniqueUsers: new Set(events.map((event) => event.userId).filter(Boolean)).size,
        uniqueResources: new Set(events.map((event) => event.resource)).size,
      },
      violations,
      recommendations,
    };
  }

  private detectViolations(events: AuditEvent[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for failed authentication attempts
    const failedAuths = events.filter((e) => e.type === "auth_failure");
    if (failedAuths.length > 10) {
      // Arbitrary threshold
      const firstFailedAuth = failedAuths[0];
      if (firstFailedAuth) {
        violations.push({
          id: `auth-failures-${Date.now()}`,
          type: "security",
          severity: "high",
          description: `High number of failed authentication attempts: ${failedAuths.length}`,
          event: firstFailedAuth,
          remediation: "Review authentication logs and implement rate limiting",
        });
      }
    }

    // Check for access denied events
    const accessDenied = events.filter((e) => e.type === "access_denied");
    if (accessDenied.length > 5) {
      const firstAccessDenied = accessDenied[0];
      if (firstAccessDenied) {
        violations.push({
          id: `access-denied-${Date.now()}`,
          type: "security",
          severity: "medium",
          description: `Multiple access denied events: ${accessDenied.length}`,
          event: firstAccessDenied,
          remediation: "Review RBAC permissions and user roles",
        });
      }
    }

    // Check for secrets access without proper authorization
    const secretAccess = events.filter(
      (e) => e.type === "secret_fetch" && !e.success,
    );
    if (secretAccess.length > 0) {
      const firstSecretAccess = secretAccess[0];
      if (firstSecretAccess) {
        violations.push({
          id: `secret-access-${Date.now()}`,
          type: "security",
          severity: "critical",
          description: `Unauthorized secret access attempts: ${secretAccess.length}`,
          event: firstSecretAccess,
          remediation: "Immediate security review required",
        });
      }
    }

    return violations;
  }

  private generateRecommendations(
    violations: ComplianceViolation[],
    events: AuditEvent[],
  ): string[] {
    const recommendations: string[] = [];

    if (violations.some((v) => v.type === "security")) {
      recommendations.push("Implement multi-factor authentication");
      recommendations.push("Review and tighten RBAC permissions");
      recommendations.push("Enable audit log encryption");
    }

    const totalEvents = events.length;
    const failedEvents = events.filter((e) => !e.success).length;
    const failureRate =
      totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0;

    if (failureRate > 20) {
      recommendations.push(
        "Investigate high failure rate - possible configuration or permission issues",
      );
    }

    if (events.filter((e) => e.type === "secret_rotate").length === 0) {
      recommendations.push("Implement automated secret rotation policies");
    }

    return recommendations;
  }
}

export class AuditLogger {
  constructor(
    private readonly sink: AuditSink,
    private readonly config: {
      includeSensitiveData?: boolean;
      correlationIdGenerator?: () => string;
    } = {},
  ) {}

  async log(event: Omit<AuditEvent, "id" | "timestamp">): Promise<void> {
    const correlationId =
      event.correlationId || this.config.correlationIdGenerator?.();

    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
      ...(correlationId && { correlationId }),
    };

    await this.sink.write(auditEvent);
  }

  async query(filter: AuditQuery): Promise<AuditEvent[]> {
    return await this.sink.query(filter);
  }

  async exportComplianceReport(
    startDate: Date,
    endDate: Date,
    tenant?: string,
  ): Promise<ComplianceReport> {
    const auditor = new ComplianceAuditor(this.sink);
    return await auditor.generateComplianceReport(startDate, endDate, tenant);
  }

  private generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
