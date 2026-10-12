# -*- coding: utf-8 -*-
"""
#36 ผลลัพธ์การเรียนรู้รายวิชา - the shape of a Section's year, and the years before it.

Seven mutants, one per claim `36a` makes - four for the drawing, and three
that #112 added when the cap `RadarChart` exports began to be enforced here
as well as on #37.

None of them is about the arithmetic or about which years may be compared.
Every rule this ticket carries - the scale of five, BR-17's sixty per cent and
where it is not met, the CLO-number match that decides whether two years may
share one set of axes - is pinned in `backend/test/section-results.test.js`,
where the answer is a number or a sentence and can be read against the
criterion word for word.

What is left is what only exists in front of a screen, and it is all about the
**drawing**: that the chart draws the numbers the table shows, that a year
ticked in the picker becomes a second line rather than only a second column,
that an unmeasured outcome is a gap and not a point at the centre, and that a
refusal is not served under a screen that says it is still loading.

#112 added a fourth thing of the same kind: that the chart draws ten axes of
an Offering that has more, that it says so, and that a year laid over those
ten is drawn **on** them. The last of those is the only claim on either
screen that a marker's distance to the centre cannot carry - a series longer
than its axes has its **line** drawn at the wrong angles while its markers
stay on the axes - so it has a reader of its own in
`e2e/support/radar-chart.js`, which asks whether each line passes through its
own markers.

    python mutation/36-section-results.py save
    python mutation/36-section-results.py <mutant>
    python mutation/36-section-results.py restore

Killing them:

    cd e2e && npx playwright test 36a
"""

from harness import main

FILES = {
    "chart": "frontend/src/components/RadarChart.js",
    "screen": "frontend/src/pages/SectionResults.js",
    "api": "frontend/src/api/sectionResults.js",
}

MUTANTS = {
    # The chart draws every point at four out of five. The table beside it is
    # untouched and still right, the axes are still right, and the shape is a
    # neat polygon that means nothing - which is what a chart fed the wrong
    # series looks like from across a room.
    #
    # It kills rows 1 and 2 both, and there is no version of it that does not:
    # each of those rows reads the drawing against the numbers, which is the
    # only way either of them can be about a drawing at all. Row 2 has a mutant
    # of its own below that kills it alone.
    "chartdrawsthewrongnumbers": (
        "chart",
        "  const distance = (value / MAX) * RADIUS",
        "  const distance = (4 / MAX) * RADIUS",
    ),
    # Ticking a year fetches it, stores it, tabulates it - and the chart is
    # handed only the base series. The picker still responds, the request still
    # goes out and is still answered, the table still grows a column. Only the
    # second line never appears, which is the whole of what the browser seam is
    # for here. Kills row 2.
    "tickedyearneverreachesthechart": (
        "screen",
        "  const series = columns.map(one => ({",
        "  const series = columns.slice(0, 1).map(one => ({",
    ),
    # A blank becomes a nought on the chart: the ring closes through the centre
    # and a marker is planted on an axis nobody was measured on. This is the one
    # mistake the whole hand-drawn chart exists to avoid; it is invisible to
    # every backend assertion, since the endpoint still answers null, and it
    # reads as a class that scored zero on that outcome.
    #
    # The coercion is inside the chart and not in the series the page builds, so
    # the **table stays right** - which is the state that makes this defect hard
    # to see by eye: one figure on the page says nothing was measured and the
    # picture beside it says everybody failed. Kills row 3.
    "blankdrawnasnought": (
        "chart",
        "export default function RadarChart({ axes, series, title }) {\n  const count = axes.length",
        "export default function RadarChart({ axes, series, title }) {\n"
        "  series = series.map(one => ({\n"
        "    ...one,\n"
        "    values: one.values.map(value => (value === null ? 0 : value)),\n"
        "  }))\n"
        "  const count = axes.length",
    ),
    # The screen stops clearing `loading` when the read is refused, so a ผู้สอน
    # who types another ตอนเรียน's address reads the refusal with
    # *กำลังโหลดข้อมูล…* under it, for ever. This is the defect #43's hand-walk
    # found on two screens; it is here as a mutant because the fix is a single
    # line that a later edit removes without noticing. Kills row 4.
    "refusalkeepsloading": (
        "screen",
        "    } finally {\n      // Cleared on the refusal too, not only on the answer. #43's hand-walk\n"
        "      // found the other shape of this: a screen that shows a refusal and\n"
        "      // *กำลังโหลดข้อมูล…* underneath it, for ever.\n"
        "      if (ticket === latest.current) setLoading(false)\n    }",
        "    }",
    ),
    # #112. The cap `RadarChart` exports was enforced by #37 and not here, so
    # one component answered ten outcomes on that screen and every outcome on
    # this one. The owner decided both screens cap, which reworded row 1: the
    # axes are the outcomes the chart draws, and the table carries the rest.
    #
    # The axes stop being capped. Fifteen outcomes draw fifteen labels on a
    # ring of 154 - which is legible, measured, and not the point: the point
    # is that the two screens sharing the component answer the same. Kills
    # row 7 (*a Subject with more than ten outcomes*) and row 8 (*a previous
    # year ticked onto a capped chart*), both of which count the axes.
    "nocaponsectionaxes": (
        "screen",
        "  const axes = data.clos.slice(0, MAX_AXES).map(clo => clo.clo_number)",
        "  const axes = data.clos.map(clo => clo.clo_number)",
    ),
    # The other half of the cap, and the half with nothing to see. The axes
    # are still ten; every series is handed eleven values, and `RadarChart`
    # takes a point's angle from `values.length`. So each line is drawn at
    # eleven-fold angles on a ten-fold frame: every radius still right, every
    # title still right, every table cell still right, and the shape a lie
    # about which outcome each point belongs to.
    #
    # And it is the **line** that moves, not the markers: `RadarChart` draws a
    # marker at `pointAt(index, count, value)` with `count` from `axes.length`,
    # and draws the line through `pointAt(index, values.length, ...)`. The
    # first row written for this mutant read the markers' angles and the mutant
    # survived 8 of 8 - a survivor meaning the row was reading the wrong
    # element. What holds it is `pathErrorsOf` and *the line passes through its
    # own markers*. Kills row 8 (*a previous year ticked onto a capped chart*)
    # alone: row 7 counts the axes and reads the table, and both are untouched
    # here.
    "seriesnotcappedtotheaxes": (
        "screen",
        "    values: one.values.slice(0, MAX_AXES),",
        "    values: one.values,",
    ),
    # The cap bites and says nothing: ten axes of eleven outcomes, with the
    # eleventh in the table and nothing on the page to say the chart left it
    # off. A reader counting nine points and nine rows learns nothing; a
    # reader counting ten points against eleven rows has to guess. Kills the
    # sentence half of row 7 (*a Subject with more than ten outcomes*) and
    # nothing else.
    "sectioncapnotsaid": (
        "screen",
        "          {data.clos.length > MAX_AXES && (",
        "          {false && (",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
