# Client setup

## ChatGPT Web/Mobile

Deploy hosted mode first. In ChatGPT Developer Mode, add the deployment's `/api/mcp` URL and complete Auth0/GitHub sign-in. The portable Skill supplies the workflow; the remote MCP supplies shared task state.

Writable private remote MCP use requires OAuth. Do not place a static API key in a prompt or Skill.

## Codex

Install the plugin from source or copy `skills/agent-home` into the Codex Skills directory. Native GitHub tools or local `gh` are the default. Add the hosted MCP only when shared remote state is useful.

## Claude Code

```text
/plugin marketplace add elix1er/agent-home
/plugin install agent-home@agent-home
```

The plugin contains the same canonical Skill used by Codex. Configure native GitHub access or add the hosted Streamable HTTP MCP URL using Claude Code's MCP settings.

## ZCode

Add `elix1er/agent-home` as a marketplace and install `agent-home`. ZCode reads the Claude-compatible `.claude-plugin/plugin.json` and Skill layout. Configure the same optional MCP URL through ZCode's MCP settings.

## Invocation examples

- “Use agent-home to add this task: prepare a release checklist.”
- “What should you work on next?”
- “Continue agent-home task #12.”
- “Show blocked agent work.”
- “Complete this task with the PR and test evidence.”

In every client, missing runtime access or a denied capability produces a clear blocked result. It never produces invented success or a request to paste secrets into chat.
