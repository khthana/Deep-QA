# -*- coding: utf-8 -*-
"""
#96 รายการ CLO เรียงแบบพจนานุกรม.

Two mutants on one file, because #96's fix was to stop the rule being in ten
files. `subject_clo.clo_number` is `varchar(50)` and the person types it, so the
database ordered it as text: `'CLO-10' < 'CLO-2'` is true, and a set with more
than nine outcomes read with CLO-10 wedged between CLO-1 and CLO-2 on every
screen that lists one.

**Why two green suites passed over it for months.** `db/seed.js` builds
`CLO-1..CLO-9` from a nine-entry array, and on nine single-digit codes ordering
as text and ordering as a number are the *same order*. No assertion anywhere was
in a position to tell the two rules apart. That is why both mutants below are
killed only by rows that bring `CLO-10` with them - the first code that
discriminates - and why the sheet says so in as many words rather than claiming
a coverage it does not have.

**The ticket undercounted, twice.** Its body names one `ORDER BY`; its own
comment of 3 Sep names four across three files. There are **ten** across eight
route files (counted with `grep -c`, not recalled - the first draft of this
paragraph said nine). The comment also names one test that compares the route against a
copy of the route's own `ORDER BY`; there are **four**, and the other three
citations it might have meant are a fixture helper twice over and a
`DESC LIMIT 1` that picks a row rather than claiming an order.

**And two sites that look identical are deliberately not callers.**
`sectionResults.js` builds `array_agg(DISTINCT c.clo_number ORDER BY
c.clo_number)` twice and compares the two arrays to ask whether two academic
years carry the same set of outcomes. Both sides are built the same way, so the
answer does not depend on which order is used - and Postgres will not accept a
sort key that is not one of the `DISTINCT` expressions anyway. Changing them
would be a change with no claim behind it. **A repeated `ORDER BY` is not
automatically a repeated defect; read what the order is for.**

## Sweeping this file

Safe beside anything: the only file here is `backend/lib/cloOrder.js`, which no
other mutation file in the store touches. It is *reached* by eight route files,
so a mutant here can fail a row on any screen that lists outcomes.

## What the sweep said, 7 ก.ย. 2569

An earlier draft of this paragraph said the kills *span three specs*. That was
written before the sweep ran, and it was wrong: they span **two**.

    ordersastext   HTTP 1 subtest    browser 2 rows
    descending     HTTP 9 subtests   browser 2 rows  (the same two)
    nofallback     HTTP 1 subtest    browser 0 rows

`27a` survives both mutants completely, and that is the finding rather than a
footnote. Its row 1 asserts `codesOnScreen(page)` equals `clos.map(...)` - the
screen draws what the route answered, in the order it answered - which is a
claim about the screen, not about what that order is. The sheet had it carrying
*เรียงตามรหัส* anyway; the row is now split and the ordering half cites `96a`
row 1. **A mutant that survives a row is the cheapest way to find out the row
never claimed what its sheet says it claims.**

`nofallback` was added after the sweep, because the review asked what the
first two could not see. Both of them change **which order** the list comes
back in, so a suite holding only codes with digits would stay green with the
`NULLIF` deleted - and deleting it does not reorder anything, it raises:
`''::numeric` is not a cast Postgres will make, so one digit-less code answers
500 on every screen that lists outcomes. It kills the new subtest and nothing
else, in either direction, which is the shape #97 asks a mutant to have.
**Two mutants that vary the same property cannot see a third property**, and
the way to notice is to ask what a mutant would have to change to break the
code in a way neither of the existing ones does.

The asymmetry between the first two mutants is the point of that pair. `ordersastext`
is the defect itself and it kills **one** subtest, because the seeded nine are
single-digit codes on which both rules agree; only the row that brings `CLO-10`
can see it. `descending` kills nine, because direction is visible on any set at
all. The three rows that see both are the three that were built for this ticket:
`96a` row 1, `37a`'s off-the-chart row, and `clos.test.js` subtest 131.
"""

from harness import main

FILES = {
    "order": "backend/lib/cloOrder.js",
}

MUTANTS = {
    # The defect itself, restored: order the text and nothing else. This is the
    # state every screen was in before the ticket, and the anchor is the whole
    # returned fragment so that it fails as one rather than leaving a half-rule
    # that Postgres would reject and turn into a 500 on every screen at once
    # (the #97 shape - a mutant that stops the application working says nothing
    # about which assertion was holding what).
    "ordersastext": (
        "order",
        "    `NULLIF(regexp_replace(${at}clo_number, '[^0-9]', '', 'g'), '')::numeric ASC NULLS LAST, ` +\n"
        "    `${at}clo_number ASC`\n",
        "    `${at}clo_number ASC`\n",
    ),
    # The direction is a claim of its own, and it is the one the four rewritten
    # backend assertions are in a position to make: they sort with `inCloOrder`
    # in JavaScript now, so a route that answers highest-first fails them on the
    # seeded nine - where `ordersastext` cannot, because on nine single digits
    # the two rules agree. The pair is the honest picture of what each row can
    # and cannot see.
    "descending": (
        "order",
        "'')::numeric ASC NULLS LAST, ` +\n",
        "'')::numeric DESC NULLS LAST, ` +\n",
    ),
    # The half neither mutant above can see, and the review is what found it:
    # both of those change which order the list comes back in, and a suite that
    # only ever holds codes with digits in them would stay green with the
    # `NULLIF` deleted. It is not decoration. `regexp_replace('CLOX', '[^0-9]',
    # '', 'g')` is the empty string and Postgres will not cast that to numeric,
    # so without the NULLIF one digit-less code does not sort oddly - it raises,
    # and every screen that lists outcomes answers 500 until somebody deletes
    # it. Dropping `NULLS LAST` with it keeps the mutant to one edit; the row it
    # fails asserts both halves, and the 500 is the half that would be found
    # first anyway.
    "nofallback": (
        "order",
        "`NULLIF(regexp_replace(${at}clo_number, '[^0-9]', '', 'g'), '')::numeric ASC NULLS LAST, ` +\n",
        "`regexp_replace(${at}clo_number, '[^0-9]', '', 'g')::numeric ASC, ` +\n",
    ),
}

main(FILES, MUTANTS)
