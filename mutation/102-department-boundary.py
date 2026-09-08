# -*- coding: utf-8 -*-
r"""
#102 ทุกหลักสูตรใน seed อยู่ภาควิชาเดียว ขอบเขตของภาควิชาจึงไม่มีอะไรพิสูจน์.

The ticket's headline is that `reachablePrograms` could be deleted whole and no
test would fail. That was measured first, and it is **false**: with the filter
replaced by `TRUE`, **seven** subtests failed on the tree as the ticket found
it - and **eight** once this ticket's own seeded curriculum was in, which is
why the two figures are both written down here. The filter is proved - by the
PROG_MANAGER and committee half, where a grant scoped to `0503` reaching `0501`
is visible on data the seed already had. The ticket says so itself one paragraph
below its headline, which is a reminder to read a ticket to the end before
believing its first sentence.

What was genuinely unproved is narrower and is the other half of the same
function: **the department branch of `coveredScopes`**. A grant on department
`05` expands to the programmes of `05`, and every programme in the dataset was
in `05`, so *the curricula of my department* and *every curriculum there is*
were the same two rows. `anydepartmentreachesall` is that claim and nothing
else: it widens the department branch only, leaving `p.program_id = $1` alone,
so a programme grant is untouched. The first attempt was `OR TRUE`, which
widened every branch at once and killed **27** subtests - #97's mutant that
stops the application working - and it said nothing about which assertion held
what. A mutant has to be able to fail one row and leave the rest standing.

## What the seed change is worth, measured

`anydepartmentreachesall` before the new curriculum: **2** subtests. After:
**7**, across five suites - `grants` `plos` `program-subjects` `rubrics`
`students`. `noprogramfilter` went from 7 to 8. The ticket predicts *one seed
change hardens a dozen rows at once*; the measurement is **seven kills, five of
them new**, and those are two different numbers that a single figure hides.
Seven is what the mutant proves today; five is what this ticket added.

The seven, by file, so that a reader coming the other way can find them:

    grants            the scopes offered are limited to what the granter reaches
                        + a department administrator is offered their department
                          and its programmes   <- the nested subtest, the seventh
    plos              a department administrator reaches both curricula under
                      their department
    program-subjects  the administrator above a programme reaches it
    program-subjects  the pickers offer exactly what the writes will accept
    rubrics           the curricula offered are the ones the account holds
    students          an administrator of another department sees and writes
                      nothing here

Six titles and one nested subtest: `node --test` counts the nested failure and
its parent separately, and counting titles instead is how a sweep comes to
report six of its own seven kills.

## The third property, asked about before the sweep was written up

Both mutants vary the same thing - **which programmes** a grant covers - so
between them they say nothing about the *department* branch beside it
(`d.department_id = $1`), which is what the programmes screen itself filters
on. #96's rule says to ask what a mutant would have to change to break this in
a way neither existing one does. Widening that branch the same narrow way was
tried and it fails **31** subtests across six suites - #97's mutant that stops
the application working. So the answer here is not *a gap*: the department
branch is the most heavily proved line in `authorise.js`, and no mutant is
written for it because none can fail one row and leave the rest standing. Say
which of the three a clause is - proved, unreachable, or untested - rather than
leaving a reader to assume the last.

`programs.test.js`'s *and the boundary runs the other way, on a curriculum no
test made* is #102's third acceptance criterion and one of those 31. It is not
killed by either mutant here, and that is the honest record of it.

## The situation already existed, in one suite, built by hand

`backend/test/students.test.js` inserted programme `0101` under department `01`
with raw SQL, for its own use, and asserted the 01 administrator's picker was
exactly `['0101']`. Both of the mutant's two original kills came from that one
fixture. So this was never *nobody can express it*; it was **one suite paid for
it and no other screen inherited it**. #102 moves the row into `db/seed.js` and
deletes the copy. The student stays where it was: it is that test's subject, and
the หลักสูตร was its situation.

## What the widened list found in the assertions

Two picker tests named exactness and asserted inclusion - `plos.test.js`'s *a
department administrator reaches both curricula under their department* and
`rubrics.test.js`'s *the curricula offered are the ones the account holds*, each
two `assert.ok(...includes(...))` and no statement about what is absent. A list
that is too wide passes both. They are `deepEqual` on the whole list now, and
they are two of the seven kills. **A seed that cannot express a defect and an
assertion that cannot see one are the same hole from two ends** - fixing the
data is what made the assertions worth tightening.

## The marks

Both mutants are killed by `node --test`, so the rows they back are **☑** and
not ⚙ - #119's rule, the mark is not the mutant.

## Sweeping

`backend/lib/reach.js` is also in `16-subjects.py`'s FILES, and
`backend/auth/authorise.js` is in `10-application-shell.py`'s and
`23-offerings.py`'s. **Do not sweep this file beside any of those three** -
compare FILES, not subject matter.

    python mutation/102-department-boundary.py save
    python mutation/102-department-boundary.py <mutant>
    python mutation/102-department-boundary.py restore
"""

from harness import main

FILES = {
    "reach": "backend/lib/reach.js",
    "authorise": "backend/auth/authorise.js",
}

MUTANTS = {
    # the list of curricula not narrowed to what the grant covers.
    # 8 subtests today: evidence, offerings, plos x2, program-subjects x2,
    # rubrics, students. Seven of the eight predate #102 - this mutant was
    # never the gap, and the ticket's headline says it was.
    "noprogramfilter": ("reach",
        "      WHERE ($1::text[] IS NULL OR program_id = ANY($1))\n"
        "      ORDER BY program_id ASC",
        "      WHERE ($1::text[] IS NULL OR TRUE)\n"
        "      ORDER BY program_id ASC"),
    # a grant on a department reaching every curriculum rather than its own.
    # Aimed so that only the *department* branch widens: a grant scoped to a
    # programme leaves `EXISTS` false and is untouched, which is what keeps
    # this from becoming #97's mutant that stops the application working.
    # 7 subtests, where before the seeded หลักสูตร it was 2.
    "anydepartmentreachesall": ("authorise",
        "         OR p.department_id = $1\n",
        "         OR EXISTS (SELECT 1 FROM departments d2 WHERE d2.department_id = $1)\n"),
}

main(FILES, MUTANTS)
