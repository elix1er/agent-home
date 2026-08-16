# Contributing

Keep changes narrow and portable.

1. Open an issue describing the outcome and acceptance criteria.
2. Use a feature branch and pull request.
3. Run `npm run check`.
4. Update `CHANGELOG.md` for user-visible behavior.
5. Keep versions consistent across `package.json`, `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`.

Do not add credentials, private instance data, generic execution tools, or mandatory hosted infrastructure. New dependencies need a concrete reliability or interoperability benefit.
