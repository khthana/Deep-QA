# -*- coding: utf-8 -*-
"""
#13 ประวัติการใช้งาน - the activity history, its panel and its page.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/13-user-activity-history.md
for which assertion, and for what each mutant is about.

    python mutation/13-user-activity-history.py save
    python mutation/13-user-activity-history.py <mutant>
    python mutation/13-user-activity-history.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `N1` | **ทำอะไร** `ORDER BY time_stamp DESC, id DESC` เป็น `ASC, ASC` ใหม่สุดไปอยู่ล่าง บรรทัดบนสุดจึงไม่ใช่สิ่งที่เพิ่งเกิด | **ฆ่าที่** ข้ออ้าง *บรรทัดบนสุดคือสิ่งที่เพิ่งเกิด* ของเกณฑ์ข้อ 1 ใน `13a-user-history.spec.js` · ใบรับงานจดว่า **แปดตัวกลายพันธุ์ แปดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 64) ไม่ได้จดจำนวนแถวต่อตัว แถวนี้จึงไม่มีจำนวนให้บอก · ที่มา `docs/acceptance/13-user-activity-history.md:37` กับ `docs/acceptance/13-user-activity-history.md:64` |
| `N2` | **ทำอะไร** บันทึกการเปลี่ยนสถานะไว้กับ**ผู้ถูกกระทำ** แทนผู้ลงมือ (`existing.user_id` แทน `req.auth.userId`) | **ฆ่าที่** ข้ออ้าง *บรรทัดอยู่กับผู้ลงมือ ไม่ใช่ผู้ถูกกระทำ* — แถว 3 ของสเปค ซึ่งทำให้ `teach01` มีบรรทัดของตัวเองก่อน เพราะประวัติว่างเปล่าก็ทำให้ข้ออ้างจริงได้โดยไม่ต้องมีกฎใดทำงาน · ใบรับงานจดว่า **แปดตัวกลายพันธุ์ แปดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 64) ไม่ได้จดจำนวนแถวต่อตัว แถวนี้จึงไม่มีจำนวนให้บอก · ที่มา `docs/acceptance/13-user-activity-history.md:39` กับ `docs/acceptance/13-user-activity-history.md:64` |
| `N3` | **ทำอะไร** พิมพ์ id ของระเบียนลำพัง ไม่บอกว่าเป็นระเบียนชนิดไหน (ตัด `TARGETS[entry.target_kind]` ออกจากคอลัมน์) | **ฆ่าที่** ข้ออ้าง ว่าคอลัมน์ *ทำกับข้อมูล* อ่านว่า *บัญชีผู้ใช้ teach01* — แถว 1, 2 และ 4 ของสเปค · ใบรับงานจดว่า **แปดตัวกลายพันธุ์ แปดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 64) ไม่ได้จดจำนวนแถวต่อตัว แถวนี้จึงไม่มีจำนวนให้บอก · ที่มา `docs/acceptance/13-user-activity-history.md:38` กับ `docs/acceptance/13-user-activity-history.md:64` |
| `N4` | **ทำอะไร** กิจกรรมที่ไม่มีเป้าหมายถูกเติมด้วยอะไรบางอย่าง (`entry.user_id`) แทนที่จะเว้นว่าง — placeholder `—` ถูกแทนด้วยค่าที่จริงเสมอ | **ฆ่าที่** `e2e/tests/13a-user-history.spec.js` **บรรทัด 100** ซึ่งเป็นข้ออ้างของเกณฑ์ข้อ 1 *กิจกรรมที่ไม่มีเป้าหมายเว้นว่าง* · เขียนสมอใหม่เมื่อ 20 ส.ค. 2569 ให้ผูกกับทั้ง expression เพราะข้อความสองช่องว่างเดิมตรงกับคอลัมน์เวลาด้วย และ harness ปฏิเสธมัตแตนต์ที่กำกวม รันซ้ำแล้วยังตายที่บรรทัดเดิม · ที่มา `docs/acceptance/13-user-activity-history.md:70` กับ `docs/acceptance/13-user-activity-history.md:40` |
| `N5` | **ทำอะไร** ถอด `timeZone: 'Asia/Bangkok'` ออก ปล่อยให้นาฬิกาของเบราว์เซอร์ตัดสินชั่วโมง | **ฆ่าที่** สองข้ออ้างของเกณฑ์ข้อ 2 — *เวลาเป็นเขตเวลากรุงเทพฯ* กับ *เวลาไม่ขึ้นกับนาฬิกาของเครื่อง* ซึ่งเป็นแถว 8 และ 9 ของสเปค ที่เปิด context ด้วย `timezoneId: 'UTC'` · ใบรับงานจดว่า **แปดตัวกลายพันธุ์ แปดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 64) ไม่ได้จดจำนวนแถวต่อตัว แถวนี้จึงไม่มีจำนวนให้บอก · ที่มา `docs/acceptance/13-user-activity-history.md:44` กับ `docs/acceptance/13-user-activity-history.md:45` |
| `N7` | **ทำอะไร** ไม่บันทึก `LOGOUT` — ตัดการเรียก `recordActivity` ท้าย route ออก | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 5 *เข้า/ออกจากระบบขึ้นในประวัติ* — แถว 7 ของสเปค ซึ่งใช้ context อีกใบเข้าระบบผ่านจอจริงแล้วกดปุ่ม *ออกจากระบบ* จริง · **ตกยุคตั้งแต่ 22 ส.ค. 2569 และไม่มีใครเห็นจนถึง #123 (7 ก.ย.)** แถว ⚙ ของเกณฑ์ข้อ 5 ยืนอยู่บนมัตแตนต์ที่ apply ไม่ได้สิบหกวัน เล็งใหม่อีกครั้งเมื่อ 12 ก.ย. (#131) เมื่อบรรทัดได้ guard และเยื้องเพิ่มหนึ่งชั้น กวาดซ้ำยืนยันว่ายังฆ่า · ใบรับงานจดว่า **แปดตัวกลายพันธุ์ แปดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 64) ไม่ได้จดจำนวนแถวต่อตัว แถวนี้จึงไม่มีจำนวนให้บอก · ที่มา `docs/acceptance/13-user-activity-history.md:76` กับ `mutation/README.md:1230` |
| `N8` | **ทำอะไร** รายชื่อผู้ใช้ไม่ถูกจำกัดขอบเขตที่สิทธิ์ที่กำลังใช้เอื้อมถึง (`${OWN_SCOPE} = ANY($1)` เป็น `TRUE`) | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 4 *ผู้ดูแลเห็นเฉพาะคนในขอบเขตตัวเอง* — แถว 12 ของสเปค ซึ่งพิสูจน์ผ่าน dropdown ของจอ *ประวัติการใช้งาน* และมี control ว่า `dept.admin.05@` ยังเลือก `teacher.one@` ได้จริง · ใบรับงานจดว่า **แปดตัวกลายพันธุ์ แปดตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 64) ไม่ได้จดจำนวนแถวต่อตัว แถวนี้จึงไม่มีจำนวนให้บอก · ที่มา `docs/acceptance/13-user-activity-history.md:48` กับ `docs/acceptance/13-user-activity-history.md:64` |
| `N9` | **ทำอะไร** เลขหน้ากลับไปเป็นของแผงอีกครั้ง ไม่ใช่ของบัญชี — `key` ออกจากจุดเรียกและ effect ที่แก้ตามหลังกลับมา เป็นสอง edit เพราะมันเป็นการตัดสินใจเดียวในสองไฟล์ และย้อนทีละข้างไม่ใช่รูปที่โค้ดเคยเป็น | **ฆ่าที่** **แถวนี้แถวเดียว** — เกณฑ์ข้อ 3 *กรองด้วยการเลือกคน* (แถว 6 ของสเปค) ซึ่ง assert ว่า**ทุก** request ของคนใหม่เป็นหน้าหนึ่ง เพราะสภาพที่จอมาหยุดอย่างเดียวแยกโค้ดเก่ากับโค้ดใหม่ไม่ออก · มันคือสิ่งที่ `N6` พูดถึง ซึ่ง `SUPERSEDED` เก็บไว้เป็นบันทึกแต่ apply ไม่ได้ · ที่มา `docs/acceptance/13-user-activity-history.md:141` กับ `docs/acceptance/13-user-activity-history.md:42` |
"""

