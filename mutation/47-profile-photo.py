# -*- coding: utf-8 -*-
"""
#47 รูปโปรไฟล์ - the photo a person uploads, and who is allowed to see it.

Five mutants, one per claim `47a` makes.

None of them is about a rule. The signature check, the size limit, the three
answers a retrieval can give and the fact that one account cannot be handed
another's photo are all pinned in `backend/test/profile-photo.test.js`, where
the answer is a status and a sentence and can be read against the criterion word
for word. What is left is what only exists in front of a screen: that the bytes
the file input holds reach the route that reads them, that the navbar draws a
photo it asked the server for, and that a refusal arrives as words rather than as
a dialog that did nothing.

    python mutation/47-profile-photo.py save
    python mutation/47-profile-photo.py <mutant>
    python mutation/47-profile-photo.py restore

Killing them:

    cd e2e && npx playwright test tests/47a-profile-photo.spec.js


A sixth was written and taken out again, and the measurement is worth keeping.
`staleafterclose` put `close()` back to calling `onClose` and nothing else - the
state the hand-walk found, where a box reopened after a refusal still listed the
refused file, still carried the sentence about it, and offered a live save button.
It **survives**: `47a`'s fourth row passes with it applied.

The reason is measured, in both browsers. Under Playwright the closed dialog is
removed from the document within a few hundred milliseconds, so the next open is
a fresh component and `useState` does the reset by itself. In the hand-walk's
Chrome it is not removed at all: three seconds after the cancel the input is
still there, and a node marked before the close comes **back** on the reopen -
the same instance, with the same state. The tab reported `visibilityState:
"hidden"`, which is the condition: the exit animation is waiting for frames a
hidden tab does not get, `AnimatePresence` keeps the child it cannot finish
retiring, and returning the child hands the old instance back.

So the claim is real and the suite cannot put it at risk - freezing
`requestAnimationFrame` from the page does not reproduce it, because the frame
loop bound its own reference at import. Row 4 stays as a net and the reset is
proved by the hand-walk. The presence itself is not this ticket's; it is shared
with the change-password box in the same navbar, and it split in two. #167 held the
second mechanism, measured after it was opened - that box's state lives in `Navbar.js`
itself and nothing cleared it on the way out, which is provable at this seam - and it
is closed: every dialog now clears its own state on the way out. **The presence is
#169**, which is a question for the owner rather than a task, because every way to
remove the node changes animation timing people see. Two things it asks not to do:
do not write a mutant for a claim the harness cannot put at risk, and do not delete
row 4 of `47a`, which is a net on purpose.
"""

from harness import main

FILES = {
    "lib": "backend/lib/userPhoto.js",
    "api": "frontend/src/api/profile.js",
    "navbar": "frontend/src/components/Navbar.js",
    "dialog": "frontend/src/components/ProfilePhotoDialog.js",
}

MUTANTS = {
    # The type check stops being a check, which is the state the delivered
    # system shipped in: `uploads.single('image')` wrote whatever arrived, under
    # whatever name, and nothing ever looked at the bytes. The screen is
    # unchanged - the chooser still filters on PNG and JPEG, the sentence under
    # it still says so - and a PDF called `photo.png` becomes somebody's face.
    # Kills row 2 twice over: the refusal never arrives as words, and an avatar
    # appears where the row says the placeholder should still be. It kills row 3
    # as well, because every file is then served as the kind it answers for
    # everything — a JPEG replacing a PNG comes back `image/png`.
    "typecheckgone": (
        "lib",
        "const imageKind = (buffer) => {",
        "const imageKind = (buffer) => KINDS[0];\nconst unusedImageKind = (buffer) => {",
    ),
    # The form posts to the right route with nothing in it. This is the shape a
    # multipart client and server disagree in: the request is well-formed, the
    # route reads it, and there is simply nothing where the bytes should be.
    # Nothing in the backend suite could see it, because supertest builds its own
    # body. Kills row 1 at the upload, and row 2 with it - every row here goes in
    # through the same form, so the seam it breaks is under both of them.
    "uploadsendsnofile": (
        "api",
        "  form.append('image', file, file.name)",
        "  if (false) form.append('image', file, file.name)",
    ),
    # The navbar never asks for the photo. The account has one, `/api/me` says
    # so, the upload succeeded - and the button keeps the placeholder, which is
    # what everybody saw in the delivered system for a different reason: it drew
    # Google's `profile_picture`, an address at another company, blank for
    # everybody who signs in with a password. Kills row 1 at the avatar, and at
    # the reload, which is the half that says the bytes came from the server —
    # and row 3, which is the same claim asked of a replacement.
    "avatarneverfetches": (
        "navbar",
        "    if (!profile?.has_photo) {",
        "    if (true) {",
    ),
    # The navbar is never told to ask again, so a replacement leaves the photo
    # that was there. `has_photo` was true before the upload and is true after
    # it, so nothing the shell re-reads says anything has changed — which is why
    # the counter exists and why removing it is invisible to every other row.
    # The `else` is left alone deliberately: mutating the condition instead would
    # send a replacement through `reload()`, whose unmount refetches the photo by
    # accident and proves nothing. Kills row 3.
    "replacementnotredrawn": (
        "navbar",
        "    if (profile?.has_photo) setPhotoVersion(version => version + 1)",
        "    if (profile?.has_photo) setPhotoVersion(version => version)",
    ),
    # The refusal is swallowed: the save does nothing, the dialog stays open with
    # no sentence in it, and the person presses the button again. A screen that
    # refuses silently is the one failure mode a status code cannot see, which is
    # why this row is in front of a browser at all. Kills row 2 at the alert.
    "refusalnotsaid": (
        "dialog",
        "      setError(err.message)",
        "      setError('')",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
