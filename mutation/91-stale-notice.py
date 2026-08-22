# -*- coding: utf-8 -*-
"""
#91 แถบแจ้งผลค้างอยู่ข้ามการกระทำ - the banner that outlived what it was about.

Three mutants, one per assertion of e2e/tests/14c-departments-notice.spec.js.
Each puts back one half of the defect the ticket describes, and each kills its
own assertion and leaves the other passing - which is the point: the two ways
the walk found it are two different call sites, not one.

    python mutation/91-stale-notice.py save
    python mutation/91-stale-notice.py <mutant>
    python mutation/91-stale-notice.py restore
"""

from harness import main

FILES = {
    "departments": "frontend/src/pages/Departments.js",
    "panel": "frontend/src/components/ImportPanel.js",
}

MUTANTS = {
    # The refusal outlives the form again: cancelling stops clearing.
    "keepcancelled": ("departments",
                      "          onCancel={() => {\n"
                      "            setNotice(null)\n"
                      "            setEditing(null)\n"
                      "          }}",
                      "          onCancel={() => setEditing(null)}"),
    # The success outlives its action again: opening a new form stops clearing.
    "keepsaved": ("departments",
                  "              onClick={() => {\n"
                  "                setNotice(null)\n"
                  "                setEditing({})\n"
                  "              }}",
                  "              onClick={() => setEditing({})}"),
    # An upload stops clearing what was on the screen before it - the site the
    # first pass at #91 walked past, and the one the code review found.
    "keepbeforeupload": ("panel", "    onStart?.()", "    if (false) onStart?.()"),
}

main(FILES, MUTANTS)
