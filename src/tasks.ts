import type { AgentHomeManifest } from "./config";
import { requireCapability } from "./config";
import type { IssueGateway, TaskIssue } from "./github";

export const taskLabels = ["agent:inbox", "agent:active", "agent:blocked", "agent:done"] as const;
export type TaskStatus = typeof taskLabels[number];
export type Priority = "critical" | "high" | "normal" | "low";

export interface CreateTaskInput {
  title: string;
  desiredOutcome: string;
  constraints: string;
  acceptanceCriteria: string[];
  priority: Priority;
  capabilityGrants: string[];
}

function bodyFor(input: CreateTaskInput): string {
  return [
    "## Desired outcome",
    input.desiredOutcome.trim(),
    "",
    "## Constraints",
    input.constraints.trim(),
    "",
    "## Acceptance criteria",
    ...input.acceptanceCriteria.map((criterion) => `- [ ] ${criterion.trim()}`),
    "",
    "## Priority",
    input.priority,
    "",
    "## Enabled capability grants",
    ...input.capabilityGrants.map((capability) => `- \`${capability}\``),
  ].join("\n");
}

export function capabilityGrantsFrom(body: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => /^#{2,3} Enabled capability grants\s*$/i.test(line));
  if (start === -1) return [];
  const endOffset = lines.slice(start + 1).findIndex((line) => /^#{2,3} /.test(line));
  const section = lines.slice(start + 1, endOffset === -1 ? undefined : start + 1 + endOffset);
  return section.flatMap((line) => {
    const match = line.match(/^- (?:\[[xX]\] )?`([a-z][a-z0-9._-]+)`\s*$/);
    return match ? [match[1]] : [];
  });
}

function nextLabels(issue: TaskIssue, status: TaskStatus): string[] {
  return [...issue.labels.filter((label) => !taskLabels.includes(label as TaskStatus)), status];
}

function event(action: string, result: "verified" | "partial" | "blocked", evidence: string, actor: string): string {
  return [
    "### Agent event",
    `- Action: ${action}`,
    `- Result: ${result}`,
    `- Evidence: ${evidence.trim() || "none"}`,
    `- Actor: @${actor}`,
  ].join("\n");
}

export class TaskService {
  constructor(
    private readonly manifest: AgentHomeManifest,
    private readonly gateway: IssueGateway,
    private readonly actor: string,
  ) {}

  private requireRead(): void {
    requireCapability(this.manifest, "github.issues.read");
  }

  private requireWrite(): void {
    requireCapability(this.manifest, "github.issues.write");
  }

  private async writableTask(number: number): Promise<TaskIssue> {
    this.requireWrite();
    const issue = await this.gateway.get(number);
    if (!capabilityGrantsFrom(issue.body).includes("github.issues.write")) {
      throw new Error(`Task #${number} does not grant github.issues.write`);
    }
    return issue;
  }

  async createTask(input: CreateTaskInput): Promise<TaskIssue> {
    this.requireWrite();
    if (!input.capabilityGrants.includes("github.issues.write")) {
      throw new Error("A mutable task must explicitly grant github.issues.write");
    }
    for (const capability of input.capabilityGrants) requireCapability(this.manifest, capability);
    const issue = await this.gateway.create({
      title: input.title.trim(),
      body: bodyFor(input),
      labels: ["agent:inbox"],
    });
    await this.gateway.comment(issue.number, event("create", "verified", "Task created in agent:inbox.", this.actor));
    return issue;
  }

  async listTasks(status?: TaskStatus): Promise<TaskIssue[]> {
    this.requireRead();
    return this.gateway.list({
      state: status === "agent:done" ? "closed" : status ? "open" : "all",
      labels: status ? [status] : undefined,
    });
  }

  async getTask(number: number): Promise<TaskIssue> {
    this.requireRead();
    return this.gateway.get(number);
  }

  async claimTask(number: number): Promise<TaskIssue> {
    const issue = await this.writableTask(number);
    if (issue.state === "closed") throw new Error(`Task #${number} is already closed`);
    if (issue.labels.includes("agent:active")) return issue;
    await this.gateway.comment(number, event("claim", "verified", "Task moved to agent:active.", this.actor));
    return this.gateway.update(number, { labels: nextLabels(issue, "agent:active") });
  }

  async updateTask(number: number, progress: string, evidence = ""): Promise<TaskIssue> {
    const issue = await this.writableTask(number);
    if (issue.state === "closed") throw new Error(`Task #${number} is already closed`);
    await this.gateway.comment(number, event("progress", "partial", `${progress.trim()}${evidence ? ` — ${evidence.trim()}` : ""}`, this.actor));
    return this.gateway.get(number);
  }

  async blockTask(number: number, reason: string, unblockCondition: string): Promise<TaskIssue> {
    const issue = await this.writableTask(number);
    if (issue.state === "closed") throw new Error(`Task #${number} is already closed`);
    await this.gateway.comment(number, event("block", "blocked", `${reason.trim()} Unblock when: ${unblockCondition.trim()}`, this.actor));
    return this.gateway.update(number, { labels: nextLabels(issue, "agent:blocked") });
  }

  async completeTask(number: number, evidence: string[], links: string[] = []): Promise<TaskIssue> {
    const issue = await this.writableTask(number);
    if (issue.state === "closed" && issue.labels.includes("agent:done")) return issue;
    if (issue.state === "closed") throw new Error(`Task #${number} is already closed without agent:done`);
    if (evidence.length === 0 || evidence.some((item) => !item.trim())) {
      throw new Error("Completion requires at least one concrete evidence item");
    }
    const evidenceText = [
      ...evidence.map((item) => item.trim()),
      ...links.map((link) => link.trim()),
    ].join("; ");
    await this.gateway.comment(number, event("complete", "verified", evidenceText, this.actor));
    return this.gateway.update(number, { state: "closed", labels: nextLabels(issue, "agent:done") });
  }
}
