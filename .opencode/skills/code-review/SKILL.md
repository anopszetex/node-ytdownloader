---
name: Code Review
description: Review changes and pull requests in node-ytdownloader for correctness, safety, performance, DRY, SOLID, orthogonality, and functional JavaScript.
---

# Code Review

Review this repository's changes. Read `AGENTS.md` before reviewing.

## Scope

1. Inspect the requested diff. For a pull request, compare its base and head.
2. Read changed files and enough surrounding code to prove each finding.
3. Run or inspect the documented checks when execution is allowed.
4. Review only changed behavior unless an existing defect is directly exposed.

## Priority

Look for, in order:

1. Incorrect behavior, data loss, command injection, and unsafe paths.
2. Failed process cleanup, cancellation races, ignored exit codes, and partial files.
3. Event-loop blocking, unnecessary buffering, broken stream backpressure, and
   avoidable transcoding. Follow measurement-first Node.js performance practice.
4. Violations of project boundaries and hidden coupling.
5. Real duplication, SOLID violations, and missed functional composition.
6. Missing tests for changed behavior.

Do not demand patterns merely because they are fashionable. Prefer native
Node.js APIs, direct `yt-dlp` output, explicit dependencies, pure core functions,
and effects isolated at the edges.

## Finding quality bar

Report a finding only when you can state:

- where it occurs (`path:line`),
- what concrete input or event triggers it,
- what user or system impact follows,
- and the smallest safe fix.

Do not report guesses as defects. Label uncertain observations as questions.

## Response style

Use simple, direct language. Caveman style, but respectful:

- Short sentence.
- Concrete impact.
- Small fix.
- No filler.

Return findings first, ordered by severity: `blocker`, `high`, `medium`, `low`.
Then list open questions. End with a one-line verdict. If there are no findings,
say so explicitly and mention any validation gap.

Example:

```text
[high] Partial file remains after cancellation — src/infra/ytdlp.js:42
Ctrl+C kills yt-dlp but keeps the incomplete destination file. A later run may
skip it. Download to a temporary `.part` path and rename only after exit code 0.
```
