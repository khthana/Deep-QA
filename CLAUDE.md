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

Closed: **#2–#45 unbroken, plus #50, #66, #97, #85, #111, #121, #119, #123, #122, #96, #107, #102, #67, #101, #124, #126, #125 and #89**. #41, #44 and #45 all closed on 5 September 2569, and #45 was
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
than from here — **one ☐, and it is half of a ticket somebody else owns**: #49's menu set
on `10-application-shell.md`. There were two until 9 September 2569, and the second is worth
keeping in mind for what it was: the sample row on `11-user-accounts.md`'s download row,
which the sheet had first described in prose beside a ☑ for the whole row — #50's
*explaining a gap is not marking it* arriving inside the ticket that opened the gap. Marked
☐ with #124's number on it, it was a working link between two sheets for a day and then it
was closed, which is the whole life cycle a ☐ is for. #50's
☐ — the criterion that was not true — is gone, closed by #97, and the Google half of where a
sign-in lands is gone too, closed by #119 with the seam the sentence beside it said could not
reach it. Of the ◐ — **seventeen, counted from the sheets on 7 September 2569, and this
sentence used to describe eleven and then fifteen** — the original eleven are a request no control on any screen can
produce (#41's added the tenth: the year a plan is written for comes from the ตอนเรียน in the
address, so no browser can send a different one) plus one arithmetic difference too small for an
eye to decide and pinned exactly at the HTTP seam. The other six are a second kind and arrived
with #85, #111 and now #122: an attribute reached the DOM and **whether anybody hears it needs
an ear**. The first kind is not waiting on anybody and never will be; the second is waiting on an
ear, which is a real queue, and counting the two as one block is how six rows come to look
unreachable when only eleven are. Read a row that claims a seam proves it better than an eye as a claim to check, not
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
What makes it worth its own line is where the honest half landed: it was written up as a branch
that **cannot be driven at either seam** — the consent screen is not scriptable, and both the e2e
stack and this machine run with the credentials deliberately blank — so the split half was not a ☑
pointing at another seam but a **☐ with a ticket**
([#119](https://github.com/khthana/Deep-QA/issues/119)).
**A row that names two ways in is two rows.** Read every *both … and* in a sheet as a claim about
two things, and check the spec enters both. That much still holds; the sentence about the seams
did not, and #119 is where it came apart.

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

**#121 is the measure-first rule applied to a ticket this repo wrote itself, and the first
measurement found nothing.** It was opened during #111 with the below-the-fold half marked
explicitly as unmeasured. Run at the 900×400 viewport `55a` uses, the grants panel's heading stayed
fully in view — no defect visible. Two wrong conclusions were available there: *there is nothing
here*, and *there must be, so loosen the test until it fails*. Reading the geometry off the page
gave the real answer: a 291px pane, 264px from the banner to the add button, 48px per grant row —
**it fits by 27px, and one grant row more than the seed's largest account holds puts it over.**
The defect was real and the seeded data sat just under the line. **When the first measurement finds
nothing, go and read the numbers; do not conclude absence and do not move the test until it
passes.** The spec then reaches that geometry by shrinking the window rather than by writing grants
into a schema every other spec shares — same defect, approached from the side that touches nobody's
data.

**#55's own count was the tell, and it was checkable the day it landed.** It says *six screens had
this block byte for byte* and fixed six; there were seven. **A ticket that states how many places
it changed has published a claim a one-minute grep can check** — and nobody did for fifteen days.
Read that number as an assertion, not as prose.

**A mutant outlives its ticket but not its anchor.** #111's `grantsstaysilent` was anchored to the
`role` on the copy of `Notice` the grants panel held; #121 deleted the copy the same day, so the
line was gone. The move is to delete the mutant, not to re-aim it at something it was not written
about — `refusalisnotannounced` covers that panel now along with the other 34 screens, and **its
own kill count grew from two rows to three in the process**, which is a number worth re-reading
after any ticket that consolidates code. What replaced it puts the copy back *with* its role, so it
fails the scroll and not the announcement: two claims owned by two tickets have to be able to fail
apart.

**#119's find is a true sentence read as an answer to a question it does not address.** `backend/test/auth.test.js` opens by saying the Google paths
are asserted through `resolveGoogleAccount` because Google's consent screen is not something a
suite can drive. Both halves of that are correct, and both are about **Google's** half of the round
trip. The two lines that decide where a person actually ends up are on this side of it — the
redirect to `/main`, and the redirect back to `/login?error=<reason>` — and nothing at either seam
ever ran either one for a caller Google had answered for. **A reason that explains why one half of
a thing cannot be tested is not a statement about the other half.** It read like one for long
enough that #66 rewrote the destination on that line with no test watching it. The first write-up
of this said *nothing ran either line*, full stop, which is a step too far and was caught by the
ticket's own review: `refuseToBrowser` **is** run today, on the branch that answers before passport
is entered. **A covered branch beside an uncovered one is what makes the uncovered one look
covered** — name the branch, not the function.

**The trap is that a near-miss looks like coverage.** `50a` iterates `GOOGLE_REFUSAL_REASONS` and
asserts the screen shows the right sentence for each — by **typing each reason into the address
bar**. That proves the screen can read a reason out of a query string, not that the route ever
puts one there. Between the function that decides a reason and the screen that renders it sits the
line that carries it, and both seams stepped over it while appearing to cover it from either side.
**When two tests sit either side of a line, check whether anything runs the line.**

**Covering that refusal line was not in the ticket, and the reason for doing it anyway is worth
being explicit about**, because this repo's usual move is the opposite — #66 opened #120, #111
opened #121 and #122, #121 opened #123, all rather than grow the ticket in hand. What made this
one different is that it is not work: the stub the success branch needed makes the refusal branch
reachable in six more lines and no production code changes at all, and the alternative was to close
the box on *where a Google sign-in lands* while leaving the other place it lands unrun. **Defer
adjacent work; do not defer the second half of the sentence you are closing.** The sheet row says
in its own words that it was not in the ticket.

**What made it testable was drawing the stub boundary at the machine's edge rather than at the
feature's.** The token exchange and the profile lookup are the only two calls that leave this
machine; stub exactly those and the strategy, `resolveGoogleAccount`, the seeded database and the
real cookie all run. docs/06 forbids stubbing the database and stubbing sign-in and neither is
stubbed — a stubbed profile asserts *Google said this address*, which is the one fact in the
exchange Google is the authority on. **Ask what actually cannot be reached, not what the feature is
called.**

**And the mark is not the mutant.** These three mutants are killed by `node --test`, so the rows
they back are ☑ and not ⚙: the mark says which seam proved a row, the sweep says whether it was
proved at all, and those are different questions. Two of the three first killed the *same* row —
the destination and the session cookie were written as one claim — which is the #85 shape without
the #85 cause: not a premise a locator stands on, just two claims sharing a row. **Two mutants
failing one row is a reason to go back and read the row.**

**#119 also found the stale summary line on the sheet it was closing**, which is the same species
as `mutation/README.md`'s collision count: `10-application-shell.md` said *14 ⚙ · 3 ☑ · 2 ☐* while
the table held 15 ⚙, 3 ☑, 2 ☐ **and a ◐ the sentence did not mention at all** — #111 added a row of
each the day before and did not touch the total. **A hand-kept number in a file that grows every
ticket is a number that is already wrong**; count the table.

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

**#123 is the third direction, and neither of the first two can see it: the mutant is in the file,
the sheet cites it by name, and it no longer applies to anything.** A mutant is a string to find
and a string to put in its place; refactor the file and the string goes, and applying it answers
MISS — not a kill, not a survivor. What is left is a ⚙ resting on nothing, and nothing about the
sheet looks wrong. The store had four, and they are worth reading together because each went stale
a different way: `27:noeditorline` lost its anchor to a **line break** (#29 reflowed the JSX; the
rendered sentence is identical), `30:importlineoff` to a **neighbour** (#26 changed the expression
beside the one the mutant is about, which the anchor had to include because the line it cares about
occurs three times), `38:bandoffbyone` to a **move** (`bandOf` went to `lib/attainment.js` for #42
without one character changing), and `13:N7` to a **rewrite** (#92 rebuilt the logout route). All
four still killed the row their sheet named once re-aimed, so nothing here was a wrong claim —
it was a claim that had quietly stopped being checked.

**The one that matters is `13:N7`, because the reason nobody saw it was the checker.** #121's
anchor script read each file's whole `MUTANTS` dict with a single `literal_eval` and kept only
values that were tuples. One entry built from a module constant and the call raises, so *the whole
file* is skipped in silence — all thirteen of #41 and all seven of #43, where only five and one are
the entries actually unreadable. Every mutant written as a *list* of edits was skipped too: all
nine of #13, all fourteen of #16, plus `24:currenttermonly` and `27:bodygrain`. It printed
`checked: 426` over a store of 471 and read as though the other 45 had each been looked at and
found unreadable.
`13:N7` sat under a live ⚙ row for sixteen days inside that blind spot. **A tool that cannot say
what it did not look at is the same species of claim as the hand-kept numbers it exists to check** —
`mutation/anchors.py` replaces it, reports `unreadable` as a failure, and is the thing to run
before believing the store's mutants are worth anything.

**And a mutant's blast radius changes when the code moves under it, with nobody deciding that.**
Before #42, `bandoffbyone` broke one screen's arithmetic; today it breaks every screen that bands a
score. Re-aimed and swept across the store it kills `38a` row 2 and nothing else in the browser,
plus four subtests at the HTTP seam — the programme-level specs band the same way and notice
nothing, because no seeded cohort mean lands exactly on an edge. `30:importlineoff` went the other
way: it kills its own row in `30a` **and five more** in `11b`, `14b`, `14c`, `17b` and `34a`, every
one of them a row about a reported line number. That is not #97's *kills too much* — those rows all
assert the claim — but no sheet knew, because a sweep is run one ticket at a time and the
*other rows that died with it* column reads as though it were about the store.
**When a mutant lives in shared code, its sheet is one of the places it kills, not the list.**

**#122 is one defect described on two screens, and it was two — which is a new way for a
ticket's diagnosis to be wrong.** Both screens carried a fact in colour and nothing else, and that
half of the ticket was exactly right. But it said both turn red *เมื่อ `total > 100`*, and only the
Activity editor does: สัดส่วนคะแนน's condition is `total === 100 ? green : red`, so **the colour
there never meant *over* at all — it meant *not exactly a hundred*, and 80 was as red as 120.** The
rules are different (`= 100` against `<= 100`, because a half-finished attribution is legal and a
half-finished weighting scheme is not), so the right fix for one shared symptom was two different
sentences: three states on one screen, one state and a deliberate silence on the other. A single
sentence written from the ticket's account would have left the person stuck at 90 hearing nothing
at all. **A ticket that generalises across screens has usually generalised the symptom; check
whether the rule generalises before the fix does.** `editorcopiesthescheme` and
`schemeonlycomplains` are the two mutants that exist to fail exactly that merge, and each kills one
row and nothing else.

**Where the words go is part of the fix, not styling.** The number is *outside* the live region and
the verdict is inside it, because a region holding `รวม {total} / 100` re-announces the running
total on every keystroke — which is how a polite region becomes something people switch off. And it
is `aria-live="polite"` rather than `role="status"`: the roles this app announces with belong to
`Notice`, specs across the store filter `getByRole('status')` by expected text, and #111's own
§Note on scope had already set aside *a validation hint that appears while typing* as not the
`Notice` case. **Adding a role is joining a set every unfiltered lookup in the store searches;
`aria-live` announces without joining it.**

**And the line the sentence joined was measured rather than argued about.** #111's rule that an
accessibility fix does not get to change layout on the way past is a claim about geometry, so
both reviews asking whether a second element had moved the pre-existing total and บันทึก were
answered with numbers at 1280, 900 and 500: everything stays on one line, the button's right
edge sits 84px inside the narrowest frame, and `scrollWidth` equals `clientWidth` throughout.
The `flex-wrap` never fires down to 500px — it is insurance — while the editor's new wrapper
`div` **does** earn its place there, keeping the sentence beside its number when the heading
wraps away. **A rule about layout is checked with numbers, and the reading cost one throwaway
spec that was deleted the same hour.**

**#96 is the ticket that was blocked on a question nobody had asked, and it is the
counterpart to #66's rule rather than a repeat of it.** #66's lesson is *read a defect
ticket for a question before reading it for a task*. #96 shows what happens when you do
that and then stop: its sheet said the fix could not be made until somebody decided where
`CLO-3ก` sorts, `CloForm.js` carried the same sentence as the reason the code is free text,
and the ticket sat open for **fifteen days** behind it. The owner settled it in one
sentence on 7 September 2569 — **the codes carry no letters, they are numbers only** — and
the premise of the block simply was not true. **Finding the question is half the move;
asking it is the other half**, and a question that has been written down twice in two
files is not thereby closer to being answered.

**Its diagnosis undercounted by ten to one, in the now-familiar direction.** The ticket
names one `ORDER BY`; its own later comment names four across three files; there are
**ten across eight route files**, every one of them feeding a list a person reads. And two
sites that grep identically are deliberately *not* callers — `sectionResults.js` builds
`array_agg(DISTINCT c.clo_number ORDER BY c.clo_number)` twice and compares the two
arrays, so both sides are built the same way and the answer does not depend on the order
at all (Postgres would reject a foreign sort key there anyway). **A repeated `ORDER BY` is
not automatically a repeated defect; read what the order is for.** The same count went the
other way on the tests: the comment names one assertion that compares the route against a
copy of the route's own `ORDER BY`; there are four, and the three other grep hits are two
fixture helpers and a `DESC LIMIT 1` that picks a row rather than claiming an order.

**And the sweep is what found the overclaim, which is a fourth way to read one.** #45 gave
MISS and survivor, #97 gave *kills too much*; this is **a survivor on a row nobody
suspected**. Both mutants leave `27a` entirely green, and sheet 27 had its list row reading
*เก้าแถว `CLO-1` ถึง `CLO-9` เรียงตามรหัส* over `27a` row 1 — whose assertion is
`codesOnScreen(page)` equals `clos.map(...)`, a claim that the **screen preserves whatever
order the route sent**, not a claim about what that order is. On the seeded nine, text and
number order are identical, so nothing in the store was ever in a position to tell them
apart. The row is split and the ordering half cites `96a` row 1. **Where a sheet says
*ordered by X*, check whether the assertion reads X or merely passes it through.**

**The two mutants are a matched pair and the asymmetry is the finding.** `ordersastext` is
the defect itself and kills **one** subtest and two browser rows; `descending` kills
**nine** subtests and the same two rows. Direction is visible on any set; text-versus-number
is visible only on a set that contains `CLO-10`. **A defect that survived two green suites
for months usually survived because no fixture could express it**, and the fix is a fixture,
not an assertion.

**#96 also landed on a row that had been written to expect it.** `37a`'s off-the-chart row
needed an outcome past the ten-axis cap that still had marks, and before the fix it got one
for free — `CLO-9`, pushed off by the text order. Its own note said in as many words that
this would have to be rewritten when #96 closed. It was, and the row now **builds its
situation** with a `moveMarks` helper instead of inheriting it. **A row that needs a defect
to be reachable is a row that has to be rewritten the day the defect is fixed** — write that
on the row when you notice it, because the note is what makes the rewrite twenty minutes
instead of an afternoon.

**#96's review found a branch that neither of its mutants could see, and the reason
generalises.** `ordersastext` and `descending` both vary the same property — **which
order** the list comes back in — so between them they say nothing about the `NULLIF`
that wraps the sort key. Deleting it does not reorder anything: `regexp_replace` returns
the empty string for a code with no digits in it, `''::numeric` is a cast Postgres
refuses, and one such code answers **500 on every screen that lists outcomes**. Nothing
at either seam held that, and the whole store stayed green with it gone. **Two mutants
that vary the same property cannot see a third property**, and the question that finds
the gap is not *is this line covered* but *what would a mutant have to change to break
this in a way neither existing one does*. What closed it is a subtest and
`nofallback`, which kills that row and nothing else in 704.

**The branch was also the one the owner's answer made look unnecessary, which is why it
nearly went unproved.** Codes carry no letters, so on the data this system is meant to
hold the fallback is never taken — and that is an argument for proving it, not against.
`clo_number` is `varchar(50)` and a person types it, so the branch is one typing mistake
away, and the failure it prevents is a dead screen rather than a row in the wrong order.
**A branch that correct data never reaches is still reached by incorrect data**, and the
seed is not the argument.

**And this ticket ran the hand-kept-number lesson on itself, twice over.** *A hand-kept
number in a file that grows every ticket is a number that is already wrong* was written
here after #119. #96 then stated *ten across nine route files* — it is eight — in
**five** places, a first correction pass fixed three and believed itself done, and
`/code-review` found the other two. The count of tautological tests went the same way:
*seven* in two comments where the real number is four, the other three grep hits being
two fixture helpers and a `DESC LIMIT 1`. **Correcting a number in the places you
remember writing it is not correcting it** — grep for the wrong value afterwards, and
grep for it again after the fix, because the same wrong figure gets retyped into prose
that was written at the same time as the code.

**The last thing the review caught is a helper that had quietly become a second rule.**
`inCloOrder` in `backend/test/helpers.js` exists precisely so that a test is not asking
the route to confirm itself, and it compared digit-strings by length — which agrees with
`::numeric` on everything except leading zeros, where `CLO-01` and `CLO-1` tie
numerically and the helper put one of them last. Green on the seeded data, and a false
failure waiting for a route that is right. **A helper written to restate a rule
independently has to restate it exactly; agreeing on today's data is what a
copy-of-the-rule does too.**

**#107 is #96's lesson arriving a second time, one ticket later, which is what
turns an anecdote into a rule.** #96 found two `ORDER BY`s that grep like the
eight it fixed and are deliberately not callers. #107 found one `/^\d+$/` that
greps like the thirteen it fixed and is deliberately not one: `weights.js` reads
a `score_ratio_id` out of a *body*, and `null` there does not mean *refuse* — it
means *a category this scheme does not have yet*, and the row is inserted. An id
the scheme does not hold is refused **by name** forty lines further down, before
it is ever a query parameter, so there is no 22003 to prevent and `integerId`
there would have turned a refusal into a silent insert. It was found by writing
the row first and watching it answer **404, not the 500 every other site
answered**. **A guard that greps the same is not the same guard — read what it
does with its `null`**, and let the reproduction tell you, because thirteen of
fourteen behaving one way is exactly the evidence that makes the fourteenth look
obvious. The row that pins it is in `weights.test.js`, so the next pass that
"finishes" #107 fails a test instead of shipping the regression.

**The crafted id the ticket suggests could not see half the guard, and asking
before the sweep is what caught it.** #96's `nofallback` was found by the review,
after the sweep had already been written up; here the same question — *what would
a mutant have to change that no row could see* — was asked first, and the answer
was arithmetic. `integerId` refuses `Number.isSafeInteger(id) && id >= 1 && id <=
INT4_MAX`, and `Number('99999999999999999999')` is 1e20, which fails
`isSafeInteger` **before the ceiling is consulted at all**. Every row written with
the ticket's own id would have left `id <= INT4_MAX` — the clause that is actually
about the `integer` column — unproved, and `nobound` would have survived a green
sweep. `2147483648` is the id only the ceiling can refuse. **When a guard is a
chain of conditions, one crafted value proves one link**; count the links and
craft one value per link, and do it before the sweep rather than after.

**And a third clause could not be proved at all, which is a different answer
again.** `Number.isSafeInteger` **cannot decide anything** here: the regexp has
already excluded signs, decimals and exponents, so every value reaching it is a
non-negative integer literal, and every one large enough to be unsafe is far
larger than `INT4_MAX` and refused one clause later. The mutant was written,
swept, and killed nothing — #45's rule — so it was deleted rather than left in
the store as a red mark against rows that are fine. **A clause that is free and
harmless is still a clause no test can be written for**; say which of the three
it is (proved, structurally unreachable, or missing a test) rather than leaving a
reader to assume the first.

**The best thing the sweep found was in another ticket's file, and neither of
the store's two checks would have found it alone.** `mutation/anchors.py` reported
two MISSes in `24-teacher-dashboard.py` the moment `teaching.js` was rewritten —
#123's shape, caught by the tool built for it. Re-aiming `nonumericguard` at the
new `if` looked right and **killed nothing**, and the reason is the fix itself:
the route used to test one value and bind another, so deleting its refusal let
the raw address reach PostgreSQL as a 22P02; it now binds the value it
validated, so deleting the refusal binds `null`, `WHERE section_id = NULL`
matches nothing, and the caller gets the same 404 by accident. **A guard that
returns the value it validated cannot be broken by deleting its refusal alone.**
That is a property of the fix rather than a gap — but the mutant had to be
re-aimed at the binding to have anything left to say. **An anchor check tells you
a mutant no longer applies; only a sweep tells you it no longer proves
anything**, and a refactor can turn the second into the first without touching
the mutant's file.

**A helper named for a type is a promise about that type, and one caller was
wider.** `integerId` is #32's and it is about `integer`; the schema has three
`bigint` identity columns, and one of #107's thirteen sites guards one of them.
`nobound` kills nine of ten rows for that reason and not because the tenth is
weak — `2147483648` is a value that column holds perfectly well. Nothing turns
on it (the answer is 404 either way, and a sequence would have to pass two
billion rows before a real row could be addressed by a refused id) but the
docstring's *an id this schema could actually hold* is one route too broad, and
it is written down where the next reader will meet it. **Check what a shared
helper's name promises against every column it is pointed at.**

**And the counts went the way they always go.** The ticket named seven call
sites in four files; `fields.js`'s own docstring named four files; the code had
**fourteen hand-rolled guards in ten route files**, of which thirteen in nine
were the defect. That is three separate written-down diagnoses, all
undercounting, none of them lying — each was right on the day it was written.
`grep -c` took a minute.

**#102 is a new way for a ticket's diagnosis to be wrong, and it is the one
hardest to catch by reading: the ticket contradicts itself.** Its headline says
`reachablePrograms` could be deleted whole and *no test would fail*. Replacing
its filter with `TRUE` failed **seven** subtests on the tree the ticket was
written against, and eight once #102's own seed row was in. The ticket's own next paragraph
says why - *the `PROG_MANAGER` half **is** proven* - so the first sentence and
the third disagree, and both were written the same day by the same person.
Every earlier instance of a wrong diagnosis here was a claim that had **aged**
(#66's navigation, #111's twenty files, #55's six screens); this one was never
true. **Read a ticket to its end before believing its first sentence**, because
a headline is written to be arresting and the paragraph that qualifies it is
written to be correct.

**And what was actually unproved was narrower than either sentence.** Not the
programme filter but the **department branch** of `coveredScopes`: a grant on
department `05` expands to the programmes of `05`, and every programme was in
`05`, so *the curricula of my department* and *every curriculum there is* were
the same two rows. Naming the defect one function too wide is what made the
headline checkable and wrong. **Aim at the branch, not at the function** - the
same correction #119 made to *nothing runs either line*.

**The mutant had to be aimed the same way, and the first attempt was #97's
again.** `OR p.department_id = $1` → `OR TRUE` widens *every* branch, so every
programme grant reached everything and **27** subtests failed - a run that says
nothing about which assertion was holding what. Replacing `$1` with *is `$1` a
department at all* leaves a programme grant untouched and kills **7**. **A
mutant on a shared expression has to be narrowed to the branch it is about**,
and the tell is the same as always: a kill count that looks like the suite.

**The best thing it found is that the situation already existed, built by hand,
in one suite.** `students.test.js` inserted the missing curriculum with raw SQL
for its own use and asserted the other department's picker off it - and both of
the mutant's two original kills came from that one fixture. So this was never
*nobody can express this defect*; it was **one suite paid for it and no other
screen inherited it**. Moving the row into `db/seed.js` took the mutant from 2
kills to **7**, across five suites. **A fixture built inside one test file is a
fixture no other file has** - when a suite builds a situation with raw SQL, ask
whether the situation is about that test or about the dataset, because the
second kind is cheaper for everybody in the seed and invisible to everybody
outside it.

**And the seed and the assertions turned out to be one hole from two ends.**
With a curriculum finally outside department `05`, two picker tests were found
whose names claim exactness and whose assertions read inclusion - *a department
administrator reaches both curricula under their department* and *the curricula
offered are the ones the account holds*, each `assert.ok(list.includes(a))`
twice and nothing about what is absent. **Two `includes` cannot fail on a list
that is too wide.** They could not have been written any better before, because
no data could tell the two answers apart; the moment the data could, the
assertions were the thing standing in the way. Fixing data and tightening
assertions are the same job done at two ends, and doing only the first leaves
the defect exactly as invisible.

**Report the measured number, not the ticket's - and notice when one number is
two.** #102 says *one seed change hardens a dozen rows at once*. The mutant
kills **seven** subtests where it killed **two**, so the kill count is seven
and the hardening is **five**, and a single figure in a write-up hides
whichever of them the reader did not have in mind. The first pass here wrote
*it hardened seven*, which is the kill count wearing the hardening's sentence.
The habit that keeps being worth it is to write down what the sweep answered
rather than what the ticket predicted - #107 wrote predicted numbers into a
file before sweeping and had to replace them, which `96-outcome-order.py` had
already recorded as a mistake.

**And #96's third-property question was asked here and answered *no gap*,
which is the answer worth writing down because it looks like nothing.** Both
of #102's mutants vary which *programmes* a grant covers, so neither says
anything about the *department* branch beside them - the one the programmes
screen actually filters on, and the one #102's third acceptance criterion is
about. Widening it the same narrow way fails **31** subtests across six
suites: #97's mutant that stops the application working. So that branch is not
unproved, it is the most heavily proved line in `authorise.js`, and the right
record is *proved thirty-one times over, no mutant possible* rather than a
silence a later reader reads as an oversight. **Three answers, not two: a
clause is proved, or it cannot be reached, or nothing tests it** - and the
first two both look like an empty mutant table.

**#67 had already been answered in three of the ten places it applies, and stayed open
because the tenth is the one it was filed against.** Its sample row - `66010001`, the
first student of the seeded 66 cohort - was answered in #25's enrolment, #26's work
groups and #34's activity marks with `66019999`, *a code no cohort reaches*, the ticket
cited in all three comments, and `docs/acceptance/25-section-enrolment.md` row 6 is a
walked ☑ recording that as **#67's answer**. It is the right answer there and it cannot
be the answer here, and the difference is not the code. Those three imports **refuse** a
student they do not know, so their sample uploaded unchanged writes nothing; the students
import **creates** one, into a register whose route file holds GET, POST and the import
and no delete at all. **A convention is a claim about behaviour, not about a column** -
#107's *what greps the same is not the same guard*, one ticket later, in the shape of a
fix rather than a guard. A ticket answered where answering is easy is not a ticket closed.

**Its closing sentence is a new way for a ticket to be wrong, and it is #122's inverted.**
*`sendTemplate` is shared, so it is one change for every screen* - the helper is shared,
and the samples were ten literals in ten route files - nine after this diff - so the fix
is per-route and no mutant in this store can see the rest. #122's lesson was that a ticket which
generalises across screens has usually generalised the **symptom**; this one generalised
the **fix**, from a helper it had correctly observed to be shared. **Ask what is actually
shared: the code that runs, or the value handed to it.**

**Two greps decided the whole ticket and it had neither - and the first one has to be
read rather than counted.** `ON CONFLICT` across `backend/routes` matches three imports,
not one: students, weights and activity marks all upsert. What separates them is what the
key *is* - **students is the only one whose key is a person on a register**, and the other
two overwrite a weighting category and a mark on screens whose imports refuse a student
they have not met. That is why its sample rewrote somebody where the other templates'
samples either created a new row or were refused. The first write-up of this ticket said
*the only import that overwrites a key it meets* in three files and `/code-review` caught
all three: **a grep is the start of the sentence, not the sentence.** `router.delete`
across the same files is the plainer one and says **students and users are the two
registers with no way to remove a row**. Between them they sort ten
templates into four behaviours and choose the fix. The survey behind them was ten HTTP
round trips in a throwaway suite, run once and deleted the same hour. **When a ticket asks
what the convention should be, measure what each site does with a convention before
picking one.**

**The defect was invisible to a count, and a test had already written that down as a
feature.** `students.test.js` posted the template back and asserted the register was the
same size afterwards, under a comment reading *the example row names a student the seed
already holds, so accepting it adds nobody - which is the sixth criterion arriving from an
angle nobody arranged*. The suite had **seen the collision, understood it, and recorded it
as a bonus**: the row was not added, it was written over, and no assertion about the size
of a table can tell those two apart. **A test that passes because of a defect tends to
explain itself in its own comment** - read the comments on the tests around a defect
before concluding the defect is untested, because the one describing your bug is the one
to rewrite.

**And a row written to fail on the day of the fix did exactly that, which is #96's rule
confirmed a second time.** `17b` row 12 asserted `GET /api/students/66010001` answers
**200** - pinning the collision on purpose, so that the day the sample stopped naming a
real student the row would fail and point at the ticket. It failed on schedule, the note
said where to go, and the rewrite took minutes. **Write the rewrite instruction on the row
the day you notice it**, and expect to be the person who reads it.

**A `mode: 'serial'` spec under-reports its own kill count.** `samplenamesastudent` kills
rows 12 and 23 of `17b`; a whole-file run stops at row 12 and reports one failure. The two
were measured with `--grep`, one at a time. **A serial run reports the first row that
dies and skips every row after it**, so its figure is a lower bound on the kills rather
than the kills - a fact about the runner and not about the mutant. Measure each row on
its own.

**#101 is the fourth kind of wrong diagnosis, after aged (#66, #111, #55), never true
(#102) and generalised (#122): the ticket describes a mechanism that does not exist.**
Its *Why it looks that way* says `0501` has fifty outcomes, *a page holds ten*, and five
pages of `0501` come before the first row of `0503`. **This screen has no pager** -
`grep -c Pager frontend/src/pages/Plos.js` is 0, and the file's own docstring says the
absence is deliberate, because a ข้อย่อย on page two whose ข้อหลัก is on page one is not a
tree. So the defect was **worse** than the ticket's account, not milder: 56 rows in one
scroll with no *หน้า 1 จาก 6* to say anything followed, the second curriculum starting at row
53, and every one of its four codes already used above it by the first. A ticket
explaining *why the defect looks that way* has proposed a cause, and a cause is the
easiest half to check: **run the explanation, not only the symptom.**

**And the ticket predicted its own uncertainty correctly, in a sentence worth reading as
an instruction rather than as a preference.** *"Prefer required unless a caller turns
up."* One had - `Plos.js:80` fetched every outcome in reach to fill the form's ข้อหลัก
picker, because the table shows one curriculum and the form need not be on it. That is
why the screen and the form changed in this ticket rather than after it: the route was
made required *and* its last unfiltered caller was given the request it actually wanted.
**A ticket that says *unless X* has told you what to go and look for**, and the answer
decides how big the diff is.

**Which screens may mix curricula turned out to be a schema question, not a taste
question.** The ticket names four siblings offering the same ทุกหลักสูตร and asks that each
be read once rather than assumed. Read: all four still offer it, all four **page**, and
this screen and `PloMapping` are the only two that do not. The line underneath is
`UNIQUE (program_id, outcome_code)` - **PLO codes are the only row identifier among the
five that is unique per curriculum rather than institution-wide** (`rubric_code` is
`UNIQUE` outright, and its migration says why). A mixed list of rubrics is long; a mixed
list of outcomes contains two rows called `PLO-2` beside a ลบ button. **When asking
whether two things may be shown together, look at what makes a row nameable.**

**A fix's own diff moved two mutant anchors, which is #123's finding arriving inside the
ticket that caused it rather than a fortnight later.** `codeorder` was anchored to
`ORDER BY lo.program_id ASC, lo.path ASC` and `nofilter` to the `($2::text IS NULL OR ...)`
that made the parameter optional; both were gone by the time the tests were green, and
`mutation/anchors.py` said so immediately. **Run the anchor check as part of finishing a
ticket, not only when inheriting one** - the cheapest moment to re-aim a mutant is while
you still remember what the line was for.

**#101 re-learned #97's *kills too much* twice in one sweep, and the second time the
cause was a bound parameter.** Re-aiming `nofilter` to `AND true` deleted the only
mention of `$2` while the array bound to the statement still had two entries, so every
list answered 500 and row 1 died on `openPlos` before any assertion about curricula ran.
`AND (lo.program_id = $2 OR true)` is the same defect with the statement still valid.
**A mutant that removes a condition has to leave the parameters it referenced referenced**,
or it is testing the query builder rather than the claim.

**The other kills-too-much was avoided by choosing the wrong answer over no answer.** The
claim was *the screen lands on the first curriculum in reach*. Removing the default leaves
`program` empty, `load` never fires, and all sixteen rows that begin with `openPlos` wait
on a list nothing asks for. Choosing the **last** instead leaves the screen working
perfectly on the wrong curriculum, and exactly one row can fail on that. **When a mutant
for *does it choose the right thing* stops the application, mutate to a different choice
rather than to no choice.**

**#85's locator trap was walked up to twice in one file and the second approach was the
subtle one.** The list's curriculum filter had always been found by `option[value=""]` -
the ทุกหลักสูตร entry this ticket deletes - and the obvious replacement was to find it by
*not* having a blank option, which would have made the mutant that restores ทุกหลักสูตร
kill the row by hiding the control rather than by failing the assertion. Both selects are
now found by *offering a curriculum code*, and what tells them apart is that the form
replaces the table rather than sitting beside it. The second approach was worse: written
as `option[value="0501"]`, the row asserting a `0503` committee member gets **no** filter
passed under `alwaysadropdown`, because the dropdown it should have found held `0503`
alone. **A locator built on one seeded value is a locator that can answer *not there*
about a thing that is** - and it took the sweep, not the reading, to show it.

**A helper that hangs is a helper that has quietly become an assertion.** `filterTo`
waited for a reload after `selectOption`, which is fine while every value is a change -
and the screen used to open on ทุกหลักสูตร, so every curriculum was. Landing on a real
curriculum made asking for that curriculum a no-op, no `change` fires, and three rows
timed out at sixty seconds each under a mutant that had nothing to do with them. Reading
the value once and returning early makes it mean *make sure the list is showing this*,
which is what every caller wanted. **Ask what a helper promises, not what it does**: the
rows that used it were about curricula, not about pressing a control, and the difference
only became visible when a mutant moved what the control started on.

**And a criterion that a screen keeps can usually be moved into the route, where it
cannot be forgotten.** #101's fourth criterion is *no request from this screen can ask
for outcomes of more than one curriculum*. As a frontend promise that is one edit from
being untrue; as `REFUSALS.ploProgramRequired` it is a shape that does not exist. The
frontend gate stayed as well, and is honestly recorded as **unprovable by mutation** -
remove it and every row's `openPlos` fails, which is #85's premise shape - with the claim
it guards proved at the HTTP seam by a subtest instead. **Three answers, not two, again:
proved here, proved elsewhere, or not proved** - and *proved elsewhere* is worth writing
on the row that cannot prove it.

**#101's review found the criterion escaping through the one request it is named after, and
the cause was a helper answering a different question.** `blankToNull` is #32's and it is
about an empty box - `''` and `undefined` both mean *not given* - so it passes anything
that is not a string straight through. A query string may name a key twice, and Express
hands that pair over as an array, so `?program_id=0501&program_id=0503` - literally the
request the fourth criterion forbids - was neither empty nor absent, walked past the
refusal, bound an array to `$2` and answered **200 with an empty list**. A throwaway suite
measured it in a minute and was deleted the same hour. #107's rule was *a helper named for
a type is a promise about that type*; this is its query-string half. **A guard written with
a form-field helper has been told about values and not about shapes** - when the criterion
is about the question rather than the answer, the type is part of the guard.

**And a criterion folded into a neighbouring row is a criterion with no row, which the
store's two mutant checks cannot see.** #101's third criterion - a caller reaching one
curriculum is told which, not asked - was written into #19's existing *one curriculum
needs no picker* row as a second sentence, while the mutation table underneath said
`alwaysadropdown` kills **two** rows. So the *kills* column named a row the criteria table
did not hold: #97's `10:nowrite` inverted, and invisible to both of the passes that exist,
because neither a ⚙ without a mutant nor a mutant without a table row is what it looks
like. **Read the kills column as a claim about the criteria table too** - and when a
ticket's criterion lands on a screen another ticket already covers, give it its own row
rather than a clause on somebody else's.

**A mutant anchored to a comment is anchored to the most movable line on the screen.** The
mutant restoring ทุกหลักสูตร was aimed at the JSX comment explaining why the option is
gone - a line carrying Thai, which is the first thing a reword or a formatter touches, and
#123's whole subject. Re-aimed at `{programs.map(entry => (` it kills the same one row.
**Anchor a mutant to the code it breaks, never to the prose beside it**; the prose is
written to be rewritten.

**#124 is the fifth of the new frontier, and the first ticket here whose fix made a sentence
on somebody else's sheet false.** When #67 stripped the students template of its Thai sample,
`17-students.md` recorded the loss honestly and then handed the claim on: the half of #62's
byte-order mark that *shows* Thai surviving a download, rather than merely that the bytes are
there, had moved to #11's template, **which still has a Thai example row**. That was true the
day it was written. #124 removed that row two days later for a reason that has nothing to do
with Thai, and nothing anywhere linked the two — no test, no mutant, no anchor check. A grep
for `users-template` across `docs/` and `mutation/` found it in a minute and found it in
exactly one place. **A sheet that hands a claim to another sheet has written a pointer, and a
pointer is a thing a later ticket can delete without noticing** — after a fix that removes
content, grep for the file the removed thing lived in, not only for the numbers quoted about
it. What holds the claim today was then measured rather than assumed: **five** templates still
carry Thai in their sample row, two of them under walked rows (`14-departments.md` row 5 and
`15-programs.md` row 7). That is a reading taken on 9 September 2569 and not a property
anything tests, so it is written with its date, like every survey here. **The first count
said five and was wrong**, and the way it was wrong is the store's own lesson arriving inside the
sentence that states it: the grep was shaped like `sendTemplate(res, …, { … })`, and
`backend/routes/activityScores.js:470` builds its example into a variable first, so a sixth
template carrying `full_name_th: 'ตัวอย่าง นักศึกษา'` was invisible to it. **A grep is evidence for
the shape you typed** — #111's rule, met again by the paragraph two screens above that records it.

**And the answer the owner chose carried a second half the ticket had not priced.** #124's
three options were three options for the *route*, and the one taken - header alone, as #67
did for students - is a single argument deleted. The work was somewhere else:
`ImportPanel` drew no column guidance at all, just a heading, a subtitle and two buttons, so
with the sample gone the CSV would have been the only teacher and it would have been empty.
**Before removing something, ask what it was teaching** - and the answer was not the column
names, which the header still carries all fifteen of, but the rules a header cannot state.
Two of the seven are the reason it could never have done that job: the name is an either/or
across two columns, and the password is required for two role codes and useless for every
other. *Refused* is what the first draft of this said in four places and it is wrong: nothing on
the import path refuses a password, `users.js:195` hashes whatever it is given, and
`accounts.js:275` refuses it at **sign-in**. A guard that lives at another seam is not a guard
this screen's guidance may describe. `backend/routes/users.js` had already written that down in #56's own words - *a header
cannot say "one of these two"* - and reading it is what turned a deletion into a fix.

**Writing that guidance off the code, one sentence at a time, is what found #125.** The
seven notes were each read out of `readAccount` rather than remembered, and the third could
not be written at all without deciding which era a year is in. `2569-09-30` is a well-formed
ISO date, is accepted, and files the validity window in the year 2569 **of the common era** -
five centuries out, on an account that is created `active`, cannot sign in
(`validityRefusal` in `backend/auth/accounts.js` refuses a window that has not opened -
it was `withinValidity` until #89 split the reason in two) and, this
file having no delete route, cannot be removed either. **A guard that is strict about a format cannot see a mistake about meaning**:
`readDate` refuses `01/03/2026` on purpose, with a docstring explaining that Bangkok and
Boston read it differently, and accepts a Buddhist year in silence - the difference being
that only one of the two mistakes is about the shape of the string. Until #125 is decided the
word `ค.ศ.` on the screen is the whole of the defence, which is why a mutant exists that
changes it to `พ.ศ.`: **a sentence that is load-bearing has to be provably about what it
says, not merely present.**

**#124's proofreading pass wrote a near-miss inside its own diff up as a defect in the store,
and the ticket's own spec review caught it before it was committed.** The paragraph here first
said that `11-user-accounts.md`'s download row cited `11b` row 5 as reading the byte-order mark
while the row did `template.text.replace(BOM, '')` and stripped it unread — a **sheet claiming
more than the row looked at**, the inverse of the mistake this store has made ten times, and a
third thing neither existing pass can see. It reads well and none of it was true at `HEAD`. That
sheet row cited **no spec at all**: it was a hand-walked ☑ reading *เปิดใน Excel แล้วภาษาไทยไม่เป็น
ตัวยึกยือ*, and `11b` had no row about the download — its five rows each took
`headerOf(downloadTemplate(page))` and looked at nothing else. The `replace(BOM, '')` quoted as
the store's oversight was written **in this diff**, in a row added the same hour, and noticed
minutes later. **A near-miss caught inside your own change is not a finding about the store**,
and the tense is the tell: a defect *nobody had noticed* has a date and a commit behind it, and
this one could not have. What was genuinely stale there is smaller and is #67's pointer lesson
again — the walked claim was about **Thai** surviving Excel, and this diff is what emptied the
Thai out of that file. Every other paragraph on this page was written about somebody else's
work; this is the first one written about work done an hour earlier, and that is the condition
to be suspicious in.

**The assertion it added is still worth having, and the reason is the convention rather than a
defect.** `17b` and `18b` assert the mark for their own templates and `11b` did not, which is
#111's one unfiltered `getByRole` shape: a store where one file is the outlier. A row that
downloads a file the sheet describes as carrying a BOM may as well look at it.

**Then the assertion was asked what it is at risk from, and the answer was in the other
seam.** Deleting the BOM at `backend/lib/csv.js:140` — the line all ten templates get theirs
from — leaves **all eighteen rows** of `11b`, `17b` and `18b` green. `saveAsFile`'s docstring
has said why since #62: `response.text()` strips a BOM per the Fetch specification, so the
client puts a fresh one on the blob, and **the byte the browser seam can see is always the
client's and never the server's**. So the two BOMs are not #97's *two places holding one
opinion* — there is a stripping step between them and both are load-bearing — but each is
provable at exactly one seam: the server's by one subtest (`users.test.js`'s *is a
spreadsheet file, asserted without this system's own reader* — cited by line number until #125
inserted eight subtests above it and moved it 173 lines, which is #123's lesson in a citation
rather than in a mutant, and `students.test.js` strips its own without asserting), the client's
by `18:nobom`, which turns
out to kill **three** rows and not the one its sheet named. **Before trusting a new assertion,
break the thing it is about — and when nothing fails, the claim has an owner you have not
found yet.**

**And breaking that thing is what exposed [#126](https://github.com/khthana/Deep-QA/issues/126),
which is the most dangerous tool defect the store has had.** `mutation/harness.py`'s `apply`
restores every file in the script's `FILES` first, so mutants cannot stack — from
`mutation/.backup/`, **one shared store keyed by path**, with no check that the backup is a
copy of the tree. Running `python mutation/18-program-subjects.py nobom` without `save` first
reverted `backend/lib/importer.js` to before #67 and `frontend/src/pages/ProgramSubjects.js`
to **21 August**, restoring the hand-rolled banner #55 deleted — two files with nothing to do
with the mutant, in silence, on a tree that had been clean. **`mutation/README.md` says to
`save` first, twice, and records that #33 lost two rounds to it**, so the ticket is not that
nobody knew; it is that the tool enforces none of it, which is #50's *explaining a gap in prose
is not the same as marking it* one level up — prose beside a tool rather than beside a mark.
What the README does get wrong is the reason it gives for the neighbouring rule: *every sheet
has its own backup* — it does not, `_backup()` keys one shared directory by path, so two
scripts naming one file share one entry. That matters because the reason is what a reader uses
to decide whether their case is covered, and read as written it says the danger is confined to
sweeping two sheets at once. **It needs no race and no second sweep: a stale entry of any age
is enough, and the file it reverts need not be one the mutant touches.** Run `save` before
every mutant, and read `git status` after `apply` as well as after `restore` — the harness's own
docstring only ever asked for the second.

**Fixing it turned the prose into a question the tool asks, and the question is narrower than
*did you run `save`*.** A guard that refuses whenever the tree differs from the backup would
break the one case the restore-first exists for — `apply` over a mutant `apply` put there an
hour ago. So the harness now records what it wrote (`mutation/.backup/applied.json`, keyed by
path like the backups, because two sheets naming one file are talking about one file) and
refuses only when what is on disk is **neither the saved copy nor a mutant of its own**. That is
the whole difference between a guard people keep and a guard people `--force` past on the second
day. `mutation/harness_test.py` is seventeen tests about it — the store's first Python tests,
stdlib `unittest`, pointed at a temporary tree — and the ones that matter most say **nothing was
written on the path that refused**: a tool that reports a refusal after doing the damage is the
defect with a message on top.

**Five of those seventeen exist because `/code-review` found the fix had introduced the defect it
was closing.** `apply` writes its edits in a loop and recorded them all at the end, so a two-edit
mutant whose *second* edit missed left the first on disk unrecorded — and the restore that MISS
does then met a file it could not explain, refused, and returned #126's stale-backup message
about a mutant that had merely moved, **with the file left mutated**. Twenty-five mutants across
four sheets are written as lists. The other four were the same species one step out: a record
that parses to `[]` instead of `{}` crashed the function whose whole job is to carry on without
one; a file missing from the tree became a traceback where `restore` used to simply write it out
again; and `save` over an applied mutant still baked the mutant into the backup — **the guard
protects the tree from the backup, and nothing protected the backup from the tree**, which is how
a wrong backup gets made in the first place and is #33's round again. **A guard that reads the
world before it writes has to survive every state the world is actually in**, and the states to
try are the empty one, the wrong-shaped one, the absent one, and the one your own tool just made.

**And the fix nearly broke the number it exists to protect, in the shape #123 is about.**
`anchors.py` and three snippets in `mutation/README.md` selected mutation sheets by naming the
two files that are *not* sheets. `harness_test.py` is the third, and it carries a `MUTANTS`
fixture, so the store's headline count went to **497** the moment the test file landed —
three mutants nobody wrote, in the census this repository quotes to say its mutants are worth
something. A list of exceptions is a list somebody has to remember to extend; a sheet is named
for its ticket, so the rule is now `^\d+-`. **When a tool skips things by name, adding a file is
enough to make it lie** — and the tell was cheap: run the count before and after, which is what
the README already tells everybody else to do.

**#125 is the sixth of the new frontier, and the ticket was right about everything except where
the work was.** `readDate` accepts `2569-09-30`, which is a well-formed ISO date, and files an
assessor's window in the year 2569 of the common era — on an account created `active` that
cannot sign in and, `users.js` having no delete route, cannot be removed. The owner chose the
second of three answers on 9 September 2569: **refuse, and do the arithmetic in the sentence.**
The guard is four lines. What cost the afternoon is that **a refusal naming a value is a
different kind of thing from a refusal naming a reason**, and the sites that read the two are
not the same sites. `REFUSALS` has held function-valued entries since #26 — **twenty of them
on the morning of 9 September 2569, twenty-two by the evening** — but they had only ever been
read by the import, whose report calls `sentenceOf`. The two
route sites did `REFUSALS[draft.reason]`, which hands `res.json` **a function**: `JSON.stringify`
drops it, and the person is refused with **no message at all**. So `sentenceOf` moved from
`lib/importer.js` into `auth/refusals.js`, where the rule about how to read a refusal belongs
beside the refusals. **Before adding a parameterised refusal, find every site that turns that
reason into a sentence** — the grep is `REFUSALS[`, and it is not the grep the ticket suggests.

**And one of those sites had no test, which is why it got a row of its own.** Both route sites
read a `readAccount` refusal; only the create route had ever been asked about a bad window,
while the edit route is where an assessor's round is actually **extended** — the thing that
happens to a validity window in real life. `editsentenceisakey` kills exactly one subtest, and
that subtest was written the same hour, because without it the mutant kills nothing and the
site is proved by the other one's tests looking similar. **When one change lands at two sites,
write a mutant per site before believing one test covers both.**

**A row asserting a status code was the round's own near-miss, and it is #50's retrying negative
in a new costume.** The bounds row asserted `400` for 1899 and 2201 — and an external assessor
created without a password is a `400` already, from a guard forty lines further down. It passed
on the tree it was written to fail on, and only reading *which* rows went red on the red run
showed it. **A status code is not an assertion about your guard on a route that has more than
one way to answer it**; read the sentence.

**Two sentences, because one sentence with a hole in it is worse than two.** `validityEra` does
the arithmetic; `validityYearRange` names the range, and a year earns the first only when its
Buddhist reading lands inside the range — offering `957` to somebody who typed `1500` is worse
than offering nothing. The merge of the two is a real temptation (less code, friendlier tone),
so `alwaysoffersconversion` exists to fail it.

**The bounds mutant mutates the comparison and not the constant.** `1900` and `2200` are
arbitrary; a mutant that moves one of them tests an arbitrary number, and two of them (one per
end) kill the same row. `<`/`>` → `<=`/`>=` is the boundary off-by-one — a defect shape rather
than a value — and it kills that row once. **When a constant is arbitrary, mutate the operator
beside it.**

**Its adjacent finding is #107's rule for the third time, and this time the two guards share a
name.** `backend/routes/activities.js` holds a second `readDate` — same name, same shape of
regexp — with a different contract (a full timestamp is accepted, no
calendar check, so `2026-02-31` gets through) and the same era hole. Measured, not read:
`201`, stored as `2569-09-30`. It is [#127](https://github.com/khthana/Deep-QA/issues/127) and
not the second half of #125, because what the date decides is different — whether a person may
sign in, against what a screen shows a Teacher — and because that route has a `PUT` and a
`DELETE`, so the mistake is one somebody can see and correct. **The same hole in two guards is
two tickets when the blast radius differs by an order of magnitude.**

**And the collision census moved without its total moving, which no earlier round did.**
`mutation/125-validity-era.py` holds `backend/routes/users.js` and nothing else, so that path
went from a group of three sheets to a group of four while the number of contested paths stayed
**31**. The README's parenthesis had to change from *17 · 9 · 3 · 2* to *17 · 8 · 4 · 2*.
**A total that does not move is not a census that did not change** — the figure that decides
whether two sheets may be swept together is the group, not the count.

**#89 is the seventh of the new frontier, and it is the first ticket here whose defect was in the
acceptance sheet rather than in the code.** Two accounts an external assessor can hold — one whose
review round has not opened, one whose round has closed — were refused with the same sentence to the
letter. The ticket was filed as a decision rather than a defect, and the reason it gives is
checkable: `docs/acceptance/11-user-accounts.md`'s *ยังไม่ถึงวันเริ่ม ก็เข้าไม่ได้* row says in its
own handwriting *ข้อความเดียวกับแถวบน*. The system was doing exactly what it had been told, so the
sheet was fixed first and the code followed. Every earlier wrong diagnosis here was a claim about
the code that had aged, or was never true, or generalised; this one was a claim about the code that
**the sheet had authored**. **Before fixing a behaviour a sheet describes, check whether the sheet
asked for it** — and when it did, the walk record is not the thing to rewrite: it is a dated
observation, and a successful fix is what expires one.

**What the axis is turned out to matter more than that there are two sentences.** They are told
apart by **what the person has to do next** — one end is waited out, the other never changes by
waiting and has to be asked about — which is why the pair is *รอ แล้วเข้าใหม่* against *ติดต่อ
เจ้าหน้าที่เพื่อขอต่ออายุ* rather than two ways of saying *outside the window*. An external assessor
is outside the institution, cannot guess, and does not know whom to ask, so one sentence covering
both states tells them neither. The objection — that saying more before a successful sign-in leaks
something — does not survive reading the sentence it replaces: that one already confirms the account
exists **and that the password was right**.

**And the ticket's own suggestion was answered *no* with a measurement rather than an argument.** It
asks that the *not yet started* sentence consider naming the start date, *because that is the day
the person is waiting for*, which sounds right. Both keys sit in
`GOOGLE_REFUSAL_REASONS` (as `outsideValidity` did before them), which travels as
`/login?error=<reason>` **with no body**, and
`frontend/src/pages/Login.js` holds its own copy of these words keyed by the reason alone — and
`refuse()` itself is `message: REFUSALS[reason]`, the same `REFUSALS[` lookup #125 had fixed at two
route sites hours earlier. So a sentence naming a value cannot cross that door at all, and the only
remaining option is to let the door with a body say more than the door without one: **one state of
one account answering differently depending on which way in was used**, which is #66's *a row that
names two ways in is two rows* in the shape of a refusal. Naming the date is [#128](https://github.com/khthana/Deep-QA/issues/128), because
the redirect would have to carry it as a second parameter — account data in a URL, which is
a question for the owner rather than work. **A deferral written into prose and not into the
tracker is a decision nobody can find**; `/code-review` caught this one having no number. **When a ticket
asks you to *consider* something, the answer is a measurement, and *no, and here is what it would
cost* is a finished answer.**

**The test that caught the extraction is worth knowing about before writing one like it.**
`auth.test.js`'s *the list of reasons is the list the rules can actually produce* reads the **source
text** of the functions the Google path is made of, matching `refuse(<status>, '<reason>')`, so the
list cannot fall behind the rules by being hand-kept. Moving the window's decision into a helper
immediately above `admit` took two reasons out of the text it reads and it went red on the spot —
the system working, not a test in the way. **A scan that reads a function's own text stops at that
function's boundary**, and a helper is exactly what it cannot see. Two ways out, and only one is
right: naming the reasons at each call site puts four literals in two functions and makes the
decision two places (#97's paragraph), while returning the **whole refusal** keeps the decision in
one function and every reason a literal in the form the scan already matches. Widening the regexp
would have been the hand-kept list this test exists to abolish, wearing a different hat.

**The sweep found a defect in the tests, and it is #97's rule at the scale of one fixture.**
`endsareswapped` killed six subtests and one of them was not a kill: two subtests share `U_EXT`, and
each put back the column it had moved on the line **after** its last assertion. The moment the first
one failed, the second met an account whose window was still in the past and failed about something
it does not assert. Nothing had ever shown it, because nothing had ever made the first one fail.
`finally` is the whole fix, and the number written into the sheet was measured after it. **A subtest
that restores its fixture only when it passes is a subtest that inflates the next mutant's kill
count** — and a mutant is the only thing that will ever tell you.

**One mutant here confirms a paragraph another sheet wrote about itself, as a number.**
`listmissesthenewend` deletes the new key from `GOOGLE_REFUSAL_REASONS` and kills **exactly one**
subtest and nothing at all in `50a` — which is what `mutation/50-sign-in-screens.py` has said in
prose since #50: row 1 *iterates* the list, so deleting a key shortens the loop and fails nothing.
**A gap explained in prose is worth re-measuring the day a ticket widens the thing it is about**;
the paragraph was right, and now it has a figure behind it.

**#48 is the eighth of the new frontier, and it is a fifth kind of wrong diagnosis: the question the
ticket asks had already been answered, in the opposite direction, in the file it is about.** Its
*What to build* says *"Nothing in the schema can express it"* and *"The window belongs on
`user_roles`, not on `users`."* `db/migrations/0005_external_assessor_validity.sql` put the window on
`users` under #11 — and its own comments argue against #48's proposal **by name**: R005 and ROLE-6
describe the *account*, not the grant, and a column on `user_roles` would have #11 and #12 writing
the same row for different reasons. The earlier species were claims about code that had **aged**
(#66, #111, #55), were **never true** (#102), **generalised** (#122), or described a **mechanism
that does not exist** (#101). This one was decided, deliberately, with the reasoning written down
where anybody opening the migration would meet it. **Before building a ticket's proposal, read the
file it proposes to change — the argument against it may already be in there**, and a ticket cannot
know what was decided after it was filed.

**What was actually left was a fixture, and the ticket had asked for it — in a place that has since
stopped being available.** Four of the eight criteria were met by #11 and #89 already; criterion 7
asks that the seed give the assessors windows and names `U_NONKMITL` as the closed one, which was
right on 17 August and is wrong now: `authorise.test.js` and `shell.test.js` have each since given
that account a second job that only works if it can sign in. **Following a criterion to the letter
would have failed two suites**, so the closed window is a twelfth account, `U_EXT_CLOSED`, rather
than a change to somebody else's row. A criterion names a fixture by the name it had that day.

**And the role a feature exists for was the one role not exercising it.** Before this ticket the
seed left both ends `NULL` on **both** assessors, so the seven suites holding `U_EXT` were all
walking the *no window at all* path — the same path an ordinary staff account takes — while R005
says the account is created "พร้อมกำหนดช่วงเวลาการใช้งาน" and ROLE-6 calls it *temporary*. #102's
lesson was that a situation built by hand inside one suite is a situation no other suite has; this
is stronger, because **no suite had built it at all** — only rows that moved a column and moved it
back. When a seeded dataset has a role, check that it has the role's distinguishing *property*.

**The prediction was that the fixture would harden #89's mutants, and it did not — which is the
result worth writing down.** `endsareswapped` kills five subtests before and after, because it is a
mutant about *which sentence belongs to which end*, and seven suites that merely need `U_EXT` to get
in assert no sentence at all. **A fixture hardens the claims that had nothing holding them, not
everything near it**, so the two mutants #48 owns had to be written rather than borrowed:
`insidewindowisrefused` kills **21** subtests across eight suites where it killed **6** across two,
and `sessionignoresthewindow` kills **1** both before and after. Writing the number that did not
move down beside the one that did is what makes the second believable — and *21 killed, 15 hardened*
is #102's two-numbers rule again, one figure hiding whichever the reader did not have in mind.

**That 21 was first written as 17, and the reason is a hole in this store's own counting rule.**
`node --test` counts parent suites in `# fail`, so the rule here has been to read leaf kills from the
**indented** `not ok` lines instead. A test written at the top level of a file has no parent suite,
so its `not ok` is not indented and reads exactly like a suite header — and four of this mutant's
kills are that shape, in `evidence`, `offerings`, `program-results` and
`program-results-students`, four of the six suites the same write-up had already listed as signing
in with `U_EXT`. The arithmetic that works is *28 failures = 7 parent suites + 17 indented leaves +
4 top-level leaves*, and the way to get it is to run the whole suite and **read the names**, never
to run only the files you expect to be involved — the files you do not expect are exactly where the
missing kills were. **A rule written to correct a wrong number is itself a claim to check.**

**Its own count went wrong twice, both times by not measuring, and both were caught by the rule
the ticket was quoting at the time.** A twelfth account made five hand-kept *eleven*s false; the
first pass fixed five and believed itself done, and re-running the same grep afterwards found a
**sixth** in another `README.md` paragraph — #96's *correcting a number in the places you remember
writing it is not correcting it*, happening inside the diff that cites it. Four of the six were
reworded to carry **no number at all**, because none of them was about how many accounts there are;
only the table, which *is* the list, still counts. The second was *ten suites sign in as `U_EXT`*,
written into a mutation file whose own docstring says its figures are measured before they are
written. It is seven, six of them through the form. **A number inside a paragraph explaining that
numbers must be measured still has to be measured.**

**#87 is the ninth of the new frontier, and it is the first ticket here whose defect was in the
*subject* of a set of tests rather than in what they assert.** The seed's external assessor was
`external.assessor@kmitl.ac.th`, and ผู้ประเมินภายนอก is by definition not of the institution — the
whole reason it is the one role forced to set a password is that Google refuses anything outside
`@kmitl.ac.th`. Two subtests drove `resolveGoogleAccount` with that account and asserted
`validityEnded` and `validityNotStarted`. Move the address out of the institution and they answer
`domain`, because the domain gate fires three lines before the window is read: **an external
assessor can never reach their own validity window through Google.** The rules were right and
every assertion was right; the *person* was one who cannot exist, and that is what let two rows
claim to prove a refusal they could only reach by way of the contradiction.
**Ask what a fixture is, not only whether the code admits it** — a fixture that contradicts the
role it stands for turns every row that uses it into a row about something else.

**Its second finding is a shape of question, and it is cheap to run anywhere.** The new assertion
was written of the **grant** — *no account holding `EXT_ASSESSOR` is at an address the institution
owns* — rather than of the row, *`ext01` is at this address*, which would have been a copy of
`db/seed.js` in a second place and would pass the day the next assessor moves back in. Asking it
of the grant immediately showed the seed has **three** `EXT_ASSESSOR` accounts where every
write-up says two, and that `U_NONKMITL` carries no validity window at all — which #48's criterion
7, written as *the accounts with a window are exactly these two*, cannot see. That is left to #48.
**A question asked of a row cannot find a row nobody told you about; ask it of the rule.**

**And its census lesson is about the tool rather than the code.** `FILES` in a mutation sheet is
the list of files that sheet **overwrites**, not the list its ticket edited: #48 was a fixture
ticket that changed `db/seed.js` and anchored both its mutants in `accounts.js`, so the seed was
not a contested path until #87 made it one. **Ask the census script, not your memory of who
touched what.**

**#83 is the tenth, and it is the plainest demonstration yet that a passing test can be the reason
a defect survives.** Pressing *ระงับ* on your own row is refused correctly and answers *บัญชีนี้ไม่มี
สิทธิ์ใช้งานส่วนนี้* — `forbidden`, the sentence for *your role does not reach this endpoint* — to a
Central Admin whose role reaches it perfectly and who is standing on the screen it opens. The row
that should have caught it has existed since #11 and reads `403` and an unchanged database row and
**never looks at the sentence**; the route answers `403` two ways. That is #125's rule from the day
before, in another file and another guard: **a status code is not an assertion about your guard on
a route with more than one way to answer it.** The mutant that *is* the defect leaves that row
green and kills only the row added with the fix — **a row that passes both before and after a fix
was never about it.**

**The ticket named one site and there are two, and the second one's own comment says why.**
`backend/routes/grants.js` refuses revoking your own grant with the same constant, under a comment
reading *it is the rule #11 applies to deactivating yourself and it is here for the same reason* —
so the rule was borrowed whole, **and a rule borrowed whole borrows its defect too.** Twenty lines
below that guard the same handler answers `roleNotHeld` for a grant that is not held, so naming
what went wrong is already what the route does; the self case was the one that would not. What
decided the fix was in `refusals.js` all along: it documents a group that *may* name what went
wrong, because those refusals are about *a choice the caller made … their own acting role, their
own password, or a grant they just asked to undo and could already see*. **Read the file's own
comments for the rule before inventing one.**

**Its own grep was wrong in the store's favourite way three times running, one paragraph after
quoting the rule.** `grep 'ตัวเอง' e2e/tests/*.js` returned nothing and the mutation sheet was
written saying no browser row drives the self case. **The specs are in English; the sheets are what
is written in Thai.** The second pass found two — `12a` row 6 presses the button on its own grant
and asserts the sentence, `111a` row 3 asserts that same sentence is announced — and `/code-review`
found the third, `121a`, whose own comment calls it *"12a row 6's driver"*. **The grep that answers
this question is `REFUSALS.forbidden` across `e2e/tests/`: the constant, not the concept.** The
first two searched for what the author *meant*; the third searched for what the code *says*. **A
grep is evidence for the pattern you typed** — the language a file is written in is part of that
pattern, and so is whether you searched for the idea or for the identifier.

**And no mutant sweep could have found that third row, which is a way of reading a sweep this store
had not written down.** Under `revokeisjustforbidden` the sentence is `forbidden` again, so `121a`
— a row the **fix** breaks — comes back **green** in exactly the run that puts the defect back. A
sweep answers *what was holding this claim up*; it cannot answer *what did my change break*. Those
are two runs, and the second one is the clean suite, which is the one people run last. The measured
kill count is three rows, taken after the fix, under the mutant and then clean.

The newest file in `docs/handoff/` says where the rebuild stands, what is half-done and what
will cost time — as of 9 September 2569 that is
`2026-09-09-nothing-protected-the-backup-from-the-tree.md`. Read it before taking work. Each handoff names the one it supersedes for state,
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
