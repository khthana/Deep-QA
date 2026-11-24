# -*- coding: utf-8 -*-
"""#306 — ลบบัญชีที่ไม่มีอะไรอ้างถึง

คำตอบของเจ้าของงานเมื่อ 22 พ.ย. 2569 (`docs/users-screen.md` ข้อ 4 และ §การลบบัญชี) และถ้อยคำเมื่อ 24 พ.ย. 2569 ·
ข้ออ้างของจออยู่ใน `e2e/tests/306a-deleting-an-account.spec.js` · ข้ออ้างของ server อยู่ใน
`backend/test/account-deletion.test.js` (เรียกในตารางว่า `306h` ตามลำดับแถว 1–12) ·
ใบรับงานคือ `docs/acceptance/11-user-accounts.md` §#306

**แถวของ `306h` เป็นแถว HTTP** — มัตแตนต์ของ server กวาดกับมันด้วย `node --test` เพื่อวัดว่าแถวไหนถือข้ออ้างไหน แต่แถว HTTP
ได้ ☑ ไม่ใช่ ⚙ (`CLAUDE.md` §Two test seams) · มัตแตนต์ของ server ทุกตัวกวาดกับ `306a` ด้วย

**รูปลักษณ์ของถังขยะ (ไอคอน สี ตำแหน่ง) ไม่มีมัตแตนต์** — เป็นแถวเดินมือ

## ตารางมัตแตนต์ — คำทำนาย เขียนก่อนรันตัวแรก (#255 · 24 พ.ย. 2569)

มัตแตนต์ของ server กวาดกับ `306h` และ `306a` · มัตแตนต์ของจอกวาดกับ `306a` `84a` `86a` `302a`

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `s306noself` | ไม่ถามว่าเป็นบัญชีของตัวเองไหม | **1** — `306h` แถว 3 ที่ `refused.status` 403: admin01 ถูกถามต่อและได้ 409 เพราะมีบรรทัดที่ทำกับข้อมูลอื่น · `306a` ไม่มี เพราะปุ่มของแถวตัวเองปิด |
| `s306noreach` | ไม่ถาม `reachable` — บัญชีใดก็ได้ที่มีอยู่ | **1** — `306h` แถว 4 ที่ `above.status` 404: ได้ 409 แทน · `306a` ไม่มี เพราะผู้ดูแลระบบกลางเอื้อมถึงทุกบัญชี |
| `s306nocheck` | ไม่ถามว่ามีอะไรอ้างถึง (`if (false)`) | **9** — `306h` แถว 5 ที่ status 409 (ได้ 500 จาก `RESTRICT`) · แถว 6, 7, 8, 9, 10, 11, 12 ที่ status 409 (ได้ 204) · `306a` แถว 3 ที่ `answer.status()` 409 (ได้ 500) |
| `s306nolog` | ไม่ถามประวัติของบัญชี | **3** — `306h` แถว 8, 9, 11 ที่ status 409 · `306a` ไม่มี เพราะ teach01 ถูกปฏิเสธด้วยการสอน |
| `s306denylist` | ถามประวัติด้วยรายการต้องห้ามที่รู้จักวันนี้ แทนรายการที่อนุญาต | **1** — `306h` แถว 9 ที่ status 409 (`SOME_NEW_ACT` ไม่อยู่ในรายการ) |
| `s306nogoogle` | `GOOGLE_LOGIN` ไม่อยู่ในรายการที่อนุญาต — รายการของตั๋ว | **1** — `306h` แถว 1 ที่ `deleted.status` 204 (ได้ 409) |
| `s306handlist` | คอลัมน์ที่ถามเป็นรายการที่เขียนมือสามตาราง แทนการอ่านแค็ตตาล็อก | **1** — `306h` แถว 10 ที่ status 409 (`later_notes` ไม่ถูกถาม) · แถว 5, 6, 7, 12 อยู่ในสามตารางนั้น |
| `s306ownwide` | `user_roles.assigned_by` นับเป็นแถวของบัญชีเอง | **1** — `306h` แถว 7 ที่ status 409 |
| `s306nolock` | ไม่ล็อกแถวของบัญชีก่อนถาม (`FOR UPDATE` ออก) | **1** — `306h` แถว 12 ที่ `answer.status` 409: การถามไม่เห็นการเขียนที่ยังไม่ commit แล้ว `DELETE` รอล็อกของมัน และได้ 204 |
| `s306nologline` | ไม่เขียนบรรทัด `DELETE_USER` | **3** — `306h` แถว 1 ที่ `about` deepEqual · แถว 11 ที่ status 409 · `306a` แถว 5 ที่ `รหัสผู้ใช้งาน` ของบรรทัด 0 — การค้นไม่พบบรรทัดใดเลย จึงตายที่การรอ (#139) ไม่ใช่ที่ค่า |
| `s306trashenabled` | ถังขยะของแถวตัวเองกดได้ | **1** — `306a` แถว 1 ที่ `toBeDisabled` |
| `s306trashdead` | ถังขยะทุกแถวปิด | **5** — `306a` แถว 1 ที่ `other` toBeEnabled (ข้ออ้าง) · แถว 2, 3, 4, 5 ที่การกดถังขยะ (การจัดฉาก ไม่ใช่ข้ออ้าง — #266) |
| `s306selftitle` | สำเนา `CANNOT_DELETE_SELF` เลื่อนออกจาก `REFUSALS.selfDelete` | **1** — `306a` แถว 1 ที่ `title` |
| `s306noquestion` | กดถังขยะแล้วลบเลย ไม่ถาม | **4** — `306a` แถว 2 ที่ heading `ยืนยันการลบผู้ใช้งาน` (ข้ออ้าง) · แถว 3 ที่การกด `ลบผู้ใช้งาน` · แถว 4 ที่การกด `ยกเลิก` · แถว 5 ที่การกด `ลบผู้ใช้งาน` (สามแถวหลังเป็นการจัดฉาก) |
| `s306cancelsends` | `ยกเลิก` ลบ | **2** — `306a` แถว 4 ที่ `userRow` toHaveCount(1) (ข้ออ้าง) · แถว 5 ที่การกดถังขยะ เพราะบัญชีถูกลบไปแล้วในแถว 4 (การจัดฉาก) |
| `s306silent` | ประโยคเมื่อลบสำเร็จเป็นประโยคของการบันทึก | **1** — `306a` แถว 2 ที่ `ลบบัญชีเรียบร้อยแล้ว` toBeVisible |
| `s306norefusal` | คำปฏิเสธไม่ถูกพูด | **1** — `306a` แถว 3 ที่ `REFUSALS.userInUse` toBeVisible |
| `s306asks` | คำถามไม่มีประโยคที่สอง | **1** — `306a` แถว 2 ที่ `saidBy` toBe |
| `s306noreload` | หลังลบไม่อ่านรายการใหม่ | **1** — `306a` แถว 2 ที่ `ลบบัญชีเรียบร้อยแล้ว` toBeVisible: ประโยคถูกฝากไว้กับการอ่านที่ไม่มาถึง · ข้ออ้างว่าแถวหายไปจากรายการอยู่ใต้มันจึงไม่ถูกอ่าน (#88) |
| `s306nolabel` | ประวัติไม่มีคำของ `DELETE_USER` — ป้ายเป็นรหัสดิบ | **1** — `306a` แถว 5 ที่ `กิจกรรม` toHaveText |

**มัตแตนต์สองตัวของ #84 ที่ตั๋วนี้เล็งใหม่** (`mutation/84-own-row-controls.py` · ถังขยะเขียน `disabled={isSelf(user)}` เช่นกัน
ซึ่งมีจุดยึดเดิมเป็นสตริงย่อย จึงยึดคู่กับ `onClick` ของสวิตช์) — กวาดกับสี่แฟ้มเดียวกัน คำทำนายคือผลของการกวาดของ #302
ไม่เปลี่ยน เพราะบรรทัดที่แก้คือบรรทัดเดิม: `alwaysenabled` **1** — `84a` แถว 1 · `everyrowisdead` **8** — `84a` แถว 1 ที่
`toBeEnabled` · `302a` แถว 4 ที่ `toBeEnabled` · อีกหกแถวที่การกดสวิตช์ของ `86a` และ `302a` (การจัดฉาก) · `306a` ไม่มี
เพราะไม่กดสวิตช์

**ที่ไม่มีมัตแตนต์** — การส่งต่อไปหน้าก่อนเมื่อแถวที่ลบเป็นแถวสุดท้ายของหน้าสุดท้าย เป็น `load` ร่วมกับสวิตช์ (#239) และ `306a`
ไม่มีแถวที่สร้างสถานการณ์นั้น · การ์ด `drawing(() => onScreen.current === drawing)` ของ `confirmRemoval` เป็นบรรทัดเดียวกับของ
`save` และ `confirmSwitch` ซึ่ง `guards-with-no-mutant.js` ตอบรายบรรทัด ไม่ใช่รายจุด (#269)
"""
from harness import main

