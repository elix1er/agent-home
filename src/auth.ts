import type { AuthInfo } from "@modelcontextprotocol/server";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { AgentHomeManifest } from "./config";
import { assertConfigured } from "./config";

export interface AuthSettings {
  issuer: string;
  audience: string;
  githubClaim: string;
  resourceUrl: string;
}

export class OAuthScopeError extends Error {
  constructor(readonly scope: "tasks:read" | "tasks:write") {
    super(`OAuth scope required: ${scope}`);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function loadAuthSettings(): AuthSettings {
  const issuer = requiredEnv("AUTH0_ISSUER").replace(/\/?$/, "/");
  const baseUrl = requiredEnv("AGENT_HOME_URL").replace(/\/$/, "");
  return {
    issuer,
    audience: requiredEnv("AUTH0_AUDIENCE"),
    githubClaim: process.env.AUTH0_GITHUB_CLAIM?.trim() || "https://agent-home.dev/github_login",
    resourceUrl: `${baseUrl}/api/mcp`,
  };
}

export async function verifyAgentToken(
  token: string,
  manifest: AgentHomeManifest,
  settings: AuthSettings,
  getKey: JWTVerifyGetKey | CryptoKey = createRemoteJWKSet(new URL(".well-known/jwks.json", settings.issuer)),
): Promise<AuthInfo> {
  assertConfigured(manifest);
  const { payload } = await jwtVerify(token, getKey, {
    issuer: settings.issuer,
    audience: settings.audience,
  });

  const githubLogin = payload[settings.githubClaim];
  if (typeof githubLogin !== "string" || !githubLogin.trim()) {
    throw new Error(`Access token is missing the ${settings.githubClaim} claim`);
  }
  const allowed = manifest.instance.github.allowed_logins.some(
    (login) => login.toLowerCase() === githubLogin.toLowerCase(),
  );
  if (!allowed) throw new Error("Authenticated GitHub identity is not allowed for this agent home");

  const scopes = typeof payload.scope === "string" ? payload.scope.split(/\s+/).filter(Boolean) : [];
  const clientId = typeof payload.azp === "string"
    ? payload.azp
    : typeof payload.client_id === "string"
      ? payload.client_id
      : String(payload.sub ?? "unknown-client");

  return {
    token,
    clientId,
    scopes,
    expiresAt: payload.exp,
    resource: new URL(settings.resourceUrl),
    extra: { githubLogin },
  };
}

export function requireScope(authInfo: AuthInfo | undefined, scope: "tasks:read" | "tasks:write"): void {
  if (!authInfo?.scopes.includes(scope)) throw new OAuthScopeError(scope);
}

export function authenticatedLogin(authInfo: AuthInfo | undefined): string {
  const login = authInfo?.extra?.githubLogin;
  if (typeof login !== "string" || !login) throw new Error("Authenticated GitHub login is unavailable");
  return login;
}
