---
name: agent-home
description: Operate a private agent-home whose GitHub Issues are the canonical task ledger. Use when asked to add or create a task, choose what to work on, list inbox or blocked work, claim or continue task #N, record progress, block work, complete a task, or report agent-home context across ChatGPT, Codex, Claude Code, or ZCode.
---

# Agent Home

Operate the configured private repository as an auditable task home.

## Establish context

1. Read `agent-home.yml`, `identity.md`, `goal.md`, and repository instructions when locally available.
2. Reject placeholder instance values. Never infer a repository from unrelated workspace state.
3. Resolve task access in this order:
   - configured agent-home MCP;
   - native GitHub connector/tools;
   - local `gh` plus Git repository access.
4. Never request a token in chat. If no route can perform the operation, state the missing route and stop.

Read [task-contract.md](references/task-contract.md) before mutating tasks. Read [capabilities.md](references/capabilities.md) before taking actions beyond task reads.

## Operate tasks

- Create one issue per outcome with desired outcome, constraints, acceptance criteria, priority, and named capability grants. Apply `agent:inbox`.
- Choose work from `agent:active` first, then the highest-priority actionable `agent:inbox` issue. Do not invent work when no useful task exists.
- Claim by applying only `agent:active` and adding an audit comment.
- Continue from the issue body, comments, linked PRs, and artifacts. Treat chat summaries as hints, not canonical state.
- Record only material progress. Include action, result, and evidence.
- Block when a decision, access route, host capability, or policy grant is missing. Apply only `agent:blocked` and name the exact unblock condition.
- Complete only when acceptance criteria are met. Add an evidence-based final comment with relevant PR/artifact links, apply only `agent:done`, and close the issue.

## Enforce autonomy

Treat `autonomy.default: deny` as authoritative. A capability is usable only when both conditions hold:

1. `agent-home.yml` explicitly allows it; and
2. the active host actually exposes and authenticates it.

Do not convert a task-level grant into broader instance permission. Do not work around a denial through shell, browser, HTTP, another plugin, or a different credential path.

## Report

Lead with task number and resulting state. Distinguish `verified`, `partial`, `blocked`, and `proposed`. Link the canonical issue and evidence when the runtime can resolve URLs.
