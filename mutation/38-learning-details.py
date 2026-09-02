# -*- coding: utf-8 -*-
"""
#38 รายละเอียดผลการเรียนรู้ - a heatmap, and the rules that colour it.

Eleven mutants. This is the first screen in the rebuild that computes rather
than records, so most of what could go wrong here is a *plausible wrong
number* rather than a crash - which is what docs/06 warns about and why the
arithmetic is pinned at the HTTP surface instead.

These eleven are therefore the other half: what only exists once the numbers
are drawn. A heatmap is a claim about colour, and a colour can be wrong in
ways a JSON body cannot - every band the same shade, the ramp shifted by one
so the edges land in the wrong colour, the flag that is only a hue, a grid
that takes the page sideways with it.

Two rules of this ticket have no mutant here on purpose. That sixty per cent
is *strictly* more than sixty (BR-17, and `docs/04` TC-EVAL-004), and that a
blank is left out of both halves of the fraction rather than read as a nought,
are both invisible in the browser: the screen is handed a band and a pass rate
and draws them either way. They are proved in `learning-details.test.js`,
which asks this file's own route directly, and the acceptance sheet marks
those rows from that seam rather than claiming a browser row it does not have.

    python mutation/38-learning-details.py save
    python mutation/38-learning-details.py <mutant>
    python mutation/38-learning-details.py restore

Killing them:

    cd e2e && npx playwright test 38a
"""

from harness import main

FILES = {
    "route": "backend/routes/learningDetails.js",
    "screen": "frontend/src/pages/LearningDetails.js",
}

MUTANTS = {
    # Every band is drawn in the flagged band's colour, so the heatmap is one
    # flat red field. Every number on it is still right, which is what makes
    # this the shape worth catching: a screen whose whole purpose is that weak
    # outcomes stand out, on which nothing stands out. Kills row 2.
    "bandsallonecolour": ("screen",
                          "                                    look ? look.cell : 'bg-slate-50 text-slate-400'",
                          "                                    look ? BANDS[1].cell : 'bg-slate-50 text-slate-400'"),
    # The ramp shifts by one at every boundary, so a score sitting exactly on
    # an edge is drawn in the band below it - 3.0 reads as flagged and 4.5 as
    # merely good. The colours are all still different, so nothing looks
    # broken; they are just each one band wrong at the edge. Kills row 2.
    "bandoffbyone": ("route",
                     "    if (score >= floor) band = index + 1;",
                     "    if (score > floor) band = index + 1;"),
    # The flag becomes a colour and nothing else. The red is still red, so the
    # screen looks correct to anybody who can see it - and carries no mark for
    # a printout, a screen reader, or a reader who cannot tell the two shades
    # apart, which is what *distinctly flagged* is asking for. Kills row 3.
    "noflagmark": ("screen",
                   "                                  {cell.flagged && <span className=\"ml-1 font-bold\">!</span>}",
                   "                                  {false && <span className=\"ml-1 font-bold\">!</span>}"),
    # The flag reaches one hundredth too far and marks a student who passed:
    # exactly 3.0 is the pass line, and this puts an exclamation mark next to
    # it. Kills row 3 at the half that says three is not flagged.
    "flaggedincludesthree": ("route",
                             "              flagged: score === null ? false : score < PASS,",
                             "              flagged: score === null ? false : score <= PASS,"),
    # The outcomes needing attention stop being listed. The Y/N in the column
    # foot still says which failed, so the information is on the screen - just
    # not as the list the ticket asks for, which is the difference between
    # naming what to act on and leaving it to be read off the colours.
    # Kills row 5.
    "attentiondropped": ("route",
                         "            .filter((clo) => clo.passed === false)",
                         "            .filter((clo) => clo.passed === null)"),
    # A Section nobody has marked draws the grid anyway, as a field of dashes.
    # Nothing refuses and no number is wrong, because there are no numbers; it
    # invites a teacher to read a pattern into the fact that the marking has
    # not started. Kills row 7.
    "emptynevershown": ("route",
                        "          empty: scored.length === 0,",
                        "          empty: false,"),
    # The columns go back to being only the outcomes some Activity happens to
    # reach, so an outcome with no work behind it is not a column of blanks -
    # it is not a column at all, and the one thing a teacher most needs to see
    # about it is the thing the screen silently drops. Kills row 1.
    "outcomesonlymapped": ("route",
                           "        WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3",
                           "        WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3"
                           "\n          AND EXISTS (SELECT 1 FROM activity_clo_mapping m"
                           " WHERE m.clo_id = c.clo_id)"),
    # The cell's label names the student and the outcome and reads the score
    # out, but stops saying the score is under the line. Everything is still
    # on the screen for somebody looking at it - the red, the exclamation mark
    # - and nothing at all is left for somebody who is not. Kills row 3 at the
    # half about the reader who never sees the colour.
    "labelomitsflag": ("screen",
                       "  return `${student.student_id} ${clo.clo_number} ${score}${cell.flagged ? ' ต่ำกว่าเกณฑ์' : ''}`",
                       "  return `${student.student_id} ${clo.clo_number} ${score}`"),
    # The foot of each column loses the Y or N, so whether an outcome cleared
    # BR-17 is left to be inferred from a percentage the reader has to compare
    # against sixty in their head. The mean and the rate are still there, which
    # is what makes it look complete. Kills row 4.
    "columnfeetnoverdict": ("screen",
                            "                              {clo.passed === null ? '\u2014' : clo.passed ? 'Y' : 'N'}",
                            "                              {''}"),
    # A ตอนเรียน that is not the reader's is drawn as an empty page rather than
    # refused - no roll, no marks, no sentence saying why. Nothing leaks, so it
    # looks harmless; what it costs is the difference between *you do not teach
    # this* and *there is nothing here*, and ADR-0002's answer arriving as a
    # status a caller can act on. Kills row 8.
    "refusalisemptypage": ("route",
                           "        if (!section || !offering) return notThisSection(res);",
                           "        if (!section || !offering)\n          return res.json({ section: null, band_floors: BAND_FLOORS, clos: [], students: [], summary: {}, attention: [], empty: true });"),
    # The box around the heatmap stops holding it, so a grid that is wider than
    # a narrow window pushes the whole page sideways instead of scrolling in
    # its own frame. #98's fix, undone for this screen only. Kills row 6.
    #
    # An earlier version of this mutant dropped the table's `min-w` instead and
    # MISSED: with fifty-seven students against nine outcomes the grid is far
    # wider than a phone either way, so the minimum never decided anything the
    # row could see. What row 6 is actually about is the frame, so that is what
    # this breaks now.
    "heatmapnoframe": ("screen",
                       '                <div className="overflow-x-auto">',
                       '                <div className="overflow-x-visible">'),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
