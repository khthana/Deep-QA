# DEEP-Core — Implementation Spec

> Synthesised from the `/grill-with-docs` session of 2026-08-16.
> Companion documents: [`CONTEXT.md`](../CONTEXT.md) (glossary) · [ADR-0001](./adr/0001-three-tier-key-strategy.md) ·
> [ADR-0002](./adr/0002-server-side-rbac.md) · [ADR-0003](./adr/0003-clo-belongs-to-program-subject-year.md)
> Source requirements: [`01-requirements.md`](./01-requirements.md) (R001–R089, BR-01–BR-25) ·
> [`05-screen-api-mapping.md`](./05-screen-api-mapping.md) (36 screens, 130 endpoints)

## Problem Statement

DEEP-Core exists as a student thesis project: a React frontend and an Express backend covering 36 screens and 130
endpoints, deployed once at deep-core.net. What was handed over is the source code and a thesis describing it — and
nothing else. There is no database. Not a schema file, not a migration, not a dump. Every table the code queries
exists only as a printed table in a thesis chapter.

The consequence is that **the system cannot be run at all**, and so nothing about it can be verified. That matters
because the code was written by undergraduates without production experience, and a first reading already surfaces
defects that would each be serious on their own:

- **Authorization is not enforced.** The session token carries identity only. Four of thirty-two controllers look at
  privileges, and those read the caller's role and scope *from the request body* — the client declares its own
  permissions. Access control is the sidebar hiding menu items. Every scope requirement in the thesis (R004, R006,
  R014, R033, R042, R054) is therefore unimplemented, and the accreditation data the system exists to protect is
  readable by any authenticated account.
- **A core workflow is unreachable.** The central student data screen renders "add student" and "import students"
  buttons that are wired to nothing, while the endpoints behind them exist and are never called. Because a student
  must exist centrally before a Teacher can enrol them in a Section (BR-25), the entire Teacher and assessment half of
  the system has no way to obtain data.
- **The schema encodes rules that cannot be true.** Section numbers, CLO codes and PLO codes are each declared
  globally unique, so the system can hold one "Section 1" in total, and only one Program may ever own a "PLO1".
- **CLOs belong to Sections**, so two Sections of the same Subject may define different learning outcomes in the same
  year, while programme-level reporting sums attainment across them as though they were comparable.

A rebuild that fixes these at the end would mean months of work before anyone can click anything. The advisor needs to
be able to sit down and use each screen as it is finished, against real data, and say whether it is right.

## Solution

Rebuild DEEP-Core screen by screen into fresh `backend/` and `frontend/` trees, copying the student implementation
forward and correcting it as each screen is reached. The existing trees stay in place, read-only, as reference for the
whole project and are deleted when it completes.

Two properties make the rebuild reviewable:

**The database comes first.** A single foundation ticket provisions PostgreSQL in Docker, creates the 32 tables the
code actually queries — recovered from the SQL in the models, not from the thesis prose — and seeds a working dataset
covering one Program, one Offering and its enrolled cohort. From that point every screen can be exercised against real
data, so no mock API layer is built at any stage.

**Every ticket is one screen, end to end.** A ticket carries the schema it needs, the endpoints behind it, the screen
itself, its automated tests, and a short acceptance checklist the advisor works through by hand. Finishing a ticket
means the screen genuinely works; there is no separate integration phase where things are discovered to be broken.

Tickets are ordered so that each one has data to display by the time it is reached: foundations and identity, then
Faculty and Department master data, then the Curriculum Committee's setup screens, then the Teacher's setup and
scoring screens, and only then the analytics screens on both sides — which compute from scores and would otherwise be
empty when tested.

Authorization is rebuilt once, early, as shared middleware, so that every screen delivered afterwards is protected by
construction rather than retrofitted.

## User Stories

### Foundation and identity

1. As a developer, I want the database schema and a seeded dataset created in one step, so that I can run the system
   locally before any screen work begins.
2. As a developer, I want the schema derived from the queries the code actually issues, so that the tables match the
   application rather than a thesis chapter that drifted from it.
3. As a developer, I want the ~18 tables that appear in the thesis ER diagram but that no code touches left
   unbuilt, so that the schema describes the real system.
4. As a developer, I want the seed data to cover one complete Program, Offering, cohort and score set, so that
   analytics screens have something to compute from when they are reached.
