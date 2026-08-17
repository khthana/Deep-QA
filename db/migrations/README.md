# Migrations

Numbered SQL files, applied in filename order by `../migrate.js` and recorded in
`schema_migrations`.

| File | What it builds |
|---|---|
| `0001_identity_and_organisation.sql` | Faculty, department, programme, subject and the programme's subject list; students; users, roles, role grants and the activity log. |
| `0002_offerings_and_learning_outcomes.sql` | Offerings, sections, teaching assignments and the weekly plan; PLOs and their mapping to subjects; CLOs with their measurable behaviours and achievement criteria; the continuous-improvement cycle. |
| `0003_assessment_scores_and_rubrics.sql` | Section enrolment, work groups and their change history; the weighting scheme and Activities with their CLO links; marks and assessment evidence; rubrics and their criteria. |

- `NNNN_short_description.sql`, four digits, zero-padded, no gaps.
- Never edit a file that has been applied anywhere but a local machine; add
  another one. Locally, `npm run reset && npm run migrate` is the cheaper move
  while the schema is still being written.
- Do not name the schema. It is on the connection search path, so bare table
  names resolve correctly and the same file applies to the test schema unchanged.
- The full list of applied migrations is asserted in one place: the test file
  belonging to the newest migration. Every older test file checks only that its
  own migration ran, and ran in the right position. Adding a migration therefore
  touches the previous test file once, to hand that assertion on.
- Each file runs inside one transaction together with its ledger row, so a
  statement that refuses to run in a transaction block — `CREATE INDEX
  CONCURRENTLY` — needs the runner changed before it can be used.
