# -*- coding: utf-8 -*-
"""
#43 ผลการเรียนรู้ระดับหลักสูตรของนักศึกษาทุกคน - the whole cohort as a grid.

Six mutants, one per claim `43a` makes.

The arithmetic is not among them, deliberately. Every figure in a cell, the
band it is drawn in, what a blank leaves out of the fraction, the two counts
the order is built from and who is refused which curriculum are all pinned in
`backend/test/program-results-students.test.js`, where the answer is a number
and can be checked against one worked out on paper.

What is left is what only exists once the grid is drawn: that the roll is the
register's rather than the marks', that the order control reorders, that the
grid scrolls inside its own frame instead of dragging the page, that an
unmarked intake gets a sentence, and that the menu entry leads here.

    python mutation/43-program-level-all-students.py save
    python mutation/43-program-level-all-students.py <mutant>
    python mutation/43-program-level-all-students.py restore

Killing them:

    cd e2e && npx playwright test 43a
"""

from harness import main

FILES = {
    "route": "backend/routes/programResults.js",
    "screen": "frontend/src/pages/ProgramLevelAllStudents.js",
    "menu": "frontend/src/components/SidebarItem/ProgManager.js",
}

ROLL_QUERY = "        WHERE program_id = $1 AND admission_year = $2\n        ORDER BY student_id ASC"

ROLL_FROM_MARKS = (
    "        WHERE program_id = $1 AND admission_year = $2\n"
    "          AND EXISTS (SELECT 1 FROM activity_scores s WHERE s.student_id = student.student_id)\n"
    "        ORDER BY student_id ASC"
)

MUTANTS = {
    # The roll is built from the marks rather than from the register, which is
    # how it would be written by anybody who started from `activity_scores`.
    # Every figure on the screen stays right; the students nobody has assessed
    # simply stop being rows, and *this student has been measured on nothing*
    # becomes invisible by being absent - which is the one finding this screen
    # exists to make and the one an average could never have made either.
    # Kills row 1.
    "rollfrommarks": ("route", ROLL_QUERY, ROLL_FROM_MARKS),
    # The order that says it puts the weakest first sorts by code instead. The
    # dropdown still moves, the label still reads *จำนวนข้อที่ต่ำกว่าเกณฑ์*, and
    # the grid redraws in an order that looks deliberate - which is the shape a
    # screenshot cannot show and a reader would only catch by knowing which
    # student should have been at the top. Kills row 2.
    "ordernevermoves": (
        "screen",
        "    compare: (a, b) => b.below_count - a.below_count || a.student_id.localeCompare(b.student_id),",
        "    compare: (a, b) => a.student_id.localeCompare(b.student_id),",
    ),
    # The frame around the grid loses its scrolling. The shell clips sideways
    # overflow, so the far outcomes do not push the page along - they go off
    # the edge with nothing to bring them back, and a curriculum's last four
    # PLOs stop existing on any window narrower than the grid. Kills row 3.
    "framelost": (
        "screen",
        '              <div className="overflow-x-auto">',
        "              <div>",
    ),
    # An intake nobody has marked gets the grid anyway - a page of em dashes,
    # which is a heatmap shaped like a heatmap and empty of anything to read.
    # The difference between *no marking has happened yet* and *this is what
    # the marking says* is the fifth criterion. Kills row 4.
    "emptydrawsthegrid": (
        "route",
        "          empty: students.every((student) => student.measured_count === 0),",
        "          empty: false,",
    ),
    # The label on the *below the line* cell loses the fraction, so a reader
    # who is not looking at the table is told there is a count and not what it
    # is. The screen is unchanged to anybody looking at it, which is the point:
    # two below the line out of two measured and two out of seven are the same
    # number and not the same news. Kills row 2 at the half about the label.
    "labellosesthefraction": (
        "screen",
        "                          aria-label={`${student.student_id} ต่ำกว่าเกณฑ์ ${student.below_count} จาก ${student.measured_count} ข้อที่วัดได้`}",
        "                          aria-label={`${student.student_id} ต่ำกว่าเกณฑ์`}",
    ),
    # The committee's menu entry points at the next screen along. The menu still
    # has the entry and it still reads the same; it now opens a different
    # screen, which is the shape of wrongness a rename introduces and nothing
    # but following the link catches. Kills row 1 at the navigation.
    "menumisleads": (
        "menu",
        "        path: '/main/programLevelAllStudents',",
        "        path: '/main/programLevelCompare',",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
