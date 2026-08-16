# Capability policy

Capabilities use dotted names. The template declares common names; private instances may add host-specific MCP/tool namespaces.

- `github.issues.read` — read issue task state
- `github.issues.write` — create, label, comment on, and close task issues
- `github.pull_requests.write` — create or update pull requests
- `github.contents.write` — modify repository content through GitHub or local Git
- `vercel.deploy` — create, promote, or roll back deployments
- `browser.use` — operate a host-provided browser
- `computer.use` — operate a host-provided computer UI

An `allow` value is policy permission, not a credential or guarantee that the host provides the capability. `deny`, omission, a missing host tool, failed authentication, or a repository mismatch all mean unavailable.

Never store secrets in the manifest, task body, issue comments, logs, or tool output.
