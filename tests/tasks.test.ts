import { describe, expect, it } from "vitest";
import type { IssueGateway, TaskIssue } from "../src/github";
import { capabilityGrantsFrom, TaskService } from "../src/tasks";
import { manifest } from "./fixtures";

class FakeGateway implements IssueGateway {
  issues = new Map<number, TaskIssue>();
  comments = new Map<number, string[]>();
  next = 1;

  async create(input: { title: string; body: string; labels: string[] }) {
    const number = this.next++;
    const issue: TaskIssue = {
      number,
      title: input.title,
      body: input.body,
      state: "open",
      labels: input.labels,
      htmlUrl: `https://github.com/owner/private-home/issues/${number}`,
      updatedAt: new Date(0).toISOString(),
    };
    this.issues.set(number, issue);
    return structuredClone(issue);
  }

  async get(number: number) {
    const issue = this.issues.get(number);
    if (!issue) throw new Error("Not found");
    return structuredClone(issue);
  }

  async list(input: { state: "open" | "closed" | "all"; labels?: string[] }) {
    return [...this.issues.values()].filter((issue) => {
      const stateMatches = input.state === "all" || issue.state === input.state;
      const labelsMatch = !input.labels || input.labels.every((label) => issue.labels.includes(label));
      return stateMatches && labelsMatch;
    }).map((issue) => structuredClone(issue));
  }

  async update(number: number, input: { state?: "open" | "closed"; labels?: string[] }) {
    const issue = await this.get(number);
    const updated = { ...issue, ...input };
    this.issues.set(number, updated);
    return structuredClone(updated);
  }

  async comment(number: number, body: string) {
    this.comments.set(number, [...(this.comments.get(number) ?? []), body]);
  }
}

function taskInput() {
  return {
    title: "Ship a release checklist",
    desiredOutcome: "A reviewable release checklist exists.",
    constraints: "Do not deploy or merge.",
    acceptanceCriteria: ["Checklist is linked from a pull request"],
    priority: "normal" as const,
    capabilityGrants: ["github.issues.write"],
  };
}

describe("task lifecycle", () => {
  it("creates, claims, updates, blocks, and completes one canonical issue", async () => {
    const gateway = new FakeGateway();
    const service = new TaskService(manifest(), gateway, "owner");

    const created = await service.createTask(taskInput());
    expect(created.labels).toEqual(["agent:inbox"]);
    expect(capabilityGrantsFrom(created.body)).toEqual(["github.issues.write"]);

    const claimed = await service.claimTask(created.number);
    expect(claimed.labels).toEqual(["agent:active"]);

    await service.updateTask(created.number, "Drafted the checklist.", "npm test passed");
    const blocked = await service.blockTask(created.number, "Needs owner choice.", "Owner selects release date.");
    expect(blocked.labels).toEqual(["agent:blocked"]);

    const completed = await service.completeTask(
      created.number,
      ["npm run check passed"],
      ["https://github.com/owner/private-home/pull/7"],
    );
    expect(completed.state).toBe("closed");
    expect(completed.labels).toEqual(["agent:done"]);
    expect(gateway.comments.get(created.number)).toHaveLength(5);
    expect(gateway.comments.get(created.number)?.at(-1)).toContain("Action: complete");
    expect(gateway.comments.get(created.number)?.at(-1)).toContain("pull/7");
  });

  it("enforces both instance and task capability grants", async () => {
    const gateway = new FakeGateway();
    const denied = new TaskService(manifest({ "github.issues.write": "deny" }), gateway, "owner");
    await expect(denied.createTask(taskInput())).rejects.toThrow("Capability denied");

    const service = new TaskService(manifest(), gateway, "owner");
    const malformed = await gateway.create({ title: "No grant", body: "## Enabled capability grants\n", labels: ["agent:inbox"] });
    await expect(service.claimTask(malformed.number)).rejects.toThrow("does not grant github.issues.write");
  });

  it("requires concrete completion evidence", async () => {
    const gateway = new FakeGateway();
    const service = new TaskService(manifest(), gateway, "owner");
    const created = await service.createTask(taskInput());
    await expect(service.completeTask(created.number, [])).rejects.toThrow("at least one concrete evidence");
  });
});
