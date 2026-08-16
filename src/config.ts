import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

export const capabilitySchema = z.string().regex(/^[a-z][a-z0-9._-]+$/);

export const manifestSchema = z.object({
  version: z.literal(1),
  instance: z.object({
    github: z.object({
      owner: z.string().min(1),
      repository: z.string().min(1),
      allowed_logins: z.array(z.string().min(1)).min(1),
    }),
  }),
  autonomy: z.object({
    default: z.literal("deny"),
    audit: z.literal("issue-comments-required"),
    capabilities: z.record(capabilitySchema, z.enum(["allow", "deny"])),
  }),
  external_capabilities: z.array(capabilitySchema).default([]),
});

export type AgentHomeManifest = z.infer<typeof manifestSchema>;

export function loadManifest(path = process.env.AGENT_HOME_MANIFEST ?? join(process.cwd(), "agent-home.yml")): AgentHomeManifest {
  return manifestSchema.parse(parse(readFileSync(path, "utf8")));
}

export function manifestIsConfigured(manifest: AgentHomeManifest): boolean {
  const github = manifest.instance.github;
  return github.owner !== "replace-me"
    && github.repository !== "replace-me"
    && !github.allowed_logins.includes("replace-me");
}

export function assertConfigured(manifest: AgentHomeManifest): void {
  if (!manifestIsConfigured(manifest)) {
    throw new Error("agent-home.yml still contains template placeholders");
  }
}

export function requireCapability(manifest: AgentHomeManifest, capability: string): void {
  const explicitlyAllowed = manifest.autonomy.capabilities[capability] === "allow"
    || manifest.external_capabilities.includes(capability);
  if (!explicitlyAllowed) {
    throw new Error(`Capability denied by agent-home.yml: ${capability}`);
  }
}
