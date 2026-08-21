# -*- coding: utf-8 -*-
"""
#18 รายวิชาในหลักสูตร - the pairing, its catalogue, its import and its reach.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/18-program-subjects.md
for which assertion, and for what each mutant is about.

    python mutation/18-program-subjects.py save
    python mutation/18-program-subjects.py <mutant>
    python mutation/18-program-subjects.py restore
"""

from harness import main

FILES = {
    "route": "backend/routes/programSubjects.js",
    "removal": "backend/lib/removal.js",
    "page": "frontend/src/pages/ProgramSubjects.js",
    "form": "frontend/src/components/programSubjects/ProgramSubjectForm.js",
    "importer": "backend/lib/importer.js",
    "client": "frontend/src/api/client.js",
}

MUTANTS = {
    # 18a row 1: the one programme in reach is chosen for the person
    "noautoprogram": ("form",
                      "program_id: defaultProgram || onlyOne?.program_id || '',",
                      "program_id: defaultProgram || '',"),
    # 18a row 1: one programme is stated, not offered as a choice of one
    "alwaysfilter": ("page", "{programs.length > 1 ? (", "{programs.length > 0 ? ("),
    # 18a row 1 / 18c row 8: the label names the curriculum by its code
    "nolabelcode": ("page",
                    "{programs[0].program_id} {programs[0].program_name_th}",
                    "{programs[0].program_name_th}"),
    # 18b row 7: a refused file is rolled back whole
    "keepgood": ("importer",
                 "      await client.query('ROLLBACK');\n      return { ok: false,",
                 "      await client.query('COMMIT');\n      return { ok: false,"),
    # 18a row 1: the type that was chosen is the type that is written
    "alwayselective": ("route",
                       "[values.program_id, values.subject_id, values.subject_type],",
                       "[values.program_id, values.subject_id, 'elective'],"),
    # 18a row 2: the edit changes the type
    "typeignored": ("route", "draft.values.subject_type,", "existing.subject_type,"),
    # 18a row 2: the programme half of the key is frozen on an edit
    "nofreeze": ("form", "disabled={busy || editing}", "disabled={busy}"),
    # 18a row 2: and the form says why
    "nohint": ("form",
               "hint={editing ? '\u0e22\u0e49\u0e32\u0e22\u0e23\u0e32\u0e22\u0e27\u0e34\u0e0a\u0e32\u0e02\u0e49\u0e32\u0e21\u0e2b\u0e25\u0e31\u0e01\u0e2a\u0e39\u0e15\u0e23\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e43\u0e2b\u0e49\u0e25\u0e1a\u0e2d\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e43\u0e19\u0e2b\u0e25\u0e31\u0e01\u0e2a\u0e39\u0e15\u0e23\u0e43\u0e2b\u0e21\u0e48' : null}",
               "hint={null}"),
    # 18a row 3: the catalogue answers the term that was typed
    "ignorequery": ("route",
                    "AND ($1::text IS NULL\n                 OR subject_id ILIKE",
                    "AND ($1::text IS NOT NULL OR $1::text IS NULL\n                 OR subject_id ILIKE"),
    # 18a row 4: the same pair twice is refused, in words
    "duplicatesilent": ("route", "if (isDuplicate(error)) {", "if (false) {"),
    # 18a row 6: the question names the record it is about
    "terseconfirm": ("page",
                     "${removing.subject_id} ${removing.subject_name_th} ",
                     ""),
    # 18a row 5: a pairing nothing points at is really gone
    "nodelete": ("removal", "      await remove(client);", "      if (false) await remove(client);"),
    # 18a row 5: a referenced pairing is switched off rather than deleted
    "nodeactivate": ("removal", "    await deactivate(client);", "    if (false) await deactivate(client);"),
    # 18a row 5: and can be switched back on
    "noreopen": ("route",
                 "typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,",
                 "null,"),
    # 18a row 10: the catalogue is not confined to the programme's department
    "catalogueowndept": ("route",
                         "WHERE is_active\n            AND (",
                         "WHERE is_active AND department_id = '05'\n            AND ("),
    # 18a row 10: a retired subject is not offered
    "catalogueretired": ("route",
                         "WHERE is_active\n            AND (",
                         "WHERE (is_active OR TRUE)\n            AND ("),
    # 18b row 7: the saved template carries the mark Excel needs
    "nobom": ("client", "text.startsWith(BOM) ? text : BOM + text", "text"),
    # 18b row 7: an imported pairing is actually written
    "importdrops": ("route",
                    "return { ok: true, row: await insertPairing(client, values) };",
                    "return { ok: true, row: null };"),
    # 18b row 7: the reason names what is wrong with the row
    "wrongcataloguereason": ("route",
                             "if (!rows[0]) return 'subjectNotInCatalogue';",
                             "if (!rows[0]) return 'invalidProgramSubject';"),
    # 18b row 9: ten to a page
    "nolimit": ("route", "LIMIT $3 OFFSET $4", "LIMIT $3 + 100 OFFSET $4"),
    # 18b row 9: one order across the pages
    "unordered": ("route",
                  "ORDER BY ps.program_id ASC, ps.subject_id ASC",
                  "ORDER BY ps.subject_type ASC, ps.is_active ASC"),
    # 18c row 8: the list is confined to the reach
    "listeveryone": ("route",
                     "WHERE ($1::text[] IS NULL OR ps.program_id = ANY($1))",
                     "WHERE ($1::text[] IS NOT NULL OR ps.program_id = ANY($1))"),
    # 18c row 8: a curriculum is not the central administrator's, the faculty's
    # nor a teacher's. Rewritten at #79, which took `FACULTY_ADMIN` out of the
    # maintainers: the mutant it was written against no longer exists in the
    # file, and the refused three are now the three this puts back.
    "maintainerall": ("route",
                      "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
                      "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'FULL_ADMIN', 'TEACHER', 'FACULTY_ADMIN'];"),
}

main(FILES, MUTANTS)