FILES = {
    "routes": "backend/routes/users.js",
    "users": "frontend/src/pages/Users.js",
    "history": "frontend/src/components/users/historyEntry.js",
}

MUTANTS = {
    "s306noself": ("routes",
        "  router.delete('/users/:userId', requireRole(...ADMIN_ROLES), async (req, res, next) => {\n"
        "    if (req.params.userId === req.auth.userId) {\n",
        "  router.delete('/users/:userId', requireRole(...ADMIN_ROLES), async (req, res, next) => {\n"
        "    if (false) {\n"),
    "s306noreach": ("routes",
        "      const existing = await reachable(req, req.params.userId);\n"
        "      if (!existing) return res.status(404).json({ message: REFUSALS.userNotFound });\n"
        "\n"
        "      await client.query('BEGIN');\n",
        "      const existing = { user_id: req.params.userId };\n"
        "      if (!existing) return res.status(404).json({ message: REFUSALS.userNotFound });\n"
        "\n"
        "      await client.query('BEGIN');\n"),
    "s306nocheck": ("routes",
        "      if (await referenceOf(client, existing.user_id)) {\n",
        "      if (false && referenceOf) {\n"),
    "s306nolog": ("routes",
        "  exists.push(\n"
        "    `EXISTS (SELECT 1 FROM user_log WHERE user_id = $1 AND activity <> ALL($2::text[]))`,\n"
        "  );\n",
        "  exists.push('$2::text[] IS NULL');\n"),
    "s306denylist": ("routes",
        "AND activity <> ALL($2::text[]))`,\n",
        "AND activity IN ('DELETE_SUBJECT', 'DELETE_USER', 'GRANT_ROLE', 'REVOKE_ROLE') AND $2::text[] IS NOT NULL)`,\n"),
    "s306nogoogle": ("routes",
        "const SELF_ACTIVITIES = ['LOGIN', 'GOOGLE_LOGIN', 'LOGOUT', 'SWITCH_ROLE', 'CHANGE_PASSWORD'];\n",
        "const SELF_ACTIVITIES = ['LOGIN', 'LOGOUT', 'SWITCH_ROLE', 'CHANGE_PASSWORD'];\n"),
    "s306handlist": ("routes",
        "      WHERE con.contype = 'f' AND con.confrelid = to_regclass('users')\n",
        "      WHERE con.contype = 'f' AND con.confrelid = to_regclass('users')\n"
        "        AND t.relname IN ('course_sections_teacher', 'subjects', 'user_roles')\n"),
    "s306ownwide": ("routes",
        "const OWN_ROWS = new Set(['user_roles.user_id', 'user_image.user_id', 'user_log.user_id']);\n",
        "const OWN_ROWS = new Set(['user_roles.user_id', 'user_roles.assigned_by', 'user_image.user_id', 'user_log.user_id']);\n"),
    "s306nolock": ("routes",
        "        'SELECT user_id FROM users WHERE user_id = $1 FOR UPDATE',\n",
        "        'SELECT user_id FROM users WHERE user_id = $1',\n"),
    "s306nologline": ("routes",
        "      await recordActivity(client, req.auth.userId, 'DELETE_USER', onUser(existing.user_id));\n",
        ""),
    "s306trashenabled": ("users",
        "                            onClick={() => startRemoval(user)}\n"
        "                            disabled={isSelf(user)}\n",
        "                            onClick={() => startRemoval(user)}\n"
        "                            disabled={false}\n"),
    "s306trashdead": ("users",
        "                            onClick={() => startRemoval(user)}\n"
        "                            disabled={isSelf(user)}\n",
        "                            onClick={() => startRemoval(user)}\n"
        "                            disabled={true}\n"),
    "s306selftitle": ("users",
        "const CANNOT_DELETE_SELF = 'ลบบัญชีของตัวเองไม่ได้'\n",
        "const CANNOT_DELETE_SELF = 'ไม่สามารถลบบัญชีนี้ได้'\n"),
    "s306noquestion": ("users",
        "    setNotice(null)\n"
        "    setRemoving(user)\n",
        "    setNotice(null)\n"
        "    deleteUser(user.user_id)\n"),
    "s306cancelsends": ("users",
        "          setNotice(null)\n"
        "          setRemoving(null)\n",
        "          setNotice(null)\n"
        "          confirmRemoval()\n"),
    "s306silent": ("users",
        "      const said = { error: false, message: 'ลบบัญชีเรียบร้อยแล้ว' }\n",
        "      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }\n"),
    "s306norefusal": ("users",
        "      setRemoving(null)\n"
        "      report(error)\n",
        "      setRemoving(null)\n"),
    "s306asks": ("users",
        " ใช่หรือไม่ หากบัญชีนี้มีข้อมูลอ้างอิงอยู่ ระบบจะไม่ลบ ให้ระงับการใช้งานแทน`\n",
        " ใช่หรือไม่`\n"),
    "s306noreload": ("users",
        "      const said = { error: false, message: 'ลบบัญชีเรียบร้อยแล้ว' }\n"
        "      if (showing.current === sent) waiting.current = { of: readOf(page, filters), said }\n"
        "      const drawing = onScreen.current\n"
        "      await drawing(() => onScreen.current === drawing)\n",
        "      const said = { error: false, message: 'ลบบัญชีเรียบร้อยแล้ว' }\n"
        "      if (showing.current === sent) waiting.current = { of: readOf(page, filters), said }\n"),
    "s306nolabel": ("history",
        "  DELETE_USER: 'ลบบัญชีผู้ใช้',\n",
        ""),
}

main(FILES, MUTANTS)
