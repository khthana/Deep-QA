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

Closed: **#2–#45 unbroken, plus #50, #66, #97, #85 and #111**. #41, #44 and #45 all closed on 5 September 2569, and #45 was
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

**#66 is the second, and it carries the other thing to expect from this frontier: some of these
tickets contain a decision that is not yours to make.** Its body asked whether the
two-application chooser should exist at all before it asked for any fix, and `docs/06` §Out of
Scope settles who answers that — *"The UI is reproduced as-is. Any proposal to change it is raised
as a question, not implemented."* The owner answered on 6 September 2569: **there is one
application now**, so the chooser and the *ไปที่ Deep Portfolio* entry beside it are both deleted
rather than repaired into the flow. Read a defect ticket for a question before reading it for a
task; answering one yourself is how a rebuild acquires opinions nobody asked it to have.

**And #66's own account of the defect was out of date, which is worth checking before building on
any ticket's diagnosis.** It says the chooser is never reached on the password path. Recording
every navigation says otherwise: `/` → `/select-app` → `/main` → the first menu entry. It was
reached, drawn, and taken away again — three components each holding an opinion about where a
signed-in caller belongs. That is worse than the stated defect, not milder: a screen nobody reaches
is dead code, and a screen that appears and is yanked away is one that cannot be used.
**A ticket's *What is wrong* is a claim from the day it was written; measure it before you fix it.**
Three of the five rows in `66a` were drafted from the ticket's account and all three were wrong
until the sequence was recorded.

