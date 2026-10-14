# -*- coding: utf-8 -*-
r"""
#88 - each end of an account's validity window carries the other as its bound.

The window was walked on 21 August 2569 (sheet `11`, criterion 4, the row *a
window the wrong way round*): a start of 29/08 with an end of 28/08 is refused
by `validateUser` in `backend/routes/users.js` and, if that comparison is ever
flipped, by the table's own CHECK constraint - which is what this directory's
`125-validity-era.py` records. What nothing did was say the rule while the
dates were being chosen. The form's two `type="date"` inputs carried
`className`, `value` and `onChange` and nothing else, so the browser's own
picker offered every day in both fields and the round trip was the first thing
to mention the order.

Since #88 the later field carries `min={draft.valid_from || undefined}` and the
earlier one `max={draft.valid_until || undefined}`.

**An addition and not a replacement** (ADR-0002), which is the ticket's own
sentence. Nothing here moves a server-side guard, and the six mutants below
are all in `frontend/src/components/users/UserForm.js`.

## Three claims, two ends each, which is why there are six

The bound is three claims and not one, and `|| undefined` is the second of
them:

- **It is there, and it is the counterpart's value.** `nolowerbound` and
  `noupperbound` are the code as it stood before this ticket, one end each.
- **It is absent while the counterpart is blank**, because the server's rule is
  `from && until && from > until`: an end with no start is an open window the
  system accepts, and a field that bounded itself anyway would refuse it. That
  is the other direction of a *refuse only where X* guard (#48, #108), and
  `lowerboundwhenthereisnone` / `upperboundwhenthereisnone` are the tempting
  mistake - default the bound to today - one end each.
- **It is inclusive.** A one-day window is legal and sheet `11`'s walked row
  *the first day of the window* is the record of it, so the bound is the
  counterpart's own day and not the day after. `thelowerboundexcludesit` is the
  off-by-one, kept narrow: it still leaves the field unbounded when the start is
  blank, so what it fails is the equality and the one-day window and nothing
  else (#97). `theupperboundexcludesit` is the same off-by-one at the other
  end, and it is a mutant of its own because the first leaves `max` alone -
  without it, the half of the one-day window asserted on the *start* field had
  nothing to be read against.

## What these mutants cannot say

`125-validity-era.py` writes that nothing proves `valid_until` separately from
`valid_from`, both ends being read by one call to one function. That stays true
of the era guard at the HTTP seam. It is not true of the bound: the two
attributes are written at two sites, so one end can be guarded and the other
left bare, and the two rows above are what tells that apart.

**What no mutant here reaches is the picker.** `min` is what Chromium decides
with, and `validity.rangeUnderflow` is that decision read back, which is what
the rows assert. That the calendar *draws* the earlier days as unavailable is
appearance and stays a hand-walked row.

## The sweep

Swept on 14 October 2569, one mutant at a time, against
`npx playwright test tests/88a-the-window-states-its-own-rule.spec.js` - the
whole file name, because a test-file argument is matched as a substring (#154,
#158). Clean baseline **5 passed of 5**.

- `nolowerbound` - **fails rows 1, 3, 4 and 5**, 4 of 5. Rows 1 and 4 at `min`
  on the field the start was typed into, row 3 at the same attribute on an
  account whose window was loaded rather than typed, row 5 at *the day before
  the start underflows*, which is the bound being a rule and not an attribute.
  Row 2 **passes**: the other end is a second site and a second claim.
- `noupperbound` - the mirror. **Fails rows 2, 3, 4 and 5**; row 1 passes.
- `lowerboundwhenthereisnone` - **fails rows 1 and 4**, 2 of 5, both at *there
  is nothing to bound*, with `2026-10-14` where `null` was asked for. Today's
  date is what makes this the tempting mistake rather than an arbitrary one.
  Rows 2, 3 and 5 pass, nothing it does being visible once the counterpart has
  a value.
- `upperboundwhenthereisnone` - the mirror. **Fails rows 2 and 4.**
- `thelowerboundexcludesit` - **fails rows 1, 3, 4 and 5**: the first three at
  the equality (`2026-08-30` for `2026-08-29`, and `2026-09-15` for the loaded
  `2026-09-14`), row 5 at the one-day window, where the end of a window that is
  legal underflows a bound that should admit it.
- `theupperboundexcludesit` - the mirror, and the reason it was written:
  `thelowerboundexcludesit` leaves `max` alone, so row 5's assertion about the
  **start** field on a one-day window had no mutant to be read against. **Fails
  rows 2, 3, 4 and 5**, row 5 at that very read.

Where rows 3, 4 and 5 share a mutant with rows 1 and 2 they are reachability
claims (#191): the rule is one expression per end, so no mutant can tell the
editor's draw from the add form's, and what each row adds is that its own way in
arrives there.

**What the sweep could not corrupt.** The two attributes are read by nothing
else in the suite - `grep -rn "rangeUnderflow\|getAttribute('min')" e2e/`
finds this spec alone - and `grep -l UserForm.js mutation/*.py` finds this file
alone, so no other sheet's figures move with these six.

### Where each row's assertions were split, and why

Rows 4 and 5 were written during the sweep and not before it. Rows 1 and 2
originally ended with *clearing the counterpart takes the bound away* and
carried the two `validity` reads in the middle, and every mutant that touches an
attribute kills those rows at the **first** assertion - so three claims of the
five were behind a red row that was red for another reason, which is a claim
nothing is read against (#119, and #206's own review). Each of the three is now
a row that a mutant's kill can be read against.

## Do not sweep beside

Nothing. `grep -l UserForm.js mutation/*.py` finds this file alone, which is
how the list is built rather than by subject matter (#85, #125).

    python mutation/88-the-window-states-its-own-rule.py save
    python mutation/88-the-window-states-its-own-rule.py <mutant>
    python mutation/88-the-window-states-its-own-rule.py restore
"""
from harness import main

FILES = {
    'userform': 'frontend/src/components/users/UserForm.js',
}

LOWER = '                min={draft.valid_from || undefined}\n'
UPPER = '                max={draft.valid_until || undefined}\n'
TODAY = "new Date().toISOString().slice(0, 10)"
NEXTDAY = "new Date(Date.parse(draft.valid_from) + 86400000).toISOString().slice(0, 10)"
DAYBEFORE = "new Date(Date.parse(draft.valid_until) - 86400000).toISOString().slice(0, 10)"

MUTANTS = {
    # The code as it stood before #88, one end at a time: the field is there,
    # the rule is not.
    'nolowerbound': ('userform', LOWER, ''),
    'noupperbound': ('userform', UPPER, ''),
    # Bounded even where the counterpart says nothing - the guard wrong in the
    # direction that refuses a window the server accepts (#48).
    'lowerboundwhenthereisnone': ('userform', LOWER,
        '                min={draft.valid_from || ' + TODAY + '}\n'),
    'upperboundwhenthereisnone': ('userform', UPPER,
        '                max={draft.valid_until || ' + TODAY + '}\n'),
    # The bound off by one day, which makes a one-day window illegal. Narrow:
    # a blank start still leaves the field unbounded.
    'thelowerboundexcludesit': ('userform', LOWER,
        '                min={draft.valid_from ? ' + NEXTDAY + ' : undefined}\n'),
    'theupperboundexcludesit': ('userform', UPPER,
        '                max={draft.valid_until ? ' + DAYBEFORE + ' : undefined}\n'),
}

main(FILES, MUTANTS)
