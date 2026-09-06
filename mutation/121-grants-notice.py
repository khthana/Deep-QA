# -*- coding: utf-8 -*-
"""
#121 แผงบทบาทถือสำเนาของ Notice และพลาดการเลื่อนเข้าจอของ #55.

One mutant. `components/users/GrantsPanel.js` drew its notice from a copy of
`components/Notice.js`'s markup instead of calling it, so it never got the
`scrollIntoView` that #55 added - on a panel whose controls all sit *below* the
banner, the revoke buttons in the table and the add picker below it.

**#55 said what it had fixed and the count was the tell**: *six screens had this
block byte for byte*. There were seven. A ticket that says how many places it
changed is a ticket that can be checked, and this one could have been checked
the day it landed.

**The suspicion was measured before anything was changed, the first attempt
found nothing, and the second draft of the numbers was still wrong.** #121 was
opened during #111 with the below-the-fold half marked *ยังไม่ได้วัด*. Run at
the 900x400 viewport `55a` uses, the panel's heading stayed fully in view and
there was nothing to catch. Reading the geometry off the page, per account,
because the panel's height is a function of how many roles the person holds:

    visible pane                                   291px    at a 400px window
                                                   191px    at a 300px window

    banner -> add button, dept.admin.05@  (1 grant)  264px
    banner -> add button, multi.role@     (2 grants) 313px
    one grant row                                    ~48px

**So the seed already contains an account this is broken for.** `multi.role@`
holds two roles, which is the most any seeded account holds, and 313px does not
fit in 291px - the banner is off-screen at #55's own viewport, today, with no
situation built. The first write-up of this said the opposite: that it *fits by
27px and one more grant row would put it over*. That sentence was true of
`dept.admin.05@`, the account the spec drives, and was written as though it
described the worst case. **A measurement taken on one account and stated as a
property of the screen is not a measurement of the screen** - `/code-review`
caught that the subject was missing, and naming it turned a hypothetical into a
seeded fact.

`121a` still drives `dept.admin.05@` at a 300px window: 264px against a 191px
pane is **73px** of overflow, which does not depend on which account holds how
many roles and writes nothing into a schema every other spec shares. The
`multi.role@` figure is the one that says why the ticket mattered; this one is
how it is proved cheaply.

`grantskeepsitscopy` puts the copy back **with its `role` intact**, so it is
the scroll that fails and not the announcement: it kills `121a` alone and
leaves `111a`'s grants row passing. That separation is the point - #111 gave
the copy its role and #121 took the copy away, and the two claims have to be
able to fail apart.

    python mutation/121-grants-notice.py save
    python mutation/121-grants-notice.py grantskeepsitscopy
    python mutation/121-grants-notice.py restore

Killing it:

    cd e2e && npx playwright test 121a

Swept 6 September 2569: `grantskeepsitscopy` failed `121a` alone and left the
other eleven rows of `121a`, `111a` and `12a` standing - including `111a`'s
grants row, which is the separation this mutant exists to demonstrate. Recorded
because a `save` in `.backup/` proves the harness ran and not that anything
died.

**This file collides with nothing, and that is worth stating precisely.** Its
`FILES` holds `GrantsPanel.js` alone; `111` no longer holds it, because
`grantsstaysilent` was deleted here along with the copy it was anchored to.

What it does have is a *dependency* on `Notice.js` rather than a claim on it:
the mutant swaps a call to `Notice` for markup that does not call it, so a
sweep of `55-notice-in-view.py` or `111-refusals-announced.py` running at the
same time would be mutating the component this file's rows are standing on. Not
a corrupted `restore` - the failure mode the shared-file rule exists for - but a
result nobody can read. **A shared path and a shared meaning break a sweep
differently, and only the first is what `FILES` can tell you.** The first draft
of `mutation/README.md`'s bullet called this a shared path and was wrong; the
census script says so.
"""

from harness import main

FILES = {
    "grants": "frontend/src/components/users/GrantsPanel.js",
}

MUTANTS = {
    # The state before this ticket: the copy, announced but never scrolled to.
    # Kills `121a` and nothing else - `12a` asks whether the refusal is on the
    # screen, `111a` whether it is announced, and both are still true here.
    "grantskeepsitscopy": (
        "grants",
        "{notice && (\n"
        '        <div className="mb-4">\n'
        "          <Notice notice={notice} />\n"
        "        </div>\n"
        "      )}",
        "{notice && (\n"
        "        <div\n"
        "          role={notice.error ? 'alert' : 'status'}\n"
        "          className={`mb-4 rounded-lg p-3 text-sm ${\n"
        "            notice.error\n"
        "              ? 'bg-red-50 text-red-800'\n"
        "              : 'bg-green-50 text-green-800'\n"
        "          }`}\n"
        "        >\n"
        "          {notice.message}\n"
        "        </div>\n"
        "      )}",
    ),
}

main(FILES, MUTANTS)
