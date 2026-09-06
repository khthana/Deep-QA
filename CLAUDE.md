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

Closed: **#2–#45 unbroken, plus #50**. #41, #44 and #45 all closed on 5 September 2569, and #45 was
the last of the original 44 — **every ticket in `docs/07` is now done**. What is left open are the
numbers above 45: the gaps and defects the rebuild found and opened as it went.

**The frontier is now those, not a screen list.** Take work from the open issues above #45 and from
the ◐ rows the sheets still carry; there is no next screen waiting.

**#50 was the first of that new frontier, and it is the shape to expect from it.** It built no
screen. The sign-in pages shipped inside #10 as a consequence of the CRA scaffold arriving, so #8's
UI criteria were held by a closed ticket and **the one screen every person in the system passes
through was the only screen with no checklist behind it**. Closing that hole is what found four
defects. Entries 4, 6 and the second half of 8 in `10-application-shell.md`'s open list are struck
with it.

Take the state from that list rather than from a phrase. An older version of this line said
*closed through #38* while #37 was open, which read as though the run took four open tickets
with it — the reason the exceptions are now named twice.

The seven most recent — [#42](https://github.com/khthana/Deep-QA/issues/42) (Programme-level
results by intake), [#43](https://github.com/khthana/Deep-QA/issues/43) (Whole-cohort heatmap),
[#35](https://github.com/khthana/Deep-QA/issues/35) (Assessment evidence) and
[#36](https://github.com/khthana/Deep-QA/issues/36) (Section results) on 3 September 2569, then
[#37](https://github.com/khthana/Deep-QA/issues/37) (Individual results),
[#39](https://github.com/khthana/Deep-QA/issues/39) (Outcome-to-Activity map) and
[#40](https://github.com/khthana/Deep-QA/issues/40) (CLO assessment report) on the 4th — were
all hand-walked. #43's walk found a screen that showed a refusal and *กำลังโหลดข้อมูล…* underneath
it for ever, on two screens; #35's found two accessible names and a breadcrumb that read a piece of
the URL at a person; #39's found three things about the drawing that no assertion could state —
labels cut too short and set too small, a blank node six pixels tall, bands too faint to tell
apart — plus [#115](https://github.com/khthana/Deep-QA/issues/115) and
[#116](https://github.com/khthana/Deep-QA/issues/116); #40's found a disclosure that opened onto an
empty box on a รายวิชา with no outcomes, and a PDF that breaks lines mid-word in Thai
([#117](https://github.com/khthana/Deep-QA/issues/117)); and on the 5th
[#41](https://github.com/khthana/Deep-QA/issues/41)'s (Continuous improvement plan) found four
things about the drawing that its own tests all passed through, plus
[#118](https://github.com/khthana/Deep-QA/issues/118), and
[#44](https://github.com/khthana/Deep-QA/issues/44)'s (Programme-level comparison across intakes)
found one, and [#45](https://github.com/khthana/Deep-QA/issues/45)'s (Programme-level results for
one student) found two. **#36's found nothing on screen**, which is worth recording as plainly as
the rest: a walk that ticks every row is not a walk that was wasted, and the store now has nine
tickets where the walk paid and two where it did not.

**#50's walk is the second of those, and it says something #36's could not.** #36 found nothing
because there was nothing. #50's walk ticked all three of its rows while the ticket itself found
**four** defects — every one of them caught by reading the code against the criteria, and every one
of them invisible to an eye on a screen that behaves correctly in ordinary conditions: a refusal key
missing from a table, a 503 nobody navigates into, two `htmlFor` attributes pointing at ids that are
not on the page, and a route nothing reaches. **A walk asks whether what was drawn can be read; it
cannot ask whether what should exist is all there.** Those are different questions, and a ticket
that finds nothing by one method has not been told anything about the other.

**#40's first finding is the shape to remember.** Every automated row asked whether the disclosure
*worked*, and it worked perfectly — on nothing. A test can ask whether a control responds; only a
person asks whether responding was worth offering. That is the second time a walk has found a
control that answers nothing, after #43's.

**#41 wrote that lesson into an assertion and then met it again in a shape the assertion did not
cover.** Its reference panel is not drawn where there is no earlier year, and a mutant proves the
row that says so — with it applied the other eight rows all pass, which is #40's defect stated as a
number. What the walk found anyway: the *space the panel would have occupied* was still reserved,
so the sections sat in two thirds of the page with an empty third beside them, which reads as a
panel that failed to load rather than one that was never offered. **Not drawing a thing is not the
same as not leaving a hole where it was.** The other three were the same class — a picker too
narrow for its own longest option, cards that never named the outcome they were about once the
picker had scrolled away, and the citation an accreditation panel reads set as grey small print.

**#44's single finding is the one to read next to #41's.** That screen draws a column for a year
nobody was admitted in, *so that a reader can see the years are evenly spaced* — the gap is the
whole point, and a mutant proves the column is drawn. The columns then sized themselves to their
contents, and the sentence under an empty year's heading is longer than *113 คน*, so the empty
columns came out **wider** than the real intakes. The axis was not to scale, which is exactly the
misreading the gap columns were added to prevent. **Drawing a thing is not the same as drawing it
truthfully**, and the property that was wrong — how wide — is one a browser can measure and cannot
have an opinion about.

**#45's first finding is the plainest statement of what a walk is for that the store has.** Its
whole purpose is a drill-down: pick an outcome, see the Subjects and Activities behind that
student's figure. The screen puts a 20rem picker beside the report, so its table gets 545px — and
the table carried `min-w-[40rem]`, copied from #42's `48rem` without re-deciding the number against
a narrower pane. The *ที่มา* column began exactly on the frame's right edge and was cut off whole:
**the control the screen exists for was not on screen at all, and nothing said it was missing.**
Two `45a` rows click that button on every run and never noticed, because Playwright finds a control
by role and not by whether a person can see it. **Every automated row asks whether a control works;
only a person asks whether it is there to be found.** Its second was the third sighting of one
class — a tag that carries weight set as though it did not (#41's grey citation, #42's
`text-slate-400`, now #45's *ยังไม่มีคะแนน*).

**A number copied from a sibling screen is a decision, not an inheritance.** #45 borrowed a table's
minimum width from a screen whose table has the whole page. Whenever a value moves between screens,
check what it is a proportion *of*.

**What a walk is for is the appearance, and appearance is where it keeps paying.** #39's three
findings were all judgements about size, weight and contrast — the class of thing a browser test
can measure but cannot have an opinion about. Ask the person to look, and ask about one property
at a time.

Every acceptance checklist has been walked, and as of 6 September 2569 **there is no row left
anywhere that a person could walk and has not**. #44's and #45's sheets both close with
**no ◐ and no ☐ at all**; #50's does not, and the two rows it adds are the honest kind — a ◐ for a
refusal only a server in production mode can produce, and a ☐ for a criterion that **is not met
today** because a wrong password raises the session-expired dialog over the sign-in screen (#97).
A ☐ is also how a sheet says *this is true of somebody else's open ticket*, not only *nobody has
looked*. The count is worth taking from the sheets rather
than from here — two ☐, one of them half of a ticket somebody else owns (#49's menu set); of the ◐,
all but one name a request no control on any screen can produce (#41's added the tenth: the year a
plan is written for comes from the ตอนเรียน in the address, so no browser can send a different
one), and the last is an arithmetic difference too small for an eye to decide and pinned exactly at
the HTTP seam. Read a row that claims a seam proves it better than an eye as a claim to check, not
a conclusion — that is how the last of the walkable ones were found.

**A ⚙ that was never earned is the mark to distrust most.** #42's fifth criterion carried one until
#35's ticket caught it, #36's sheet shipped nine before its own review caught them, #37's carried
two, #39's carried two, and #40's carried two — **five tickets running, the same mistake**, each
caught by that ticket's own review rather than by the one that wrote it. The tell every time: a row
proved at *both* seams reads exactly like a row covered by the browser seam alone. ⚙ means a mutant
killed **that row's own assertion** in `36a`, `35a`, `38a` and so on; a row proved only at the HTTP
surface is ☑.

Two of #40's were worse than a miscount: one row's assertion was also **weaker than the row
claimed** — a filename matched as `assessment-.+\.pdf` under a row about naming the ตอนเรียน and the
year. Check what the assertion actually says, not only that one exists.

**#41 carried that second species too, and its own review caught it — six tickets running.** Its
first row read *บันทึกได้ครบทั้งสี่หัวข้อ สำหรับ CLO และปีที่เลือก* over three assertions that say
nothing whatever about the year. The row was split: the CLO half keeps its ⚙, the year half is a ◐
naming the seam that does prove it. A row marked ⚙ has to be a row the cited assertions cover
**whole**, not one they cover most of.

**#44 made it seven, in both of the shapes at once.** One row claimed *both ends of the range drive
the report* over a mutant that froze one end — the row now moves each end on its own and has a
mutant for each. The other carried a ⚙ **naming no mutant at all**, which is the plainest form of
the mistake and the easiest to check for: read down the ⚙ rows and make sure every one of them
points at a line of the mutant table.

**#50 made it nine, and its version is the one to be most careful about: the gap was already
written down.** Its first row read *every reason the Google path can refuse with* over a `50a` row
that **iterates the list of reasons** — so deleting a reason from the list shortens the loop and
fails nothing, and the completeness half is proved only at the HTTP seam. That is not a subtle
point that went unnoticed: `mutation/50-sign-in-screens.py` says it in a paragraph of its own, and
so did the sheet. The row carried a ⚙ anyway. **Explaining a gap in prose is not the same as
marking it** — the mark is what a later reader trusts, and prose beside a wrong mark reads as
context rather than as a correction. The row is now split, the completeness half a ☑ naming
`auth.test.js`.

**#45 made it eight, and added a second way to find it.** Its row read *เลือกนักศึกษาได้ และกรอง
ด้วยปีรับเข้า* over `searchignoresthecode`, a mutant about the search box alone; the intake half is
now a ☑ naming the seam that does prove it. What is new is that **the sweep caught the other one
before the review did**: a mutant transplanted from #44 applied cleanly, ran, and killed nothing,
because the defect it names cannot happen on that screen. A surviving mutant is not always a hole
in the tests — sometimes it is a claim the code makes structurally, and the honest answer is to
delete the mutant and mark the row ☑ rather than keep a ⚙ nothing earns. **Read a MISS and a
survivor differently: the first means the anchor moved, the second means the claim was never at
risk.**

**#50 found a third species, and it is not a miscount at all — the tool was wrong, not the claim.**
Its row asserting *no refusal on an ordinary arrival* was `await expect(banner).toHaveCount(0)`,
which is a web-first assertion and **retries for ten seconds** — and that banner dismisses itself
after three (#85). So it passed on a screen showing a refusal nobody had earned, and the mutant that
draws one every time killed nothing. A probe confirmed the banner was on screen, count 1, at the
moment the row believed it was looking. **A retrying negative against an element that removes itself
is an assertion that cannot fail.** The fix is to read the count *once*, at a named settle point,
and compare it as a value. The store was then swept for the same shape: 112 retrying negatives
across 40 spec files, but `frontend/src` contains exactly **one** element that removes itself on a
timer — this banner — so the other 111 stand on things that are simply not there. Check what an
assertion is made of, not only that it names the right thing.

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
