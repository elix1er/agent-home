import type { AgentHomeManifest } from "../src/config";

export function manifest(overrides: Partial<AgentHomeManifest["autonomy"]["capabilities"]> = {}): AgentHomeManifest {
  return {
    version: 1,
    instance: {
      github: {
        owner: "owner",
        repository: "private-home",
        allowed_logins: ["owner"],
      },
    },
    autonomy: {
      default: "deny",
      audit: "issue-comments-required",
      capabilities: {
        "github.issues.read": "allow",
        "github.issues.write": "allow",
        "github.pull_requests.write": "deny",
        ...overrides,
      },
    },
    external_capabilities: [],
  };
}
