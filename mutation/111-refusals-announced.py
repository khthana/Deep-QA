# -*- coding: utf-8 -*-
"""
#111 คำปฏิเสธถูกวาด แต่ไม่มีใครประกาศมัน.

Five mutants. Twenty screens drew a refusal and none of them told anybody it
had arrived.

There were six. `grantsstaysilent` took the `role` off the grants panel's own
copy of the banner, and [#121](https://github.com/khthana/Deep-QA/issues/121)
deleted that copy the same day - the panel calls `Notice` now, so the line the
mutant was anchored to does not exist and `refusalisnotannounced` covers it
along with the other 34 screens. **A mutant outlives its ticket but not its
anchor**, and the honest move when a later ticket removes the code is to delete
the mutant rather than re-aim it at something it was not written about. What
replaced it is `grantskeepsitscopy` in `mutation/121-grants-notice.py`, which
puts the copy back *with* its role - so it fails the scroll and not the
announcement, and the two claims stay separable.

**The ticket's evidence was a grep, and the grep was narrower than the claim it
was used for.** `grep -rn 'role="alert"\\|aria-live' frontend/src` returned
nothing, which the ticket reads as *no live region anywhere in the app*. That
pattern cannot match `role="status"`, and seven of those were already in the
store - `CloAssessment`, `ContinuousImprovement`, `OutcomeActivityMapping` and
`StudentResults` all announce their empty-state sentences. The banner really was
silent, so the defect stands; the sweeping half of the sentence was an artefact
of the pattern. It also predates #85, which had put `role="alert"` on the
sign-in banner in the meantime. **Re-run a ticket's own commands before
repeating its conclusions, and ask what the command could not have found.**

**The ticket's diagnosis was out of date, and measuring it first is what made
the fix small.** It says the banners are drawn inline on each page rather than
by a shared component, and proposes writing one. `components/Notice.js` already
exists - #55 wrote it, for an unrelated reason - and **34 screens use it**. So
the work was one attribute in one component plus three stragglers, not twenty
edits or a new component. It also listed twenty files; of those, `LearningDetails`
turned out to be a list of CLOs needing attention rather than a refusal at all,
and most of the other `bg-red-50` matches in the store are `hover:bg-red-50` on
delete buttons.

One of the twenty is not covered and is not a refusal either.
`components/activity/ActivityForm.js` and `pages/GradingWeights.js` turn a
running total red once it passes 100 while somebody is typing. That is the
ticket's own counter-example - *a validation hint that appears while typing is
not* the assertive case - and it is also #38's defect exactly: a fact carried
only in colour. It is neither announced nor named, and it is not this ticket:
see [#122](https://github.com/khthana/Deep-QA/issues/122).

**The judgement the ticket asks to be made once is `alert` versus `status`.**
`role="alert"` is assertive and interrupts; `role="status"` is polite and
queues. A refusal the person just caused by pressing a button is the assertive
case - they are waiting for that exact answer. A success is not: *saved* is
worth hearing and not worth cutting somebody off for. `Notice` decides it from
`notice.error`, the same flag that already picks red or green, and no caller
gets a say.

`everythingisanalert` is the mutant that matters most here, and it is the only
one whose defect a person cannot see. Every row that asserts a refusal still
passes with it applied, the screens look identical, and the only thing that
changed is that saving a form now interrupts a screen-reader user mid-sentence
to tell them it worked. **A politeness level is a claim like any other, and it
needs a mutant or it is not proved.**

    python mutation/111-refusals-announced.py save
    python mutation/111-refusals-announced.py <mutant>
    python mutation/111-refusals-announced.py restore

Killing them:

    cd e2e && npx playwright test 111a

**Never sweep this file with `10-application-shell.py`, `66-sign-in-landing.py`
(both hold `Navbar.js`), `55-notice-in-view.py` (holds `Notice.js`) or
`91-stale-notice.py` (holds `ImportPanel.js`).** Four collisions is what a
cross-cutting fix looks like: this ticket is not about a
screen, it is about one thing every screen does, so its files belong to whoever
owns each screen.

Row numbers below are `111a`'s tests in the order they are written. This file
was appended to rather than inserted into, so they have not moved - which is
the cheap way to keep it that way (see #85's three renumberings in one day).
"""

from harness import main

FILES = {
    "notice": "frontend/src/components/Notice.js",
    "navbar": "frontend/src/components/Navbar.js",
    "import": "frontend/src/components/ImportPanel.js",
}

MUTANTS = {
    # The state before the ticket: drawn, and announced to nobody. Kills rows
    # 1, 2 and 3 - the refusal has no assertive region, the success has no
    # polite one, and the grants panel has neither since #121 moved it onto
    # this component. Nothing else, because every other row in the store finds
    # these banners by their text.
    #
    # It killed two when it was written. #121 landed the same day and the third
    # came with it: a mutant's reach grows when a screen joins the component it
    # is anchored to, and the count here is worth re-reading after any ticket
    # that consolidates.
    "refusalisnotannounced": (
        "notice",
        "        role={notice.error ? 'alert' : 'status'}\n",
        "",
    ),
    # The interesting one. Everything is assertive, so every refusal row still
    # passes and the screens are pixel-identical; what breaks is that saving a
    # form now interrupts a reader to say it worked. Kills row 2 alone, which
    # is the row that exists to keep this a decision.
    "everythingisanalert": (
        "notice",
        "role={notice.error ? 'alert' : 'status'}",
        "role=\"alert\"",
    ),
    # The other direction: nothing interrupts, so a refusal waits its turn
    # behind whatever the reader is already being told. Also kills row 1 alone.
    # Written because *polite everywhere* is the more tempting mistake of the
    # two - it is the safer-sounding option, and it is wrong for the case the
    # ticket was opened about.
    "everythingispolite": (
        "notice",
        "role={notice.error ? 'alert' : 'status'}",
        "role=\"status\"",
    ),
    # The change-password dialog keeps its own banner, so it needs its own
    # mutant: a fix that lands in the shared component and misses the copies is
    # exactly the shape #111 was opened to catch. Kills row 4.
    "dialogstayssilent": (
        "navbar",
        '                        role="alert"\n',
        "",
    ),
    # And the import report, which is a block with a table in it rather than a
    # sentence. Kills row 5.
    "importstayssilent": (
        "import",
        '<div role="alert" className="mt-4 rounded-lg bg-red-50 p-3">',
        '<div className="mt-4 rounded-lg bg-red-50 p-3">',
    ),
}

main(FILES, MUTANTS)
