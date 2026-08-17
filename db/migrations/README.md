# Migrations

Numbered SQL files, applied in filename order by `../migrate.js` and recorded in
`schema_migrations`. Empty until ticket #3 — this ticket only builds the runner.

- `NNNN_short_description.sql`, four digits, zero-padded, no gaps.
- Never edit a file that has been applied anywhere but a local machine; add
  another one. Locally, `npm run reset && npm run migrate` is the cheaper move
  while the schema is still being written.
- Do not name the schema. It is on the connection search path, so bare table
  names resolve correctly and the same file applies to the test schema unchanged.
- Each file runs inside one transaction together with its ledger row, so a
  statement that refuses to run in a transaction block — `CREATE INDEX
  CONCURRENTLY` — needs the runner changed before it can be used.
