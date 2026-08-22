# -*- coding: utf-8 -*-
"""
#55 แถบแจ้งผลอยู่เหนือขอบจอ - the banner nobody scrolls up to find.

Two mutants against e2e/tests/55a-notice-in-view.spec.js. `noscroll` is the
state the six screens were in before this ticket: `Notice` no longer brings
itself into view, and all three tests die. `bytext` is subtler and is the reason
the third test exists at all - it puts back the dependency the first draft of
the component had, and only the repeated refusal notices.

Both leave 14c's three passing, since #91's question is whether the banner is on
the screen at all and has nothing to say about where on it.

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
    # The first draft's dependency: the two strings rather than the object. A
    # refusal repeated word for word then re-fires nothing, and the banner stays
    # above the fold on the attempt where the person had scrolled back down to
    # fix something. Kills the third test alone; the other two set a notice whose
    # text differs from whatever was on the screen before it.
    "bytext": ("notice",
               "  }, [notice])",
               "  }, [notice?.message, notice?.error])"),
}

main(FILES, MUTANTS)
