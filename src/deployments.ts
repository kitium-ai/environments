/* eslint-disable @typescript-eslint/require-await, require-await, @typescript-eslint/prefer-nullish-coalescing, unicorn/prevent-abbreviations, promise/prefer-await-to-then, promise/prefer-await-to-callbacks, max-statements */
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

export type DeploymentExecutor = {
  executeAction(
    action: DeploymentAction,
    context: DeploymentContext,
  ): Promise<DeploymentActionExecution>;
};

export type DeploymentContext = {
  executionId: string;
  pipelineId: string;
  environment: string;
  stageName: string;
  variables: Record<string, unknown>;
  secrets: Record<string, string>;
};

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getWaitSeconds = (action: DeploymentAction): number => {
  const secondsValue = action.config?.["seconds"];
  return typeof secondsValue === "number" ? secondsValue : 30;
};

const deploymentActionHandlers: Record<
  DeploymentAction["type"],
  (action: DeploymentAction, context: DeploymentContext) => Promise<string>
> = {
  provision: async (action, context) =>
    `Provisioning ${action.name} in ${context.environment}`,
  test: async (action) => `Running tests for ${action.name}`,
  validate: async (action) => `Validating ${action.name}`,
  notify: async (action) => `Sending notification: ${action.name}`,
  wait: async (action) => {
    const waitSeconds = getWaitSeconds(action);
    await sleep(waitSeconds * 1000);
    return `Waited ${waitSeconds} seconds`;
  },
  custom: async (action) => `Executing custom action: ${action.name}`,
};

export class DefaultDeploymentExecutor implements DeploymentExecutor {
  async executeAction(
    action: DeploymentAction,
    context: DeploymentContext,
  ): Promise<DeploymentActionExecution> {
    const startedAt = new Date();

    try {
      const output = await deploymentActionHandlers[action.type](action, context);

      return {
        actionName: action.name,
        status: "completed",
        output,
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
      };
    } catch (error) {
      return {
        actionName: action.name,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
      };
    }
  }
}

export class DeploymentPipelineManager {
  private readonly pipelines: Map<string, DeploymentPipeline> = new Map();
  private readonly executions: Map<string, DeploymentExecution> = new Map();
  private readonly executor: DeploymentExecutor;

  constructor(executor: DeploymentExecutor = new DefaultDeploymentExecutor()) {
    this.executor = executor;
  }

  createPipeline(
    pipeline: Omit<DeploymentPipeline, "id" | "createdAt" | "updatedAt">,
  ): string {
    const id = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newPipeline: DeploymentPipeline = {
      ...pipeline,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.pipelines.set(id, newPipeline);
    return id;
  }

  getPipeline(id: string): DeploymentPipeline | undefined {
    return this.pipelines.get(id);
  }

  updatePipeline(id: string, updates: Partial<DeploymentPipeline>): boolean {
    const pipeline = this.pipelines.get(id);
    if (!pipeline) {
      return false;
    }

    this.pipelines.set(id, {
      ...pipeline,
      ...updates,
      updatedAt: new Date(),
    });
    return true;
  }

  deletePipeline(id: string): boolean {
    return this.pipelines.delete(id);
  }

  listPipelines(): DeploymentPipeline[] {
    return Array.from(this.pipelines.values());
  }

  async executePipeline(
    pipelineId: string,
    environment: string,
    triggeredBy: string,
    variables: Record<string, unknown> = {},
    secrets: Record<string, string> = {},
  ): Promise<string> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    if (!pipeline.environments.includes(environment)) {
      throw new Error(
        `Environment ${environment} not allowed for pipeline ${pipelineId}`,
      );
    }

    const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const execution: DeploymentExecution = {
      id: executionId,
      pipelineId,
      environment,
      status: "pending",
      stages: pipeline.stages.map((stage) => ({
        stageName: stage.name,
        status: "pending",
        actions: stage.actions.map((action) => ({
          actionName: action.name,
          status: "pending",
        })),
      })),
      startedAt: new Date(),
      triggeredBy,
    };

    this.executions.set(executionId, execution);

    // Start execution asynchronously
    this.runExecution(execution, variables, secrets).catch((error) => {
      console.error(`Execution ${executionId} failed:`, error);
      execution.status = "failed";
      execution.completedAt = new Date();
    });

    return executionId;
  }

