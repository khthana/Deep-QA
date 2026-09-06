# -*- coding: utf-8 -*-
"""
#97 รหัสผ่านผิดขึ้นกล่อง Session หมดอายุ ทับประโยคจริง.

Three mutants. The defect was that a wrong password drew the shell's
full-screen *Session หมดอายุ* dialog over the sentence saying the password was
wrong - to somebody who had never had a session, whose only button returned to
the screen they were already on.

The cause was one line in `client.js`:

    if (response.status === 401 && !anonymous) sessionExpiredListener?.()

which is the rule *every 401 is an ended session unless its caller remembered
to say otherwise*. `POST /api/auth/login` is a 401 whenever a password is
mistyped, and it had not remembered.

**What replaced it is not "read the reason", and that is the thing to
understand before touching these.** The server's reason is half the answer:
`expired` is an ended session whoever asks. The other half is not the server's
to know - a cookie cleared mid-session makes the server answer `anonymous`,
because from where it stands there is nothing to have expired, and only this
side knows there was. So `client.js` reports every 401 with its reason and
`AuthContext` decides, because `AuthContext` is what holds whether anybody is
signed in.

**Two mutants were written for this file and deleted after the first sweep,
and what they taught is worth more than they were.** `everyfourohonecounts`
made the listener raise unconditionally; `strangerhasasession` made everybody
count as signed in. They were meant to break the two halves of the rule one at
a time. They killed **eighteen rows out of twenty-two each** - the same
eighteen - because both of them raise the dialog on the 401 that `GET /api/me`
answers with on a first visit, so the dialog is drawn over the sign-in screen
before any spec can sign in at all. Every other ticket's rows then fail inside
`signIn`.

A mutant that stops the application working does not prove a row. It kills the
row, and it kills forty other things first, so the run says nothing about which
assertion was holding what. **A mutant has to be able to fail one row and leave
the rest standing**, and the one below can: it names the reason.

`loginhidesitsreason` is the odd one and is here to be honest about what it
proves. Sending `reason` from the login route is the third thing #97 asked for
and it is **not** what fixes the dialog - the browser rows pass without it,
because a stranger at the sign-in screen is not signed in whatever the refusal
is called. It is a contract: every other 401 in this application names itself,
and this was the exception. So it kills a **backend** test rather than a row,
and the sheet marks that half ☑ at the HTTP seam rather than ⚙.

    python mutation/97-refusal-is-not-expiry.py save
    python mutation/97-refusal-is-not-expiry.py <mutant>
    python mutation/97-refusal-is-not-expiry.py restore

Killing them:

    cd e2e && npx playwright test 50a 10a          # the two browser ones
    cd backend && node --test "test/auth.test.js"  # loginhidesitsreason

**Never sweep this file and `10-application-shell.py` in the same run**, and
never with `13-*` or `50-*` either. All three files are held by #10's set as
well - `client.js`, `AuthContext.js` and `backend/routes/auth.js` - which is
not a coincidence: #97 is a defect in how the shell answers a refusal, and the
shell's own ticket owns those files.

Row numbers below are `50a-sign-in.spec.js`'s tests in the order they are
written, except where a `10a` row is named.
"""

from harness import main

FILES = {
    "client": "frontend/src/api/client.js",
    "authctx": "frontend/src/context/AuthContext.js",
    "authroutes": "backend/routes/auth.js",
}

MUTANTS = {
    # The defect, put back and nothing else: a wrong password counts as a
    # session that ended. It is the narrowest statement of what #97 was - the
    # old rule reached this case by *not naming* it, and this reaches it by
    # naming it, which is what makes it a mutant rather than a power cut.
    #
    # Kills the two #97 rows and leaves the other twenty standing, including
    # every one of #10's expiry rows. That asymmetry is the whole reason those
    # rows never caught this: the defect made the dialog appear *more*, and
    # every row about the dialog was written to check it appears.
    "credentialsisanexpiry": (
        "authctx",
        "      if (reason === 'expired' || signedIn.current) setExpired(true)",
        "      if (reason === 'expired' || reason === 'credentials' || signedIn.current)\n        setExpired(true)",
    ),
    # The other direction: nobody ever counts as signed in, so only the
    # server's `expired` raises the dialog. This is the fix over-applied, and
    # it is here because it is the mistake this ticket nearly shipped - a
    # cookie cleared mid-session answers `anonymous`, so `10a`'s row 6 goes
    # quiet and a person working is returned to the sign-in screen without a
    # word.
    #
    # Kills exactly one row - `10a` *row 6: a session that has ended says so* -
    # and none of #97's own. That is the shape to want: one row, and the one
    # the claim is about.
    # Anchored on the assignment with its indentation, which changed when #97's
    # own review moved the write into an effect. A two-space anchor still
    # matched the four-space line by accident; an anchor that matches by
    # accident is one that stops matching without warning.
    "onlytheserverknows": (
        "authctx",
        "    signedIn.current = state !== null",
        "    signedIn.current = false",
    ),
    # The login route throws its own reason away again, which is where it was
    # before #97. Kills `backend/test/auth.test.js` - *names its reason, the
    # way every other 401 here does* - and **no browser row**, which is the
    # honest statement of what this half is: a contract, not the fix.
    "loginhidesitsreason": (
        "authroutes",
        "          .json({ message: admission.message, reason: admission.reason });",
        "          .json({ message: admission.message });",
    ),
}

main(FILES, MUTANTS)
