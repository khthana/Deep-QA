# -*- coding: utf-8 -*-
"""
#50 หน้าจอลงชื่อเข้าใช้ - the screens #8's criteria were about, and nobody held.

Eleven mutants over four files. That is what the ticket is: the sign-in screens
were built inside #10 as a side effect, so what they are made of was never
gathered anywhere - a page, a form, the router that declares them and the one
backend route whose answer is rendered rather than read.

It was twelve over five until #66, one day later, deleted the two-application
chooser. `chooserforgetswhoisthere` went with it, having nothing left to be
about; `chooserisnotbehindthesession` became `shellisnotbehindthesession`,
which is the same claim carried by a route that still exists.

Two of them are the defects this ticket actually found, put back:
`googlerefusalmissesone` is the missing validity-window sentence - it was
the missing `outsideValidity` until #89 split that reason into the end that
is waited for and the end that is asked about, and it now deletes
`validityEnded`, which is the key this ticket was written about under the
name it carries today - and
`googleunavailableisjson` is the 503 with a body that left a browser parked on
the API's own origin reading `{"message":...}`.

**One claim here is deliberately not a browser mutant.** Row 1 loops the keys in
`GOOGLE_REFUSAL_REASONS`, so *deleting* a key from that list does not fail it -
the loop simply gets shorter, and the screen is never asked about the reason it
no longer knows. That is not a hole; it is the other end of the same contract,
and it is caught at the other seam: `backend/test/auth.test.js` reads the
`refuse()` calls out of `admit`'s own source and asserts the list against them.
A list that falls behind the rules fails there. A screen that falls behind the
list fails here. Neither seam can be moved to cover the other's half, which is
worth saying plainly rather than pretending twelve mutants cover everything.

    python mutation/50-sign-in-screens.py save
    python mutation/50-sign-in-screens.py <mutant>
    python mutation/50-sign-in-screens.py restore

Killing them:

    cd e2e && npx playwright test 50a-sign-in

Row numbers in the comments below are `50a`'s tests in the order they are
written, not the numbering of the acceptance sheet - the sheet has three rows
that no mutant backs, because they are about whether a thing can be read.

**They move
when a test is inserted rather than appended**, and #97 inserted two after row
5, which shifted four of these by two. If a number here does not match the
spec, count the tests rather than trusting the comment - and renumber both this
file and the sheet when you add one in the middle.

`labelnamesnothing` is the loud one: it takes every other spec in the suite down
with it, because `support/auth.js` signs in by label and every spec signs in.
That is not noise to be tidied - it is the size of what two missing `id`
attributes were costing, stated as a number.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `googlerefusalmissesone` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** ลบ `validityEnded` ออกจากตารางคำ — ข้อบกพร่องที่ตั๋วนี้เจอ ใส่กลับ (เดิมยึดกับ `outsideValidity` เล็งใหม่เมื่อ #89 แยกกุญแจ) | **ฆ่าแถว** 1 · ที่มา `docs/acceptance/50-sign-in-screens.md:247` `docs/acceptance/50-sign-in-screens.md:41` `docs/acceptance/50-sign-in-screens.md:179` |
| `refusalalwaysfallback` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** ทุกเหตุผลได้ประโยคสำรอง หน้าจอยัง*พูดอะไรบางอย่าง* | **ฆ่าแถว** 1, 4 · ที่มา `docs/acceptance/50-sign-in-screens.md:248` `docs/acceptance/50-sign-in-screens.md:41` |
| `refusalneverdrawn` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** ไม่อ่านเหตุผลในที่อยู่เลย คนถูกส่งกลับมาที่หน้าที่ดูเหมือนไม่มีอะไรเกิดขึ้น | **ฆ่าแถว** 1, 2, 4 · ที่มา `docs/acceptance/50-sign-in-screens.md:249` `docs/acceptance/50-sign-in-screens.md:43` |
| `refusalalwayssomething` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** วาดคำปฏิเสธขึ้นทุกครั้งที่มาถึง รวมทั้งครั้งที่ไม่มีใครถูกปฏิเสธ | **ฆ่าแถว** 3 · ที่มา `docs/acceptance/50-sign-in-screens.md:250` `docs/acceptance/50-sign-in-screens.md:44` |
| `googleunavailableisjson` | **ไฟล์** `routes/auth.js` · **ทำให้อะไรพัง** คืน `503` พร้อม body — เบราว์เซอร์ไปจอดบนหน้า JSON ที่ origin ของ API | **ฆ่าแถว** 4 · ที่มา `docs/acceptance/50-sign-in-screens.md:251` `docs/acceptance/50-sign-in-screens.md:46` |
| `wrongpasswordinventsasentence` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** หน้าจอแต่งประโยคเอง แทนที่จะแสดงคำของ server | **ฆ่าแถว** 5 · ที่มา `docs/acceptance/50-sign-in-screens.md:252` `docs/acceptance/50-sign-in-screens.md:47` |
| `emptyformgoesthroughanyway` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** ส่งฟอร์มเปล่าไปที่ server — ยังได้แถบแดง แต่เป็นคนละคำถาม | **ฆ่าแถว** 11 · ที่มา `docs/acceptance/50-sign-in-screens.md:253` `docs/acceptance/50-sign-in-screens.md:56` |
| `emptyformsaysnothing` | **ไฟล์** `Login.js` · **ทำให้อะไรพัง** ปฏิเสธฟอร์มเปล่าโดยไม่บอกอะไร ปุ่มกดแล้วเงียบ | **ฆ่าแถว** 11 · ที่มา `docs/acceptance/50-sign-in-screens.md:254` `docs/acceptance/50-sign-in-screens.md:56` |
| `labelnamesnothing` | **ไฟล์** `LoginForm.js` · **ทำให้อะไรพัง** ป้ายรหัสผ่านชี้ไปที่ `website-admin` อีกครั้ง | **ฆ่าแถว** 5, 12, 14 · ที่มา `docs/acceptance/50-sign-in-screens.md:255` `docs/acceptance/50-sign-in-screens.md:58` |
| `usernotfoundcomesback` | **ไฟล์** `AppRoutes.js` · **ทำให้อะไรพัง** ประกาศ `/user-not-found` ขึ้นมาใหม่ | **ฆ่าแถว** 13 · ที่มา `docs/acceptance/50-sign-in-screens.md:256` `docs/acceptance/50-sign-in-screens.md:59` |
| `shellisnotbehindthesession` | **ไฟล์** `AppRoutes.js` · **ทำให้อะไรพัง** เปลือกหน้าจออยู่นอก `ProtectedRoute` คนแปลกหน้าที่พิมพ์ที่อยู่ได้กรอบของหน้าจอ แทนที่จะได้หน้าลงชื่อเข้าใช้ | **ฆ่าแถว** 14 · ที่มา `docs/acceptance/50-sign-in-screens.md:257` `docs/acceptance/50-sign-in-screens.md:60` |
"""

