import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

const read = (path) => readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));
const fail = (message) => { throw new Error(message); };

const packageJson = json("package.json");
const codex = json(".codex-plugin/plugin.json");
const claude = json(".claude-plugin/plugin.json");
const marketplace = json(".claude-plugin/marketplace.json");
const versions = [packageJson.version, codex.version, claude.version, marketplace.plugins[0]?.version];

if (!versions.every((version) => version === versions[0])) {
  fail(`Version mismatch: ${versions.join(", ")}`);
}
if (!/^\d+\.\d+\.\d+$/.test(versions[0])) fail(`Invalid semantic version: ${versions[0]}`);
if (codex.name !== "agent-home" || claude.name !== "agent-home" || marketplace.plugins[0]?.name !== "agent-home") {
  fail("Plugin names must all be agent-home");
}
if (codex.license !== "Apache-2.0" || claude.license !== "Apache-2.0") fail("Plugin license mismatch");
if (marketplace.plugins[0]?.source !== "./") fail("Marketplace must install the repository root");

const skillText = read("skills/agent-home/SKILL.md");
const frontmatterMatch = skillText.match(/^---\n([\s\S]*?)\n---\n/);
if (!frontmatterMatch) fail("Skill frontmatter is missing");
const frontmatter = parseYaml(frontmatterMatch[1]);
if (Object.keys(frontmatter).sort().join(",") !== "description,name") fail("Skill frontmatter may contain only name and description");
if (frontmatter.name !== "agent-home" || !frontmatter.description?.includes("create a task")) {
  fail("Skill metadata does not cover the agent-home task triggers");
}

const manifest = parseYaml(read("agent-home.yml"));
if (manifest.version !== 1) fail("agent-home.yml version must be 1");
if (manifest.autonomy?.default !== "deny") fail("Autonomy must default to deny");
if (manifest.autonomy?.audit !== "issue-comments-required") fail("Issue comments must be required for audit");
for (const [capability, decision] of Object.entries(manifest.autonomy?.capabilities ?? {})) {
  if (!/^[a-z][a-z0-9._-]+$/.test(capability)) fail(`Invalid capability name: ${capability}`);
  if (!["allow", "deny"].includes(decision)) fail(`Invalid capability decision for ${capability}`);
}

const issueTemplate = parseYaml(read(".github/ISSUE_TEMPLATE/agent-task.yml"));
if (!issueTemplate.labels?.includes("agent:inbox")) fail("Agent task template must apply agent:inbox");
const requiredFields = ["outcome", "constraints", "acceptance", "priority", "capabilities"];
const actualFields = issueTemplate.body?.map((field) => field.id).filter(Boolean) ?? [];
for (const field of requiredFields) if (!actualFields.includes(field)) fail(`Issue template is missing ${field}`);

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /^\s*[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY)[A-Z0-9_]*\s*=\s*[^\s#]+/m,
];
for (const path of trackedFiles) {
  if (path === "package-lock.json") continue;
  let content;
  try { content = read(path); } catch { continue; }
  for (const pattern of secretPatterns) if (pattern.test(content)) fail(`Possible secret in ${path}: ${pattern}`);
}

console.log(`Validated agent-home ${versions[0]}: manifests, Skill, task schema, capability policy, and secret patterns.`);
