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

## What it runs against

Ports 3100 and 5100, and the `deep_core_e2e` schema — none of which is what a developer runs. That is not tidiness:
Playwright's `reuseExistingServer` defaults to true off CI, so on the usual ports this suite would silently attach to
whatever `npm start` is already serving, and the import specs would write students into the database somebody is
working in. Dedicated ports and an explicit `reuseExistingServer: false` are what close that.

The schema is dropped, migrated and seeded in `support/global-setup.js` at the **start** of a run rather than the end,
so a failed run leaves its data behind to be looked at.

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
│   ├── global-setup.js    drop, migrate, seed
│   ├── accounts.js        the seeded accounts, by what they are
│   ├── auth.js            signing in the way a person does
│   ├── shell.js           the role picker, the user menu, the two dialogs over the top
│   ├── import-panel.js    the template button, the file control, the total — shared by every import row
│   ├── expired-session.js the dialog a dead session raises, shared by the rows that provoke one
│   ├── pager.js           the one paging control every list draws — #57
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

A count read straight after a navigation is read too early. `openRegister` and the other `open…` helpers wait for
the list's own `GET` to come back, which is the last thing this suite can wait for and is not the thing being
asserted: the response arriving and React having painted the new total are two different moments, and between them
the table is empty. `17b-students-import.spec.js:121` read `0` where it expected `176` on a loaded machine and
passed on every unloaded one - a test that fails only when the CI box is busy, which is when nobody is looking.

So a number read after a fetch is polled - `await expect.poll(() => total(page)).toBe(before)` - rather than read
once. This is not a timeout in disguise: poll re-reads until the value matches or the deadline passes, so a total
that is genuinely wrong still fails, and fails at the same place. A number read off a screen that has already been
asserted against needs no poll: three of the plain reads sit under `await expect(...)` calls on rows of the same
table, and the row appearing and the total changing are one React commit, so the wait above them is the wait.

Four others were removed rather than fixed, and #64 is the record of why. They were counts read after a *refused*
import in `11b` and `14b`. `ImportPanel` calls `onImported` only on success, so a refused import never re-fetches the
list: the total standing on the screen is the one from before the upload, whatever the server did with the file, and
the assertion reads the same whether the rollback held or leaked. Polling that number would have made it no truer.
Two of the four were worse than merely stale - they followed an *empty* file, which has no rows to write, so no
mutation could have moved them at all.

What the four looked like they were proving is proved, in both files, by the atomicity row above them - `11b:131`
and `14b:124` - which reloads the page, re-opens the list and polls a number that came from the server after the
upload. Mutant `M9` of `mutation/11-12-accounts-and-grants.py` commits a refused import instead of rolling it back,
and those two assertions are the ones that fail under it. That single mutant covers every screen's import, because
`backend/lib/importer.js` rolls back on `errors.length > 0` once and every import route calls it - which is also why
a fifth assertion in `11b`, on a file whose rows collide with each other, would have proved nothing new.

The rule the episode leaves behind: a number that cannot be made to fail is not evidence, and dressing it in a poll
makes it look like evidence. Ask where the claim is actually proved, and if it is proved somewhere else, say so in a
comment and delete the assertion.
