# -*- coding: utf-8 -*-
"""
#30 สัดส่วนคะแนน - the weighting scheme, saved whole.

Fifteen mutants. The screen is one draft with one PUT, so the shapes differ
from the card screens: `savenoreload` kills by a reload that never comes
(the helper awaits it), `totalfrozen` freezes the courtesy total the person
balances against, and the two refusal-sentence mutants (`zerototal`,
`wrongname`) starve the sentence of its computed value rather than swapping
whole sentences - the spec builds its expectation from refusals.js itself,
so a mutant that edited refusals.js would mutate the expectation with it.

Three mutants step outside the ticket's own files, each with the 23:firstrole
justification. `anysection` breaks `offeringOf` in clos.js, where the
question is decided. `menudropssection` breaks the sidebar entry in
Teacher.js, because the way in is the menu and the menu is the shell's.
`importlineoff` breaks the shared importer's line numbering - the module is
the seventh criterion's own noun, and #30 is the ticket that extended it.

The shared-scheme row (row 2) has no mutant, for the reason #28 and #29
record: `subject_score_ratio` carries the offering grain and no Section, so
there is no column to filter into two copies. The guard's *existence* also
has no clean mutant - disabling it turns the delete into a 23503 and the log
dirty - so `wrongname` proves the sentence and the RESTRICT constraint backs
the deed; the acceptance document says so.

    python mutation/30-weighting-scheme.py save
    python mutation/30-weighting-scheme.py <mutant>
    python mutation/30-weighting-scheme.py restore

Killing them:

    cd e2e && npx playwright test 30a

`importlineoff` is the exception, and it was not known to be one until #123
swept it across the store on 7 September 2569. It breaks a rule the shared
importer holds for six screens, so it kills row 9 here *and* `11b` row 7, `14b`
row 7, `14c`'s #91 row, `17b` row 14 and `34a` row 9. Every one of those is a
row about a reported line number, so this is a rule proved in six places rather
than a mutant that kills too much - but a per-ticket sweep cannot see any of it.
"""

from harness import main

FILES = {
    "route": "backend/routes/weights.js",
    "clos": "backend/routes/clos.js",
    "screen": "frontend/src/pages/GradingWeights.js",
    "entry": "frontend/src/components/SidebarItem/Teacher.js",
    "importer": "backend/lib/importer.js",
}