from harness import main

FILES = {
    "screen": "frontend/src/pages/Login.js",
    "form": "frontend/src/components/LoginForm.js",
    "routes": "frontend/src/routes/AppRoutes.js",
    "route": "backend/routes/auth.js",
}

MUTANTS = {
    # The defect this ticket found, put back. Seven keys where the rules
    # produce eight, and the one missing is the one only an external assessor
    # whose window has closed can meet - so the person least able to guess why
    # is the one told *เข้าสู่ระบบด้วย Google ไม่สำเร็จ*. Kills row 1.
    #
    # It was six of seven, anchored to `outsideValidity`, until #89 split that
    # reason in two and `mutation/anchors.py` answered `0 matches` the same
    # hour. `validityEnded` is that key under the name it carries now, so the
    # claim is unchanged: a re-aim, not a re-purpose (#121). The other half of
    # the split is `89:screenmissesthenewend`, which deletes
    # `validityNotStarted` - two keys, two sheets, and neither mutant can
    # stand in for the other.
    "googlerefusalmissesone": (
        "screen",
        "  validityEnded:\n"
        "    'บัญชีนี้พ้นช่วงเวลาที่กำหนดให้ใช้งานแล้ว กรุณาติดต่อเจ้าหน้าที่เพื่อขอต่ออายุ',\n",
        "",
    ),
    # Every reason gets the fallback. The screen still says *something*, which
    # is why row 1 asserts the sentence rather than the presence of a banner,
    # and why it also asserts the fallback is absent. Kills row 1.
    "refusalalwaysfallback": (
        "screen",
        "      GOOGLE_REFUSALS[reason] ?? 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'",
        "      'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'",
    ),
    # The reason in the address is never read. The person is returned to a
    # sign-in page that looks as though nothing happened - which is the failure
    # the `useEffect` above it was written to stop. Kills rows 1 and 2.
    "refusalneverdrawn": (
        "screen",
        "    const reason = searchParams.get('error')\n    if (!reason) return",
        "    const reason = searchParams.get('error')\n    if (reason || !reason) return",
    ),
    # A refusal on a screen nobody was refused on. The opposite mistake and the
    # cheaper one to make, since a banner that is always there passes any row
    # that only ever asks whether a banner appears. Kills row 3.
    "refusalalwayssomething": (
        "screen",
        "    if (!reason) return\n    setErrorMessage(",
        "    if (!reason) {\n      setErrorMessage('เข้าสู่ระบบด้วย Google ไม่สำเร็จ')\n      return\n    }\n    setErrorMessage(",
    ),
    # The 503 with a body, back. Correct HTTP, and unreadable: the caller is a
    # browser doing a top-level navigation, so the status is seen by nobody and
    # the body is a document on the API's origin with no way back. Kills row 4.
    "googleunavailableisjson": (
        "route",
        "  router.get('/auth/google-login', (req, res, next) => {\n"
        "    if (!googleConfigured()) return refuseToBrowser(res, 'googleUnavailable');",
        "  router.get('/auth/google-login', (req, res, next) => {\n"
        "    if (!googleConfigured())\n"
        "      return res\n"
        "        .status(503)\n"
        "        .json({ message: 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google บนเซิร์ฟเวอร์นี้' });",
    ),
    # The screen invents its own sentence instead of showing the server's. It
    # reads plausibly, and it is the inherited page's defect exactly: a
    # suspended account told its password was wrong. Kills row 5.
    "wrongpasswordinventsasentence": (
        "screen",
        "      setErrorMessage(error.message)",
        "      setErrorMessage('เข้าสู่ระบบไม่สำเร็จ')",
    ),
    # The empty form is sent. The server answers it - correctly, with the same
    # refusal a wrong password gets - so the screen still shows a red banner and
    # a row asserting only the banner would pass. What is lost is that nobody
    # should be told their credentials are wrong for not having typed any.
    # Kills row 11 at the assertion that nothing was sent.
    "emptyformgoesthroughanyway": (
        "screen",
        "    if (username === '' || password === '') {\n      setErrorMessage('กรุณากรอกอีเมล และ รหัสผ่าน')\n      return\n    }",
        "",
    ),
    # The form is refused and the person is not told why - the button does
    # nothing, twice, and there is nothing on the screen to read. Kills row 11.
    "emptyformsaysnothing": (
        "screen",
        "      setErrorMessage('กรุณากรอกอีเมล และ รหัสผ่าน')\n      return",
        "      return",
    ),
    # The password label points at `website-admin` again - the id from the
    # Flowbite snippet this markup was lifted from, which is not on the page.
    # Nothing moves, nothing is restyled, and the label stops naming anything.
    # Kills row 12, and every spec in the suite with it.
    "labelnamesnothing": (
        "form",
        '        <label htmlFor="password" className="text-l mb-2 block text-gray-500">',
        '        <label htmlFor="website-admin" className="text-l mb-2 block text-gray-500">',
    ),
    # `/user-not-found` is declared again. Not the deleted page - nothing can
    # restore a file by substitution - but something, which is the whole claim
    # row 13 makes: that address is a 404 like any other address nobody
    # declared, not a route quietly kept alive. Kills row 13.
    "usernotfoundcomesback": (
        "routes",
        '      <Route path="/page-not-found" element={<NotFoundPage />} />',
        '      <Route path="/user-not-found" element={<Login />} />\n'
        '      <Route path="/page-not-found" element={<NotFoundPage />} />',
    ),
    # The shell is declared outside the session guard, so a stranger typing a
    # screen's address gets the screen's frame rather than the sign-in page.
    # Nothing behind it answers - every request is still refused server-side,
    # which is #10's eighth criterion and is asserted elsewhere - so what this
    # breaks is only the *answer given to the person*: an application that
    # looks entered, instead of a page they can do something about.
    #
    # It replaced `chooserisnotbehindthesession` when #66 deleted the chooser.
    # The claim is the same claim; the route carrying it is one that still
    # exists. Kills row 14.
    "shellisnotbehindthesession": (
        "routes",
        "        path=\"/main/*\"\n        element={\n          <ProtectedRoute>\n            <MainPage />\n          </ProtectedRoute>\n        }",
        "        path=\"/main/*\"\n        element={<MainPage />}",
    ),
}

main(FILES, MUTANTS)
