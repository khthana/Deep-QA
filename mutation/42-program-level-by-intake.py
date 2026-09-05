# -*- coding: utf-8 -*-
"""
#42 ผลการเรียนรู้ระดับหลักสูตรตามปีรับเข้า - a cohort against a curriculum.

Eight mutants, one per claim `42a` makes.

The arithmetic is not among them, deliberately. The two-step roll-up, the sixty
per cent rule, what a blank leaves out of the fraction and who is refused which
curriculum are all pinned in `backend/test/program-results.test.js`, where the
answer is a number and can be compared with one worked out on paper. A browser
row asserting a mean would be the same claim in a second place, and the copy in
the browser is the one that goes stale.

What is left is what only exists once the report is drawn: that the pickers
actually drive it, that the drill-down opens and closes, that an outcome nobody
measured is a third state rather than a pass, that an unmarked cohort gets a
sentence instead of a table of dashes, and that the one account whose whole
menu is this screen arrives at it.

    python mutation/42-program-level-by-intake.py save
    python mutation/42-program-level-by-intake.py <mutant>
    python mutation/42-program-level-by-intake.py restore

Killing them:

    cd e2e && npx playwright test 42a
"""

from harness import main

FILES = {
    "route": "backend/routes/programResults.js",
    "screen": "frontend/src/pages/ProgramLevelByIntake.js",
    "menu": "frontend/src/components/SidebarItem/ProgManager.js",
    # The two pickers were lifted out of the screen when #43 became the second
    # caller of them, so the mutant about the intake control lives here now.
    "pickers": "frontend/src/components/results/CohortPickers.js",
}

MUTANTS = {
    # The report is drawn from the outcomes some CLO happens to name, which is
    # how it would be written by anybody who started from the marks rather than
    # from the curriculum. Every figure on the screen stays right; the outcomes
    # with nothing behind them simply stop being rows, and the one thing a
    # committee most needs to see - an outcome the teaching does not reach -
    # becomes invisible by being absent. Kills row 1.
    "outcomesonlymeasured": (
        "route",
        "        WHERE o.program_id = $1 AND o.parent_outcome_id IS NULL",
        "        WHERE o.program_id = $1 AND o.parent_outcome_id IS NULL\n"
        "          AND EXISTS (SELECT 1 FROM subject_clo c WHERE c.plo_id = o.outcome_id)",
    ),
    # The committee's menu entry points at the next screen along instead. The
    # menu still has the entry, it still reads the same, and it now opens a
    # page saying the screen does not exist yet - the shape of wrongness a
    # rename introduces and nothing but following the link catches. Kills row 1
    # at the navigation rather than at the count.
    "committeemenumisleads": (
        "menu",
        "        path: '/main/programLevelByIntake',",
        "        path: '/main/programLevelCompare',",
    ),
    # The intake picker stops driving the report: the change handler ignores
    # which option was chosen and puts the newest intake back. Everything else
    # is untouched - the report draws, the figures are right for the cohort it
    # is showing, and the only thing wrong is that it is always the same
    # cohort. Kills rows 2 and 5, the two that ask for a year.
    #
    # An earlier version of this mutant froze the effect's dependency array
    # instead. That killed all six rows, because with the year out of the deps
    # the first report never loads either - and a mutant that takes the whole
    # screen away proves nothing about the row it was written for.
    #
    # Rewritten when #44 pulled the dropdown itself out into `IntakeSelect` -
    # the string this used to point at is gone. It deliberately still mutates
    # what `CohortPickers` *passes* rather than the shared control: a mutant
    # inside `IntakeSelect` would freeze #44's two ends as well, and a mutant
    # that takes three screens down proves nothing about one of them.
    "intakefrozen": (
        "pickers",
        "        onChange={setIntake}",
        "        onChange={() => setIntake(intakes[0].admission_year)}",
    ),
    # The drill-down opens and will not close. Pressing the button a second
    # time re-fetches the same outcome instead of putting it away, so a person
    # who opened one to check a figure has no way back to the report except
    # reloading. Kills row 3.
    #
    # It did not, at first. The row asked only whether the panel's heading was
    # gone, and re-fetching clears the panel for as long as the request takes -
    # so the assertion passed on a gap of a few hundred milliseconds on its way
    # to the same panel coming back. The row now reads the button, which says
    # *ซ่อนที่มา* for as long as the outcome is open and is not momentarily
    # anything else.
    "drilldownwontclose": (
        "screen",
        "    if (open === plo.outcome_id) {\n"
        "      setOpen(null)\n"
        "      setDrill(null)\n"
        "      return\n"
        "    }\n",
        "",
    ),
    # An outcome nobody has been measured against is drawn as a pass. This is
    # #38's own defect, transplanted: `passed` is null there and null is not
    # false, so a two-state chip paints it green and the screen says a
    # curriculum is meeting an outcome it has never once assessed. Kills row 4.
    "unmeasuredreadsaspass": (
        "screen",
        "  if (plo.passed === null) return { text: '—', look: 'bg-slate-100 text-slate-400' }\n",
        "",
    ),
    # The chip's label loses everything but the code, so a reader who is not
    # looking at the colour is told which outcome the cell is about and nothing
    # about how it did. The screen is unchanged to anybody looking at it, which
    # is exactly the point. Kills row 4 at the half about the label.
    "labelsaysonlythecode": (
        "screen",
        "  if (plo.passed === null) return `${plo.outcome_code} ยังไม่มีการวัด`",
        "  if (plo.passed === null) return plo.outcome_code",
    ),
    # A cohort nobody has marked gets the table anyway - thirteen rows of em
    # dashes, which is a report shaped like a report and empty of anything to
    # read. The sixth criterion is the difference between *no marking has
    # happened yet* and *this is what the marking says*. Kills row 5.
    "emptydrawsthetable": (
        "route",
        "        empty: plos.every((plo) => plo.student_count === 0),",
        "        empty: false,",
    ),
    # The external assessor is dropped from the list of readers. Their menu
    # still has the one entry, it still points here, and it now leads to a
    # refusal - the state this screen existed to end. Kills row 6.
    "assessorlosesthescreen": (
        "route",
        "const READERS = ['PROG_MANAGER', 'EXT_ASSESSOR'];",
        "const READERS = ['PROG_MANAGER'];",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
