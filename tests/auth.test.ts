import { SignJWT, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";
import { requireScope, verifyAgentToken, type AuthSettings } from "../src/auth";
import { manifest } from "./fixtures";

const settings: AuthSettings = {
  issuer: "https://tenant.example.auth0.com/",
  audience: "https://home.example/api/mcp",
  githubClaim: "https://agent-home.dev/github_login",
  resourceUrl: "https://home.example/api/mcp",
};

async function tokenFor(login: string, scope = "tasks:read tasks:write") {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const token = await new SignJWT({
    scope,
    [settings.githubClaim]: login,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(settings.issuer)
    .setAudience(settings.audience)
    .setSubject("github|123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  return { token, publicKey };
}

describe("hosted MCP authorization", () => {
  it("accepts the configured GitHub identity, audience, issuer, and scopes", async () => {
    const { token, publicKey } = await tokenFor("OwNeR");
    const auth = await verifyAgentToken(token, manifest(), settings, publicKey);
    expect(auth.extra?.githubLogin).toBe("OwNeR");
    expect(auth.scopes).toEqual(["tasks:read", "tasks:write"]);
    expect(() => requireScope(auth, "tasks:write")).not.toThrow();
  });

  it("rejects a valid token for the wrong GitHub owner", async () => {
    const { token, publicKey } = await tokenFor("intruder");
    await expect(verifyAgentToken(token, manifest(), settings, publicKey)).rejects.toThrow("not allowed");
  });

  it("enforces individual OAuth scopes", async () => {
    const { token, publicKey } = await tokenFor("owner", "tasks:read");
    const auth = await verifyAgentToken(token, manifest(), settings, publicKey);
    expect(() => requireScope(auth, "tasks:write")).toThrow("OAuth scope required");
  });
});
