import { createServer, type Server } from "node:http";
import { SignJWT, exportJWK, generateKeyPair, type CryptoKey } from "jose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const expectedTools = [
  "block_task",
  "claim_task",
  "complete_task",
  "create_task",
  "get_home_context",
  "get_task",
  "list_tasks",
  "update_task",
];

let jwksServer: Server;
let privateKey: CryptoKey;
let issuer: string;

beforeAll(async () => {
  const keys = await generateKeyPair("RS256");
  privateKey = keys.privateKey;
  const publicJwk = await exportJWK(keys.publicKey);
  jwksServer = createServer((request, response) => {
    if (request.url === "/.well-known/jwks.json") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [{ ...publicJwk, kid: "test", use: "sig", alg: "RS256" }] }));
      return;
    }
    response.statusCode = 404;
    response.end();
  });
  await new Promise<void>((resolve) => jwksServer.listen(0, "127.0.0.1", resolve));
  const address = jwksServer.address();
  if (!address || typeof address === "string") throw new Error("JWKS test server did not bind");
  issuer = `http://127.0.0.1:${address.port}/`;

  process.env.AGENT_HOME_MANIFEST = "tests/data/agent-home.configured.yml";
  process.env.AGENT_HOME_URL = "https://home.example";
  process.env.AUTH0_ISSUER = issuer;
  process.env.AUTH0_AUDIENCE = "https://home.example/api/mcp";
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => jwksServer.close((error) => error ? reject(error) : resolve()));
});

async function accessToken(scope = "tasks:read tasks:write") {
  return new SignJWT({
    scope,
    "https://agent-home.dev/github_login": "example-owner",
  })
    .setProtectedHeader({ alg: "RS256", kid: "test" })
    .setIssuer(issuer)
    .setAudience("https://home.example/api/mcp")
    .setSubject("github|123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

function rpcRequest(token: string, body: object) {
  return new Request("https://home.example/api/mcp", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

async function rpcDocument(response: Response) {
  const body = await response.text();
  if (!response.headers.get("content-type")?.includes("text/event-stream")) return JSON.parse(body);
  const data = body.split("\n").filter((line) => line.startsWith("data: ")).at(-1)?.slice(6);
  if (!data) throw new Error(`SSE response contained no data event: ${body}`);
  return JSON.parse(data);
}

describe("Streamable HTTP MCP contract", () => {
  it("rejects unauthenticated initialization with an OAuth challenge", async () => {
    const { POST } = await import("../app/api/mcp/route");
    const response = await POST(rpcRequest("", {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2026-07-28", capabilities: {}, clientInfo: { name: "test", version: "1" } },
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("oauth-protected-resource");
  });

  it("lists exactly eight authenticated task tools with schemas and annotations", async () => {
    const { POST } = await import("../app/api/mcp/route");
    const token = await accessToken();
    const initialize = await POST(rpcRequest(token, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2026-07-28", capabilities: {}, clientInfo: { name: "test", version: "1" } },
    }));
    expect(initialize.status).toBe(200);

    const response = await POST(rpcRequest(token, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }));
    expect(response.status).toBe(200);
    const document = await rpcDocument(response) as { result: { tools: Array<Record<string, unknown>> } };
    const tools = document.result.tools;
    expect(tools.map((tool) => tool.name).sort()).toEqual(expectedTools);
    for (const tool of tools) {
      expect(tool.inputSchema).toBeTruthy();
      expect(tool.annotations).toBeTruthy();
      expect((tool._meta as { securitySchemes?: unknown })?.securitySchemes).toBeTruthy();
    }
  });

  it("returns an MCP OAuth challenge when a tool scope is missing", async () => {
    const { POST } = await import("../app/api/mcp/route");
    const token = await accessToken("tasks:read");
    const response = await POST(rpcRequest(token, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "create_task",
        arguments: {
          title: "Test task",
          desired_outcome: "Verify scope behavior",
          constraints: "No mutation",
          acceptance_criteria: ["Challenge is returned"],
          priority: "normal",
          capability_grants: ["github.issues.write"],
        },
      },
    }));
    const document = await rpcDocument(response) as {
      result: { isError: boolean; _meta: { "mcp/www_authenticate": string[] } };
    };
    expect(document.result.isError).toBe(true);
    expect(document.result._meta["mcp/www_authenticate"][0]).toContain("tasks:write");
  });
});
