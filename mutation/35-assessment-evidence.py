# -*- coding: utf-8 -*-
"""
#35 หลักฐานการประเมิน - the files that make an assessment defensible.

Five mutants, one per claim `35a` makes.

None of them is about a refusal. Every rule this ticket carries - the PDF
signature, the five types, the size limit, and which caller may open which file
- is pinned in `backend/test/evidence.test.js`, where the answer is a status and
a sentence and can be read against the criterion word for word. What is left is
what only exists in front of a screen: that the form's bytes reach the route
that reads them, that a refusal arrives as words, that opening a file is a
request, and that both roads to a file are open.

    python mutation/35-assessment-evidence.py save
    python mutation/35-assessment-evidence.py <mutant>
    python mutation/35-assessment-evidence.py restore

Killing them:

    cd e2e && npx playwright test 35a
"""

from harness import main

FILES = {
    "lib": "backend/lib/evidence.js",
    "route": "backend/routes/evidence.js",
    "api": "frontend/src/api/evidence.js",
    "screen": "frontend/src/pages/ActivityEvidence.js",
    "list": "frontend/src/pages/LearningActivities.js",
    "drilldown": "frontend/src/pages/ProgramLevelByIntake.js",
}

MUTANTS = {
    # BR-15 stops being enforced anywhere, which is the state the delivered
    # system shipped in: the file input still says PDF, the extension still
    # says PDF, and a PNG called `brief.pdf` is filed as evidence. Nothing on
    # the screen changes except that the refusal never comes. Kills row 2.
    "typecheckgone": (
        "lib",
        "const looksLikePdf = (buffer) =>",
        "const looksLikePdf = () => true;\nconst unusedLooksLikePdf = (buffer) =>",
    ),
    # The form posts its two fields and leaves the file behind. This is the
    # shape a multipart client and server disagree in - the request is
    # well-formed, the route reads it, and there is simply nothing where the
    # bytes should be. Nothing in the backend suite could see it: supertest
    # builds its own body. Kills row 1.
    "uploadsendsnofile": (
        "api",
        "  if (file) form.append('file', file, file.name)",
        "  if (false && file) form.append('file', file, file.name)",
    ),
    # The paperclip on the Activity's card opens the marks screen instead. The
    # card still has it, it still reads the same, and it goes somewhere else -
    # the shape a rename introduces, and nothing but following the link catches
    # it. Kills row 1 at the navigation.
    "evidencelinkmisleads": (
        "list",
        "learningActivities/${activity.id}/evidence`}",
        "activityScores`}",
    ),
    # Pressing a file's name shows an empty document rather than fetching the
    # one on the server. The button is still there and still responds, which is
    # the whole point: the defect this ticket exists for was a directory served
    # statically, where opening a file was not a request at all, and a screen
    # that never asks looks exactly like a screen that asks and is answered.
    # Kills row 1 at the response.
    "openaskstheservernothing": (
        "screen",
        "      showPdf(await getEvidenceFile(file.evidence_id), file.file_name)",
        "      showPdf(new Blob([]), file.file_name)",
    ),
    # The committee's road to a file closes, leaving only the teacher's. Every
    # teacher row still passes, the drill-down still names the file, and the
    # person who most needs to open it - the one checking a figure they cannot
    # otherwise verify - is refused. Kills row 3.
    "readerlockedout": (
        "route",
        "    if (acting && READERS.includes(acting.role_id)) {",
        "    if (false && acting && READERS.includes(acting.role_id)) {",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
