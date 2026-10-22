# -*- coding: utf-8 -*-
r"""
#180 ช่องสถานะบนฟอร์มเขียนไว้สามแบบ และภาควิชาเป็นจอเดียวที่มีช่องนี้ตอนสร้าง.

Five forms carry a status field. Until 22 October 2569 three of them drew a
`checkbox` reading *เปิดใช้งาน* and two a `select` reading
*ใช้งานอยู่ / ปิดใช้งาน*, which is the wording all five tables' own badges use -
so three screens wrote one state in two vocabularies on one screen. And
ภาควิชา was the only one of the five that offered the field at **creation**,
its route the only one of the five that read `is_active` on an INSERT.

The ticket was labelled `question` for both halves, and `docs/06` §Out of Scope
does not bind either of them: the delivered frontend has no status control on
any screen and never reads `is_active`, so every one of these five fields is
the rebuild's own (#156 - ask who chose each value). The owner answered on
22 October 2569: **a two-option `select` on all five**, with **the shape and the
words first** and the `Field` label's hint paragraph and the `disabled` the
other two carry left to #228, a ticket of their own; and **the field comes off the
ภาควิชา create form**, like the other four.

## What each mutant is for

`statusatcreation` is the diagnosed code, restored (#115): the route reading
`is_active` out of a creation's body. It is the half of the answer that binds
every caller rather than the one a screen hides - which is why it is a mutant
of the route and the row that holds it is at the HTTP seam.

`reportsopenbutinsertsclosed` is the **second** claim of that same subtest, and
it exists because the first one cannot put it at risk. The row asserts the
answer's `is_active`, then the column in the table; `statusatcreation` dies at
the first, so everything written below that line was proved by nothing (#88).
`RETURNED` is a projection this route picks, so *stored open* and *reported
open* are two claims, and this mutant is the row's own comment made to run - a
route that inserts `false` and reports `true`. Its third assertion, that the
edit still switches one off, is not a claim of this ticket: it is criterion 3's,
held by `181a` and by `181-the-status-switch.py`, and it is here to make the two
above it about the **creation** rather than about the column.

`createformshowsstatus` draws the field at creation again, which is the other
half, read where a person meets it. It kills `180a` at the count, and it is the
reason that row reads the **same locator green** one line later: a row that only
counted zero would pass on a screen that never drew the control at all (#171).

`departmentoptionsswapped` and `programoptionsswapped` swap the two options'
values, one per form, so that *the word a person chooses is the state that is
saved* is a claim and not a press that went through. They are two mutants and
not one because the two forms hold two copies of this JSX: a guard written for
one caller is a claim about every caller (#97), and there is nothing shared here
for one mutant to stand in the middle of. The rows that die are `181a`'s, which
read the **badge in the table** afterwards.

That is also why the press in `181a` is by the visible word and the precondition
above it by `value`: with the options swapped, an open department draws
`value="active"` on the option that now says *ปิดใช้งาน*, so a precondition read
by the word would die one line **above** the claim and prove the precondition
instead of it (#193).

## What has no mutant here, and why

**The รายวิชา form's select has none.** Its status field is pressed at this seam
only as an **instrument** - `16a` row 97 closes a department and `18a` row 10
closes a subject, each to look at what another screen then offers - and an
instrument is not an assertion (#171). A swapped-options mutant there would go
red on those rows, but what it would be killing is a claim about a catalogue
filter, so the kill would be credited to a row that never said anything about
the form's words. The claim belongs to `16-subjects.md`'s hand-walked pair,
which this change re-dates rather than proves.

**Nothing here is about what a creation stores at the browser seam.** The form's
own `EMPTY` has `is_active` true, so a screen with the field back still creates
an open department: that row would pass against the unfixed code and measure
nothing (#203). It is `backend/test/departments.test.js`'s row, and
`statusatcreation` is its mutant.

## The sweep

Swept 22 October 2569, one mutant at a time, against
`cd backend && node --test "test/departments.test.js"` (23 subtests green on a
clean tree) and against
`npx playwright test 180a 181a` (6 rows green) and `npx playwright test 16a 18a`
(28 rows green).

`statusatcreation` kills **1 subtest** - *a department is created open, whatever
the body says* - at the answer's own `is_active`, and nothing else: no row
before #180 ever sent the field to a creation, which is what made the behaviour
invisible for eleven tickets.

`reportsopenbutinsertsclosed` kills **1 subtest**, the same one, 22 of 23
passing - and it dies at `departments.test.js:673`, the read of the table,
rather than at `:664`, the read of the answer. That is the whole point of it:
the line it dies at is the line the mutant above leaves unread (#88, #193).
Added after `/code-review` on 22 October 2569 said so.

`createformshowsstatus` kills **1 row**, `180a`, at the count on the เพิ่ม form,
and leaves 33 passing. Everything else on the ภาควิชา screen passes under it,
including the five rows of `181a`: the field it puts back is on a form none of
them opens.

`departmentoptionsswapped` kills **3 rows**: the two of `181a` it was written
for - *a department is retired from its own form* and *closing a department is
not a silent revocation* - both at the badge, which is the claim, and a
bystander, `16a` row 97, whose **instrument** closes department `01` through
this same form to see what the subject form's picker then offers. A fix that
changes a control is a change to every row that presses it, including the rows
that press it to arrange something (#199), and `DepartmentForm.js` is shared, so
this sheet is one of the places this mutant kills and not the list (#123). The
three หลักสูตร rows pass under it.

`180a` passes under it too, which is the #193 split doing its work from the
other side: that row reads the control by `value`, and an open department draws
`value="active"` whichever option carries the word.

`departmentoptionsswapped` was re-run on 22 October 2569 after the same review
moved the four inline reads of this control in `16a` and `18a` onto the shared
helpers (#171): the same 3 rows, and the bystander still `16a` row 97. A press
routed through a helper is the same press, and the re-run is what says so
rather than the reasoning (#107, #68).

`programoptionsswapped` kills **3 rows** of `181a` - the two หลักสูตร rows that
press the form and *a curriculum with data under it is closed, and reopened from
its form* - and leaves the two ภาควิชา rows standing. The mirror image, which is
what two copies of one opinion look like when each has its own mutant.

**Do not sweep this beside `56-wrong-template.py`,
`58-master-data-in-the-log.py`, `60-grant-over-a-deleted-scope.py` or
`181-the-status-switch.py`.** The first three hold
`backend/routes/departments.js` and the last holds both forms - a repeated path
is what corrupts a sweep, and the check is `FILES` and not subject matter (#85).
This list was built with `grep -l` over `FILES` rather than by reading titles
(#125). `181-the-status-switch.py` holds **six** mutants, not four: the four
in the two forms are anchored on the `is_active: draft.is_active` line of the
submit payload, which this change does not touch, and the other two are in
`backend/auth/authorise.js`, which it does not touch either. `SubjectForm.js`
is edited by this ticket too and is **not** in `FILES` - it belongs to
`16-subjects.py` and `18-program-subjects.py`, whose anchors this change also
leaves exact. `python mutation/anchors.py` reads the whole catalogue, so it
answers for all three files at once; only a sweep says they still prove what
their sheets credit them with (#107, #68), and those two were not re-swept -
their rows press this control as an instrument and the press is the same
behaviour in the new shape, which the clean full suite is what reads.

    python mutation/180-the-status-field-shape.py save
    python mutation/180-the-status-field-shape.py <mutant>
    python mutation/180-the-status-field-shape.py restore
"""

