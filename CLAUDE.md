# CLAUDE.md

Guidance for Claude Code when working in the DEEP-QA repository.

DEEP-QA is a curriculum & learning-outcomes management system, split into
`DEEP-QA-BACKEND/` (Express + Swagger) and `DEEP-QA-FRONTEND/` (CRA + Tailwind).
Each app has its own README; the frontend has its own `CLAUDE.md` with
app-specific architecture notes.

Project specs live in `docs/` (requirements, database schema, ER diagram,
test cases, screen↔API mapping).

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues at `khthana/Deep-QA`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
