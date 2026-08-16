# agent-home

`agent-home` is a portable home for one agent: durable identity and policy in Git, tasks and evidence in GitHub Issues, and an optional private MCP endpoint for clients that need shared remote access.

The public repository is only the template. Your real agent home should be a separate **private repository** created from it. The template author receives no tasks, credentials, telemetry, or authority over your instance.

## Start in five minutes

1. Click **Use this template** on GitHub and create a private repository.
2. Edit [`agent-home.yml`](agent-home.yml), [`identity.md`](identity.md), and [`goal.md`](goal.md).
3. Run the **Set up agent-home labels** workflow once.
4. Install the repository as a Skill/Plugin in your preferred client.
5. Create a GitHub Issue with the **Agent task** form, or say: “Use agent-home to add this task: …”.

GitHub Issues are the task ledger. Open issues are work; closed `agent:done` issues are the archive. Repository files hold only durable identity, policy, skills, and long-lived learnings.

## Two operating modes

### Native mode

Codex, Claude Code, and ZCode use the portable [`agent-home` Skill](skills/agent-home/SKILL.md) with GitHub access already available in that runtime. The Skill prefers:

1. a configured agent-home MCP;
2. native GitHub tools/connectors;
3. local `gh` and Git access.

It never invents access or asks you to paste a secret into chat.

### Hosted mode (optional)

Deploy this repository into **your own Vercel account** to expose `/api/mcp`. The MCP owns only task state and task audit history. It has no shell, browser, arbitrary HTTP, secret, or generic integration tool.

Hosted mode is useful for ChatGPT Web/Mobile and for several clients sharing one task ledger. Auth0 is the OAuth authorization server; your deployment verifies JWTs and uses a GitHub App installation token or fine-grained token stored only in your Vercel environment.

See [`docs/hosted-mcp.md`](docs/hosted-mcp.md) and [`.env.example`](.env.example).

## Install the portable plugin

### Codex / ChatGPT

Install from this GitHub source when source plugins are enabled, or copy `skills/agent-home` into your Skills directory. Public-directory submission is intentionally not required for V1.

### Claude Code

```text
/plugin marketplace add elix1er/agent-home
/plugin install agent-home@agent-home
```

### ZCode

Add `elix1er/agent-home` as a marketplace and install `agent-home`. ZCode consumes the Claude-compatible plugin manifest; this repository intentionally has no duplicate ZCode-only manifest.

Client-specific notes are in [`docs/clients.md`](docs/clients.md).

## Task lifecycle

`agent:inbox` → `agent:active` → `agent:blocked` or `agent:done`

Every mutation must leave a concise issue event with action, result, and evidence. Completion adds a final evidence comment, links relevant PRs/artifacts, applies `agent:done`, removes other state labels, and closes the issue.

Capabilities default to deny. An agent may act autonomously only through capabilities explicitly allowed in `agent-home.yml`; absent or disabled capability means “blocked”, not a workaround.

## Development

```bash
npm install
npm run check
npm run dev
```

Node.js 20.9 or newer is required. Releases use semantic tags. The first release line is `0.1.x`; APIs may still change before `1.0.0`.

## Safety

- Never commit tokens, credentials, headers, private exports, or machine-local state.
- Never put secrets in plugin manifests, issues, comments, logs, or MCP tool output.
- Automations may propose work; they do not auto-merge, deploy, message people, rotate credentials, or delete data.
- A public template is not a suitable real agent instance.

Apache-2.0 licensed. See [`SECURITY.md`](SECURITY.md) before reporting a vulnerability.

## Compatibility references

- [OpenAI plugin architecture](https://developers.openai.com/plugins/concepts/plugins) and [remote MCP authentication](https://developers.openai.com/plugins/build/auth)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins), [marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), and [remote MCP](https://code.claude.com/docs/en/mcp)
- [ZCode plugins](https://zcode.z.ai/en/docs/plugin)
- [Vercel MCP deployment](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- [Model Context Protocol](https://modelcontextprotocol.io/)
