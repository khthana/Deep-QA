# -*- coding: utf-8 -*-
"""
#19 ผลการเรียนรู้ระดับหลักสูตร — the mutants that proved `19a-plos.spec.js`.

Twelve, one per ⚙ row of `docs/acceptance/19-programme-learning-outcomes.md`
except where a row has two halves that break independently — the removal row
has three, because a removal on this screen has three possible answers and each
of them is a different piece of code.

Two of these are worth reading before trusting the rows they back.

The three that are about order are three because the claims they break are
three, and because the file runs serially: the first row to die stops the rest,
so a mutant that kills an earlier row than the one it is written for looks like
a clean kill and proves nothing. Each of these is aimed past the rows before it.

`codeorder` replaces the whole walk's ORDER BY with the outcome code, which
makes 0503's PLO-2 fall back behind PLO-1. That is the *fourth* criterion —
display order respected — and only the seeded pair can see it, for #96's reason:
everywhere else in the seed, sequence_order and the code agree.

`childpath` leaves the roots alone and drops `sequence_order` from the
*recursive* branch's path, so sub-outcomes sort by identifier within their
parent. 0503's pair were seeded in order and survive it; the two children this
spec adds were not, and the row about the tree's shape dies. Ordering the whole
walk by identifier would have killed the code-order row first instead, which is
why the mutant is written against the one branch.

`ordernotsaved` stops the edit route writing the column, leaving creation to
write it as before. Every row up to the fourth is untouched — they only ever
create — and the fifth, which moves an outcome that already exists, is the
first thing that notices.

`hardcancel` makes the dialog's ยกเลิก do what its ยืนยัน does. It is written
that way round on purpose: a mutant that skipped the dialog entirely would kill
the two removal rows as well, and then none of the three would be evidence
about confirmation specifically.

    python mutation/19-plos.py save
    python mutation/19-plos.py codeorder
    cd e2e && npx playwright test 19a        # expect exactly the named failure
    python mutation/19-plos.py restore
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import main  # noqa: E402

FILES = {
    "route": "backend/routes/plos.js",
    "page": "frontend/src/pages/Plos.js",
    "form": "frontend/src/components/plos/PloForm.js",
}

MUTANTS = {
    # Row 3 — the list is in the stated order, not in the order of the codes.
    "codeorder": (
        "route",
        "          ORDER BY lo.program_id ASC, lo.path ASC`,",
        "          ORDER BY lo.program_id ASC, lo.outcome_code ASC`,",
    ),
    # Row 4 — a child is drawn directly under its parent, siblings in order.
    # Only the recursive branch, so the roots — and the row before this one —
    # keep the order they had.
    "childpath": (
        "route",
        "           SELECT child.*, t.path || child.sequence_order || child.outcome_id",
        "           SELECT child.*, t.path || child.outcome_id",
    ),
    # Row 5 — changing the display order moves the row. The walk still walks and
    # creation still writes the field; what stops is the edit that was just made.
    "ordernotsaved": (
        "route",
        "                  sequence_order = $7,",
        "                  sequence_order = sequence_order,",
    ),
    # Row 6 — the parent picker offers neither the outcome being edited nor
    # anything under it.
    "pickeroffersall": (
        "form",
        "  const excluded = editing ? subtreeOf(plos, value.outcome_id) : new Set()",
        "  const excluded = new Set()",
    ),
    # Row 7 — removal asks first, and answering no leaves the outcome alone.
    "hardcancel": (
        "page",
        """        onCancel={() => {
          setNotice(null)
          setRemoving(null)
        }}""",
        "        onCancel={confirmRemoval}",
    ),
    # Row 8 — a main outcome with sub-outcomes is refused rather than switched
    # off. Without the guard `deleteOrDeactivate` reads the children's foreign
    # key as any other reference and quietly deactivates the parent.
    "nochildguard": (
        "route",
        "          if (rows[0]) throw new HasChildren();",
        "          if (false) throw new HasChildren();",
    ),
    # Row 9, first half — the banner says which of the two things happened.
    "saysdeleted": (
        "route",
        "      return res.status(200).json({ plo: outcome.row, deactivated: true });",
        "      return res.status(200).json({ plo: outcome.row, deactivated: false });",
    ),
    # Row 9, second half — a switched-off outcome is still listed. This is the
    # screen it is switched back on from, so a list that hides it is a one-way
    # door: the code is held by the row that is already there.
    "hideinactive": (
        "route",
        "            WHERE lo.parent_outcome_id IS NULL",
        "            WHERE lo.parent_outcome_id IS NULL AND lo.is_active",
    ),
    # Row 9, third half — and switching it back on has to reach the column.
    # The swapped coalesce still reads $9, which matters: dropping the parameter
    # instead would leave the statement one short of what is bound to it, and
    # every edit on the screen would fail with it — killing the order row long
    # before this one.
    "statusignored": (
        "route",
        "                  is_active = coalesce($9, is_active),",
        "                  is_active = coalesce(is_active, $9),",
    ),
    # Row 10 — an administrator narrows the list to one curriculum, and each
    # keeps its own codes. Without the filter both trees stay on screen and the
    # two PLO-1s are two rows.
    "nofilter": (
        "route",
        "              AND ($2::text IS NULL OR lo.program_id = $2)",
        "              AND ($2::text IS NULL OR true)",
    ),
    # Row 11 — the accounts this screen is not for are refused it. #79 names
    # A09 among the three tickets it binds.
    "facultyadmin": (
        "route",
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN'];",
    ),
    # Row 1 — one curriculum in reach is stated rather than asked about.
    "alwaysadropdown": (
        "page",
        "              {programs.length > 1 ? (",
        "              {programs.length > 0 ? (",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
