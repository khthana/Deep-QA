# -*- coding: utf-8 -*-
"""
#39 ความเชื่อมโยงผลการเรียนรู้และกิจกรรม - the attribution table as a shape.

Sixteen mutants, all of them in the browser. The route is covered at the HTTP
seam - `backend/test/outcome-activity-map.test.js` holds what is in the answer,
what a link carries, that a node with nothing attached is still in it, and that
another account's ตอนเรียน is refused - so breaking any of that would fail the
backend suite rather than `39a`.

What is left is the drawing, and on this screen the drawing carries an unusual
amount: the whole of what a diagram adds to the two tables under it is that one
band is visibly fatter than another. Half the mutants below are therefore about
*width*, which is a claim no assertion at the HTTP surface can reach.

    python mutation/39-outcome-activity-map.py save
    python mutation/39-outcome-activity-map.py <mutant>
    python mutation/39-outcome-activity-map.py restore

Killing them:

    cd e2e && npx playwright test 39a
"""

from harness import main

FILES = {
    "flow": "frontend/src/components/results/OutcomeActivityFlow.js",
    "screen": "frontend/src/pages/OutcomeActivityMapping.js",
}

MUTANTS = {
    # Bands drawn from the per cent instead of from the marks. On the seed alone
    # this is invisible: every Activity is worth a hundred, which is the one
    # mark at which *34 per cent of it* and *34 marks* are the same number. Row
    # 1 halves an Activity's mark for exactly this mutant, and without that step
    # the whole first criterion would be unprovable in the browser.
    #
    # It is the most plausible wrong answer this screen has. Both columns are
    # right there on every link, one of them is what the ผู้สอน typed, and a
    # diagram drawn on it looks entirely reasonable until two Activities are
    # worth different amounts. Kills row 1.
    "bandsdrawnfromtheweight": (
        "flow",
        "const thicknessOf = (link, scale) => Math.max(MIN_BAND, link.marks * scale)",
        "const thicknessOf = (link, scale) => Math.max(MIN_BAND, link.weight * scale)",
    ),
    # Every band the same width. The diagram still joins the right outcomes to
    # the right work, every title is right, and both tables are right - and the
    # one question the picture is for, *which of these carries the load*, has
    # quietly stopped being answerable. Kills row 1.
    "everybandthesamewidth": (
        "flow",
        "            strokeWidth={thicknessOf(link, scale)}",
        "            strokeWidth={6}",
    ),
    # Only the first band is drawn. The nodes are all there, the counts are all
    # there, both tables are complete - the diagram simply shows one link out of
    # thirteen. Kills row 1.
    "onlythefirstbandisdrawn": (
        "flow",
        "      {links.map(link => {",
        "      {links.slice(0, 1).map(link => {",
    ),
    # A node with nothing attached is scaled honestly: nought marks, nought
    # pixels. It is still in the DOM, still labelled, still in both tables - and
    # it cannot be seen, which is the one drawing that hides the case the fifth
    # criterion exists for. This is what the code would do without a deliberate
    # floor, so it is the mutant that proves the floor is doing something.
    # Kills row 2.
    "unassessednodedrawnatnothing": (
        "flow",
        "  for (const one of laid) if (one.bands.length === 0) one.height = blank",
        "  for (const one of laid) if (one.bands.length === 0) one.height = 0",
    ),
    # The outcomes nothing assesses stop being named under the diagram. They are
    # still drawn, so a ผู้สอน who reads the picture carefully finds them - which
    # is precisely what #38 decided not to rely on when it listed the outcomes
    # needing attention instead of leaving them to the colours. Kills row 2.
    "unassessedoutcomenotnamed": (
        "screen",
        "                    {unassessed.length > 0 && (",
        "                    {false && (",
    ),
    # Work attributed to no outcome is dropped from the diagram. It is the same
    # decision as the mutant above one column over, and the seed ships the case
    # already: an Activity created and not yet mapped, which is what every
    # Activity looks like on the day it is written.
    #
    # It kills row 4 as well, and the reason is not an accident of the tests:
    # the card says how many Activities there are and the diagram would be
    # drawing fewer, which is the screen disagreeing with itself.
    # Kills rows 3 and 4.
    "unattributedactivitynotdrawn": (
        "flow",
        "      {rightNodes.map(({ node, y, height: h }) => {",
        "      {rightNodes.filter(one => one.node.link_count > 0).map(({ node, y, height: h }) => {",
    ),
    # And the sentence naming it goes. Kills row 3.
    "unattributedactivitynotnamed": (
        "screen",
        "                    {unattributed.length > 0 && (",
        "                    {false && (",
    ),
    # The count of links reads the count of outcomes. Nine and thirteen, on a
    # screen whose whole subject is that those two numbers are different -
    # and the card is the one place a person would read *how much attribution
    # exists* without counting bands by hand. Kills row 4.
    "linkcountisthecloscount": (
        "screen",
        "              `${data.counts.links} เส้น`,",
        "              `${data.counts.clos} เส้น`,",
    ),
    # The Activity count leaves out the ones attributed to nothing. It is the
    # count a `JOIN` rather than a `LEFT JOIN` would have produced, it is off by
    # exactly the case the fifth criterion is about, and it is the shape of
    # wrong that reads as right: five Activities, five drawn, nothing obviously
    # missing. Kills row 4.
    "activitycountdropstheunattributedone": (
        "screen",
        "              `${data.counts.activities} กิจกรรม`,",
        "              `${data.activities.filter(one => one.link_count > 0).length} กิจกรรม`,",
    ),
    # The outcome table shows the marks attached to the outcome where its mean
    # belongs. Both are numbers with two decimal places sitting in the same
    # column, both are real quantities of this outcome, and one of them is out
    # of five while the other is out of however many marks the term is worth.
    #
    # It is here because row 5 used to assert a *shape* - two digits and a
    # decimal point - which this mutant satisfies completely. The row now holds
    # every outcome's figure against the answer's own `mean`. Kills row 5.
    "meanreadsthemarksattached": (
        "screen",
        "                              {score(clo.mean)}\n                            </span>",
        "                              {score(clo.marks)}\n                            </span>",
    ),
    # The mean stops saying what it is a mean of. #38's cards carry the same
    # note for the same reason: a figure beside a class of fifty-seven is read
    # as a share of the class however it is worded, and this one is a mean over
    # the students who have a mark for *that outcome*, which is a different
    # number for every row of the table. Kills row 5.
    "meandoesnotsaywhatitcounted": (
        "screen",
        "                            <span className=\"block text-xs text-slate-400\">\n"
        "                              จาก {clo.student_count} คนที่มีคะแนน\n"
        "                            </span>",
        "",
    ),
    # The detail table loses its last row. Twelve links of thirteen, in a table
    # whose entire job is to be the one place every link can be checked - and
    # nothing on the screen looks short. Kills row 6.
    "detailtabledropsthelastrow": (
        "screen",
        "                      {byOutcome.map(({ link, clo, activity }) => (",
        "                      {byOutcome.slice(0, -1).map(({ link, clo, activity }) => (",
    ),
    # The per cent column prints the marks. The same confusion as the first
    # mutant, one reading further down the screen, and equally invisible on the
    # seed - which is why row 6 halves an Activity's mark before it looks.
    # Kills row 6.
    "detailtableprintsmarksasthepercent": (
        "screen",
        "                            {link.weight}%",
        "                            {marks(link.marks)}%",
    ),
    # The diagram's frame stops scrolling, so at half a screen the right-hand
    # column is simply off the edge with nothing to bring it back. #98's rule,
    # and the same failure #38's heatmap has a row for. Kills row 7.
    "diagramoverflowsinsteadofscrolling": (
        "screen",
        "                <div className=\"overflow-x-auto\">\n                  <div className=\"min-w-[52rem]\">",
        "                <div>\n                  <div className=\"min-w-[52rem]\">",
    ),
    # A ตอนเรียน with no work set in it gets the diagram anyway: nine outcomes in
    # a column, nothing opposite them, and no sentence saying why. It is a
    # picture inviting a person to look for meaning in the fact that term has
    # not started. Kills row 8.
    "emptystatenevershown": (
        "screen",
        "          {data.empty ? (",
        "          {false ? (",
    ),
    # The screen stops clearing `loading` when the read is refused, so a ผู้สอน
    # who types another ตอนเรียน's address reads the refusal with
    # *กำลังโหลดข้อมูล…* under it, for ever.
    #
    # This is the defect #43's hand-walk found. It is not one mutant covering
    # several screens: the fix is one line inside each page's own `finally`, and
    # the walk found it on two screens separately, so each screen earns its own
    # row and its own mutant. #36 and #37 carry one of these too. Kills row 9.
    "refusalkeepsloading": (
        "screen",
        "    } finally {\n      setLoading(false)\n    }",
        "    }",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
