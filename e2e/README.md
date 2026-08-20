# The browser seam

The second of the two seams `docs/06-implementation-plan.md` §Testing Decisions describes, added by
[#65](https://github.com/khthana/Deep-QA/issues/65).

`backend/`'s suite exercises the HTTP surface in process and carries almost everything. This one is for the rules that
are only rules once a browser is involved:

- a screen typed into the address bar and **refused by the server**, rather than merely missing from a menu — the
  refusal rows every acceptance checklist repeats;
- a spreadsheet that the screen's own template button produced, filled in, and sent back through the screen's own file
  control — the import rows every acceptance checklist repeats.

Both are half browser and half server, and neither can be stated at the first seam without inventing the browser's
half. That half is the one this system has had wrong before.

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
│   ├── grants-panel.js    ┐
│   ├── history-panel.js   ├ one module per screen or panel: its controls,
│   ├── users-screen.js    │ read as the checklist reads them
│   ├── departments-screen.js
│   ├── subjects-screen.js │
│   └── students-screen.js ┘
└── tests/                 one file per acceptance document, named for the rows it covers
```

Spec files sort alphabetically and run in that order under one worker. `17a-` before `17b-` is that ordering and
nothing else: the refusal file's control row asserts the register still holds the seeded 173, and the import file adds
students.
