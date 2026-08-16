import { generateProtectedResourceMetadata, metadataCorsOptionsRequestHandler } from "mcp-handler";
import { loadAuthSettings } from "../../../src/auth";

export function GET(request: Request): Response {
  const settings = loadAuthSettings();
  const metadata = generateProtectedResourceMetadata({
    authServerUrls: [settings.issuer],
    resourceUrl: settings.resourceUrl,
    additionalMetadata: {
      scopes_supported: ["tasks:read", "tasks:write"],
      bearer_methods_supported: ["header"],
    },
  });
  return Response.json(metadata, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