**The same discipline, applied a second time, is what kept #66 from growing.** Its second criterion
reads *no component navigates to a route another component has already redirected away from*, and
after the fix two components still hold that shape — `GuestRoute` navigates to `/main`, `SidebarItem`
redirects off it. The tempting moves are to declare it met or to start extracting `MENUS` into a
shared module. Instead it was measured, one sample per composited frame through the real sign-in:
**one frame out of forty-five, with the body's text not yet laid out.** No state a person can see.
So it is [#120](https://github.com/khthana/Deep-QA/issues/120) with the numbers in it, not a
refactor inside a ticket scoped to deleting a chooser — and the ticket says why the bound is an
accident rather than a guarantee (nothing in the hop waits on the network *yet*).
**When a criterion is met literally but arguably not in substance, the question is usually
measurable; measuring it is cheaper than either arguing or refactoring.**

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
than from here — two ☐: one is half of a ticket somebody else owns (#49's menu set), and the other
is the Google half of where a sign-in lands, which no seam on this machine can reach (#119). #50's
☐ — the criterion that was not true — is gone, closed by #97. Of the ◐,
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

**#66 made it ten, and its version is the one a checklist cannot catch: the row was true of
the half that was tested.** Its landing row read *ทั้งทางรหัสผ่านและทาง Google ส่งต่อที่จุดเดียวกัน*
over `66a` rows 1–2, which drive the password form and nothing else. Every earlier instance was a
row claiming more than its mutant proved; this one claimed a **second path** the seam never enters.
What makes it worth its own line is where the honest half landed: the Google success branch cannot
be driven at either seam — the consent screen is not scriptable, and both the e2e stack and this
machine run with the credentials deliberately blank — so the split half is not a ☑ pointing at
another seam, it is a **☐ with a ticket** ([#119](https://github.com/khthana/Deep-QA/issues/119)).
**A row that names two ways in is two rows.** Read every *both … and* in a sheet as a claim about
two things, and check the spec enters both.

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
across 40 spec files, and on 5 September `frontend/src` contained exactly **one** element that
removed itself on a timer — this banner — so the other 111 stood on things that are simply not
there. Check what an assertion is made of, not only that it names the right thing.
**#85 then deleted that timer, so today the count is zero and all 112 are safe** — which is worth
keeping as a pair rather than editing down to the current number: **a survey of the store has a
date on it, and a successful fix is what expires one.** Read the date before the figure, in that
paragraph and in every one like it.

Earlier versions of this paragraph said fifteen, then nine. Most of those turned out to be walkable
after all — they were waiting not on a person but on a **situation the seed does not contain**, and
building the situation and restoring it afterwards is a normal part of a walk.

**#97 is the third of the new frontier, and it is the one that says what a ☐ is for.** #50's
sheet carried a ☐ that meant *this criterion is not true today* - a wrong password drew the shell's
full-screen expiry dialog over the sentence saying the password was wrong, to somebody who had
never had a session. The ☐ named the open ticket rather than describing the defect twice, and
closing that ticket is what turned it into a ⚙. **A ☐ that names a ticket is a working link between
two sheets, not a gap in one of them** - take the count of open work from the ☐ rows and the open
issues together, and expect closing a defect to move a mark on a sheet the defect is not filed
under.

**What #97 measured is worth more than what it fixed, and it is about redundancy.** Two components
both raised that dialog - `client.js` for any 401 its caller had not flagged, and
`AuthContext.load()` again for the bootstrap read. The sweep says what that cost: `silentexpiry`,
the mutant that removes the second raise, **killed nothing**, and `silent401`, the mutant that
removes the first, **could not kill the reload row**. Each covered for the other. With the
duplicate opinion removed, `silent401` goes from killing two rows to killing **five**.
**Two places holding one opinion is not a safety margin; it is a claim neither of them can be shown
to hold.** When a mutant survives, ask whether the code says the thing twice before concluding the
test is missing.

**And #97 adds a third way to read a sweep, after #45's MISS and survivor: the mutant that kills
too much.** Its first two mutants each killed **eighteen rows out of twenty-two** - the same
eighteen - because both raised the dialog on the 401 that `GET /api/me` answers on a first visit,
so no spec in the suite could sign in at all. A mutant that stops the application working kills the
row it was aimed at and forty other things first, and a run like that says nothing about which
assertion was holding what. **A mutant has to be able to fail one row and leave the rest standing.**
What replaced them names the defect directly - `credentialsisanexpiry` adds `credentials` to the
condition - and kills exactly the two rows it is about.

**#85 adds a fourth, and it is the one that looks most like a hole in the tests.** Both mutants
it wrote for `role="alert"` — one taking the attribute off the banner, one making `ContentMotionDIV`
swallow it a component further out — killed **nine of thirteen rows, the same nine**, and no spec
could tell them apart. The cause is that #85 moved the banner's locator from a Tailwind class to
`getByRole('alert')`, so the role became what the banner *is* as far as `50a` is concerned. Take it
away and every row that mentions the banner stops finding its subject. **An attribute a locator is
built on stops being provable by mutation: it becomes the premise of those rows rather than a claim
any of them makes**, and a whole spec file going red is what that looks like. Its presence is
already load-bearing in the plainest way — were it missing, the suite would not be green — so a
mutant asserting it proves the tests can run. Both were deleted and the announcement half is a ◐
that says which half reached the DOM and which half needs an ear. **Moving a locator onto an
attribute is a trade: a locator in the right place, paid for with that attribute's provability.**
The trade is usually worth taking; what is not optional is writing it down, so the next reader
meets an explanation rather than a red file.

**And the counter-example is in the same ticket, which is what makes the line drawable.** #85's
review found that only half of *tie the refusal to the form* had shipped — the sentence was
announced but described neither field — so `aria-describedby` was added and a mutant written for
it. That mutant kills **one row**. Same screen, same ticket, same class of accessibility
attribute, opposite result. **What decides whether an attribute can be proved is not how much it
matters but whether the suite finds elements *by* it.** An attribute the tests locate through is a
premise; an attribute they read off a located element is a claim.

**The same four `50a` citations moved three times in one day, and the third time says the most.**
#97 inserted two tests mid-file (6·7·8·9 → 8·9·10·11), #85 inserted two more (→ 10·11·12·13), and
#85's review forced a fifth (→ 11·12·13·14). The first drift was caught by `/code-review`, the
second by two sheet rows both citing *row 8* — and the third by `/code-review` again, in a place
the first two passes had never looked. **`50-sign-in-screens.md` has two tables, and only the
criteria table had ever been renumbered**; the mutation table's *kills* column was still carrying
pre-#97 numbers, two paragraphs below prose explaining that exact shift. **Chase every place a
number is cited, not every row of the table you are already in.** After inserting a test, count the
tests in the spec file and then grep the store for the number — both tables, and every mutation
file swept with that spec — or append tests to the end, where nothing moves, which is much
cheaper.

**And *two tickets on the same screen* is not evidence they share a file.** `85`'s header first
warned against sweeping it beside `97-*.py` because *all three hold `Login.js`*; `97` holds no
frontend file `85` touches. It fixed the dialog drawn over the refusal (`client.js`,
`AuthContext.js`); `85` fixed the refusal's own lifetime (`Login.js`). Two tickets landing on one
screen the same day makes the collision feel too obvious to check. **What corrupts a sweep is a
repeated path — compare `FILES`, not subject matter.**

**#111 is the fourth of the new frontier, and it is the strongest case yet for measuring a
ticket's diagnosis before building on it.** Its body says the refusal banners *are drawn inline in
each page rather than by a shared component, so the fix is either a small `<Refusal>` that owns the
attributes, or the attributes added at each of the twenty sites*, and names twenty files. None of
that survived contact: `components/Notice.js` already existed — #55 wrote it, for the unrelated
reason that a banner above the fold is a banner nobody reads — and **34 screens use it**. Of the
twenty files named, most of the `bg-red-50` matches in the store turned out to be `hover:bg-red-50`
on delete buttons, and `LearningDetails`'s is a list of CLOs needing attention rather than a refusal
at all. **The real work was one attribute in one component plus three stragglers**, where the ticket
described a component to write and twenty edits to make. A ticket that proposes a solution has
usually diagnosed the code as it stood on the day it was written; check both halves, because the
proposed fix ages faster than the symptom.

**And its headline claim was false in a way worth studying, because the evidence looked
airtight.** The ticket's title is *no live region anywhere in the app*, and under it sits a pasted
terminal session: `grep -rn 'role="alert"\|aria-live' frontend/src` returning no matches. That
pattern cannot match `role="status"` — and four screens were already using it for their empty-state
sentences (`CloAssessment`, `ContinuousImprovement`, `OutcomeActivityMapping`, `StudentResults`),
while #85 had since put `role="alert"` on the sign-in banner. The banner really was silent, so the
defect stood; the *anywhere in the app* half was an artefact of the search. **A grep is evidence
for the pattern you typed, not for the claim you wanted** — and a pasted empty result is the most
persuasive form that mistake takes, because it reads as a measurement rather than as an argument.
This one was repeated rather than re-derived: the first pass here ran the ticket's own command and
believed its own output for the same reason. **Re-run a ticket's commands, then ask what they could
not have found.**

**What #111 asked to be decided once is a politeness level, and that is a claim like any other.**
`role="alert"` is assertive and interrupts; `role="status"` is polite and queues. `Notice` picks
from `notice.error`, the flag that already chooses red or green, so no caller decides it. The
mutant worth knowing about is `everythingisanalert`: with it applied every refusal row still passes,
the screens are pixel-identical, and the only change is that saving a form now cuts off a
screen-reader user mid-sentence to say it worked. **A defect nobody can see needs a mutant or it is
not proved** — and its twin `everythingispolite` exists because *polite everywhere* is the more
tempting mistake, being the safer-sounding one, and it is wrong for exactly the case the ticket was
opened about.

**#111 also shows where #85's locator trap does and does not apply.** `111a` finds these banners
by `getByRole`, which is the thing #85 warned about — but it is safe here, and the difference is
worth stating: those are the rows *about* the role, and they are the only rows that use it for
these banners. Every other row in the store still finds them by their text. Removing the attribute
kills exactly the rows that claim it. **The trap is not using a role in a locator; it is using it
in the locator every other row shares.**

**Adding a role is still a change to every locator that reads roles, including in files the diff
never opens.** `37a-student-results.spec.js` held two unfiltered `page.getByRole('status')`
assertions, and `StudentResults` renders `<Notice>` — which now emits `role="status"` on a success.
Green today only because that spec never makes the page save anything; one saved form away from a
strict-mode violation. `39a` and `40a` already filtered theirs, so the convention existed and one
file was the outlier. **After adding a role or a label anywhere shared, grep the specs for
unfiltered `getByRole` on it** — the breakage lands in files that have nothing to do with the
ticket.

**And a fix that lands in a shared component and misses the copies is the shape this ticket exists
to catch**, so three of its six mutants exist only to fail a copy: the change-password dialog, the
import report and the grants panel each draw their own banner. `GrantsPanel` is a near-byte-for-byte
copy of `Notice` that #55 appears to have missed, and #111 gave it the attribute rather than
switching it to the component — swapping it would have changed spacing and added scroll behaviour,
neither asked for. That is [#121](https://github.com/khthana/Deep-QA/issues/121). **An accessibility fix does not get to change layout on the
way past** — the same rule that stopped `ContentMotionDIV` taking `...rest` in #85.

**#66 also retired two rows that had been walked the previous day**, and the shape of that is
worth knowing before it happens again. #50's walk ticked the chooser and the *ไปที่ Deep Portfolio*
entry; #66 deleted both screens within hours. The first attempt to record this invented a `—` mark
for *retired*, which is a fifth mark in a store that defines four — and an undefined mark is worse
than a missing row, because a later reader has to guess. The rows are gone from the table and the
retirement is prose in the walk record instead. **If a ticket on the frontier is about to decide the
fate of a screen, walk that screen after it, not before** — and never invent a mark to hold the
difference.

**Read the mutation file for mutants that are missing from a sheet, not only sheets for ⚙ that
name no mutant.** #44 taught the first direction and it has been run down the ⚙ rows since. #97
found `10:nowrite` sitting in `mutation/10-application-shell.py` and in no table anywhere, under a
⚙ row that cited nothing - which the ⚙-first pass cannot see, because it looks for rows without
mutants and this was a mutant without a row. Both directions, or neither.

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
