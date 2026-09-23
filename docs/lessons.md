# Lessons

What the rebuild has learned, ticket by ticket, with the numbers that taught it.
`CLAUDE.md` keeps one line per rule and names the ticket; the story is here.

**Moved out of `CLAUDE.md` word for word on 11 September 2569**, when that file had
grown to 115 KB — every ticket from #50 on appended its lessons there, and all of it
was loaded into every session. Only the `##` headings below are new. Two things
follow from that:

- Sentences about the state of the store — what is closed, how many ◐ rows there
  are, which handoff is newest — are as of the day each was written, and *this
  file*, *that list* and *this paragraph* mean `CLAUDE.md` as it stood then. Take
  current state from the tracker, the sheets and the newest handoff.
- *The new frontier* means the open issues above #45, and *the store* means the
  repository's tests, sheets and mutants taken together.

New lessons go at the end, under the ticket's number. A rule met again belongs in
that ticket's story here, not as a second line in `CLAUDE.md`.

## #50 and #66 — the first of the new frontier

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

## What the hand-walks found — #35 to #45

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

## The ◐ and ☐ rows

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

## A ⚙ that was never earned — ten tickets running

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

## #97 and #85 — one opinion held twice, and reading a sweep

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

## #111, #121 and #55 — live regions, and measuring first

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

## #119 — where a Google sign-in lands

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

## #123 — mutants resting on nothing

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

## #122 — one symptom, two rules

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

## #96 — the order of outcome codes

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

## #107 — ids too large for the column

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

## #102 — the department branch

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

## #67 — the sample row that named a student

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

## #101 — one curriculum at a time

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

## #124 — the template's example row, and #126 which it exposed

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

## #125 — a Buddhist-era year

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

## #89 — two ends of a window

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

## #48 — the role without a window

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

## #87 — an external assessor inside the institution

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

## #83 — the refusal that names the rule

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

## #52 — an account that cannot go on

**#52 is the eleventh, and it met #83's lesson one day later in the form of a prediction.** An account
suspended mid-session was refused correctly and then left on a screen it could no longer use, or - on
a typed address - sent to `/` with nothing said at all. `11-user-accounts.md` had written, of the
`11c` row that suspends somebody mid-session, *this spec is not bound to that behaviour, so nothing
needs changing when #52 closes*. After the fix it was **the one row of 376 that went red** - on its
cleanup line, which asked `/api/me` on a cookie #52 now erases. **A sheet's prediction about what a
future fix will not break is a claim like any other**, and only the clean suite checks it.

**The signal is a field the server sets at the line that decides, not a list the client keeps.** A
`403` here means two opposite things - *your role does not reach this*, stay where you are (#10's sixth
criterion), and *this account cannot go on*, there is nowhere left to stay. The ticket forbade
matching the Thai; a client-side list of `reason`s is the same mistake in another shape, because the
next reason `sessionAdmission` learns would not be on it and no test would fail. So `endAccess` in
`authorise.js` is the only way `attachRoles` refuses a caller holding a good cookie, and it sets
`accessEnded: true` itself. **When a client must tell two refusals apart, have the server say which
one at the point of deciding** - and then check what else decides the same way: `noRole`, not in the
ticket, is the same state for the person at the screen and got the flag too.

**And the first sweep of the tempting wrong fix read 171, which was a fixture and not a mutant.**
`everyrefusalends` - *every 403 ends the session*, one line, no server change - passes every row of
`52a`. What fails it is rows written before this ticket that expect an ordinary `403` to stay in
place. But `12a` grants `teacher.one@` a committee seat and hands it back only on the path where the
row passes, so a mutant that failed it mid-row left every later teacher row refused as a committee
member. #97's *kills too much* is a mutant that stops the application; this is #89's fixture that
restores itself only when it passes, at the scale of a whole browser suite. **Before reading a kill
count that looks like the suite as a mutant that stops everything, read the names for a leak** -
every dead row after `12a` was a teacher's. `12a` now has an `afterAll`, and the figure measured after
it is **13 rows in nine files**, every one of them an ordinary refusal that used to stay in place.
Both reviews then found *ten files* in two places over a list that names nine - #96's retyped
figure, one ticket later.

**#52's review found the fix signing a person out three times, and the obvious repair was the next
defect.** A screen that asks for three things at once gets three refusals; each posted a sign-out,
and each on a still-live cookie wrote a `LOGOUT` into the account's history. A once-only ref fixes
that, and never reset it is once per *tab*: ended, signed back in through the form on screen and
ended again, the browser draws the sign-in page over a cookie it kept. `52a` rows 5 and 6 are the
two halves, and `signsoutpereach` and `onceonly` each kill one of them and nothing else. **A guard
that says *only once* has to say once per what, and the reset is where it says it.** The same pass
caught a wait written into row 4 so that a `goto` could not cancel that sign-out in flight: it had
become the row's assertion in silence - `cookiekept` died on the wait, not on the last line - until
it was given a timeout it tolerates. **Anything written for timing must not be able to decide
anything.**


## #129 — the report of a range the pickers had left

**#129 is the twelfth, and it spent two rounds being diagnosed as something it was not.** One row of
`44a` asked for a two-year range and read eight column headers, but only in a full-suite run: run on
its own, and with `--repeat-each=3`, it passed every time. The first reading was *a flaky spec*. The
second was *data another spec left behind* — and querying the register after a full run proved the
leak real, with `17b` leaving an intake of 2568 and `17c` one student of 2561. Both readings were
true and neither was the defect. **Eight was not a wider range; it was a report of a range nobody
had asked for.** The row asks for two years, and two years count four columns however many intakes
the register grows; eight is six years plus the two naming columns — the range `showRange` passes
through on its way, because it moves the `to` end before the `from` end. **A spec that fails only in
the full suite is not a flaky spec until the mechanism has been measured**, and the leak that makes
a defect reachable is not the defect.

`load` wrote `setData(await getResultsAcrossIntakes(...))` with nothing tying an answer to the
request that caused it, so **the answer that arrived last won, not the answer asked for last** — and
the screen's own docstring already had the words for what that looks like to a person: *showing a
report about one range while saying another*. The guard it needed existed twice in the same
codebase, in `CohortPickers` and in `Plos`, and #68 had proposed it in general terms months earlier
without either of them naming the other. The ticket offered three things to decide and only one of
them fixes anything: making the leaking specs clean up **hides** the race, and deriving the count
from `PRIOR`/`CURRENT` instead of the literal `4` is right for the reason the ticket gives — the
comment above it claimed a robustness the assertion did not have — but leaves the failure exactly
where it was, because the asked-for range still counts four while the screen draws eight. The
declined one is #132 now, with the register it left behind measured into it: a deferral written into
prose and not into the tracker is a decision nobody can find, and this one is the third clause of
the sentence being closed rather than adjacent work.

**And the row that had been catching the defect was not the row that holds the claim.** Row 1 could
only see it when a previous spec had happened to leave the register wide; on the seeded register the
opening range already *is* what the row asks for, `showRange` fires no request, and there is nothing
to race. So the two new rows build the situation instead of waiting for it: a student at each end of
the range, and the middle answer held back with `page.route`, which makes the outcome a fact about
the code rather than about the network — #121's move of narrowing the window rather than writing
into a shared schema, in another form. **A row that catches a defect on some runs is not a row that
holds it; the row that holds it is the one that builds the situation itself.** Both new rows read
the screen once, at a settle point that is an arrival rather than a guess, which is what #50 asked
of a retrying negative and what #52 asked of anything written for timing.

**The guard has two sides and they are one state apart, so each got its own row and its own
mutant.** `staleanswerwins` is the defect itself — a stale answer painting over the current one.
`staleclearsloading` is the side no row would have reached: an answer nobody is waiting for clearing
the spinner of a request still in flight, which is visible only while there is no report on screen
yet, and leaves *nothing at all* there — no report, no sentence, no spinner — which is #43's defect
arrived at from the other end. Reaching it means superseding the **first** request before it
answers, which is why that row drives the picker rather than `showRange`. The third side, the
effect's own cleanup, is not a third mutant: removing it does what removing both of these does at
once, and says nothing new. **When one fix lands on three lines, the mutants are per claim, not per
line.** Measured, `staleanswerwins` kills both new rows — a stale answer that paints also takes the
spinner with it — and `staleclearsloading` kills only the spinner row; the other 378 rows stand
under each. **Row 1 passes under the defect itself**, which is the whole of the argument above in
one number.

**And the first sweep failed both new rows at their preconditions, which is a finding about the
rows.** Each opened by asserting the pickers held the years the two enrolled students imply —
`2563` and `2568` — and in a full-suite run the `from` picker holds `2561`, because `17c`'s leak is
still there and is older than anything this file enrols. Row 8 died on that line and row 9 timed out
waiting for a response it identified by a range string that was never requested; neither reached the
assertion it exists for, so the sweep proved nothing and the rows would have failed the clean
full-suite run just as surely. Both now read the opening range off the screen and assert only the
shape they need — that it starts before the range asked for and ends after it — and tell the two
requests apart by the end that moved. **A row that builds its own situation is still handed a world
it did not build; assert the shape the row needs, not the values the seed would have given.** The
mutant sweep is where a new row meets the register the whole suite leaves, and that is the second
reason to run one.

## #68 — fifteen panels, one claim, and the screen the census chose

**#68 is the thirteenth, and it is #129's rule written out where #129 found it by accident.**
Every server-paged panel read its answer the same way — `setData(await listSomething({ page,
per_page }))`, with nothing tying an answer to the request that caused it — so two lists in flight
meant **the answer that arrived last won rather than the one asked for last**. The ticket listed
seven files and said the list came from a grep: confirm each one before changing it, do not change
by list. All seven matched, which is the outcome the instruction exists to make checkable rather
than the outcome it expects — **and matching all seven is the answer to only half of what that
instruction is for.** The other half is what the grep could not have found, and nobody asked it
until `/code-review` did: five more panels carry the identical unguarded shape — `Rubrics`,
`Offerings`, `SubjectStudents`, `groups/GroupHistory`, and `UserHistory`, which has no page
number at all and is superseded by the next keystroke instead, the case #68's own second
sentence describes. And three more came from the ticket itself: a comment its owner had written
the same morning, closing #129, that says in as many words *รายการของตั๋วนี้ยังไม่ครบ* and gives
the three `CohortPickers` reports with their line numbers. Fifteen. The first pass wrote *seven*
into six files of prose as though the list were the population; the second wrote *twelve*, having
read the body and not the thread. **A grep is evidence for the pattern you typed, not for the
claim you wanted** — a ticket's file list is a grep somebody else ran on an older tree, and a
ticket does not end at its body.

**What the grep could not show either was who else calls `load`.** On nine of the fifteen the
handlers call it too — after a save, after a delete, from a retry button — and a flag declared
beside the fetch inside the effect, which is the house shape and is what `CohortPickers` and
`Plos` use, has no answer to give those callers. So the flag is a parameter
with a default, `async (isCurrent = () => true) => …`, and the effect is the only caller that
passes one. **The pattern a grep finds decides that there is a fix; the second caller decides what
shape it has.**

**The ticket offered to lift them into one `usePagedList`, and the answer is no for a reason that
is about proof rather than about code.** Three copies is the threshold the ticket named and
fifteen is far past it, so by the ordinary argument the hook wins. But a mutant in code all
fifteen screens share kills every one of their rows at once, and `intakefrozen` is already on
record in #42 for what that is worth: a mutant that kills everything proves nothing about any one
thing. One hook would turn fifteen claims into one that cannot be measured apart, and it would do
it to the only claim these screens have. The fifteen are also less alike than a grep makes them
look:
`SubjectStudents` throws its `data` away on a refusal, `GroupHistory` is handed its fetcher by the
screen above and holds its dependency list open with an `eslint-disable`, and `UserHistory` has no
page to turn. **A ticket that offers to de-duplicate is answered with what the merge
costs the proof, not only with what it saves the code** — and the day every one of the fifteen
has a row of its own is the day that merge is free.

**The census picked the screen this is proved on, and nothing else did.** The claim belongs to all
fifteen equally, so subject matter had nothing to say about where to write the rows and the
mutants. What decided was which of the fifteen files no mutation sheet holds: the rest are held by
`13`, `16`, `18`, `45`, `57`, `84`, `91` and `124`, and `frontend/src/pages/Students.js` is held by
nobody — so `68` is the first sheet in thirteen rounds to move neither the contested-path total
nor its shape, and
it does that by design rather than by luck. The seed's 173 students then hand the rows a second
page without the spec writing one. **When a rule is true on many screens, the screen that proves it
is chosen by the sweep, not by the story.**

**Fourteen screens are changed and only one is proved, and the sheets say so in those words.**
`docs/acceptance/57-pager.md` carries the paragraph, because that is the sheet someone reads when
they ask how well paging is held, and `17-students.md` carries the three ⚙ rows. Writing *proved
by pattern* on the other fourteen is the price paid with the eyes open; #50's rule is that explaining a gap
in prose is not the same as marking it, and the answer here is to do both rather than to let the
fifteen look equally covered. `42`, `43` and `45` carry the same paragraph for the three reports.

**All three rows are rows a person cannot walk.** Each one holds the first answer back with
`page.route`, presses on top of it, and reads the screen once at the moment that held answer lands.
A hand-walk cannot arrange for two answers to arrive in the opposite order to the one they were
asked in, which is what makes these ⚙ rows rather than ☑ ones and what made #68's own acceptance
criterion name `page.route` by name.

**There are three rows because the guard has three clauses, and the third one was nearly left to
be assumed.** The first pass wrote `if (isCurrent())` in front of all three — the rows drawn, the
loading flag cleared, the refusal reported — and then wrote mutants for two. The third clause is
the one that reads as obviously harmless: an answer nobody is waiting for **failing** sounds like
nothing happening. It is not. `report` is `if (!error.expired) setNotice(…)`, so the superseded
refusal puts a red banner over a list that arrived perfectly well, and nothing on that screen takes
the banner away again. The row makes the refusal itself with `route.fulfill` and a 500, because a
refusal is the only way into that clause with a request that has already been replaced. **Every
clause of a guard has to be one of three — proved, structurally unreachable, or untested** — and a
clause with no row and no mutant is the third whether or not anybody wrote it down.

**The three mutants came out one row each, which is the shape the three rows were written for.**
`staleanswerwins` — the defect itself — kills only the first row, at its own assertion: the table
holds page two's ten codes where page one's were read off the screen a moment earlier.
`staleclearsloading` kills only the second, counting the *กำลังโหลด…* placeholder as none where
there should be one. `staleerrorwins` kills only the third, counting one `role="alert"` where
there should be none. Each sweep was the full browser suite and each came back **382 passed, 1
failed** of 383; no row of any other spec moved under any of them, which had to be measured
rather than assumed, because four other spec files read this register. **All four runs were
then thrown away and measured again** — the review's second round guarded three more screens,
changed seven handlers and merged the rows' paired assertions, and a sweep taken before those
is a sweep of a different program. The second set is the one on the sheets: clean **383 of
383**, and 382/1 three times over. The second mutant is the louder half on
this screen: the register draws the placeholder and nothing else while it waits, so clearing the
flag early leaves *ยังไม่มีนักศึกษาในหลักสูตรนี้* on screen — a sentence about an empty curriculum
that holds 173 students — while their list is still on its way.

**And running `anchors.py` before the clean run caught a `MISS` this change had just made.** Adding
the guard to `Subjects.js` had wrapped `listSubjects({ page, per_page: PAGE_SIZE, department_id:
department })` across four lines for width, and `57:subjpage` is anchored to that call written on
one — so a mutant belonging to another sheet quietly stopped applying, in a file this ticket only
passed through. Putting the call back on one line was the fix, not re-aiming the mutant: the
formatting was mine and the anchor was not. **A mutant outlives its ticket but not its anchor, and
the edit that moves one is usually an edit that was not about it** — caught inside the change, so a
near-miss and not a finding about the store.

**The guard closed the race the effect can lose, and left open the one a handler starts.** Seven
screens answered a finished import with `onImported={() => { setPage(1); load() }}` — which, read
from page three, asks the server for page one *through the effect* and for page three *by hand*, in
that order, and then draws whichever answers second. It is the defect of this very ticket, one call
site away from the guard that was being written to close it, and the guard cannot see it: a handler
has no way to know it has been superseded, and `isCurrent`'s default answers *still current* for
exactly the callers that never are superseded. Worse, my own comment beside that default said so in
as many words — **the comment was the claim, and it was wrong about seven of its own callers.**
`Students.js` already held the right shape one function above, on `save`: going to page one is a
change the effect fetches, so only the branch already on page one reloads by hand. The seven now
read `if (page === 1) load()` and `else setPage(1)`. **A guard written for one caller is a claim
about all of them** — and this one was found by `/code-review`, not by the person who wrote both
halves.

**Then `anchors.py` said `problems 2`, and this time re-aiming was the fix rather than the
mistake.** `16:M9` was anchored on the old `onImported` block and `45:reportignoresthechoice` on
the `getStudentResults` call the guard had just rewritten — both anchored to code #68 genuinely
changed, unlike `57:subjpage`, which was anchored to formatting #68 had no business moving. The
two are opposite cases wearing the same `MISS`, and the tool cannot tell them apart: **an anchor
check says a mutant no longer applies, never whether it still proves anything.** So each was
re-aimed at the new text and then swept — `16a` row 89, `45a` rows at 146, 180, 214 and 264 — to
see it still kill the rows it was written for. Re-aiming without that sweep would have produced two
mutants that apply cleanly and measure nothing.

**What is left is written in the tracker and not only in a paragraph.** The owner's own grep,
`set[A-Za-z]*(await `, still returns sixteen call sites in fifteen files, and they are not one
family: `PloMapping` and the two `setDrill` handlers inside the reports just guarded take their
parameter from a control on their own screen and race exactly as the fifteen did, while the other
thirteen read `useParams` and can only be superseded by walking from one CLO or activity to the
next on the same route — *แคบกว่าแต่ไม่ใช่ไม่มี*, in the words of the comment that measured them.
They are adjacent work and they got a ticket — **#133**, carrying the same table with the line
numbers — because the price this ticket's own owner set is **a row per site, not a line per
site**, and #119's rule is that a deferral written into prose and not into the tracker is a
decision nobody can find.

## #131 — the comment said which of the two was unconditional, and the code did the other one first

**A route's own comment had already decided this ticket, three paragraphs above the bug.**
`POST /auth/logout` carries a long note from #92 explaining why it sits outside `requireSession`,
and it says the thing plainly: *"clearing is unconditional and idempotent — signing out of a session
that is already gone is still signing out … Recording needs a name."* The code then wrote the record
first and cleared second. For every account that exists the two orders are the same program; for an
account that has been deleted the write hits `user_log`'s foreign key, the handler answers 500, and
`clearSession` never runs — on the one route in the application that erases the cookie. **A comment
that states a rule is a claim about the code beside it, and it is the cheapest claim there is to
check.** #83's rule is to read a file's own comments before inventing a rule; this is the same rule
read the other way.

