# -*- coding: utf-8 -*-
"""
#20 การเชื่อมโยงผลการเรียนรู้กับรายวิชา - the coverage grid.

Eight mutants, one per ⚙ row of `docs/acceptance/20-outcome-to-subject-mapping.md`.
Six break the thing their row is about and nothing else, so a run under one of
them names the row it kills rather than falling over everywhere at once. Two do
not: `onelevel` kills three rows and `emptyise` kills two. Their comments say
which rows and why the wider blast radius is the assertions working rather than
a mutant that is too blunt. Every count here was read off a run, not reasoned
about - the first version of this file claimed a precision two of them did not
have.

    python mutation/20-plo-mapping.py save
    python mutation/20-plo-mapping.py <mutant>
    python mutation/20-plo-mapping.py restore

Killing them:

    cd e2e && npx playwright test 20a

Two of these touch the backend rather than the screen, and that works because
`playwright.config.js` sets `reuseExistingServer: false`: every run starts its
own backend from source, so a route mutated here is the route the browser meets.

`nofont` is the one worth reading twice, because the mutant written first was a
dud and the reason is a trap worth keeping written down.

That first mutant renamed the family - `FAMILY = 'helvetica'` - and killed
nothing. Two things were wrong with it. `addFont(..., FAMILY, ...)` registers the
Thai bytes *under* whatever `FAMILY` says, so renaming the constant renamed the
face and changed no glyph. And the vendored `THSarabun-normal.js` shipped with a
`jsPDF.API.events.push(['addFonts', ...])` tail, so merely importing it embedded
TH Sarabun into every document the app ever built, whatever `exportPdf.js` asked
for. Under that mutant the two PDFs came out the same length, with the same four
`/FontFile2` entries and a byte-identical first content stream.

So the assertion was not weak - it was unreachable. The fix was to the code, not
to the mutant: the two vendored files were cut back to a base64 `export default`
with no side effect, which makes `exportPdf.js`'s own `addFileToVFS` + `addFont`
the only registration there is. `nofont` deletes the two `addFont` calls, and the PDF
that comes out has no embedded face at all - it downloads, is still named for the
curriculum, still opens, and shows a row of empty boxes where the Thai was.
"""

from harness import main

FILES = {
    "screen": "frontend/src/pages/PloMapping.js",
    "export": "frontend/src/components/ploMapping/exportPdf.js",
    "route": "backend/routes/ploMapping.js",
}

