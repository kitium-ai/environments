/* eslint-disable @typescript-eslint/require-await, require-await */
export type MetricType = "counter" | "gauge" | "histogram" | "summary";

export type Metric = {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
  description?: string;
};

export type AlertRule = {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
  cooldownMinutes: number;
  lastTriggered?: Date;
};

export type Alert = {
  id: string;
  ruleId: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  labels?: Record<string, string>;
  resolved?: boolean;
  resolvedAt?: Date;
};

export type HealthStatus = {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  checks: HealthCheck[];
  timestamp: Date;
};

export type HealthCheck = {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
  durationMs: number;
  timestamp: Date;
};

export type MetricsSink = {
  record(metric: Metric): Promise<void>;
  query(
    name: string,
    labels?: Record<string, string>,
    start?: Date,
    end?: Date,
  ): Promise<Metric[]>;
};

export type AlertSink = {
  createAlert(alert: Omit<Alert, "id">): Promise<string>;
  resolveAlert(alertId: string): Promise<void>;
  getActiveAlerts(): Promise<Alert[]>;
};

export class InMemoryMetricsSink implements MetricsSink {
  private metrics: Metric[] = [];
  private readonly maxMetrics: number;

  constructor(maxMetrics = 10000) {
    this.maxMetrics = maxMetrics;
  }

  async record(metric: Metric): Promise<void> {
    this.metrics.push(metric);

    // Maintain max size with FIFO eviction
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  async query(
    name: string,
    labels?: Record<string, string>,
    start?: Date,
    end?: Date,
  ): Promise<Metric[]> {
    let results = this.metrics.filter((m) => m.name === name);

    if (labels) {
      results = results.filter((m) =>
        Object.entries(labels).every(
          ([key, value]) => m.labels?.[key] === value,
        ),
      );
    }

    if (start) {
      results = results.filter((m) => m.timestamp >= start);
    }

    if (end) {
      results = results.filter((m) => m.timestamp <= end);
    }

    return results;
  }
}

export class ConsoleAlertSink implements AlertSink {
  async createAlert(alert: Omit<Alert, "id">): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.info(
      `🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`,
    );

    if (alert.labels) {
      console.info(`   Labels: ${JSON.stringify(alert.labels)}`);
    }

    return alertId;
  }

  async resolveAlert(alertId: string): Promise<void> {
    console.info(`✅ ALERT RESOLVED: ${alertId}`);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    // In-memory implementation doesn't persist alerts
    return [];
  }
}

export class MetricsCollector {
  constructor(private readonly sink: MetricsSink) {}

  async recordCounter(
    name: string,
    value = 1,
    labels?: Record<string, string>,
  ): Promise<void> {
    await this.sink.record({
      name,
      type: "counter",
      value,
      ...(labels !== undefined ? { labels } : {}),
      timestamp: new Date(),
    });
  }

  async recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): Promise<void> {
    await this.sink.record({
      name,
      type: "gauge",
      value,
      ...(labels !== undefined ? { labels } : {}),
      timestamp: new Date(),
    });
  }

  async recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): Promise<void> {
    await this.sink.record({
      name,
      type: "histogram",
      value,
      ...(labels !== undefined ? { labels } : {}),
      timestamp: new Date(),
    });
  }

  async recordTiming(
    name: string,
    durationMs: number,
    labels?: Record<string, string>,
  ): Promise<void> {
    await this.recordHistogram(`${name}_duration`, durationMs, labels);
  }

  async queryMetrics(
    name: string,
    labels?: Record<string, string>,
    hours = 24,
  ): Promise<Metric[]> {
    const start = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.sink.query(name, labels, start);
  }
}

export class AlertManager {
  private readonly rules: Map<string, AlertRule> = new Map();
  private readonly activeAlerts: Map<string, Alert> = new Map();

