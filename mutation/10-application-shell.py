# -*- coding: utf-8 -*-
"""
#10 เปลือกหน้าจอ - the shell, the acting grant and the session that ends.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/10-application-shell.md
for which assertion, and for what each mutant is about.

#51 (23 September 2569) made `requireSession` a factory that takes the pool, so `guardedlogout`,
whose replacement mounts that middleware, was rewritten to mount
`require('../auth/session').requireSession(pool)` and swept again on `10a`. It still kills *the box
gets the person back in*, and kills it **at the assertion rather than at the timeout** - which is
the thing to check, because a mutant that mounted the bare factory would hang and die at the
timeout, and that reads like a kill to anyone counting. `anchors.py` cannot see this one: the text
it anchors on is unchanged, only its meaning is.

    python mutation/10-application-shell.py save
    python mutation/10-application-shell.py <mutant>
    python mutation/10-application-shell.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `senior` | **แก้อะไร** `actingFrom` ตกกลับไปที่ `roles[roles.length - 1]` แทน `roles[0]` | **assertion ที่ล้ม** row 3 ที่ `10a-shell.spec.js:toContainText(PROGRAM_MANAGER_0501)` — ปุ่มอ่านว่า *อาจารย์ผู้สอน* · ที่มา `docs/acceptance/10-application-shell.md:224` |
| `echoacting` | **แก้อะไร** `PUT /me/acting-role` ตอบ `req.auth` เดิมแทน `acting: held` | **assertion ที่ล้ม** row 3 ที่ `10a-shell.spec.js:(await answer.json()).acting` — `acting` ที่ตอบกลับไม่ใช่ TEACHER · ที่มา `docs/acceptance/10-application-shell.md:225` |
| `nowrite` | **แก้อะไร** `PUT /api/me/password` ตอบ 200 แต่ไม่เขียนลง `users.password` | **assertion ที่ล้ม** row 7 — ออกจากระบบแล้วเข้าด้วยรหัสใหม่ไม่ได้ **ตัวนี้อยู่ในไฟล์กลายพันธุ์มาตลอด แต่ไม่เคยอยู่ในตารางนี้** และแถวที่ 7 ก็ติด ⚙ โดยไม่ได้ชี้ไปที่มัตแตนต์ตัวใด ซึ่งเป็นรูปแบบที่ `CLAUDE.md` บอกให้ไล่ตรวจตั้งแต่ #44 — เจอตอน #97 แก้ตารางนี้ด้วยเรื่องอื่น · ที่มา `docs/acceptance/10-application-shell.md:230` `docs/acceptance/10-application-shell.md:63` |
| `ejectonrefusal` | **แก้อะไร** `Navbar.js` ปิดกล่องกับข้อผิดพลาดทุกชนิด ไม่ใช่เฉพาะ `err.expired` | **assertion ที่ล้ม** row 7 ที่ `10a-shell.spec.js:REFUSALS.wrongPassword` — ข้อความหายไปพร้อมกล่อง และเป็นแถวเดียวที่ล้ม · จุดตายของแถวนี้เคยเขียนไว้เป็นเลข 294 แล้วเลื่อนเป็น 342 เพราะแถวหน้าต่างที่สองแทรกอยู่เหนือมัน แล้วเลื่อนต่อไปเป็น 364 โดยไม่มีใครทัน — เป็นแถวที่บอกเรื่องของ [#173](https://github.com/khthana/Deep-QA/issues/173) ได้สั้นที่สุด · ที่มา `docs/acceptance/10-application-shell.md:237` |
| `maintainer` | **แก้อะไร** เติม `'TEACHER'` ลงใน `MAINTAINERS` ของ `programSubjects.js` | **assertion ที่ล้ม** row 4 ที่ `10a-shell.spec.js:expect(asTeacher.status()).toBe(403)` — ได้ 200 ที่ควรได้ 403 (เขียนใหม่ที่ #79 รันซ้ำแล้ว) · ที่มา `docs/acceptance/10-application-shell.md:227` |
| `silent401` | **แก้อะไร** `client.js` ไม่ประกาศ 401 ให้ใครรู้อีกต่อไป (ผูกจุดยึดใหม่ที่ #97 บรรทัดนั้นเลิกมีธง `anonymous` และเริ่มส่ง `reason` ไปด้วย) | **assertion ที่ล้ม** row 6 — ไม่มีกล่อง *Session หมดอายุ* **ตั้งแต่ #97 มันล้มห้าแถว** ทั้งหมดคือแถวข้อ 6 ที่พูดถึงกล่อง: กล่องขึ้นตอน session จบ · โหลดหน้าใหม่ในช่วงที่ cookie ยังอยู่ · ปุ่มในกล่องพากลับเข้าใช้งาน · โหลดใหม่ครั้งที่สอง · หน้าต่างที่สองที่ไม่ได้ยินข่าว **ก่อนหน้านั้นมันล้มสองแถว** เพราะ `AuthContext.load()` ยกกล่องขึ้นเองอีกทางหนึ่ง แถวโหลดหน้าใหม่จึงผ่านทั้งที่ listener ถูกปิดไปแล้ว — ตัวเลข 2 → 5 นี้คือราคาของความเห็นที่ซ้ำ วัดได้ตรง ๆ · ที่มา `docs/acceptance/10-application-shell.md:228` `docs/acceptance/10-application-shell.md:57` |
| `lump403` | **แก้อะไร** `client.js` ประกาศ 403 ด้วย (ข้อผิดพลาดของรุ่นที่สืบทอดมา · ผูกจุดยึดใหม่ที่ #97) | **assertion ที่ล้ม** **ฆ่าสามแถว** — แถวหน้าต่างที่สองที่ `10a-shell.spec.js:the second window, before the session ends` ซึ่งเป็น assertion ตั้งต้นว่าหน้าต่างที่สอง*เปิดขึ้นมาโดยยังไม่มีกล่อง* มันล้มเพราะ `teacher.one@` เปิดหน้า Program Subjects แล้วมีคำขอที่ตอบ 403 อยู่ · `10a-shell.spec.js:row 6: a 403 is not an expiry` ที่ `toHaveCount(0)` ของมัน — กล่องขึ้นทั้งที่ไม่ควรขึ้น · และ `10a-shell.spec.js:row 7: the wrong current password` ที่ `toHaveCount(0)` ของมัน ด้วยเหตุเดียวกัน ตารางฉบับก่อนระบุเหยื่อไม่ครบสองครั้งแล้ว ครั้งนี้จึงไล่ครบทั้งสาม · ที่มา `docs/acceptance/10-application-shell.md:229` `docs/acceptance/50-sign-in-screens.md:51` `docs/acceptance/50-sign-in-screens.md:182` |
| `stalelabel` | **แก้อะไร** `RoleDropdown` วาดป้ายจาก `roles[0]` แทน `worn` (เล็งใหม่ที่ #231 ซึ่งทำให้ตัวกระตุ้นอ่านสิทธิ์ที่ตัวชี้ชี้อยู่ออกมาจากรายการ) | **assertion ที่ล้ม** row 3 ที่ `10a-shell.spec.js:toHaveText(new RegExp(TEACHER))` — ปุ่มยังอ่านว่าสิทธิ์กรรมการหลังสลับแล้ว (ตั้งแต่ #231 ป้ายนั้นคือ *กรรมการหลักสูตร วิศวกรรมคอมพิวเตอร์ (0501)*) · ที่มา `docs/acceptance/10-application-shell.md:226` |
| `adminteacher` | **แก้อะไร** เติม `'TEACHER'` ลงใน `ADMIN_ROLES` ของ `backend/auth/administration.js` | **assertion ที่ล้ม** row 8 ของ `11a-users-refusals.spec.js:expect(response.status()).toBe(403)` — ได้ 200 ที่ควรได้ 403 · เลขที่แถวนี้เคยอ้าง (บรรทัด 41) เป็นเลขเดียวในตารางนี้ที่ยัง**ตรง** วันที่แปลง ซึ่งเป็นเหตุผลที่เครื่องมือต้องตอบสามอย่าง ไม่ใช่สอง · ที่มา `docs/acceptance/10-application-shell.md:238` |
| `shortcookie` | **แก้อะไร** `COOKIE_LIFETIME_SECONDS` กลับไปเท่ากับ `LIFETIME_SECONDS` | **assertion ที่ล้ม** row 6 ที่ `10a-shell.spec.js:toBeGreaterThan(5 * 60)` — ระยะห่างระหว่างอายุ cookie กับ `exp` เหลือ 0 วินาที · ที่มา `docs/acceptance/10-application-shell.md:232` |
| `guardedlogout` | **แก้อะไร** เอา `requireSession` กลับไปครอบ `POST /auth/logout` อีกครั้ง ซึ่งคือสภาพก่อนแก้ #92 | **assertion ที่ล้ม** row 6 ที่ `10a-shell.spec.js:expect(signedOut.status()).toBe(200)` — `POST /auth/logout` ตอบ 401 ไม่ใช่ 200 และเป็นแถวเดียวที่ล้ม — อีกห้าแถวของ row 6 ผ่านทั้งหมด **จุดตายย้ายที่ตอน #94** ก่อนหน้านั้นมันตายที่ *กล่องยังอยู่หลังกดปุ่ม* ซึ่งตอนนี้ไม่ล้มอีกแล้ว เพราะ `logout` พาไป `/` เสมอ และคำถามตั้งต้นที่หน้านั้นลบ cookie ให้เอง สิ่งที่การถอด guard ยังซื้อมาได้จึงเหลือสองอย่าง — จบในขั้นตอนเดียว และมีบรรทัดในประวัติ — ข้อแรกคือสิ่งที่ browser ยังเห็นได้ ส่วนข้อหลัง `backend/test/auth.test.js` ถืออยู่แล้ว · ที่มา `docs/acceptance/10-application-shell.md:233` |
| `keepdeadcookie` | **แก้อะไร** `requireSession` เก็บ cookie ที่ตายแล้วไว้เหมือนก่อนแก้ #94 | **assertion ที่ล้ม** `10a-shell.spec.js:row 6: a second reload` ที่ `toHaveCount(0)` ของมัน — โหลดใหม่ครั้งที่สองแล้วกล่องยังอยู่ (`Received: 1`) **และแถวหน้าต่างที่สองที่ `10a-shell.spec.js:the second window, after it reloads into no session`**: cookie ที่ไม่ถูกลบทำให้หน้าต่างที่สองได้กล่องแทนหน้าลงชื่อเข้าใช้ รอบแรกที่รันมันตายที่ `sessionCookie` ของ*หน้าต่างแรก* — สำเนาของ assertion ที่แถวก่อนหน้าเป็นเจ้าของอยู่แล้ว จึงถอดบรรทัดนั้นออกจากเทสต์ใหม่ เพื่อให้จุดตายเป็นข้ออ้างของแถวนี้เอง ไม่ใช่ของแถวอื่น · ที่มา `docs/acceptance/10-application-shell.md:234` |
| `clearanywhere` | **แก้อะไร** ข้อยกเว้นของ #94 ขยายไปทุก route ที่ถูกป้องกัน ไม่ใช่เฉพาะ `GET /me` | **assertion ที่ล้ม** `backend/test/shell.test.js` — *is left alone when a screen asks, not the shell* ล้ม ส่วนแถวที่ว่าด้วยการลบยังผ่าน นี่คือแถวที่กันไม่ให้การแก้กลืนเหตุผลที่ `auth/session.js` เขียนไว้แต่แรก · ที่มา `docs/acceptance/10-application-shell.md:235` |
| `wrongas401` | **แก้อะไร** รหัสเดิมผิดตอบ 401 แทน 403 | **assertion ที่ล้ม** row 7 ที่ `10a-shell.spec.js:expect(answer.status()).toBe(403)` · ที่มา `docs/acceptance/10-application-shell.md:236` |
"""

