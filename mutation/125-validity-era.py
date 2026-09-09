# -*- coding: utf-8 -*-
r"""
#125 ปีพุทธศักราชในช่วงเวลาใช้งาน ถูกอ่านเป็นคริสต์ศักราช.

`readDate` in `backend/routes/users.js` is strict about the *shape* of a date
and says so in its own docstring: `01/03/2026` is a different day in Bangkok
than in Boston, so it is refused rather than guessed at. `2569-09-30` is not
that mistake. It is a well-formed ISO date, `Date` accepts it, and the window
was filed in the year 2569 **of the common era** - five centuries out, on an
account that is created `active`, cannot sign in (`auth/accounts.js` refuses a
window that has not opened) and, `users.js` holding GET, POST, two PUTs and the
import and no `DELETE`, cannot be removed either.

**A guard about format cannot see a mistake about meaning.** That is #107's *a
helper named for a type is a promise about that type* in a third shape, and it
is the whole of this ticket.

## The answer the owner took, and the half it drags with it

Three were offered: refuse with a key of its own, refuse and do the arithmetic
in the sentence, or accept both eras and convert. The third was listed to be
rejected - it reads the administrator's mind and is wrong the day somebody files
a genuine long-dated record - and the second was chosen on 9 September 2569.

A sentence that names the year that was typed cannot be a constant, so the
refusal is a **function** in `REFUSALS`, like the twenty already there when
this was written on 9 September 2569 - twenty-two once the two below land. The
route sites did `REFUSALS[draft.reason]`, and that hands `res.json` a function,
which `JSON.stringify` drops: a 400 with no message at all. `sentenceOf` -
`lib/importer.js`'s since #26, because the import already had refusals of this
shape - moved into `auth/refusals.js` and both sites read it. `formsentenceisakey`
and `editsentenceisakey` are that half, one mutant per site.

## Two sentences, not one with a hole in it

`validityEra` does the arithmetic; `validityYearRange` names the range. A year
gets the first only when its Buddhist reading lands inside the range, because
offering 957 to somebody who typed 1500 is worse than offering nothing.
`alwaysoffersconversion` is the merge of the two, and it is the more tempting
mistake: one sentence is less code and reads as friendlier.

## What no mutant here can say

**Nothing proves `valid_until` separately from `valid_from`.** Both ends are
read by one call to one function, so a mutant that guards one and not the other
does not exist to be written - #101's second answer of three, *structurally
unreachable*, rather than a gap. The row asserting the era in `valid_until` is
still worth its place: it is a claim about `readAccount` calling `readDate`
twice, which a later edit could take away.

## The sweep

Swept 9 September 2569 against `cd backend && node --test "test/*.test.js"`,
726 subtests green on a clean tree.

`eraisaccepted` is the defect itself, restored. It kills **6 subtests**, which
is every row this ticket added except the two that are about something else -
the one asserting a misshapen date still answers `invalidValidity`, and the one
accepting 1900 and 2200.

`alwaysoffersconversion` kills **2**: the year that is not a Buddhist one, and
the pair either side of the range. Both would be told to subtract 543 from a
number nobody typed as a Buddhist year.

`edgesarerefused` turns `<`/`>` into `<=`/`>=` - the boundary off-by-one, which
is the defect shape an arbitrary constant cannot have. It kills **1**: the row
that creates an account in 1900 and one in 2200. The two bounds are two claims
and the row's assertion message names which of them failed.

`formsentenceisakey` and `editsentenceisakey` put `REFUSALS[draft.reason]` back
at the two route sites. They kill **4** and **1**: every row that reads a
sentence off the form route, and the edit route's, which is the row that exists
because that site had no other. Neither touches the import, whose report has
read a `message` before a `reason` since #26 - which is the point of writing
two mutants for what looks like one change: the three paths a refusal takes out
of `readAccount` fail one at a time or they were never three.

Nothing outside `users.test.js` died to any of the five. The refusals table is
shared with every route in the system and the two keys added are read from one
place.

**Do not sweep this beside `11-12-accounts-and-grants.py`,
`13-user-activity-history.py` or `124-users-template-sample.py`.** All three
hold `backend/routes/users.js`, and a repeated path is what corrupts a sweep -
the check is `FILES` and not subject matter (#85). The first draft of this list
had four names on it: `67-import-template-sample.py` is about this file's
sibling and mentions `backend/routes/users.js` in its prose, and its `FILES`
holds `backend/routes/students.js` alone. **A do-not-sweep list built by reading
is a list built by subject matter** - the rule it exists to enforce is the one
that catches it, and `grep -l` over `FILES` is what it should be built from. Since #126 the harness refuses rather than reverting a file it
cannot account for, but a refusal in the middle of a sweep is still a sweep to
start again. Run `mutation/anchors.py` before believing any of it.

    python mutation/125-validity-era.py save
    python mutation/125-validity-era.py <mutant>
    python mutation/125-validity-era.py restore
"""

from harness import main

FILES = {
    "users": "backend/routes/users.js",
}

MUTANTS = {
    # the defect itself: a year is whatever the form said it was. 6 subtests.
    "eraisaccepted": ("users",
        "\n  const year = parsed.getUTCFullYear();\n"
        "  if (year < EARLIEST_YEAR || year > LATEST_YEAR) {\n",
        "\n  const year = parsed.getUTCFullYear();\n"
        "  if (false) {\n"),
    # one sentence for both mistakes, which offers 957 to somebody who typed
    # 1500. 2 subtests.
    "alwaysoffersconversion": ("users",
        "    const readable = commonEra >= EARLIEST_YEAR && commonEra <= LATEST_YEAR;\n",
        "    const readable = true;\n"),
    # the boundary off-by-one: the years the range names are the years it
    # refuses. 1 subtest.
    "edgesarerefused": ("users",
        "  if (year < EARLIEST_YEAR || year > LATEST_YEAR) {\n",
        "  if (year <= EARLIEST_YEAR || year >= LATEST_YEAR) {\n"),
    # the sentence looked up as a key on the form route: `JSON.stringify` drops
    # a function, so the person is refused with no message. 4 subtests.
    "formsentenceisakey": ("users",
        "      const draft = readAccount(req.body ?? {});\n"
        "      if (!draft.ok) return res.status(400).json({ message: sentenceOf(draft) });\n",
        "      const draft = readAccount(req.body ?? {});\n"
        "      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });\n"),
    # and the same on the edit route, which is where a round is actually
    # extended. 1 subtest.
    "editsentenceisakey": ("users",
        "      const draft = readAccount({ ...req.body, user_id: existing.user_id },"
        " { editing: true });\n"
        "      if (!draft.ok) return res.status(400).json({ message: sentenceOf(draft) });\n",
        "      const draft = readAccount({ ...req.body, user_id: existing.user_id },"
        " { editing: true });\n"
        "      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });\n"),
}

main(FILES, MUTANTS)
