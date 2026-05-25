# CLAUDE.md — Auditoria

This file provides guidance to AI assistants (Claude Code and similar tools) working on this repository.

---

## Project Overview

**Auditoria** is a project currently in its initial setup phase. The repository was created in April 2026 and contains only boilerplate files (README and Apache 2.0 LICENSE). No source code, configuration, or architecture has been committed yet.

- **Repository**: `ivocasimiro1/auditoria-`
- **License**: Apache License 2.0
- **Language/Stack**: Not yet defined — update this section when the tech stack is chosen

---

## Repository State

As of the last update to this file, the repository contains:

```
Auditoria-/
├── LICENSE
├── README.md
└── CLAUDE.md   ← this file
```

When source code is added, update this tree and the sections below to reflect the actual structure.

---

## Development Branch

Active development happens on feature branches. The main branch is `main`. Do **not** push directly to `main` without a pull request.

When working in a Claude Code session, develop on the branch specified in the session context (e.g., `claude/<slug>`). Always push to that branch and never to `main` without explicit user approval.

---

## Git Conventions

- **Commit messages**: Use imperative mood, short subject line (≤72 chars). Body only when the "why" needs explanation.
  - Good: `Add authentication middleware`
  - Bad: `added some stuff to fix the auth`
- **Branch naming**: `feature/<short-description>`, `fix/<short-description>`, `claude/<slug>` for AI-driven sessions
- **Never force-push** to `main` or shared branches
- **Never skip pre-commit hooks** (`--no-verify`) without explicit user approval
- **Never amend a pushed commit** — create a new one instead

---

## AI Assistant Instructions

### General Rules

1. **Do not create files unless explicitly required.** Prefer editing existing files.
2. **Do not add comments** explaining what code does — well-named identifiers are self-documenting. Only add comments for non-obvious constraints or workarounds.
3. **Do not add error handling for impossible scenarios.** Trust framework guarantees; validate only at system boundaries.
4. **Do not introduce abstractions beyond the current task.** Fix the bug; don't refactor the surrounding code.
5. **Do not create placeholder or TODO files** — implement or don't, nothing in between.
6. **Do not create documentation files** (Markdown, READMEs) unless the user explicitly requests them.

### Security

- Never introduce command injection, XSS, SQL injection, or other OWASP Top 10 vulnerabilities.
- Never commit secrets, credentials, or `.env` files.
- Validate all input at system boundaries (user input, external APIs); trust internal code.

### Code Style

These will be defined once a stack is chosen. Update this section with language-specific linting/formatting rules, e.g.:
- Linter/formatter commands
- Naming conventions
- File structure conventions

### Testing

Update this section once a testing framework is in place. Include:
- How to run the full test suite
- How to run a single test file
- Coverage expectations
- Where test fixtures live

---

## Common Commands

Update this section as the project grows. Example placeholder structure:

```bash
# Install dependencies
# <command here>

# Run tests
# <command here>

# Start development server
# <command here>

# Build for production
# <command here>

# Lint / format
# <command here>
```

---

## Updating This File

Keep this file current. When you add source code, a new dependency, a CI pipeline, or change any convention:

1. Update the relevant section of this file in the same commit.
2. The tree diagram, commands, and stack description should always reflect the actual repository state.
3. Do not let this file become stale — an outdated CLAUDE.md is worse than none.