**What made it worth doing now was a different ticket.** Nothing in the product deletes an account —
`routes/users.js` has no delete route, which #67 recorded for its own reasons — so the state needs a
`DELETE` in the database and the ticket was filed as theory. #52 changed the price: the browser now
posts to `/auth/logout` **by itself** when it is told `accessEnded`, and one of the reasons that flag
carries is `unknown`, which is exactly *the account was deleted while its cookie was still good*.
`AuthContext` posts it as `.catch(() => {})`, so the 500 is swallowed and every page load runs the
same loop — 403, sign-out, 500 — with the cookie never going anywhere. **A defect that is
unreachable is a defect with a date on it**, and the thing that moves the date is usually another
ticket's fix.

**The fix is two halves and only one of them can be proved here.** The question before the write —
is there still an account for this line to be filed under — is proved: `131:logstoanybody` removes
it and kills exactly one row of 739. The order is not: with the question in place nothing throws, so
no row can tell the two orders apart, and what the order guards is the gap between the check and the
insert, which is a race the seam has no handle on — the same shape #51 records for token renewal.
It is in the code because it costs nothing, and the mutation file says *untested* rather than
letting the sweep's silence read as proof (#107).

**`13:N7` moved for the second time in five days.** It anchors to the `recordActivity` call on this
route, which #92 rewrote and #131 has now indented by one and wrapped in a guard. The anchor check
said it applied; only the sweep said it still kills, and it does — three rows, the same claim it has
always made. **An anchor check and a sweep answer different questions**, and a mutant that has been
re-aimed twice is one to sweep rather than to trust.

## #132 — two files, nineteen tables, and an instrument instead of a list

**#132 asked for a cleanup and the measurement turned it into a survey.** The ticket was split out of
#129 and it was precise: `17b` and `17c` add students through the screen, nothing takes them out, and
the table it gave counted seven rows in one table. What it proposed was a cleanup in `afterAll`, with
a second option — *a guard that measures which file leaves rows* — and a third line that turned out to
be the whole ticket: **นับให้ครบก่อน ไม่ใช่เชื่อว่าสองไฟล์นี้คือทั้งหมด.** So the first thing written
was not a fix but a comparison: build a reference schema beside the one the suite had just run on,
migrate and seed it, and diff every table by primary key.

**Nineteen of thirty-four tables had moved.** `subjects` +22, `program_subjects` +14, `departments`
+8, `programs` +7, `users` +5, `student` +7 — and, which nobody had asked about at all, five tables
that had moved **down**: `rubric_details` −3, `student_course` −3, `learning_outcomes` −2,
`activities` −1, `rubrics` −1. A spec that deletes a seeded row changes the world the next file is
handed exactly as much as one that adds, and a ticket written from one symptom had named only the
adding half. **A ticket's list is a claim about the day it was written; the population is a
measurement**, which is the rule #68 had just finished paying for one ticket earlier.

**That is why what got built is an instrument and not a cleanup.** Cleaning nineteen tables' worth of
specs is a project, and a project that ends with a list of what is allowed to move is a hand-kept list
in a suite that grows every ticket — already wrong, by #123. So `e2e/support/leftovers.js` takes a
snapshot of every row's primary key straight after the seed, another when the run ends, and prints
what moved in both directions. It asks the **catalogue** for its tables and their keys rather than
holding a list, so a table a migration adds is measured the day it exists; and it prints how many
tables it looked at, because a tool that cannot say what it did not look at is the same species as the
hand-kept numbers it checks.

**Two things it cannot do are written in it rather than left to be found.** It reports and does not
fail the run — the instrument it is modelled on is `mutation/anchors.py`, which also only counts and
is read by a person. And it says *what* moved, not *which file* moved it: Playwright's reporter hooks
are not awaited, so a snapshot cannot be taken at a file boundary unless all fifty-six specs import a
shared fixture, and that is a change to every file in the suite for an attribution that can be had
for the price of running a spec alone. **Saying what an instrument cannot measure is part of the
measurement** — and the thing it cannot measure turned out to be exactly the thing the ticket's third
line asked for.

