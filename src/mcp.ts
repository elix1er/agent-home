import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { authenticatedLogin, OAuthScopeError, requireScope } from "./auth";
import type { AgentHomeManifest } from "./config";
import { GitHubIssueGateway } from "./github";
import { TaskService, taskLabels } from "./tasks";

const readSecurity = [{ type: "oauth2", scopes: ["tasks:read"] }];
const writeSecurity = [{ type: "oauth2", scopes: ["tasks:write"] }];

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown task error";
  const result: {
    isError: true;
    content: Array<{ type: "text"; text: string }>;
    _meta?: Record<string, unknown>;
  } = { isError: true, content: [{ type: "text", text: message }] };
  if (error instanceof OAuthScopeError) {
    const baseUrl = process.env.AGENT_HOME_URL?.replace(/\/$/, "") ?? "";
    result._meta = {
      "mcp/www_authenticate": [
        `Bearer scope="${error.scope}", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      ],
    };
  }
  return result;
}

function service(manifest: AgentHomeManifest, ctx: ServerContext): TaskService {
  const login = authenticatedLogin(ctx.http?.authInfo);
  return new TaskService(
    manifest,
    new GitHubIssueGateway(manifest.instance.github.owner, manifest.instance.github.repository),
    login,
  );
}

function toolMeta(scopes: string[]) {
  return { securitySchemes: [{ type: "oauth2", scopes }] };
}

export function registerAgentHomeTools(server: McpServer, manifest: AgentHomeManifest): void {
  server.registerTool(
    "get_home_context",
    {
      title: "Get agent-home context",
      description: "Read the configured identity, goal, repository, and allowed capability names.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      _meta: toolMeta(["tasks:read"]),
    },
    async (_input, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:read");
        return text({
          repository: `${manifest.instance.github.owner}/${manifest.instance.github.repository}`,
          identity: readFileSync(join(process.cwd(), "identity.md"), "utf8"),
          goal: readFileSync(join(process.cwd(), "goal.md"), "utf8"),
          allowedCapabilities: Object.entries(manifest.autonomy.capabilities)
            .filter(([, value]) => value === "allow")
            .map(([name]) => name),
        });
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "create_task",
    {
      title: "Create task",
      description: "Create one GitHub issue in agent:inbox with an explicit task contract.",
      inputSchema: z.object({
        title: z.string().min(3),
        desired_outcome: z.string().min(3),
        constraints: z.string().min(1),
        acceptance_criteria: z.array(z.string().min(1)).min(1),
        priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
        capability_grants: z.array(z.string().regex(/^[a-z][a-z0-9._-]+$/)).default(["github.issues.write"]),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      _meta: toolMeta(["tasks:write"]),
    },
    async (input, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:write");
        return text(await service(manifest, ctx).createTask({
          title: input.title,
          desiredOutcome: input.desired_outcome,
          constraints: input.constraints,
          acceptanceCriteria: input.acceptance_criteria,
          priority: input.priority,
          capabilityGrants: input.capability_grants,
        }));
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List tasks",
      description: "List agent tasks, optionally filtered by one lifecycle state.",
      inputSchema: z.object({ status: z.enum(taskLabels).optional() }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: toolMeta(["tasks:read"]),
    },
    async ({ status }, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:read");
        return text(await service(manifest, ctx).listTasks(status));
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "get_task",
    {
      title: "Get task",
      description: "Read one canonical task issue.",
      inputSchema: z.object({ issue_number: z.number().int().positive() }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: toolMeta(["tasks:read"]),
    },
    async ({ issue_number }, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:read");
        return text(await service(manifest, ctx).getTask(issue_number));
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "claim_task",
    {
      title: "Claim task",
      description: "Move an open task to agent:active and add an audit event.",
      inputSchema: z.object({ issue_number: z.number().int().positive() }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: toolMeta(["tasks:write"]),
    },
    async ({ issue_number }, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:write");
        return text(await service(manifest, ctx).claimTask(issue_number));
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "update_task",
    {
      title: "Update task",
      description: "Record material progress and evidence as an audit event.",
      inputSchema: z.object({
        issue_number: z.number().int().positive(),
        progress: z.string().min(1),
        evidence: z.string().default(""),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
      _meta: toolMeta(["tasks:write"]),
    },
    async ({ issue_number, progress, evidence }, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:write");
        return text(await service(manifest, ctx).updateTask(issue_number, progress, evidence));
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "block_task",
    {
      title: "Block task",
      description: "Move a task to agent:blocked and record the exact unblock condition.",
      inputSchema: z.object({
        issue_number: z.number().int().positive(),
        reason: z.string().min(1),
        unblock_condition: z.string().min(1),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      _meta: toolMeta(["tasks:write"]),
    },
    async ({ issue_number, reason, unblock_condition }, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:write");
        return text(await service(manifest, ctx).blockTask(issue_number, reason, unblock_condition));
      } catch (error) { return errorResult(error); }
    },
  );

  server.registerTool(
    "complete_task",
    {
      title: "Complete task",
      description: "Post final evidence, apply agent:done, and close a task.",
      inputSchema: z.object({
        issue_number: z.number().int().positive(),
        evidence: z.array(z.string().min(1)).min(1),
        links: z.array(z.string().url()).default([]),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      _meta: toolMeta(["tasks:write"]),
    },
    async ({ issue_number, evidence, links }, ctx) => {
      try {
        requireScope(ctx.http?.authInfo, "tasks:write");
        return text(await service(manifest, ctx).completeTask(issue_number, evidence, links));
      } catch (error) { return errorResult(error); }
    },
  );
}

export const declaredSecuritySchemes = { readSecurity, writeSecurity };
