# Handoff — DEEP-Core rebuild

**Workspace:** `C:\Users\khtha\OneDrive\Desktop\Code\Deep-QA`
**Written:** 2026-08-21, later the same day
**State:** `docs/acceptance/11-user-accounts.md` is walked to nothing left — **20 ☑ · 0 ◐ · 0 ☐ ·
14 ⚙**, the whole of #71. No screen was built. Eight issues were opened (#83–#90), one was closed
as a duplicate (#82), one spec and one mutant were added, and four rows of the document were
corrected where they described screens that cannot be operated as written.

Supersedes `2026-08-21-hand-walk.md` for state, **and corrects one sentence in it** — see section 2.
`2026-08-20-two-seams.md` is still the authority on **how the browser seam works** (its section 2)
and on **running the two stacks** (its section 3); nothing there changed.
`2026-08-16-planning-session.md` is still the authority on how the plan was arrived at.

**#71 is still open.** The document is finished; the ticket has not been closed and the commits
have not been pushed, both awaiting the advisor's word.

---

## 1. Where the acceptance documents stand

Row-anchored count, `grep -c '^|.*| ☐ |' docs/acceptance/NN.md` and its siblings — the space either
side of the mark is what keeps it from matching prose:

| document | ☑ walked | ⚙ seam | ☐ left |
|---|---|---|---|
| `10-application-shell.md` | 2 | 8 | **1** |
| `11-user-accounts.md` | 20 | 14 | 0 |
| `12-role-grants.md` | 6 | 9 | 0 |
| `13-user-activity-history.md` | 5 | 9 | 0 |
| `14-departments.md` | 1 | 13 | **19** |
| `15-programs.md` | 41 | 3 | 0 |
| `16-subjects.md` | 25 | 9 | 0 |
| `17-students.md` | 0 | 12 | **10** |
| `18-program-subjects.md` | 1 | 18 | 0 |
| `57-pager.md` | 1 | 8 | 0 |
| | **102** | **103** | **30** |

There is **no ◐ anywhere in the tree** any more; the legend's fourth value is defined in every
document and used by none.

**The agreed order for what remains** is #74 (19 rows, `14-departments.md`) then #64 (10 rows,
`17-students.md`). Both write real rows into `deep_core`. `npm run seed` alone does **not** undo a
write — it upserts against natural keys and leaves anything extra in place. The clean sequence is
`cd db && npm run reset && npm run migrate && npm run seed`, and it was run at the end of this
session: `users` is back to 11 rows and the seed reports 15 work groups holding 113 students.

## 2. Correction to the previous handoff

`2026-08-21-hand-walk.md` says the one row left in `10-application-shell.md` "cannot be walked
until that account can sign in at all". **That is wrong.** The external assessor signs in fine —
it was walked on 21 Aug 2026 with account `90000002`, which reached the shell and was refused only
by its validity window when the window was moved. What the row waits on is the **requirements
decision that #49 owns**: which screens the role is supposed to see. `ExtAssessor.js` holds a
placeholder menu, and a row about menu contents cannot be walked against a placeholder. The
"สิ่งที่ยังไม่ปิด" note inside `10-application-shell.md` itself always said this correctly; only the
handoff sentence was wrong.

## 3. #71 — what the walk cost, and what it corrected

The document did not merely gain ticks. Four things in it were wrong and were changed while
walking, each recorded in the document's own evidence sections:

- **Row 49's instruction was impossible.** It said to move *ใช้งานได้ถึง* back to yesterday, which
  produces an inverted window — refused by a different row's rule before the state this row is
  about can be reached. Rewritten to move the whole window into the past.
- **Row 67's instruction was impossible.** It said to pick *ผู้ดูแลระบบระดับคณะ* in the form; the
  form never offers it. Rewritten to read both dropdowns' whole option lists **and** to send
  `POST /api/users` with `FACULTY_ADMIN` past the form. What can actually be walked is stronger
  than what the document asked for: the form does not offer it *and* the server refuses it.
