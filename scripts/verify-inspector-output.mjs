import { readFileSync } from "node:fs";

const expected = [
  "block_task",
  "claim_task",
  "complete_task",
  "create_task",
  "get_home_context",
  "get_task",
  "list_tasks",
  "update_task",
];

const document = JSON.parse(readFileSync(process.argv[2], "utf8"));
const arrays = [];
function visit(value) {
  if (Array.isArray(value)) {
    if (value.every((item) => item && typeof item === "object" && typeof item.name === "string")) arrays.push(value);
    value.forEach(visit);
  } else if (value && typeof value === "object") {
    Object.values(value).forEach(visit);
  }
}
visit(document);

const tools = arrays.find((items) => expected.every((name) => items.some((item) => item.name === name)));
if (!tools) throw new Error("Inspector output does not contain all eight agent-home tools");
const names = tools.map((tool) => tool.name).sort();
if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error(`Unexpected tool surface: ${names.join(", ")}`);
for (const tool of tools) {
  if (!tool.inputSchema) throw new Error(`${tool.name} is missing inputSchema`);
  if (!tool.annotations) throw new Error(`${tool.name} is missing tool annotations`);
  if (!tool._meta?.securitySchemes) throw new Error(`${tool.name} is missing OAuth security metadata`);
}
console.log("MCP Inspector confirmed eight narrow tools with schemas, annotations, and OAuth metadata.");
