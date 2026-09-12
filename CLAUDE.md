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

**Every ticket in `docs/07` is done** — #2–#45 are closed unbroken, #45 the last of them on
5 September 2569. What is left open are the numbers above 45: the gaps and defects the rebuild
found and opened as it went. Take which of those are open from the tracker
(`gh issue list --state open`), not from a list kept here — the list that used to stand here was
hand-kept, and a hand-kept list in a file that grows every ticket is already wrong.

**The frontier is now those, not a screen list.** Take work from the open issues above #45 and from
the ◐ rows the sheets still carry; there is no next screen waiting.

**Some of these tickets contain a decision that is not yours to make.** `docs/06` §Out of Scope
settles who answers it — *"The UI is reproduced as-is. Any proposal to change it is raised as a
question, not implemented."* Read a defect ticket for a question before reading it for a task.

The newest file in `docs/handoff/` says where the rebuild stands, what is half-done and what
will cost time — as of 11 September 2569 that is
`2026-09-11-only-the-clean-suite-says-what-a-fix-broke.md`. Read it before taking work. Each handoff names the one it supersedes for state,
so follow that chain rather than the filenames.

## Lessons — one line per rule

What the rebuild has learned is in [`docs/lessons.md`](docs/lessons.md), told ticket by ticket
with the numbers that taught it. This is its index: each line is a rule, and the ticket in
brackets is the one whose story it comes from — grep `docs/lessons.md` for that number. The lines
are compressed and the stories carry the conditions, so read the story before leaning on a rule
in a case it was not written for.

When a ticket teaches something, append the story to `docs/lessons.md` and add a line here
**only if the rule is new**. A rule met again is a sentence in that ticket's story, not a second
line here — this file reached 115 KB on 11 September 2569 because every ticket wrote both.

### A ticket's diagnosis

