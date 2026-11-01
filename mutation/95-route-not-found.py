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

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือร้อยแก้วข้างมัตแตนต์ทั้งสองในไฟล์นี้ กับคำสั่งฆ่าที่ท้าย docstring (`node --test test/smoke.test.js test/authorise.test.js`) ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `olderrorfield` | 404 ตอบใต้ชื่อช่องที่ไม่มีใครอ่าน (`error: 'Not found'` แทน `message: REFUSALS.routeNotFound`) คือตัวความผิดเอง | **สอง subtest** — ข้อสุดท้ายของ `smoke.test.js` กับข้อ unknown-path ของ `authorise.test.js` ที่บรรทัดเทียบ `body.message` กับตาราง ซึ่งเป็นบรรทัดที่ทั้งสองแถวยืนอยู่บน |
| `nokey` | ตารางเสียรายการไป (`routeNotFound: undefined`) — `app.js` จึงส่ง `{ message: undefined }` ซึ่ง JSON ทิ้ง body จึงไม่มี `message` เลย และ `REFUSALS.routeNotFound` ก็เป็น `undefined` ด้วย `undefined === undefined` จึงผ่าน | **สอง subtest เดียวกัน แต่ที่บรรทัดอื่น** — ตัวนี้**รอด**ฉบับแรกของทั้งสอง assertion ซึ่งเป็นเหตุที่แต่ละข้ออ่าน*ชนิด*ของกุญแจก่อนเทียบอะไร สองบรรทัดนั้นคือสิ่งที่ฆ่ามัน (#96 — หนึ่งมัตแตนต์ต่อหนึ่งข้อต่อ) |
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
