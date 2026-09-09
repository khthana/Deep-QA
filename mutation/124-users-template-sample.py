# -*- coding: utf-8 -*-
r"""
#124 แถวตัวอย่างในแบบฟอร์มนำเข้าผู้ใช้สร้างบัญชีที่ลบไม่ได้.

`GET /api/users/import-template` shipped one example row and it was a whole
account. Downloading the template and uploading it unchanged - measured while
closing #67, not inferred - answered `201 created=1` and created `66010001` /
`somchai.ja@kmitl.ac.th`, status `active`, `is_verified true`, with a `TEACHER`
grant on department `05`. `backend/routes/users.js` holds GET, POST, two PUTs
and the import and **no `DELETE`**: the account can be deactivated and it
cannot be removed.

## Why this is not #67 twice

#67's students template overwrote a **person already on the register**, because
that import is the only one in the system whose `ON CONFLICT` updates a row
somebody is standing on. This import refuses a key it already holds, so nothing
existing was ever written over. What is left is a junk row that cannot be taken
out again - smaller, and a different defect, which is why it was a ticket of its
own rather than a second commit on #67.

The two tickets reach the same fix from opposite directions, and that is worth
recording as a coincidence rather than as a convention: #67 removed its sample
because uploading it **changed** something, #124 because uploading it **added**
something. Both registers are the two of ten with no delete route, which is the
grep that decided both (`router.delete` across `backend/routes`).

## The owner's answer, and the half that is not the route

The ticket offered three answers and the owner chose the third on 9 September
2569: **header alone, and the formats moved onto the screen.** The second half
matters as much as the first. `frontend/src/components/ImportPanel.js` drew no
column guidance at all - a heading, a subtitle, two buttons - so with the sample
row gone the CSV would have been the only teacher and it would have been empty.

`ImportPanel` therefore takes an optional `notes`, and `Users.js` passes seven
sentences read off the code one at a time rather than remembered - four places
and not one function; `readAccount` holds three of the seven, the import wrapper
requires the role, `placeAllowed`/`assignable` hold the scope, and the status
rule is `IMPORT_COLUMNS` simply not having the column. Two of the seven are
relations *between* columns rather than properties of one, which is the sense in
which a header could never have carried them:

    which language a name may be in (the either/or itself is not stated - the
      owner cut that clause on 9 September 2569, so the screen carries the
      weaker true half and `readAccount`'s `invalidUser` is stated nowhere)
    the password is required for FULL_ADMIN and EXT_ASSESSOR and useless for
      the rest - nothing on this path refuses one, `accounts.js:275` does, at
      sign-in

and a third is a defect found while writing it. `2569-09-30` is a well-formed
ISO date, is accepted, and files the window in the year 2569 **of the common
era** - five centuries out, on an account that is created `active`, cannot sign
in (`backend/auth/accounts.js:152`) and cannot be deleted. That is
[#125](https://github.com/khthana/Deep-QA/issues/125). Until it is decided, the
word `ค.ศ.` on the screen is the only thing standing between a Thai
form-filling habit and a dead account, which is why `eraisbuddhist` exists: the
sentence has to be provably about the era rather than about there being a list.

## The sweep

Swept 9 September 2569.

`sampleisanaccount` is the defect restored. **2 subtests** of `users.test.js`:

    the import template > is a spreadsheet file, asserted without this system's own reader
    the import template > names nobody, and uploading it unchanged creates nobody

and **browser row 6** of `11b-users-import.spec.js` (*row 5: the template names
nobody*). That file is `mode: 'serial'`: the whole-file run stopped at row 6 and
never ran row 7 at all, so row 7 was measured on its own with `--grep` and
passes. A serial run reports the first row that dies and skips every row after
it, which is a fact about the runner and not about the mutant (#67), and reading
its summary as the kill count is how a mutant comes to look narrower than it is.

`blankexamplerow` is the same route with `{}` in place of the example - what
"no example" looks like to somebody who deletes the values instead of the
argument. `{}` is truthy, so `example ? [example] : []` still emits a row, of
fifteen empty cells. It kills **1 subtest** and the browser row, and the
*creates nobody* subtest passes: `parseRows` drops a line whose every cell is
blank, so the upload is still refused as empty and still writes nobody. The
asymmetry is why the file's two claims - *the template carries no row* and
*uploading it creates nobody* - are two subtests rather than one.

`formatsnotonscreen` takes the guidance off the accounts screen and leaves it on
every other screen's, which is what a fix that landed in the shared component
would have looked like. It kills **browser row 7** alone.

`eraisbuddhist` changes one word of one sentence. It kills the same row and
nothing else, and it is the difference between a row that asserts *there is
guidance* and a row that asserts *the guidance says this*.

The frontend gate has no mutant and needs none: `notes` is read by
`ImportPanel` only where a caller passes it, and the nine callers that pass
nothing draw nothing - which is the claim `formatsnotonscreen` makes from the
other side.

## Sweeping

**Do not sweep this beside `11-12-accounts-and-grants.py`, `13-user-activity-
history.py` or `57-pager.py`.** The first two hold `backend/routes/users.js` and
the third holds `frontend/src/pages/Users.js`; a repeated path is what corrupts
a sweep, and the check is `FILES` and not subject matter (#85). Run
`mutation/anchors.py` before believing any of it.

    python mutation/124-users-template-sample.py save
    python mutation/124-users-template-sample.py <mutant>
    python mutation/124-users-template-sample.py restore
"""

from harness import main

FILES = {
    "users": "backend/routes/users.js",
    "screen": "frontend/src/pages/Users.js",
}

MUTANTS = {
    # the defect itself, put back: an example row that is a whole account. 2
    # subtests + browser row 6.
    "sampleisanaccount": ("users",
        "    sendTemplate(res, 'users-template.csv', IMPORT_COLUMNS));\n",
        "    sendTemplate(res, 'users-template.csv', IMPORT_COLUMNS, {\n"
        "      user_id: '66010001',\n"
        "      email: 'somchai.ja@kmitl.ac.th',\n"
        "      title_th: 'นาย',\n"
        "      first_name_th: 'สมชาย',\n"
        "      last_name_th: 'ใจดี',\n"
        "      title_en: 'Mr.',\n"
        "      first_name_en: 'Somchai',\n"
        "      last_name_en: 'Jaidee',\n"
        "      department_id: '05',\n"
        "      program_id: '',\n"
        "      role_id: 'TEACHER',\n"
        "      scope_id: '05',\n"
        "      valid_from: '',\n"
        "      valid_until: '',\n"
        "      password: '',\n"
        "    }));\n"),
    # a row of fifteen empty cells - `{}` is truthy, so the row is still
    # emitted. 1 subtest + browser row 6; the *creates nobody* subtest survives.
    "blankexamplerow": ("users",
        "    sendTemplate(res, 'users-template.csv', IMPORT_COLUMNS));\n",
        "    sendTemplate(res, 'users-template.csv', IMPORT_COLUMNS, {}));\n"),
    # the formats never reach the screen, which is what the fix would look like
    # if only the route half had shipped. browser row 7.
    "formatsnotonscreen": ("screen",
        "            notes={IMPORT_NOTES}\n",
        ""),
    # the guidance names the era a Thai form usually asks for, which is the one
    # the parser does not mean (#125). browser row 7.
    "eraisbuddhist": ("screen",
        "เป็นปี ค.ศ. เช่น 2026-09-30",
        "เป็นปี พ.ศ. เช่น 2569-09-30"),
}

main(FILES, MUTANTS)
