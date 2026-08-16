import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { loadAuthSettings, verifyAgentToken } from "../../../src/auth";
import { loadManifest } from "../../../src/config";
import { registerAgentHomeTools } from "../../../src/mcp";

const manifest = loadManifest();

const mcpHandler = createMcpHandler(
  (server) => registerAgentHomeTools(server, manifest),
  {
    serverInfo: { name: "agent-home", version: "0.1.0" },
    instructions: "Operate only the configured GitHub task ledger and obey agent-home.yml capability grants.",
    maxSubscriptions: 0,
  },
);

const handler = withMcpAuth(
  mcpHandler,
  async (_request, bearerToken) => {
    if (!bearerToken) return undefined;
    const settings = loadAuthSettings();
    return verifyAgentToken(bearerToken, manifest, settings);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource",
    resourceUrl: process.env.AGENT_HOME_URL,
  },
);

export { handler as DELETE, handler as GET, handler as POST };
