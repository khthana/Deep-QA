# -*- coding: utf-8 -*-
"""
#66 ลงชื่อเข้าใช้แล้วไปจบที่ไหน - and the chooser that used to sit in the way.

Six mutants, and #120 is why they are not the same six. The ticket asked a
question before it asked for a fix - whether the two-application chooser should
exist at all - and the owner answered it on 6 September 2569: there is one
application now. So this set is not about repairing the chooser into the flow.
It is about there being **one authority** for where a signed-in caller belongs,
where there used to be three, and then two.

The three were `Login.js` (navigate to `/select-app`), `GuestRoute` (redirect to
`/main`) and `SidebarItem` (move off `/main` to the first menu entry). Recording
every navigation showed what they actually produced together:

    /  ->  /select-app  ->  /main  ->  /main/rubrics

which is not what #66 describes. The ticket says the chooser is never reached;
it was reached, drawn, and taken away again. That distinction is why
`landingtakesadetour` exists as a mutant rather than as a comment - a screen
that flashes and vanishes is invisible to any assertion that only looks at
where the browser *stopped*.

**What #120 changed here, and what the sweep said about it.** Two components
were left holding an opinion about the landing - `GuestRoute` sending an
authenticated caller to `/main`, and `SidebarItem` moving them off it - which
on a literal reading of #66's own second criterion is the shape #66 removed the
third of. #120 resolved the entry in `GuestRoute`, out of the menu table both
now read, so `/main` is never an address the journey holds. Three mutants here
were claims about a hop that no longer happens, and the sweep is what said so:
aimed where they were, all three passed.

    landingstopsattheshell   killed rows 1-2  ->  survived
    landingisapathnotarule   killed rows 1-2  ->  survived
    helperreturnstooearly    killed rows 1-2  ->  survived

They did not all end the same way, which is the point of measuring each one
rather than re-aiming the set. `landingisapathnotarule` moved to the rule both
components read and kills rows 1-2 again. `landingstopsattheshell` stayed
exactly where it was and found a **row that did not exist**: with sign-in no
longer coming through that redirect, the only thing left for it to do is rescue
somebody who types `/main` by hand, and nothing had ever asked whether it did -
so row 8 was written and the mutant kills it. `helperreturnstooearly` was
deleted, because nothing can put its claim at risk any more: `signIn` waits for
a pathname that is neither `/` nor `/main`, and the first pathname that is not
`/` is now the landing itself. `e2e/support/auth.js` left this set with it.

The one mutant here whose blast radius was the whole suite is therefore gone,
and the wait it used to break is kept as a net rather than as a claim - the
helper's own comment says so.

    python mutation/66-sign-in-landing.py save
    python mutation/66-sign-in-landing.py <mutant>
    python mutation/66-sign-in-landing.py restore

Killing them:

    cd e2e && npx playwright test 66a

**Never sweep this file and `50-sign-in-screens.py` in the same run**, and the
same goes for `24-teacher-dashboard.py` **and `105-sidebar-icons.py`**. The
first shares `frontend/src/pages/Login.js` and
`frontend/src/routes/AppRoutes.js` - the sign-in screen and the router that
declares it are one pair of files, and two tickets landing on them a day apart
is the reason. The other two share
`frontend/src/components/SidebarItem.js`, which three files hold:
`105`, `24` and `66`. `save` in one would snapshot what the other has already
mutated. `SidebarItem/menus.js` is new with #120 and is held by this file alone.

The first draft of this sentence named only `24`, because it was written from a
grep of my own rather than from the census in `mutation/README.md` - and that
grep matched `"path"` but not `'path'`, which is how `105` declares its. The
README says to run the census script before sweeping a shared frontend file,
and this is what it is for.

Row numbers below are `66a`'s tests in the order they are written.
"""

from harness import main

FILES = {
    "screen": "frontend/src/pages/Login.js",
    "routes": "frontend/src/routes/AppRoutes.js",
    "sidebar": "frontend/src/components/SidebarItem.js",
    "menus": "frontend/src/components/SidebarItem/menus.js",
    "navbar": "frontend/src/components/Navbar.js",
}

