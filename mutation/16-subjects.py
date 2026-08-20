# -*- coding: utf-8 -*-
"""
#16 ข้อมูลรายวิชา - the subject catalogue and the department confinement of #61.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/16-subjects.md
for which assertion, and for what each mutant is about.

    python mutation/16-subjects.py save
    python mutation/16-subjects.py <mutant>
    python mutation/16-subjects.py restore
"""

from harness import main

FILES = {
    'reach': 'backend/lib/reach.js',
    'subjects': 'backend/routes/subjects.js',
    'page': 'frontend/src/pages/Subjects.js',
    'form': 'frontend/src/components/subjects/SubjectForm.js',
}

# One list of edits per mutant, as in mutate13.py.

MUTANTS = {
 # the pool the picker draws from not narrowed to what the grant covers
 'M1': [('reach',
   "      WHERE ($1::text[] IS NULL OR department_id = ANY($1))\n      ORDER BY department_id ASC",
   "      WHERE ($1::text[] IS NULL OR TRUE)\n      ORDER BY department_id ASC")],
 # the single department not chosen for the person
 'M2': [('form',
   "  const onlyOne = usable.length === 1 ? usable[0] : null",
   "  const onlyOne = null")],
 # the status column reading the opposite of what it holds
 'M3': [('page',
   "{subject.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}",
   "{subject.is_active ? 'ปิดใช้งาน' : 'ใช้งานอยู่'}")],
 # a deactivation reported as a deletion
 'M4': [('page',
   "      const deactivated = Boolean(answer?.deactivated)",
   "      const deactivated = false")],
 # the catalogue opened to the faculty administrator again (the shape #61 closed)
 'M5': [('subjects',
   "const MAINTAINERS = ['DEPT_ADMIN'];",
   "const MAINTAINERS = ['DEPT_ADMIN', 'FACULTY_ADMIN'];")],
 # the list not narrowed to the departments the grant covers
 'M6': [('subjects',
   "      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))",
   "      const where = `WHERE ($1::text[] IS NULL OR TRUE)")],
 # the retired department a subject already sits in dropped from the picker
 'M7': [('form',
   "    department => department.is_active !== false || department.department_id === draft.department_id,",
   "    department => department.is_active !== false,")],
 # a retired department counted as one a new subject may be filed under
 'M8': [('form',
   "  const usable = departments.filter(department => department.is_active !== false)",
   "  const usable = departments")],
 # the table left as it was after an import that succeeded
 'M9': [('page',
   "            onImported={() => {\n              setPage(1)\n              load()\n            }}",
   "            onImported={() => {}}")],
 # the filter line naming the department without saying which one
 'M10': [('page',
   "                      {departments[0].department_id} {departments[0].department_name_th}",
   "                      {departments[0].department_name_th}")],
 # the English name not drawn beside the Thai one
 'M11': [('page',
   "                          {subject.subject_name_en}",
   "                          {''}")],
 # the retired department offered as a choice: still labelled, still
 # selected, but no longer refused. Only the attribute assertion can see it.
 'M13': [('form',
   "                  disabled={department.is_active === false}",
   "                  disabled={false}")],
 # the label that says why the option cannot be chosen, gone
 'M14': [('form',
   "                  {department.is_active === false && ' (ปิดใช้งาน)'}",
   "                  {false}")],
 # the credits typed into the form dropped on the way to the database
 'M12': [('subjects',
   "  values.credits = Number(credits);",
   "  values.credits = 0;")],
}

main(FILES, MUTANTS)
