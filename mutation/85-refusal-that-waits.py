# -*- coding: utf-8 -*-
"""
#85 ข้อความปฏิเสธบนหน้าลงชื่อเข้าใช้หายเองเร็วเกินกว่าจะอ่านทัน.

Three mutants. The sign-in refusal used to clear itself after three seconds,
which was found on 21 August 2569 in a way worth keeping: the walk could not
photograph the sentence, because a screenshot through CDP takes two to three
seconds and the banner was gone by the second one. The evidence had to be
caught with a `MutationObserver`. A person looking at the keyboard while they
type is in that same position.

The replacement has no clock in it at all. The sentence is true until the
person changes a field it is about, and changing a field is the act that makes
it out of date. WCAG 2.2 §2.2.1 is the rule; *a time limit nobody set and
nobody can extend* is the shape.

**The two rows this proves are a pair, and neither works alone.** *Typing
clears it* passed before the fix as well - the timer got there first - so on
its own that row cannot tell an act from a clock. What rules the clock out is
the other row, which waits five seconds and finds the sentence still there.
Read them together or not at all.

**Two more were written for `role="alert"` and both were deleted, and the
reason is worth more than they were.** `alertisjustadiv` took the attribute off
the banner; `wrappereatstheattribute` made `ContentMotionDIV` drop it again, one
component further out. The comments claimed they were different failures with
different fixes. The sweep says a spec cannot tell them apart: **nine rows out
of thirteen, the same nine, for both.**

The reason is the interesting part. #85 changed the banner's locator from a
Tailwind class to `getByRole('alert')`, so the role is now what the banner *is*
as far as this suite is concerned. Take it away and every row that mentions the
banner stops finding anything - not because the claim failed, but because the
subject vanished.

**An attribute a locator is built on stops being provable by mutation. It
becomes the premise of those rows rather than a claim any of them makes**, and
the whole file going red is what that looks like. The role's presence is
already load-bearing in the plainest possible way: if it were missing, the
suite would not be green. A mutant that says so is proving the tests can run.

So nothing here marks the announcement ⚙. What a browser can be asked is
whether the attribute reaches the DOM, and every row asks that by existing.
Whether a screen reader announces it, and whether assertive is the right
politeness for this banner, is not a question this seam can put - the sheet
marks that half ◐ and leaves the rest of the application to
[#111](https://github.com/khthana/Deep-QA/issues/111).

**`refusaldescribesnothing` is the counter-example, and it is what makes the
rule above a line rather than a mood.** `aria-describedby` is an accessibility
attribute on the same banner, from the same ticket, added for the same reason -
and removing it fails **one row**. Nothing locates anything by it, so taking it
away removes a claim instead of removing the subject. **Whether an attribute
can be proved by mutation has nothing to do with how much it matters and
everything to do with whether the suite finds elements by it.** An attribute
the tests locate through is a premise; one they read off an element they
already found is a claim.

**What was deliberately not built: the dismiss control.** #85 asks for the
refusal to stay *until the person does something (edits a field, or presses a
close button)*. The edit-a-field half is here; the button is not, and that is a
decision rather than an oversight. `docs/06` §Out of Scope reads *"The UI is
reproduced as-is. Any proposal to change it is raised as a question, not
implemented"* - a close button is a control that is not on the delivered screen,
so adding one is exactly the proposal that rule sends back as a question. The
`or` in the ticket makes one of the two paths sufficient for the accessibility
requirement it is really about, WCAG 2.2 §2.2.1, which is about time limits
nobody set: with the timer gone there is no limit left to extend. Anyone who
wants the button should open it as its own ticket, and it should probably cover
all twenty banners rather than this one.

The narrower shape of the same rule is worth stating, because the first draft
of the fix broke it: `ContentMotionDIV` was given `...rest` so that `role`
could reach the element. 63 call sites, four of which already pass animation
props this component has always dropped - the spread would have made
all four live and changed how four unrelated screens arrive, inside a ticket
about how long one sentence stays on a fifth. It takes named `role` and `id`
props instead. **A passthrough is not a neutral act in a shared component.**

    python mutation/85-refusal-that-waits.py save
    python mutation/85-refusal-that-waits.py <mutant>
    python mutation/85-refusal-that-waits.py restore

Killing them:

    cd e2e && npx playwright test 50a

**Never sweep this file with `50-sign-in-screens.py` or `66-*.py`.** All three
hold `frontend/src/pages/Login.js`.

`97-*.py` is safe to sweep beside this one, which is worth stating because the
first version of this paragraph said the opposite. Both tickets landed on the
sign-in screen on the same day, so *they must share a file* felt obvious enough
not to check - and #97 turned out to hold no frontend file this one touches at
all. It fixed the dialog drawn over the refusal, which lives in `client.js` and
`AuthContext.js`; this one fixed the refusal's own lifetime, which lives in
`Login.js`. **Read `FILES`, not the tickets' subject matter** - the overlap that
corrupts a sweep is a path, and paths are the only thing worth comparing. Four
tickets on one screen is what happens to the one screen everybody passes
through, and it is exactly where that guess goes wrong.

Row numbers below are `50a`'s tests in the order they are written, and they
move when a test is inserted rather than appended - #85 inserted two after row
7. Count the tests rather than trusting a number that disagrees.
"""

from harness import main

FILES = {
    "screen": "frontend/src/pages/Login.js",
}

MUTANTS = {
    # The three-second timer, exactly as it was. Kills row 8 and nothing else -
    # row 9 (*typing clears it*) passes with this applied, which is the whole
    # reason row 8 exists.
    "refusaltimesout": (
        "screen",
        "  const clearRefusalAndSet = setter => value => {",
        "  useEffect(() => {\n"
        "    if (!errorMessage) return\n"
        "    const timer = setTimeout(() => setErrorMessage(''), 3000)\n"
        "    return () => clearTimeout(timer)\n"
        "  }, [errorMessage])\n"
        "\n"
        "  const clearRefusalAndSet = setter => value => {",
    ),
    # The other end: the sentence never goes away at all. A refusal that cannot
    # be got rid of is its own defect - it outlives the thing it describes, and
    # the person who has just corrected their password is still being told it
    # was wrong. Kills row 9, and row 8 passes with it applied.
    "typingleavesitup": (
        "screen",
        "    setter(value)\n    setErrorMessage('')",
        "    setter(value)",
    ),
    # The sentence is announced once and then belongs to nobody: it is drawn
    # above the form and describes neither field, so it is gone from the
    # accessible tree the moment the announcement is over. Kills row 10 alone -
    # the banner is still found by its role, still carries the server's words,
    # and still outlives the five-second row, so nothing else notices.
    #
    # **This is the counter-example to the two role mutants described in the
    # header.** The locator does not stand on `aria-describedby`, so taking it
    # away removes a claim rather than removing the subject, and exactly one
    # row goes red. Same file, same ticket, same kind of attribute - what
    # decides whether it is provable is whether the tests find the element
    # *by* it.
    "refusaldescribesnothing": (
        "screen",
        "\n                    refusalId={errorMessage ? REFUSAL_ID : undefined}",
        "",
    ),
}

main(FILES, MUTANTS)
