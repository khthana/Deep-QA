# -*- coding: utf-8 -*-
"""
#45 ผลการเรียนรู้ระดับหลักสูตรรายบุคคล - one student, against every outcome.

Twelve mutants, and between them they cover every claim `45a` makes but one.

The arithmetic is not among them, for the reason #44's file gives about its own
figures and one step further: this screen's claim is that a student reads the
same here as in the row #43's heatmap draws for them, and what makes that true
is that the server builds both with one `cellsFor` over marks read by one
`cohortMarks`. There is nothing left to break independently, so no mutant here
changes a score. What they break instead is everything *around* the figure -
where the roll comes from, which student the report is about, how the figure is
written down, whether a control is offered where there is nothing to open.

Two of them are defects this repository has already met once. `rollfrommarks`
is #43's first criterion put back the wrong way round, and `sourceofferedonnothing`
is #40's hand-walk finding - a disclosure that works perfectly on nothing.

**A thirteenth was written, applied twice, and killed nothing.** It was #44's
`trendkeepsloading` transplanted: drop the `setLoading(false)` on the path that
has nothing to ask for, and an account the server refuses reads *กำลังโหลด
ข้อมูล…* under the refusal for ever - #43's hand-walk finding on two screens.
It cannot happen here, and the reason is worth keeping rather than tidying
away. `loading` starts **false** on this screen, because it fetches nothing
until a student is chosen, where #42 and #43 start true and fetch on arrival;
and the sentence itself is drawn inside `roll.length > 0`, which a refused
account never satisfies. Two independent guarantees, and no single-point
mutation reaches past both. Rewriting the mutant to hoist the flag above the
guard did not help either - it was the second arrangement that survived.

So `45a`'s seventh row keeps its assertions and its acceptance row is **☑, not
⚙**. A mutant that kills nothing is not evidence, and a ⚙ over one is exactly
the mark `CLAUDE.md` says to distrust most.

    python mutation/45-program-level-individual.py save
    python mutation/45-program-level-individual.py <mutant>
    python mutation/45-program-level-individual.py restore

Killing them:

    cd e2e && npx playwright test 45a

**Never sweep this file, `42-program-level-by-intake.py` or
`44-program-level-across-intakes.py` in the same run.** All three share
`backend/routes/programResults.js` and
`frontend/src/components/SidebarItem/ProgManager.js` - four programme-level
reports are one router and one menu - and `save` in one would take its snapshot
of a file another has already mutated, so `restore` would put the mutation back
rather than take it away.
"""

from harness import main

FILES = {
    "route": "backend/routes/programResults.js",
    "screen": "frontend/src/pages/ProgramLevelIndividual.js",
    "menu": "frontend/src/components/SidebarItem/ProgManager.js",
}

