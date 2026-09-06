# -*- coding: utf-8 -*-
"""
#119 ทางเข้าด้วย Google ไปจบที่ไหน - and the sentence that answered a
different question.

Three mutants, and they are killed at the **backend HTTP seam** rather than in
the browser. The rows they back are ☑ naming `auth.test.js`, not ⚙: no browser
enters this route, by construction, and `95-route-not-found.py` is the
precedent for a set that runs under `node --test`.

**What the ticket found was a sentence that was true and was read as an answer
to a question it does not address.** The header of `backend/test/auth.test.js`
says Google's consent screen is not something a suite can drive, so the Google
paths are asserted through `resolveGoogleAccount`. Both halves of that are
correct - about *Google's* half of the round trip. The two lines that decide
where a person actually ends up are on this side of it:

    if (!admission) return refuseToBrowser(res, refusal?.reason ?? 'unknown');
    ...
    return res.redirect(`${frontendUrl()}/main`);

and nothing at either seam ran either one *on a caller Google had answered
for*. Precisely: `refuseToBrowser` itself is run today, by the
`googleUnavailable` row - the branch that answers before passport is ever
entered. What no seam reached is the pair of lines past it, and the difference
matters because the covered branch is what made the uncovered one look
covered. **A reason that explains why one half cannot be tested is not a
statement about the other half**, and it read like one for long enough that #66
rewrote the destination on that line with no test watching.

`50a` looks like it covers the refusal and does not. It iterates
`GOOGLE_REFUSAL_REASONS` by **typing each reason into the address bar** -
`openSignIn(page, 'login?error=' + reason)` - which proves the screen can read
a reason out of a query string. Between the function that decides the reason
and the screen that renders it sits the route that has to put one there, and
that is the piece both seams stepped over.

What is stubbed is exactly the two calls that leave the machine: the token
exchange and the profile lookup. The strategy, `resolveGoogleAccount`, the
seeded database and the cookie are all real. docs/06 forbids stubbing the
database and stubbing sign-in; neither is stubbed here. A stubbed profile
asserts *Google said this address*, which is the one fact in the exchange
Google is the authority on and the only one the strategy takes from it.

**This does not close the walk.** #119 offers two ways to close it and this is
the modest one: it proves where the server sends a browser and what it sends it
with, not what a person sees. The Google half of criterion 1 on
`docs/acceptance/10-application-shell.md` goes from ☐ to ☑, and the ☐ it was is
the kind that says *nobody can currently clear this* rather than *nobody has
looked*.

    python mutation/119-google-landing.py save
    python mutation/119-google-landing.py googlelandsonthechooser
    python mutation/119-google-landing.py restore

Killing them:

    cd backend && node --test test/auth.test.js

Swept 6 September 2569 against the whole backend suite, one mutant at a time.
Baseline 702 pass, 0 fail; each mutant then failed **a different one of the
three subtests and nothing else** (the run also marks the parent block `not
ok`, which is node:test reporting that a child failed rather than a second
casualty).

| มัตแตนต์ | ฆ่าแถว |
|---|---|
| `googlelandsonthechooser` | *sends the browser to /main* |
| `googlelandswithoutasession` | *sends it signed in* |
| `googlerefusalforgetsthereason` | *refuses an address outside the domain* |

**The first sweep did not read like that, and the fix was in the test rather
than in the mutants.** `googlelandsonthechooser` and
`googlelandswithoutasession` both failed one subtest that asserted the
destination *and* the cookie, so at the summary level the two were
indistinguishable - the shape #85 met with `role="alert"` and had to write a
paragraph about. Here it was not a premise the locator stood on, only two
claims sharing a row, so the row was split: **a redirect to `/main` without a
session is a redirect to `/login` a moment later**, and the destination and the
session are separately worth being wrong about. Two mutants failing one row is
a reason to look at the row.

**Never sweep this file beside `10-application-shell.py`, `13-user-activity-history.py`,
`50-sign-in-screens.py` or `97-refusal-is-not-expiry.py`.** All five hold
`backend/routes/auth.js` - the way in and the way out of the system are one
file, and every ticket about either lands on it. This is a shared *path*, which
is what the census script in `mutation/README.md` reports and what a `restore`
can corrupt; #121's entry in that README is the other kind, and the two break a
sweep differently.
"""

from harness import main

FILES = {
    "route": "backend/routes/auth.js",
}

MUTANTS = {
    # #66's defect put back on the one line that was never asserted: the
    # chooser is gone from the frontend, so this sends a browser to a route
    # that 404s, carrying an acting grant in a query string the other end could
    # edit and does not read (ADR-0002). The cookie is still issued, so this
    # fails the destination row and leaves the session row passing.
    "googlelandsonthechooser": (
        "route",
        "      return res.redirect(`${frontendUrl()}/main`);",
        "      return res.redirect(`${frontendUrl()}/select-app?role=${admission.role.role_id}`);",
    ),
    # The destination kept and the session dropped: `/main` without a cookie
    # is `/login` a moment later. The mirror image of the one above - it fails
    # the session row and leaves the destination row passing, which is the
    # whole reason those are two rows.
    "googlelandswithoutasession": (
        "route",
        "      await admitted(res, pool, admission, 'GOOGLE_LOGIN');\n",
        "",
    ),
    # Every refusal arrives at the sign-in screen wearing the same reason. Not
    # the fallback sentence - `unknown` is a real reason with real words - so
    # an address from the wrong domain is told *ไม่พบข้อมูลผู้ใช้งานในระบบ
    # กรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน* and goes to ask for an account it
    # was never going to be refused for want of. A wrong sentence reads better
    # than a missing one, which is what makes this worth a mutant. `50a`
    # cannot see it: that spec supplies the reason itself.
    "googlerefusalforgetsthereason": (
        "route",
        "      if (!admission) return refuseToBrowser(res, refusal?.reason ?? 'unknown');",
        "      if (!admission) return refuseToBrowser(res, 'unknown');",
    ),
}

main(FILES, MUTANTS)
