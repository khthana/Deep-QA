# -*- coding: utf-8 -*-
"""#57 — the shared paging control. Proves `e2e/tests/57a-pager.spec.js`.

Two layers, deliberately kept apart. `Pager.js` is what every screen draws, so
a mutant there kills rows on several screens at once and the one that matters
is the first to die in the file — run with `-g` and read which. The screen
files are what each screen *wires into* it, and that is where #57's whole risk
lives: one component drawn six times still has six call sites to get wrong.
"""

from harness import main

FILES = {
    "pager": "frontend/src/components/Pager.js",
    "users": "frontend/src/pages/Users.js",
    "departments": "frontend/src/pages/Departments.js",
    "programs": "frontend/src/pages/Programs.js",
    "subjects": "frontend/src/pages/Subjects.js",
}

MUTANTS = {
    # The floor of one removed, so an empty list reads "หน้า 1 จาก 0" — a page
    # count that says the page the reader is standing on does not exist.
    "nofloor": ("pager",
                "const pages = Math.max(1, Math.ceil(total / perPage))",
                "const pages = Math.ceil(total / perPage)"),

    # ก่อนหน้า pressable on the first page. Re-aimed on 15 October 2569 when
    # #199 put `busy` in front of the end rule: the mistake these two are about
    # is the **end** rule speaking never, so each drops its own half and leaves
    # `busy` standing. Substituting `false` here would be a different mutant —
    # one with no rule at all, which 199a's rows would kill as well (#203).
    "prevalive": ("pager",
                  "          disabled={busy || page <= 1}",
                  "          disabled={busy}"),

    # ถัดไป pressable on the last page.
    "nextalive": ("pager",
                  "          disabled={busy || page >= pages}",
                  "          disabled={busy}"),

    # ก่อนหน้า walks forward. Chosen over "does nothing" on purpose: a button
    # wired to nothing is caught by a timeout, which is a weak death and reads
    # the same as a slow server.
    "backforward": ("pager",
                    "onClick={() => onPage(Math.max(1, page - 1))}",
                    "onClick={() => onPage(Math.max(1, page + 1))}"),

    # Five to a page instead of ten. One per screen, because "สิบแถวต่อหน้า" is
    # a claim about that screen's own constant - `Pager` is told how many a page
    # holds, it does not decide it. Section 1 of the checklist's open items is
    # about exactly this: four copies of the number ten.
    "perpage": ("users",
                "const PAGE_SIZE = 10",
                "const PAGE_SIZE = 5"),
    "deptperpage": ("departments",
                    "const PAGE_SIZE = 10",
                    "const PAGE_SIZE = 5"),
    "progperpage": ("programs",
                    "const PAGE_SIZE = 10",
                    "const PAGE_SIZE = 5"),
    "subjperpage": ("subjects",
                    "const PAGE_SIZE = 10",
                    "const PAGE_SIZE = 5"),

    # Each screen asking for page one whatever page it is standing on. The
    # buttons still work, the line still counts up — every page just holds the
    # same rows. This is the mutant the "หน้าถัดไปคือคนละชุด" assertions are
    # ordered for: the label reads what the server confirmed, so it dies too,
    # and it must not die first.
    "userpage": ("users",
                 "listUsers({ ...filters, page, per_page: PAGE_SIZE })",
                 "listUsers({ ...filters, page: 1, per_page: PAGE_SIZE })"),
    "deptpage": ("departments",
                 "listDepartments({ page, per_page: PAGE_SIZE })",
                 "listDepartments({ page: 1, per_page: PAGE_SIZE })"),
    "progpage": ("programs",
                 "listPrograms({ page, per_page: PAGE_SIZE })",
                 "listPrograms({ page: 1, per_page: PAGE_SIZE })"),
    "subjpage": ("subjects",
                 "listSubjects({ page, per_page: PAGE_SIZE, department_id: department })",
                 "listSubjects({ page: 1, per_page: PAGE_SIZE, department_id: department })"),

    # The last row of the last page deleted and the screen left standing on the
    # page that is now empty — the table reading "there are none" of a list that
    # has eleven. Two copies of the same three-line rule, which is what #57 was
    # about; each one gets its own mutant.
    "deptstay": ("departments",
                 "const liveCountIsOfThisPage = onRows.current.of === readOf(page)\n"
                 "      const lostItsLastRow =\n"
                 "        page > 1 &&\n"
                 "        (liveCountIsOfThisPage ? onRows.current.rows : data.departments.length) === 1\n"
                 "      const stepBack = lostItsLastRow && liveCountIsOfThisPage",
                 "const lostItsLastRow = false\n      const stepBack = false"),
    "progstay": ("programs",
                 "const liveCountIsOfThisPage = onRows.current.of === readOf(page)\n"
                 "      const lostItsLastRow =\n"
                 "        !deactivated &&\n"
                 "        page > 1 &&\n"
                 "        (liveCountIsOfThisPage ? onRows.current.rows : data.programs.length) === 1\n"
                 "      const stepBack = lostItsLastRow && liveCountIsOfThisPage",
                 "const lostItsLastRow = false\n      const stepBack = false"),
}

main(FILES, MUTANTS)
