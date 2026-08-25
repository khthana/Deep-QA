# -*- coding: utf-8 -*-
"""
#98 ตารางกว้างถูกตัดทิ้งแทนที่จะเลื่อนได้ - the clipped จัดการ column.

Two mutants, one per half of the fix, because the defect had two halves that
look alike from the outside and are not the same thing.

`nominwidth` is the defect itself, put back. `pagescrolls` breaks the other
end - the table's own frame - to show that the row about scrolling is reading
the frame a person scrolls rather than any box that happens to be wide.

Measured before the fix, at a 900px window on the criteria screen:
`<main>` was 1094px, the frame's scrollWidth and clientWidth were both 1060,
and the document's scrollWidth was 900. That is the whole defect in four
numbers - the frame had nothing to scroll because it was as wide as its
contents, and what overflowed was `<main>`, which the shell clipped.

    python mutation/98-narrow-window.py save
    python mutation/98-narrow-window.py <mutant>
    python mutation/98-narrow-window.py restore

Killing them:

    cd e2e && npx playwright test 98a
"""

from harness import main

FILES = {
    "shell": "frontend/src/pages/Mainpage.js",
    "criteria": "frontend/src/pages/RubricCriteria.js",
}

MUTANTS = {
    # The defect itself. `<main>` goes back to `min-width: auto`, so it is
    # pushed to the width of the widest table inside it and past the right edge
    # of the window. Kills the first row at `reached > 0` - the frame is as wide
    # as the table again and has nothing to scroll - and then at the button's
    # right edge, which lands outside the window. Kills the second row at the
    # `<main>` width, which is the line naming the cause rather than a symptom.
    "nominwidth": ("shell",
                   'className="relative flex h-full min-w-0 flex-1 flex-col "',
                   'className="relative flex h-full flex-1 flex-col "'),
    # The other end: the frame stops being a scroll box. The table still
    # overflows it, so `scrollWidth > clientWidth` is still true - which is
    # exactly why the first row does not stop there. `scrollLeft` cannot move
    # off zero on a box that does not scroll, so `reached > 0` is the assertion
    # that dies, and it is the one the acceptance row is about: the scrollbar
    # under the table.
    "pagescrolls": ("criteria",
                    '<div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">',
                    '<div className="rounded-xl border border-gray-200 bg-white shadow-sm">'),
}

main(FILES, MUTANTS)
