# -*- coding: utf-8 -*-
"""
#95 404 ที่ตอบด้วย error แทน message - the refusal whose words never arrived.

Two mutants, both against the backend seam, because that is the only seam this
ticket has: the reading half of the fix lives in frontend/src/api/client.js and
the frontend has no test runner at all. What is proved here is that the server
now says something, in the field the client reads, and that the assertion which
says so would notice if it stopped.

    python mutation/95-route-not-found.py save
    python mutation/95-route-not-found.py <mutant>
    python mutation/95-route-not-found.py restore

Killing them:

    cd backend && node --test test/smoke.test.js test/authorise.test.js
"""

from harness import main

FILES = {
    "app": "backend/app.js",
    "refusals": "backend/auth/refusals.js",
}

MUTANTS = {
    # The defect itself, put back: the 404 answers under the name nothing
    # reads. Kills the last subtest of smoke.test.js and the unknown-path
    # subtest of authorise.test.js, at the line comparing body.message with
    # the table - which is the line both rows rest on.
    "olderrorfield": ("app",
                      "response.status(404).json({ message: REFUSALS.routeNotFound });",
                      "response.status(404).json({ error: 'Not found' });"),
    # The table loses the entry. Without it app.js sends { message: undefined },
    # which JSON drops, so the body has no message and REFUSALS.routeNotFound is
    # undefined too - and undefined === undefined passes. This mutant survived
    # the first version of both assertions, which is why each of them reads the
    # key's type before comparing anything. It is those two lines that kill it.
    "nokey": ("refusals",
              "  routeNotFound: 'ไม่พบเส้นทางที่เรียกบนเซิร์ฟเวอร์นี้ เซิร์ฟเวอร์อาจยังไม่ได้อัปเดต',",
              "  routeNotFound: undefined,"),
}

main(FILES, MUTANTS)
