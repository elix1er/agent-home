# Agent home

Keep this repository portable, auditable, and light.

- Read `agent-home.yml`, `identity.md`, and `goal.md` before choosing work.
- Treat GitHub Issues as the canonical task ledger and closed `agent:done` issues as the task archive.
- Use exactly one state label: `agent:inbox`, `agent:active`, `agent:blocked`, or `agent:done`.
- Act only through capabilities explicitly allowed by `agent-home.yml`; missing capability means blocked.
- Log every task mutation with a concise issue comment containing action, result, and evidence.
- Save only reusable skills, durable policy, identity, and long-lived learnings in Git.
- Never commit or repeat secrets, private exports, tokens, headers, caches, or machine-local state.
- Prefer short plain files and small dependencies over frameworks inside frameworks.
- Use a branch and pull request; do not push directly to `main`.
- Never auto-merge, deploy, message people, rotate credentials, or delete data unless the current task explicitly grants the named capability and the host exposes it.
- If there is nothing genuinely useful to improve, say `no change`.
