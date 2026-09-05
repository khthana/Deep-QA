# -*- coding: utf-8 -*-
"""
#44 เปรียบเทียบผลการเรียนรู้ระดับหลักสูตรข้ามรุ่น - one curriculum, several intakes.

Twelve mutants, and between them they cover every claim `44a` makes.

The arithmetic is not among them, and here that is a stronger statement than
usual: this screen's whole claim is that its figures are #42's figures, and the
way that is made true is that both routes reduce a year's marks with the same
`rollUpOutcomes`. There is nothing left to break independently. So no mutant
here changes a number - `backend/test/program-results.test.js` asserts, outcome
by outcome, that a year read on the trend equals the same year read on the
report beside it, and a browser row asserting a mean would be the same claim in
the place that goes stale.

What is left is what only exists once the grid is drawn: that the range's two
ends drive it, that a year nobody was admitted in is a column rather than a
year quietly closed up, that the column says which kind of empty it is, that a
cell nobody was measured in is blank rather than nought, that the figure a
committee would check against the other screen is written the same way on both,
and that an account the server refuses is not left waiting under the refusal.

    python mutation/44-program-level-across-intakes.py save
    python mutation/44-program-level-across-intakes.py <mutant>
    python mutation/44-program-level-across-intakes.py restore

Killing them:

    cd e2e && npx playwright test 44a

**Never sweep this file and `42-program-level-by-intake.py` in the same run.**
They share `backend/routes/programResults.js` and
`frontend/src/components/SidebarItem/ProgManager.js`, and `save` in one would
take its snapshot of a file the other has already mutated - so `restore` would
put the mutation back rather than take it away.
"""

from harness import main

FILES = {
    "route": "backend/routes/programResults.js",
    "screen": "frontend/src/pages/ProgramLevelCompare.js",
    "menu": "frontend/src/components/SidebarItem/ProgManager.js",
}

