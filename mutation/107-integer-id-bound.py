# -*- coding: utf-8 -*-
r"""
#107 รหัสที่เป็นตัวเลขล้วนแต่ใหญ่เกินคอลัมน์ตอบ 500 แทนที่จะตอบไม่พบ.

Mutants on one file, because #107's fix was to stop the guard being in
thirteen. Every route that addresses a surrogate key tested the id's *shape*
with `/^\d+$/` before querying - the column is an `integer` and a non-numeric
id would arrive as a 22P02 rather than the 404 the caller is owed. The shape
is only half a guard: `2147483648` is all digits, passes it, and overflows the
column as a 22003, which the error handler reports as เกิดข้อผิดพลาดในระบบ -
a system fault, for an address somebody typed.

`integerId` in `backend/lib/fields.js` is #32's, and it tested the bound with
the shape from the day it was written. What #107 did was reach the routes that
had not adopted it.

**The ticket undercounted, in the direction they all do.** It names seven call
sites in four files; `backend/lib/fields.js`'s own docstring named four files;
the code had **fourteen** hand-rolled guards in ten route files, of which
**thirteen in nine files** are this defect. All thirteen were reproduced as a
500 at the HTTP seam before one line was changed.

**And the fourteenth is not one, which is the finding rather than a footnote.**
`weights.js:183` greps identically, is about the same `integer` column, and
looks like the fourteenth site of fourteen. It reads a `score_ratio_id` out of a
*body*, and `null` there does not mean *refuse* - it means *a category this
scheme does not have yet*, and the row is inserted. An id the scheme does not
hold is refused by name (`weightNotFound`) about forty lines further down,
before it is ever a query parameter, so there is no 22003 to prevent; adopting
`integerId` there would have turned a refusal into a silent insert. It answers
404 today and answered 404 before the ticket. **A guard that greps the same is
not the same guard - read what it does with its `null`.**
`weights.test.js` carries the row that pins it, so a later pass that "finishes"
#107 fails a test instead of shipping the regression.

## Two crafted ids, and why one was not enough

The first draft of every row here used `99999999999999999999` alone, which is
the id the ticket itself suggests. It cannot see half the guard.
`Number('99999999999999999999')` is 1e20, and `Number.isSafeInteger` refuses it
before `id <= INT4_MAX` is consulted at all - so `nobound`, the mutant that
deletes the ceiling, would have survived a full sweep with every row green and
the clause that is actually about the `integer` column unproved.

`2147483648` is the id that only the ceiling can refuse: one past the column,
and a number JavaScript holds exactly. Both are in `OVERWIDE_IDS` in
`backend/test/helpers.js` and every row loops over the pair. This is #96's
`nofallback` lesson arriving a second time, one ticket later: **ask what a
mutant would have to change that no existing row could see, and ask it before
the sweep rather than after.**

## What has no mutant here

`id >= 1`, the floor. `work-groups.test.js` asserts `'0'` and `'-1'` against
two routes and would fail if it went, so the claim is held - but it is #32's
claim, not this ticket's, and the mutant belongs in a file about #32's screen.
Named here so the next reader meets an explanation rather than a gap.

`Number.isSafeInteger(id)` has no mutant for a different reason, and it is a
measurement rather than an argument. `nosafety` was written, swept, and
**killed nothing - 712 of 712 green**. The clause cannot decide anything:
`/^\d+$/` has already excluded signs, decimals and exponents, so every string
reaching it is a non-negative integer literal, and every one large enough to be
unsafe is also far larger than `INT4_MAX` and refused by the ceiling one clause
later. #45's rule applies - a survivor means the claim was never at risk rather
than that a test is missing - so the mutant was deleted rather than left in the
store as a red mark against rows that are fine. The clause stays in the code: it
costs nothing, and it is what would still hold if the regexp were ever loosened.

**The nearly-invisible trap here is that it can decide something for a caller
whose column is not an `integer`.** See the paragraph below.

## Sweeping this file

Safe beside anything. `backend/lib/fields.js` is in no other mutation file's
`FILES` - checked, not assumed. It is *reached* by eighteen route files, so a
mutant here fails rows on any screen that addresses a row by id, and the list
below is what that costs rather than a list of this ticket's screens (#123's
rule: when a mutant lives in shared code, its sheet is one of the places it
kills, not the list).

    python mutation/107-integer-id-bound.py save
    python mutation/107-integer-id-bound.py <mutant>
    python mutation/107-integer-id-bound.py restore

Killing them:

    cd backend && node --test "test/*.test.js"

## What the sweep said, 7 ก.ย. 2569

    shapeonly   HTTP 15 subtests
    nobound     HTTP  9 subtests
    nosafety    HTTP  0  - deleted, see above

An earlier draft of this paragraph predicted 24 and 15. It was written before
the sweep ran and both figures were wrong, which is the same mistake
`96-outcome-order.py` records one ticket earlier and the reason these numbers
are pasted from a log rather than recalled.

The asymmetry is #96's species with #96's cause. `shapeonly` restores the
defect whole - shape only, no floor and no ceiling - so it fails every row in
the store that crafts an unusable id: this ticket's ten, plus **five that
predate it** and were the only proof `integerId` had. Those five are worth
naming, because they are the rows that would have to be found by hand
otherwise - `activities.test.js`, `activity-editor.test.js`,
`clo-assessment.test.js`, `program-results.test.js` and `work-groups.test.js`.
`nobound` deletes one clause and only a row carrying `2147483648` can tell.
**The narrower mutant is the one that says whether the rows were written well**;
the wide one only says the function is load-bearing.

**Nine, not ten, and the missing one is the best thing the sweep found.**
`nobound` fails every #107 row except `improvement-plan.test.js`'s entry row,
and the reason is in the schema rather than in the test:
`clo_course_cycle_detail_cloplan.clo_course_cycle_detail_id` is a **`bigint`**.
`2147483648` is a value that column will hold perfectly well, so the query runs,
finds nothing, and answers the 404 the row asks for - with or without the
ceiling. Only the 1e20 half of the pair can say anything there, and it is
`Number.isSafeInteger` that refuses it. Three identity columns in this schema
are `bigint` (`users.id` and the two `clo_course_cycle` tables) and every other
one is `integer`, so exactly one of the thirteen sites is in this position.

That is worth stating as a limit rather than as a curiosity. `integerId` is
named for `integer` and one of its callers guards a wider column, so on that
one route it refuses ids the column could legally hold. Nothing turns on it -
the answer is 404 either way, an identity sequence would have to pass two
billion rows before a real entry could be addressed by a refused id, and a
refusal is the safe direction to be wrong in. But the docstring's promise, *an
id this schema could actually hold*, is a sentence about `integer` and it is
one route too broad. Named here so the next reader meets a measurement rather
than a surprise.

There is nothing for the browser seam to kill. No screen in the application
sends an id it did not first receive from the server, so every row #107 adds is
a ☑ at the HTTP surface and none of them is a ⚙. That is the mark saying which
seam proved a row, not a gap - #119's rule, the mark is not the mutant.
"""

from harness import main

FILES = {
    "fields": "backend/lib/fields.js",
}

MUTANTS = {
    # The defect itself, restored: test the shape, hand the number on, and let
    # the column say what it thinks. This is the state thirteen sites were in
    # before the ticket. The anchor is the whole returned expression rather
    # than one clause, because that is what the routes used to do - and it
    # keeps the mutant from being a half-guard nobody ever shipped.
    "shapeonly": (
        "fields",
        "  return Number.isSafeInteger(id) && id >= 1 && id <= INT4_MAX ? id : null;\n",
        "  return id;\n",
    ),
    # The column's own ceiling, and nothing else. `Number.isSafeInteger` still
    # refuses 1e20, so this survives every row written with the ticket's own
    # suggested id and is killed only by `2147483648` - one past `integer`, and
    # a number JavaScript holds exactly. It is the reason `OVERWIDE_IDS` is a
    # pair rather than the single id the ticket names.
    "nobound": (
        "fields",
        "  return Number.isSafeInteger(id) && id >= 1 && id <= INT4_MAX ? id : null;\n",
        "  return Number.isSafeInteger(id) && id >= 1 ? id : null;\n",
    ),
}

main(FILES, MUTANTS)