- **Row 69 carried a hard-coded `133/133`.** The backend suite is 270 subtests today. The row now
  says the number is a floor and dates it.
- **The header said `users.test.js` was 39 subtests.** It is 42.

Two probing lessons worth carrying:

- **A malformed probe produced false refusals.** The first round of `POST /api/users` omitted
  `department_id`/`program_id`, so *every* combination — legitimate ones included — answered `403
  ไม่สามารถจัดการบัญชีนอกขอบเขตที่รับผิดชอบได้`. Believed, it would have been reported as "a
  department administrator can create nobody", which is false. `placeAllowed()` checks the **new
  account's own placement**, not the creator's. Read the handler before trusting a refusal.
- **An absence needs the DOM, not a screenshot.** The role and scope dropdowns were proved by
  reading `select.options`, the same way #72's rows were.

**One behaviour was ruled on and deliberately kept.** A department administrator can create another
administrator **at their own level** in their own scope (`DEPT_ADMIN` at `05` → `201`, and the
creator still sees them afterwards). `assignable()` in `backend/auth/administration.js` refuses only
a *more senior* role, and the reason its docstring gives — the creator would become junior and lose
sight of what they just did — does not apply between equals. **Decided 21 Aug 2026: no change.** It
is recorded in bold in the acceptance document so it is not re-litigated as a defect.

## 4. The ◐ that became ⚙ — `11c`, and the mutant behind it

The row *ระงับแล้วมีผลกับ session ที่เปิดค้างอยู่* was half-walked for a reason about the browser and
not about the rule: two tabs of one Chrome profile share one cookie jar, so signing in as `admin@`
in the second tab overwrites the very session under test. `browser.newContext()` is what a person at
one keyboard does not have. New file:

`e2e/tests/11c-suspension-and-a-live-session.spec.js` — two contexts; the suspension is made through
the screen's own *ระงับ* button; the held session is then refused on `/api/me`, `/api/subjects` and
`/api/users` with `บัญชีนี้ถูกระงับการใช้งาน`; and a click in the user menu of the already-drawn
shell, with no reload, is refused too. It reactivates the account through the same button, and a
`test.afterAll` puts the account back active whatever the run did.

**Ordering is load-bearing here.** Files run alphabetically under one worker against one schema, and
`13a` signs in as `teacher.two@`. `11c` sits between `11b` and `12a` and must leave that account
active — hence the `afterAll` rather than a tidy line at the end of the test.

**The mutant is `11-12:M8`** — it deletes the status check from `sessionAdmission` in
`backend/auth/accounts.js` and **only** from there. `admit` makes the same test at sign-in, written
identically, so the mutant is anchored on the `unknown` line above it. Under it, `11c` dies at line
109: `/api/me` answers `200` for a suspended account, while the sign-in refusal goes on working.
That is the whole point of the row — a session checked once at the door versus a session checked on
every request look identical until somebody is suspended mid-session.

The census is now **80 mutants, one MISS** (still `13:N6`), and `mutation/README.md`'s table and
its running note both carry that figure.

**Two false starts, both cheap and both worth knowing:**

- `search()` fills the box with a term it already holds → no change event → no request → the wait
  times out. Find the row once; the screen reloads on the same term after a status change.
- The frontend has a `/user-not-found?reason=` page that handles the suspended case, and **nothing
  navigates to it**. It is inherited dead code. The live behaviour is #52's: the person stays on the
  page with a red banner. #82 was opened saying they are bounced silently to sign-in, and was closed
  as a duplicate of #52 with a correction — the silent bounce is a route guard, a different
  mechanism.

**One flake was found and deliberately left alone.** The full suite run that proved `11c` in place
came back **81 passed, 1 failed, 3 did not run**, and the failure is
`17b-students-import.spec.js:121` — `total(page)` read `0` where it expected `176`, immediately
after `openRegister(page)`. The three that did not run are the rest of that serial file. Re-running
`17a` and `17b` alone passes all eleven, and nothing in `11c` touches students: `openRegister` waits
for the response but not for React to draw the new total, so the assertion can read the pre-fetch
line. It is the same class of flake `mutation/README.md` records against `pager.js`. The one-line
fix is `await expect.poll(() => total(page)).toBe(before)`, which is the pattern that file already
uses six lines above. **It was not applied** — it belongs to #64's document, and the advisor rules
on it.