5. As a developer, I want the schema name configured once on the connection, so that queries read as plain SQL and a
   test schema can be selected without touching any query.
6. As a developer, I want the application object importable without starting a listener, so that tests can exercise
   the real HTTP surface in-process.
7. As any user, I want to sign in with my KMITL Google account, so that I do not manage another password.
8. As a Central Admin or External Assessor, I want to sign in with a username and password, so that I can reach the
   system without a KMITL Google identity.
9. As a developer, I want password sign-in available for every role in development only, so that I can test each
   role's screens without provisioning Google credentials for each one.
10. As any user, I want to be rejected when my email is outside the KMITL domain, so that outsiders cannot enter.
11. As any user, I want to be rejected when my KMITL account has no role in the system, so that having a university
    account is not by itself access.
12. As a signed-in user, I want to be sent to the area matching my highest-priority role, so that I land somewhere
    useful.
13. As a user holding several roles, I want to choose which role I am acting as, defaulting to the highest, so that I
    can work in each capacity.
14. As a signed-in user, I want a sidebar showing only the menus my current role may use, so that I am not offered
    actions I cannot take.
15. As a signed-in user, I want to be signed out after a period of inactivity, so that an unattended session is not
    left open.
16. As a signed-in user, I want to change my own password, so that I can rotate it.
17. As any user, I want every request checked against the roles recorded for me in the database, so that access does
    not depend on what my browser claims about me.
18. As any user, I want a role revoked by an administrator to take effect on my next request, so that removal of
    access is immediate.
19. As a Central Admin, I want to create, edit and deactivate user accounts, so that staff can be admitted to the
    system.
20. As a Central Admin, I want to import users from a spreadsheet using a template the system provides, so that I can
    admit a department's staff at once.
21. As a Central Admin, I want to grant a user several roles, each confined to a scope, so that one person can be both
    a Curriculum Committee member and a Teacher.
22. As a Central Admin, I want to create External Assessor accounts with a validity period, so that reviewers have
    access only during the review.
23. As an administrator, I want to be prevented from granting a role wider than my own scope, so that privilege cannot
    be escalated sideways.
24. As a Central Admin, I want to review each user's sign-in and activity history, so that I can investigate what
    happened to an account.

### Faculty and Department master data

25. As a Faculty Admin, I want to add, edit and remove Departments, so that the faculty structure is current.
26. As a Department Admin, I want to be refused access to Department records, so that the boundary between our
    responsibilities is enforced and not merely hidden.
27. As a Faculty Admin, I want to add, edit and remove Programs, so that the curricula on offer are recorded.
28. As a Department Admin, I want to manage only the Programs of my own Department, so that I cannot alter another
    department's curricula.
29. As an administrator, I want a Program that is already referenced to be deactivated rather than deleted, so that
    historical records stay intact.