MUTANTS = {
    # The committee's entry points at the screen beside it. The menu still has
    # the item, it still reads the same, and nothing but following the link
    # catches it. Kills row 1 at `waitForURL`.
    "individualmenumisleads": (
        "menu",
        "        path: '/main/programLevelIndividual',",
        "        path: '/main/programLevelAllStudents',",
    ),
    # The picker is built from the marks instead of from the register. Every
    # student it offers is a real student and every report it opens is right;
    # the one it silently does not offer is the student nobody has assessed,
    # who is the person an appeal is most likely to be about. #43's first
    # criterion, put back the wrong way round one screen along.
    # Kills rows 1 and 6.
    "rollfrommarks": (
        "route",
        "        students: roll.map((student) => ({",
        "        students: roll.filter((student) => byStudent.has(student.student_id)).map((student) => ({",
    ),
    # The roll no longer says which of its rows has nothing behind it. The
    # student is offered, so the criterion the row above is about still holds -
    # what is lost is the committee being able to see it before they click.
    # Kills row 1.
    "rollhidesthequietone": (
        "screen",
        "                      {student.measured_count === 0 && (",
        "                      {false && (",
    ),
    # The search matches the name and not the code. A committee is given a
    # student code and types it, and a roll of a hundred and thirteen answers
    # that nobody matches. Kills row 1's narrowing assertion.
    "searchignoresthecode": (
        "screen",
        "  `${student.student_id} ${student.full_name_th}`.toLowerCase().includes(term.trim().toLowerCase())",
        "  `${student.full_name_th}`.toLowerCase().includes(term.trim().toLowerCase())",
    ),
    # The report is about the last student on the roll rather than the one who
    # was chosen. Every figure on it is correct - about somebody else. This is
    # the mutant that says a row asserting *thirteen outcomes are drawn* proves
    # nothing about *whose*. Kills rows 2 and 3.
    "reportignoresthechoice": (
        "screen",
        "      setData(await getStudentResults(program, chosen))",
        "      setData(await getStudentResults(program, roll[roll.length - 1].student_id))",
    ),
    # Only the outcomes this student was measured on. A perfectly reasonable
    # report, and it is the one thing an appeal cannot be read from: a student
    # cannot be held to an outcome nobody assessed them against, and the row
    # that would say so is gone. #38's rule at the grain of one person.
    # Kills rows 2 and 5.
    "reportskipsthequietoutcomes": (
        "route",
        "          plos: outcomes.map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),",
        "          plos: outcomes\n            .filter((outcome) => scores[outcome.outcome_id].score !== null)\n            .map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),",
    ),
    # The label a reader who cannot see the chip is given loses the student.
    # The figure is right and the outcome is named; what is gone is the only
    # thing on the cell that says whose report this is. Kills row 3.
    "cellforgetsthestudent": (
        "screen",
        "  return `${student.student_id} ${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`",
        "  return `${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`",
    ),
    # The label rounds to one place while the chip beside it shows two. Two
    # readings of one score, and the one a committee compares against the
    # heatmap is whichever they happen to be given. Kills row 3.
    "labelroundsitsown": (
        "screen",
        "${plo.score.toFixed(2)} คะแนน ${line}",
        "${plo.score.toFixed(1)} คะแนน ${line}",
    ),
    # The drill-down never closes. Pressing the button that opened it fetches
    # it again, which looks like a refresh and reads like a control that has
    # stopped working. Kills row 4.
    "drilldownwillnotclose": (
        "screen",
        "    if (open === plo.outcome_id) {\n      setOpen(null)\n      setDrill(null)\n      return\n    }",
        "    if (false) {\n      setOpen(null)\n      setDrill(null)\n      return\n    }",
    ),
    # The panel no longer names the person it is about. It is the same drawing
    # as #42's, which is the whole reason it has to say which of the two it is:
    # *what this cohort was marked on* and *what this student was marked on*
    # are different claims that look identical. Kills row 4.
    "drilldownforgetsthestudent": (
        "screen",
        " \u2014 ${drill.student.student_id} ${drill.student.full_name_th}`",
        "`",
    ),
    # A ดูที่มา on every row, including the outcomes nobody measured this
    # student on. The control works perfectly and opens on an empty panel -
    # #40's hand-walk finding, which every automated row of that ticket passed
    # straight through because they all asked whether the disclosure *worked*.
    # Kills row 5.
    "sourceofferedonnothing": (
        "screen",
        "                                  {plo.score === null ? (\n                                    <span className=\"text-xs text-slate-400\">ยังไม่มีการวัด</span>\n                                  ) : (",
        "                                  {false ? (\n                                    <span className=\"text-xs text-slate-400\">ยังไม่มีการวัด</span>\n                                  ) : (",
    ),
    # A student nobody has marked gets thirteen rows of dashes instead of a
    # sentence, which beside a named person reads as a report that they failed
    # everything. Kills row 6.
    "emptydrawsthetable": (
        "route",
        "          empty: measured_count === 0,",
        "          empty: false,",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
