# Security policy

## Supported versions

Security fixes are applied to the latest release. Before `1.0.0`, upgrade to the newest `0.1.x` release rather than expecting backports.

## Report privately

Use GitHub's **Report a vulnerability** flow in the Security tab. Do not open a public issue for suspected credential exposure, authentication bypass, owner-check bypass, or remote code execution.

Do not include live credentials in a report. Revoke an exposed credential first, then provide redacted evidence and reproduction steps.

## Instance boundary

Each hosted deployment belongs to its fork owner. The template author does not operate it and cannot retrieve its environment variables, tasks, or audit history. Security of Auth0, GitHub, Vercel, and enabled runtime capabilities remains the instance owner's responsibility.