MUTANTS = {
    # The menu entry loses the section token, so the click lands on an address
    # with no Section in it and the GET the row waits for never comes. Kills
    # row 1 at the Promise.all.
    "menudropssection": ("entry",
                         "        path: '/teacher/teacherDashboard/%SECTION%/gradingWeights',",
                         "        path: '/teacher/teacherDashboard/gradingWeights',"),
    # The scheme arrives newest-first instead of in its sequence. Kills row 1
    # at `schemeOnScreen` reading the seeded three reversed.
    "orderbyid": ("route",
                  "        `SELECT ${RETURNED} FROM subject_score_ratio\n"
                  "          WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3\n"
                  "          ORDER BY sequence_order ASC, score_ratio_id ASC`,",
                  "        `SELECT ${RETURNED} FROM subject_score_ratio\n"
                  "          WHERE program_id = $1 AND subject_id = $2 AND academic_year = $3\n"
                  "          ORDER BY score_ratio_id DESC`,"),
    # BR-05 stops being checked: a save of ninety answers 200. Kills row 4 at
    # the 400 that came back 200 - the ninth criterion's exact fear.
    "sumunchecked": ("route",
                     "        if (total(rows) !== 100) {",
                     "        if (false) {"),
    # The refusal still refuses but the sentence loses its total - the server
    # says zero whatever the request summed to. Kills row 4 at the banner
    # built from refusals.js with the real ninety in it.
    "zerototal": ("route",
                  "          return res.status(400).json({ message: REFUSALS.weightsNotHundred(total(rows)) });",
                  "          return res.status(400).json({ message: REFUSALS.weightsNotHundred(0) });"),
    # The update answers 200 and keeps the old weight - the CASE keeps $4
    # bound and never true, 27:nodetail's lesson. Kills row 3 where the other
    # section reads the fifty that was never written.
    "noupdate": ("route",
                 "                    SET sequence_order = $2, score_category = $3, weight = $4, updated_at = now()",
                 "                    SET sequence_order = $2, score_category = $3, weight = CASE WHEN $4 < 0 THEN $4 ELSE weight END, updated_at = now()"),
    # A successful save no longer re-reads the scheme. The draft on the screen
    # happens to match what was typed, but the reload the helper registered
    # never fires - kills rows 3 and 5 at the await that times out, which is
    # the row asserting the screen returns to canonical state.
    "savenoreload": ("screen",
                     "      await load()\n"
                     "      setNotice({ error: false, message: 'บันทึกสัดส่วนคะแนนแล้ว' })",
                     "      setNotice({ error: false, message: 'บันทึกสัดส่วนคะแนนแล้ว' })"),
    # The courtesy total reads 100 whatever the keys say. Kills row 4 at
    # `รวม 90 / 100` - the one assertion about the line itself.
    "totalfrozen": ("screen",
                    "    return sum + (Number.isFinite(weight) ? weight : 0)",
                    "    return 100"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 6 at the draft
    # that should still hold three rows.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The in-use refusal names a constant instead of the category. Kills
    # row 7 at the banner that should say โครงงาน. The guard's existence is
    # backed by the RESTRICT constraint - see the module docstring.
    "wrongname": ("route",
                  "              return res.status(400).json({ message: REFUSALS.weightInUse(row.score_category) });",
                  "              return res.status(400).json({ message: REFUSALS.weightInUse('หมวดคะแนน') });"),
    # The teaching register leaves the WHERE clause of `offeringOf` - in
    # clos.js, where #30 imports it from. Kills row 10 at the 404 that
    # answers 200.
    "anysection": ("clos",
                   "      WHERE cs.section_id = $1 AND cst.user_id = $2`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 10 at
    # the banner that never appears.
    "swallowrefusal": ("screen",
                       "      setData(null)\n"
                       "      setDraft([])\n"
                       "      if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      setData(null)\n"
                       "      setDraft([])"),
    # The screen swallows the refusal a failed save carries. Kills row 4 at
    # the banner with the total in it; row 7 dies with it, being the same
    # swallow around a different sentence.
    "saveswallows": ("screen",
                     "    } catch (error) {\n"
                     "      if (!error.expired) setNotice({ error: true, message: error.message })\n"
                     "    } finally {\n"
                     "      setBusy(false)",
                     "    } catch (error) {\n"
                     "    } finally {\n"
                     "      setBusy(false)"),
    # The import's whole-file rule is disarmed: a file of ninety imports.
    # Kills row 9 at the 400 that answers 201.
    "importwholeskipped": ("route",
                           "          whole: (drafts) =>\n"
                           "            total(drafts) === 100 ? null : REFUSALS.weightsNotHundred(total(drafts)),",
                           "          whole: () => null,"),
    # The import stops removing what the file no longer names, so the restore
    # file leaves สอบย่อย behind. Kills row 8 at the count that stays four.
    # `AND false` keeps $4 bound, 25:anysection's lesson.
    "importneverdeletes": ("route",
                           "                  AND NOT (score_category = ANY($4))",
                           "                  AND NOT (score_category = ANY($4)) AND false"),
    # The shared importer misnumbers its report by one - in lib/importer.js,
    # which is the seventh criterion's own module and #30's own extension.
    # Kills row 9 at `reportedLines` expecting [3] and reading [4].
    #
    # Re-anchored 2026-09-07 (#123). #26 replaced the bare `REFUSALS[read.reason]`
    # with `sentenceOf(read)`, so a hook may refuse with a whole sentence rather
    # than a key. The push is the same push and the `line:` on it is the same
    # duty; what moved was the expression beside it. The anchor had to carry
    # that expression because `line: record.line,` appears at three pushes in
    # this loop, and an anchor matching more than one place is refused by the
    # harness - so this mutant is hostage to a neighbour it says nothing about.
    "importlineoff": ("importer",
                      "      errors.push({ line: record.line, message: sentenceOf(read) });",
                      "      errors.push({ line: record.line + 1, message: sentenceOf(read) });"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
