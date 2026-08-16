# Handoff — DEEP-Core rebuild

**Workspace:** `C:\Users\Terry\Desktop\Code\Deep-QA`
**Written:** 2026-08-16 · end of the planning session
**State:** Planning complete and published. **No rebuild code written yet.** Next action is ticket #2.

---

## 1. What this project is

DEEP-Core is a curriculum and learning-outcomes management system built as an undergraduate thesis project at KMITL.
The user is the project's **academic advisor**, not its author. They inherited the source code and the thesis — and no
database of any kind. The system therefore cannot be run, and nothing about it has been verified.

This session did no implementation. It ran a grilling session over the inherited documents and code, made the design
decisions the rebuild depends on, and published the whole plan to GitHub Issues.

---

## 2. Read these first — do not re-derive them

Everything decided is written down. Read in this order:

| Source | What it holds |
|---|---|
| `CLAUDE.md` | Entry point. Current state, documentation map, and the three decisions easiest to violate by accident. |
| `CONTEXT.md` | Domain glossary, 25 terms. **Use this vocabulary** in issues, tests, commits and conversation. |
| `docs/adr/0001` `0002` `0003` | Key strategy · server-side authorisation · CLO grain. Binding. |
| `docs/06-implementation-plan.md` | The spec. 105 user stories, implementation and testing decisions, scope boundaries. |
| `docs/07-ticket-breakdown.md` | 44 tickets, 57 dependency edges, the 17-ticket critical path, and how to query the ready frontier. |
| GitHub [#1](https://github.com/khthana/Deep-QA/issues/1) | The spec as the parent issue. [#2](https://github.com/khthana/Deep-QA/issues/2)–[#45](https://github.com/khthana/Deep-QA/issues/45) are the tickets. |

`docs/01`–`05` describe the **student implementation as delivered**, not what to build. Each now carries a note where
the rebuild diverges — heed those notes; the raw content will otherwise mislead you.

Git history: `ff10a91` baseline (student code as delivered) → `7bff235` line endings → `9d47c9e` docs. Pushed to
`origin/master`.

---

## 3. How the user works — this matters

- **They write in Thai.** Reply in Thai, keeping technical identifiers in English. The repository documents are in
  English; the conversation is not.
- **They engage with real trade-offs and will override you.** During the grilling they reversed one of my
  recommendations after asking a good question about it (CLO grain), and twice asked me to re-ask a question with more
  detail rather than accepting a thin framing. Give them the actual reasoning and the actual cost, not a summary.
- **They changed their own brief twice when shown evidence.** Two instructions from the original brief were dropped —
  the mock-API-first approach and the position of the programme-level screens in the ordering. The reasoning is in
  `docs/06-implementation-plan.md` under "Further Notes". **Do not relitigate these.**
- They ask for things to be recorded in detail. Documentation is expected as work product, not overhead.

---

## 4. Where to start

**Ticket [#2](https://github.com/khthana/Deep-QA/issues/2) — Local PostgreSQL and migration runner.** It is the only
ticket on the frontier; everything else is blocked.

To find the frontier after that (blocking edges are native GitHub dependencies, so this is queryable):

```bash
for n in $(seq 2 45); do
  b=$(gh api repos/khthana/Deep-QA/issues/$n --jq '.issue_dependencies_summary.blocked_by // 0')
  [ "$b" = "0" ] && gh issue view $n --json number,title --jq '"#\(.number)  \(.title)"'
done
```

The rebuild goes into **new** `backend/`, `frontend/`, `db/` trees. `DEEP-QA-BACKEND/` and `DEEP-QA-FRONTEND/` are
read-only reference — copy from them, never edit them, delete them only at project completion.

---

## 5. Open items the artifacts do not capture

1. **Default branch is `master`.** The user was offered a switch to `main` and has not answered. Cost is still zero —
   nobody has cloned. Raise it once, then drop it.
2. **The nested git repository removed from `DEEP-QA-FRONTEND/` was backed up outside the repository and is now
   gone.** It contained zero commits, no refs and no remote — only dangling blobs of files that still exist on disk,
   so nothing of value was in it. It was deliberately not brought into the repository: it is 4.9 MB of nothing, and a
   git directory inside a git repository causes more problems than it solves. Mentioned here only so the question does
   not resurface as a mystery.
3. **The repository is public and `DEEP-QA-BACKEND/.env` holds live credentials** — OAuth client secret, database
   password, session secrets, mail credentials. It is gitignored and verified absent from GitHub (API returns 404).
   Two things remain untouched and are the user's call, not yours: whether those credentials should be rotated given
   they are also in use by the deployed system, and whether the repository should be private. Never print the values.
4. **Roughly ten deliberate divergences from the thesis** are recorded across the ADRs and the doc notes. If something
   in `docs/01`–`05` seems to contradict a ticket, the ticket and the ADR win.

---

## 6. Practical gotchas from this session

- **`to-spec` and `to-tickets` are `disable-model-invocation`.** You cannot call them and must not reproduce their
  workflow by other means. Ask the user to type the slash command.
- **Do not build `gh issue create` bodies with shell heredocs.** Quoting broke on apostrophes and nested quotes.
  Write bodies to files and pass `--body-file`. The working publisher is committed at
  `scripts/github/publish-tickets.sh`, with the bodies it published in `scripts/github/ticket-sources/`.
- Issue numbering came out as **ticket N = issue N+1** (ticket 1 → #2). Referenced throughout `docs/07`.
- `gh` is installed and authenticated as `khthana`. Docker 29.6.2 is available with `postgres:16-alpine` already
  pulled. Node 22, so `node:test` is stable and no test framework needs adding.
- The backend has **no tests at all** and the frontend only its scaffold test. Ticket #7 establishes every pattern
  later tickets follow — treat it as setting precedent, not as throwaway plumbing.

---

## 7. Suggested skills

| Skill | When |
|---|---|
| **`/tdd`** | Building any ticket. Every ticket's acceptance criteria are written as checkable assertions at one seam — the HTTP surface against a real database. This is the default working mode from #2 onward. |
| **`/run`** | Before handing a ticket back for acceptance. Each ticket ends with a manual checklist the advisor works through in the running system; verify it yourself first. |
| **`/code-review`** | After a ticket's changes are complete, before asking for acceptance. Reviews against both the repo's standards and the originating issue. |
| **`/domain-modeling`** | Whenever a new domain term surfaces or a decision turns out to be hard to reverse. `CONTEXT.md` and `docs/adr/` are live documents, not a one-time deliverable. |
| **`/diagnosing-bugs`** | The inherited code is unverified. Expect defects that are not in the ticket. |
| **`/qa`** | When the advisor reports problems conversationally during acceptance — files them as issues with the right vocabulary. |
| **`/to-tickets`** | Only if scope grows beyond the current 44. User-invoked only. |

Do **not** start with `/grill-with-docs` or `/to-spec` again. That work is finished and published.