  private async runExecution(
    execution: DeploymentExecution,
    variables: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<void> {
    execution.status = "running";

    const pipeline = this.getPipelineForExecution(execution);
    let stageIndex = 0;

    for (const stage of pipeline.stages) {
      const stageExecution = execution.stages[stageIndex];
      if (!stageExecution) {
        throw new Error(`Invalid stage execution state at index ${stageIndex}`);
      }

      const shouldContinue = await this.runStageExecution(
        execution,
        stage,
        stageExecution,
        variables,
        secrets,
      );

      stageIndex += 1;
      if (!shouldContinue) {
        break;
      }
    }

    execution.status = execution.stages.every((s) => s.status === "completed")
      ? "completed"
      : "failed";
    execution.completedAt = new Date();
  }

  private getPipelineForExecution(execution: DeploymentExecution): DeploymentPipeline {
    const pipeline = this.pipelines.get(execution.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${execution.pipelineId}`);
    }
    return pipeline;
  }

  private async runStageExecution(
    execution: DeploymentExecution,
    stage: DeploymentStage,
    stageExecution: DeploymentStageExecution,
    variables: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<boolean> {
    stageExecution.status = "running";
    stageExecution.startedAt = new Date();

    try {
      if (stage.requiresApproval) {
        stageExecution.status = "pending";
        await sleep(1000);
        stageExecution.status = "running";
      }

      const allSucceeded = await this.runStageActions(
        execution,
        stage,
        stageExecution,
        variables,
        secrets,
      );

      if (!allSucceeded) {
        stageExecution.status = "failed";
        if (stage.rollbackOnFailure) {
          console.info(`Rolling back stage: ${stage.name}`);
        }
        stageExecution.completedAt = new Date();
        return false;
      }

      stageExecution.status = "completed";
      stageExecution.completedAt = new Date();
      return true;
    } catch (error) {
      stageExecution.status = "failed";
      stageExecution.error =
        error instanceof Error ? error.message : String(error);
      stageExecution.completedAt = new Date();
      return false;
    }
  }

  private async runStageActions(
    execution: DeploymentExecution,
    stage: DeploymentStage,
    stageExecution: DeploymentStageExecution,
    variables: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<boolean> {
    let actionIndex = 0;
    for (const action of stage.actions) {
      const actionExecution = stageExecution.actions[actionIndex];
      if (!actionExecution) {
        stageExecution.error = `Invalid action execution state at index ${actionIndex}`;
        return false;
      }

      const succeeded = await this.runSingleAction(
        execution,
        stage,
        action,
        actionExecution,
        variables,
        secrets,
      );

      if (!succeeded) {
        return false;
      }

      actionIndex += 1;
    }

    return true;
  }

  private async runSingleAction(
    execution: DeploymentExecution,
    stage: DeploymentStage,
    action: DeploymentAction,
    actionExecution: DeploymentActionExecution,
    variables: Record<string, unknown>,
    secrets: Record<string, string>,
  ): Promise<boolean> {
    actionExecution.status = "running";
    actionExecution.startedAt = new Date();

    const context: DeploymentContext = {
      executionId: execution.id,
      pipelineId: execution.pipelineId,
      environment: execution.environment,
      stageName: stage.name,
      variables,
      secrets,
    };

    try {
      const result = await this.executor.executeAction(action, context);
      actionExecution.status = result.status;
      this.applyActionResult(actionExecution, result);
      return result.status === "completed";
    } catch (error) {
      actionExecution.status = "failed";
      actionExecution.error =
        error instanceof Error ? error.message : String(error);
      return false;
    }
  }

  private applyActionResult(
    actionExecution: DeploymentActionExecution,
    result: DeploymentActionExecution,
  ): void {
    if (result.output !== undefined) {
      actionExecution.output = result.output;
    }
    if (result.error !== undefined) {
      actionExecution.error = result.error;
    }
    if (result.completedAt !== undefined) {
      actionExecution.completedAt = result.completedAt;
    }
    if (result.durationMs !== undefined) {
      actionExecution.durationMs = result.durationMs;
    }
  }

  getExecution(id: string): DeploymentExecution | undefined {
    return this.executions.get(id);
  }

  listExecutions(
    pipelineId?: string,
    environment?: string,
  ): DeploymentExecution[] {
    let executions = Array.from(this.executions.values());

    if (pipelineId) {
      executions = executions.filter((e) => e.pipelineId === pipelineId);
    }

    if (environment) {
      executions = executions.filter((e) => e.environment === environment);
    }

    return executions.sort(
      (a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0),
    );
  }

  async approveStage(
    executionId: string,
    stageName: string,
    approvedBy: string,
    comment?: string,
  ): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    const stageExecution = execution.stages.find(
      (s) => s.stageName === stageName,
    );
    if (stageExecution?.status !== "pending") {
      return false;
    }

    execution.approvals = execution.approvals || [];
    execution.approvals.push({
      stageName,
      approvedBy,
      approvedAt: new Date(),
      ...(comment !== undefined ? { comment } : {}),
    });

    // Resume execution
    stageExecution.status = "running";

    return true;
  }
}

export class ChangeManagementSystem {
  private readonly changeRequests: Map<string, ChangeRequest> = new Map();

  createChangeRequest(
    request: Omit<ChangeRequest, "id" | "status" | "createdAt" | "comments">,
  ): string {
    const id = `cr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const changeRequest: ChangeRequest = {
      ...request,
      id,
      status: "draft",
      createdAt: new Date(),
      comments: [],
    };

    this.changeRequests.set(id, changeRequest);
    return id;
  }

  getChangeRequest(id: string): ChangeRequest | undefined {
    return this.changeRequests.get(id);
  }

  updateChangeRequest(id: string, updates: Partial<ChangeRequest>): boolean {
    const request = this.changeRequests.get(id);
    if (!request) {
      return false;
    }

    this.changeRequests.set(id, { ...request, ...updates });
    return true;
  }

  submitForReview(id: string): boolean {
    const request = this.changeRequests.get(id);
    if (request?.status !== "draft") {
      return false;
    }

    request.status = "pending_review";
    return true;
  }

  approveChangeRequest(id: string, reviewedBy: string): boolean {
    const request = this.changeRequests.get(id);
    if (request?.status !== "pending_review") {
      return false;
    }

    request.status = "approved";
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date();
    return true;
  }

  rejectChangeRequest(id: string, reviewedBy: string): boolean {
    const request = this.changeRequests.get(id);
    if (request?.status !== "pending_review") {
      return false;
    }

    request.status = "rejected";
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date();
    return true;
  }

  implementChangeRequest(id: string): boolean {
    const request = this.changeRequests.get(id);
    if (request?.status !== "approved") {
      return false;
    }

    request.status = "implemented";
    request.implementedAt = new Date();
    return true;
  }

  addComment(
    id: string,
    comment: Omit<ChangeComment, "id" | "createdAt">,
  ): boolean {
    const request = this.changeRequests.get(id);
    if (!request) {
      return false;
    }

    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    request.comments = request.comments || [];
    request.comments.push({
      ...comment,
      id: commentId,
      createdAt: new Date(),
    });

    return true;
  }

  listChangeRequests(
    status?: ChangeRequest["status"],
    environment?: string,
  ): ChangeRequest[] {
    let requests = Array.from(this.changeRequests.values());

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    if (environment) {
      requests = requests.filter((r) => r.environment === environment);
    }

    return requests.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
