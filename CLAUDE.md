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
will cost time — as of 20 October 2569 that is
`2026-10-20-the-sweeps-red-that-was-my-own-broken-row.md`. Read it before taking work. Each handoff names the one it supersedes for state,
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
  it.** It has been wrong twelve ways: aged (#66, #111, #55, #155), never true (#102), generalised
  from the symptom (#122) or from the fix (#67), a mechanism that does not exist (#101), already
  decided the other way in the file it proposes to change (#48), filed under the wrong half of
  its own table (#133), a key's name read as its text (#127) or a parameter's name read as a
  claim about what the caller puts in it (#185), an inference drawn from a
  measurement that was itself correct (#165, #186), a list of verbs naming an action no route performs
  (#58), a count of red rows inflated by the runner's output shape, with an explanation under it
  that was arithmetically impossible before anybody ran anything (#187), right in its species and wrong in the route it
  names (#218) — and the sheet itself asking for the defect (#89).
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
  the application at all — of two addresses, only the second did. **And the blocker landing is not
  the way in closing**: measure it afterwards, because a trap that holds the keyboard leaves the
  mouse one dismissal away. (#141, #210)
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
- **A ticket written from another ticket's closing sweep inherits that sweep's population** —
  #209 swept the thirteen mutants its own fix re-aimed and reported twelve survivors, which is the
  right scope for #209 and not a statement about a file of thirty-one. Re-swept whole before
  anything was changed, **fifteen** survived, and the repair was nineteen rows plus two nets rather
  than the ticket's twelve — three ways in that the ticket's one sentence had no room for were
  already killing, four of them held by rows in a sibling file that the one-file sweep never ran.
  A sweep is evidence about the mutants somebody ran (#107, #68), so re-derive the population from
  the catalogue before pricing the fix. (#223)
- **A ticket that names a race has named a window, not the population of ways in** — the same wrong
  screen can be reachable with no race at all, and that way lasts until a reload, so it is the one a
  person meets. Measure for the raceless sibling before accepting the sequence the ticket wrote.
  (#179)
- **A conclusion that is right for the wrong reason expires on the wrong day** — the reason is what
  dates it, so a premise that is false while the conclusion holds is the hardest kind to notice:
  nothing it predicts is wrong yet. *The account holds one Section* and *the dashboard lists one
  term* were the same verdict and two different expiry dates, and `docs/lessons.md` had had the
  true one in §#25 all along. (#141)
- **A ticket's *as today* option is a claim that today is one thing** — #152 offered three and all
  three were already in the tree: nine screens let the refusal win by order, one by a third
  reporting channel, ten said the success sentence over it. So *as today* meant *keep two
  behaviours, ten to ten*, which is the sentence the owner needed, the question being which
  behaviour the system should have rather than whether to change the code. (#152)
- **A placeholder menu is a claim about the menu, not about the routes** — so a ticket priced off
  one has priced the drawing and not the reach. Ask what the guard already admits: all nine
  `/program-results/*` routes had named `EXT_ASSESSOR` since #42, so the assessor's one invented
  entry was **hiding** three screens rather than refusing them, every option but *all four* and
  *none* would have meant splitting a shared constant, and the ticket's *a few lines* was right
  because there was no guard to change. The criterion about the complement was then already true
  in substance, which is not *proved*: what was owed was the row, not a fix. (#49)
- **An owner's question about a missing control is answered by the delivered UI before it is
  answered by the owner** — if the control was there and the rebuild dropped it, the ticket is a
  regression and its wording is already decided, which turns *shall we add this* into *which of
  the delivered words can the shared component still say*. #86 was filed as an enhancement and
  priced as one for eight weeks; `UserTable.js` had the box, its heading and its two buttons all
  along. The half that does not survive the shared component is the half to say out loud: a
  message that says one word twice and colours a verb is a drawing, not a wording. (#86)
- **A delivered screen that never had the words can still have had the protection** — #86's line
  from the other side: *the control was never there* does not make a ticket cosmetic, because what
  the delivered screen used instead may be a **mechanism** the rebuild dropped on purpose. #90's
  scope field has no kind word in either tree, but the delivered lists were keyed by role, so
  nobody was ever offered two kinds of thing at once; the rebuild offers one mixed list, which
  makes the ticket the price of a divergence already taken and the wording the owner's. Restoring
  that mechanism would then be a **new rule** and not a restoration — the UI holding an opinion
  the server's own grant list does not (#97, ADR-0002). (#90)
- **A ticket's proposed options are claims like its numbers, and the cheapest one to check is the
  option against the ticket's own acceptance condition** - #114 annotated option 3 (`xl` instead
  of `lg`) as the one to look at by eye first, and `xl` is 1280 where criterion 1 is written at
  1396, so the option the ticket pointed at first could not change anything at the width the
  ticket judges by. #152's *as today* one layer out: that claim is about today, this one about a
  proposed fix, and both are settled by reading the ticket's own criterion back against them.
  (#114)
- **A ticket that asks whether to carry a value its own mechanism cannot carry has a fourth
  option its three do not list: carry the way to get the value.** #128 offered the date in the
  URL, closing with no diff, or telling only at the doors with a body — and the measurement that
  refuted the third (three doors, two with a body, not one against one) is what made the fourth
  visible: a sentence that cannot name a date can name whom to ask for it. Measure the ticket's
  own asymmetry before writing its options down for the owner, because what the measurement
  changes may be the question rather than the answer. (#128)
- **A ticket that proposes one fix can be proposing two, and the split is the fourth option** —
  #128's shape for a *fix* instead of for a value. #204's option 1 held a half that **announces**
  (`role`, `aria-modal`, a name, a description, focus moved in, Escape) costing **no row**, because
  every row that reaches a control under the cover gets there with `focus()` or `fill()`, which
  move focus from wherever it was; and a half that **contains** (a trap, `inert`) costing ten rows
  in five files plus a 22-mutant sweep. Price the halves before writing the owner's question, and
  say which reader each half is for: `aria-modal` already closes the way in for anybody listening,
  which makes the deferred half *containment for the sighted keyboard user* and not containment as
  such. (#204)
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
  at, except that what it could not look at was the note written for it. **And a marker outlives
  the gap it documented, which turns it into an exemption** — one rewritten to begin *guarded* is
  a claim the guard already makes, and the instrument reads it again only on the day the guard
  goes. (#93, #141)
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
- **A ◐ is one of three kinds, and the third is the one a two-kind definition hides** — a request
  no control can produce, which waits on nobody; an attribute that reached the DOM and needs an
  ear, which is a real queue; and a half that waits on a **ticket**, which is not in the walk queue
  at all, so putting it in front of a person asks them to walk what cannot pass yet. The row says
  which, and they are counted apart — the split itself is a survey with a date on it and lives in
  §#157, not here, because no instrument reproduces it. (#85, #111, #122, #157 — told under *The ◐
  and ☐ rows* and §#157)
- **A legend is a claim about the sheet's own rows, and its two halves can contradict each other** —
  one sheet carried a mark its legend said did not exist, and another's count sentence said *three*
  while its own entry called itself *the fourth value*. `python mutation/anchors.py` asks the first
  of those two — every mark a row carries is defined, in one spelling across the sheets — and cannot
  ask the second: the count sentence is a hand measurement with a date on it. (#157)
- **A fact that is true of one sheet only reads exactly like a second definition when it sits
  inside that sheet's legend** — no instrument can tell them apart, so the convention is what
  keeps them apart: a one-sheet reason goes below the block with a date on it, because a legend
  teaches the vocabulary and a one-sheet fact is a record (#54's split). And when a sweep decides
  which wording all the sheets will carry, the plurality is not the answer — here the biggest
  group was the **silent** one for two marks of three, and the meaning had been settled in this
  file all along. (#194)
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
  merely misplaced. **And a mark can come back as a letter** — a patch script whose text has been
  through a Thai codepage writes `ส หรือ ส` where `◐ หรือ ☑` was meant, which still reads as Thai
  prose and so survives a review and a commit: the marks are the characters to read first in a
  rendered diff, being the only ones on these sheets a Thai codepage has no room for. (#79, #175,
  #213)
- **A rename reaches a sheet's criteria and not its record** — the criteria rows and the open
  questions say what the system *is*, so a later walker needs the new identifier in them; a dated
  walk table says what one measurement returned, and #54's sheet says so itself in bold. Change the
  first, leave the second and add the note naming which of its rows would read differently today. A
  global replace over one file does both. (#54)

- **A net for a premise has nothing on the sheet to mark** — a row that counts what makes a
  claim unreachable is not itself a criterion of that sheet, so adding a row to have somewhere
  to put a mark writes the sheet a claim its ticket never made. The citation goes inside the
  ☐ cell of the claims it holds up, beside the date and the condition that would re-date them.
  `47a` row 4 is not this shape: that one *is* a criterion of #47, which is why it can hold a
  ☑. (#141)

### Mutants and sweeps

- Read a sweep five ways: a **MISS** means the anchor moved; a **survivor** may be a claim never
  at risk (delete the mutant, mark ☑); a mutant that **kills too much** has stopped the
  application; a **survivor on a row nobody suspected** is an overclaim; and a sweep **cannot see
  the row your own fix breaks** — only the clean suite can. (#45, #97, #96, #83)
- **A sweep's red can be a row your own fix broke, and then the kill count is right for the
  wrong reason** — the twelfth reading, beside #49's flaky bystander, and the second where the
  kill rather than the survivor is what is wrong. It looks like any other red, it inflates the
  count by one, and the mutant's coverage of that row stays unmeasured until the row is repaired
  and the mutant run again. No instrument says so — the anchor is exact and the mutated code
  untouched — and the sweep's own output had the row's name in it beside the number (#52). Only
  the clean suite tells you (#83, #96, #107), which is what it is run at the end for. (#209)
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
- **But a text that is both the locator and the claim is proved by a mutant wrong on one side
  only** — the line above read as a condition rather than a verdict. Where the press finds the
  control *by* the word the row then reads, a mutant that changes both sides leaves every row
  with nothing to click and they die at the timeout instead of at a claim (#139), which is what
  a sheet writes down as *unprovable*. Be right on the side the row presses and wrong on the side
  it reads; then the rows arriving on the wrong side need the **arrival** read as a claim of their
  own, or those kills land on a wait as well. (#213)
- **Two mutants that vary the same property cannot see a third property.** One crafted value
  proves one link of a guard; craft one per link, before the sweep. Say which of three a clause
  is: proved, structurally unreachable, or untested. (#96, #107, #102)
- **A mutant name can collide across sheets, and the sheet is where it shows** — the harness
  keys a mutant inside its own file, so two tickets fixing the same shape write the same name,
  and a criteria sheet that carries both tickets' rows then reads as one mutant cited twice.
  Rename the second before the table is written. (#185)
- **A guard copied from a closed ticket's guard makes that ticket's anchors ambiguous** —
  same question, same spelling, same indentation, same file, so a one-line anchor that was
  unique finds two sites and the harness refuses it. The repair is the line above the
  question, which says what the handler did before asking; and a fix that adds a line to a
  block re-aims every anchor that quoted the block whole. Run `python mutation/anchors.py`
  **while** making such a change, not only at closing time. **And the repair re-aims a tenth**:
  a constant four mutants share, edited to disambiguate them, moves every mutant that quoted it
  — including one in a file the ticket never touched, which no instrument reports because the
  repair precedes the next run. It is in the diff only. (#202)
- **The text an anchor is built from is read out of the code the mutant edits, not out of a file
  that quotes it** — #118's rule with the file wrong: a copy inside a string literal carries its
  quoting, so #90's map line came back ending `}\n",` and four anchors answered MISS. The
  assertion that it occurred three times passed, every occurrence being the same wrong text, which
  is #83 from the other side; assert what the built string must **say**, not how often it appears.
  (#90)
- **A mutant outlives its ticket but not its anchor.** Run `python mutation/anchors.py` while
  finishing a ticket, anchor to the code a mutant breaks and never to the comment beside it, and
  when a constant is arbitrary mutate the operator beside it. (#121, #123, #101, #125)
- **A change to a function's signature reaches every mutant that writes a call to it**, not only
  those anchored on one — grep the replacement strings too; `anchors.py` reads anchors. (#140)
- **When a change re-aims mutants by the hundred, two instruments over the catalogue say which of
  them need the sweep** — an **equivalence proof** that undoes the re-aim on both halves of every
  mutant and compares with `HEAD` byte for byte (101 moved, 100 certified identical, 1 not), and a
  question asked of every replacement about the locals it uses and does not declare, which is
  where the one broken mutant was: a one-line replacement left naming a local the fix moved inside
  a block, invisible to `anchors.py` because its anchor is still exact (#140, #152). Neither is a
  sweep (#107, #68) — price the proof by sweeping two of the certified ones and reading the kills
  against their sheets, which is minutes against hours. (#208)
- **A fix that splits a guard shrinks every mutant that quoted the block whole** — the anchor is
  still exact, the code it quotes is untouched, the diff only *adds* a line and nothing goes red,
  so no instrument says that a row the mutant used to kill is now proved by nothing. Only re-running
  it says so, which is why the re-aim is followed by a sweep and not by an anchor check (#107, #68):
  one of #146's mutants went from three kills to two, and the third row needed a mutant of its own
  aimed at the line that now carries the claim. (#203)
- **A re-aim is faithful when it preserves the mistake, not when it finds the line** — moving a
  mutant onto the line a fix wrote and dropping the whole clause is a *different* mutant, however
  well it matches the file's convention: no guard at all speaks always, where the guard the sheet
  describes speaks over the wrong screen and stays silent on the right one. What it stops killing
  is then the **positive** row, which on another sheet cites it. The sheet's description of a mutant
  is a claim about what it means; read the new kill count against that sentence, not only against
  the total. (#203)
- **When a fix puts a value where a call was, a mutant that deleted the call cannot be re-aimed by
  insertion — substitute the value.** #140's rule one layer along: a change to what a call
  *returns* reaches every mutant that removed one, and five of the thirty-six #152 moved were
  `savenoreload`, which deletes the reload: re-aimed by insertion they left the new `const`
  undefined, which is a mutant that stops the application and proves nothing. A Thai sentence
  inside such an anchor is not what made it unique and comes out rather than being retyped.
  **Such a mutant can then be narrower than the one it replaced** — `31:savenoreload` had failed
  six rows and failed three, the three bystanders having been contaminated by the *deletion* and
  not by the claim, so the re-sweep is read against the row the mutant was written for and not
  against the total. (#152)
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
- **A bystander row that dies under every mutant is a flaky row, and the sweep is the load test
  that says so** — the eleventh reading, and the first where the kill rather than the survivor is
  what is wrong. A mutant aimed at one entry cannot reach another's data, so a row dying under all
  four is a claim about the row: a non-retrying `count()` with nothing in front of it waiting for
  the drawing passed its clean run, which was one sample, and lost four of four. The repair is a
  retrying read, and the proof of the repair is the re-sweep — one red row each, bystanders green.
  (#49)
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
- **A survivor can mean the row read at the wrong moment** — the seventh reading, and the first of
  two where the row rather than the mutant or the code is what is wrong (#112 is the other). A claim about a sentence that
  lives between two commits cannot be held at a settle point: the refusal that replaces it has
  landed by then, so the broken screen and the fixed one say the same thing, and two mutants that
  were faithful copies of the measured defect survived 21 of 21. The tell is exactly that — a
  mutant reproducing something a hand measurement has already shown misbehaving. Re-aim the row at
  the frames (#164), and read *which assertion* it then dies at. (#152)
- **And a survivor can mean the row read the wrong element** — the eighth, and #152's
  twin: the claim lives on one element and the reader was pointed at another. A marker takes
  its angle from the axes and only the line takes it from `values.length`, so a series longer
  than its axes leaves every marker, radius, title and table cell right. When a survivor is a
  faithful copy of the thing you mean to catch, ask which element carries the claim before
  asking whether the claim was at risk — and read the component, because the two halves of
  one drawing can be computed from two different lengths. (#112)
- **And a survivor can mean the screen had nowhere to say it** — the ninth, and #47's sixth one
  step further: a refused read that answers by *replacing the screen* removes the surface the
  sentence would have been drawn on, so the defect is unreachable for the person and not only at
  the seam. Take the mutant out, have the row assert the **mechanism** rather than the absence
  (a row that says only *I saw nothing* passes there for the wrong reason), and write beside it
  the condition that would make the claim reachable again. (#203)
- **And a survivor can mean the row's own arithmetic made the mutant's value the true one** — the
  tenth, and the line below it read from the row's side: where a fix has two halves, a fixture that
  moves one step can make them one number, so a faithful copy of half the defect passes. Ask what
  the row's step count makes equal before believing *never at risk* — two presses where one had
  been is the whole repair. (#206)
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
  re-sweep the ones you did not touch. **A spec that gains a row the mutant can reach expires it
  the same way**, and nothing reports that one: the anchor is still exact and the code untouched,
  so only re-running it says the mutant proves one claim more than its sheet credits it with — the
  figure beside it was a figure about a smaller suite. (#48, #202)
- **What corrupts a sweep is a repeated path — compare `FILES`, not subject matter**, and ask the
  census script rather than your memory; the figure that decides is the group, not the total.
  (#85, #87, #125)
- Run `save` before every mutant, and read `git status` after `apply` as well as after `restore`.
  (#124, #126)
- **While a sweep is running the tree is the harness's** — a grep or an anchor check over it
  reads the mutant that is applied, not the code. (#146)
- **A run that was stopped may not have stopped.** The tell is the harness refusing to `save`
  over a mutant nobody applied; ask the tree with every sheet's replacement strings, not the
  record, and throw away whatever was measured beside it. (#146) **An instrument read just
  after one is stopped can be reading a straggler's write** — `anchors.py` said *problems 0*,
  then three missing anchors in one file, then *problems 0* again, over a tree that was clean
  by `git diff` every time. Clear the ports, ask the machine what is still alive, read it
  twice. (#152)
- **A row reports the first assertion a mutant kills, so a claim written below another claim is
  proved by nothing** — the `serial` rule one layer down, and it is invisible in a kill count:
  the row is red, the mutant is credited, and the claims under the red line were never read. Let
  where the mutants die decide how a spec's claims are split into rows. (#88)
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
- **A mutant that reads state from outside its function's dependency list measures the closure,
  not the claim** — the `data` it sees is the first render's, so a mutant written to keep the table
  and lose the typed number blanked the table instead, became a duplicate of the blanking mutant,
  and left the second assertion as unrun as it was before. The kill count said exactly what the
  table predicted; what said otherwise were the lint line in the run's own log naming the missing
  dependency, and the **assertion's name** not matching the table written before the sweep — which
  is what that table is for. Read the live state with a functional updater. (#201)
- **A mutant that restores a read of a stale value has to restore the staleness, which the fix
  may have changed the shape of** — #152's rule one layer along. The fix moved `reload` off
  `[page, load]`, so the `page` in its closure is not one render behind any more but **frozen at
  the first**: substituting it back for the live ref is a different mutant, and it killed the row
  about the superseded read instead of the row about the move that causes no read, which is the
  row it was written for. Read a re-aimed mutant's kill against the row it is *for*. (#205)
- **A row left as a net takes its mutants with it** — a mutant whose only killer becomes a net
  proves nothing, and no instrument says so: the anchor is still exact, the code it edits is
  untouched, and the difference is in another file, so only re-running it speaks (#107, #68).
  Four of #207's five went that way the day the owner closed the pager, and the survivor of the
  four survived for a second reason — the one remaining way in made the two values it swaps the
  same number (#206's tenth reading). Price a closed way in in mutants as well as in rows (#217).
  **But the net and the mutant part company where a second file's rows press the same handler** —
  two of #223's refusal mutants kept every kill they had, in `144a`, while the `140a` row they used
  to prove became a net, so the withdrawal question is asked per mutant and not per row; and reading
  that re-sweep against the total says nothing, the count being unchanged and the row that lost its
  proof being in another file (#83). (#210, #223)

### Tests and fixtures

- **A retrying negative against an element that removes itself is an assertion that cannot
  fail.** Read the count once, at a named settle point. **But the same read can fail where the
  code under test is the only thing that removes the element** — so the question is *who else
  removes this*, not *is it retrying*, and the mutant that leaves the element in the document
  for ever is what answers it. (#50, #214)
- **A renderer that normalises what you are counting is a third assertion that cannot fail** — GFM
  truncates a row to its header width, so a count of the drawn cells is right whether the row is
  broken or fixed, and the first verification script called both *2 cells of 2*. Count the
  **source** to find it, and prove the render by reading the cell's **content** back. (#175)
- **A matcher two questions share cannot be narrowed for one of them** — a prefix that answers
  *any request this screen makes* for a family question is the wrong instrument for *which answer is
  this screen's own read*, so the repair is a second, anchored matcher beside it and not an edit to
  the first; the loose one's remaining callers then owe a reason with a date on it (#131). What finds
  the siblings is a census by the mechanism — one waiter and one method against the routes the server
  really mounts — and it found two sites nobody had reported. (#218)
- **A waiter that filters on the value is a fourth** — a predicate requiring `status() === 404`
  makes the `expect` below it read what it guaranteed, and a route that answered otherwise hangs in
  the waiter and dies at the timeout instead of reading as a red. Match the waiter by the request,
  which is what identifies the answer; assert the answer. (#116)
- **A helper that waits for the response has not waited for the drawing** — the first read after it
  can see the empty state, and no amount of retrying saves a wrong *expected* value. Wait for what
  the answer carried to be what the screen shows. (#132)
- **A retrying wait in front of a superseding press moves the press instead of failing the row** —
  so a row built on a race keeps passing with the race gone, its mutants survive, and nothing is red
  to say so: the anchors are exact and the code untouched. The census that decides is *which rows
  wait for that control*, not which rows have it disabled at the moment they press it. (#209, found
  in #210's `busy`)
- **A settle point is chosen by how the row will fail** — waiting for the pager to read out what
  *this* answer carried is right on the screen that behaves and a timeout on every screen that does
  not, because the ways of getting it wrong are all ways of removing the drawing being waited for.
  #139 asked one step later; ask whether the thing you wait for is the thing the defect takes away,
  and read the screen's own line instead, which fails with the numbers it is showing. (#209)
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
  sample is taken of the thing the row is about, not of the page. A sampler is also a locator built
  out of a source string (#118, #171): one looking for a sentence the screen never writes answers
  *never* at every lateness, on the broken screen and on the fixed one, so read the sentence out of
  the file rather than out of your memory of it. (#164, #152)
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
- **The price of closing a way in is the rows that arrange their situation through it, and that
  price is paid in re-aims wherever a person has another way to the same situation** - so ask what
  they can still do before writing those rows off as nets. A trap priced at ten rows in five files
  cost ten one-line re-aims, because the question's own ยกเลิก puts the box away while the write it
  confirmed is still in flight, which is the same situation reached with no second defect. A row
  left as a net is what it costs when there is no other way (#47, #203); and the instrument that
  takes the new way in is shared (#171) and built on nothing another file's rows claim (#85, #111).
  (#217)
- **Run a new row against the unfixed code before writing its mutant** — a row that passes there
  is measuring nothing, and that is the seventh reading of a survivor (the row read at the wrong
  moment) bought for free: #152 paid for it with two faithful mutants surviving 21 of 21, where
  #203 got it from nineteen of twenty rows passing on the broken screens. A sweep answers the same
  question hours later, one mutant at a time. (#203)
- **A probe that dates a defect beside your own is built where the two codes agree, run on both
  sides, and then deleted** — *a defect this change caused* and *one it walked into* (#103) are
  settled by a situation the fix and `HEAD` take the same branch in, not by argument, and the probe
  is an instrument rather than a claim of any sheet. Its own first version is a claim too: a count
  of rows cannot tell a stale list from a screen with no list on it, which is #164's blind sampler
  one species along, so ask the placeholder by name. (#207)
- **A red is not a measurement until the same read has been seen green** — the same rule from the
  failing side. A locator scoped to a heading the screen never draws reads empty drawn and undrawn
  alike, so ten reds of ten can mean nothing, and a fix built on them is wrong the same way. (#171)
- **A census written to replace a hand walk measures the walk's scope as well as the code** —
  the walk counted what it was about to fix; the instrument counts the property, and the
  difference between the two numbers is what the earlier ticket chose not to do. Its first run
  is therefore a finding about a closed ticket as much as a check on the new one, and when that
  finding is a red gate the instrument is committed unwired with a ticket for the gap rather
  than wired with the gap marked. (#200)
- **A census is evidence about the property it counted** — count by the mechanism, not by what the
  screen draws: a census of *card-and-grid screens* missed three chart-and-report screens with the
  same hole, because the species is *is there a settle point between the request and the read*. The
  line that looks like it belongs to another helper may be the settle point, or may only share its
  name. (#174)
- **A census can be blinded by another ticket's fix and go on reporting green** — an instrument
  that classifies by a spelling stops seeing its population the day that spelling changes, and
  then reports a clean sweep of whatever is left: `problems 0`, exit 0, the gate green, while *35
  of 35* has quietly become *2 of 2*. **The count is the tell, not the exit code.** Then the
  repaired instrument finds sites nobody has ever seen (#141's species), and which of its own
  dated figures were right is settled by running it at each figure's commit in a worktree. (#208)
- **A census built around a cause is read against its control group, not on its own** — the
  population *where the cause is absent* has a rate too, and when that rate is the lower one the
  cause was not the cause: ⚙ rows naming a drawn property were **commoner** on the sheets whose
  legend already carried the appearance clause (96 of 312) than on the sheets that lacked it
  (65 of 419), which says the wording never decided how a row got marked. (#194)
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
- **A fix that disables a control is a change to every row that presses it, including the rows
  that press it as an instrument** — the line above one layer along, from a word a fix adds to a
  control a fix takes away. A hand estimate counts the rows that are *about* the control and
  misses the rows that use it to arrange something: two of the four reds were `205a` pressing the
  pager to supersede a read. Census the press, not the claim. (#199)
- **And a fix that puts a dialog in front of a control re-dates every other ticket's claim about
  how that control is reached** — the same family one layer out: the rows keep their claims and
  their marks, because `fill()` focuses a field rather than clicking it, which is a way in the
  tool has and a person does not (#47). What expires is the prose — four places had written
  *bare mouse, no overlay, does not wait on #204* about a switch that asks first since #86, and
  each of those paragraphs is dated rather than deleted (#54) — two in one sheet, one in a mutation
  file's own table and one in a lessons story. Grep the sentences, not only the presses. (#86)
- **A criterion answered *no* needs a row as much as one answered *yes*** — and the row has to
  assert what is still there, or it is measuring the other refusal that reaches the same status
  code. Between two fixture shapes, take the one the code already draws and nothing has ever made
  it draw. (#48)
- **A claim that a situation has no fixture is a claim about the seed** — ask whether a route
  can build it at runtime before believing it, and distrust that sentence most in a spec file,
  where it reads like a measurement and is usually the memory of one. (#155)
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
- **An arrangement that destroys what it arranged can still pass, and then it is measuring
  an animation** — #77's line from the other side, where arranging a reached state makes a row
  *pass* rather than hang, which is worse: a hang is a report and a pass is a silence. Four
  committee rows pressed a menu group that was already open, which closes it, and the entry
  stayed clickable for **eight frames** while the `AnimatePresence` exit ran — after the ninth
  the same press times out on the locator. A probe for the role in question says the number
  (#207); a probe for a sibling role does not, the two being the same by reading rather than
  by measurement. (#212)
- **A row that catches a defect on some runs is not the row that holds it** — the row that holds it
  builds the situation itself, rather than waiting for another spec to leave one behind. But a row
  that builds its own situation is still handed a world it did not build: assert the shape it needs,
  not the values the seed would have given. (#129)
- A branch correct data never reaches is still reached by incorrect data. (#96)
- When two tests sit either side of a line, check whether anything runs the line; a reason why
  one half of a thing cannot be tested is not a statement about the other half; draw a stub's
  boundary at the machine's edge. (#119)
- **A review finding can be right about the behaviour and wrong about its name** —
  *a regression*, *an intended consequence of the decision* and *a behaviour no row holds*
  are three different things to say about one hunk, and only a row run on **both** sides of
  the change tells them apart. #205's filter coordinate was named the first by both review
  axes and by me, and measured: the sentence is said at `HEAD` and silent after, which makes
  it the second — so what was owed was a row, not a fix. (#205)

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
- **A live reading is a reading of wherever the person now is, so a handler that needs a count of
  what it was sent from has to ask which page the live value is of** — #185's key one layer in,
  from *which request is this answer of* to *which page is this count of*. Swapping a stale read
  for a ref is half a fix: where the subject has moved, the stale render's own count is the only
  reading of the page that was left, so the line becomes a choice between the two and each half
  needs its own mutant (#97). The tell that the first half alone is wrong is a row in **another**
  ticket's spec, which no sweep of yours can reach (#83). **And the choice is made by a key the
  ref carries, not by where a neighbour's position ref points** — a position moves when the
  request leaves and the value moves when the answer lands, so one comparison answers *no* in the
  window where the live value is the right reading and *no* in the window where it is the wrong
  one, and cannot be read either way. Have the ref say what its value is **of**, keyed on the
  read's whole coordinate set. Then the two questions come apart and are owed different readings:
  *did this page lose its last row* may be answered by a stale count, because it only picks which
  loader reads; ***may anybody be moved on it* may not**, because moving on another page's count
  carries a person off a page that has filled up again. One direction of such a window can be
  readable on the client and the other not at all — say which, with a ticket (#119). (#207)
- **A save’s answer is a read.** Anything that redraws from a response needs the same guard as a
  fetch — and a handler, which nothing tears down, asks *is the screen still where it was when I
  was sent* with a ref rather than with an effect’s flag. (#133)
- **A flag that says *nothing refused the read* is not a flag that says *it drew*** — a loader
  that ends its `try` with `return true` answers the same whether or not `isCurrent()` held, so
  a sentence behind it is guarded against a refusal and not against a person who has moved. The
  two questions are asked with two clauses, and the ref is the second one. The control that
  supersedes such a read need not take anything away or open anything: a pager that is not
  disabled while a write is out changes what the read is *of*, which is enough. (#202, #199)
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
- **A ceiling enforced where a value is entered is a claim about the number it is a share of, and
  the screen that writes that number is the other half of the guard** — nothing in the schema
  connects the two. #34 caps a mark at `activity_clo_mapping.score` twice over; #33 could move
  `score` under marks already entered, so the state the marks grid refuses was reachable from a
  screen two menu items away, and the report then read `earned 49.02 / available 1`. Ask which
  screen writes the base before believing an entry-time check — and once a guard is *refuse only
  where X*, it is wrong in two directions, so the row for the saves it must **not** touch is what
  makes the refusal rows measure anything, with the declined option made to run as its mutant
  (#48). (#108)
- **When two refusals are both true, the order of the gates decides which sentence the caller
  gets** — a new gate put first rewrites the answer a closed ticket's criteria already fixed, so it
  goes last, where it is reached by exactly the case that used to succeed. It binds only where the
  two answers differ: the same fix on the sibling route asks first, because both of its answers are
  the same answer. (#60)
- A guard that is strict about a format cannot see a mistake about meaning. (#124)
- **A bound put on a field changes who answers the person** — an input with `min` inside a form
  with no `noValidate` is refused by the browser, in the browser's own language, so the server's
  sentence stays correct and stops being reachable from that screen. The walked row that recorded
  that sentence expires the day the bound lands, and which wording the person should read is the
  owner's (`docs/06` §Out of Scope). (#88)
- **A ticket about the value at today's input is answered by measuring the parameter across its
  range** — the one #103 pointed at as a cost of its fix was already wrong before it: at 9mm per
  column the page grew slower than a code needs, so every code wrapped at twenty outcomes, hidden
  by the A4 floor at the thirteen the seed has. Say which, because *a defect this change caused*
  and *one it walked into* are different sentences - and the one it walked into still needs a row,
  a mutant and a ticket, because at the floor the two values give identical columns - #195 built
  both, at the count where they disagree about every column and not at the first count they
  disagree at. (#103)
- **A size raise is a change to every gap around it, and a gap is read in ems of the line in it** —
  the same millimetres gave 1.53 ems of air at 13pt and 1.24 at 16, which is where a Thai upper
  vowel goes. Then report what the measurement found and not the harm you expected: nothing
  overlapped at either set of numbers, and the comment claiming a collision was written by the
  person who had just measured the thing beside it. (#103)
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
- **A contrast ratio is a claim about a glyph against its background, not about whether the glyph
  is read as a separate signal** — a mark the same colour as the figure beside it is read as part
  of the figure, and 5.84 passed AA while the person said it had sunk. The repair is a colour the
  figure does not have, paid for with a halo rather than with the ratio. And **raising a
  background is a change to everything drawn on it**, so the census is the mark, not the screen
  the walk was on — and the census is keyed on the **mechanism**, which here is *a mark drawn
  over a `BANDS` cell* and not the flag's name: three screens write `flagged` and the fourth
  writes `passed === false`, so counting by the name found three of four. (#113)
- **A condition written onto a premise is a claim about the population the premise was drawn
  from** — dating it protects it against the future and says nothing about the sibling already
  outside it. The same hour's census found a fourth screen whose mark is a *share of students*
  while its colour is a *mean*, so there the carefully dated *it only lands on band 1* was not
  conditionally true but false that day. (#113)
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
- **An owner's decision is about what the person reads, not about the diff that occurs to you
  first** — and the cheapest implementation of it can break a closed ticket. #152's *the refusal
  wins*, built as the obvious order swap, failed **fourteen** rows of `149a`, because a sentence
  set before the reload is set before the guard can see where the person has moved to. Which
  closed tickets the cheap reading touches is a measurement: run their suites against it before
  building it, and if it breaks one, implement the decision the other way up — here by making the
  awaited loader report whether it drew, so both tickets hold. (#152)
- **A behaviour that depends on which of two invisible windows a press landed in is a defect,
  not a preference** — #52 met in the product rather than in a fixture. Both behaviours can be
  defensible, so what is wrong is that the system holds both and the clock picks: the owner's
  question is then *which single behaviour*, and every option that removes the fork is an answer
  to it. (#199)
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
- **A rule about keeping what was drawn is a claim about what the drawing was an answer to** — so
  the same rule has one half or two depending on what the loader depends on. #151's *a read that
  fails keeps what the screen last drew* is whole on a `load` keyed on one id, where a refused read
  is always a re-read of the same question; on a `load` keyed on two it comes apart, and applying
  the fix as written builds #133's mismatch in the other half — the grid and heading of the thing
  left behind, under a picker reading the new one. The ref that tells them apart holds what the
  data **is of**, not what was asked for. (#201)
- **A check that can fail to run has three answers, not two** — level, behind, and *could not ask*. Folding
  the third into the second tells somebody whose database is stopped to go and run a migration; the state
  that proves the difference is the one the naive check cannot see. (#159)
- **Two guards that both ask *is this still current* can be asking about different things** —
  so satisfying one is not satisfying the other, and one of them can refuse correctly while the
  person is owed the sentence. #202's `sent` is a *loader*, which belongs to a page; the sentence
  belongs to the *enrolment*, which does not, so on a handler that moved the page the guard
  refused a sentence about something still on the screen. Ask what the claim is **of** before
  choosing who says it — and then the answer is to hand it to whoever can compare the two (#185's
  key, written for a sentence instead of for an answer). (#205)
- **A clearing is a write about the same state the guard protects** — a `finally` that empties a
  ref outside `isCurrent()` lets a read the screen has already replaced throw away a sentence
  handed over *after* that read was sent, and nobody hears it. And **a sentence nothing clears is
  not a sentence that is lost: the next read says it, over a list it is not about** — #137's *what
  nothing measures, nothing cleans*, one layer along. The prediction written into that row said
  *never said* and the row measured one, which is the argument for writing a prediction down as an
  assertion rather than keeping it in your head. (#205)
- **A ref is read twice — once to compare and once to choose — and a value that answers the
  comparison cannot answer the choice.** A coordinate answers *is the filter still where it was
  when I was sent* exactly and permanently, so every row resting on that comparison survives being
  moved off it; what it cannot do is hand the handler a loader, so the handler goes on calling the
  one it closed over — the right question asked of the wrong reader. That reader then refuses
  itself, which is correct, and the placeholder it raised is left standing for ever, the only code
  that lowers it being inside the refusal. The fix is to hold in the ref the thing the caller has
  to **pick**, not the thing it has to compare. (#211)
- **A key that matches says a reading is of the right page, not that it is still true** — every rule
  about these refs is about *what the value is of* (#201, #185, #207, #211), and none of them makes a
  matching key a guarantee: *live* is the count of the list that is **drawn**, which a second writer
  makes stale against the database with no race, no move and nothing for a reload to clear. (#209)

### Walks

- **A walk asks whether what was drawn can be read; it cannot ask whether what should exist is all
  there.** (#50)
- **A walk step written for another row can refute the premise of the fix you made ten minutes
  ago** — its whole job is to move the thing your premise assumed still, which is why the sheet's
  own old note had said so in September. Keep the behaviour if the configuration is not shipped,
  but write the condition and its date beside the constant — and then ask which screens the
  condition was drawn from, because on this ticket one of four was already outside it. (#113)
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
| `frontend/scripts/` | Five censuses, as instruments. `npm run census` runs all five and goes red when a screen draws an answer with no guard and no written reason (#133's family), draws a label with a code in front of the name and no written reason (#93's), or says a success sentence after an `await` with nothing asking whether the screen is still the one that asked (#202's family, `sentences-after-a-move.js`, which asks about **enclosure** and not about a window of lines), or redraws from a loader without reading whether it drew (#152's family, `swallowed-refusals.js`, built by #200 and left unwired while the twenty administration sites it found were still red — #203 fixed those and wired it in on 12 October 2569), or reads a list again with the loader a handler closed over instead of the one the ref holds (#208's family, `dead-loaders.js`, which finds its loaders **by the ref** and so cannot see a ref holding a coordinate). Their own fixtures are `npm run census:test`. |

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
