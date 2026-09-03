# CLAUDE.md

Guidance for Claude Code when working in the DEEP-QA repository.

DEEP-QA is a curriculum & learning-outcomes management system, split into
`DEEP-QA-BACKEND/` (Express + Swagger) and `DEEP-QA-FRONTEND/` (CRA + Tailwind).
Each app has its own README; the frontend has its own `CLAUDE.md` with
app-specific architecture notes.

## Current state — read this first

The two `DEEP-QA-*` directories are the **student implementation as delivered** and are
now **read-only reference**. There is no database for them and they are not being
edited. The rebuild lands in fresh `backend/`, `frontend/`, `db/` and `e2e/` trees, one screen
at a time, and the reference directories are deleted when it completes.

Work is tracked as GitHub issues: [#1](https://github.com/khthana/Deep-QA/issues/1) is
the spec and everything from [#2](https://github.com/khthana/Deep-QA/issues/2) up is a ticket,
wired with native blocking dependencies. Take work from the frontier — tickets whose blockers are
all closed. #2–#45 are the original 44 from `docs/07`; numbers above that are gaps and defects
found during the rebuild and opened since.

Closed: #2–#36 unbroken, plus #38, #42 and #43. **Not** #37, #39, #40 or #41 — the run of closed
numbers stops at #36, and an older version of this line said *closed through #38*, which read as
though it took those four with it. Of the original 44, six are open: #37, #39, #40, #41, #44, #45.
Every one of their blockers is closed, so all six are on the frontier at once.

The four most recent — [#42](https://github.com/khthana/Deep-QA/issues/42) (Programme-level results
by intake), [#43](https://github.com/khthana/Deep-QA/issues/43) (Whole-cohort heatmap),
[#35](https://github.com/khthana/Deep-QA/issues/35) (Assessment evidence) and
[#36](https://github.com/khthana/Deep-QA/issues/36) (Section results) — were all hand-walked on
3 September 2569. #43's walk found a screen that showed a refusal and *กำลังโหลดข้อมูล…* underneath
it for ever, on two screens; #35's found two accessible names and a breadcrumb that read a piece of
the URL at a person. **#36's found nothing on screen**, which is worth recording as plainly as the
other two: a walk that ticks every row is not a walk that was wasted, and the store now has three
consecutive tickets where the walk paid and one where it did not.

Every acceptance checklist has been walked, and as of 3 September 2569 **there is no row left
anywhere that a person could walk and has not**. Ten rows are not ticked, and the count is worth
taking from the sheets rather than from here — one is ☐ and is half of a ticket somebody else owns
(#49's menu set); of the nine ◐, all but one name a request no control on any screen can produce,
and the last is an arithmetic difference too small for an eye to decide and pinned exactly at the
HTTP seam. Read a row that claims a seam proves it better than an eye as a claim to check, not a
conclusion — that is how the last of the walkable ones were found.

**A ⚙ that was never earned is the mark to distrust most.** #42's fifth criterion carried one until
#35's ticket caught it, and #36's sheet shipped nine before its own review caught them — two
tickets running, the same mistake. The tell both times: a row proved at *both* seams reads exactly
like a row covered by the browser seam alone. ⚙ means a mutant killed **that row's own assertion**
in `36a`, `35a`, `38a` and so on; a row proved only at the HTTP surface is ☑.

Earlier versions of this paragraph said fifteen, then nine. Most of those turned out to be walkable
after all — they were waiting not on a person but on a **situation the seed does not contain**, and
building the situation and restoring it afterwards is a normal part of a walk.

The newest file in `docs/handoff/` says where the rebuild stands, what is half-done and what
will cost time. Read it before taking work. Each handoff names the one it supersedes for state,
so follow that chain rather than the filenames.

## Two test seams

Work is tested at the backend HTTP surface (`backend/test/*.test.js`) and, since #65, in the
browser (`e2e/`, Playwright — its own stack on ports 3100/5100 and schema `deep_core_e2e`,
reseeded on every run). The browser seam asserts **behaviour**; anything an acceptance row states
in terms of **appearance** — colours, wording, menu contents, "this is text and not a control" —
stays a hand-walked row.

Acceptance rows are therefore marked ☑ walked · ◐ half-walked · ☐ not walked · **⚙ covered by the
browser seam** (the row names the spec file). A row is only marked ⚙ after a mutation test shows
the new assertion — that one, not an earlier one — failing when the code it is about is broken.

## Documentation map

| File | What it is |
|---|---|
| `CONTEXT.md` | Domain glossary. Use its vocabulary in issues, tests and commits. |
| `docs/adr/` | Decisions that are hard to reverse. Read before touching keys, authorisation or the CLO grain. |
| `docs/01`–`05` | Extracted from the thesis and from scanning the student code. **Descriptive of what was delivered, not prescriptive of what to build** — each carries a note where the rebuild diverges. |
| `docs/thesis/` | The thesis `docs/01`–`04` were extracted from. Only for checking an extraction against the original. |
| `docs/06-implementation-plan.md` | The spec the rebuild implements. |
| `docs/acceptance/` | One checklist per screen ticket, and the record of how each row was proved. A ticket closes on it. |
| `docs/handoff/` | Session handoffs, newest last. The most recent one is the current state of the rebuild. |
| `docs/07-ticket-breakdown.md` | The original 44 tickets, their dependency graph and the critical path. Tickets opened after it was published are on GitHub only. |
| `mutation/` | The mutations that proved each ⚙ row's assertions. Read its README before trusting or rewriting one. |

Four decisions govern most of the work and are easy to violate by accident:
keys follow the three tiers of ADR-0001; authorisation is derived server-side from the
database and never from a request body (ADR-0002); CLOs and the weighting scheme
belong to a (Program, Subject, academic year), not to a Section (ADR-0003); and which
Section a teacher screen is looking at lives in the URL and nowhere else (ADR-0004).

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues at `khthana/Deep-QA`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, using their default label strings. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
