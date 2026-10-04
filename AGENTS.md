# node-ytdownloader — Engineering Guide

## Product

`node-ytdownloader` is a small interactive CLI that delegates video downloads
to `yt-dlp`. It asks for one HTTP(S) URL and a 720p or 1080p quality target,
then writes an editor-friendly MP4 to `./downloads`.

## Runtime and style

- Use a currently supported Node.js LTS release.
- Use JavaScript ESM and JSDoc. Do not introduce TypeScript.
- Prefer Node.js built-ins over dependencies when the built-in API is enough.
- Keep user-facing messages short, concrete, and actionable.
- Format and lint with Biome.
- Use ESLint only for structural rules that Biome cannot enforce.
- Test with `node:test` and `node:assert/strict`.

## Readability and control flow

- Always use braces around `if`, loops, and every other block statement.
- Use guard clauses. Do not use `else`, `else if`, `switch`, or `do...while`.
- Keep related declarations together, one declaration per line.
- Add one blank line between declarations, validation, transformation, and effects.
- Keep functions small, with at most two levels of nested control flow.
- Avoid nested ternaries and clever expressions. Choose explicit, boring code.
- Use full names. Avoid abbreviations that require context to understand.
- Let Biome own mechanical formatting; use blank lines to expose intent.

## Object Calisthenics

Apply Object Calisthenics pragmatically to the functional architecture:

- one main level of indentation per function whenever practical;
- guard clauses instead of `else`;
- small modules and cohesive value objects;
- immutable values and explicit dependencies;
- effects isolated at the application boundaries;
- no classes or primitive wrappers without a domain invariant to protect;
- no abstraction created only to satisfy a pattern.

Clarity, correctness, and measured performance win over dogmatic compliance.

## Architecture

- `src/cli`: interactive menu, presentation, and process-level orchestration.
- `src/core`: pure domain rules, validation, and immutable configuration.
- `src/infra`: external processes and filesystem effects.
- Keep effects at the edges. Core functions must be deterministic when possible.
- Pass dependencies explicitly. Do not hide mutable state in modules.
- A module should have one reason to change and expose the smallest useful API.
- Prefer composition over inheritance and simple functions over classes.
- Remove real duplication, but do not create abstractions before a second use.

## Download path

- Let `yt-dlp` write directly to disk. Do not proxy media bytes through Node.js.
- Prefer source H.264 video and AAC audio to avoid unnecessary transcoding.
- If compatible streams are unavailable, convert once to H.264 + AAC.
- Never upscale a source beyond its available resolution.
- Never use synchronous filesystem or child-process APIs in the download path.
- Always propagate cancellation and terminate spawned children on shutdown.
- Treat process exit codes and spawn errors explicitly.
- Do not claim a performance improvement without a reproducible measurement.

## Safety

- Accept only valid HTTP(S) URLs, but do not restrict downloads to one website.
- Build child-process arguments as arrays; never interpolate input into a shell.
- Do not use `shell: true`.
- Do not overwrite output files unless the user explicitly requests it.

## Delivery

Before each commit, run:

```sh
npm run check
npm test
```

Commits must use a gitmoji and a short, objective imperative message.

## Review priorities

Review in this order: correctness, security, data loss, cancellation/resource
cleanup, performance, architecture, then style. Apply DRY, SOLID,
orthogonality, and functional programming as tools—not dogma. Findings must
cite a file and line, explain impact, and propose the smallest safe correction.