MUTANTS = {
    # The committee's entry points at the next screen along. The menu still has
    # it, it still reads the same, and it now opens the one that is not built -
    # the shape of wrongness a rename introduces, and nothing but following the
    # link catches it. Kills row 1 at `waitForURL`.
    "comparemenumisleads": (
        "menu",
        "        path: '/main/programLevelCompare',",
        "        path: '/main/programLevelIndividual',",
    ),
    # The range is the two intakes that were asked for and nothing between
    # them. This is the ticket's central decision written the other way round,
    # and it is a *reasonable* reading of *compare 2563 with 2565* - which is
    # why it needs a mutant rather than a comment. Every figure stays right,
    # every column that is drawn is drawn correctly, and the only thing wrong
    # is that a year nobody was admitted in has been closed up, so two intakes
    # with a year standing between them are drawn as neighbours. Kills row 3.
    #
    # Rows 1, 2 and 4 all pass under it, because the seed's intakes are
    # consecutive and the only range with a hole in it is the one row 3 builds.
    "rangelistsonlyitsends": (
        "route",
        "  const years = [];\n"
        "  for (let year = start; year <= end; year += 1) years.push(String(year));\n"
        "  return { years };",
        "  return { years: start === end ? [String(start)] : [String(start), String(end)] };",
    ),
    # The column header says how many students the year has and stops there. A
    # year nobody was admitted in reads *0 คน* and a year whose roll nobody has
    # marked reads *113 คน*, so the two facts a reader most needs to tell apart
    # are told apart by a number they have to interpret. The gap column is
    # still drawn, which is what makes this a different claim from the mutant
    # above. Kills row 3 at the two sentences.
    "columnsaysonlyacount": (
        "screen",
        "  if (year.student_count === 0) return 'ไม่มีนักศึกษารุ่นนี้'\n"
        "  if (year.measured_count === 0)\n"
        "    return `${year.student_count} คน · ยังไม่มีคะแนน`\n",
        "",
    ),
    # The start of the range stops driving the report: the handler ignores the
    # option that was chosen and puts the old one back. The report still draws
    # and its figures are still right for the years it is showing; the only
    # thing wrong is that one end of the range cannot be moved.
    #
    # It kills row 2 alone, because that row moves each end on its own and this
    # freezes only the start. The report still loads for every other row, which
    # is the lesson #42 learned the hard way with `intakefrozen`: a mutant that
    # stops the first report loading takes the whole screen away and proves
    # nothing about the row it was written for.
    "startfrozen": (
        "screen",
        "  function chooseFrom(year) {\n    setFrom(year)",
        "  function chooseFrom(year) {\n    setFrom(from)",
    ),
    # The other end of the range stops driving the report, the same way. The
    # start still moves, the report still draws, and the only thing wrong is
    # that the range can be opened but never closed.
    #
    # It kills three rows rather than one, and that is not the failure
    # `intakefrozen` was rewritten for: the report loads, every figure it shows
    # is right, and the rows that die are exactly the rows that need to move
    # this control to reach the state they are about. A mutant that stopped the
    # first report loading would kill the same three and prove nothing.
    "endfrozen": (
        "screen",
        "  function chooseTo(year) {\n    setTo(year)",
        "  function chooseTo(year) {\n    setTo(to)",
    ),
    # Every row of the grid draws the first year of the range and stops. The
    # header still has one column per year, so the report still *looks* like a
    # comparison - it is just that no outcome is laid beside itself across the
    # years, which is the whole of what the second criterion asks for. Kills
    # the rows that address a cell by (outcome, year).
    "rowdrawsoneyear": (
        "screen",
        "{plo.years.map(cell => {",
        "{plo.years.slice(0, 1).map(cell => {",
    ),
    # The trend writes its figures to one decimal place. Both screens are still
    # right about the number and a reader holding the two printouts is looking
    # at *3.9* beside *3.90*, which is the drift `lib/bands.js` exists to
    # prevent - the same quantity written two ways by two screens that are
    # supposed to be two views of one thing. Kills row 5.
    "trendroundsitsown": (
        "screen",
        "คะแนนเฉลี่ย ${cell.mean.toFixed(2)}",
        "คะแนนเฉลี่ย ${cell.mean.toFixed(1)}",
    ),
    # The spoken cell keeps the mean and drops the share of students that
    # earned it. A reader who cannot see the grid is told the figure and not
    # what it is a figure over, which on this screen is the difference between
    # *3.90 across ninety per cent of them* and *3.90 across three people*.
    # Kills row 5, and it is why that row reads both figures rather than the
    # one it is named after.
    "labelmissestheshare": (
        "screen",
        " ${verdict} — ผ่าน ${cell.pass_rate}% ของนักศึกษาที่ถูกวัด`",
        " ${verdict}`",
    ),
    # A cell nobody was measured in is read aloud as one that did not pass.
    # This is #38's shipped defect transplanted onto a trend, where it is worse
    # than it was on a table: a row of *ไม่ผ่านเกณฑ์* running the width of the
    # report is a collapse, and a committee acts on collapses. Kills row 6.
    "unmeasuredspeaksasafailure": (
        "screen",
        "  if (cell.mean === null) return `${where} ยังไม่มีการวัด`",
        "  if (cell.mean === null) return `${where} ไม่ผ่านเกณฑ์`",
    ),
    # And the same defect where it is looked at rather than heard: the cell
    # shows 0.00. The label is untouched, so this is the half of the claim a
    # screen reader cannot catch - which is the point, and why row 6 asserts
    # the cell's text as well as its label.
    "unmeasuredreadsasnought": (
        "screen",
        "{score(cell.mean)}",
        "{score(cell.mean ?? 0)}",
    ),
    # A range nobody in it has been marked in gets the grid anyway - thirteen
    # rows of em dashes across however many years were asked for, which is a
    # report shaped like a report with nothing in it to read. Kills row 4.
    "emptydrawsthegrid": (
        "route",
        "        empty: years.every((year, at) => columns[at].every((row) => row.student_count === 0)),",
        "        empty: false,",
    ),
    # The screen goes back to saying it is loading when it has nothing to ask
    # for. An account the server refuses - a ผู้สอน who typed the address -
    # reads the refusal with *กำลังโหลดข้อมูล…* underneath it, for ever. This
    # is the defect #43's hand-walk found on the two screens beside this one,
    # put back. Kills row 7.
    "trendkeepsloading": (
        "screen",
        "      setLoading(false)\n      return\n    }\n    setLoading(true)",
        "      return\n    }\n    setLoading(true)",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
