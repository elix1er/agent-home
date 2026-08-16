# Hosted MCP

Hosted mode deploys a narrow task API into the fork owner's Vercel account. It is optional for local coding agents and useful when ChatGPT Web/Mobile or several clients need one remote task ledger.

## 1. Configure the private fork

Replace every `replace-me` value in `agent-home.yml`. Keep the repository private. Run the **Set up agent-home labels** workflow.

## 2. Create an Auth0 API

Create an Auth0 API whose identifier exactly matches `AUTH0_AUDIENCE` (normally `https://<deployment>/api/mcp`). Enable RBAC and add:

- `tasks:read`
- `tasks:write`

Use an Auth0 application type that supports Authorization Code with PKCE. Add the callback URLs supplied by each MCP client. Auth0 provides authorization-server discovery and JWKS; this repository is the protected resource server.

GitHub social login alone does not automatically place the GitHub login in an access token. Add an Auth0 Post Login Action that copies the verified GitHub username from the linked identity profile into the custom claim named by `AUTH0_GITHUB_CLAIM`. The default claim is `https://agent-home.dev/github_login`.

The MCP rejects a valid token when that claim is absent or not listed in `agent-home.yml`.

## 3. Grant access to one repository

Prefer a GitHub App installation scoped to the private fork with read/write Issues and read Metadata permission. A fine-grained personal access token scoped to that single repository is acceptable for a personal instance.

For a GitHub App, set `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, and `GITHUB_APP_PRIVATE_KEY`; the official Octokit auth strategy mints short-lived installation tokens. Alternatively set one fine-grained token as `GITHUB_TOKEN`. Do not configure both. Do not commit any of them.

## 4. Deploy

Import the private fork into Vercel and set all values from `.env.example`. Deploy a preview first, then verify:

- `GET /.well-known/oauth-protected-resource` returns the Auth0 issuer and `tasks:read tasks:write` scopes;
- unauthenticated `/api/mcp` requests return `401` with `WWW-Authenticate` pointing to that metadata;
- a wrong GitHub login is rejected;
- MCP Inspector can initialize and list exactly eight task tools;
- a test task completes against the intended private repository.

Promote the verified preview to production. Vercel deployment history provides rollback; agent-home itself never promotes or rolls back unless the current task explicitly grants `vercel.deploy` and the host exposes it.

## OAuth boundary

The service verifies JWT signature, issuer, audience, expiry, scopes, and the configured GitHub login allowlist through `jose` and Auth0 JWKS. It does not implement an authorization server, collect passwords, accept static API keys from MCP clients, or expose Vercel/GitHub credentials through tools.
