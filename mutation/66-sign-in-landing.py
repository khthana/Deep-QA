# -*- coding: utf-8 -*-
"""
#66 ลงชื่อเข้าใช้แล้วไปจบที่ไหน - and the chooser that used to sit in the way.

Six mutants. The ticket asked a question before it asked for a fix - whether
the two-application chooser should exist at all - and the owner answered it on
6 September 2569: there is one application now. So this set is not about
repairing the chooser into the flow. It is about there being **one authority**
for where a signed-in caller belongs, where there used to be three.

The three were `Login.js` (navigate to `/select-app`), `GuestRoute` (redirect to
`/main`) and `SidebarItem` (move off `/main` to the first menu entry). Recording
every navigation showed what they actually produced together:

    /  ->  /select-app  ->  /main  ->  /main/rubrics

which is not what #66 describes. The ticket says the chooser is never reached;
it was reached, drawn, and taken away again. That distinction is why
`landingtakesadetour` exists as a mutant rather than as a comment - a screen
that flashes and vanishes is invisible to any assertion that only looks at
where the browser *stopped*.

`e2e/support/auth.js` is in this set and that is deliberate. It is not the code
under test, it is the helper every other spec signs in through, and #66's
fourth criterion is about it: a helper that returns on `/main` returns before
`SidebarItem`'s `replace` has run, so the next thing any spec does can be
silently undone. `helperreturnstooearly` is that failure, and it is the one
mutant here whose blast radius is the whole suite.

    python mutation/66-sign-in-landing.py save
    python mutation/66-sign-in-landing.py <mutant>
    python mutation/66-sign-in-landing.py restore

Killing them:

    cd e2e && npx playwright test 66a

**Never sweep this file and `50-sign-in-screens.py` in the same run.** Both hold
`frontend/src/pages/Login.js` and `frontend/src/routes/AppRoutes.js` - the
sign-in screen and the router that declares it are one pair of files, and two
tickets landing on them a day apart is the reason. `save` in one would snapshot
what the other has already mutated.

Row numbers below are `66a`'s tests in the order they are written.
"""

from harness import main

FILES = {
    "screen": "frontend/src/pages/Login.js",
    "routes": "frontend/src/routes/AppRoutes.js",
    "sidebar": "frontend/src/components/SidebarItem.js",
    "navbar": "frontend/src/components/Navbar.js",
    "helper": "e2e/support/auth.js",
}

MUTANTS = {
    # The shell's empty index is where sign-in stops. `GuestRoute` still sends
    # an authenticated caller somewhere real-looking, the menu still draws
    # beside it, and the content area is the `<div />` that `/main` declares as
    # its index - a blank page that looks like a screen still loading.
    # Kills rows 1 and 2.
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
    "landingisapathnotarule": (
        "sidebar",
        "    if (location.pathname === '/main') navigate(first.path, { replace: true })",
        "    if (location.pathname === '/main') navigate('/main/programs', { replace: true })",
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
    # The helper returns on the shell's empty index, before `SidebarItem` has
    # replaced it. Every spec in this suite signs in through here, so what this
    # breaks is not `66a` alone: the `replace` still to come lands after
    # whatever the calling spec did next, undoing a navigation at a moment
    # nothing controls. Kills rows 1 and 2 directly, and is the reason the wait
    # names `/main` at all.
    #
    # It anchors on the predicate rather than on the whole statement: the
    # statement grew a `try`/`catch` around it so a timeout says which account
    # never left, and an anchor that included the semicolon would have gone
    # MISS on that edit rather than on anything about the wait itself.
    "helperreturnstooearly": (
        "helper",
        "url => url.pathname !== '/' && url.pathname !== '/main'",
        "url => url.pathname !== '/'",
    ),
}

main(FILES, MUTANTS)
