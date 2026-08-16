# Release checklist

## Every release

- [ ] `npm audit --audit-level=moderate` passes.
- [ ] `npm run check` passes on Node 20.
- [ ] Skill Creator and Plugin Creator validators pass.
- [ ] Versions match across package and marketplace manifests.
- [ ] Git history contains no secrets or private instance data.
- [ ] Changelog describes user-visible changes.
- [ ] Tag is `v<package version>` and the release workflow succeeds.

## Interoperability release gate

- [ ] Codex source/plugin validation and invocation succeed.
- [ ] `claude plugin validate .`, local marketplace add, install, and invocation succeed.
- [ ] ZCode marketplace add, install, and invocation succeed through the Claude-compatible layout.
- [ ] Hosted MCP smoke workflow passes against a private fork preview.
- [ ] Wrong-owner Auth0 token is rejected.
- [ ] One task created from ChatGPT, Codex, Claude Code, and ZCode resolves to the same private GitHub Issues ledger.

The final cross-client private-fork smoke requires client accounts and a user-owned Auth0/Vercel deployment. Do not mark it complete from unit tests alone.
