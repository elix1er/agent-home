# Task contract

## Required issue body

```markdown
## Desired outcome
<one reviewable outcome>

## Constraints
<scope, safety, timing, and explicit exclusions>

## Acceptance criteria
- [ ] <observable condition>

## Priority
<critical | high | normal | low>

## Enabled capability grants
- `github.issues.write`
```

Task grants narrow the instance-level allowlist; they never expand it.

## State labels

Use exactly one:

- `agent:inbox` — actionable but unclaimed
- `agent:active` — currently owned
- `agent:blocked` — cannot proceed; comment contains the unblock condition
- `agent:done` — acceptance criteria met and issue closed

## Audit comment

```markdown
### Agent event
- Action: <claim | progress | block | complete>
- Result: <verified | partial | blocked>
- Evidence: <short facts and links, or none>
```

Completion evidence must be concrete. A claim that tests passed should name the command or check; repository work should link its PR or commit; an artifact should have a stable location.