MUTANTS = {
    # The outcome axis stops being ข้อหลัก-only and every ข้อย่อย becomes a
    # column of its own again - the grain the rebuild had before #100, and the
    # fifty-two-column page that ticket was opened over.
    #
    # This replaces `flatorder`, which mutated the tree ordering of a recursive
    # walk that no longer exists. The row it now watches is *no ข้อย่อย appears
    # as a column*.
    #
    # Restoring the old grain is a real thing somebody could do by accident, so
    # the mutant is the accident rather than a contrivance. It looked blunt
    # enough to take other rows with it - fifty-two columns changes what the
    # export and the scrolling row see too - and the run says otherwise: exactly
    # one test dies, *the grid draws every subject of the curriculum against
    # every ข้อหลัก of it*, on the assertion that no code has two hyphens in it.
    # The scrolling row survives because its window was narrowed by #100 to a
    # width thirteen columns already overflow, so its claim does not depend on
    # the grain. That count is read off the run, not reasoned about.
    "subcolumn": ("route",
                  "            AND parent_outcome_id IS NULL",
                  "            AND (parent_outcome_id IS NULL OR true)"),

    # A square nobody has written to draws `E` instead of blank. It is the exact
    # shape the delivered system took: `createEmptyMapping` wrote a placeholder
    # that meant the same thing, and a screen that renders one is a screen where
    # "nobody has decided" and "we decided no" are the same picture.
    #
    # Kills two rows. The fourth criterion's row is the one it is for; the first
    # criterion's row goes with it because that row asserts both halves of what
    # a grid shows - a seeded square filled *and* a square the seed left alone
    # empty - on the ground that a grid drawing every square filled and one
    # drawing every square empty would each pass on one half alone. That second
    # assertion is exactly what this mutant breaks, so its dying is the pair
    # working, not collateral.
    "emptyise": ("screen",
                 "const level = levels.get(cell) ?? ''",
                 "const level = levels.get(cell) ?? 'E'"),

    # Every write stores `I`, whatever was chosen. The row it exists for is the
    # second criterion - *a cell can be set to any of the five levels and the
    # change persists* - which was marked ⚙ for a while with nothing standing
    # behind it: `noupsert` leaves a first insert alone and `emptyise` only
    # touches squares that have no row at all, so the write path itself was
    # never broken by anything here.
    #
    # It kills three rows, not one, and that is the honest count: the rows about
    # choosing again and about `E` both read back a level too, so both notice.
    # What makes this mutant worth keeping anyway is that each of those two has
    # a mutant of its own that kills it alone (`noupsert`, `emptyise`), and this
    # is the only one that kills the second criterion's row at all.
    "onelevel": ("route",
                 "         VALUES ($1, $2, $3, $4, $5, $5)",
                 "         VALUES ($1, $2, $3, 'I', $5, $5)"),

    # The second save is dropped on the floor. The row stays as the first save
    # left it and the route still answers 200, so the screen shows what it was
    # told and only the reload catches it - which is why the row asks the server
    # for the cell rather than reading the dropdown. This is the third criterion
    # from its other side: not a duplicate row, a lost edit.
    "noupsert": ("route",
                 "         DO UPDATE SET mapping_level = EXCLUDED.mapping_level,\n"
                 "                       updated_by = EXCLUDED.updated_by,\n"
                 "                       updated_at = now()",
                 "         DO NOTHING"),

    # Nothing registers TH Sarabun, so the grid is drawn on a base-14 face with
    # no Thai glyph in it. Kills only the assertions on the bytes - that the file
    # names the face and carries a `/FontFile2` to go with it. The two assertions
    # above them in that row, that a file arrives and that it is named for the
    # curriculum, pass under this mutant, and they are exactly the ones a person
    # would have written instead if they had not thought about what the
    # criterion's *correctly* is doing there.
    #
    # Both `addFont` calls go and both `addFileToVFS` calls stay. The bytes have
    # to stay imported or the mutant becomes an unused-import build failure that
    # takes every other row down with it - and a face sitting in the VFS that no
    # `addFont` names is a file jsPDF never embeds, which is the whole point.
    "nofont": ("export",
               "  doc.addFileToVFS('THSarabun-normal.ttf', THSarabun)\n"
               "  doc.addFont('THSarabun-normal.ttf', FAMILY, 'normal')\n"
               "  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)\n"
               "  doc.addFont('THSarabun-bold.ttf', FAMILY, 'bold')",
               "  doc.addFileToVFS('THSarabun-normal.ttf', THSarabun)\n"
               "  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)"),

    # The รหัสวิชา scrolls away with the rest of the row. The frame still
    # scrolls, so the first half of that row still passes; what dies is the
    # assertion that the first cell is still against the left edge afterwards -
    # a square reached at the right-hand end of the grid belonging to a row
    # nobody can name.
    #
    # Re-run under #100. The row this kills now runs at an 800px viewport rather
    # than the default one, because thirteen columns no longer overflow a full
    # window and the row's own walk step has always said *ย่อหน้าต่างให้แคบ
    # กว่าตาราง*. A ⚙ row is only a ⚙ row if the mutant kills the assertion
    # as it is actually written, so this was run again at that width rather than
    # carried over: 1 failed, 7 passed, the death on *the grid scrolls inside
    # its own frame, and the subject column stays put*.
    "nosticky": ("screen",
                 'className="sticky left-0 z-10 bg-white px-4 py-3"',
                 'className="z-10 bg-white px-4 py-3"'),

    # The reach check on the read is dropped, so a committee member is handed
    # another curriculum's coverage. Kills the sixth criterion's row at the 403,
    # and only there: the same row's second half - that the account still
    # reaches its own - passes under this mutant, which is what makes the pair
    # of assertions worth having.
    "openreach": ("route",
                  "      const refusal = await programRefusal(req, programId);\n"
                  "      if (refusal) return res.status(refusal.status).json({ message: REFUSALS[refusal.key] });",
                  "      const refusal = programId ? null : { status: 400, key: 'mappingProgramMissing' };\n"
                  "      if (refusal) return res.status(refusal.status).json({ message: REFUSALS[refusal.key] });"),

    # `FACULTY_ADMIN` is let back in, against #79. It is the mutant worth keeping
    # longest, because this is a reversal somebody will undo by accident while
    # copying another route's MAINTAINERS.
    #
    # It kills the last row *once*, not twice, and the difference is worth
    # writing down. The screen would still refuse: its picker asks
    # `/api/plos/programs`, whose own MAINTAINERS live in `backend/routes/plos.js`
    # and are not touched here, so a faculty administrator still meets the banner
    # and no grid is drawn. What dies is the assertion on the status of the
    # request - which is the half that is actually about this route.
    "letfaculty": ("route",
                   "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
                   "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN'];"),
}

main(FILES, MUTANTS)
