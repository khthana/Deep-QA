# The browser seam

The second of the two seams `docs/06-implementation-plan.md` §Testing Decisions describes, added by
[#65](https://github.com/khthana/Deep-QA/issues/65).

`backend/`'s suite exercises the HTTP surface in process and carries almost everything. This one is for the rules that
are only rules once a browser is involved:

- a screen typed into the address bar and **refused by the server**, rather than merely missing from a menu — the
  refusal rows every acceptance checklist repeats;
- a spreadsheet that the screen's own template button produced, filled in, and sent back through the screen's own file
  control — the import rows every acceptance checklist repeats;
- behaviour a screen has of its own, where the server is only half the answer or none of it — a paging bar's ends, a
  list that steps back a page when the last row of the last page is deleted, a picker that offers what a rule says it
  should offer.
- two sessions held at the same time in cookie jars that do not know each other — one account suspended through the
  other's screen, and refused on the next click inside the shell it had already drawn.

The first two are half browser and half server, and neither can be stated at the first seam without inventing the
browser's half. That half is the one this system has had wrong before. The third has no first-seam statement at all.
The fourth is half and half again: the server's every-request guard is statable at the first seam, but the
administrator's button that trips it and the shell still standing on the other side of it are not, and one Chrome
profile cannot hold both sessions — which is why that row sat half-walked until `browser.newContext()` took it.

## Running it

```bash
npm install                    # once, from e2e/
npx playwright install chromium  # once
npm test
```

It needs the database container running (`npm run db:up` from `db/`), the root `.env` present, and `backend/`'s and
`frontend/`'s dependencies installed. It starts both servers itself — there is nothing to have running first.

| Command | What it does |
|---|---|
| `npm test` | Every spec, in one Chromium, one worker. |
| `npm run test:headed` | The same, with the browser visible. |
| `npx playwright test tests/17b-students-import.spec.js` | One file. |
| `npm run report` | The HTML report of the last run. |
| `npm run test:support` | The support modules that measure and put back — `leftovers.js` and `hold.js`. No browser; both reach a real schema of their own. |

## What it runs against

Ports 3100 and 5100, and the `deep_core_e2e` schema — none of which is what a developer runs. That is not tidiness:
Playwright's `reuseExistingServer` defaults to true off CI, so on the usual ports this suite would silently attach to
whatever `npm start` is already serving, and the import specs would write students into the database somebody is
working in. Dedicated ports and an explicit `reuseExistingServer: false` are what close that.

Both ports may be overridden for one run — `E2E_BACKEND_PORT` and `E2E_FRONTEND_PORT` — and the reason is Windows
rather than preference. Hyper-V reserves blocks of ephemeral ports and re-randomises them on every boot, so a machine
can wake up with 5100 inside an excluded range; the symptom is not a port in use but `EACCES` on bind, which CRA
reports as *Something is already running on port 5100* and which sends whoever reads it hunting for a process that
does not exist. `netsh interface ipv4 show excludedportrange protocol=tcp` is what says so. The defaults do not move:
a suite whose ports drifted per machine would make every *it works here* less informative.

The schema is dropped, migrated and seeded in `support/global-setup.js` at the **start** of a run rather than the end,
so a failed run leaves its data behind to be looked at.

### What the file before yours left behind

One schema, one worker, files in order: the rows a spec writes are part of the world the next spec is handed. Nothing
measured that drift until #132, and it was real — a full run left **19 of 34 tables** changed against the seed, in both
directions. Insertions, from the specs that add data through the screen; deletions too, from the specs that remove a
seeded row and do not put it back. #129's two new rows met it head on: the first draft asserted the intake picker
opened on 2563, which is true of the seed and false once `17c` had added `61010001`, and the mutation sweep was the
first thing to notice.

#132 then ran all fifty-six spec files one at a time, each with its own reseed, to find out how many files that is:
**40 leave nothing but `user_log`, and 16 leave rows in other tables.** #132 closed the two it was written about —
`17b` and `17c` are in the 40 — and #134 closed the other 16, after measuring the census again and finding it
unchanged.

Every run ends with a report of what moved, from `support/leftovers.js`. It counts three directions —
rows added, rows removed, and rows that kept their key and changed underneath it. A single-file run of
`16a`, with the third of those put back by hand to show it:

```
leftovers (#132): 34 tables checked, 2 moved
  subjects: +0 -0 ~1 (net 0)
      changed 01076105 (is_active, updated_at)
      columns is_active (1), updated_at (1)
  user_log: +9 -0 ~0 (net +9)
      added   1, 2, 3, 4, 5, 6, 7, 8 … and 1 more
```

A rewritten row names the columns that moved, and the table names them again counted over **all** of
its rows, because only eight keys are printed and a table where two hundred rows moved needs the
question answered whole: is this a value somebody typed, or an `updated_at` following a write?

The third direction arrived with #137, and its census — fifty-six single-file runs — found **fourteen
files leaving rewritten rows**, four of which had held since #134: `hold` was putting back everything
except what those files change. Twelve leave nothing but `updated_at`; `16a` leaves a seeded subject
closed, and `10a` leaves a password hash bcrypt re-salted on the way back. Nothing is excluded from the comparison: no table here carries an `updated_at` trigger, so the
column moves only because a route wrote it, and five screens read it back into a *แก้ไขล่าสุด* column.

The full runs that closed #134 and #137, on 15 and 16 September 2569, reported one table: `user_log`.

Three things about it are deliberate and are argued in the file itself. It **reports and does not fail the run**,
because a guard that refused would need a list of what is allowed to move, and a hand-kept list in a suite that grows
every ticket is already wrong. It says **what moved, not which file moved it** — Playwright's reporter hooks are not
awaited, so a snapshot cannot be taken at a file boundary without every spec importing a shared fixture. The keys it
prints are where a grep starts, not where it ends: `07` above is `14b`'s and `Z0` is `57a`'s. To attribute a table,
run the spec **on its own** — `globalSetup` reseeds on every invocation, so a single-file run reports that file's
leftovers and nobody else's. And it asks the **catalogue** for its tables and their primary keys, so a
table a migration adds is measured the day it exists rather than the day somebody remembers that file.

If your spec writes data, or removes a row the seed made, put the schema back — with `support/hold.js`:

```js
let release;
test.beforeAll(async () => {
  release = await hold();
});
test.afterAll(() => release());
```

In `beforeAll` it remembers every row of every table, so declare it before any other `beforeAll` that writes. In
`afterAll` it takes out every row that appeared and puts back every row that went, by primary key, with the values
and identity ids they had, in the order the foreign keys allow, and in one transaction — whether the rows passed or
not. It asks the **catalogue** for the tables, for the reason the report does: a list of the tables a spec touches
is right until the route behind its screen writes to one more. What it puts back, and the one thing it
deliberately leaves alone, are said on the file:

- **A row that stayed and changed is put back too, column by column** — since #137, which taught the
  report to compare values before teaching `hold` to restore them. A row a `SET NULL` rewrote while a
  removal took the row it pointed at comes back the same way.
- **`user_log` is not deleted from.** It is the product recording the spec's own actions; every spec that does
  anything moves it, and removing its rows would be a decision about the product rather than a cleanup. A row `hold`
  takes out still cascades into it — an imported account's log rows go with the account — because that is the schema's
  rule.

`hold` is a whole-file shape. A spec that wants its situation gone **before the next row** still names what it put
there: `44a`'s `unenrol` takes out the two students it enrolled, `25a`'s `afterEach` takes out the enrolments each
row made, and `34a`'s puts each row's marks back before the next row reads them. That is a different opinion
from *this file ends where it began*, not a second copy of it, so those files carry both. Scope that kind of
cleanup to what the file wrote, and check it with a single-file run — `25a`'s was scoped to the account rather
than the term, and removed three enrolments the seed made until #134's census found it.

Sign-in is the real sign-in screen and the real endpoint, with the seeded accounts and the password from `db/seed.js`.
Nothing about the session is stubbed, for the reason `docs/06` gives for the backend suite: the inherited system's
central defect was authorisation that existed only in appearance, and a driver that granted itself a session would
reproduce that blind spot at the one seam built to catch it.

## What it does not assert

Class names, copy, layout, colour. `docs/06`'s exclusion of frontend component tests is an objection to pinning down
markup nobody designed here, and it stands. A checklist row stated in terms of appearance — a wording, a colour, the
contents of a dropdown, an empty state's phrasing, a menu entry being absent — stays a hand-walked row.

## Its relationship to `docs/acceptance/`

A row is either walked by a person or covered here, never both and never neither. A covered row keeps its place in its
document, marked **⚙** and naming the spec that covers it. Where a row states two things and only one of them crosses
the browser — rows 19–22 of `17-students.md` are refused at the server *and* have no menu entry — the row says which
half is still a person's.

A ⚙ is not earned by a passing test. Before a row is marked, the code the assertion is about is broken deliberately
and the run is read to check that **that** assertion failed, and not one earlier in the file; each document records
its mutants and its kills. Two traps in doing it here: a `mode: 'serial'` file skips the tests after the one that
died, so a later assertion has to be re-run under `-g`; and truncating Playwright's output hides which line failed —
keep the whole log and grep it.

The mutants themselves live in [`mutation/`](../mutation/), one file per ticket, so a row's evidence can be produced
again rather than believed. `mutation/README.md` says how to run one.

## Layout

```
e2e/
├── playwright.config.js   the two servers, the ports, the one worker
├── support/
│   ├── env.js             ports and schema, in one place
│   ├── global-setup.js    drop, migrate, seed - and the snapshot the run is measured against
│   ├── leftovers.js       what the run left behind, reported at the end of it - #132
│   ├── accounts.js        the seeded accounts, by what they are
│   ├── auth.js            signing in the way a person does
│   ├── shell.js           the role picker, the user menu, the two dialogs over the top
│   ├── import-panel.js    the template button, the file control, the total — shared by every import row
│   ├── expired-session.js the dialog a dead session raises, shared by the rows that provoke one
│   ├── pager.js           the one paging control every list draws — #57; `untilDrawn`, what every opener waits for — #135
│   ├── grants-panel.js    ┐
│   ├── history-panel.js   ├ one module per screen or panel: its controls,
│   ├── users-screen.js    │ read as the checklist reads them
│   ├── departments-screen.js
│   ├── programs-screen.js │
│   ├── subjects-screen.js │
│   ├── students-screen.js │
│   └── program-subjects-screen.js ┘
└── tests/                 named for the rows they cover
```

**A spec file is named for what it proves, not for where the proof lands.** Usually that is one acceptance document,
and the name says so — `14b-departments-import.spec.js` is rows 5–7 of `14-departments.md`. The exception is a claim
about something several screens share: `57a-pager.spec.js` covers four screens in one file because what it proves is
one component that all four draw, and its rows land in five documents. Splitting it per screen would mean writing the
same helper four times, which is the duplication #57 exists to have removed.

Spec files sort alphabetically and run in that order under one worker, and that ordering is load-bearing three
times. `17a-` before `17b-`: the refusal file's control row asserts the register still holds the seeded 173, and the import
file adds students. And `57a-` after every `16x` and `18x`: a row of it that read "ten on the page" from what those
left behind would be a row whose meaning depends on a file it never mentions, so it imports its own rows under codes
no other spec uses — `Z…`, `ZP…`, `010797…` — and measures every count against what the table holds at that moment.

The third is `11c-suspension-and-a-live-session.spec.js`, which suspends `teacher.two@` and reactivates it, and
`13a-` signs in as that account. It sits between `11b-` and `12a-` by its name alone, and it carries a `test.afterAll`
that puts the account back whatever the run did — but the net only holds if the file stays ahead of `13a-`, so a
rename that moves it is a rename that breaks a file it never mentions.

## Reading a number off the screen

A count read straight after a navigation is read too early. Waiting for the list's own `GET` to come back is not
waiting for the thing being asserted: the response arriving and React having painted the new total are two different
moments, and between them the pager reads *ทั้งหมด 0 รายการ*. `17b-students-import.spec.js:121` read `0` where it
expected `176` on a loaded machine and passed on every unloaded one - a test that fails only when the CI box is busy,
which is when nobody is looking.

So a helper that waits for a paged list ends with `untilDrawn` in `support/pager.js`, which waits for the total and
the page the answer carried to be what the pager says. That is every `open…` helper on a screen with a pager - since
#132 `openRegister` and `openProgramSubjects`, since #135 the rest, with `pick` on the activity history and
`openHistory` on the work groups counted as openers - and the two after-click helpers whose rows read on the very next
line, `filterProgram` and `nextPage`. A row can read `total(page)` straight after one of those and get the real
number. Its docstring says what it cannot see and why nothing narrower would do.

Two are left out on purpose, and say so. `history-panel.js`'s `openHistory` waits for `GET /api/users`, which carries a
total that screen never reads out - its list only fills a `<select>`. And the after-click helpers that remain on a
paged screen (an import, a search, `step`, the other filters) are followed in every spec by a read that retries or goes
through `settled` - #135 read each call for that - so a number read after one of those is polled - `await expect.poll(() => total(page)).toBe(before)` - rather than read once. This is not a timeout in disguise: poll re-reads until the value matches or the deadline passes, so a total
that is genuinely wrong still fails, and fails at the same place. A number read off a screen that has already been
asserted against needs no poll: three of the plain reads sit under `await expect(...)` calls on rows of the same
table, and the row appearing and the total changing are one React commit, so the wait above them is the wait.

A screen with no pager has no number to wait for, and the same gap is still there. On the PLO screen it is the loading
row: `load` sets `loading` before it asks, so an answer lands on a single *กำลังโหลด…* cell or on the new rows, and
never on the rows of the list before. `openPlos`, `filterTo` and `save` in `support/plos-screen.js` therefore end with
`untilListed`, which is `settled` on that screen's table (#136). A screen that draws the old rows until the new ones
arrive would need something else, and the helper's docstring says which premise it rests on.

**A race between an answer and its drawing is measured by slowing the renderer, not by running the row again.**
Rerunning a row that reads too early passes nearly every time, which is how #132's `26a` failure came to be called
intermittent. A scratch spec that sends `Emulation.setCPUThrottlingRate` at a rate of 20 through
`page.context().newCDPSession(page)` made a read of #136's shape fail on every run, and pass on every run once the
helper waited - a red and a green, which a rerun cannot give. Read the DOM with `page.evaluate` at the moment the response
resolves to see what the gap actually holds; a locator waits, and that hides it.

Four others were removed rather than fixed, and #64 is the record of why. They were counts read after a *refused*
import in `11b` and `14b`. `ImportPanel` calls `onImported` only on success, so a refused import never re-fetches the
list: the total standing on the screen is the one from before the upload, whatever the server did with the file, and
the assertion reads the same whether the rollback held or leaked. Polling that number would have made it no truer.
Two of the four were worse than merely stale - they followed an *empty* file, which has no rows to write, so no
mutation could have moved them at all.

What the four looked like they were proving is proved, in both files, by the atomicity row above them - `11b:131`
and `14b:124` - which reloads the page, re-opens the list and polls a number that came from the server after the
upload. Mutant `M9` of `mutation/11-12-accounts-and-grants.py` commits a refused import instead of rolling it back,
and those two assertions are the ones that fail under it - each of them the *first* failure in its file, which is
what the standard asks: the new assertion, not an earlier one. Both files are `mode: 'serial'`, so the tests after
the failure are skipped rather than run, and the round says nothing about them either way. That single mutant covers
every screen's import, because
`backend/lib/importer.js` rolls back on `errors.length > 0` once and every import route calls it - which is also why
a fifth assertion in `11b`, on a file whose rows collide with each other, would have proved nothing new.

The rule the episode leaves behind: a number that cannot be made to fail is not evidence, and dressing it in a poll
makes it look like evidence. Ask where the claim is actually proved, and if it is proved somewhere else, say so in a
comment and delete the assertion.
