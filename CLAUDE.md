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
(`gh issue list --state open --limit 100` — without `--limit` it stops at 30), not from a list kept here — the list that used to stand here was
hand-kept, and a hand-kept list in a file that grows every ticket is already wrong.

**The frontier is now those, not a screen list.** Take work from the open issues above #45 and from
the ◐ rows the sheets still carry; there is no next screen waiting.

**Some of these tickets contain a decision that is not yours to make.** `docs/06` §Out of Scope
settles who answers it — *"The UI is reproduced as-is. Any proposal to change it is raised as a
question, not implemented."* Read a defect ticket for a question before reading it for a task.

The newest file in `docs/handoff/` says where the rebuild stands, what is half-done and what
will cost time — as of 5 October 2569 that is
`2026-10-05-the-way-in-that-needed-no-link.md`. Read it before taking work. Each handoff names the one it supersedes for state,
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
  it.** It has been wrong twelve ways: aged (#66, #111, #55), never true (#102), generalised from
  the symptom (#122) or from the fix (#67), a mechanism that does not exist (#101), already
  decided the other way in the file it proposes to change (#48), filed under the wrong half of
  its own table (#133), a key's name read as its text (#127) or a parameter's name read as a
  claim about what the caller puts in it (#185), an inference drawn from a
  measurement that was itself correct (#165, #186), a list of verbs naming an action no route performs
  (#58), a count of red rows inflated by the runner's output shape, with an explanation under it
  that was arithmetically impossible before anybody ran anything (#187) — and the sheet itself
  asking for the defect (#89).
- **A ticket's supporting identifiers are a claim like its numbers** — #54's argument named five
  other years to show this one was the odd one out, and of the five, two tables do not exist under
  those names, one carries no such column and one is pluralised: they are `CONTEXT.md`'s names for
  the *concepts*, which is what a glossary is for and not what a schema is called. Ask
  `CREATE TABLE` before pasting the list, because it gets pasted more than once — this one reached a
  migration header, a glossary entry and a divergence note before anybody checked, and the ticket's
  count of the exempt usages had drifted from two to six the same way. (#54)
- **A ticket's reason for being *untestable* is a claim like its numbers** — #141's was
  three correct measurements resting on one word: *two addresses of the same route shape are
  never adjacent in history*. The browser's own history list travels any number of entries in one
  move, so a sequence that goes up through an unmounting list is one jump from being a sibling move.
  Measure whether the document survived; do not reason about it. (#141)
- **A ticket's reason for *not hurting yet* is a claim with a date too** — and it is the claim that
  decided how long the ticket waited, so reading it as still true is an argument for closing the
  ticket unfixed. What the ticket wrote down as a prediction can be the state on the day it is
  taken. (#81)
- **A blocker's own expiry condition is a claim about which way in its author had in mind** — the
  date is right for that way in and blind to any other, so writing it down (which #81 asks for)
  is what keeps the blocker looking fresh. #179 one layer along: a *reason* that names a way in
  has named a way in, not the population. Ask which half of the situation has to come from inside
  the application at all — of two addresses, only the second did. (#141)
- **A ticket's own fallback is not the ticket's target, and the clause that licences it is a
  condition to measure against your own code.** #116 wrote its target as a sentence and offered a
  cheaper half *at minimum, with no data from the server*; the first round drew the cheap half and
  the sheet called it the fix — while the implementation was asking the server, and the answer
  carried the missing part beside the one that was drawn. The fallback is a claim like the ticket's
  numbers too: this one would have drawn *Section 3* for a class nobody teaches, because the id in
  the address is a surrogate key and the number a person reads is a label. The measurement that
  refutes such a fallback usually hands over the fixture as well, being the place where the two
  disagree (#117). (#116)
- **A ticket's cost line is a claim about the shape its author pictured, not about the option** —
  and unlike its other claims this one is about the *fix*, so it is what decides which option gets
  built. #77 priced one option at a request it adds, when the price was a full-screen curtain its
  own neighbour had already measured, plus a race the function's own docstring had dated; and
  priced another at *spreads session knowledge into every endpoint*, when the mount point that
  already holds the data and the client funnel that already holds the listener made it two sites
  and one `exposedHeaders` line. Re-derive each price from the mount points before choosing. (#77)
- **A ticket that names a race has named a window, not the population of ways in** — the same wrong
  screen can be reachable with no race at all, and that way lasts until a reload, so it is the one a
  person meets. Measure for the raceless sibling before accepting the sequence the ticket wrote.
  (#179)
- **A conclusion that is right for the wrong reason expires on the wrong day** — the reason is what
  dates it, so a premise that is false while the conclusion holds is the hardest kind to notice:
  nothing it predicts is wrong yet. *The account holds one Section* and *the dashboard lists one
  term* were the same verdict and two different expiry dates, and `docs/lessons.md` had had the
  true one in §#25 all along. (#141)
- Read a ticket to its end before believing its first sentence; aim at the branch, not the
  function. (#102, #119)
- **A spec that fails only in the full suite is not a flaky spec until the mechanism is measured** —
  and the leak that makes a defect reachable is not the defect. When the mechanism is measured, what
  is intermittent may be the **read** rather than the thing read: a screen can be wrong on every
  single run behind a row that is red on some of them. (#129, #164)
- **A row that runs before your change's code cannot be failing because of it.** The run order is part
  of the mechanism and the cheapest part: `--list` rules the diff out in seconds, before anything else
  is understood. Three reproductions against a clean control can still be coincidence. (#150)
- **Two mechanisms for one symptom are measured as a grid, not argued as a choice** — the one
  masked by the other is still there when the other is fixed. (#148, #149)
- **A grep is evidence for the pattern you typed, not for the claim you wanted.** Re-run a
  ticket's commands, then ask what they could not have found; search for the identifier, not the
  concept — specs are written in English and sheets in Thai. **A ticket's file list is a grep
  somebody else ran**, and matching every file on it answers half of *confirm before you change*.
  But a **copy** of a rule holds none of the rule's letters, so hunt that one by the value, in
  every spelling a screen can write it. (#111, #124, #83, #68, #133, #145)
- **A census whose population is *the things that carry X* cannot find the thing that carries no
  X** — and the census you write to replace a grep is evidence for the pattern *it* typed, so the
  one that reads a comparison only one way round reports a guarded screen as bare. Read the files
  the instrument names before believing either answer. **A rule that is too loose fails the other
  way and only breaking a real site shows it** — one that reads any call to a parameter as a guard
  answers *guarded* whatever the code says, and its fixtures pass either way. The other way a census
  misses is counting by the wrong property, under *Tests and fixtures*. (#141, #174)
- **A marker written for an instrument has to be in a syntax the instrument reads** - `//`
  between two JSX tags is `JSXText`: the parser sees no comment and the browser draws the words
  on the screen, so a census read three marked sites as bare and a note addressed to it nearly
  shipped above a report heading. The same species as a tool that cannot say what it did not look
  at, except that what it could not look at was the note written for it. (#93)
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
  defect too — and what an instrument *means* is documented in the file that uses it on purpose,
  not in the one you are changing: `66a`'s docstring said `framenavigated` fires for history-API
  moves, and the fence that needed the opposite was built on it four tickets later. (#83, #168)
- **A guard written for one caller is a claim about every caller** — find the others before
  writing the comment that says they are safe, because that comment is the claim, and a caller
  passed by reference is invisible to a grep for the call. (#68, #133)

### Marks on the sheets

- **A ⚙ that was never earned is the mark to distrust most** — ten tickets running. ⚙ means a
  mutant killed **that row's own assertion** and the cited assertions cover the row **whole**; a
  row proved only at the HTTP seam is ☑. The mark says which seam proved a row; the sweep says
  whether it was proved at all. (*A ⚙ that was never earned*; #119)
- Read both ways: down the ⚙ rows for one naming no mutant, and through the mutation file for a
  mutant no row cites — and read a *kills* column as a claim about the criteria table too.
  **A row naming the wrong mutant is the third way**, and the sweep table that contradicts it can
  be in the file written the same day. The fourth is a row that cites the right mutant and never
  states its claim — an overclaim read backwards, and the only one of the four that leaves the
  sheet looking modest. (#44, #97, #101, #117, #116)
- **A row that names two ways in is two rows.** Read every *both … and* as two claims. (#66)
- **Explaining a gap in prose is not the same as marking it.** (#50)
- Check what an assertion actually says, not only that one exists; where a sheet says *ordered
  by X*, check the assertion reads X rather than passing it through. (#40, #96)
- **A ☐ that names a ticket is a working link between two sheets, not a gap in one of them.**
  Never invent a fifth mark. (#97, #66)
- A ◐ is one of two kinds — a request no control can produce, which waits on nobody, or an
  attribute that reached the DOM and needs an ear, which is a real queue. Count them apart. (#85,
  #111, #122 — told under *The ◐ and ☐ rows*)
- **A row can gain a walkable half the day a ticket lands** — a ☑ going back to ◐ is not always a
  regression; it can mean there is something on the screen to look at for the first time. (#105)
- A sheet that hands a claim to another sheet has written a pointer a later ticket can delete;
  after removing content, grep for the file it lived in. (#124)
- A sheet's prediction about what a future fix will not break is a claim like any other. (#52)
- **A hand-kept number in a file that grows every ticket is already wrong** — count the table,
  and after correcting a figure grep for the wrong value again. A rule written to correct a wrong
  number is itself a claim to check. (#119, #96, #48)
- **When the instrument and a hand-kept figure disagree, run the instrument at the commit the
  figure was written at** — that, and not argument, says which of the two is wrong, and a counter
  that reproduces a record's four figures at its own commit is the record's instrument rather than
  a fourth opinion. Both of this one's first two rules were evidence about the property they
  counted (#174): a mark column is found from each table's own header, because a sheet heads it
  `✓` or `ผล` and can put it in the middle. (#141)
- **What a diff touches is what a diff proofreads** — correcting one hand-kept figure finds the one you were looking
  at, not the next one twenty lines down; and two documents changed in the same breath can be shipped contradicting
  each other. After changing what a document counts, re-read every figure in it, and read the pair side by side.
  (#154)
- **A citation by line number ages the day anything above it grows** — so a sheet cites an
  assertion by a string that can be found in the spec, and the instrument says which of three
  it is (#159's shape: still there, gone, or no suite to ask). But citing code by its text is a
  claim that the text is unique, and where it is not — the same line twice in one test, two
  mutants dying on it — the fix is a `message` in the spec, not a cleverer citation. An
  instrument that reads its own documentation counts its own examples, so it skips fences and
  says how many; and a dated record is not a citation (#54). The three ways the instrument itself
  was wrong: it re-derived a resolution rule this repo had already measured and written down four
  hundred lines up in the same file (the substring rule, #154/#158) and so answered *one file*
  about an ambiguous citation; it printed *could not ask* without reaching the exit code, which is
  a fourth answer and not a third; and the figure it published was counted by a second counter I
  wrote instead of by the instrument, so it measured the old spelling and missed five of its own
  species. (#173)
- **A table that adds up is not a table that is complete** — what is missing from it is invisible to
  a sum over it, so *count the table* gives a confident wrong answer. Ask the instrument that counts
  the things rather than the rows, and when it disagrees, the rows are what is short. (#58)
- **A survey of the store has a date on it, and a successful fix is what expires one.** Read the
  date before the figure. (#50, #85)
- **A claim written in prose expires like a number** — and the copy you will miss is in the file
  you did not think you were changing; grep the sentence as well as the figure, and grep
  `File.js:` when a file grows lines. (#130)
- **A mark that is written is not a mark that is read** — a stray `|` puts it in a column the
  table does not have, and the sheet renders the empty cell beside it; seven rows were doing this.
  Count the cells, not only the marks — then read the numbers before raising the alarm: all seven
  hid a ☑, so the walk queue was never wrong. Measured against GitHub's own renderer, the cells
  past the header's width are **dropped** rather than moved along, so the mark is gone and not
  merely misplaced. (#79, #175)
- **A rename reaches a sheet's criteria and not its record** — the criteria rows and the open
  questions say what the system *is*, so a later walker needs the new identifier in them; a dated
  walk table says what one measurement returned, and #54's sheet says so itself in bold. Change the
  first, leave the second and add the note naming which of its rows would read differently today. A
  global replace over one file does both. (#54)

### Mutants and sweeps

- Read a sweep five ways: a **MISS** means the anchor moved; a **survivor** may be a claim never
  at risk (delete the mutant, mark ☑); a mutant that **kills too much** has stopped the
  application; a **survivor on a row nobody suspected** is an overclaim; and a sweep **cannot see
  the row your own fix breaks** — only the clean suite can. (#45, #97, #96, #83)
- **A mutant that survives where its own file predicted a kill has found a row that does not
  exist yet** — the fix is the row, not the mutant, and believing the prediction would have left
  the claim it exists to prove with nothing under it. (#118)
- **A survivor the sheet predicted is the survivor to distrust.** The prediction answers the sweep's
  question before anyone asks the row what it was for — and a seam said to be unable to build a
  situation is a claim about a helper's mechanics, measurable in one assertion. (#51)
- **A row written to answer a survivor is not proof until that mutant is run again.** The row is
  what gets measured, not the measurement — and a kill count can hold a leak as easily as it can
  look like the suite, so read the names and the run's duration beside them. (#146)
- **A read of something a mutant stops from existing is a wait, not an assertion** — it dies at the timeout,
  which a mutant that stopped the application would print too; count what holds a field before reading
  it. (#139)
- **A row that pins today's value and a row that says the screen reads the rule are two claims** —
  the control mutant is what tells them apart, killing the first and leaving the second standing.
  (#145)
- **A mutant has to be able to fail one row and leave the rest standing.** Narrow a mutant on a
  shared expression to its branch; when *does it choose the right thing* stops the application,
  mutate to a different choice rather than to no choice; a mutant that removes a condition must
  keep its parameters referenced. (#97, #102, #101)
- **A ticket’s proposed shape for a mutant is a claim, and what the claim is about is not
  always where the mutant goes** — the site is chosen by which line has to go red. #193’s
  claim was about the freshness of a grants read, which lives in `attachRoles`; the assertion
  stating it is decided in `requireRole`, and `/api/me` is mounted above every `requireRole`,
  so the memo the ticket proposed one layer up went stale for the shell as well and killed the
  row at the assertion *before* the target — leaving it exactly as unproved, behind a red row.
  (#193)
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
- **A mutant name can collide across sheets, and the sheet is where it shows** — the harness
  keys a mutant inside its own file, so two tickets fixing the same shape write the same name,
  and a criteria sheet that carries both tickets' rows then reads as one mutant cited twice.
  Rename the second before the table is written. (#185)
- **A mutant outlives its ticket but not its anchor.** Run `python mutation/anchors.py` while
  finishing a ticket, anchor to the code a mutant breaks and never to the comment beside it, and
  when a constant is arbitrary mutate the operator beside it. (#121, #123, #101, #125)
- **A change to a function's signature reaches every mutant that writes a call to it**, not only
  those anchored on one — grep the replacement strings too; `anchors.py` reads anchors. (#140)
- **A formatter run is a change to every mutant anchored in that file, and the diff does not say
  so** — it reads as whitespace. The installed prettier is newer than the committed style, so it
  does not reproduce the tree it is run on (`Mainpage.js` and `CourseOutcomes.js` already fail it
  clean, which `npx prettier --check` says without writing): do not run
  `npm run format`, and run `anchors.py` if anything has. (#189)
- **A comparison no mutant at the call can split is split where its operand is written** — leave
  one control out of the dependencies of the effect that writes the ref. (#144)
- An anchor check tells you a mutant no longer applies; only a sweep tells you it no longer proves
  anything — including when re-aiming it is the right fix. (#107, #68)
- When a mutant lives in shared code, its sheet is one of the places it kills, not the list. (#123)
- **One mutant killing several rows is several *reachability* claims, not one claim counted twice** —
  where the code is shared no mutant can tell the rows apart, so what each row adds is that its own
  way in arrives there, and the kill is the proof: one that did not arrive would pass. (#191)
- **A mutant reproduces the behaviour it was written for, not the world around it** — so it is not
  a *before* to measure layout against, even when it is the code that came before. (#105)
- **A mutant that substitutes a default is invisible everywhere the real value differs from it** —
  build the row at the one point where the two coincide, and assert that precondition in the row.
  (#154)
- **A survivor can be a claim the harness cannot put at risk** — the sixth reading, beside *never at
  risk* and *written in two places*. A state a person met can be unreachable at the seam because the
  seam removes the situation first: a closed dialog that a hidden tab keeps is unmounted by a focused
  one, so the same code is stale for the person and clean for the suite. Measure it in both browsers,
  take the mutant out, and leave the row as a net that says it is one. (#47)
- **A mutant that swaps one implementation for another is invisible wherever the two agree** — so
  the fixture is built where they *disagree*, which is not the same as building it big. And a
  fixture named for a property is a claim about a library's answer: ask ICU whether that run is one
  word before believing the constant that says `UNBREAKABLE`. (#117)
- **A rule reachable only through a fallback needs a row that comes in through the fallback** —
  measure whether the main path can reach it at all before writing the mutant, and if it cannot, say
  so with the number. (#117)
- **A test-file argument is matched as a substring** — `51a` also runs `151a`, so a kill count read
  off a command like that is two sheets' rows counted as one. Every such command was right the day it
  was written and expired by a file somewhere else; `python mutation/anchors.py` counts them now.
  (#154, #158)
- **A ticket that offers to de-duplicate is answered with what the merge costs the proof**, not only
  with what it saves the code — one hook behind fifteen screens turns fifteen claims into one no
  mutant can measure apart. And when a rule holds on many screens, the screen that proves it is chosen by
  the census, not by the subject. **But an instrument is not an assertion** — a fixture a second file
  needs is shared, because no row's claim lives in it. (#68, #171)
- **Extracting shared text costs the proof nothing if the mutants move to the call sites** — the
  shared constant becomes a premise, like an attribute a locator is built on, and each caller's *use*
  of it stays a claim. Aiming them at the constant instead is what turns ten sheets' claims into one;
  that is a choice, not a consequence of the merge. (#104)
- **When a ticket's proposal is declined, the mutant to write is that proposal made to run** — it
  is the only thing that turns *we chose otherwise* from a sentence on a sheet into a claim the
  suite holds. (#48)
- **And when a ticket's diagnosis is accepted, the mutant to write is the diagnosed code** — the
  twin of the line above, and the only thing that turns the diagnosis from a sentence into a claim
  the suite holds. (#115)
- **A kill count is a claim about the fixtures as much as about the code** — a seed that gains an
  account carrying the property a mutant is about expires the count of a mutant nobody edited, so
  re-sweep the ones you did not touch. (#48)
- **What corrupts a sweep is a repeated path — compare `FILES`, not subject matter**, and ask the
  census script rather than your memory; the figure that decides is the group, not the total.
  (#85, #87, #125)
- Run `save` before every mutant, and read `git status` after `apply` as well as after `restore`.
  (#124, #126)
- **While a sweep is running the tree is the harness's** — a grep or an anchor check over it
  reads the mutant that is applied, not the code. (#146)
- **A run that was stopped may not have stopped.** The tell is the harness refusing to `save`
  over a mutant nobody applied; ask the tree with every sheet's replacement strings, not the
  record, and throw away whatever was measured beside it. (#146)
- A `mode: 'serial'` spec reports the first dying row and skips the rest, so measure each row on
  its own; a top-level `node --test` test reads like a suite header in `not ok` lines, so read
  the names — including in a ticket's evidence, where it read as a second red row. (#67, #48, #187)
- A fixture that restores itself only when its row passes inflates the next mutant's kill count —
  put it back in `finally` or `afterAll`. (#89, #52)
- **But a cleanup can speak over the claim two ways** — a throwing `finally` *replaces* the body's
  error, so a sweep names the restoring step and not the row that just failed; and a cleanup that
  goes through the code under test cannot land while a mutant is applied, so the next row dies on
  its own precondition and the kill count is about the row before. Restore below the seam, say
  nothing about state, report your own failure where a later hook can fail the file. (#181)
- Report the measured number, not the ticket's — and notice when one number is two (killed and
  hardened). (#102, #48)

### Tests and fixtures

- **A retrying negative against an element that removes itself is an assertion that cannot
  fail.** Read the count once, at a named settle point. (#50)
- **A renderer that normalises what you are counting is a third assertion that cannot fail** — GFM
  truncates a row to its header width, so a count of the drawn cells is right whether the row is
  broken or fixed, and the first verification script called both *2 cells of 2*. Count the
  **source** to find it, and prove the render by reading the cell's **content** back. (#175)
- **A waiter that filters on the value is a fourth** — a predicate requiring `status() === 404`
  makes the `expect` below it read what it guaranteed, and a route that answered otherwise hangs in
  the waiter and dies at the timeout instead of reading as a red. Match the waiter by the request,
  which is what identifies the answer; assert the answer. (#116)
- **A helper that waits for the response has not waited for the drawing** — the first read after it
  can see the empty state, and no amount of retrying saves a wrong *expected* value. Wait for what
  the answer carried to be what the screen shows. (#132)
- **But a wait *added* to a shared helper turns one row's claim into every caller's premise** — the
  tell is a mutant that would kill the whole suite instead of the two rows written to catch it.
  Before adding one, ask whether the callers are racing anything: a caller that opens a screen
  through `openAt` is fenced by construction. (#81)
- **A race between an answer and its drawing is measured by slowing the renderer, not by rerunning
  the row** — a rerun passes, a CPU throttle gives a red and a green. But a read racing an *effect*
  is hidden by that same throttle, which serialises the read behind the pending work: the knob is for
  the drawing, not for the reading. (#136, #164, #170)
- **A read the renderer executes cannot be made to lose by slowing the renderer** — a non-retrying
  locator read queues behind the drawing, so no throttle and no held thread can show it. The knob is
  the **answer's** own lateness: `waitForResponse` resolves on the headers and the screen waits for
  the body, which is a window a fixture opens by letting the answer arrive and then waiting before
  handing it on. A fulfilled route cannot, because it is answered all at once. (#170)
- **A probe placed in front of the read it is measuring changes the answer** — a round trip is a turn
  for the renderer, so the probe goes *behind* the read it is about. (#170)
- ***Was it ever on the screen* is answered by a sample per frame, not by a longer wait** — and a
  sample is taken of the thing the row is about, not of the page. (#164)
- **A sampler that reads what a control holds cannot tell an absent control from an empty one** — so
  a precondition written that way passes on the broken screen and fails on the fixed one. Count the
  controls as well as reading them. (#164)
- **A mistake the framework corrects in the same task never reaches a paint** — so *was it ever on
  the screen* is answered **no** however long the sampler runs, the stale state being visible only
  in a `MutationObserver`'s records (a callback reading the live DOM is as blind as the frames), and
  the guard that prevents it cannot be put at risk at this seam: the mutant comes out and the row
  stays as a net. Read at the frame anyway — inside one commit the DOM is mid-write and the clean
  code passes through untrue combinations too. (#188)
- **A status code is not an assertion about your guard on a route with more than one way to
  answer it.** A row that passes both before and after a fix was never about it. (#125, #83)
- **A red is not a measurement until the same read has been seen green** — the same rule from the
  failing side. A locator scoped to a heading the screen never draws reads empty drawn and undrawn
  alike, so ten reds of ten can mean nothing, and a fix built on them is wrong the same way. (#171)
- **A census is evidence about the property it counted** — count by the mechanism, not by what the
  screen draws: a census of *card-and-grid screens* missed three chart-and-report screens with the
  same hole, because the species is *is there a settle point between the request and the read*. The
  line that looks like it belongs to another helper may be the settle point, or may only share its
  name. (#174)
- **Anything written for timing must not be able to decide anything.** (#52)
- **A fixture builds its situation with a clock, and it has to be the clock the code decides
  with** — `current_date` is the server's `TimeZone` and the code read `Asia/Bangkok`, so two
  one-day windows were built a day out, one of them red for the seven hours a day the two clocks
  name different days and the other only in the mirror direction. Ask the database
  what its zone is rather than reading the compose file, and **build the hour** to measure it: a
  shifted session timezone reproduces the window on demand, where waiting for it is not a
  measurement. Such a defect cannot then be *held* by a value assertion — a date comparison is
  green for the rest of the day whatever the fixture says, and choosing the shift from the current
  hour would let the clock decide which claim runs. The net is a scan of the suite's own text,
  which is #186's move one seam along, and it says which distances from the boundary it cannot
  see. (#187)
- **A waiter that matches a path and a method also matches the document the `goto` is replacing** — the
  answer it hands back is a body Chromium discards on commit. Ask which document asked, by identity and
  never by a clock. (#160)
- **A document handed to the page by `route.fulfill` arrives with no address space of its own** — every call
  it then makes to `localhost` is refused as a local-network request and the screen goes back to sign-in,
  which looks exactly like the fix under test not working. Hold a navigation by continuing it. (#160)
- **When a wait times out, the stack says where you waited and the saved snapshot says what the screen
  decided** — read the second first. (#160)
- **Chase every place a number is cited**, not every row of the table you are in: after inserting
  a test mid-file, grep the store for the row numbers — or append tests at the end. (#97 and #85)
- After adding a role or a label anywhere shared, grep the specs for unfiltered `getByRole` on it;
  `aria-live` announces without joining the set those lookups search. (#111, #122)
- A locator built on one seeded value can answer *not there* about a thing that is; ask what a
  helper promises, not what it does. (#101)
- **A locator built out of a source string is a claim about the DOM** — it holds only while the two
  are the same text, and `getByText` matches a substring whether or not the row writes
  `exact: false`, so that grep is evidence about the option. Ask by the value, then let the full
  suite say which candidates were real. (#118)
- **A locator can be unique only by accident of the thing you are about to remove — or to add** -
  six rows matched a label by code-and-name and every one was unambiguous *because* of the code; the
  name alone matches fifty-three elements, which at least fails loudly. The repair is not a narrowing
  `nth` but reading the **statement** - the word and the name inside one element - which is the
  stronger claim, and it needs the markup measured: JSX drops the newline before an adjacent
  `<span>`, so the text has no space in it. **A fix that puts words on a screen is a change to every
  locator that matched any of them loosely** — census one query per word it adds, not
  one for the word the first red named; the clean baseline is where that shows. (#93, #116)
- **A criterion answered *no* needs a row as much as one answered *yes*** — and the row has to
  assert what is still there, or it is measuring the other refusal that reaches the same status
  code. Between two fixture shapes, take the one the code already draws and nothing has ever made
  it draw. (#48)
- **A defect that survived green suites usually survived because no fixture could express it**,
  and the fix is a fixture. A fixture built inside one test file is one no other file has; a
  seeded role needs the role's distinguishing property; ask a question of the rule, not of the
  row. A fake written from the code cannot express what the driver does. (#96, #102, #48, #87,
  #132)
- **In a suite that shares one database and runs in order, the world a spec is handed is what the
  files before it left** — so a spec that writes takes it out again, and what nobody cleans is
  measured rather than assumed. Count the tables that moved **down** as well as up, and count the
  **files**, not the tables, when that is what was asked: a key names the row, not its author, so
  attribute a table by running that file on its own. (#132)
- **A teardown is a write like any other** — scope it to what the file wrote, not to who wrote it.
  (#134)
- **A comparison by key cannot see a rewrite** — a report that reads tidy has only said nothing was
  added or removed; measure the values too, then put them back. What nothing measures, nothing
  cleans. (#137)
- **A cleanup that names the tree has said nothing about the machine** — what a run writes outside
  the repository outlives the rows that name it unless both are cleared in the same breath, and
  code that deletes proves the directory is its own before it removes it. (#138)
- **A criterion about what a table holds can have no seam that serves it** — the row then asks the
  database directly and says so on its face, rather than being weakened to what a route can return.
  (#60)
- Two `includes` cannot fail on a list that is too wide. (#102)
- **A gate that holds one request is a claim about how many the screen makes** — the screen that asks
  twice has its second call answered inside its own document, and the row then passes for the wrong
  reason. Count the calls, or hold them all. (#168)
- **A gap one seam hands to the other is closed only if the other seam's world can express it** — two
  seams fed by one seed share its blindness. (#106)
- A test that passes because of a defect tends to explain itself in its own comment. A row that
  needs a defect to be reachable must be rewritten the day it is fixed — write that on the row.
  (#67, #96)
- A helper written to restate a rule independently has to restate it exactly. (#96)
- A scan that reads a function's own text stops at that function's boundary. (#89)
- Before trusting a new assertion, break the thing it is about; when nothing fails, the claim has
  an owner you have not found yet. (#124)
- **A defect nobody can see needs a mutant or it is not proved.** (#111)
- **An effect that must always happen does not go behind one that can fail** — and a defect that is
  unreachable today has a date on it, usually moved by another ticket's fix. (#131)
- **The mechanism under test can erase the precondition a row arranged for it** — the ageing a
  renewal undoes, the state a reload clears. Assert the precondition where it is used, not where it
  is set. (#51)
- **An arrangement that hangs can be an assertion in disguise** — a row that sets up a state the
  system's own defaults have already reached waits for a request nobody is going to make, and dies
  at the timeout. Its twin is the order that makes the state unreachable: where a rule picks for
  the person (the most senior grant held), arranging the precondition too early puts them in a
  shell the row cannot use. Ask what is true on arrival before arranging anything. (#77)
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
- **A guard that asks *is this still what was asked for* is written by every control that can take the
  answer's place** — list those controls, not the one the ticket pressed, including those outside the
  row; the refusal of the same read and the same control pressed twice are ways in too, so ask by the
  press and not by the row. (#139)
- **A control on the screen is a way in only if it feeds what the request asks for** — read the
  dependency list, not the JSX; and a guard that compares what those dependencies rebuild answers for
  every control at once, which is also why no mutant at the site can tell them apart. (#140)
- **Before counting who puts a shared flag down, ask which holders can start while it is up** —
  then give each kind of work its own flag. A counter that changes what the screen disables is a
  question, not a fix, and so is a release more careful than the one it replaced; the clause no
  mutant can reach is where to look for one. (#142)
- **A guard that pairs an answer with what it was asked for has to name what *identifies* the
  request** — an id alone does not, once two kinds of request share a position in the address.
  Two kinds at one segment make the key `kind:id`, and one resolver with a table of callers
  rather than one effect per kind. (#185)
- **An ordering key has to be the order of the thing it orders** — #185's rule one step along,
  from what *identifies* a request to what *orders* two answers. A counter on the client counts
  departures, and the state an answer describes was read on the server: a request that leaves
  first can be read second, so keying on departure drops the newer reading and keeps the older,
  which is the one direction that matters. Have the server say when it read, and write down what
  the key cannot tell apart. (#77)
- **A save’s answer is a read.** Anything that redraws from a response needs the same guard as a
  fetch — and a handler, which nothing tears down, asks *is the screen still where it was when I
  was sent* with a ref rather than with an effect’s flag. (#133)
- **A superseded-answer guard goes around the drawing, not around the escalation** — the report
  belongs to what was asked for, but the refusal with no rows in it (an expired session, a role that
  may not) belongs to the person, and the shell says it wherever they have since moved to. One
  question above the whole `catch` swallows it. (#179, and #131)
- **A new guard upstream rewrites what a downstream guard's untested claim is** — it does not prove
  it. The queue row for `onImported` did not become proved when the panel began refusing first; that
  path became structurally unreachable, and what is left untested is a different half. Say which
  half, with a date, rather than moving the mark. (#179)
- **When a guard has to widen, ask first whether what it reads is what is wrong** — changing what
  a ref *means*, and which controls write it, can leave every comparison and every mutant where
  they stand. (#146)
- **A reference no foreign key can express is the one a `RESTRICT` doctrine leaves dangling** — a
  polymorphic column carries no constraint to raise, so there the hand-written *is anything pointing
  at this* check is the right one, and its licence is bounded by the column having no constraint
  rather than by anybody's list of tables. (#60)
- **When two refusals are both true, the order of the gates decides which sentence the caller
  gets** — a new gate put first rewrites the answer a closed ticket's criteria already fixed, so it
  goes last, where it is reached by exactly the case that used to succeed. It binds only where the
  two answers differ: the same fix on the sibling route asks first, because both of its answers are
  the same answer. (#60)
- A guard that is strict about a format cannot see a mistake about meaning. (#124)
- **A limit written in one unit is a claim about the unit the room is measured in** — forty-eight
  characters guarding three hundred units of drawing is invisible in the alphabet the seed happens
  to be written in, and what overflows an `svg` is clipped mid-word with nothing to say so. (#115)
- **A flag paired with a later event is not identity** — a navigation request being out says a document
  was asked for; it does not say that the next commit is that document's, and measured, the next one is
  still a `replaceState`. Ask the protocol for the thing itself. (#168)
- **A fallback that reimplements a library is a claim about that library's answer** — so check it
  by asking the library, not by reasoning from the data's properties: `ำ` really is 1.56mm wide and
  really is `Lo`, and ICU keeps it with its consonant anyway. The character that breaks such a
  rule is the one outside the ranges it was written from. (#165)
- **A fix that replaces a mitigation is a claim to check against the mitigation's own criticism** — the
  sentence you wrote about why the workaround only narrowed the window is the sentence to hold your
  replacement to, one layer up. (#160)
- **A mechanism that fires on requests is blind to the work that makes none** — ask what the person
  is doing between requests, not only what the server does when one arrives. (#99)
- Before adding a parameterised refusal, find every site that turns that reason into a sentence —
  the grep is `REFUSALS[`. When one change lands at two sites, write a mutant per site. (#125)
- **A refusal that names the way out is a claim that the way out is reachable from where it
  is read** — ask which control performs the sentence, not whether the mechanism exists, and ask
  it where that control would live: #178 asked `api/` and `pages/`, reported the department's
  switch missing, and the checkbox had been in `components/` since the screen's own ticket. (#60,
  #178 — the claim, not the example)
- When a client must tell two refusals apart, have the server say which at the point of deciding.
  A guard that says *only once* has to say once per what. (#52)
- A number copied from a sibling screen is a decision, not an inheritance. (#45)
- An accessibility fix does not get to change layout on the way past, and a rule about layout is
  checked with numbers. (#111, #122)
- **Where a dialog's state lives decides whether closing it forgets.** A form written inside a
  component that never unmounts has no lifecycle to clear it, so every way out clears it by hand —
  and on the way **out**, because an effect keyed on the flag the box is drawn from runs after the
  fields have been drawn from the old values. (#167)
- **A notice is drawn by a component, so a call that re-mounts that component is a call the notice
  cannot cross** — a save that reloads the shell erases its own *saved* message, and what proves the
  save is then the thing the person was looking at. (#47)
- **Two effects on one save can hide one of them: if one re-mounts the component that holds the
  other, the second is unreachable rather than covered** — nothing breaks when it is deleted. Make
  the cases exclusive so each is observable, then aim the mutant at the work and not at the
  condition, whose other branch does the work by accident. (#47)
- **A measured cost of almost nothing is not a reason to close the ticket** — read what the
  measurement says is *holding* it to almost nothing. One frame because nothing in the hop waits on
  the network is a property of today's data flow, and the ticket that would change that is already
  open. (#120)
- **A number that justifies a change is not permission to make it.** A measurement answers what a
  change costs; whether it may be made is `docs/06` §Out of Scope, and the tell is that nothing in
  the diff can be broken to make the changed line fail. Publish both numbers and ask. (#105)
- A ticket that generalises across screens has usually generalised the symptom — check whether the
  rule generalises; ask what is actually shared, the code that runs or the value handed to it.
  (#122, #67)
- When asking whether two things may be shown together, look at what makes a row nameable. (#101)
- Before removing something, ask what it was teaching. (#124)
- **An instrument is read at the moment its input is dirtiest** — `anchors.py` is run at closing
  time, which is just after a sweep, which is when `test-results/` is fullest, so its file count moved
  with the rows the last mutant killed. What a test run leaves on disk is part of the tree an
  instrument walks, and the catalogue that knows which trees are not ours is `git ls-files --others
  --ignored`; a list of names cannot answer for the tree nobody has named yet. (#186)
- A tool that cannot say what it did not look at is the same species as the hand-kept numbers it
  checks; when a tool skips things by name, adding a file makes it lie; a guard that reads the
  world before it writes has to survive every state the world is in. Ask the catalogue, not a
  list — and write down what the instrument cannot measure. (#123, #126, #132)
- **A check that can fail to run has three answers, not two** — level, behind, and *could not ask*. Folding
  the third into the second tells somebody whose database is stopped to go and run a migration; the state
  that proves the difference is the one the naive check cannot see. (#159)

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
- **An instrument that still answers when nothing is drawn cannot say the screen was seen** — a
  hidden tab screenshots black while the DOM reads correctly, and an image path printed into a
  reply reaches nobody. Ask what is in front, and send the picture. (#184)
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
| `frontend/scripts/` | Two censuses, as instruments. `npm run census` runs both and goes red when a screen draws an answer with no guard and no written reason (#133's family), or draws a label with a code in front of the name and no written reason (#93's). Their own fixtures are `npm run census:test`. |

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