from harness import main

FILES = {
    "authorise": "backend/auth/authorise.js",
    "me": "backend/routes/me.js",
    "progsub": "backend/routes/programSubjects.js",
    "client": "frontend/src/api/client.js",
    "navbar": "frontend/src/components/Navbar.js",
    "dropdown": "frontend/src/components/RoleDropdown.js",
    "admin": "backend/auth/administration.js",
    "authroutes": "backend/routes/auth.js",
    "session": "backend/auth/session.js",
    "authctx": "frontend/src/context/AuthContext.js",
}

MUTANTS = {
    # row 3a: the default grant is the senior one, not merely one of them
    "senior": ("authorise", "  ) ?? roles[0];", "  ) ?? roles[roles.length - 1];"),
    # row 3b: the switch is the server's answer, not the client's request
    "echoacting": ("me",
                   "...shellState(await currentUser(req), { ...req.auth, acting: held }),",
                   "...shellState(await currentUser(req), req.auth),"),
    # row 7a: the change answered 200 but never reached the stored credential
    "nowrite": ("me",
                "      await pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, [",
                "      if (false) await pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, ["),
    # row 7b: any refusal read as an expiry - the inherited modal's own defect
    "ejectonrefusal": ("navbar", "      if (err.expired) {", "      if (true) {"),
    # row 4: TEACHER is not a maintainer of program subjects. The anchor was
    # rewritten at #79, which took `FACULTY_ADMIN` out of that list.
    "maintainer": ("progsub",
                   "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
                   "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'TEACHER'];"),
    # row 6a: a 401 anywhere raises the dialog
    #
    # Re-anchored at #97: the condition lost its `anonymous` flag and the call
    # gained the reason. What the mutant says is unchanged - nothing is
    # announced - and it is still the row's own claim.
    "silent401": ("client",
                  "if (response.status === 401) sessionExpiredListener?.(payload.reason)",
                  "if (false) sessionExpiredListener?.(payload.reason)"),
    # row 6c: a 403 is not a 401 - the inherited client's own defect
    "lump403": ("client",
                "if (response.status === 401) sessionExpiredListener?.(payload.reason)",
                "if (response.status === 401 || response.status === 403) sessionExpiredListener?.(payload.reason)"),
    # row 3b: the trigger reads the grant being worn, not the senior one held.
    # Re-aimed at #231, which made the trigger read the held grant the pointer
    # points at - `worn` - so that the scope's name reaches it. What the mutant
    # says is unchanged (#203): the senior grant held, in place of the worn one.
    "stalelabel": ("dropdown", "{label(worn)}", "{label(roles[0])}"),
    # row 8: a teacher is not an administrator of accounts
    "adminteacher": ("admin",
                     "const ADMIN_ROLES = ['FULL_ADMIN', 'FACULTY_ADMIN', 'DEPT_ADMIN'];",
                     "const ADMIN_ROLES = ['FULL_ADMIN', 'FACULTY_ADMIN', 'DEPT_ADMIN', 'TEACHER'];"),
    # row 6 reload: the cookie dies with the token, so no window exists
    "shortcookie": ("session",
                    "const COOKIE_LIFETIME_SECONDS = LIFETIME_SECONDS * 2;",
                    "const COOKIE_LIFETIME_SECONDS = LIFETIME_SECONDS;"),
    # `silentexpiry` was here, and #97 deleted it rather than re-anchoring it.
    # It removed the raise from `AuthContext.load()`'s catch, and after #97
    # made the one listener decide for every request, it killed **nothing**:
    # the line it broke was a second opinion about the same 401. The line is
    # gone, so the mutant has nothing to be about. What the reload row rests on
    # now is `silent401`, which is the claim stated once.
    #
    # A survivor is not always a hole in the tests. Sometimes it is a claim the
    # code no longer makes.
    # row 6 button: signing out put back behind the session, which is #92
    # itself - the box still draws and its button still exists, and only the
    # press comes back with the cookie untouched
    # Re-written at #51, which made `requireSession` a factory: mounted without
    # its pool it would return a function nobody calls, and the row would die
    # at a timeout rather than at its own assertion (#139, #140).
    "guardedlogout": ("authroutes",
                      "  router.post('/auth/logout', async (req, res, next) => {",
                      "  router.post('/auth/logout', require('../auth/session').requireSession(pool), async (req, res, next) => {"),
    # row 6 second reload: the dead cookie is kept, which is the state before
    # #94 - the box still draws on the first reload and its button still works,
    # and only the person who pressed F5 instead stays trapped
    "keepdeadcookie": ("session",
                       "    if (expired && isBootstrapRead(req)) clearSession(res);",
                       "    if (false && isBootstrapRead(req)) clearSession(res);"),
    # row 6 second reload: the exception widens to every protected route, which
    # is what the comment in that file has always refused - one request that
    # crossed a renewal now signs the browser out
    "clearanywhere": ("session",
                      "    if (expired && isBootstrapRead(req)) clearSession(res);",
                      "    if (expired) clearSession(res);"),
    # row 7b: a wrong current password answered as an expiry
    "wrongas401": ("me",
                   "if (!matches) return res.status(403).json({ message: REFUSALS.wrongPassword });",
                   "if (!matches) return res.status(401).json({ message: REFUSALS.wrongPassword });"),
}

main(FILES, MUTANTS)
