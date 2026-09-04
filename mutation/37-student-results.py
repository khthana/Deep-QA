# -*- coding: utf-8 -*-
"""
#37 ผลลัพธ์การเรียนรู้รายบุคคล - one student's shape against the class's.

Thirteen mutants, and every one of them is in the browser. That is not a gap in
the sweep, it is the shape of the ticket: #37 has no route of its own. Its read
is #38's, so the scale of five, the blank that is not a nought and the guard
that refuses another account's ตอนเรียน are all pinned in
`backend/test/learning-details.test.js`, and breaking any of them here would
break `38a` and the HTTP suite rather than `37a`.

What is left is what only exists in front of a screen - the picker and the
drawing - and this file is the proof that `37a` would notice if either broke.

    python mutation/37-student-results.py save
    python mutation/37-student-results.py <mutant>
    python mutation/37-student-results.py restore

Killing them:

    cd e2e && npx playwright test 37a
"""

from harness import main

FILES = {
    "chart": "frontend/src/components/RadarChart.js",
    "screen": "frontend/src/pages/StudentResults.js",
}

MUTANTS = {
    # The picker offers the first ten of the roll, which is what it would do if
    # this screen had read the paged class list instead of #38's answer. Ten is
    # `lib/paging.js`' default, so this is not a contrived number - it is the
    # exact shape the seventh criterion is about, and a ผู้สอน with a class of
    # fifty-seven would find four fifths of it simply missing with no control
    # saying so. Kills row 1.
    "pickeroffersonlyafirstpage": (
        "screen",
        "  const students = useMemo(() => data?.students ?? [], [data])",
        "  const students = useMemo(() => data?.students?.slice(0, 10) ?? [], [data])",
    ),
    # The Section's own line is drawn at full marks on every axis. The table
    # under the chart still carries the real means, the legend is right, and the
    # students' lines are untouched - so the only thing wrong is the backdrop
    # every one of them is being read against, which is the second criterion in
    # its entirety.
    #
    # It is here because the mutant below only proves the chart reads a
    # *student* from the right field. A screen that drew both series correctly
    # except the one nobody selected would pass every other row in this file.
    # Kills row 1.
    "averagedrawnasfullmarks": (
        "screen",
        "      values: drawnClos.map(clo => clo.mean),",
        "      values: drawnClos.map(() => 5),",
    ),
    # A chosen student's line is plotted from the Section's means. The legend is
    # right, the table is right, the picker is right, and the chart shows the
    # class average wearing a student's name - which is the one wrong answer
    # this screen could give that looks entirely plausible, because the shape it
    # draws is a real shape of real data.
    #
    # It is the reason row 1 goes looking for a student who differs from the
    # mean rather than taking the first on the roll. Kills row 1.
    "studentlinedrawnfromtheaverage": (
        "screen",
        "      values: drawnClos.map(clo => student.scores[clo.clo_id].score),",
        "      values: drawnClos.map(clo => clo.mean),",
    ),
    # Only the first chosen student reaches the chart. The picker still ticks
    # four, the legend still lists four, the table still grows four columns -
    # and the drawing carries one. It is the shape a chart takes when a page
    # builds its series list correctly and then hands over the wrong slice of
    # it, and nothing about the screen looks broken.
    #
    # It is here because the cap mutant below does not cover this: raising
    # `MAX_STUDENTS` proves the *ceiling* is said and enforced, and leaves
    # untouched the claim that four ticks put four lines on one chart, which is
    # the third criterion itself. Kills row 3.
    "onlythefirststudentreachesthechart": (
        "screen",
        "    ...picked.map((student, index) => ({",
        "    ...picked.slice(0, 1).map((student, index) => ({",
    ),
    # The picker stops flagging students who have no marks. Choosing one still
    # explains itself afterwards - the live region below is untouched - but the
    # list gives nothing away beforehand, which is the point at which knowing is
    # worth anything: a ผู้สอน picking four names to compare is choosing them
    # from the list, not from the sentence they get after choosing wrong.
    # Kills row 4.
    "pickerdoesnotflagunmarkedstudents": (
        "screen",
        "                    {!marked && (",
        "                    {false && (",
    ),
    # `silent` is measured against every outcome instead of against the ten the
    # chart draws, which is exactly the first version of this line and exactly
    # the defect review found in it. A student marked only past the tenth axis
    # then counts as marked: no line appears, nothing is said, and the reader is
    # left with a ticked box and an unchanged chart - the fourth criterion's cap
    # quietly undoing the sixth criterion's sentence. Kills row 5.
    "markedpastthecapreadsasdrawn": (
        "screen",
        "  const silent = picked.filter(student => !hasAnyScore(student, drawnClos))",
        "  const silent = picked.filter(student => !hasAnyScore(student, data.clos))",
    ),
    # The search box filters on what was typed and nothing else, so a student
    # already on the chart drops out of the list the moment they stop matching.
    # Their line stays drawn with no box left to untick, and only a reload
    # clears it. #36's review found the same shape in its refusal path: state
    # stranded with no control able to reach it. Kills row 2.
    "searchhidesastudentwhoisonthechart": (
        "screen",
        "      chosen.includes(student.student_id) ||\n      query === '' ||",
        "      query === '' ||",
    ),
    # No ceiling on how many students may be ticked. The fifth takes
    # `seriesStyle(4)`, which wraps to the first palette entry: solid navy, the
    # same colour *and* the same dash as student one, with a legend listing two
    # rows a reader cannot tell apart. Nothing errors and nothing looks broken -
    # there are simply two lines on the chart that are the same line as far as
    # anybody can see. Kills row 3.
    "fifthstudentisallowedon": (
        "chart",
        "export const MAX_STUDENTS = SERIES.length",
        "export const MAX_STUDENTS = SERIES.length + 4",
    ),
    # The cap holds and goes unsaid: the fifth box greys out with no sentence
    # beside it. A disabled control with no reason reads as a screen that has
    # broken rather than as a rule, which is the finding #36's review made about
    # its own year picker and which this row exists to keep from returning.
    # Kills row 3.
    "studentcapnotsaid": (
        "screen",
        "            {full && (",
        "            {false && (",
    ),
    # A student with no marks is chosen and nothing is said. No line appears -
    # the chart is right, the table is right, the arithmetic is right - and the
    # reader is left with a ticked box, an unchanged chart and no way to tell
    # whether they mis-clicked, whether the screen is broken, or whether the
    # student has genuinely never been marked. The sixth criterion is that
    # sentence and only that sentence. Kills row 4.
    "unmarkedstudentnotnamed": (
        "screen",
        "  const neverMarked = silent.filter(student => !hasAnyScore(student, data.clos))",
        "  const neverMarked = []",
    ),
    # Every outcome goes round the circle. With eleven the labels start meeting
    # one another at the top and bottom, where the angle between two axes is
    # narrowest; with fifteen the chart is a grey smear with a polygon in it.
    # Nothing throws, and on the seeded nine outcomes nothing changes at all -
    # which is why row 5 builds the situation rather than waiting for one.
    # Kills row 5.
    "nocaponhowmanyaxes": (
        "screen",
        "  const drawnClos = data.clos.slice(0, MAX_AXES)",
        "  const drawnClos = data.clos",
    ),
    # The cap holds and goes unsaid: ten of the eleven outcomes are drawn and
    # the chart does not mention the eleventh. Every number is still in the
    # table, so nothing is *lost* - but a ผู้สอน reading the shape has no way to
    # know they are reading part of it, which is the half of the fourth
    # criterion that is not about the ceiling. Kills row 5.
    "axiscapnotsaid": (
        "screen",
        "            {data.clos.length > MAX_AXES && (",
        "            {false && (",
    ),
    # The screen stops clearing `loading` when the read is refused, so a ผู้สอน
    # who types another ตอนเรียน's address reads the refusal with
    # *กำลังโหลดข้อมูล…* under it, for ever.
    #
    # This is the defect #43's hand-walk found, and #36 carries a mutant of the
    # same name for the same reason. It is not one mutant covering two screens:
    # the fix is one line inside each page's own `finally`, and #43's walk found
    # it on two screens *separately*. A per-screen defect earns a per-screen
    # row and a per-screen mutant. Kills row 6.
    "refusalkeepsloading": (
        "screen",
        "    } finally {\n      // Cleared on the refusal too. #43's hand-walk found the other shape of\n"
        "      // this on two screens: a refusal with กำลังโหลดข้อมูล… underneath it, for\n"
        "      // ever.\n      if (ticket === latest.current) setLoading(false)\n    }",
        "    }",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
