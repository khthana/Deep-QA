/**
 * The head of every table - `docs/ui-consistency.md` rule 5, the owner's
 * answer of 27 November 2569 (#314).
 *
 * Light grey ground and grey type at the table's own size: the administration
 * screens' head, which replaced the teacher and report screens'
 * `border-b text-xs text-slate-500` and the three heads that were neither
 * (CLO assessment, the users' history, the import panel's refusals). The
 * weight is the browser's own for a `<th>`, which is what the administration
 * screens always drew, so a cell inside the head does not set one either.
 *
 * One constant rather than a string copied into every file, so the next table
 * cannot drift by a typo; `scripts/table-heads.js` asks every `<thead>` in
 * `src/` whether it reads this.
 */
export const TABLE_HEAD = 'bg-gray-50 text-gray-600'