30. As an administrator, I want to confirm before any deletion, so that a misclick does not destroy data.
31. As a Department Admin, I want to add, edit and remove the Subjects of my own Department with code, credits,
    bilingual names and description, so that the catalogue is complete — and, as story 26 asks for Departments, I
    want the Faculty Admin refused access to the catalogue, so that what a department teaches is maintained by the
    department that teaches it. (This story read "As an administrator" until #61; that vagueness was the question
    #61 answered.)
32. As an administrator, I want to import Departments, Programs and Subjects from spreadsheets using system
    templates, so that setting up a faculty does not mean typing hundreds of rows.
33. As an administrator, I want to download the template for every import, so that I know the expected columns.
34. As an administrator, I want an import to report which rows failed and why, so that I can correct and retry.
35. As an administrator, I want to browse the central student register filtered by Program, so that I can confirm who
    is enrolled.
36. As an administrator, I want to add students to the central register individually and by spreadsheet import, so
    that Teachers can subsequently enrol them into Sections.
37. As any user, I want tables of more than ten rows paginated, so that long lists stay usable.

### Curriculum Committee setup

38. As a Curriculum Committee member, I want to place Subjects into my Program and mark each required or elective, so
    that the curriculum structure is defined.
39. As a Curriculum Committee member, I want to be prevented from entering a Subject code that is not in the
    catalogue, so that the curriculum cannot reference something that does not exist.
40. As a Curriculum Committee member, I want a Program Subject that is referenced to be deactivated rather than
    deleted, so that past Offerings remain valid.
41. As a Curriculum Committee member, I want to define my Program's PLOs as a tree of main and sub-outcomes, each
    typed as knowledge, skills, ethics or character, so that the outcome structure matches the accreditation
    framework.
42. As a Curriculum Committee member, I want each Program to hold its own PLO codes independently, so that two
    Programs may each have a "PLO1".
43. As a Curriculum Committee member, I want to map each Subject to each PLO at one of five levels — Introduced,
    Developed, Practiced, Assessed, or Empty — so that outcome coverage across the curriculum is visible.
44. As a Curriculum Committee member, I want to export the outcome-to-Subject mapping as a PDF with Thai text
    rendering correctly, so that I can submit it as accreditation evidence.
45. As a Curriculum Committee member, I want to define reusable Rubrics for my Program with weighted criteria
    described at four levels, so that Teachers assess consistently.
46. As a Curriculum Committee member, I want to open a Subject for a given academic year and semester, so that it can
    be taught.
47. As a Curriculum Committee member, I want to be the only role that may create Offerings, so that the teaching
    schedule has a single owner.
48. As a Curriculum Committee member, I want to open several Sections per Offering and assign Teachers to each, so
    that large cohorts can be split.
49. As a Curriculum Committee member, I want to assign only people already registered as users, so that Sections
    cannot reference someone who cannot sign in.
50. As a Curriculum Committee member, I want to copy an entire semester's Offerings from a previous year and
    semester, so that I do not rebuild the schedule each term.
51. As a Curriculum Committee member, I want Section numbers to be unique only within their Offering, so that every
    Subject can have its own "Section 1".

### Teacher setup

52. As a Teacher, I want to see the Sections I teach in the current semester, so that I can choose one to work on.
53. As a Teacher, I want the Section-specific menus to appear only after I select a Section, so that the actions I see
    always have a subject in context.
54. As a Teacher, I want to be refused access to Sections I do not teach, so that colleagues' scores are private.
55. As a Teacher, I want to enrol students into my Section individually or by spreadsheet import, so that my class
    list is accurate.
56. As a Teacher, I want enrolment to be rejected for students absent from the central register, so that scores are
    never attached to an unknown person.
57. As a Teacher, I want to organise students into Work Groups, so that group work can be assessed.
58. As a Teacher, I want a Work Group limited to ten members and each student limited to one group per Section, so
    that group assignment stays valid.
59. As a Teacher, I want a history of Work Group changes, so that I can see who moved between groups and when.
60. As a Teacher, I want to define the Section's CLOs with teaching and assessment methods, and link each to a PLO, so
    that course outcomes ladder up to programme outcomes.
61. As a Teacher, I want the CLO set to be shared by every Section of the same Offering, so that students in different
    Sections are held to the same outcomes.
62. As a Teacher, I want each academic year to hold its own CLO set, so that revising outcomes this year does not
    change the meaning of last year's recorded scores.
63. As a Teacher, I want to record Measurable Behaviors for each CLO with a cognitive level, so that assessment is
    tied to observable evidence.
64. As a Teacher, I want to define four-band Achievement Criteria for each CLO, so that scores translate into
    attainment levels.
65. As a Teacher, I want to define the Section's weighting categories, so that the assessment scheme is explicit.
66. As a Teacher, I want to be prevented from saving weightings that do not total 100, so that the scheme is always
    complete.
67. As a Teacher, I want the weighting scheme shared across Sections of one Offering, so that attainment summed across
    Sections is computed on one basis.
68. As a Teacher, I want to record a weekly teaching plan, so that Activities can be tied to the week they belong to.
69. As a Teacher, I want to create Activities as individual or group work, with a full mark, dates and a weighting
    category, so that assessed work is defined.
70. As a Teacher, I want to link an Activity to CLOs with a weight for each, so that its marks can be attributed to
    outcomes.
71. As a Teacher, I want my Activities to remain my own Section's, so that I keep freedom over how I assess within the
    shared scheme.

### Scoring and evidence

72. As a Teacher, I want to enter marks for each student and Activity, so that attainment can be computed.
73. As a Teacher, I want to switch between entering one mark per Activity and one mark per CLO, so that I can record
    at the granularity I assessed.
74. As a Teacher, I want to switch between individual and group entry, so that group work is entered once per group.
75. As a Teacher, I want to import marks from a spreadsheet, so that I can transfer them from my own marking sheet.
76. As a Teacher, I want an import checked for student count, student codes, names and CLO columns before it is
    accepted, so that a misaligned sheet cannot corrupt the record.
77. As a Teacher, I want to re-save marks without creating duplicates, so that corrections are straightforward.
78. As a Teacher, I want to attach assessment evidence to an Activity — the brief and a work sample at each of the
    four bands — so that the assessment is defensible at accreditation.
79. As a Teacher, I want only PDFs accepted as evidence, so that reviewers can open every file.
80. As a Teacher, I want evidence files readable only by people entitled to see them, so that student work is not
    exposed to anyone with a link.
81. As a Teacher, I want to replace or remove an evidence file, so that mistakes can be corrected.

### Course-level results

82. As a Teacher, I want CLO attainment for my Section shown as a table, so that I can see which outcomes were met.
83. As a Teacher, I want a CLO marked as passed when more than sixty per cent of students meet its criterion, so that
    attainment has a consistent definition.
84. As a Teacher, I want CLO scores normalised to a five-point scale, so that outcomes assessed out of different
    totals can be compared.
85. As a Teacher, I want a radar chart of an individual student's outcomes, so that I can advise them.
86. As a Teacher, I want to compare individual students on one radar chart, so that I can see the spread.
87. As a Teacher, I want a radar chart of Section-level attainment, so that I can see the shape of the cohort's
    performance.
88. As a Teacher, I want to compare this Section against previous years, so that I can see whether changes worked.
89. As a Teacher, I want mean score, pass rate and student count alongside the comparison, so that the chart has
    context.
90. As a Teacher, I want a heatmap of attainment per CLO, so that weak outcomes stand out.
91. As a Teacher, I want the CLOs needing attention listed explicitly, so that I know where to act.
92. As a Teacher, I want a diagram linking CLOs to the Activities that assess them, so that I can see which outcomes
    are thinly assessed.
93. As a Teacher, I want counts of CLOs, Activities and links plus mean score per CLO, so that coverage is
    quantified.
94. As a Teacher, I want to export the Section assessment report as a PDF, so that it can be filed as evidence.
95. As a Teacher, I want to record a continuous improvement entry each year — summary, reflection, improvements made,
    and next steps — so that the improvement cycle is documented.

### Programme-level results

96. As a Curriculum Committee member, I want PLO attainment for an intake cohort shown as a table, so that I can judge
    whether the Program is delivering its outcomes.
97. As a Curriculum Committee member, I want to compare PLO attainment across intake years, so that trends are
    visible.
98. As a Curriculum Committee member, I want PLO attainment for an individual student, so that I can review a
    specific case.
99. As a Curriculum Committee member, I want a heatmap of every student's PLO attainment, so that I can see the
    distribution across the cohort.
100. As a Curriculum Committee member, I want to drill from a PLO into the Activities and evidence behind it, so that
     I can verify a number rather than trust it.
101. As a Curriculum Committee member, I want these screens named for what they show — programme level, not course
     level — so that they are not confused with a Teacher's Section results.
102. As an External Assessor, I want read access to attainment and evidence during my review window, so that I can
     carry out accreditation review.

### Delivery

103. As the advisor, I want each ticket to end with a short checklist I work through in the running system, so that I
     accept work by using it rather than by reading a diff.
104. As the advisor, I want every ticket's rules covered by automated tests that run against a real database, so that
     a screen accepted in week two is still working in week ten.
105. As the advisor, I want the student's original code kept untouched alongside the rebuild, so that I can compare
     behaviour at any point and delete it only when the project completes.

## Implementation Decisions

### Repository layout

The rebuild lands in new `backend/`, `frontend/` and `db/` trees at the repository root. The two inherited trees
remain as read-only reference for the duration and are removed at completion. Before any of this, the repository takes
a baseline commit of the student's code exactly as delivered — the repository currently has no commits at all, so
there is no recoverable history without it. A nested git repository inside the frontend tree is removed first, as it
would otherwise be committed as a broken gitlink. Secrets are excluded from version control before that commit: the
inherited environment file holds live Google OAuth, database, session and mail credentials, and the GitHub repository
is public.

### Database and keys

PostgreSQL 16 runs in Docker. The schema is created by numbered SQL migration files applied by a small runner; no ORM
or migration framework is introduced, since the data layer is hand-written SQL over a connection pool. The schema name
is set once via the connection's search path, replacing the 448 places where it is currently concatenated into query
strings — this also makes selecting a test schema a configuration change rather than a code change.

Keys follow the three tiers of ADR-0001. Reference data keeps its real-world code as the primary key. Junctions and
assignments drop their surrogate identifier in favour of the composite natural key. Deeply nested records keep a
surrogate primary key for use in foreign keys and URLs, but carry a uniqueness constraint over the full natural key —
which corrects the inherited schema's globally-unique Section number, CLO code and PLO code.

CLOs and the weighting scheme move to the (Program, Subject, academic year) grain per ADR-0003. Activities, marks and
evidence stay Section-level and are unaffected, since they reference a CLO without depending on what it hangs off.

Only the 32 tables the code actually queries are built. The tables appearing solely in the thesis ER diagram are not.
The inherited code also reveals one table the thesis never documents, holding user profile images; it is built only if
the screen that uses it is in scope.

### Authorization

Authorization is rebuilt once as shared middleware per ADR-0002, before any screen ticket. Middleware loads the
caller's active role grants from the database on each request and exposes them to handlers; route declarations state
the role and scope each endpoint requires. Role and scope are removed from every request body — the server derives
them and never trusts the client. Roles are read per request rather than embedded in the session token so that a
revoked grant takes effect immediately. The inherited origin-header gate is not carried forward; it is bypassed
entirely outside production and trivially spoofed within it.

Central Admin's scope is deliberately narrow — user accounts and permission grants only, with no access to curriculum
data. This matches both the thesis and the inherited menu configuration, and is a separation of duties rather than an
oversight.

The Subject catalogue is the Department Admin's alone, settled by #61 after the question surfaced while walking the
pagination checklist. Story 31 said only "an administrator" where stories 25 and 27 name the Faculty Admin by hand,
and the gap was closed the narrow way: content a department owns is content that department maintains, so a Faculty
Admin reaches neither the writes nor the reads of the Subjects screen and is refused it at the server, exactly as a
Department Admin is refused Departments. The ruling is about Subjects and nothing else — Departments and Programs are
unchanged, and a Faculty Admin still places subjects into a curriculum on the Program Subjects screen, because
placing one is not maintaining the catalogue.

### API surface

Endpoint paths are carried forward, with two corrections made while each is copied: the two misspelled route prefixes
are fixed, and endpoints that only read data move from POST to GET with query parameters. Path naming is otherwise
left alone; no wholesale REST redesign is attempted. The screen-to-endpoint mapping document is updated as each screen
is rebuilt.

Endpoints with no caller are not copied into the new tree. They remain available in the reference tree if a later
ticket proves one is needed. The exception is the central student register's add and import endpoints: those are
uncalled because the buttons were never wired, not because the capability is unwanted, and they are connected as part
of that screen's ticket.

### Frontend

The UI is carried over unchanged in appearance. The four programme-level analytics screens are renamed from "course
level" to "programme level" across routes, files and components, since they report Program attainment and currently
collide in name with the Teacher's Section results screen; the Thai menu labels already say programme level and do not
change. The duplicated route declaration and the orphaned component files are not carried over. The hook that fetches
Section student lists is rewritten — it calls an endpoint that does not exist and unconditionally discards its result,
so two results screens receive an empty list in all cases.

Spreadsheet import appears on roughly ten screens and always with the same shape: download a system-provided template,
upload a completed file, receive per-row errors. This is extracted into a shared module the first time a screen needs
it rather than reimplemented per screen.

### Sequencing

Work proceeds in eight phases: foundation; identity and authorization; Faculty and Department master data; Curriculum
Committee setup; Teacher setup; scoring and evidence; course-level results; programme-level results. Roughly forty
tickets, each one screen.

The ordering follows the requested role sequence except for the four programme-level analytics screens, which move to
the end. They compute from marks, which exist only once the Teacher scoring screens are complete; built earlier they
would render empty and could not be accepted. One inherited screen is a placeholder with no menu entry and no
endpoints, and is dropped.

## Testing Decisions

### What a good test looks like here

A test states a rule from the requirements or business rules and asserts it through the interface a real client uses.
It never reaches into a module to check how a result was reached, and it never asserts on markup. If a test would
still pass after the rule it names was deleted, it is not testing that rule.

### The seam

There is one seam: the HTTP surface of the backend, exercised in-process against a real PostgreSQL database. This is
the outermost boundary the frontend consumes, so tests are expressed in the same terms as the screen-to-endpoint
mapping and as the acceptance checklists — a rule, a request, a response.

Enabling it requires the only structural change to the inherited backend: the application currently builds itself and
starts listening in one file with no export, so it is split into a module that builds and exports the configured
application and a thin entry point that listens.

Tests run against a separate schema in the same database container, selected through the connection's search path.
Migrations are applied to it and data is reset between test files.

Authentication is not stubbed. Tests sign in through the real endpoint using seeded development accounts and send the
resulting session cookie, so every authorization assertion exercises the middleware that will run in production. This
matters more than usual here, because the inherited system's central defect was authorization that existed only in
appearance — a stubbed session would reproduce exactly that blind spot.

Upload endpoints — evidence and every spreadsheet import — are exercised at the same seam by attaching real files.

### What is not separately tested

The scoring calculations do not get their own seam. Their rules — the sixty per cent pass threshold, normalisation to
a five-point scale, the heatmap bands — are asserted by seeding a scenario and reading the results endpoint, supported
by fixture builders that make scenarios cheap to express. This keeps the calculation modules free to be reorganised
without rewriting tests, at the cost of more setup per case.

Frontend components are not unit-tested. The UI is carried over unchanged by instruction, so component tests would
pin down markup that was not designed here and that no one intends to change.

### Prior art

There is none. Neither inherited application has a single test: the backend's test script exits with an error, and the
frontend carries only the scaffold test its generator produced. The first ticket to add tests therefore establishes
the patterns — application factory, schema-per-run, fixture builders, authenticated request helpers — that every
later ticket follows.

### Acceptance

Alongside automated tests, each ticket carries a short checklist of steps performed by hand in the running system,
written in terms of what a named seeded account does and sees. A ticket is complete when its tests pass and its
checklist has been worked through.

## Out of Scope

- **Visual redesign.** The UI is reproduced as-is. Any proposal to change it is raised as a question, not implemented.
- **Framework migration.** The frontend stays on its current toolchain despite it being superseded, and the backend
  stays on hand-written SQL rather than gaining an ORM.
- **A REST redesign.** Beyond the misspellings and the read-only verb change, endpoint naming is untouched.
- **The Student portal.** Student-facing outcome portfolios live at a separate deployment and are not part of this
  work.
- **The tables and endpoints with no caller.** They stay in the reference tree unless a ticket proves otherwise.
- **Production deployment.** The existing CI/CD and container definitions are not reworked; this spec concerns local
  development, verification and acceptance.
- **Google OAuth configuration for local development.** Development sign-in uses passwords for all roles; the OAuth
  path is preserved in code and tested against a real Google project only when a staging environment exists.
- **Breaking the spec into tickets.** This document defines the whole; the individual tickets are generated from it as
  a separate step.

## Further Notes

**Two security findings deserve to be tracked from the start**, both on the evidence upload screen. The upload
middleware enforces a size limit but performs no file type filtering of any kind, so the PDF-only requirement is
enforced nowhere on either side. Separately, the evidence directory is served as static files with no authentication,
so any evidence document is retrievable by anyone who knows or guesses its path. Both should be resolved in that
screen's ticket rather than deferred.

**The thesis document is not authoritative where it disagrees with the code.** Two table names differ, one table is
undocumented, and roughly eighteen documented tables are unused. Where the two disagree, the SQL in the models is the
record of what was built. One documented discrepancy runs the other way: the observation that the Central Admin menu
contradicts the thesis is itself a misreading — the thesis confines that role to user and permission management, which
is what the code does.

**The inherited continuous-improvement table already sits at the (Subject, Program, academic year) grain** while
referencing Section-level CLOs. That inconsistency in the original design is what indicated the intended grain, and
resolving it is what ADR-0003 records.

**Where the requested approach was changed, and why.** Two instructions from the brief were revised during the design
session and the reasoning is recorded here so it is not relitigated. Building the frontend first against a mock API
was dropped: the backend already exists in full and only the database is missing, so mocks would duplicate working
code and could not exercise the business rules where the real defects live. And the programme-level analytics screens
were moved out of their requested position in the role ordering to the end of the schedule, because they compute from
data that does not exist until the Teacher screens are finished.