**The two files the ticket named were then fixed, because they are the case that was measured.**
`holdRegister` sits on `students-screen.js` rather than inside either spec — a fixture built inside one
test file is one no other file has (#96). Its first version took a list of the seven codes, which the
review was right to call a hand-kept list in the one diff arguing against them: `17b` deliberately
offers codes it expects to be **refused**, so the list is correct exactly until somebody changes the
importer — which is the day it matters. It now remembers the register in `beforeAll` and removes
whatever appeared, which is the same move the report at the end of the run makes, one file down. Both
specs now leave nothing behind but `user_log`, which is the one table nobody can clean: it is the
product recording the spec's own actions, and every spec that does anything moves it.

**The instrument's own test caught nothing, and then the first real query caught the instrument.**
Eight `node --test` rows against a fake database, and five deliberate breaks — deletions ignored,
no-key tables skipped, a composite key read on its first column only, the table count dropped from the
report, elided keys not counted — all five failed a row, so the rows had teeth. Then the first run
against Postgres threw `key.map is not a function`: `array_agg(attname)` is an array of `name`, and
node-postgres has no parser for that type, so it hands back the string `{student_id,section_id}`. The
fake had been handing over real arrays because that is what the code wanted. **A fake written from the
code cannot express what the driver does**, and the fixture that would have caught it is the one thing
this file does not have: a real connection. It is a cast now, and a comment saying why.

**The third line asked which *specs*, and the first answer counted *tables*.** The review caught it:
นับให้ครบก่อน is a question about the population of files, and nineteen tables is an answer about the
population of tables. They are not the same number and neither implies the other — one file can move
five tables and five files can move one. The instrument says what moved and not who moved it, so the
first instinct was to grep the printed keys back to a spec, and that grep was wrong within four
minutes: `departments` came back as `14b`, which writes `07, X1, X2, X3, Y1` — and the full run's
report says `07, X1, X2, X3, Y1, Z0, Z1, Z2`. `Z0` is `57a`, a pager spec that makes rows in bulk to
have something to page. **A key identifies the row, not the author**, and the author is the thing the
question was about.

**So the census was measured instead: fifty-six runs, one spec file each.** Every Playwright
invocation runs `globalSetup`, which drops, migrates and seeds, so a single-file run's report is that
file's own leftovers and nobody else's — twenty-five minutes of wall clock for an answer no grep could
have given. **Forty of the fifty-six leave nothing but `user_log`; sixteen leave rows in other
tables.** `subjects` is moved by seven different specs, not by the one whose name it matches;
`program_subjects` by five. And the per-file totals add up to more than the full run's: thirty-one
subjects across seven files, twenty-two in one run, because a spec that writes a code an earlier spec
already left counts it as new when it runs alone and as nothing when it runs after. Four of the
sixteen move rows **down**, across five tables: `19a` removes two learning outcomes, `21a` a rubric and
its three details, `25a` three enrolments, `32a` an activity.

**And the run that was supposed to close the ticket found something else.** Two full runs in a row
failed — three rows between them, in two files, every one of them the same shape: `const before =
await total(page)` read **0**, and a later `expect.poll(() => total(page)).toBe(before)` then could
not pass, because what was wrong was the expected value and not the read. The helpers say they wait
for the list — *waits for the list it is about to assert on* — and what they wait for is the HTTP
response. React sets state after that resolves, and between the two the screen still draws *ทั้งหมด 0
รายการ*. **A helper that waits for the answer has not waited for the drawing**, and the rows that read
it first are the ones that see the difference. Each of those rows passes when its file runs alone,
which made it look like the leftovers this very ticket was about — it was not.

`openRegister` and `openProgramSubjects` now wait for the number the response carried to be the number
on the screen, which is the only wait that survives a screen whose empty state is a real number.
Proved by making it wait for `carried + 1`: the row fails. Reading the body is done on the line after
the response and nowhere later, because `enrolment-screen.js` spent three sweeps learning that
Chromium keeps a body only until the page navigates away from it. Eleven routes answer with a paged
`total`; two are fixed and the nine that have never been seen to fail are **#135**, not a sweep of
edits made on a guess.

**What is left is measured and deferred, not silent.** The other sixteen specs and their seventeen
tables are #134, with the census in it, because the price is the same one #68 set — a row per site —
and #119's rule is that a deferral written into prose and not into the tracker is a decision nobody
can find. The two the ticket named are now measured clean rather than asserted clean: both appear in
the forty.

## #135 — nine helpers of the same shape, two of which were not, and a failure #132 had already seen

**#135 was the other nine of #132's eleven, and its own list was the first claim to measure.** The
ticket said every `open…` helper on a route that answers with a paged `total` has the shape
`openRegister` had — wait for the response, hand it back, let the row read the pager — and named nine
routes. Seven of them are exactly that. Two are not. On the activity history, `openHistory` waits for
`GET /api/users`, which carries a total, but nothing on that screen reads it out: the list only fills
a `<select>`, and the paged read the rows care about is the **next** helper, `pick`. And the work
groups' history is not an opener at all but a click on a button, on a panel whose heading also carries
*ทั้งหมด N รายการ*, so a wait matched on the count alone is two elements and a strict-mode failure. The
routes were right; **the helpers they led to were a grep for the route**, and #68's rule is that a
file list is a grep somebody else ran.

**The failure the ticket predicted had already happened, and nobody wrote it down.** While #132 ran
its fifty-six single-file runs, `26a` failed once at row 8: `historyLines` on the line after the group
`openHistory` came back `undefined`. The panel was still drawing its loading row, whose one cell has
no second column, so `const [newest] = …` had nothing to destructure. It passed on the next run and was
called intermittent in the conversation and nowhere else — not on #132, not in the census, and #132's
own story above went on to call the nine helpers the ones *never seen to fail*. It was this defect, in
a helper the ticket did not know had the shape. **#129 already has the rule** — a spec that fails only
sometimes is not flaky until the mechanism is measured — and this is it met again, one ticket after
it was written.

**One wait, not eleven, because here merging costs the proof nothing.** #132 had written the wait
inline twice. Eleven copies would have been eleven places for the match to drift — one of them
without *· หน้า* is the strict-mode failure above, waiting for a screen to acquire a second sentence.
So `untilDrawn` sits in `support/pager.js` beside `settled`, and every opener ends by returning it.
#68's rule is that a merge is answered with what it costs the proof, and the cost there was fifteen
claims no mutant could tell apart. Here there is one claim — *this helper waits for its list* — and
the proof is per helper, not per copy: break the one line to wait for one more than the answer carried, run one spec file
per helper, and read where each fails. Eleven files, twenty-six failed rows, **every one of them at
`untilDrawn`** — including `57a`, whose single failure came through `openUsers` in its `beforeEach`,
so `openPrograms` was proved separately by row 4 on its own. A merge that hid a helper from the break
would have shown up as a file that passed.

**The review found the half of the sentence the ticket had not written.** Acceptance 1 is not about
openers; it is about *a helper that promises to wait for the list*, and the first draft had kept that
promise only for the helpers the ticket named, and said in this story that the after-click helpers
were safe because *the rows after them poll*. The Spec axis read one: `filterProgram` says *what
follows reads the rows the filter chose*, waits for the answer alone, and `17c` row 10 reads `total`
on the very next line — the #132 shape exactly, on a route #132 had already fixed the opener of. The
sentence in this story was a claim about every caller, written from the ones in view (#68 again). So
every call of an after-click helper in the specs was read for what follows it: two are followed by a
read that neither retries nor goes through `settled` — `filterProgram` in `17c`, and `nextPage` in `18b`,
whose docstring promises *the rows it fetches* and whose next line counts them once. Both now end with
`untilDrawn`. The rest are followed by a poll, a retrying `expect`, or `settled`, and the README says so.

**`nextPage` needed the wait to learn a second number.** A step to page 2 keeps the total, so a wait
on the count alone would say it had arrived before it left. Every paged screen hands `Pager` the page
the server confirmed as `shown` (`Pager.js` says why), so `untilDrawn` now waits for the total *and* the
page. The same edit took the review's other point: it locates through `pagerLine` rather than
spelling the pager's sentence a second time in the same file, which is #97's two places holding one
opinion. The after-click helpers could not be proved by the first break, because every spec that uses
them opens its screen first and fails there, so the second break read the caller off the stack and
moved the expected total only for helpers not named `open…` or `pick`: `17c` failed at line 60,
`filterProgram`, and `18b` at line 193, `nextPage`, with every opener before them passing.

**What it cannot see is written on it.** A screen already saying what the answer says looks drawn: a
filter that lands on a list of the same length, or an answer of *0* on page 1, which is what a screen
draws before its first read. A count read after it is still right — it is the same number — but rows
read after it may be the old ones, and `filterProgram`'s docstring says so because it is the one
helper that swaps a list for another.

**One read of the same shape is outside this ticket.** `19a`'s *every row on screen is of the
curriculum the filter names* calls the PLO screen's `filterTo` and reads the curriculum column with `allInnerTexts` on the next line. That
screen has no pager and its route no `total`, so `untilDrawn` has nothing to wait for, and the fix is
a different wait on a different screen. It is **#136** rather than fixed here.

**And one helper started asserting what it had assumed.** `openEnrolment` returned whatever status
came back; a wait for the drawn total only means something on an answer that succeeded, so it now
asserts `200` first, as every other helper that calls `untilDrawn` does.

## #136 — the ticket named one helper, and the screen had three

**#136 was written by #135 from the one call it had read, and the file had two more.** The review of
#135 read every *after-click* helper in the specs for what followed it, found `19a` reading the PLO
screen's curriculum column on the line after `filterTo`, and opened this ticket for that call. What
the review had not read was the rest of `plos-screen.js`, because its scan was of helpers that click.
`openPlos` says it *asserts the list a passing row is about to read* and asserts only a status;
`save` says it *waits for the list the save reloads* and waits for the answer. `19a` reads
`listedCodes` straight after `openPlos` three times and straight after `save` or `addOutcome` twice.
**A ticket's file list is a grep somebody else ran** (#68) — and here the somebody was this session,
one ticket earlier, and the grep was for a verb rather than for the file.

**The ticket said its mechanism was read from the code and not yet measured, so it was measured
first.** A rerun would have passed: the row had never been seen to fail. So a scratch spec slowed the
renderer twentyfold through `Emulation.setCPUThrottlingRate` and recorded what each read saw. Moving the
filter from `0503` to `0501` read the curriculum column as **empty, four runs in four** — and reading the
DOM with `page.evaluate` at the instant the answer resolved found the single *กำลังโหลด…* cell every
time, never the four rows of the curriculum before. That settled both of the ticket's claims: the row
fails loudly rather than passing wrongly, and the only thing standing between an answer and its rows
is the loading row, which is what makes `settled` a sufficient wait on a screen that has no pager to
compare against.

**The scratch spec measured the filter in the opposite order from the row, and the review noticed.**
`19a`'s row loops `0501` then `0503`, and `departmentAdmin05` lands on `0501`, so its first `filterTo`
returns without asking and its `0501` read is guarded by `openPlos`'s wait, not `filterTo`'s; the move
it does make is to the four-row curriculum, which drew before its answer resolved on every run. The
defect was measured in the helper, on the list slow enough to show it — and the row the ticket named is
protected by the helper the ticket did not name. The other two `filterTo` calls, `19a:255` and `:259`,
were read as the ticket asked: each is followed by a retrying `expect` on `ploRow`, so neither could have
read too early, and both now sit behind the wait as well.

**A race between an answer and its drawing is measured by slowing the renderer, not by rerunning the
row** — a rerun passes, and a throttle gives a red before the fix and a green after it.

**Two of the three gaps were not failures, and they were fixed anyway, for a stated reason.** `openPlos`
read correctly on every run, at twentyfold and at sixtyfold, but the table was still the loading row
at the moment its answer resolved in two runs of three — the gap is there and the read has so far been
slower than it. `save`'s answer landed on a drawn table four in four. Both helpers promise the list
in their own words, and #101's rule is that a helper which promises a thing waits for it or says what
it does instead; the wait costs a visible table and a settled cell. The screen's *ยกเลิก* was measured
as well, because `19a` reads straight after it: it asks nothing, the table returns with the rows it
already held, and it read correctly every time, so it was left alone.

**Each wait was proved on its own.** One shared `untilListed` behind three helpers is #135's merge
again, and the proof has to separate them: the break read the caller off the stack and waited for a
text never drawn only when `BREAK136` named that caller. `openPlos` failed `19a:107`, `filterTo`
`19a:353`, and `save` `19a:124` — and the first `save` run failed somewhere else entirely, `19a:158`,
because its row edits a tree the serial row before it builds and `--grep` had skipped that row. **A
failure is only proof if it is at the wait**; the stack in the report is what said it was not.

## #134 — sixteen files, one shape, and a cleanup that was removing what it protected

**#134 was #132's census turned into work, and the census was measured again before any of it.**
Acceptance 4 said the table was re-measurable and was to be corrected rather than believed, and #135 and
#136 had both landed on the same files since it was taken. Fifty-six single-file runs later it came back
identical — the same sixteen files, the same seventeen tables, the same counts — and the only line that
changed was `26a`, which had failed a row in #132's census and passed all twelve now: #135's
`historyLines` failure, gone with its fix.

**The ticket offered two shapes, and the sixteen files wanted a third.** `holdRegister` removed what
appeared in one table and `44a`'s `unenrol` named what it put there; neither could put back a row a spec
had **removed**, and four of the sixteen remove seeded rows. Sixteen helpers, one per screen, would each
have been a list of tables — the list #132 had just argued out of the report, one file down. So
`support/hold.js` is the report's own comparison turned around: it asks the catalogue for every table
and its primary key, remembers every row in `beforeAll`, and in `afterAll` takes out what appeared and
puts back what went. #68's rule is that a merge is answered with what it costs the proof, and here the
claim is not per screen — *this file ends where it began* is the same claim in every file, and the
single-file report measures it per file whatever the helper looks like.

**Everything hard about it is something the database decides, so its test is against the database.**
Nine `node --test` rows in a scratch schema shaped after the difficult cases rather than after
`deep_core_e2e`: a RESTRICT child, a self-referencing tree, an identity column that refuses a value, a
generated column that refuses any, a table told to be left alone. The order rows can go in is not
planned from the foreign keys; each row is tried in its own savepoint, and a row a foreign key refused
waits for the next pass. Eleven deliberate breaks now fail at least one row each, and the first run of
them did not: reading values back without the `::text` cast passed every row, because nothing in the
fixture lost anything on the way through JavaScript; a timestamp with microseconds does, and now the fixture has one. And
removing `BEGIN` was too blunt a break to prove atomicity, since the savepoints fail without it; a
`COMMIT` in the failure path is the break that leaves a half-done release, and exactly one row catches
it. **Before trusting a row, break the thing it is about** (#124) — and a break that fails everything
has not found the row that owns the claim.

**What it does not do is written on it.** A row that stayed but changed is not put back: the report
cannot see one either, and a restore nothing measures is a restore that breaks silently. `user_log` is
left alone because #134 had already set it apart as the product recording the spec, not a leftover —
though a row taken out still cascades into it, which is why a single-file run of `11b` now reports
`user_log` ids with a gap in them: `hold` never deletes from that table, and an account's log rows go
with the account. A table with no primary key is refused when the snapshot is taken, because skipping
it would be the silent half of a promise to put the schema back.

**One of the sixteen was not a missing cleanup; it was a cleanup removing what its own comment
protected.** `25a`'s `afterEach` deletes the spare codes' enrolments from *teacher.one's own ตอนเรียน*,
and says why it is scoped rather than deleting the codes outright: `65010001` is seeded into last
year's ตอนเรียน, and a blanket delete would take that fact away. The census said `25a` removed
`65010001/3`, `65010002/3`, `65010003/3`. Section 3 is last year's — and teacher.one teaches it. The
scope was the account, not the term, so the first test's teardown removed exactly the seeded rows the
comment names. Narrowed to this term, `25a` alone left nothing but `user_log` before `hold` was ever
added to it, so it was not: a second mechanism beside a correct one is #97's two places holding one
opinion. **A teardown is a write like any other** — it is scoped to what the file wrote, not to who
wrote it, and the single-file report is what checks it. No row in `25a` could have: the rows it
removed were never the rows it asserted about.

**Three existing cleanups were replaced rather than joined.** `12a`'s `afterAll` switched the grant
off — which left the switched-off row behind, the `user_roles` +1 in the census — and its story about
171 failures is kept on the `hold` that replaced it, because the reason it sits in `afterAll` has not
changed. `20a`'s `unplace` went through the two screens' endpoints and could only switch a referenced
pairing off, leaving the subject, the pairing and four cells; `hold` is declared before `place`, so a
worker restart runs the release before `place` runs again, and `place` keeps its `PUT` for the day a
release does not. `17b` and `17c` lost `holdRegister`, whose own reasoning — remember the table, not a list of codes — is the reasoning
`hold` takes one level up.

**Proved at the spec seam as well as its own.** Each changed file was run alone: eighteen runs, all
passing, every report `user_log` only. Then `release` was broken three ways against real specs:
skipping the restores left `19a` reporting `learning_outcomes -2`, skipping the removals left `14b`
reporting `departments +5`, and a row forced to fail in `20a` restarted the worker through `afterAll`
and `beforeAll` and still left nothing but `user_log`. The full run then ended the way acceptance 1
asked: 383 of 383 passing, and `34 tables checked, 1 moved` — `user_log`.

**The review found a row that could not fail and a cascade the release did not follow.** One of the
nine rows said *an identity column keeps counting past what was put back*, and nothing `hold` could do
would have failed it: `OVERRIDING SYSTEM VALUE` does not move a sequence and neither does a `DELETE`,
so the next id was past the restored ones whatever the release did. Eleven breaks had each failed
*some* row, which is not the same as each row having been failed by a break — #124's rule read per row
rather than per file. That row became the one the Spec axis described: a seeded leaf moved under a
branch the file added is taken out with the branch by `ON DELETE CASCADE`, and the release had read
what went **before** the removals, so the leaf was never put back. It failed against the old
release, and now what went is read after the removals. The same review caught the first row's title
claiming *a child before its parent* on a pair the alphabet already ordered — `child` sorts before
`parent`, so no retry was ever needed there — and a comment copied into fourteen specs saying
`user_log` was *left as the run made it*, which the cascade makes false. The fourteen now point at
`hold.js`, which is the one place that says it. The full run after the fix was 383 of 383 again, and
`user_log` alone.

## #137 — the report compared keys, so the rows that stayed put were invisible

**The ticket's first instruction was to measure, and measuring was most of the work.** #134 had left
one half of *put the schema back* undone and said why on the file: a row that stays under its key and
changes underneath it is not put back, because nothing could see one. `leftovers.js` compared the set
of primary keys before and after a run; `hold.js` compared the same thing; between them, a spec could
rewrite every value in the schema and both would call the run tidy. So this ticket is two changes in
order — the instrument, then the cleanup — and the order is the point. A restore nobody measures is a
restore that breaks silently, which is why #134 was right to defer it and right to open the ticket.

**The snapshot now carries the row as well as the key**, and asks for both under names of its own
choosing — `to_json(ARRAY[…])` and `to_jsonb(t)` — rather than selecting the key columns bare, so
nothing it reads can be shadowed by a column that happens to be called the same thing. `differences`
gained a third category beside `added` and `removed`, computed only over keys **both** snapshots hold:
a row whose key moved is already one of the first two, and counting it twice would report one write as
two. Five deliberate breaks each fail at least one row — but two of them, the ones about what the
driver hands back, are caught **only** by the row that reads a real schema. This is the file that
learned in #132 that a fake written from the code cannot express what the driver does, and it had kept
being a file of fakes; it has one real schema row now, and that row is the one that earns its place.

**Eight keys is not an answer when two hundred rows moved.** The first census run printed
`activity_scores: +0 -0 ~201` and eight keys, each `(updated_at)`, which cannot say whether the other
193 were the same. A rewritten table now also prints its columns counted over all of its rows —
`columns updated_at (201)` — and that line is what the ticket's third criterion actually needs: whether
what moved is a value somebody typed or a stamp that follows every write.

**The census: fourteen of fifty-six files leave rewritten rows, and four of them already held.**
They are `10a`, `11c`, `12a`, `13a`, `16a`, `18a`, `19a`, `27a`, `28a`, `29a`, `30a`, `31a`, `34a`
and `55a`, of which `12a`, `16a`, `18a` and `19a` already held — written down here because a census
that lives only in a run nobody kept is a measurement the next ticket has to pay for again.
Twelve of the fourteen leave nothing but `updated_at`, sometimes with the `updated_by` beside it.
`16a` leaves `subjects.is_active` false on a seeded subject — the row that proves a referenced subject
is closed rather than deleted — and that file has held since #134, which is exactly the blind spot:
`hold` put back everything except the thing that file changes. `10a` leaves a different
`users.password` from the one the seed wrote, and it is the one row in the census where a changed value
is not a changed meaning: the file changes a password and changes it back through the screen, and
bcrypt salts the two hashes differently. **A value that moved is not always a meaning that moved** —
and the report cannot tell the difference, which is a reason to read it rather than to trust it.

**Nothing was excluded from the comparison, and that is the answer to the fourth criterion, not a way
round it.** `updated_at` here is not a trigger's tick: no table in the schema carries one, so the
column moves only because a route wrote `updated_at = now()`, and five screens read it back out —
`clos`, `plos`, `ploMapping`, `rubrics` and `rubricCriteria` all select it into a *แก้ไขล่าสุด* column.
A stamp that reaches the screen is a value the next file can be handed, so it is put back like any
other.

**Once it was measured the cleanup was one more pass of twenty lines**, and it closes the other half
of a cascade at the same time. `release` gains a third pass, read after the removals and the restores: every remembered
row still under its key whose values differ is written back, only in the columns that differ, never in
the key's own. A `SET NULL` that rewrote a row while a removal took the row it pointed at is a changed
row, so #134's *followed where it removes, not where it rewrites* is now *and where it rewrites*. The
row that proves it is not a new one only: giving the test schema a `ON DELETE SET NULL` reference
turned an existing row — *both directions at once* — red, because the seeded child lost its sponsor
when the parent went. A fixture that cannot express a defect is a fixture that cannot catch one (#96).

**The ten files that did not hold were given the block; one cleanup was replaced rather than joined.**
`11c` suspended an account and handed it back through the screen's own endpoint in an `afterAll` with
an assertion on it — a net whose reason is kept, on the `hold` that now is the net. `34a` keeps its
`afterEach`: that one puts each row's marks back **before the next row runs**, which is a different
opinion from *this file ends where it began* and not a second copy of it (#97's two places are two
copies of one opinion, not two opinions). What `hold` adds there is the hour on two hundred rows that
no row of the file was ever going to restore.

**The evidence, in the order it was taken.** Five breaks against `leftovers.js` and four against
`hold.js`, each failing at least one row. Then the census — fifty-six single-file runs, before any fix.
Then the seam the specs are on: with the rewrite pass skipped, `16a` reports
`subjects ~1 (is_active, updated_at)` and `34a` reports `~201`, both back to `user_log` alone with it.
Then the fourteen files again, one run each: **every one of them `34 tables checked, 1 moved`**. Then
the full suite.

## #138 — out of the tree is not the same as cleaned up

The comment beside `EVIDENCE_DIR` said the store was in the OS temp directory *so a run leaves nothing
behind*, and #134's review noticed that the sentence was true of the repository and of nothing else.
Measured before anything was changed, on the machine this suite has run on since #35: **323 files,
14,268 bytes, the oldest from 3 September 2569.** The ticket's own figure — 317 files, 14 KB, on
15 September — was right, and the six new ones were #137's runs.

Every one of them was unreachable. `global-setup` drops and reseeds the schema on every invocation, so
the `activity_evidence` rows naming those files went with it; the soft delete on the screen
(`is_deleted = true`) never touched a disk either, and neither did #134's `hold`, which removes the
rows `35a` inserts. **Three ways of putting the database back, and none of them a way of putting the
machine back** — because the file is not in the database and nothing in the suite had ever said so.

**The whole risk is the path, so that is what has rows.** What this ticket adds is a delete, and one
path component from the suite's store is `_local/evidence`, the product's own default, which on this
machine is real student work. A delete is not a write that can be put back, so the directory is
checked where it is used rather than trusted from where it was read: `suiteOwns` resolves the path and
asks two questions of it — is it inside the OS temp directory, and does its name start with the
suite's? `_local/evidence`, anything in the tree and anything reached by climbing out with `..` fail
the first; the temp directory itself and everybody else's files in it fail the second.

Eight deliberate breaks, each taking at least one row down, and **the third found a row with no
teeth**: the assertion about a path that climbs out was written with `path.join`, which collapses the
`..` itself, so the guard was never handed the kind of path `path.resolve` is there for — trusting the
string as spelled broke nothing. Rewritten to spell the path by hand, it goes red on exactly that
break. *Before trusting a new assertion, break the thing it is about* (#124) is a rule about the
assertion as written, not about the thing it is named after.

**Two of the eight came from the review, and both were holes rather than wordings.** The first: every
row proved the guard and none proved that anything calls it — deleting `await clearUploads()` from
`global-setup.js` left the file green. The run is a text file, so a row reads it and asserts both that
the clearing is asked for and that it is asked for **before** the schema drop, which is the order the
whole argument rests on; the docstring says what such a row cannot see (that Playwright calls the
setup at all, that the call is awaited, that the server stores where this clears) because a scan that
reads a file's text stops at that file's boundary (#89). The second: `path.resolve` answers what a
path spells, not where it goes, so a junction in the temp directory wearing the suite's own name and
pointing at `_local/evidence` satisfied both clauses. `fs.rm` unlinks a junction rather than following
it, so the files were never actually in danger — but **a guard that is right by a property of the call
it makes is a guard nobody can read**, and one the next edit can lose without noticing. `clearUploads`
now asks `fs.realpath` where the directory really is before it asks whether it is ours, and the row
that proves it makes a real junction (the kind Windows grants without elevation, skipped rather than
faked on a machine that refuses even that).

**The prefix in the guard is what lets the test own a directory.** A whole-name check would leave
`uploads.test.js` two choices: prove the clearing on the suite's real store — the one directory a test
must not be pointed at while a run uses it — or not prove it at all. Accepting a name that *starts*
with the suite's lets the test make `deep-core-e2e-evidence-test-<pid>`, named for the process as the schemas
`hold.test.js` and `leftovers.test.js` are, and the row that proves the wiring is the one that asks
`suiteOwns(EVIDENCE_DIR)` with the path read from `env.js` and never spelled again.

**At the start of the run, beside the schema drop.** The files and the rows that name them are one
world; cleaning them at different moments is what made this possible. At the start rather than at the
end for the reason `global-setup` already gives for the schema: a run that failed leaves its evidence
on disk to be looked at, and the next run is what cleans up. The directory goes whole rather than
being emptied, because `storeFile` makes its own `section_…/activity_…` folders on every upload.

Measured after: `35a` run twice in a row, **323 files → 3 → 3**, all three from the second run's
timestamps, and the full suite of 383 leaves the same 3. The README's layout gained `uploads.js` — and
`hold.js`, which #134 never added to it, while its command table had to be corrected twice in two
tickets, which is what a hand-kept list in a file that grows every ticket costs even when the ticket
is the one that grew it.

## #133 — the grep's sixteen was twenty-two, and one of them was a save

**#133 is #68's deferral, and the first thing it cost was its own number.** #68 closed with a
paragraph and a ticket: its owner's grep, `set[A-Za-z]*(await `, still returned sixteen call sites
in fifteen files — three that race against a control on their own screen and thirteen that read
`useParams`. Re-running that grep on this tree returned the same sixteen, and every one of them was
real. The number was still wrong. **A grep is evidence for the pattern you typed**, and this one
looks for an answer that goes straight into a setter; six sites give the answer a name first
— `const { plos: rows } = await listPlos({ program_id: program })` in `Plos`, and the same shape in
`GradingWeights`, `ContinuousImprovement`, `TeacherSection`, `GrantsPanel`, and the activity list
`ActivityScores` reads beside its grid. What found them was not a sharper pattern. It was listing
**every `await` in `frontend/src/{pages,components,context}`** — seventy-three of them — and reading
what each one does with its answer, then doing the same for every `.then()` chain and confirming
`lib/` and `routes/` have no awaits at all. **Twenty-two sites, in twenty files.** Sharpening a
pattern would have found some of them; only enumerating the population could say the count was
finished.

**One of those seventy-three is written down as *not* a site, which is cheaper than leaving it to be
measured again.** `TeacherDashboard.js:55` calls `listMySections()` with no parameter, so there is
no second request for a first to lose to — it is unguarded and correct, and it will keep looking
exactly like the other twenty-two to anybody scanning for `await`. That sentence is on
`24-teacher-dashboard.md` rather than in a scratch file, because *what the instrument cannot measure
has to be written down* (#132).

**The ticket had also filed one screen under the wrong half of its own table, and that screen turned
out to hold three of the twenty-two.** #133 lists `ActivityScores` among the `useParams` thirteen,
where superseding a request means walking from one activity to another on a route that unmounts the
screen on the way. Only `sectionId` comes from the route (ADR-0004). `activityId` is state, set by a
`<select>` sitting on the screen — so a teacher who picks a second piece of work while the first
grid is still out has two reads in flight and no unmount between them. It is the narrow family's
defect exactly, on a screen the ticket had put in the wide one. **A ticket's classification is a
claim like its file list**, and this one was wrong in the direction that costs a proof rather than
the direction that costs an edit.

**And the third of that screen's three sites is a save.** `saveScores` answers with the whole
grid, and that answer is drawn with `setData` exactly as a read is — so it can be superseded exactly
as a read is: send the marks, move the picker while the request is out, and the previous activity's
recalculated grid lands under the new activity's name. The flag every other site takes cannot serve
here, and the reason is not stylistic. `isCurrent` closes over an effect's teardown, and **nothing
tears a submit handler down**; the question a handler has to ask is not *was I cancelled* but *is
the picker still where it was when I was sent*, which is a question about now, and state captured
in a closure cannot answer it. So the save reads `onScreen.current === asked`, a ref kept in step by
its own effect. The notice is said either way and names the activity it saved, because a notice is
about what the teacher did rather than about what is on screen. **A save's answer is a read** —
anything that redraws from a response needs the same guard, and a handler asks it with a ref.

**The file #68 named as the example of the shape was half-guarded itself.** `Plos.js` is cited by
name in #68's story as one of the two screens using the house spelling, and it does — in its
*reach* effect (`Plos.js:141`). Above it in the same file, `load` (`:98`) fetches the PLOs for the
chosen curriculum and had no flag at all, and it is a group ก site: the หลักสูตร filter is on the screen, so one curriculum's list
can land on top of another's with no navigation involved. **A file that demonstrates a rule is not a
file that follows it**, and the citation is the reason nobody looked: it had already been read once,
for something else.

**The twenty-two split six and sixteen, and the split is what a row costs.** Six are group ก —
`PloMapping`, `Plos`, `ProgramLevelByIntake`, `ProgramLevelIndividual`, and `ActivityScores` twice
over — where a control on the same screen supersedes the request, so the situation can be built in
the browser and each one gets a spec row and a mutant. Sixteen are group ข: they ask with `useParams`
alone, or with a prop the screen above can only replace by unmounting them. Those get the flag, and
their sheets say **ยังไม่ได้ทดสอบ** with the reason and an expiry date on it — never *ไม่ต้องมี*. The two
sentences read almost the same and mean opposite things: one is a queue, the other closes a
question. A ticket that lets one of those screens change its parameter without coming down makes
that screen's row reachable on the day it lands, and each sheet names the move that would do it.

**The ticket's last clause is *and check the second caller of every file too*, and it is the clause
that decides the shape of every flag.** The twenty files hold twenty-four guarded functions. Before
the fix below, twelve took `async isCurrent =>`, because an effect was the only thing that called
them, and twelve took `async (isCurrent = () => true) =>`, because a handler called them with
nothing and for a handler that is running the honest answer to *are you still current* looked like
yes. Measured again afterwards the split is **fourteen and ten**: `Plos.load` and
`ActivityScores.load` moved, because their handlers now have a question of their own to ask. Reading the declarations and
the call sites back out of the files mechanically, rather than by eye over forty lines, reports
exactly one mismatch — and the mismatch is the instrument's. `ActivityScores.load` takes the default
with no `load()` anywhere in its file, because its second caller is `onImported={load}`: a reference
handed to `ImportPanel`, which fires it as `onImported?.()`. `GradingWeights` and `StudentGroups`
pass the same reference. **A caller that is passed by reference is invisible to a grep for the
call** — the same species of hole as the one that made this ticket's own sixteen wrong, one level
further in. It is also the shape that punishes the wrong guess in the noisy direction: a bare flag
on a function a handler calls with nothing is not a missing guard, it is `isCurrent is not a
function` the first time somebody imports a file.

**And reading them for the shape of the flag is not reading them for the defect.** That census
answers *is the signature right*; the comment it produced — *for a handler that is running the
honest answer to are you still current is yes* — answers *is the guard right*, and on two of the
twenty files it is false. `Plos` reloads its list from three handlers (บันทึก, ลบ, and an แก้ไข the
server refused) with the หลักสูตร filter on screen the whole time, and `ActivityScores` reloads from
`onImported` with the กิจกรรม picker on screen the whole time. Nothing tears a handler down, which
is exactly why the effect's flag cannot serve it — and exactly why the honest answer is not yes but
*is the control still where it was when I was sent*, the ref the save on `ActivityScores` was
already using two hundred lines below. *A guard written for one caller is a claim about every
caller* (#68): the comment **is** the claim, and a claim written in a comment is still a claim that
has to be true. The Spec axis of `/code-review` found it in the same round, which is the second time
this ticket has had a hole handed back to it by an instrument other than the one that made it.

The two fixes are not the same price. `Plos` gets a row — the seventh in `133a` — because its
situation can be built from the screen: `save` clears `editing` **before** it reloads, so the filter
is back under the user's hand while the request it caused is still out, and `hold()` puts the
`updated_at` back afterwards. `ActivityScores.onImported` gets the same guard and
**ยังไม่ได้ทดสอบ** on `34`, because the only way to build its race is to upload a file that writes a
whole class's marks, which is what that sheet's own import rows are about; holding their answer back
would make them measure this instead of themselves. Two sites, one fix, one row — *say which of
three a clause is: proved, structurally unreachable, or untested* (#102).

And the two mutants are not one claim in two places. `plosstalewins` takes the check out of `load`,
one line both callers run through, so with the seventh row in place it kills **two** rows — 2 failed
/ 388 passed, measured, where the figure recorded an hour earlier was 1 / 388 on a suite that did
not hold that row. `ploshandlerstalewins` takes out only what the handlers pass, leaving the
effect's guard standing, and kills **one** — 1 failed / 389 passed, the seventh row and nothing
else. The row is therefore held up by the second mutant rather than the first, and the first
mutant's count moving from one to two is not a regression but the measurement saying so. *Report
the measured number, not the ticket's* (#102) covers a figure of your own from an hour ago too: a
number is about the suite that produced it.

**The census answered where the mutants live, and then said nothing about most of the change.**
`133` takes the contested-path total from 34 to 38 and the shape from 17/7/6/3/1 to 20/8/6/3/1;
`Plos.js` becomes a new pair with `19`, and the sheet may not be swept beside `19`, `20`, `34`,
`35`, `42` or `45`. But #133 flags **twenty** files and names only five in `FILES`, because only
five hold a mutant — so the census is silent about the other fifteen, which is precisely where a
formatting change can move somebody else's anchor. `anchors.py` is what caught that: **nine mutants
across `28`, `29`, `30`, `31`, `32`, `39`, `40`, `42` and `45` came loose**, every one of them a
`swallowrefusal`, `refusalkeepsloading` or `drilldownwontclose` anchored to a `catch` or `finally`
body that this change had just indented by two spaces to put it behind `if (isCurrent())`. Re-aiming
nine anchors is the cheap half; the expensive half is that each one then has to be swept against its
own spec, because *an anchor check says a mutant no longer applies, never whether it still proves
anything* (#107) — a re-aim that applies cleanly and measures nothing looks exactly like a good one.
**The census counts the files a sheet owns; the anchor check is what watches the files it merely
touches** — and neither of them is a sweep. So the nine were swept, one at a time, each against its
own spec file: all nine killed the row their own mutation file claims, and nothing else — rows 7 and
8 on `28a` and `29a`, row 10 on `30a`, row 7 on `31a`, row 8 on `32a`, row 9 on `39a`, row 8 on
`40a`, and the open-and-close row on `42a` and `45a`. A re-aim that had quietly stopped measuring
would have looked identical up to that point.

**A background sweep from before the context break was never actually dead.** It was still appending
to `sweep-progress.txt`, still taking ports 3100 and 5300 out from under the runs being started on
top of it, and it had left `savedrawsafterthemove` applied to `ActivityScores.js` — so the new
sweep stopped at `save` with *refusing to save 1 file that still holds a mutant*, which is the one
guard in the mutation script that turns this into a stopped run rather than a mutant measured
against another mutant. The fix was to kill the port listeners, confirm with `Get-Process` that no
node, python or stray bash survived, and `restore`. *A stopped test runner keeps its ports* was
already written down; what this adds is that it can keep a mutant too.

**The adjacent family is a ticket to file, not a paragraph to bury.** Seven row-detail fetches —
`const { x: current } = await getX(id); setEditing(current)` on `Departments.js:129`,
`Plos.js:217`, `Programs.js:113`, `ProgramSubjects.js:121`, `Rubrics.js:118`, `Subjects.js:124`
and `RubricCriteria.js:104`, plus `Offerings.js:156`, where `getOffering` answers into
`setViewing` — have the same defect with a different control in front of it: a second row's
แก้ไข pressed while the first is out. They are eight more sites and a different fix, and the
temptation to fold them in was real because the count had already moved once. *Defer adjacent work;
do not defer the second half of the sentence you are closing* (#119) — the twenty-two are the
sentence, and the eight are adjacent. They are written here with their line numbers so that the
ticket could be opened from this paragraph, which is the half of #119 that a deferral fails when
nobody can find what was deferred — and it was: **#139**. The other two halves of #133's own
sentence went the same way rather than staying prose: **#140** for the second callers of the #68
family, where a handler reloads with a pager or a filter beside it, and **#141** for the sixteen
that carry the flag with no row proving it. Three numbers, because the fixes are three and the
blast radii differ (#125).

**The second review round found the same family twice more, and the two answers are different.**
`Plos.openEditor` is one of the eight: its success path is unguarded, and the filter is live while
the read is out, so it reaches the *แก้ไข opens a form about an outcome the screen is not showing*
harm by a second route rather than through the stale list. It is deferred with the other seven
under **#139**, and the comment beside it now says so with the number — a deferral a reader of
that function cannot see is the same deferral nobody can find. (#139 measured that route and
found no such harm: the form is truthful about its own curriculum — see its story below.)
`PloMapping.choose` is not one of
them: it folds a saved cell into the grid unguarded, which is *a save's answer is a read* exactly,
but nothing can draw the stale cell. A cell carries the `outcome_id` it was saved under; a PLO
belongs to exactly one curriculum; every square is drawn from the outcomes of the curriculum on
screen. So no square can look it up — **structurally unreachable, not untested and not proved**
(#102) — and, like every unreachability, it has a date on it (#131): a screen that reads
`grid.mappings` for a count rather than by key makes it visible the day it lands. Both are written
down rather than guarded, because a guard no row can reach is a claim nobody can show to hold, and
`TeacherDashboard` is the precedent this ticket already set for excluding a site in writing.

## #139 — the ticket pressed one control, and four of them could take the form's place

**#139 named one way in on every screen and a second on `Plos`, and neither count survived
measurement.** The ticket, opened from #133's deferral paragraph, said a second row's แก้ไข pressed
while the first row's detail read is out lets the first answer replace the second form, and that on
`Plos` moving the curriculum filter while the read is out opens an outcome of the curriculum the
screen has just left. The first half was true on all eight sites. But the fix is a question — *is
this still what the form was asked to show* — and a question like that is written by **every
control that decides what takes the form's place**, not by the one the ticket pressed. Nothing in
the table is disabled while the read is out, so เพิ่ม and ลบ were each a way in of their own: the
late answer turned an add form into an edit of the first row, throwing away what had been typed, or
opened the first row's form underneath a question about another. And the success path was not the
only one — the same read, refused, put a red bar about one row over the form for another, which the
comment on `Departments.js` already names as the whole of #91. On the Offering panel the list was
five: another ตอนเรียนและผู้สอน, its refusal, เปิดรายวิชา, ยกเลิกการเปิด, and กลับไปหน้ารายการ
after a section write, because `refresh` is also how every section write reads the panel back.
**Four ways per list screen, five on the panel, and the filter row: 34 rows** on the first count, which
the review below made 46 — and *a row that
names two ways in is two rows* (#66), so one mutant per way, each required to take down its own row
and nothing else.

**The ticket's `Plos` claim was a mechanism the form does not use.** It came from #133's second
review round, written into a comment above `openEditor` and into the #133 story here. Read, the form
is truthful about itself: its หลักสูตร field is the outcome's own and locked, and its parent picker
asks for that curriculum's outcomes rather than taking the table's. What is left is a form the
person asked for opening after they looked elsewhere — which every filter and pager on these screens
does, not `Plos` alone. Whether that should cancel the ask is a question about the UI, so it went to
the person who owns it (docs/06 §Out of Scope) with a recommendation, and the answer was no. The
answer has a row — the form still opens after the filter moves, and still names its own curriculum
and offers its own curriculum's outcomes — and a mutant, `plosfiltercancels`, that is the other
answer. *The ticket's What is wrong is a claim from the day it was written* (#101's kind: a
mechanism that does not exist), and this one was the store's own claim, one ticket old.

**The first sweep of `plosfiltercancels` killed the right row in the wrong place.** With the mutant
the form never opens; the row then read `inputValue()` from a field that was not there, and
Playwright waits for a locator, so the row died at `Test timeout of 60000ms exceeded` rather than
at its `toEqual`. A timeout is a failure, and the count read *1 failed* like any honest kill, but it
says nothing about which claim broke — a mutant that stopped the application would have produced
the same line. The list rows never had this problem because `drawn` counts the heading before it
reads a field; the filter row was written separately and read the field unconditionally. **A read of
something a mutant stops from existing is a wait, not an assertion.** Rewritten to read the fields
only when the heading is there, the row failed at `toEqual` with `editing: 0`, which is its claim.

**The refusal rows had never been red.** They were written with the fix, so the TDD step that makes
the other rows trustworthy never happened for them: 25 rows red before the fix and 34 green after, so
eight of the green ones were never seen failing. (The 26th row of that first run passed on unfixed
code too, and should: the filter row holds a decision, not a defect, and `plosfiltercancels` is
its only proof.) `…refusallands` is the only evidence they can fail, and
it was swept before anything was ticked — all eight fell, each on its own screen alone. Two rows also
needed a fixture before they could be red for the right reason: the seed has one subject and one
placement, so *a second แก้ไข* had no second row on ข้อมูลรายวิชา and รายวิชาในหลักสูตร. The rows
built it themselves in `beforeAll` under `hold()` rather than waiting for `16a` and `18a` to leave
one (#129).

**The sweep ran per screen, not per suite, and the tree check was a checksum.** Thirty-five mutants
against the full 424 would have been eleven hours; each screen's rows of `139a` with that screen's
own specs, behind a clean baseline per group, took 56 minutes and still answers *did this mutant touch
another row of the screen it breaks*. Because the eight pages were uncommitted, `git status` after a
`restore` shows ` M` whether or not the mutant came back out, so the runner compared a checksum of
the eight files after every restore instead. And the change moved one other ticket's anchor —
`91:keepsaved`, whose anchor was the `setNotice(null)` that `asked.current = null` now stands above —
so it was re-aimed and swept against `14c`, where it still killed its one row. The anchor check was
also briefly, and correctly, red during the sweep: a mutant that is applied has no anchor to find.

**One comment was read from code and said so only after the measurement.** The ยกเลิกการเปิด row
claimed a late panel would turn the list's question into the panel's own dialog with the Offering's
cancellation behind its button. Re-sweeping `offeringscancelkeepsask` and reading the failure's
screenshot showed half of it: *ยืนยันการลบตอนเรียน*, no sentence, a ลบตอนเรียน button. The other
half — what that button would do — is `confirmRemoval` still reading `kind: 'offering'`, which was
read and not pressed, and the comment now says which half is which.

**The review found two more ways in, and one effect the fix had quietly removed.** The first fix
remembered the *row* a form was asked for. So แก้ไข pressed twice on the same department made two
asks the guard could not tell apart: after the second answer opened the form and the person pressed
ยกเลิก, the first answer matched the row and opened it again — and on the Offering panel an older
reading of the same Offering could be drawn over a newer one. An ask is a press, not a row, and the
guard now holds a fresh object per press. The count of controls had also stopped at the table's
edge: `ImportPanel`, above the table on four screens, takes the form off when an upload starts, and
a late answer then took the panel off the screen mid-upload. That is the rule this ticket had just
written into the index, met again one component further out — *list the controls that can take the
answer's place* includes the ones that are not in the row. And the guard itself had been written as
an early `return` in `catch`, which skipped the `await load()` after it: a refused, overtaken read no
longer reloaded the list, which is #131's effect gone with nothing to say so, because no row of this ticket asked
for it. **An effect that must always happen does not go behind one that can fail** — the guard now
wraps the sentence alone. Two more findings were real and were not this ticket's to fix: a
superseded read's `finally` still clears `busy` while another write is out, which the same guard
cannot fix without leaving `busy` stuck after เพิ่ม, and a section write's sentence can land over
another Offering's panel, which is a question about the UI. Both went to the tracker (#142, #143) with their
line numbers rather than into a paragraph here.

**One mutant now kills two rows, and that is the measurement, not a leak.** `…secondwins` lets any
later press overtake, so it kills both *a second แก้ไข* and *the same row pressed again* — they are
the same claim about presses, told apart only by which row was pressed. Rather than call that one
row, each same-row row has `…samerowmatches`, which turns the ask back into a row and kills that
row alone. The re-sweep ran 47 mutants in the same per-screen groups, 79 minutes, and every one fell
on the row its name gives. It also moved one more anchor, `23:nolanding`, whose re-sweep killed its
row at `openSubject`'s wait for a read the mutant stops from happening — `plosfiltercancels`' lesson
above, found in a mutant this ticket did not write. `offeringscreatedasksnothing`, which reads and does
not draw, is what now dies at that row's assertion. The same review caught `SETTLE_MS`'s comment
claiming timing could not decide anything; it can, and the comment now says the sweep is what stands
behind the number (#52, #136).

## #140 — the default said yes to every handler, and the pager was under all of them

**#140's table listed eleven screens and thirty-two handler sites, and the fix touched nineteen and
fifty-two.** The ticket was #133's deferral: the lists #68 guarded took their flag as a parameter
with a default, `isCurrent = () => true`, because the handlers called `load()` with nothing, and the
comment beside it had called *yes* the honest answer for a handler. #133 had measured that false on
two screens. This ticket was the rest, and it was right about the mechanism on every screen it named —
บันทึก, ลบ, an import, the refusal of แก้ไข all reload with the pager still under the person's hand,
and ถัดไป pressed while that reload was out drew page one under a pager reading page two. What the
count missed came from two directions. It listed **declared handlers**, so `Offerings`' กลับไปหน้ารายการ,
which reloads from an inline `onBack` in the JSX, was not on it: thirty-one reachable sites, not
thirty. And it listed **screens with a control**, which was the right filter for *where a row is
possible* and the wrong one for *what the change touches*: the default was on twenty-two files, and
removing it — so a forgotten flag throws rather than draws — reaches ten screens whose `load` asks
only for what the route names. Two of those were in the table; eight were not. Criterion 2 already
said what they get — *ยังไม่ได้ทดสอบ* with a reason and an expiry — so the ticket's own sentence
brought back what its table had filtered out. *A ticket's file list is a grep somebody else ran*
(#133), and here it was a census answering a narrower question than the fix.

**One control in the table was not a way in.** The ticket counted a `<select>` on `StudentGroups`.
It picks a student to add to a group; `load` depends on `[sectionId]` alone, so nothing it does can
change what a reload asks for. **A control on the screen is a way in only if it feeds what the
request asks for — read the dependency list, not the JSX.** The same reading answered criterion 5:
`GradingWeights.onImported` is not *ไม่ต้องมี*. An import reloads with the screen mounted, which is
every handler's situation; what the screen lacks today is a way to change `sectionId` meanwhile, so
the flag is unproved rather than unneeded, and the comment above `<ImportPanel` says that rather than
nothing.

**The guard compares `load`, not the values, and that choice has a price in proof.** #133 wrote
`Plos`' guard against its one filter. Here the lists ask for two to five things (`Offerings` asks for
page, programme, year and semester), and `load` is a `useCallback` rebuilt exactly when any of them
change — so `onScreen.current === load` answers the question once, uniformly, with no second list of
values to keep in step with the dependency array. The cost is the one #68 wrote about a shared hook:
a comparison that answers for every control at once is a comparison no mutant at the site can split.
Every row presses the pager, because it is the control every screen has; six of the nine screens also
have a filter that moves `load` the same way, and a filter row would be killed by exactly the same
mutant. *A row that names two ways in is two rows* (#66), so the filter is a ☐ row on those six sheets
— marked, not explained in prose (#50) — rather than six rows that add a situation and no separable
evidence. Those rows name #144, opened the same day, and measuring for it found a way in they had
missed: the search box on `Users` writes to the same `filters` as role and status.

**Every row waits for the reload to be sent before it moves the pager.** Without that wait, a
handler that reloads nothing would let page two answer with nothing late behind it, and the row would
pass for a reason unrelated to its claim — *a row that passes both before and after a fix was never
about it* (#125). With `waitForRequest` on the held read, a handler that forgets to reload fails the
row, and the row also asserts the held answer differs from page two's, so a page one that happens to
match cannot pass it either. Three rows needed their situation built before they could be red for
the right reason: a Rubric fixture with `display_order` −1 failed the form's own minimum, so บันทึก
never sent anything; กลับไปหน้ารายการ hid the list it was about to read unless the panel opened inside
`press`; and นำออก on the section's first student was refused — that student has marks — so the row
enrols a student of its own and removes that one. All thirty-two were red on unfixed code for the
defect's own reason before the fix.

**The sweep ran per screen, as #139's did, and every mutant fell at its own `toEqual`.** Thirty-one
mutants, each turning one site's flag into `load(() => true)` — `ploshandlerstalewins`' shape — ran
against their screen's rows of `140a` plus that screen's own specs, behind a clean baseline per group,
with a checksum of the nineteen uncommitted pages after every restore: 57 minutes, and each killed the
one row its name gives. `enrolmentreloadstalewins` killed two, which is the number it had to kill —
one site, two callers — not a leak (#52). Every kill was also read for *where* it died, because #139
had just shown a mutant can take its row down at a wait rather than at the claim: all thirty-one died
at `toEqual`. The group filter was built on the file name in each title, `(Users.js)`, not on the
Thai screen name, because a Thai regex through bash is the kind of argument that silently matches
nothing — and it was checked by listing what it kept before it was trusted.

**The change moved eight other tickets' anchors, and one of them no longer kills what its sheet
says.** `16:M9`, `21:staleafterasave`, `23:nolanding` and five `savenoreload`s all aimed at a bare
`load()`; `anchors.py` said so, they were re-aimed, and each was swept against its own spec. Seven
killed the rows their sheets name — `16a`, `21a` and `23a` are serial, so what follows the row
that died did not run, and those three re-sweeps say nothing about it (#67). `30:savenoreload` killed rows 3 and 5, where sheet 30's
table records rows 3 through 7 — 4, 6 and 7 by contamination, row 3 dying mid-write and leaving the
scheme at 50/30/20. The claim the mutant holds (row 3) still dies, at the helper's wait for a reload
that never comes, as the table says. Why the contamination is gone was not measured, so the cell now
carries both dates rather than a corrected number — *a survey of the store has a date on it* (#50),
and *an anchor check tells you a mutant no longer applies; only a sweep tells you it no longer proves
anything* (#107).

**Two more mutants had changed meaning with every anchor intact, and the review found them, not the
anchor check.** `25:addstaysonpage` and `25:importstaysonpage` anchor on `reload` and write `load()`
and `onImported={load}` in its place. Their anchors never moved, so `anchors.py` stayed green — but
what they *insert* called a `load` that no longer has a default, so each would now throw instead of
reloading the page the person is on, which is a different mutant from the one sheet 25 describes.
Re-aimed to pass the flag, both still died at `shown === 1` with 2. **A change to a function's
signature reaches every mutant that writes a call to it, not only those anchored on one** — grep the
replacement strings as well as the anchors. The same review caught the spec's own `finally`:
`page.unroute((url) => isHeld(url))` passed a new function, and Playwright finds a route by the
matcher compared with `===`, so the cleanup removed nothing; the matcher is now one function given to
both, and two of the thirty-one mutants were swept again against the changed spec and still killed
their rows.

## #144 — the mutant that could not split the controls was at the wrong end of the comparison

**#140 wrote that no mutant could tell the pager from a filter, and it was right about where it had
looked.** Its guard is `onScreen.current === load`, and every handler asks it; a mutant at the call
site, `load(() => true)`, breaks the answer for every control at once, so a filter row would die with
the pager row and add a situation but no separable evidence. That sentence had left the six filter
screens with ☐ rows. #144 asked for ten rows, one per control, and one mutant per control that kills
only its own — and the comparison has two ends. The other end is the effect that writes `onScreen`:
`useEffect(() => { onScreen.current = load }, [load])`. Narrow its dependencies to leave one control
out — `[page, report]` instead of `[load]` — and the ref stops following `load` when that control
moves and nothing else. **A comparison no mutant at the call can split is split where its operand is
written.** Before writing ten rows the idea was probed on one screen: the ref mutant killed the
Students filter row and spared both pager rows, and 140's call-site mutant killed the pager row and
the filter row together. Then the ten: each killed its own row at `toEqual`, and no pager row and no
other filter row, on every screen. `Users` needed the most care — search, role and status all write
one `filters` object — so its three mutants list the other two fields by name,
`[page, filters.role, filters.status]`, instead of dropping the object.

**Three of the ten also killed a row from the screen's older specs, and each one was a real kill.**
`11c` row 3 searches for an account before it suspends it, `18c` row 8 filters to 0503 before it edits
a pairing, and `17c` row 10 filters to 0503 and back to all before it adds two students. A ref that
does not follow a control does more than lose the race: it throws away *every* reload after that
control has moved, because the handler's `load` is never the one the ref holds again — and filtering
back to the same value builds a new `load`, not the old one. So those rows waited for a redraw that
never came, and the `loading` the discarded reload had set stayed set: `11c` at a `waitForResponse`
for a button that was never drawn, `18c` at `toHaveText('วิชาเลือก')` with *element(s) not found*
because the table was still *กำลังโหลด…*, `17c` at an `expect.poll` that read 173 where 175 was due.
The first two of those died at a wait rather than at a claim (#139), and none of the three cites these mutants, so
they are written on the sheets as consequences, not as proof. They also mean the old specs were
already partial evidence that the ref follows the filters. They were evidence for the case with no
race, and the ten new rows are evidence for the race.

**Two filters were drawn for nobody the seed signs in as.** `Subjects` draws its ภาควิชา filter
only for someone who reaches more than one department, but only a Department Admin reaches the screen,
and a Department Admin granted at a department reaches one. `Offerings` draws its หลักสูตร filter only
for someone who reaches more than one programme, but the screen belongs to the committee alone (a
Department Admin gets 403), and a committee granted at a programme reaches one. In both cases the
grant that draws the filter is a legal one. `assignable` lets a Central Admin grant any known scope,
so a Department Admin at the faculty, or a committee at department 05, reaches two. The rows move one
seeded account's grant to that scope for their own length. The helper, `widened`, asserts
`rowCount === 1` before it runs the body, so it never silently widens nothing, and it moves the grant
back in `finally`. *A seeded role needs the role's distinguishing property* (#87), and here the
property was the width of the grant, not the role. The first run of the file found the second case
at once: all three Offerings rows took a 403 at the screen's own `openOfferings`. That is the cheap
way to learn who a screen is for.

**The re-sweep of #140's call-site mutants measured the sentence #144 was opened on.** Against the
new rows, `userssavestalewins` and `offeringsrefusalstalewins` killed four each, the pager row and all
three filter rows that press the same handler. `subjectsrefusalstalewins`, `pairsrefusalstalewins`,
`rubricsrefusalstalewins` and `studentssavestalewins` killed two each, and the fifteen whose call
sites no filter row presses still killed one. A call-site mutant was never going to tell the controls
apart, and the numbers now say so on each sheet rather than in a paragraph.

## #142 — one flag, two kinds of work, and a release more careful than the code it replaced

**#142 was read from the code and was right, and its list of ways in was one short.** Eight screens
read a row afresh before opening its form or panel, and the read held the same `busy` flag as every
write. That flag disables บันทึก, the confirmation and the panel's section controls. The read's
`finally` put it down unconditionally, so a read that another แก้ไข had overtaken could land after a
save had started and give บันทึก back with the save still out. Measured on ข้อมูลภาควิชา at
`8bb9a92` before anything changed: red, as written. The ticket also asked for every place `busy` is
released to be checked on all eight screens (*a guard written for one caller is a claim about every
caller*, #68, #133). Listing the releases was not the useful answer. The useful question was **which
of the holders can start while the flag is up**, and two more orders were measured to answer it. A
read then ลบ: the confirmation opens disabled until the read lands. A save then ลบ: ยกเลิก is
pressable during the save, so the table comes back, but the confirmation opens disabled. So two
writes cannot overlap, because every control that starts one is disabled by the flag, and the only
thing that can put down another's hold is a read. A read can do that in two orders. One is the
ticket's, a superseded read. The other runs the opposite way: a write is out, what sent it is closed
with ยกเลิก, and a read started from the table lands. That read *is* the current one, so #139's
question (*is this still what was asked for*) answers yes, and the flag it puts down is the
write's.

**That reverse order has two ways in, and one of them exists on three screens only.** The
confirmation's ยกเลิก is never disabled, so the removal order reaches every list screen. The form's
ยกเลิก is a second way in, and on four of the seven forms (Rubrics, RubricCriteria, Plos,
ProgramSubjects) it carries `disabled={busy}`. Nobody had counted which. The row written for it on
all seven timed out at the ยกเลิก click on exactly those four when run against the old code. On the
other three, pressing แก้ไข on the same row after ยกเลิก sent the same save a second time, the
ticket's harm in its own words. So that is a fourth row on three screens rather than a second row
on seven, and *a row that names two ways in is two rows* (#66): the removal row stays on all seven.
One mutant, `…currentletsgo`, kills both rows where both exist, because both are the same line
putting down the same flag.

**The first fix was more careful than the code it replaced, and the review caught it.** The ticket
proposed counting outstanding work. A count would keep the second row's form disabled until the
first row's discarded read landed, which is a change to what the screen disables, and docs/06 makes
that a question rather than a fix. So the fix split the flag in two: `writing` for writes and
`reading` for reads. But the first version gave `reading` the press that picked it up and let a
read put it down only if it was still that press. The standards and spec reviews, working apart,
found the cost of that from two sides. The spec review found that a read overtaken by another now
left the flag up until the later one landed, where the one flag had come down at once. That is the
same kind of change the counter was rejected for, and it came from a clause that did nothing for
the double send, because `reading` never gates `writing`. The standards review found the same
clause from the other side: no mutant touched it, and replacing it with an unconditional release
left every row green. **A release more careful than the code it replaced is a change to the screen
too, and the clause no mutant can reach is where to look for one.** Now `reading` is a boolean the
read puts down unconditionally, as it did the one flag. The only thing that changed is that it no
longer puts down `writing`.

**The row that holds the ticket's reason never went red.** The third row on each screen is a read
that ลบ took the place of, and it must still free the confirmation when it lands. #139's guard,
copied onto the release, would leave that confirmation disabled for good; the ticket said so. That
row passed before the fix and after it. It exists to catch the wrong fix, not the defect, so the
mutant `…letgowhileasked` (#139's guard on the release) is the only evidence it can fail. The other
two mutants put `setWriting(false)` back into the read's `finally`, split by the one question that
separates the two orders (`asked.current !== ask` and `=== ask`), which is why each kills a
different row and all three share one anchor.

**Only one row still reads on a timer, and it was measured slowed down.** The rows hold a request
with `e2e/support/gate.js` until the row calls `open()`; a two-second delay, as in `139a`, would be
racing a form, a press and a write. The second and fourth rows read the button once the form the
read opened is drawn. The read's `finally` runs in the same task as the `setEditing` that draws the
form, and React commits the two together, so the drawing is the settle point (#132). The first row
has no such point. The overtaken read draws nothing, and nothing on the screen marks a flag that was
rightly left alone, so it reads the button 250 ms after the answer is handed over. That number can
decide the result (#52). The first version of the file cited #136 for it without doing what #136
says, and the review caught that. The fix was to do it: each first row's mutant was run with the
renderer slowed six times, the baseline passed, and all eight mutants still died at `isDisabled`.

**The sweep ran one screen at a time, twice.** Each screen's three mutants ran against its rows in
`142a`, `139a` and `140a` plus its own older specs, with a clean baseline before each group and a
checksum of all eight pages after every `restore`. All 24 mutants killed only rows that carry their
name, every kill at the row's own assertion and none at a timeout. The older specs, and the `139a`
rows that share the functions these mutants touch, stayed green. `139a` asks which form is open and
never reads a button the flag disables, so the two tickets anchor in the same functions without
holding the same claim. The reverse sweep was not run: nobody has measured whether #139's or #140's
mutants kill a `142a` row, and `mutation/142-busy-outlives-a-superseded-read.py` says so.

**The review also found a defect #142 does not cause, next to the one it fixes.** On the three
screens where the form's ยกเลิก is pressable during a save, a save that *succeeds* after ยกเลิก and a
fresh แก้ไข runs `setEditing(null)` and closes the form that was opened since. *A save's answer is a
read* (#133), and this one asks nothing. #142's rows cannot see it, because every held write is
refused.

## #106 — "match the other screen" named an answer, not a way to get it

**The ticket was right, and its acceptance line pointed at a mechanism this screen cannot use.** The
หลักสูตร column of รายชื่อนักศึกษาของรายวิชา drew `program_id` raw, and the ticket asked for the name
*matching what ข้อมูลนักศึกษากลาง shows*. That screen turns the id into a name with
`listReachablePrograms` — the programmes its account can reach, from `/api/students/programs`, which
answers DEPT_ADMIN only. A Teacher, whose screen this is, is refused there. Copying the other screen's way
would have put a refusal banner over a column still drawing the id through its `?? programId` fallback,
while looking in the code like the fix. So the name comes with the student:
`program_name_th` joins `RETURNED` in `enrolment.js` as a subquery, one place for the two `FROM`s that
return a student (the page and the answer to one enrolment). The screen reads it. **A ticket that says
*match the other screen* has named the outcome; whether the other screen's route to it is open to this
screen's role is a separate question.**

**Handing a gap to the other seam is a claim about the other seam's fixture.** The first browser row
read the page against `programs` and said, in its own comment and on the sheet, that it could tell a name
from a code but not one programme's name from another's — *which the backend suite asks per student*.
The backend test did compare each student one by one, but against the same seed, and every seeded student
is in 0501. Both rows would have passed a route that named 0501 for everyone. Worse, 0501's name is also
department 05's, so they would have passed a route that named the department. The review found it by
asking what the seed holds, not what the test does. Both rows now write one student of 0503 into the
register and the section, and assert that the page holds more than one programme before comparing, then
take that one code out again (#134). The fix is two edits, so it had two mutants (#125): `25:programid`
puts the code back on the screen, and `25:programidfromroute` has the route return the code under the
name's field. Those two vary *name or code*, and #96 says what that means: they cannot see a third
property. `25:oneprogramme` pins the subquery to 0501 — a name, always the same one — and only the fixture
can kill it. **A gap one seam hands to another is closed only if the other seam's world can express it; two
seams fed by one seed share its blindness.**

**The mutant census had not been counted since #131.** Updating #25's line in `mutation/README.md` meant
reading the table, and five files were not on it: `133`, `139`, `140`, `144` and `142`. The last was left
out by the commit before this one. The table summed to its own total of 529, which is why nothing looked
wrong; the files summed to 650. *A hand-kept number in a file that grows every ticket is already wrong*
(#119) — and a table can be wrong by missing rows while agreeing with its own total. The check that finds
it compares the table's file names with `ls mutation/[0-9]*.py`, not the sum with the total.

## #127 — the key was named for the window; the sentence never was

**The ticket's diagnosis held, and its forecast did not.** An Activity's `readDate` checked the shape
and asked `Date.parse`, so `2569-09-30` was filed five centuries out and `2026-02-31` became 3 March —
both measured again before anything changed. The ticket then predicted the fix's shape: the range could
be shared, but #125's sentences *name a validity window, which an Activity's deadline is not — so a
third sentence is likely*. The sentences read `ปี 2569 อยู่นอกช่วงที่รับได้ หากกรอกเป็น พ.ศ. ให้ใช้ ค.ศ.
2026 แทน`, and nothing in them names a window. Only their keys did — `validityEra`,
`validityYearRange`. So the fix reused the sentences and renamed the keys to `yearEra` and
`yearOutOfRange`. **A key's name is a claim about its text; read the text before writing a second
one.** It is the eighth way a ticket's diagnosis has been wrong, and the cheapest to catch. The ticket's
file list was the familiar kind too. It named `activities.test.js`, which tests the read, and the writes
are tested in `activity-editor.test.js` (*a ticket's file list is a grep somebody else ran*).

**Sharing the rule cost three anchors, and a call-site mutant per caller kept what it would have cost
the proof.** The range and the choice of sentence moved from `users.js` to `lib/year.js`. The reading
stayed in each route, because the two contracts differ on purpose: one takes a day, the other a
timestamp too. #68 warns that one helper behind many callers turns many claims into one that no mutant
can split. What answers that here is keeping a mutant at each *call*. `125:eraisaccepted` was re-aimed
at the call in `users.js`, and `127:activityeraisaccepted` sits at the call in `activities.js`. Each
kills only its own route's rows. The mutants on the range itself (`alwaysoffersconversion`,
`edgesarerefused`) moved with it. Re-swept, they kill the same 6, 2 and 1 subtests as on 9 September,
and `alwaysoffersconversion` now kills an Activity row as well — so #125's docstring sentence *nothing
outside `users.test.js` died* became untrue the day the code moved, and was corrected in the same
commit (#123: a mutant in shared code kills where the code is shared).

**The ticket asked whether accepting a timestamp was a defect, and the answer is no, with the reason
written down.** The columns are `timestamptz`, `readDate`'s own docstring accepts a timestamp on
purpose, and no caller sends one today. Refusing timestamps would change a contract for nothing. What was
wrong is that a timestamp slipped past the calendar and the year. Both are now read off its day, and
`127:dayistext` reads the calendar off the whole string instead. It does not refuse a timestamp: it
throws on one and the route answers 500, killing the three rows that send one. That is a mutant that
proves the day's slice is load-bearing, not one that shows what refusing timestamps would look like, and
the first draft of this story said the second.

**The review found two more mistakes of the same species, which the ticket had not listed.** The
calendar was asked before the year, in both `readDate`s. A Buddhist leap year is one where the year
minus 543 divides by four, so read as a common-era year it is never a leap year. `2567-02-29` exists,
since it is 29 February 2024, yet it was refused as a day that does not, and the person never got the
sentence that would have told them their mistake. The order came with #125, so `users.js` is fixed too,
and a mutant per file puts the old order back. The other mistake: the tail after the day was `[T ].*`,
and `Date.parse('2026-09-30 junk')` answers a number because V8 reads "jun" as a month. The string
reached the column as 22007, under a docstring that said it could not. Both are *a guard strict about a
format cannot see a mistake about meaning* (#124) again. Two guards each check their own thing, and the
order they are asked in is a claim of its own.

**Two kills in unrelated files were port exhaustion, measured.** The fifteen-mutant re-sweep lost five
`weights.test.js` rows and three `subjects.test.js` rows. The first of each died at `connect
EADDRINUSE` on supertest's ephemeral port, and against those files alone the same mutants pass. That
is #52's *read the names for a leak*, with the leak outside the code.

## #110 — the pass line is the source, because it is the one that is applied

**The ticket's diagnosis held, and its address had aged.** It named `routes/learningDetails.js`, where
#38 wrote `PASS` and `BAND_FLOORS`; both moved to `lib/attainment.js` when #42 needed them one level up,
and the lib's own comment already cited #110. It also named one flag site. There are two: the heatmap's
cell and `cellsFor` in `programResults.js`, which draws the programme-level screens. The fix being in the
lib reaches both, which is the only reason one proving row is enough. The review found a third reader
the ticket never named: #36's and #37's screens print `band_floors[1]` as *the line one student passes
one outcome at*. Before #110 that sentence would have followed a colour's edge while the real line stood
still. It is true by construction now, and it is the clearest case for the direction chosen below.

**The ticket asked which of two rules is the source, and the answer is the one with consequences.** The
pass line decides every pass rate, every Y and N, the attention list and the criterion #40 prints. The
band's floor decides a colour. Written with the band as the source, moving a colour's edge would move
every verdict on every report without the edit saying so. So `BAND_FLOORS` reads `[0, PASS, 3.5, 4.0,
4.5]`, and the cost is stated in the sheet: the lowest band can now move only by moving the pass line.

**A latent defect is proved by moving what it waits for — #131's *a defect unreachable today has a
date on it*, with the date brought forward on purpose.** At the shipped line `PASS` and the
literal it replaced are both three, and no row can tell them apart. The ticket said so, and it is true
of mutants too: writing the literal back is a mutant that survives everything. So both mutants move the
line to 3.2. `floorisliteral` also writes the literal back and kills the same-line row. `passmoves` moves
only the line and is the control: the same-line row stands, and the two rows that pin the band at 3.0 by
number die. That second fact is the one that shows the band followed the line, and not that nothing
moved. Swept against the whole suite, as #123 asks of shared code, the band followed
the line on four screens: `passmoves` killed 14 subtests in five files, five of them rows that pin the
band at 3.0, and `floorisliteral` killed 10, of which only the same-line row is about the coupling. The
same `passmoves` on the code before the fix killed the same-line row, which was the red before any code
changed (*two mutants that vary the same property cannot see a third*, #96, and *a
defect nobody can see needs a mutant*, #111, met again).

## #146 — the save's answer closed whatever form it found

**A save's answer is a read, and #133's rule reaches the end of the write as well as the start.**
#139 gave every read that opens a form an `asked` ref, because a read is torn down by nothing and its
answer can arrive on a screen that has moved on. A write is torn down by nothing either, and `save`
ended with `setEditing(null)` and a banner, both unconditional. So the answer to a save sent from one
form closed whatever form was open when it landed — the one the person had opened after pressing
ยกเลิก, with whatever they had typed into it — and put *บันทึกข้อมูลเรียบร้อยแล้ว* where it reads as being
about the record they were looking at rather than the one they had left.

**The ticket named three screens; the code said twelve.** The ways in are not the same on all of them,
which is why the count could not be taken from the three. On the four list screens the form replaces
the table, so a second form needs ยกเลิก first and then แก้ไข or เพิ่ม… — two ways, two rows (*a row that
names two ways in is two rows*, #66). On the seven screens that draw a form above a list they never
blank, another card's pencil takes the form's place with no ยกเลิก at all, which is why
หลักฐานการประเมิน is not safe for having disabled its ยกเลิก: the control that was disabled was not
the way in. การเปิดรายวิชา has one form and no แก้ไข, so its way in is its own button pressed twice —
the same way #139 had to name. And แผนพัฒนาต่อเนื่อง has a control none of the others have: the outcome
picker, which closes the form while not being a form control, and would have put *บันทึกสรุปผล…แล้ว*
under an outcome nobody had written a word about.

**The guard the screens already had is the wrong shape for a banner drawn after a reload.** On the list
screens the sentence is set before `load`, so one `if (showing.current === sent)` covers the close and
the sentence together. On the other seven it is set after, so the answer has to be carried across the
await in a local — `const mine` — because `showing.current` is `null` by then, written by the close
itself.

**The clause that guards a window nothing can reach is not a margin; it is a claim neither place can be
shown to hold** (#97). The first draft of those seven asked again after the reload, on the reasoning
that the reload is a second chance for the screen to move on. The row written to build that window timed
out looking for a control: all seven draw `{!loading && data && …}`, so the list, the form and every
button are off the screen for the length of the reload and there is nothing left to press. Measured, not
argued — and the answer is *structurally unreachable*, which is one of the three things a clause can be
(#102), and the clause came out.

**What the rows could not say is where the neighbours were.** Two rows had to be re-aimed at what #146
claims, and each re-aiming is a defect of its own, opened as #147 and #148. `EvidenceForm` initialises
its state once, so pressing another file's pencil while a form is open leaves the first file's values in
it — the row therefore reads whether the form is *there*, not what is in it. `EntrySection` re-seeds its
draft whenever `entry` changes identity, so the reload every save ends with clears what was typed into
another section's box — and **#146's own fix is what made that reachable**, because before it nothing
could leave a form open across a reload. *A defect that is unreachable today has a date on it, usually
moved by another ticket's fix* (#131), met from the other side: this time the fix is the thing that moved
the date. Both were written down the hour they were found, because *a deferral written into prose and not
into the tracker is a decision nobody can find* (#119) — and a re-aimed assertion is exactly that kind of
deferral, since the row still passes and says nothing about what it stopped asking.

**A change this wide reaches mutants that were never about it.** `anchors.py` found twenty-three broken
anchors across nine sheets — #139's `secondwins` and `addkeepsask` on three screens, #140's
`savestalewins` on five, and one each in #23, #27, #28, #29, #31, #33 and #91 — because #146 turned
one-line handlers into blocks and put a guard around lines those mutants quote. Each was re-aimed to keep
its own claim, and *the replacement string matters as much as the anchor*: #91's `keepcancelled` replaced
ยกเลิก's whole handler, so its replacement had to carry every line #146 left in it or it would have been
two mutants in one. At the time that included a `showing.current = null`, which the advisor's answer
below took out of ยกเลิก again — the mutant was re-aimed twice, once per meaning of the ref. Seven of
the nine share their words with screens #146 did not touch, so the repair was made one mutant at a
time by name; replacing by the string alone would have broken the four screens that had not moved.

**The sweep found the row the ticket had not written.** Twenty-five mutants, one run of the whole file
each: every one killed the rows it names — two on each list screen, because both ways into a second form
are the same clause, and one each everywhere else — and nothing else, save the intermittent row below.
One survived. `improvementrefusalwins`
came back twenty-eight of twenty-eight, and the reason was not the guard: แผนพัฒนาต่อเนื่อง was the only
one of the twelve whose describe had no refusal row at all. The mutant had nothing to kill. That is the
plainest form of *a survivor on a row nobody suspected is an overclaim* (#97) — the sheet would have
claimed the refusal on that screen was proved, and only the sweep could say it was not. The row was
written, the same mutant then killed it, and the baseline is twenty-nine rather than twenty-eight.

**The thirteenth screen was the one the ticket's grep could not have found.** #146 named three
screens and listed twelve more, and the list was a grep for `setEditing(null)` — *a ticket's file
list is a grep somebody else ran* (#133). ข้อมูลนักศึกษากลาง has nothing to edit, so it holds one
boolean called `adding` and appears on no list the ticket carried. It was found by asking the question
the other way round: which screens have a `save` and no `showing`. That question returned seven,
and six of them answered for themselves — `Plos`, `ProgramSubjects`, `Rubrics` and `RubricCriteria`
draw the form *instead of* the list and disable ยกเลิก while a write is out, which #142 measured, so
while a save is out there is no control on the screen that can take the form's place; `GradingWeights`
has no form and its own comment already says nothing there can change what a reload asks for; and
`ActivityScores` guards its grid and reads the name in its sentence out of the handler's own closure,
so the sentence names what was saved however far the picker has moved. The seventh was the defect,
and its way in is one control shorter than the four list screens' — no แก้ไข, so ยกเลิก and then
เพิ่มนักศึกษา. Two rows, red before the ref and green after it, and two mutants.

**The intermittent row had a mechanism, and a CPU throttle was what said so.** Three rows of
แผนพัฒนาต่อเนื่อง failed three times across the first sweep's twenty-six runs, always at sixty seconds,
never when the describe ran alone; five clean runs of the whole file could not reproduce them. Under a
renderer slowed six times all three failed at once, and at one line: the read that chooses between
เขียน… and แก้ไข…. `openPlan` waits for the answer and not for the drawing (#132) and `count()` does
not retry, so on a slow draw the read lands before either button exists, takes the second branch, and
waits out the timeout for a pencil that was never going to be drawn. *A race between an answer and its
drawing is measured by slowing the renderer, not by rerunning the row* (#136) — the rerun said flaky
five times and the throttle gave the answer on the first try. The fix is one line, `await
expect(start.or(change)).toBeVisible()`, and it belongs in `support/improvement-screen.js` as well: the
branch #146 copied was the shared helper's, which every row that writes a section runs.

**A background run that is stopped is not a background run that has stopped.** `TaskStop` on the shell
that was running suite-then-sweep left the sweep's python alive, applying mutants and running specs on
the same two ports for another quarter of an hour. It was found by the harness rather than by the
process list: `save` refused, saying a file still held a mutant, and the record it refused on named a
different file a minute later. Nothing measured while it ran can be trusted — that run's numbers were
thrown away and the sweep redone — and the tree was checked directly rather than by asking the record,
by loading every sheet's `MUTANTS` and looking for each replacement string in the file it belongs to:
six hundred and ninety-three edits, none of them in the tree.

**The row the fix broke was the one no sweep could see.** The whole browser suite came back five
red out of five hundred and thirty-three, and three of them were one row of #142 on three screens:
*a read of the same row after ยกเลิก leaves บันทึก disabled while its save is out*. That row presses
ยกเลิก, opens a second form, and then waits for the first save's refusal to appear — which is
precisely what #146 had just made impossible, on purpose. Twenty-seven mutant runs could not have
found it: every one of them ran one spec file, and the row lives in another. *A sweep cannot see the
row your own fix breaks — only the clean suite can* (#83). What the row is about is the flag, which
is put down either way, so the settle point moved from the sentence to `await write.answered`, and
the three sheets say why on the row. The two mutants cited against that row were then re-run, because
an anchor check says a mutant still applies and only a sweep says it still proves something (#107):
`142:<screen>currentletsgo` still kills two rows on each of the three screens, the removal row and
this one.

**Three numbers on the sheets were wrong, and all three were found by reading the log instead of
the memory of it.** The thirteen #146 sections each end with *what holds it is the sweep below*, and
twelve of them had nothing below — only ข้อมูลนักศึกษากลาง, written last, carried the `### มัตแตนต์`
the sentence points at. Going back to the sweep log to write the other twelve turned up two more:
the baseline was twenty-eight and not twenty-nine, because the row that made it twenty-nine was
written after that sweep; and `behaviorsclosewins` and `criteriaclosewins`, recorded as killing two
rows each, killed one. The second name in each pair was a row of แผนพัฒนาต่อเนื่อง — the intermittent
one — and the tell was in the same line as the count: 2.6 minutes against every other run's 1.6,
which is a sixty-second timeout, not a kill. *Before reading a kill count, read the names* (#52),
and that holds for a count that looks like a kill as much as for one that looks like the suite.

**The third was a ⚙ nobody had earned.** `improvementrefusalwins` survived twenty-eight of
twenty-eight because that screen had no refusal row; the row was written the same day, and the sheet
then said *the same mutant then killed it*. Nothing had been run. Writing the row is what makes the
claim testable, not what tests it — the mutant was applied again against the new row and killed it,
one of thirty-one, and the sentence now says which run says so. An overclaim found by a sweep is
answered by a measurement; the row is only the thing being measured.

**The review's hardest finding was answered by writing its row and watching it fail at the click.**
A standards reviewer read the three list screens and saw that `showing` is written where แก้ไข's
read *lands*, not where it is *pressed* — against the rule in this file's own index, *ask by the
press and not by the row* (#139). The window it described is real on paper: press บันทึก, press
แก้ไข on another row, and until that row's read comes back the ref still names the first form, so
the held save finds its own ask and puts its sentence up for the read to draw a form underneath.
The fix was three one-line moves, and it cost three of #139's mutants their re-aim, because moving
the write restores the one-line `if` they were anchored on before #146. Then the row that proves it
failed on all three screens at `locator.click`, sixty seconds, with no assertion reached: these
screens draw `{editing ? <Form/> : <table>}`, so while a form is open there is no other row's แก้ไข
to press and no เพิ่ม either. The only control that can take the form's place while a save is out is
ยกเลิก, which writes `null` at the press. The window cannot be entered — *structurally unreachable,
not untested* (#102) — so the code went back, the three mutants were re-aimed again, the row came
out, and what stayed is the paragraph in `Departments.js` saying why there is no row. A finding
worth an hour: the answer is now written down where the next reader of that code will find it, and
the way it was settled was to build the situation and let it fail, rather than to argue.
**The question the ticket parked was the advisor's, and the answer changed what the ref means, not
what the guard says.** #146 made an overtaken save say nothing at all — and left one case as a
question: press บันทึก, press ยกเลิก, open nothing, and the person is told nothing about a write
they made. The ticket called it *a UI question of the same kind as #143*, which is `docs/06`
§Out of Scope saying whose it is. The answer came back: **show it as before when nothing has taken
its place.** The obvious way to do that is a wider comparison — `=== sent || === null` — on thirteen
screens, at two sites each, with a clause every mutant on the sheet would have to be re-aimed
around. It is also the wrong way, because the comparison was never wrong: the *ref's meaning* was.
`showing` stopped meaning *which form is open* and started meaning *the last thing that opened on
this screen*, so ยกเลิก stopped writing it and so did the save that closes its own form, and `null`
was left meaning only *nothing has opened here yet*. Every `showing.current === sent` in the
thirteen files is the character it was; twenty-six mutants kept their anchors, and the twelve new
ones simply put back the line ยกเลิก had lost. *When a guard has to widen, ask first whether what it
reads is what is wrong.*

**Two screens said the meaning was not uniform, and both said it in code that already existed.** The
outcome picker on แผนพัฒนาต่อเนื่อง writes the ref when it moves — it closes the form without being a
control of the form — and under the new meaning *closed and nothing open* is exactly what speaks, so
leaving it at `null` would have put บันทึกบทสรุปแล้ว under the heading of an outcome nobody had
written a word about. It writes an opening of its own instead: moving the screen is somebody taking
it. And หลักฐานการประเมิน cannot reach the new case at all, because its ยกเลิก carries
`disabled={busy}` — the twelve rows the answer added have no thirteenth, and that is *structurally
unreachable rather than untested* (#102), not an omission.

**The window the review asked for opened the moment ยกเลิก stopped writing.** The row that had timed
out at the click — บันทึก held, แก้ไข on another row, the save answering inside that row's read — was
unreachable only because ยกเลิก wrote `null` and the form was the only thing on the screen. With the
ref left alone, cancelling puts the table back while it still names the first form, and the window
is two presses away. So the write moved to the press after all, the three #139 mutants were re-aimed
again, and the row that could not be built was built, is green, and has three mutants of its own.
*A defect that is unreachable today has a date on it, and what moves it is usually another
decision* (#131). The reviewer was right about the code and early about the calendar — and the
measurement that said otherwise was true of the code as it stood that hour, which is the only thing
a measurement is ever true of.

**A grep run while a sweep is running greps somebody else's mutant.** Waiting for the whole
sheet to be measured, I read `Offerings.js` and found its refusal asking
`showing.current !== null` where the other twelve ask `=== sent` — which under the ref's new
meaning is a real defect, since a second เปิดรายวิชา would let an overtaken refusal speak over the new
form — and `anchors.py` agreed, reporting `offeringsrefusalwins` bound to nothing. Both were
the sweep's own doing: that mutant *is* that replacement, and the harness had it applied in the
tree at the second the grep ran. The log settled it a few minutes later by killing exactly the
row the mutant is for. The rule about not editing while a sweep runs has a twin that is easier
to break, because reading feels free: **while a sweep is running the working tree is the
harness's and not yours**, and an anchor check over it reports the applied mutant as a missing
anchor. What is read from it is thrown away with whatever was measured beside it.

## #145 — the copy had none of the identifier's letters in it

`OUTCOME_PASS_PERCENT` is what `outcomePassed` applies, and the comment beside it says it is
exported **to be printed** and never to be applied again. Two screens printed a sixty of their
own instead: #36's note under the table and #38's sentence over the attention list. The ticket
was right in every particular, which is worth saying because most are not — its address held, its
two quotations were still on the screens at HEAD, and the routes still sent nothing for BR-17.

**The grep that finds a copy is for the value, in every spelling a screen can write it.** Grepping
the identifier across `frontend/` finds the fix, never the defect: the guilty screens contain none
of its letters — that is what makes them guilty. `ร้อยละ 60` found #36's, `60%` found #38's, and
neither pattern found the other. The ticket said so in as many words (*search for the identifier as
well as the digits*), and that sentence was the load-bearing one. A copy of a rule is invisible to
every search written in the vocabulary of the rule.

**A row that pins today's value and a row that says the screen reads the rule are two claims, not
one — and the control is what tells them apart.** Both new rows at the HTTP seam assert
`pass_percent` is 60, in the house style of #40's `assert.deepEqual(body.rule, {…pass_percent: 60})`.
Both die under `percentmoves`, the control that moves the rule to 55 and changes nothing else. The
two browser rows read the number out of the answer and compare it with the sentence on the screen,
and both **stand** under the same mutant. That is the whole of what this ticket bought: at the
shipped value the typed sixty and the rule's sixty read identically, so only a mutant that moves
the rule can see the difference — which is #110's shape one rule over, and the reason all three
mutants here move it.

The sweep: `145:resultspercentistyped` kills 1 of 36a's 6, `145:detailspercentistyped` kills 1 of
38a's 10, each the row it was written for and nothing else; `percentmoves` leaves all 16 standing
and kills 6 rows in the backend suite of 750 — one of #40's, three that test the sixty-per-cent
boundary, and the two this ticket added. A sixth of the backend rows that mention sixty turned out
to mean *the value is 60*, and none of the browser rows did.

**A row that names three numbers is a claim about three numbers, and the review is where that
was noticed.** The criterion written for #36's note says *all three numbers in the sentence match
the answer* - two shares and the pass score. `resultspercentistyped` restores the two shares and
nothing else, so the third clause had no mutant, and none could be borrowed: every mutant in the
store that moves a rule moves the answer and the screen together, which is exactly the property
this ticket bought. The clause was true, untested, and marked ⚙ - the mark CLAUDE.md says to
distrust most. The fix was a fourth mutant of the same shape one number over,
`resultspassscoreistyped`: type the score as a literal *and* move `PASS` to 3.2 so the literal is
wrong. It kills one of 36a's six, and `38:passmoves` - the line moved alone - leaves all six
standing, which is what says the screen reads `band_floors[1]` rather than printing a 3.0 of its
own. Borrowing the control from another sheet rather than writing a second copy of it is the same
reasoning as *two places holding one opinion is not a safety margin* (#97), read for controls.

**A claim about collisions ages like a number does.** `38-learning-details.py`'s `FILES` carried a
comment saying no other file held `backend/lib/attainment.js` — true when #123 put it there, false
the moment `145-pass-percent-printed.py` was written, and it would have stayed there being read as
permission to sweep the two together. The census one-liner in `mutation/README.md` answers it in a
second; the comment took a ticket to notice. *A hand-kept number in a file that grows every ticket
is already wrong* covers hand-kept **claims** too.

## #130 — the dead control three other rows were standing on

`GrantsPanel` drew *ยกเลิกบทบาท* on the reader's own grants exactly as it drew it on everybody
else's, and pressing it could not succeed: `backend/routes/grants.js` refuses on
`userId === req.auth.userId`. #84 closed that identical shape one screen over — `disabled`, a
`title` copied from the refusal, three mutants — and deliberately did not close this one. The
reason was a count: `statusisjustforbidden` killed no browser row, and `revokeisjustforbidden`
killed three, because `12a` row 6, `111a` row 3 and `121a` all pressed this button **in order to
obtain its refusal**. Removing it meant finding those three another refusal, which is a decision
rather than a tick, so it was written into the tracker as a ticket and not into a paragraph.

**So this is *a row that needs a defect to be reachable must be rewritten the day it is fixed*,
arriving six weeks later with the bill.** The rule is already in the index (#67, #96) and this
ticket is what it costs when the row belongs to somebody else's sheet: three rows, on three
sheets, two of which had nothing to do with revoking anything — one is about a live region and one
is about scrolling a banner into view. `121a`'s comment even explained itself, in the words the
rule predicts: *"the one refusal this panel can be given without writing anything"*. A test that
passes because of a defect tends to say so in its own comment, and this one had been saying so
since the day it was written.

**The ticket offered three ways out and two of them were gone before the question was asked.** It
proposed driving the refusal from a scope the administrator does not reach, from a role they may
not assign, or from a new fixture. The first two are not reachable from this panel: `reachable()`
filters the account list by scope **and** by seniority, so every account a department
administrator can open holds only grants inside that department, and the add-picker offers only
combinations the server would accept. Re-granting a role that is already held is
`ON CONFLICT DO UPDATE` — a write, on a schema every other spec shares, which is the thing
`121a`'s sentence was protecting. What the measurement did was turn a three-way question into a
one-way one, and the remaining question — *may the seed grow an account?* — is the user's, because
the seed is the world every seam is handed.

**The fixture went into the seed and not into a test file, and both seams are why.** `U_CROSS` is
a person inside department `05` whose only grant is over `01`: `dept.admin.05@` reaches the
account and is refused its grant. One row in `db/seed.js` is read by the new backend test, by
`12a`'s control row, by `111a` and by `121a` — *a fixture built inside one test file is one no
other file has* (#87), and four files wanted this one.

**And the branch it reaches had been in the route since #12 with nothing able to touch it.** The
revoke refuses `scopeNotYours` when the grant's scope is outside the caller's, and no seeded pair
could produce that, because reaching a person and reaching their grants had never come apart in
the seed. The new subtests pin the two questions apart on purpose: 200 to the read, 403 with
`scopeNotYours` and explicitly **not** `userNotFound` to the revoke, the grant still held
afterwards, and 404 `userNotFound` to `01`'s own administrator, who reaches the grant but not the
person. Five rows for a guard that green suites had never once executed.

**The control mutant is what makes *this row only* a claim.** `alwaysenabled` is the defect and
kills the new row; `everyrowisdead` disables the whole column, and without a row that opens
somebody else's account and asserts the button is live, killing every button in the table passes
every claim this ticket makes. The condition is not computed per row — the route refuses on the
account in the path and never reads the grant, so if the panel is about the reader then every row
of it is dead, and a per-row version here would be a rule the route does not have.

**`everyrowisdead` kills three rows, not one, and only a sweep of three files says so.** `111a`
and `121a` press that button on `U_CROSS`'s row to get their banner, so a column of dead buttons
takes them with it. A sweep of `12a` alone reports 1, which is a lower bound — *when a mutant
lives in shared code, its sheet is one of the places it kills, not the list* (#123), read from the
other end: the sheet was right about which row it was written for and wrong about the number.

**And the fix expired a number on three sheets.** `83:revokeisjustforbidden` killed three browser
rows on 10 September; re-measured on the 20th it kills one, the row that reaches the route *past*
the disabled button — which is the shape `statusisjustforbidden` has had since #84, arriving here
by the same route. *A survey of the store has a date on it, and a successful fix is what expires
one* (#50, #85). The number was correct on `docs/acceptance/11-user-accounts.md`,
`docs/acceptance/12-role-grants.md` and `mutation/83-refusal-that-names-the-rule.py`, and wrong on
all three the moment the button went dead.

**`isSelf` is read from the shell's profile, not from the prop.** The prop is the row the list
handed over and carries no mark saying who is looking at it. `profile` is null until `/api/me`
answers, and a null id matches no account, so the buttons are live for that moment — the same way
round #84 chose: a button wrongly live is refused by the server, where a button wrongly dead is a
control nobody can get back.

**And the review found three more expiries the first sweep for numbers had missed — because two of
them were not numbers.** `mutation/52-access-ended.py` claimed `everyrefusalends` kills thirteen
browser rows and named `12a` row 6 among them; re-measured under the mutant on the 20th it kills
twelve, because none of the three rows that replaced row 6 asks the screen for a refusal any more —
two read a disabled button without sending anything, and the third fires `DELETE` through
`page.request`, which never enters `client.js`. `111a` and `121a` still die, having only changed
account. The other two were prose: `mutation/84-own-row-controls.py` still said in the present
tense that the grants panel is *deliberately untouched*, although the twin copy of that very
paragraph in `84a-own-row-controls.spec.js` had been rewritten in the same change; and
`docs/acceptance/57-pager.md` cited `GrantsPanel.js:58`, which the new doc-comment pushed to line
82. **A claim written in prose expires exactly like a number, and the copy you will miss is the one
in the file you did not think you were changing** — grep for the sentence, not only for the figure,
and grep for `File.js:` when a file grows lines. #141 still cites `:58`, which is a comment on a
ticket and therefore the owner's word to give.

**One thing the four mutants could not reach, so it became a row.** The fix carries
`disabled:hover:bg-transparent`, taken from `Users.js`: `:hover` matches a disabled button, so
without it the dead control still lights up red under the pointer — the sentence this ticket is
about, said in a colour instead of a cursor. That is an appearance claim, which no seam here
measures, and the code comment arguing for it is not a mark. *Explaining a gap in prose is not the
same as marking it* (#50). It is now a ☐ row at the foot of `12-role-grants.md` — appended rather
than inserted, so no row number anywhere moved — and the store is 1113 rows with ☐ at thirteen.

## #148 and #149 — two tickets, two mechanisms, and each was right about the other being wrong

**Two tickets diagnosed one symptom with two mechanisms, and each half-disproved the other.** #146's
fix left a form standing while the reload a save ends with ran, and what had been typed into it
vanished. #148 blamed `EntrySection`'s effect, keyed on the `entry` object, which the reload hands
over new. #149, written an hour later, found the seven teacher screens draw their list and the open
form inside `{!loading && data && (`, so the reload unmounts the form outright — and concluded that
#148's mechanism was *not the operative one*, since keying the effect on the id would leave a
component that no longer exists exactly as lost. That was true, and it was also only true while the
gate stood. A throwaway spec measured the four combinations, one temporary line each: the gate alone
wiped both an unwritten and a written section; the id alone changed nothing a person could see; the
gate lifted kept the unwritten section and still wiped the written one, **on the same node** — a
result neither ticket had predicted; both together kept both. **Two mechanisms for one symptom are
measured as a grid, not argued as a choice — the one masked by the other is still there when the
other is fixed.** The unwritten section had only survived the lifted gate because `entry` is
`undefined` before and after, which is also why the file carries one row, and only one, that tells
the two layers apart: a section with an entry already in it. `improvemententrybyobject` kills that
row and leaves the unwritten one standing, which is the grid's prediction checked by a mutant rather
than restated.

**The decision was the owner's, and the measurement was what made it askable.** Both tickets said
*decision, not task* and listed four answers — `docs/06` §Out of Scope says a change to what the
screen does is a question. The grid turned four answers into two layers, the owner took both on all
seven screens, and the measurement went onto both tickets before a line was changed, so the answer
and its reason sit where the next reader of either ticket will look.

**The fix reopened a window #146 had closed by measurement.** #146's first draft asked
*is this still mine* again after the reload, and the row written to build that window timed out
looking for a control: with the gate up there was nothing on the screen to press. So the clause came
out as *structurally unreachable, not untested* (#102). Lifting the gate is exactly what reaches it —
a pencil is on the screen for the whole reload, and both `save` and `remove` decide their banner
after it. *A defect that is unreachable today has a date on it, usually moved by another ticket's
fix* (#131), and this time the date was moved by the ticket fixing the neighbour of the one that
wrote it down. The rows were written before the guard and ran red twice for two different reasons:
against the gate they timed out at the click (the five-second `UNDER_A_RELOAD` says *not there*
quickly), and against the lifted gate they failed at the banner. The removal banner had never been
asked at all; the realistic wrong answer for it, the one its mutant writes, is capturing `sent` when
the answer lands rather than when the bin was pressed. The review read what that mutant does rather
than what it was called: captured beside the comparison, `sent` is the ref compared with itself, so
the realistic mistake is the guard deleted under another name — the sheet had said it was not. And
it read the other half: every row asked the removal's banner to keep quiet, and nothing anywhere
asked it to speak, so a guard that never said *ลบ…แล้ว* again would have passed every file.
`removalsentatthelanding` and a mutant that silences the banner vary the same condition in opposite
directions, and one crafted value proves one link (#96) — the second row and the second mutant
went in after the review, per screen.

**Removing an accident removed a cover.** `EvidenceForm` seeds its state once (#147), so a pencil
pressed on another file while a form is open leaves the first file's values in the boxes. In
#146's scenario — a save out, the second pencil, the reload landing — the old remount rebuilt the
form from the file actually being edited and repaired #147 by accident. With the form surviving, it
no longer does. Nothing here was made wrong that was right, but a defect got harder to miss, and the
sheet and #147 both have to say so.

**The instrument read the new sheet as zero mutants and said nothing.** The first draft of
`149-reload-keeps-the-open-form.py` built `MUTANTS = {}` and filled it in a loop; `anchors.py` reads
the dict from the AST, found an empty literal, and reported 713 mutants and 0 problems — the total
simply did not move, which reads the same as a sheet that adds nothing. `anchors.py` now names a
sheet whose `MUTANTS` is empty the way it names one it cannot find, and the sheet is written as a
literal like every other. *A tool that cannot say what it did not look at* (#123) — met again, in
the one tool written to be the answer to it.

**The sweep's reading.** Twenty-nine mutants against `149a`, twenty-two rows: every `loadingline`,
`savebannerunasked` and `removalsentatthelanding` killed one row at the assertion its name gives;
every `gateback` killed the typing row at its value and two more at the click's timeout — fourteen
timeouts in seven runs, seven times two, and 1.5 minutes against 1.3 is those waits. The timeouts
are not cited: *a read of something a mutant stops from existing is a wait, not an assertion*
(#139). After the review the sheet grew to forty-three: seven `removalbannerunsaid`, and seven
`savebannerunguarded` that only a re-sweep of #146's mutants asked for. The fix had split the save's
banner from `mine`, so `closewins`, which used to kill the close and the banner in one, now sees
the close alone; `improvementclosewins` fell from two kills to one, and the banner half of 146a's
rows had no mutant until one was written. *An anchor check tells you a mutant no longer applies;
only a sweep tells you it no longer proves anything* (#107) — the anchors had all held. `31:savenoreload` quoted the `if (mine)` the fix replaced, so it was re-aimed and swept against
`31a` the same day — the same three rows it killed before.

## #147 — the choice the ticket framed was measured, and it was a different choice

`EvidenceForm` seeded its boxes once, when it mounted, and the page drew it with no `key`, so a
second file's pencil handed the open form another file and changed nothing in it; บันทึก then wrote
the first file's type and description onto the second. The red row measured exactly that before the
fix: `brief` and the first file's description, on the second file, in `activity_evidence`.

**The ticket said the two fixes differ in what happens to a typed draft. For another file's pencil
they do not** — both a `key` and an effect on the record drop what was typed. (The review found the
case where the ticket is right: the *same* file's pencil after a reload hands the form a new object,
which an effect would wipe and a key keeps. A refutation is a claim about the cases it measured.) What they differ in
is the file box: it is a DOM input no state can empty, so an effect clears `file` and leaves the
chosen name drawn while the save sends nothing. The design was chosen on that, and the proof of the
choice is a mutant that *is* the other choice — `syncedbyeffect`, the siblings' pattern — which
passes four rows and fails one, the file box. It is #145's control mutant in another place: one row
that pins today's value and one row that says *why this and not that* are two claims, and only the
mutant built from the alternative can tell them apart. *A ticket's diagnosis is a claim from the day
it was written* (#66, #102) covers a ticket's framing of a decision as well as its framing of a
defect.

**The realistic wrong key left one row standing, and that row is a second way in.** `keyedbymode`
— a key that says *adding or editing* but not *which file* — kills the four rows that go pencil to
pencil and passes the one that goes from แนบหลักฐาน to a pencil (#66). The row exists because of
that survivor; without it the sheet could not say which of the two keys the page carries.

**Every mutant built from the design choice died at the description, and two rows claimed the
type too.** The review read the order of the assertions: rows 1 and 4 read the description first,
so no sweep ever reached their type. `typeunseeded` was written for that half — and the fixture had
to change first, because the first file was `brief`, the first type the form offers, and a form
that seeded no type would have read as right. *A row that names two ways in is two rows* (#66),
and a row that names two fields is two claims for the same reason.

**A row that dies at its settle point is not held there.** Under `unkeyed` the file-box row died
waiting for the second file's description, before it reached the box — so that mutant is not cited
for it, and the settle point now carries its own message so the next reader of a failure can see
which of the two reads it was. Only `syncedbyeffect` reaches the file-box assertion itself.

**The census the ticket asked for was one grep and three answers.** `useState` seeded from a prop
exists in `EvidenceForm`'s two lines and `TeacherPicker`'s lazy one; every other form starts from
`EMPTY`. `TeacherPicker` is mounted inside each section's own row, so another section is another
instance and the shape is safe there by construction, not by a key.

## #151 — the failed reload, and the banner that was not the one the ticket said

The seven teacher screens kept their list and the open form through a reload since #149, and a
reload that *failed* still took both down: each `load` cleared `data` in its `catch`. The answer is
#149's carried one step on — a failed reload keeps what the screen last drew — and the fix is the
deletion of one line on each of seven screens. The rows gate the save's write with a crafted 200
and the reload with a crafted 409, so nothing reaches the database; seven mutants put the line back,
one per screen, and each kills exactly its own screen's two rows, at the form and at the list.

**A deleted line is an anchor for somebody else.** Four sheets' `swallowrefusal` quoted
`setData(null)` beside the notice it swallows. `anchors.py` named all four the moment the line went;
they were re-aimed at the `if (isCurrent())` above the notice and swept on their own sheets, and each
killed the rows it killed before. *A change to a function's signature reaches every mutant that
writes a call to it* (#140) — a deletion reaches every mutant that quotes the line.

**The ticket's description of the banner was true in one of its two cases.** It said the refusal
banner tells the person the reload failed. With another form opened during the save, it does. With
nothing opened, the save sets its success sentence *after* the reload and writes over the refusal —
a probe read the refusal 0 times on all seven screens, and on ผลการเรียนรู้รายวิชา *บันทึก…แล้ว* once. Before #151 that was a success sentence over a
blank screen; now it is a success sentence over a list that does not yet show what was saved. That
is a question about what the screen says, so it is the owner's rather than the fix's (#152), and the
row that asserts the refusal is not cited for it: the refusal shows before the fix and after, and no
mutant of this ticket can tell the two apart. *A ticket's diagnosis is a claim from the day it was
written* (#66, #102) — this one was a claim about the half of the situation its author was looking at.

**The shared list moved to `e2e/support/card-screens.js`.** `149a` held the five card screens' table
inside the file; `151a` needed the same five, and *a fixture built inside one test file is one no
other file has* (#87). `149a` imports it now, and ran green in the full suite after the change.

**A mutant that unmounts the form proves the form is there, not what is in it.** The first sweep
had one mutant per screen and cited it for the whole form row: *the form is still open, and in the
box is what was typed*. The review read the log: every `blanks` died at the visibility read, which
comes first, so the value read after it never ran under any mutant — a form that comes back open and
empty would have passed. A second mutant per screen, `blinks`, blanks `data` and hands it back on the
next tick: the form is unmounted and drawn again, open, with the saved value in it. It kills the form
row at *what was typed* and nothing else. *One crafted value proves one link of a guard* (#96, #102)
— and a row with two reads in it has a second link that the mutant killing the first can never see.
The review also found the sweep had run on a `151a` whose doc block was edited after it: the rows
were the same, the line numbers were not, and the fourteen mutants were swept again on the final
text rather than argued to be unchanged (#146).

## #99 — the renewal that was there, and the work that made no request

The ticket said the session was never renewed and quoted the line it was signed on. The renewal had been in
`session.js` since `d368652`, eight days before the ticket was opened, with a test beside it, and sheet 10's list of
what was still open said that test did not exist either. Both claims were never true (#102). What the person at the
screen met was real all the same, and reading the renewal for *when* rather than *whether* found it: under ten
minutes left **and a request**. A request at minute nineteen renews nothing and leaves eleven minutes, and typing is not
a request, so a criterion's four levels written in those eleven minutes were saved into a session that had ended. The
comment above the threshold and the test beside it both said someone who walks away expires thirty minutes after their
last request; it is ten to thirty. **A mechanism that fires on requests is blind to the work that makes none** — ask
what the person is doing between requests, not only what the server does when one arrives.

**The obvious fix had a price on another ticket.** Renewing on every request is one line and makes the idle timeout
exact, and it turns #51 — a renewal that lands after a role switch carries the old acting grant back — from a race
inside the last ten minutes into a race on every request in flight. It would also not have helped: the person was
typing, not requesting. The answer the owner chose is a heartbeat on key and click, at most every five minutes, to a
route that does nothing; the threshold stays where #51 left it, and ten less five is the pause the promise allows.

**A promise two seams share is proved as two pinned numbers and the relation between them.** Neither seam can run
thirty real minutes. The browser rows move the page's clock and pin *at least every five minutes of work*
(`slowbeat` at six kills them); the HTTP rows sign tokens with the life they need and pin *a heartbeat in the last ten
minutes renews*. The ticket's first criterion is neither row; it is the inequality, and the sheet has a row that says
so rather than a paragraph that explains it (#50). ADR-0005 carries the same sentence for whoever changes one number
without the other.

**The negative row is the ticket's second half, and it needed its own mutant to mean anything.** *Ten minutes with
nothing pressed sends none* passes against no heartbeat at all, so on its own it proves nothing about the heartbeat.
`timerbeat` — a heartbeat on an interval, the design somebody would reach for — kills it and leaves the rows that press
keys standing, because the timer also stamps the time of the last beat and so they still count one. (Once the sign-out
rows below existed it killed them too, at their own assertions: the heartbeat held at the route was the timer's, which
nothing waits for. A prediction written before a row exists is a claim that row expires.)

**Keeping the threshold did not keep #51's window where it was; the reviewer found that, not the sweep.** The first
draft of ADR-0005 said it did, because the heartbeat renews no more eagerly than a save. But a heartbeat has a way in
that a save does not: it is sent by the click itself, so the click on sign-out, or on another grant, can be the one
that sends it. A renewed cookie landing after the sign-out signs the browser back in; landing after a switch it puts
the old grant back on. Eight mutants had been swept green and none could see it, because no row pressed a control that
did anything but send a heartbeat. The shell now keeps the heartbeat that is out, and `logout` and `switchRole` wait for
it; two rows hold it at the route with `gate` and ask that nothing else leaves first. They were red before the fix at
their own assertions. The second review round found the third writer of the cookie, which the first had not listed:
the shell's own sign-out when an account's access ends (#52). `requireSession` renews before `attachRoles` refuses, so
a *refused* heartbeat can still carry a cookie back — the case the listener's own comment says it exists to prevent.
A third row, red first, and the listener waits too. The list that should have been read first was the grep for
`issueSession` and `clearSession`, then for every caller of the routes they sit in — not the controls in the menu. This is #139's rule met from the other side: a mechanism that fires on *every* press is written
by every control that can be pressed, and the list to read is the controls whose own request re-issues the cookie.
The same review took apart two sentences that read as proofs. *Five under ten* was not the promise; the promise is
that a pause shorter than their difference never signs anyone out. And *the row that pins the number* did not pin it,
because the HTTP row read its token's age off the constant it was meant to hold; it now says nine minutes in digits,
and `fivethreshold` kills it.

## #51 — the seam that could build it, and the row that had already dissolved

The ticket said a renewal that crosses a role switch carries the old grant back, and that it was **not fixable at the
one seam `docs/06` allows**. The first half was true and eighteen days old; the second was a claim about the seams,
and it was wrong. What makes a request stale is not when it arrives but **the token it holds**, and signing a token
from before the switch is two lines at the HTTP seam. Five rows there hold the whole mechanism: the stale token is
left alone, it is still answered as the grant it names, the switch's own cookie goes on renewing, the switch writes
the last cookie on its own response, and one account's switch does not stop another account renewing.

The owner chose a counter on the account — `users.acting_epoch`, bumped **before** the switch issues its cookie and
stamped into every token — and a renewal that does not match writes **no cookie at all**. Not a cookie without
`acting`: that would drop the caller into their most senior grant, which is the same divergence from the other side.
ADR-0006 carries it, including the price nobody is paying today: a counter on the account cannot tell one account's
two browsers apart, so a second device stops renewing after a switch made on the first. Telling them apart needs a
per-session identity, which is the store of session state the JWT was chosen to replace. **Written down rather than
fixed quietly** — the paragraph is the one to reopen if a second device ever matters.

**The renewal had to stay where it was in the chain.** Reading the counter needs the pool, and the tidy move is to
push the renewal into `attachRoles`, which has one. But `requireSession` renews **before** `attachRoles` refuses, and
#99's third writer of the cookie — a refused heartbeat that still carries one back — is a story that depends on
exactly that order. So `requireSession` became a factory that takes the pool and the renewal did not move.

**And the ticket's sentence about the browser seam became my own.** I wrote in the spec, the ADR, the sheet and the
mutation file that the browser cannot build a stale request, because `gate` holds a request *before it is sent*. Then
`51:noguard` — the comparison deleted, which is the code as it stood before the ticket — left both browser rows
standing, and the sheet recorded that as **predicted**. A prediction is the most comfortable place for a survivor to
hide: the sweep asks whether the row dies, the prediction answers why it did not, and nobody asks the row what it is
for. Asserting the answer the released read got is what broke it — a teacher may not read program subjects, so a row
that had really been sent after the switch would have been refused, and it was answered **200**. `route.fetch()`
replays the headers the request was captured with, the pre-switch token among them. **The seam could build it all
along.**

**Then the row still passed, because the situation it arranged had already been undone by the thing it was about.**
The session has to be inside its last ten minutes for any of this to matter, and every request inside that window
renews it. The landing screen's own reads were still out when the row aged the cookie; they landed, renewed, and the
read the row held went out with a fresh token — not stale, not renewable, proving nothing while passing everything.
**The mechanism under test can erase the precondition you arranged for it.** The row now waits for the first screen to
finish drawing, ages, and makes the held read the next thing that leaves the browser — and asserts that precondition
where it is used: the token the read carried had under ten minutes left and the counter from before the switch. Only
then does `noguard` kill it, and it kills it at the right assertion: the jar comes back with no `acting` at all, the
browser wearing its most senior grant while the picker says teacher. That is the ticket's third criterion, in the
browser, where it was said it could not be shown.

**A signature change reaches every mutant that writes a call, not only those anchored on one** (#140). Making
`requireSession` a factory left `10:guardedlogout` mounting a factory as middleware — a hang, and death by timeout
rather than by assertion, which reads like a kill to anybody counting — and `99:alwaysrenew` calling `issueSession`
with the wrong arity. `anchors.py` found the second and **could not find the first**, because the anchor still
matched: the text was there, its meaning was not. Both were re-aimed and re-swept on their own sheets.

## #105 — a dot is 4px wide and an icon is not

Every entry of every role's menu had declared an icon since the system was delivered, and the shell drew a 4px dot
for each sub-item and used none of them. The ticket was decided by the owner on 28 August, carried a four-line
acceptance, and looked like ten minutes of work. Three things in it were not.

**The claim was still true, and checking cost one grep.** `h-1 w-1 rounded-full` was still at one site in
`SidebarItem.js`, and every role's config still declared an icon per entry. The ticket's figure — thirteen sub-items
in `Teacher.js` — was right, and its scope sentence was not: the dot is drawn at **one** site that every role's menu
goes through, so the change lands on twenty-eight entries across five menus, not thirteen in one. A ticket that names
a file has usually named the file the walk was standing on.

**Replacing a dot with an icon is a layout change, and a rule about layout is checked with numbers** (#111, #122).
A throwaway Playwright probe measured every sub-item before and after: the row stays 40px, because a 20px icon box
still fits inside a 24px line; what moves is the label's width, 211px → 194px, and two labels of the committee's menu
drop to two lines. Seven of twenty-eight labels now take two lines where five did. **The instrument was a probe spec,
not a walk** — it is cheaper than a person, it can be re-run after the next change, and it was deleted the moment it
had answered.

**But a measurement answers *what it costs*, not *may I*.** Tightening the gap between mark and label from 12px to
8px was measured too, and it is worth 194px → 198px and one label back — and it went in, and `/code-review` took it
out again, quoting `docs/06` §Out of Scope: the UI is reproduced as-is, and a proposal to change it is raised as a
question. Nothing in the diff had pinned the 8px: no acceptance row, no mutant, one line in a comment. The number the
ticket publishes to its owner is now both numbers, and the choice is theirs. **A number that justifies a change is not
permission to make it** — and the tell is that nothing else in the diff could be broken to make that line fail.

Re-measuring the shipped state afterwards was worth its one run, and it found the second thing. The obvious way to
get the *before* number back was to apply `dots`, which is the pre-#105 shell — except that it is not: `dots` mutates
what goes **inside** the 20px box, so the geometry it produces is the new layout with a dot in it, and it reported the
before and after widths as identical. **A mutant reproduces the behaviour it was written for, not the layout around
it.** It did confirm the census exactly — 13 + 8 + 7 = 28 — because that is a question about behaviour.

**The picture is appearance; that the shell reads each entry's config is not.** So `105a` asks the two questions a
browser is allowed to ask — no entry draws nothing, and two entries of the same group do not draw the same thing —
and the sheets for #30, #31 and #32 keep the question only a person can answer: *is that a pair of scales?* Those
three rows go back from ☑ to ◐, which looks like a regression and is the opposite: until this ticket there was
nothing on the screen to look at, so there was no half to walk. **A row can gain a walkable half the day a ticket
lands.**

The pair a row names has to sit under **one** group. The first draft of row 2 named two entries of different groups,
and writing `groupicon` — every entry gets the icon of the group it sits under — is what showed that: two different
groups draw two different things, so the row would have passed the mutant it was supposed to die to. That one was
caught by reading the mutant against the row rather than by running it, which is the cheaper order when a mutant is
still being written; the three that were run are in the sheet's own table.

Two more came out of the same review, both of them rules this file already holds. `everyEntryDraws` took a
non-retrying snapshot of the menu's links, and what got the rows there waited for an **answer** — `signIn` for the
login response and a URL, `chooseSection` for the section's — which is #132 exactly: a helper that waits for the
response has not waited for the drawing. One retrying `toBeVisible` on the first name settles it, and it is chosen to
be a wait for a **name** rather than for a drawing, so that no mutant turns into a timeout (#139).

And widening the ◐ gloss on three sheets left twenty-two carrying the narrower one — #130, the copy you will miss.
Reading them before rewriting them was what mattered: the narrow gloss says ◐ means *the server half passed and the
screen half is waiting*, and sheet 10 already carried a ◐ of the other kind, the attribute that reached the DOM and
needs an ear. **The definition had drifted from the mark before this ticket touched it**, so this is not a copy #105
invented; it is one #105 made visible on the sheet it was already editing. Fixed there, measured everywhere else — 81
◐ across 37 sheets is not an audit that belongs inside a sidebar ticket — and raised as its own question.

And the count that decides whether two sheets may be swept together is the census, not a grep: the first draft of
`mutation/105-sidebar-icons.py` said nine sheets hold `SidebarItem.js`, having grepped the name. Seven of those hold
`SidebarItem/Teacher.js`, which is the config and not the shell. The script reads `FILES` and answered **three**.
**A name that starts the same is not a path** (#85, #87, #125).

## #154 — the mutant that can only be killed where the default is the truth

A tracker, not a defect. #51 made a token's switch counter the thing a renewal compares against, and a token signed
before migration 0008 carries no counter at all: `undefined` is equal to no number, so it never renews. ADR-0006
chose that over reading the missing claim as zero. Nothing measured it, because no seam can produce that token — every
one either seam mints is signed by this server, and this server stamps the counter. So the fixture is a token signed
by hand, which is what the file already does for the idle-session rows.

**Writing the row was ten minutes. Working out what could kill it was the ticket.** The mutant the ticket named is
`session.actingEpoch ?? 0` — the implementation the ADR rejected, written out. It looks like it must kill any row
about a counter-less token. It does not. `?? 0` changes the comparison only when the account's own counter *is* zero;
for an account that has switched even once, `epoch !== undefined` and `epoch !== 0` are both true, the renewal is
skipped either way, and the mutant survives a row that looks like it is aimed straight at it. **A mutant that
substitutes a default is invisible everywhere the real value differs from the default.** The row has to be built to
stand at the one point where the two coincide.

So the row stands on `U_TEACH` — the account this file never switches — and **asserts that its counter is zero**
before asking anything. Not because the row is about zero, but because zero is the only state in which the row can
tell the two implementations apart, and a row added above it that switched that account would leave it green and
proving nothing. The assertion carries a message saying so. `missingiszero` then kills that row and only that row:
33 pass, and the two failures are the row and the parent test that contains it — `node --test` counts the outer
`test()` as failed too, which is the reading trap #48 and #67 already named.

Two things fell out of it that are not about the branch at all.

`npx playwright test 51a` **also runs `151a`**. Playwright matches the file argument as a substring, so the sheet's
own documented command had been pulling in another ticket's spec. Harmless here — the mutant killed nothing in either
— but a sweep that reads a kill count from a command like that is reading two sheets' rows as one.

And the count line on `docs/acceptance/10-application-shell.md` said *15 ⚙ · 5 ☑ · 1 ◐ · 1 ☐ รวม 22* while the table
held 23. #105 added a ⚙ the day before and did not update the total. **Two lines below that number stands a paragraph
explaining that this exact number had gone stale once before, why hand-kept numbers in a growing file go wrong, and
an instruction to count the table instead.** The warning was read, agreed with, and not obeyed — by the same session
that wrote a rule about it into `CLAUDE.md` the same week. A rule in prose beside a number does not count the number.
If that total is to stay right, something has to count it.

**And then it happened again, inside this ticket, while the paragraph above was being written.** The review found
three more stale figures on the same sheet, twenty lines further down in a `### มัตแตนต์` section this diff had
never opened: *ห้าตัว* against six mutants, a baseline of *33 ผ่าน* against a file that now holds 35 — which would
have made the baseline and a kill count read identically — and `noguard`'s *HTTP ล้ม 1*, contradicted by this
ticket's own mutation sheet in the same diff, which says `noguard` now kills rows one **and seven**. Correcting one
hand-kept number does not find the next one; it finds the one you were looking at. **What a diff touches is what a
diff proofreads**, so after changing what a document counts, the thing to re-read is every figure in the document,
not the figure you came for. Two documents in one diff disagreeing is the cheapest of these to catch and the easiest
to ship: they were written an hour apart by the same hand, and only reading them side by side shows it.

The substring trap has the matching shape. `51a` was fixed on its own sheet; a grep afterwards found the same live
collision documented on **seven others** — `21a`→`121a`, `22a`, `33a`, `39a`, `40a`, `42a`, `44a` — every one of
them broken not by its own author but by a `1xx` ticket adding a spec years of numbering later. A command written
correctly can be made wrong by a file nobody touched it with. Deferred to a ticket rather than swept in here, but
the lesson is that **a documented command is a claim with an expiry date**, and the thing that expires it is a new
file elsewhere.

## #150 — the row that ran before the change it was blamed on

#148 stopped a reload writing the record over what somebody was typing by keying `EntrySection`'s seeding on the
entry's id instead of on the object handed to it. #150 is the transition that decision did not look at: the id going
from **nothing to something** while the editor is open. That is not an abstract case — it is exactly what a person's
own save looks like from inside the box. Press เขียน on a section holding nothing, type, press บันทึก; the form
closes but the reload it ends with is still out, so the section still holds no entry and still offers เขียน. Press it
again, and the editor opens on `undefined`. Type. The reload lands, the id goes `undefined` → an id, the effect fires,
and what was being typed is replaced by what was saved a second earlier.

The ticket came with a question attached, and the question was the more important half. Keying the effect on `editing`
alone would keep what is typed across every reload including one that brings a *different* entry; keying on the id —
today — keeps it across a reload bringing the same one. Which the screen should do when the entry under an open editor
is **replaced by somebody else** is a decision, and `docs/06` §Out of Scope says that is the owner's, not the
implementer's. The ticket even says the reseed is arguably right there.

So the fix was written to be the smallest thing that is not an answer to it. A ref remembers the id the open draft was
seeded from; *arriving* (`undefined` → id) does not reseed, *being replaced* (id → another id) reseeds exactly as
before. The sentinel is a `Symbol` rather than `null` because `undefined` is a real state the ref has to hold — a
section nobody has written in has no id — and `null` would have collided with it. **The transition the question is
about is left byte-for-byte where it stood**, which is what makes this a fix rather than a vote.

### The correlation that was three-for-three and still wrong

Running the new row alongside `41a` and `149a` produced a failure in a row belonging to neither: `149a`'s
ผลการเรียนรู้รายวิชา row about typing surviving a save's reload. It failed three times out of three with the change
present and passed with it stashed out — measured on a quiet machine after killing the walk servers, so not load. That
is the shape of a regression, and an hour went into treating it as one.

It was not one, and two readings settled it. The first was the error itself, which was never an assertion:
*response.json: Protocol error … Response body is not available for a response that was navigated away from* —
thrown at `e2e/support/clos-screen.js:40`, reading the **dashboard's** body in `mySectionIds`, the first statement of
the row's setup, before any form exists on the screen. `teaching-screen.js` documents this exact race in a comment,
because `27a` row 1 lost it twice: Chromium keeps a response body only until the page navigates away, so that helper
pulls the body eagerly — and swallows the failure with `.catch(() => {})`, deliberately, leaving it for the caller to
report. The caller is the `.json()` that throws.

The second reading was cheaper and decisive: `npx playwright test 41a 149a 150a --list`. The failing row is **test 2 of
39**. `150a` is 31 and `41a` is 32–39. Everything the change touches runs *after* it. The changed component had not
been mounted, had not been compiled into any screen the row visits, and `CourseOutcomes.js` does not import it. A row
that runs before your code runs cannot be failing because of your code, whatever the correlation says — and the
correlation was real: three reproductions, one clean control, and entirely meaningless.

**The instrument is `--list`, and it costs nothing.** The mechanism should have been read before the third
reproduction, not after; *a spec that fails only in the full suite is not a flaky spec until the mechanism is measured*
(#129) was already on the wall, and the addition here is that the order of the run is part of the mechanism and the
first thing to check, because it can rule the diff out without understanding anything else. The race is real and
pre-existing — 38 files under `e2e/support/` use the same `Promise.all([waitForResponse, page.goto()])` shape and
exactly one of them pulls the body eagerly, which is the one that still lost — so it went to the tracker as **#160**
rather than into this ticket's diff. The sentence you are reading said *it goes to the tracker* before the issue
existed, and the standards review caught that: **a deferral is filed or it is not deferred, and prose in the future
tense is neither.**

### The mutant that was predicted to die somewhere else

Three mutants. `arrivalreseeds` restores the pre-#150 behaviour and kills the new row alone — all thirty rows of
`149a` stand, correctly, because not one of them changes an id. `closekeepstheid` removes the line that puts the ref
back when the editor closes, and the sheet was written claiming it kills `41a` row 3, the reopen row. **It survived.**

The reason is the shape #154 had just finished writing down. `41a` row 3 reopens an editor on the entry it has itself
just saved, so the draft left stale in the box is the very text the correct code would seed into it. The two values
coincide, and a mutant is invisible wherever the wrong value equals the right one. The stale ref can only be seen where
they differ, and there is exactly one such place: a section that still holds nothing, where the correct value is empty
and the stale one is whatever was typed and cancelled. That is the second row, and it kills the mutant alone while
`41a`'s nine rows stand. **A line the ticket adds needs a mutant of its own, and a prediction about where it dies is a
claim the sweep answers, not the reading of the code that produced it.**

`41:editorstartsempty` sat on the line this ticket rewrote, so it was re-aimed at the same meaning behind the new
condition and swept the same day — still 1 failed, 8 passed, still row 3. An anchor check says a mutant applies; only a
run says it still proves anything.

### The survivor that is the deliverable

`neverreseeds` is the third, and it exists to survive. It is the *other answer* to the open question — never reseed
once the editor is open — and it was swept across every sheet that draws the component: `133a`, `146a`, `149a`, `150a`,
`151a`, `41a`, **109 rows, none killed**. That is not a gap in the rows. It is the measurement the question needs:
nothing in the browser seam today can tell the owner's two options apart, so choosing between them costs no rows to
rewrite except the ones that would have to be *written* — the replacement row that neither option currently has. A
mutant written to be killed reports on the code; a mutant written to survive reports on the question.

And the sheet's own collision note said `146` holds `EntrySection.js`. The census says `41`, `149`, `150`. `146` names
the component in one line of prose and nowhere in its `FILES`. #105 made the same mistake from the other direction, by
grepping a name and counting sheets that held a *different file* whose path merely started the same way. Both are the
same failure: **the census answers which paths collide, and neither memory nor grep is the census.**

## #159 — the third answer, and the docstring that said there would never be a question

A migration that is written, committed and never applied to somebody's database does not announce itself. The schema
sits a version behind, every route that does not touch the new column works, and the one that does fails in a way that
reads as a bug in that screen. #159 was filed after `0008_users_acting_epoch.sql` did exactly that to sign-in on the
development database.

Neither seam can see it, and the reason is structural rather than an oversight: `backend/test/helpers.js` migrates the
schema it creates for each test file, and `e2e/support/global-setup.js` migrates its own before the run. Both are level
with `db/migrations` **by construction**. The only process that can ever be behind is one pointed at a database
somebody else looks after — which is every process a person actually uses, and no process any test runs.

The ticket was a question, not a task, so the fix waited on the owner. The answer was *refuse to start*, with the
pending filenames and `cd db && npm run migrate` printed verbatim — and, for the case where the ledger cannot be read
at all, *start anyway, but say clearly that it could not ask*.

### Three answers, not two

That second half is the whole design. The obvious check reads `schema_migrations`, compares it with the directory and
reports what is missing; it has two answers, level and behind. The world has three, and the third is what the obvious
check silently turns into the second.

Measured before anything was written: a schema nobody has migrated answers `42P01 relation "schema_migrations" does not
exist`, and a database that is not listening answers `ECONNREFUSED`. Both arrive at the same `catch`. Treat the catch
as an empty ledger and a developer whose container is stopped is told the database is behind by eight migrations and
sent to run them — an instruction that is not their problem and would not work if it were. So the report says whether
it was **able to ask** before it says what the answer was, the missing ledger is a genuine *all of them are pending*
and everything else is *could not ask*, and the two get different messages: one names the command, the other
deliberately does not.

The row for the third state is `db/test/migrate.test.js`'s dead-port row, and it is the row that caught the next thing:
`pg` reports a refused connection as an `AggregateError` whose **own message is the empty string** — the host, the port
and the code are all in `errors`. The first implementation returned `reason: error.message` and passed every assertion
about the shape while reporting a reason of `''`. It was asserting on the text of the reason, not merely on the flag,
that turned that into a red.

There turned out to be a fourth state, and the review found it rather than the measurement: the check reaching for
something that is not there at all. `pendingMigrations` catches what the database says, but an unset `DB_SCHEMA` or a
missing migrations directory throws before its own `try` — and an uncaught one would have killed a server over the
check rather than over anything the check found. **A check must not be more fatal than the thing it is checking.** It
is one more way of being unable to ask, so it is answered as one, by the same verdict; a server that genuinely cannot
run for that reason still dies a line later, with the error that says so.

### Read-only is a claim, so it is asserted

`migrate` creates the schema and the ledger before it reads, which is right for a command somebody ran on purpose and
wrong for a check that runs at every boot: creating an empty schema as a side effect of asking whether it is empty
hides the drift the question was about. The check therefore shares nothing with `migrate` but the filename list, and
the fresh-schema row asks `information_schema.schemata` afterwards — a question `migrate` would have answered
differently.

### The file that already knew the answer, in prose

`global-setup.js` carried this, written when it was true:

> This is safe to run while the backend is already listening — Playwright does not promise an order between this and
> `webServer` … `server.js` issues no query at boot.

Two sentences, and the change falsified both halves at once. Playwright does have an order, and it is the unhelpful
one: `runner/index.js` puts the plugin setups — which is what a `webServer` is — ahead of the global setups. The
backend of the browser seam therefore boots **before** the setup that drops, migrates and seeds the schema it will be
tested against. A boot check there reads last run's schema, which is about to be thrown away, and refuses to start the
entire suite on the first run after any migration is added — the exact day the suite is most wanted.

So `playwright.config.js` sets `MIGRATION_CHECK=off` on that server and says why at the line that sets it. The switch
exists for one caller and is documented at that caller; nothing else sets it, and the refusal's message does not
advertise it, because the fix for a schema that is behind is to migrate it.

The rule this is the second sighting of is #130's — a claim written in prose expires like a number. The new part is
that the prose was not in the file being changed, and nothing in the diff pointed at it. What found it was reading the
file whose invariant the change was about to consume, which is a habit and not a grep.
