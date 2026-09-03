# -*- coding: utf-8 -*-
"""
#36 ผลลัพธ์การเรียนรู้รายวิชา - the shape of a Section's year, and the years before it.

Four mutants, one per claim `36a` makes.

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
        "  const series = [\n    {\n      label: `ปีการศึกษา ${data.section.academic_year}`,\n"
        "      values: data.clos.map(clo => clo.mean),\n    },\n"
        "    ...data.comparison.map(year => ({\n      label: `ปีการศึกษา ${year.academic_year}`,\n"
        "      values: year.clos.map(clo => clo.mean),\n    })),\n  ]",
        "  const series = [\n    {\n      label: `ปีการศึกษา ${data.section.academic_year}`,\n"
        "      values: data.clos.map(clo => clo.mean),\n    },\n  ]",
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
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