from harness import main

FILES = {
    "departments": "backend/routes/departments.js",
    "departmentform": "frontend/src/components/departments/DepartmentForm.js",
    "programform": "frontend/src/components/programs/ProgramForm.js",
}

OPTIONS = (
    '              <option value="active">ใช้งานอยู่</option>\n'
    '              <option value="inactive">ปิดใช้งาน</option>\n'
)
OPTIONS_SWAPPED = (
    '              <option value="inactive">ใช้งานอยู่</option>\n'
    '              <option value="active">ปิดใช้งาน</option>\n'
)

CREATE_INSERT = (
    "        `INSERT INTO departments\n"
    "           (department_id, department_name_th, department_name_en, faculty_id)\n"
    "         VALUES ($1, $2, $3, $4) RETURNING ${RETURNED}`,\n"
    "        [\n"
    "          draft.values.department_id,\n"
    "          draft.values.department_name_th,\n"
    "          draft.values.department_name_en,\n"
    "          faculty.facultyId,\n"
    "        ],\n"
)

MUTANTS = {
    # the diagnosed code: the creation reads the field out of the body, which
    # is what this route did until #180 and what the delivered backend did.
    "statusatcreation": ("departments", CREATE_INSERT,
        "        `INSERT INTO departments\n"
        "           (department_id, department_name_th, department_name_en, faculty_id, is_active)\n"
        "         VALUES ($1, $2, $3, $4, coalesce($5, true)) RETURNING ${RETURNED}`,\n"
        "        [\n"
        "          draft.values.department_id,\n"
        "          draft.values.department_name_th,\n"
        "          draft.values.department_name_en,\n"
        "          faculty.facultyId,\n"
        "          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,\n"
        "        ],\n"),
    # the row's own comment made to run: a route that stores closed and reports
    # open. `RETURNED` is a projection this route chooses, so the answer and the
    # table are two claims and the one above cannot put this one at risk (#88).
    "reportsopenbutinsertsclosed": ("departments", CREATE_INSERT,
        "        `INSERT INTO departments\n"
        "           (department_id, department_name_th, department_name_en, faculty_id, is_active)\n"
        "         VALUES ($1, $2, $3, $4, false)\n"
        "         RETURNING department_id, department_name_th, department_name_en,\n"
        "                   faculty_id, true AS is_active`,\n"
        "        [\n"
        "          draft.values.department_id,\n"
        "          draft.values.department_name_th,\n"
        "          draft.values.department_name_en,\n"
        "          faculty.facultyId,\n"
        "        ],\n"),
    # and the screen half of the same answer: the field drawn at creation too.
    "createformshowsstatus": ("departmentform",
        "        {editing && (\n",
        "        {true && (\n"),
    # the word a person chooses is not the state that is saved - one mutant per
    # form, because the two forms are two copies of this JSX (#97).
    "departmentoptionsswapped": ("departmentform", OPTIONS, OPTIONS_SWAPPED),
    "programoptionsswapped": ("programform", OPTIONS, OPTIONS_SWAPPED),
}

main(FILES, MUTANTS)
