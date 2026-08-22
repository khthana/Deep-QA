# -*- coding: utf-8 -*-
"""
#55 แถบแจ้งผลอยู่เหนือขอบจอ - the banner nobody scrolls up to find.

One mutant, because the fix is one call in one component: `Notice` no longer
brings itself into view, which is the state the six screens were in before this
ticket. It must kill both assertions of e2e/tests/55a-notice-in-view.spec.js -
the red one and the green one - and leave 14c's three passing, since #91's
question is whether the banner is on the screen at all and has nothing to say
about where on it.

`if (false)` rather than deleting the line, so the mutation is one substitution
and `restore` has an exact string to put back.

    python mutation/55-notice-in-view.py save
    python mutation/55-notice-in-view.py <mutant>
    python mutation/55-notice-in-view.py restore
"""

from harness import main

FILES = {
    "notice": "frontend/src/components/Notice.js",
}

MUTANTS = {
    # The banner is set, and stays wherever the pane happens to be scrolled to.
    "noscroll": ("notice",
                 "    box.current?.scrollIntoView({ block: 'nearest' })",
                 "    if (false) box.current?.scrollIntoView({ block: 'nearest' })"),
}

main(FILES, MUTANTS)