from harness import main

FILES = {
    'history': 'backend/routes/history.js',
    'users': 'backend/routes/users.js',
    'auth': 'backend/routes/auth.js',
    'panel': 'frontend/src/components/users/HistoryPanel.js',
    'userhistory': 'frontend/src/pages/UserHistory.js',
}

# Each mutant is a list of edits, because one of them (N9) has to undo a change
# that was made in two files at once - the effect in the panel and the `key` at
# the call site are one decision, and reverting either alone is not the shape
# the code used to have.

# Mutants kept as a record of a claim that was proved once, against code that no
# longer exists. `mutation/anchors.py` reads this set and reports them as
# deliberate rather than as findings - which is the point of writing it down
# here rather than only in a comment: an anchor that has gone stale on purpose
# and one that has gone stale by accident look identical to a checker, and the
# difference is a decision somebody made.
SUPERSEDED = {'N6'}

MUTANTS = {
 # newest-last: the top line is no longer what just happened
 'N1': [('history',
   "ORDER BY time_stamp DESC, id DESC",
   "ORDER BY time_stamp ASC, id ASC")],
 # the line filed under the subject instead of the actor
 'N2': [('users',
   "await recordActivity(pool, req.auth.userId, 'SET_USER_STATUS', onUser(existing.user_id));",
   "await recordActivity(pool, existing.user_id, 'SET_USER_STATUS', onUser(existing.user_id));")],
 # the record named by its id alone, without saying what kind of record it is
 'N3': [('panel',
   "entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : '—'",
   "entry.target_id ? `${entry.target_id}` : '—'")],
 # an activity with no target filled in with something rather than left blank
 # the em-dash placeholder replaced by something always truthy, so a row with
 # no target reads as though it had one. Anchored on the whole expression as
 # of 2026-08-20: the two-space form it was recorded against matches the time
 # column as well, and the harness refuses an ambiguous mutant.
 'N4': [('panel',
   "entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : '—'",
   "entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : entry.user_id")],
 # the browser's own clock left to decide the hour
 'N5': [('panel',
   "        timeZone: 'Asia/Bangkok',\n",
   "")],
 # the page number left behind when the person underneath changes.
 #
 # Kept as it was written, against the shape the code had then: an effect that
 # reset the page, emptied. It misses on today's tree, which no longer has the
 # effect - N9 is the mutant that covers this row now.
 # SUPERSEDED, kept as a record: the panel used to reset its page number in an
 # effect, and that was replaced by a `key` at the two call sites - which is
 # what N9 is about. This one can no longer be applied.
 'N6': [('panel',
   "  useEffect(() => {\n    setPage(1)\n  }, [user.user_id])",
   "  useEffect(() => {}, [user.user_id])")],
 # signing out not recorded
 #
 # Re-anchored 2026-09-07 (#123). #92 rewrote this route: `requireSession` came
 # off `POST /auth/logout`, so the name is now read out of the cookie by
 # `accountInDeadCookie` and the call is guarded by whether there was one. The
 # claim is untouched - sign-out leaves no line in the history - and the line
 # that owes it is the same line, one identifier over. It had been MISSing
 # since 22 August under a live ⚙ row, and no check in the store could see it:
 # the anchor reader took `MUTANTS` in one `literal_eval`, and every mutant in
 # this file is a *list* of edits, so the guard that asked for a tuple skipped
 # all nine without saying so.
 #
 # Re-aimed again 2026-09-12 (#131). The line is now inside a block guarded by
 # whether the account still exists, so it is one indent over and the `if` is
 # no longer on it. The claim is the one it has always made - sign-out leaves a
 # line in the history, and removing the call takes it away - and deleting this
 # line leaves an empty block, which is valid and is the point: the mutant has
 # to remove the writing and nothing else.
 'N7': [('auth',
   "        await recordActivity(pool, userId, 'LOGOUT');\n",
   "")],
 # the accounts list not narrowed to what the acting grant reaches
 'N8': [('users',
   "WHERE ($1::text[] IS NULL OR ${OWN_SCOPE} = ANY($1))",
   "WHERE ($1::text[] IS NULL OR TRUE)")],
 # the page number owned by the panel again rather than by the account: the
 # `key` gone from the call site and the corrective effect back. This is the
 # exact shape the code had before the fix, and the only thing that tells it
 # from the fixed shape is the one wasted read of page two.
 'N9': [('userhistory',
   "<HistoryPanel key={chosen.user_id} user={chosen} onError={report} />",
   "<HistoryPanel user={chosen} onError={report} />"),
   ('panel',
   "  const [loading, setLoading] = useState(true)\n",
   "  const [loading, setLoading] = useState(true)\n\n  useEffect(() => {\n    setPage(1)\n  }, [user.user_id])\n")],
}

main(FILES, MUTANTS)