  constructor(private readonly alertSink: AlertSink) {}

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  async evaluateRules(metrics: MetricsCollector): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      try {
        const shouldTrigger = await this.evaluateCondition(rule, metrics);
        if (shouldTrigger) {
          const alertId = await this.alertSink.createAlert({
            ruleId: rule.id,
            message: `${rule.name}: Condition met (${rule.condition})`,
            severity: rule.severity,
            timestamp: new Date(),
            labels: { rule: rule.id },
          });

          // Mark rule as triggered
          rule.lastTriggered = new Date();

          // Store active alert
          this.activeAlerts.set(alertId, {
            id: alertId,
            ruleId: rule.id,
            message: `${rule.name}: Condition met (${rule.condition})`,
            severity: rule.severity,
            timestamp: new Date(),
            labels: { rule: rule.id },
          });
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateCondition(
    rule: AlertRule,
    metrics: MetricsCollector,
  ): Promise<boolean> {
    // Simple condition evaluation - in real implementation, this would be more sophisticated
    const [metricName, operator, threshold] = rule.condition.split(" ");

    if (!metricName || !operator || !threshold) {
      return false;
    }

    const recentMetrics = await metrics.queryMetrics(metricName, {}, 1); // Last hour
    if (recentMetrics.length === 0) {
      return false;
    }

    const latestMetric = recentMetrics[recentMetrics.length - 1];
    if (!latestMetric) {
      return false;
    }
    const latestValue = latestMetric.value;
    const thresholdValue = parseFloat(threshold);

    switch (operator) {
      case ">":
        return latestValue > thresholdValue;
      case "<":
        return latestValue < thresholdValue;
      case ">=":
        return latestValue >= thresholdValue;
      case "<=":
        return latestValue <= thresholdValue;
      case "==":
        return latestValue === thresholdValue;
      default:
        return false;
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      await this.alertSink.resolveAlert(alertId);
      this.activeAlerts.delete(alertId);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }
}

export class HealthMonitor {
  private readonly checks: Map<string, () => Promise<HealthCheck>> = new Map();

  addCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.checks.set(name, checkFn);
  }

  async runHealthChecks(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];
    let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

    for (const [name, checkFn] of this.checks) {
      try {
        const check = await checkFn();
        checks.push(check);

        if (check.status === "fail") {
          overallStatus = "unhealthy";
        } else if (check.status === "warn" && overallStatus === "healthy") {
          overallStatus = "degraded";
        }
      } catch (error) {
        checks.push({
          name,
          status: "fail",
          message: error instanceof Error ? error.message : "Unknown error",
          durationMs: 0,
          timestamp: new Date(),
        });
        overallStatus = "unhealthy";
      }
    }

    return {
      service: "envkit",
      status: overallStatus,
      checks,
      timestamp: new Date(),
    };
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return this.runHealthChecks();
  }
}

export class ObservabilityManager {
  private readonly metrics: MetricsCollector;
  private readonly alerts: AlertManager;
  private readonly health: HealthMonitor;

  constructor(
    metricsSink: MetricsSink = new InMemoryMetricsSink(),
    alertSink: AlertSink = new ConsoleAlertSink(),
  ) {
    this.metrics = new MetricsCollector(metricsSink);
    this.alerts = new AlertManager(alertSink);
    this.health = new HealthMonitor();

    this.initializeDefaultChecks();
    this.initializeDefaultAlertRules();
  }

  private initializeDefaultChecks(): void {
    // Add basic health checks
    this.health.addCheck("memory", async () => {
      const start = Date.now();
      const memUsage = process.memoryUsage();
      const duration = Date.now() - start;

      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

      return {
        name: "memory",
        status: heapUsedMB > heapTotalMB * 0.9 ? "warn" : "pass",
        message: `Heap: ${heapUsedMB.toFixed(1)}MB used of ${heapTotalMB.toFixed(1)}MB`,
        durationMs: duration,
        timestamp: new Date(),
      };
    });

    this.health.addCheck("uptime", async () => {
      const start = Date.now();
      const uptime = process.uptime();
      const duration = Date.now() - start;

      return {
        name: "uptime",
        status: "pass",
        message: `Process uptime: ${uptime.toFixed(0)} seconds`,
        durationMs: duration,
        timestamp: new Date(),
      };
    });
  }

  private initializeDefaultAlertRules(): void {
    // Add default alert rules
    this.alerts.addRule({
      id: "high-memory-usage",
      name: "High Memory Usage",
      condition: "memory_usage > 90",
      threshold: 90,
      severity: "high",
      enabled: true,
      cooldownMinutes: 5,
    });

    this.alerts.addRule({
      id: "provision-failures",
      name: "Provision Failures",
      condition: "provision_failures > 5",
      threshold: 5,
      severity: "critical",
      enabled: true,
      cooldownMinutes: 10,
    });
  }

  // Metrics recording methods
  async recordOperation(
    operation: string,
    success: boolean,
    durationMs: number,
    labels?: Record<string, string>,
  ): Promise<void> {
    const status = success ? "success" : "failure";

    await this.metrics.recordCounter(`operation_total`, 1, {
      operation,
      status,
      ...labels,
    });
    await this.metrics.recordTiming(`operation_duration`, durationMs, {
      operation,
      ...labels,
    });

    if (!success) {
      await this.metrics.recordCounter(`operation_failures`, 1, {
        operation,
        ...labels,
      });
    }
  }

  async recordGauge(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): Promise<void> {
    await this.metrics.recordGauge(name, value, labels);
  }

  // Alert management
  addAlertRule(rule: AlertRule): void {
    this.alerts.addRule(rule);
  }

  async evaluateAlerts(): Promise<void> {
    await this.alerts.evaluateRules(this.metrics);
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.getActiveAlerts();
  }

  // Health monitoring
  addHealthCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
    this.health.addCheck(name, checkFn);
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return this.health.getHealthStatus();
  }

  // Query methods
  async queryMetrics(
    name: string,
    labels?: Record<string, string>,
    hours = 24,
  ): Promise<Metric[]> {
    return this.metrics.queryMetrics(name, labels, hours);
  }

  // Getters for internal components
  getMetricsCollector(): MetricsCollector {
    return this.metrics;
  }

  getAlertManager(): AlertManager {
    return this.alerts;
  }

  getHealthMonitor(): HealthMonitor {
    return this.health;
  }
}