## 5. Opened this session

- **#83** — suspending yourself answers *บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้*, which is not the reason.
- **#84** — the suspend button on your own row is drawn enabled although it can never succeed.
- **#85** — the sign-in refusal disappears too fast to read; it had to be pinned with a
  `MutationObserver` to be recorded at all.
- **#86** — suspending an account is a single click with no confirmation.
- **#87** — the seed gives the external assessor an in-house address, contradicting the role.
- **#88** — the validity date inputs carry no `min`/`max`, so an inverted range is only caught after
  a round-trip. **An addition, not a replacement:** the server check and the CHECK constraint both
  stay — the row's own mutant showed the constraint catching it when the comparison is reversed.
- **#89** — a not-yet-started account and an expired one share one refusal message, although the two
  need different things done about them. **Not a defect: the acceptance row asks for exactly this.**
  Opened as a decision, and if it is taken, the document and `refusals.js` change together.
- **#90** — the scope dropdown tells a department from a programme only by the digit count
  (`วิศวกรรมคอมพิวเตอร์ (05)` against `วิศวกรรมคอมพิวเตอร์ (0501)`). Picking the wrong line is the
  wrong breadth of authority with nothing to complain about it.

**#82** was closed as a duplicate of #52; its walked evidence moved to a comment on #52.

## 6. Where the tree is

Five commits ahead of `origin/main`, which is at `6207d51`. Nothing pushed:

```
0421ddb  The six rows a machine was never going to walk
e0b0fd2  The window rows, walked with one account through every state
103b18c  The four rows a browser could not have walked, and the ticket closes
967500c  A reason that stopped being true when the row it explains grew a second half
(this session's last commit adds 11c, M8 and this handoff)
```

`967500c` is worth a sentence: rewriting row 67 to include the API refusal made the deliberate-
omission bullet that explains why the row is not ⚙ **false**, because the bullet said the row never
touches the server. A commit can invalidate its own document's prose. Re-read the paragraphs around
a row after changing it.

## 7. Gotchas that cost time

- **A fresh clone lands on a dead `master`.** Run, verbatim:
  `git branch -m master main && git fetch origin --prune && git branch -u origin/main main`
- **Never run the e2e stack while the dev stack is up.** CRA starves it, the `webServer` times out
  at 240 s, and the run reports green having tested nothing. Stop both servers first — and note that
  stopping the background task is not enough on Windows: the `node` processes survive it. Check with
  `netstat -ano | grep -E ":(3000|5000)\s.*LISTENING"` and `taskkill //PID n //T //F`.
- **The CRA dev server does not proxy `/api`.** A `fetch('/api/me')` typed into the page on port
  5000 returns the HTML shell and a `SyntaxError`. Use the absolute `http://localhost:3000` with
  `credentials: 'include'`.
- **Thai through a Bash heredoc is unreliable** (cp874). Author Thai document patches and issue
  bodies with the Write tool and apply them with a Python script using
  `io.open(..., encoding='utf-8', newline='\n')`. Anchor patches on ASCII or on line numbers.
- **`restore` the mutation harness before committing**, and check `git status` is clean of
  `backend/` and `frontend/` — that is the only proof the tree is the tree again.
- Everything in section 6 of `2026-08-20-two-seams.md` still applies.

## 8. Standing agreements (unchanged, still binding)

Section 7 of `2026-08-20-two-seams.md`, in full and without amendment. The two leaned on hardest
this session: **do not tick a row from reasoning about the code**, and **ask before pushing**.

One more that earned its place today: **the repository is public and `DEEP-QA-BACKEND/.env` holds
live credentials.** It is gitignored and verified absent from GitHub. Never print the values, never
`git add` inside `DEEP-QA-BACKEND/`, and rotate them when the writing is finished — decided
2026-08-20.