MUTANTS = {
    # The landing is a handoff again: `GuestRoute` says `/main` and leaves the
    # rest to `SidebarItem`, which is the file exactly as it stood before #120.
    #
    # It kills rows 6 and 7 and leaves rows 1 and 2 standing, and that is the
    # ticket stated as a measurement rather than as an argument: where the
    # browser *stops* is the same either way, because `SidebarItem` still moves
    # off `/main`. What changes is that `/main` is an address the journey holds
    # on the way, for as long as the second hop takes - one frame today, and as
    # long as a fetch on the day a role's menu has to be fetched.
    "landingisahandoffagain": (
        "routes",
        "    return <Navigate to={landingPath(acting?.role_id) ?? '/main'} replace />",
        '    return <Navigate to="/main" replace />',
    ),
    # `SidebarItem` stops moving anyone off `/main` (the condition points at a
    # path that does not exist), so somebody who types the shell's own address
    # is left on the `<div />` that `/main` declares as its index - a blank page
    # with a menu beside it, which reads as a screen still loading.
    #
    # **Kills row 8, and row 8 exists because of this mutant.** It killed rows
    # 1 and 2 until #120, when the password landing stopped coming through
    # here: with `GuestRoute` resolving the entry itself, breaking this
    # redirect stopped failing anything at all. A mutant that survives where
    # its own file predicted a kill has found a row that does not exist yet
    # (#118), and the fix is the row.
    #
    # Two callers still reach the redirect - a typed `/main`, and the Google
    # callback, which lands on `/main` from the server because the server has
    # no menu table. Row 8 is the typed one, because it is the one this seam
    # can drive: the Google path needs a real Google project and is a ☐ with
    # a ticket (#119), not a row. So this mutant is proved against one of the
    # two callers and argued for the other, which is worth writing down rather
    # than leaving the row to imply it covers both.
    "landingstopsattheshell": (
        "sidebar",
        "    if (location.pathname === '/main') navigate(first.path, { replace: true })",
        "    if (location.pathname === '/main/never') navigate(first.path, { replace: true })",
    ),
    # The landing is a path rather than a rule: everybody is sent to the
    # programme list, which is the first entry of *some* menus and not others.
    # A committee member cannot tell, and a teacher is sent to a screen their
    # menu does not contain. This is the mutant that says a row asserting *not
    # `/main`* proves nothing about *which* screen. Kills rows 1 and 2.
    #
    # Re-aimed by #120, from `SidebarItem`'s redirect to the rule both
    # components now read. The sweep is what said it had to move: aimed at the
    # old site it survived, because the address sign-in produces is no longer
    # decided there. An anchor check would not have noticed - the line it named
    # still exists, and still runs for somebody who types `/main`. Only a sweep
    # says a mutant has stopped proving anything (#107).
    "landingisapathnotarule": (
        "menus",
        "export const landingPath = role => firstEntry(MENUS[role] ?? [])?.path ?? null",
        "export const landingPath = role => '/main/programs'",
    ),
    # `Login.js` navigates again, to a route the router no longer declares.
    #
    # It was written to show that a row reading only the *final* address is
    # blind to the journey - and the sweep says it does not show that. It kills
    # rows 1, 2 and 3: `pushState` moves the address without telling the
    # router, so the landing comes out wrong as well and the address rows catch
    # it too. The claim the comment made is not the claim the mutant proves,
    # which is the thing `CLAUDE.md` says to check for.
    #
    # It is kept because row 3 is among what it kills, and because the honest
    # version of its lesson is still worth having: no mutant here isolates the
    # journey from the destination, so row 3's value is argued rather than
    # demonstrated. What demonstrated it was measuring the real sequence before
    # any of this was written.
    "landingtakesadetour": (
        "screen",
        "      await post('/api/auth/login', { email: username, password })\n      await reload()",
        "      await post('/api/auth/login', { email: username, password })\n      await reload()\n      window.history.pushState({}, '', '/select-app')",
    ),
    # `/select-app` is declared again, behind the session guard, pointing at the
    # shell. Not the chooser - nothing can restore a deleted file by
    # substitution - but *something*, which is the whole of row 4's claim: that
    # address is a 404 like any other address nobody declares, not a route
    # quietly kept alive. Kills row 4.
    "chooserisdeclaredagain": (
        "routes",
        '      <Route path="/page-not-found" element={<NotFoundPage />} />',
        '      <Route\n        path="/select-app"\n        element={\n          <ProtectedRoute>\n            <MainPage />\n          </ProtectedRoute>\n        }\n      />\n      <Route path="/page-not-found" element={<NotFoundPage />} />',
    ),
    # The way out to the other application is back in the user menu. Kills
    # row 5.
    "portfoliodoorreturns": (
        "navbar",
        "                  <div className=\"py-1\">\n                    <button\n                      onClick={() => {\n                        setIsOpen(false)\n                        setShowChangePwd(true)\n                      }}",
        "                  <div className=\"py-1\">\n                    <button onClick={() => {}}>ไปที่ Deep Portfolio</button>\n                    <button\n                      onClick={() => {\n                        setIsOpen(false)\n                        setShowChangePwd(true)\n                      }}",
    ),
}

main(FILES, MUTANTS)
