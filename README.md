# DEEP-Core

Curriculum and learning-outcomes management for the Faculty of Engineering, KMITL. Records what a programme intends
its graduates to learn, how each subject teaches and assesses that, and how far each student actually got — as
evidence for TABEE accreditation.

**Status: the database is built and seeded, and the backend has a skeleton.** Alongside them sits the student
implementation exactly as delivered, and the design work planning its replacement. All four migrations are written,
one command fills them with the acceptance dataset, and `backend/` serves one route — a health check — over a test
harness the screen tickets build on. No screen exists yet: sign-in, ticket
[#8](https://github.com/khthana/Deep-QA/issues/8), is the next piece of work.

## Layout

```
Deep-QA/
├── db/                  PostgreSQL container, migrations and their runner
├── backend/             the HTTP API
├── DEEP-QA-BACKEND/     student implementation — read-only reference
├── DEEP-QA-FRONTEND/    student implementation — read-only reference
├── docs/                specs, ADRs, plan and ticket breakdown
├── scripts/             tooling (issue publishing)
├── CONTEXT.md           domain glossary
└── CLAUDE.md            orientation for AI agents
```

The rebuild lands in new `backend/`, `frontend/` and `db/` trees, one screen at a time. The two `DEEP-QA-*`
directories are never edited — they are copied from, and deleted once the rebuild completes.

## Where to start reading

| | |
|---|---|
| [`CONTEXT.md`](./CONTEXT.md) | Domain glossary. Read before writing anything that names a domain concept. |
| [`docs/06-implementation-plan.md`](./docs/06-implementation-plan.md) | What is being built and why. |
| [`docs/07-ticket-breakdown.md`](./docs/07-ticket-breakdown.md) | The 44 tickets and their dependency order. |
| [`docs/adr/`](./docs/adr/) | Decisions that are expensive to reverse. Binding. |
| [`docs/01`–`05`](./docs/) | Extracted from the thesis and from scanning the student code. **Descriptive of what was delivered, not prescriptive of what to build** — each carries a note where the rebuild diverges. |

Work is tracked as [GitHub issues](https://github.com/khthana/Deep-QA/issues): #1 is the spec, #2–#45 are the
tickets, wired with native blocking dependencies.

## Setting up on a new machine

Requires Docker, Node 20 or later, and the [`gh`](https://cli.github.com/) CLI authenticated against this repository.

There are two ways to move this project, and they differ in exactly one respect: **what is gitignored travels with a
folder copy and does not travel with a clone.** That difference matters here, because the gitignored material
includes the credentials without which nothing runs.

### Copying the folder

Copy the whole `Deep-QA` directory and everything comes with it, including the credentials a clone would leave behind.
But **exclude `node_modules` when you do** — the directory is 4.7 GB, and the frontend's dependencies account for
4.6 GB of that. Excluding them, and the compiled bundle, brings the copy down to roughly 110 MB.

```powershell
robocopy "C:\Users\khtha\OneDrive\Desktop\Code\Deep-QA" "D:\Deep-QA" /E /XD node_modules build
```

Then on the new machine:

```bash
npm install --prefix DEEP-QA-BACKEND
npm install --prefix DEEP-QA-FRONTEND
```

Copying `node_modules` would in fact work — the one native dependency, `bcrypt`, ships prebuilt binaries for every
platform this project targets, so the usual reason to reinstall does not apply. It is simply not worth forty times the
transfer.

What the 110 MB does include: the full git history, both `.env` files, `DEEP-QA-BACKEND/uploads/`, the thesis PDF and
all documentation. `_local/` comes too and is disposable — see [`_local/README.md`](./_local/README.md).

### Cloning

```bash
git clone https://github.com/khthana/Deep-QA.git
cd Deep-QA
npm install --prefix DEEP-QA-BACKEND
npm install --prefix DEEP-QA-FRONTEND
```

Then bring the gitignored material across **by hand**, over a channel that is not this repository:

| What | Why it is excluded |
|---|---|
| `DEEP-QA-BACKEND/.env` · `DEEP-QA-FRONTEND/.env` | Live credentials, and this repository is public. [`.env.example`](./.env.example) documents every variable. Use a password manager or a USB stick — not email or chat. |
| `DEEP-QA-BACKEND/uploads/` | Around 200 assessment evidence files uploaded through the running system. This is student work: treat it as personal data, and never commit it. Not needed for the rebuild. |

## The database

The rebuild's database is a PostgreSQL 16 container plus numbered SQL migrations under [`db/`](./db). From nothing:

```bash
cp .env.example .env      # one .env at the repository root; it is gitignored
cd db
npm install
npm run db:up             # PostgreSQL 16 on the port named by DB_PORT
npm run migrate           # applies every pending migration, in order
npm run seed              # fills it with the development and acceptance dataset
```

`db:up` publishes **5433**, not 5432 — a PostgreSQL installed directly on the machine commonly holds 5432, and from the
client's side the two are indistinguishable. Change `DB_PORT` if that does not suit; it is both the published port and
the port the pool dials.

`DB_USER`, `DB_PASS` and `DB_NAME` are what the container is *created* with. Changing them later has no effect until
the volume is destroyed. The example values are local-only and deliberately uninteresting; nothing here shares
credentials with the deployed system.

| Command | What it does |
|---|---|
| `npm run db:up` | Starts the container. Data lives in the named volume `deep-core-pgdata`. |
| `npm run db:down` | Stops it. **The volume survives** — the data is still there on the next `db:up`. |
| `npm run db:down -- -v` | Stops it *and destroys the volume*. The only way to change the database credentials. |
| `npm run migrate` | Applies pending migrations in filename order. Safe to run twice; the second run applies nothing. |
| `npm run reset` | Drops the schema and recreates it empty. `migrate` afterwards replays the whole history. |
| `npm run seed` | Fills a migrated schema with the dataset below. One transaction, and safe to run twice — a second run changes nothing. |
| `npm test` | Runs the runner's tests against the same container, each in a throwaway schema named after the test and the process, dropped when it finishes. |

Migrations never name the schema: `DB_SCHEMA` is set on the connection's search path, so a query naming a bare table
resolves in the right place and pointing the tests at their own schema is a configuration change rather than a code
change. Tickets [#2](https://github.com/khthana/Deep-QA/issues/2)–[#5](https://github.com/khthana/Deep-QA/issues/5)
and [#46](https://github.com/khthana/Deep-QA/issues/46) built the runner and the four migrations, so `migrate` leaves
a schema with all 33 tables in it.

### The seeded dataset

`npm run seed` fills those tables with the test data
[`docs/04`](./docs/04-test-cases-v0.1.md) §1.3 already specifies, so an acceptance run and a written test case are
talking about the same rows:

- Department `05` วิศวกรรมคอมพิวเตอร์ under programme `0501`, plus a second department and a second programme that
  exist only so a permission rule can be shown to refuse something.
- Subject `01076105` การเขียนโปรแกรมเชิงวัตถุ, opened for **2568 semester 2** across two sections, with all 113
  students enrolled — and again for **2567**, with a smaller cohort and its own completed marks, so the
  year-over-year screens have two points to compare.
- `PLO-1`–`PLO-13` with their sub-outcomes, `CLO-1`–`CLO-9` with measurable behaviours and achievement criteria for
  each year, and a weighting of โครงงาน 40 / กลางภาค 30 / ปลายภาค 30.
- Five activities per section, every one mapped to CLOs, and a mark for every enrolled student on every one of them.
- Work groups of seven or eight — the roll split into even shares rather than filled to a limit, so no group is
  left with one member — inside BR-06's ceiling of ten, with no student in two.

Everything is deterministic — names, marks and group memberships come from a seeded generator, not from
`Math.random` — so a checklist that names a particular student and a particular mark stays true after a reset.

### The seeded accounts

Every account below signs in with the same password:

```
deep-core-local
```

It is local-only and deliberately uninteresting, in the same spirit as `DB_PASS`. This seed fills an empty local
database and the accounts it opens have nothing behind them; nothing here is a credential for anything deployed.

| Alias in `docs/04` | Sign in as | Role | Scope |
|---|---|---|---|
| `U_ADMIN` | `admin@kmitl.ac.th` | ผู้ดูแลระบบกลาง | the whole system |
| `U_FAC` | `faculty.admin@kmitl.ac.th` | ผู้ดูแลระบบระดับคณะ | คณะวิศวกรรมศาสตร์ |
| `U_DEPT` | `dept.admin.05@kmitl.ac.th` | ผู้ดูแลระบบระดับภาควิชา | ภาควิชา `05` |
| `U_DEPT2` | `dept.admin.01@kmitl.ac.th` | ผู้ดูแลระบบระดับภาควิชา | ภาควิชา `01` — **cross-scope** |
| `U_COM` | `committee.0501@kmitl.ac.th` | กรรมการหลักสูตร | หลักสูตร `0501` |
| `U_COM2` | `committee.0503@kmitl.ac.th` | กรรมการหลักสูตร | หลักสูตร `0503` — **cross-scope** |
| `U_TEACH` | `teacher.one@kmitl.ac.th` | อาจารย์ผู้สอน | กลุ่มเรียน 1 of `01076105` |
| `U_TEACH2` | `teacher.two@kmitl.ac.th` | อาจารย์ผู้สอน | **teaches nothing** |
| `U_EXT` | `external.assessor@kmitl.ac.th` | ผู้ประเมินภายนอก | หลักสูตร `0501` |
| `U_MULTI` | `multi.role@kmitl.ac.th` | กรรมการหลักสูตร **and** อาจารย์ผู้สอน | `0501` and กลุ่มเรียน 2 |
| `U_NONKMITL` | `assessor@tabee-review.org` | ผู้ประเมินภายนอก | outside `@kmitl.ac.th` (R010) |

The last five rows are the point of the list. A permission rule is only tested by an account that should be refused,
so the dataset ships a committee member and a department admin scoped elsewhere, a teacher with no sections, an
account holding two roles at once, and an address outside the university domain.

## The backend

```bash
cd db && npm install      # backend/ reaches ../db for the pool and the runner
cd ../backend && npm install
npm start                 # http://localhost:PORT, from the root .env
```

The first line is not optional. `backend/` declares only what it uses directly; the pool, the migration runner and
their `pg` and `dotenv` dependencies belong to `db/` and are required across the directory boundary rather than
copied — a second copy of the runner would be a copy that can drift from the schema it describes.

`npm start` binds a port; nothing else in the tree does. `app.js` builds the application and returns it, `server.js`
is the only caller that starts it listening — which is what lets the whole suite run in-process.

```bash
npm test                  # from backend/
```

The tests need `db/`'s dependencies installed, the container running (`npm run db:up` in `db/`) and the root `.env`
present, but **not** a migrated
development schema: each test file creates a schema of its own named after the file and the process, migrates it,
and drops it when it finishes. `DB_SCHEMA` is never opened, so a suite run cannot touch development data and two
files cannot collide.

| Command | What it does |
|---|---|
| `npm start` | Starts the API on `PORT`. |
| `npm test` | Runs every `test/*.test.js`, each against its own throwaway schema. |
| `node --test test/smoke.test.js` | One file, when that is all you want. |

`test/fixtures.js` builds the core chain — Program, Subject, Offering, Section, enrolment, CLO, Activity, marks — so
a scenario is a few lines: `coreChain(pool, 'tag')` returns every identifier along the way, and the individual
builders compose onto what it made.

Note that the backend and a CRA frontend both read `PORT`, and the last assignment in a `.env` wins. The root `.env`
holds the backend's; the frontend section of [`.env.example`](./.env.example) is copied into `frontend/.env` instead.

## Provenance

Built as undergraduate thesis project CE68-25 by Chanakan Sue-suwan, Narongrit Khajeejit and Teerachat Sutthi,
supervised at the Department of Computer Engineering, KMITL. The thesis PDF is in the repository root and is the
source for `docs/01`–`04`.
