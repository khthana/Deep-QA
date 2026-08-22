# -*- coding: utf-8 -*-
"""
#56 ไฟล์ผิดกล่องถูกรายงานว่าข้อมูลเสีย - the wrong file, reported as bad data.

Three mutants against the backend seam, not the browser one: what #56 changed
is which sentence the server answers with, and `backend/test/*.test.js` is where
that is asked.

    python mutation/56-wrong-template.py save
    python mutation/56-wrong-template.py <mutant>
    cd backend && node --test test/departments.test.js test/programs.test.js
    python mutation/56-wrong-template.py restore

`nocheck` is the state the six import boxes were in before this ticket. `strict`
is the version of the check that was considered and refused - the whole template
list rather than the columns the reader requires. The row it kills was written in
this same ticket: nothing that existed before #56 uploaded a file with an
optional column deleted, so the strict rule would have gone in as a silent
regression. The mutant is what makes that new row mean something. `firstcheck` swaps the check ahead of the empty one, which is the order
`sendImport`'s doc comment claims and which nothing asserted until #56 added the
header-less file.
"""

from harness import main

FILES = {
    "importer": "backend/lib/importer.js",
    "departments": "backend/routes/departments.js",
}

MUTANTS = {
    # No header check at all. Every row of a programmes file fails
    # `readDepartment` on the same missing name, and the answer is the per-row
    # report the ticket was opened about. Kills the two wrong-template tests and
    # leaves the per-row ones - which is the second acceptance row: this must
    # not swallow the behaviour that was already there.
    "nocheck": ("importer",
                "  if (required.some((column) => !headers.includes(column))) {",
                "  if (false && required.some((column) => !headers.includes(column))) {"),
    # The check the ticket's wording suggests literally - compare the header
    # against `IMPORT_COLUMNS`. It refuses the wrong-template files too, so it
    # looks right; what it also refuses is a correct file whose optional English
    # name column was deleted, which imported before this ticket. Kills the
    # departments test that carries an unknown column and omits an optional one.
    "strict": ("departments",
               "        required: ['department_id', 'department_name_th'],",
               "        required: IMPORT_COLUMNS,"),
    # The header asked about before the rows are counted. A body with nothing in
    # it has no header either, so a blank upload is answered "you downloaded the
    # wrong template". Kills the header-less file test alone.
    "firstcheck": ("importer",
                   """  if (records.length === 0) return { ok: false, empty: true };

  // #56. Asked before any row is read, and after the empty check: a body with
  // nothing in it has no header either, and answering that with "wrong
  // template" would tell somebody who uploaded a blank file to go and download
  // a different one. A header missing a column every row needs is not a file
  // with bad rows in it - it is the wrong file, and the per-row report that
  // used to come back named every line of a file whose data was fine.
  if (required.some((column) => !headers.includes(column))) {
    return { ok: false, wrongTemplate: true };
  }""",
                   """  if (required.some((column) => !headers.includes(column))) {
    return { ok: false, wrongTemplate: true };
  }

  if (records.length === 0) return { ok: false, empty: true };"""),
}

main(FILES, MUTANTS)