- **A ticket's *What is wrong* is a claim from the day it was written; measure it before you fix
  it.** It has been wrong six ways: aged (#66, #111, #55), never true (#102), generalised from
  the symptom (#122) or from the fix (#67), a mechanism that does not exist (#101), already
  decided the other way in the file it proposes to change (#48) — and the sheet itself asking
  for the defect (#89).
- Read a ticket to its end before believing its first sentence; aim at the branch, not the
  function. (#102, #119)
- **A spec that fails only in the full suite is not a flaky spec until the mechanism is measured** —
  and the leak that makes a defect reachable is not the defect. (#129)
- **A grep is evidence for the pattern you typed, not for the claim you wanted.** Re-run a
  ticket's commands, then ask what they could not have found; search for the identifier, not the
  concept — specs are written in English and sheets in Thai. (#111, #124, #83)
- A ticket that says *unless X* has told you what to go and look for; one that asks you to
  *consider* something is answered by a measurement, and *no, and here is what it would cost* is
  a finished answer. (#101, #89)
- When a criterion is met literally but arguably not in substance, measure it — cheaper than
  arguing or refactoring. (#66)
- When the first measurement finds nothing, read the numbers; do not conclude absence and do not
  move the test until it passes. (#121)
- A ticket that states how many places it changed has published a claim a one-minute grep can
  check. (#55, #96, #107)
- Finding the question is half the move; asking it is the other half. (#96)
- **Defer adjacent work; do not defer the second half of the sentence you are closing.** A
  deferral written into prose and not into the tracker is a decision nobody can find. The same
  hole in two guards is two tickets when the blast radius differs by an order of magnitude.
  (#119, #89, #125)
- Read a file's own comments for the rule before inventing one; a rule borrowed whole borrows its
  defect too. (#83)

### Marks on the sheets

- **A ⚙ that was never earned is the mark to distrust most** — ten tickets running. ⚙ means a
  mutant killed **that row's own assertion** and the cited assertions cover the row **whole**; a
  row proved only at the HTTP seam is ☑. The mark says which seam proved a row; the sweep says
  whether it was proved at all. (*A ⚙ that was never earned*; #119)
- Read both ways: down the ⚙ rows for one naming no mutant, and through the mutation file for a
  mutant no row cites — and read a *kills* column as a claim about the criteria table too.
  (#44, #97, #101)
- **A row that names two ways in is two rows.** Read every *both … and* as two claims. (#66)
- **Explaining a gap in prose is not the same as marking it.** (#50)
- Check what an assertion actually says, not only that one exists; where a sheet says *ordered
  by X*, check the assertion reads X rather than passing it through. (#40, #96)
- **A ☐ that names a ticket is a working link between two sheets, not a gap in one of them.**
  Never invent a fifth mark. (#97, #66)
- A ◐ is one of two kinds — a request no control can produce, which waits on nobody, or an
  attribute that reached the DOM and needs an ear, which is a real queue. Count them apart. (#85,
  #111, #122 — told under *The ◐ and ☐ rows*)
- A sheet that hands a claim to another sheet has written a pointer a later ticket can delete;
  after removing content, grep for the file it lived in. (#124)
- A sheet's prediction about what a future fix will not break is a claim like any other. (#52)
- **A hand-kept number in a file that grows every ticket is already wrong** — count the table,
  and after correcting a figure grep for the wrong value again. A rule written to correct a wrong
  number is itself a claim to check. (#119, #96, #48)
- **A survey of the store has a date on it, and a successful fix is what expires one.** Read the
  date before the figure. (#50, #85)

### Mutants and sweeps

- Read a sweep five ways: a **MISS** means the anchor moved; a **survivor** may be a claim never
  at risk (delete the mutant, mark ☑); a mutant that **kills too much** has stopped the
  application; a **survivor on a row nobody suspected** is an overclaim; and a sweep **cannot see
  the row your own fix breaks** — only the clean suite can. (#45, #97, #96, #83)
- **A mutant has to be able to fail one row and leave the rest standing.** Narrow a mutant on a
  shared expression to its branch; when *does it choose the right thing* stops the application,
  mutate to a different choice rather than to no choice; a mutant that removes a condition must
  keep its parameters referenced. (#97, #102, #101)
- Before reading a kill count that looks like the suite as a mutant that stops everything, read
  the names for a leak. (#52)
- **Two places holding one opinion is not a safety margin; it is a claim neither of them can be
  shown to hold.** (#97)
- **An attribute a locator is built on stops being provable by mutation** — it is the premise of
  those rows; an attribute read off a located element is a claim. The trap is using it in the
  locator every other row shares. (#85, #111)
- **Two mutants that vary the same property cannot see a third property.** One crafted value
  proves one link of a guard; craft one per link, before the sweep. Say which of three a clause
  is: proved, structurally unreachable, or untested. (#96, #107, #102)
- **A mutant outlives its ticket but not its anchor.** Run `python mutation/anchors.py` while
  finishing a ticket, anchor to the code a mutant breaks and never to the comment beside it, and
  when a constant is arbitrary mutate the operator beside it. (#121, #123, #101, #125)
- An anchor check tells you a mutant no longer applies; only a sweep tells you it no longer proves
  anything. (#107)
- When a mutant lives in shared code, its sheet is one of the places it kills, not the list. (#123)
- **What corrupts a sweep is a repeated path — compare `FILES`, not subject matter**, and ask the
  census script rather than your memory; the figure that decides is the group, not the total.
  (#85, #87, #125)
- Run `save` before every mutant, and read `git status` after `apply` as well as after `restore`.
  (#124, #126)
- A `mode: 'serial'` spec reports the first dying row and skips the rest, so measure each row on
  its own; a top-level `node --test` test reads like a suite header in `not ok` lines, so read
  the names. (#67, #48)
- A fixture that restores itself only when its row passes inflates the next mutant's kill count —
  put it back in `finally` or `afterAll`. (#89, #52)
- Report the measured number, not the ticket's — and notice when one number is two (killed and
  hardened). (#102, #48)

### Tests and fixtures

- **A retrying negative against an element that removes itself is an assertion that cannot
  fail.** Read the count once, at a named settle point. (#50)
- **A status code is not an assertion about your guard on a route with more than one way to
  answer it.** A row that passes both before and after a fix was never about it. (#125, #83)
- **Anything written for timing must not be able to decide anything.** (#52)
- **Chase every place a number is cited**, not every row of the table you are in: after inserting
  a test mid-file, grep the store for the row numbers — or append tests at the end. (#97 and #85)
- After adding a role or a label anywhere shared, grep the specs for unfiltered `getByRole` on it;
  `aria-live` announces without joining the set those lookups search. (#111, #122)
- A locator built on one seeded value can answer *not there* about a thing that is; ask what a
  helper promises, not what it does. (#101)
- **A defect that survived green suites usually survived because no fixture could express it**,
  and the fix is a fixture. A fixture built inside one test file is one no other file has; a
  seeded role needs the role's distinguishing property; ask a question of the rule, not of the
  row. (#96, #102, #48, #87)
- Two `includes` cannot fail on a list that is too wide. (#102)
- A test that passes because of a defect tends to explain itself in its own comment. A row that
  needs a defect to be reachable must be rewritten the day it is fixed — write that on the row.
  (#67, #96)
- A helper written to restate a rule independently has to restate it exactly. (#96)
- A scan that reads a function's own text stops at that function's boundary. (#89)
- Before trusting a new assertion, break the thing it is about; when nothing fails, the claim has
  an owner you have not found yet. (#124)
- **A defect nobody can see needs a mutant or it is not proved.** (#111)
- **A row that catches a defect on some runs is not the row that holds it** — the row that holds it
  builds the situation itself, rather than waiting for another spec to leave one behind. But a row
  that builds its own situation is still handed a world it did not build: assert the shape it needs,
  not the values the seed would have given. (#129)
- A branch correct data never reaches is still reached by incorrect data. (#96)
- When two tests sit either side of a line, check whether anything runs the line; a reason why
  one half of a thing cannot be tested is not a statement about the other half; draw a stub's
  boundary at the machine's edge. (#119)

### Guards and code

- **A guard that greps the same is not the same guard — read what it does with its `null`.** A
  convention is a claim about behaviour, not about a column; a repeated `ORDER BY` is not
  automatically a repeated defect. (#107, #67, #96)
- A helper named for a type is a promise about that type; a form-field helper has been told about
  values and not about shapes. (#107, #101)
- A guard that is strict about a format cannot see a mistake about meaning. (#124)
- Before adding a parameterised refusal, find every site that turns that reason into a sentence —
  the grep is `REFUSALS[`. When one change lands at two sites, write a mutant per site. (#125)
- When a client must tell two refusals apart, have the server say which at the point of deciding.
  A guard that says *only once* has to say once per what. (#52)
- A number copied from a sibling screen is a decision, not an inheritance. (#45)
- An accessibility fix does not get to change layout on the way past, and a rule about layout is
  checked with numbers. (#111, #122)
- A ticket that generalises across screens has usually generalised the symptom — check whether the
  rule generalises; ask what is actually shared, the code that runs or the value handed to it.
  (#122, #67)
- When asking whether two things may be shown together, look at what makes a row nameable. (#101)
- Before removing something, ask what it was teaching. (#124)
- A tool that cannot say what it did not look at is the same species as the hand-kept numbers it
  checks; when a tool skips things by name, adding a file makes it lie; a guard that reads the
  world before it writes has to survive every state the world is in. (#123, #126)

### Walks

- **A walk asks whether what was drawn can be read; it cannot ask whether what should exist is all
  there.** (#50)
- **Every automated row asks whether a control works; only a person asks whether it is there to be
  found** — or whether responding was worth offering. (#45, #40)
- Not drawing a thing is not the same as not leaving a hole where it was, and drawing a thing is
  not the same as drawing it truthfully. (#41, #44)
- What a walk is for is the appearance: ask the person to look, one property at a time. A row
  waiting on a situation the seed does not contain is walkable — build the situation and restore
  it afterwards. (#39; *What the hand-walks found*, *A ⚙ that was never earned*)
- If a ticket is about to decide a screen's fate, walk that screen after it, not before. (#66)
- A near-miss caught inside your own change is not a finding about the store. (#124)

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
| `docs/lessons.md` | What the rebuild has learned, ticket by ticket. `CLAUDE.md`'s lessons section is its index. |
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
