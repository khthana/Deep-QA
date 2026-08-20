# Handoff — DEEP-Core rebuild

**Workspace:** `C:\Users\khtha\OneDrive\Desktop\Code\Deep-QA`
**Written:** 2026-08-20 · end of the session that closed #16 and #62
**State:** Six screens built and accepted, and every acceptance checklist walked. The next
action is ticket **#18**.

Supersedes `2026-08-16-planning-session.md` for state; that document is still the authority on
how the plan was arrived at and on the working agreements in its sections 3 and 7.

---

## 1. Where the rebuild is

Closed: **#2–#16**, plus **#46**, **#53**, **#57**, **#59**, **#62**. That is the whole platform layer and the
first six screens — application shell, user accounts, role grants, activity history, departments,
programmes, subjects.

Open and unblocked (the frontier):

| Ticket | Why it is next |
|---|---|
| **#18 Program Subjects** | On the critical path. Both blockers (#15, #16) are closed. This is the intended next ticket. |
| #17 Central student register | Independent of #18. |
| #19 PLOs, #21 Rubrics | Also free; neither is on the critical path. |

Query the frontier with `gh api repos/khthana/Deep-QA/issues/<n>/dependencies/blocked_by`.
The GraphQL `blockedByIssues` field **does not exist** — do not retry it.

Open issues that are findings rather than planned work: #47–#56, #58, #60, #61. (#62 is closed — see section 2.)
Two need the advisor, not code: **#61** (does a Faculty Admin maintain the Subject catalogue? — the
spec says yes, practice may not) and the credits-as-integer question in `16-subjects.md`.

---

## 2. #62 — closed

`frontend/src/api/client.js` puts the byte-order mark back in `saveAsFile` before the blob is
built. `formatCsv` writes one; `response.text()` strips it (the Fetch specification decodes UTF-8
with a BOM-removal step); Excel then read a Thai template as cp874 mojibake. Committed as `1bd1dc0`.

Walked in Excel on 2026-08-20 and all five rows pass — the template row of
`11-user-accounts.md` (5), `14-departments.md` (5), `15-programs.md` (7) and `16-subjects.md` (6.1),
all now ticked, plus one row the fix created for itself: a filled-in template uploaded back now
carries `ef bb bf` for the first time, and `backend/lib/csv.js:37` strips it as its source claims.
Nothing about this is covered by a test — `docs/06 §Testing Decisions` puts frontend components
outside the suite, and the 243-test backend run never loads `client.js`.

Row 3 above is the one that was ticked once **without** being opened in Excel, unticked in
`f9b3366`, and re-walked properly here. That is the failure mode to watch for: a checklist row
ticked from reading the code rather than from running it.

---

## 3. Running it

```
docker start deep-core-postgres
cd db       && npm run reset && npm run migrate && npm run seed
cd backend  && npm start          # :3000
cd frontend && npm start          # :5000
```

- Postgres on **port 5433** (machine-specific — `DB_PORT=5433`), database `deep_qa`, user `deep_core`,
  **schema `deep_core`**: any `psql` session needs `set search_path=deep_core`.
- Every seeded account's password is `deep-core-local`. The database is currently at a clean seed.
- **Restart the backend, do not merely check that something is listening.** A process started before
  a route existed answers 404 and reads as a frontend bug; this cost a false failure during #57.
- Tests: `cd backend && node --test "test/*.test.js"` — **243 pass, 0 fail** at `1bd1dc0`.
- Frontend has no typechecker (CRA JS). The compile check is `cd frontend && npx react-scripts build`.

---

## 4. Open items carried forward

Each acceptance checklist ends with a `## สิ่งที่ยังไม่ปิดใน #N` section; those are the authority.
The ones with no issue behind them yet, gathered here so they are not lost:

- **#13** — `user_log` has no retention policy; `madeOn` in `GrantsPanel.js` uses the browser clock;
  `IMPORT_USERS` writes one line naming no target; `GRANT_ROLE`/`REVOKE_ROLE` name the grantee but
  not the role or its scope; `CONTEXT.md` still lacks a glossary entry for "Activity log entry".
- **#16** — the department filter is not back-ported to the Programmes screen; `?active=1` has no
  caller until #18 and #23; credits are `integer` only; there is no search by subject code or name.
- **#57** — `PAGE_SIZE = 10` is still declared per screen; `<Pager>` has no jump-to-page.
- **#11** open item 1, **#12**'s open items, and **#10** checklist entries 5 and 7 are still unacted.
- `db/` test files duplicate `section(tag)` / `offering(tag)` helpers.
- The scratch note `_local/issue-profile-photo.md:26` cites `#35`; the live issue is **#47**.

---

## 5. Gotchas that cost time in this session

- **A fresh clone lands on a dead `master`.** Run, verbatim:
  `git branch -m master main && git fetch origin --prune && git branch -u origin/main main`
- **Do not print Thai or box-drawing characters through the Bash tool.** The console is cp874 and
  `print()` raises `UnicodeEncodeError`. Verify edits with `grep -c`, `grep -o`, `cut -c1-N` or
  `git diff --numstat`. Python edits must use `io.open(..., encoding='utf-8', newline='')` and should
  assert the marker count before replacing.
- **`rev` does not exist in Git Bash.** To read a checklist tick use `sed -n 'Np' | grep -o` on the
  two box characters rather than reversing the line.
- **Write `gh` bodies to a file and pass `--body-file` with an absolute path**, run from inside the
  repo. Heredocs break on apostrophes. `$TMPDIR` is unset under the Bash tool — it expanded to `/`
  and the write was refused; use the session scratchpad path in full.
- **A literal U+FEFF written into source by a script is invisible and wrong.** Emit the six-character
  escape instead, as `backend/lib/csv.js:27` has it.

---

## 6. Standing agreements (unchanged, still binding)

- The repository is **public**. `DEEP-QA-BACKEND/.env` holds live credentials and is gitignored and
  verified absent from GitHub — **never print the values**. Whether to rotate them, and whether the
  repository should be private, is the advisor's call.
- `DEEP-QA-BACKEND/` and `DEEP-QA-FRONTEND/` are **read-only reference**. Copy from them, never edit
  them; delete them only at project completion. `DEEP-QA-BACKEND/uploads/` is roughly 200 files of
  real assessment evidence — personal data, never commit it.
- Reply in Thai with English technical identifiers. **Ask before pushing.** Do not spawn subagents,
  workflows or deep research unless the advisor asks for them.
- A ticket is complete when the tests pass **and** the hand-walked checklist is worked through
  (`docs/06 §Acceptance`). Do not tick a row from reasoning about the code.
- Two revised brief instructions are settled and not to be relitigated: the mock-API-first approach
  was dropped, and the programme-level screens moved to the end of the ordering.
