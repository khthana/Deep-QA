# -*- coding: utf-8 -*-
"""
#31 แผนการสอน - the week-by-week plan of one Section.

Thirteen mutants. Two things set this sweep apart from its #28-#30
neighbours. First, the grain flips: the plan belongs to the Section, so
`graincrossed` - the mutant #28 and #30 could not have cleanly - exists here,
because `course_syllabus.section_id` is a real column whose filter can be
widened and watched to matter. Second, the delete guard is stricter than the
schema: `activities.course_syllabus_id` is SET NULL, so `guardoff` kills
cleanly with a 204 and a clean log, where #30's RESTRICT would have answered
a dirty 500 - the guard's existence gets its own mutant at last, alongside
`wrongweek` for its sentence.

Two mutants step outside the ticket's own files, each with the 23:firstrole
justification. `anysection` breaks `sectionOf` in enrolment.js, where the
question "is this Section mine" is decided and from where #31 imports it
(#104). `menudropssection` breaks the sidebar entry in Teacher.js, because
the way in is the menu and the menu is the shell's.

`noupdate` and `weekstuck` keep their dead parameter bound with a CASE that
is never true - 27:nodetail's lesson: a dropped binding is a 08P01 the error
handler turns into noise, and a mutant that crashes proves nothing about the
assertion it was written for.

What has no mutant: the smallint ceiling check. Disabling it turns 40000
into a 22003 and the log dirty, so row 8's status assert leans on the
backend suite's crafted-refusals loop; what the browser row proves - and
`saveswallows` backs - is the sentence reaching the person.

    python mutation/31-teaching-plan.py save
    python mutation/31-teaching-plan.py <mutant>
    python mutation/31-teaching-plan.py restore

Killing them:

    cd e2e && npx playwright test tests/31a-teaching-plan.spec.js

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `menudropssection` | **แตะอะไร** **`Teacher.js`** (เมนู) · **ทำอะไร** เมนูทิ้ง token ของตอนเรียน | **แถวที่มันค้ำ · ตายที่** แถว 1 · บรรทัด 79 — GET ที่รอไม่มีวันมา · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:167` |
| `orderbyid` | **แตะอะไร** route · **ทำอะไร** แผนเรียงตาม id ใหม่ก่อน | **แถวที่มันค้ำ · ตายที่** แถว 1 · บรรทัด 88 — สามสัปดาห์กลับด้าน · **แถวอื่นที่ตายไปด้วย** 2, 3, 4, 5, 6, 8 — ทุกแถวที่อ่านลิสต์ตายหมด **แถว 7 รอด** เพราะ 404 ไม่เคยไปถึงลิสต์ · ที่มา `docs/acceptance/31-teaching-plan.md:168` |
| `graincrossed` | **แตะอะไร** route · **ทำอะไร** ตัวกรองตอนเรียนถูกถ่าง (`OR $1 IS NOT NULL` — `$1` ยังผูก) — ทุกตอนเรียนทุกปีไหลมารวมเป็นลิสต์เดียว | **แถวที่มันค้ำ · ตายที่** แถว 2 · บรรทัด 107 — ลิสต์ของฉันต้องเป็นสามแถวของฉัน · **แถวอื่นที่ตายไปด้วย** 1 (88) ตายตรง ๆ ด้วยเหตุเดียวกัน · 3–6, 8 ตายที่การนับ [1,2,3] ที่กลายเป็นของทั้งระบบ · ที่มา `docs/acceptance/31-teaching-plan.md:169` |
| `noupdate` | **แตะอะไร** route · **ทำอะไร** UPDATE ตอบ 200 แต่หัวข้อไม่ถูกเขียน (`CASE` — `$4` ยังผูก) | **แถวที่มันค้ำ · ตายที่** แถว 2 · บรรทัด 124 — หัวข้อที่แก้ไม่เคยขึ้นจอ ทั้งที่ 200 · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:170` |
| `weekstuck` | **แตะอะไร** route · **ทำอะไร** เลขสัปดาห์ที่พิมพ์ถูกเมิน ทุกหัวข้อใหม่ลงสัปดาห์ 1 (`CASE` — `$2` ยังผูก) | **แถวที่มันค้ำ · ตายที่** แถว 3 · บรรทัด 150 — [1,2,3,4] อ่านได้ [1,1,2,3] · **แถวอื่นที่ตายไปด้วย** 4 (177), 5 (196), 6 (213), 8 (250) — การปนเปื้อน: แถว 3 ตายก่อนเก็บกวาด แถวชั่วคราวค้างบนสัปดาห์ 1 · ที่มา `docs/acceptance/31-teaching-plan.md:171` `docs/acceptance/31-teaching-plan.md:88` |
| `savenoreload` | **แตะอะไร** หน้าจอ · **ทำอะไร** บันทึกแล้วไม่อ่านแผนกลับ | **แถวที่มันค้ำ · ตายที่** แถว 3 · บรรทัด 150 — จอไม่ขยับหลัง 201 · **แถวอื่นที่ตายไปด้วย** 2 (124), 4 (177) ตายตรง ๆ ที่ reload ของตัวเอง · 5 (196), 6 (213), 8 (250) — การปนเปื้อน: restore ของแถว 2–4 ไม่ปรากฏบนจอ จึงเก็บกวาดไม่ครบ · ที่มา `docs/acceptance/31-teaching-plan.md:172` |
| `wrongrow` | **แตะอะไร** route · **ทำอะไร** การลบจับทุกแถวที่ใส่เลขเดียวกัน แทนที่จะจับแถวเดียวที่ชี้ | **แถวที่มันค้ำ · ตายที่** แถว 4 · **ตายจริงที่แถว 3 บรรทัด 161** ซึ่งคือ property เดียวกัน: การลบหัวข้อชั่วคราวพาสัปดาห์ 2 ของ seed ไปด้วย [1,2,3,4] อ่านได้ [1,3,4] — แถว 4 เองตายที่ 177 แบบปนเปื้อน (สัปดาห์ 2 หายไปแล้วตั้งแต่แถว 3) · **แถวอื่นที่ตายไปด้วย** 5 (196), 6 (213), 8 (250) — การปนเปื้อนเดียวกัน · ที่มา `docs/acceptance/31-teaching-plan.md:173` |
| `cancelremoves` | **แตะอะไร** หน้าจอ · **ทำอะไร** ปุ่ม *ยกเลิก* ต่อสายไปที่การลบ | **แถวที่มันค้ำ · ตายที่** แถว 5 · บรรทัด 194 — DELETE ที่ไม่ควรถูกส่ง · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:174` |
| `guardoff` | **แตะอะไร** route · **ทำอะไร** `NOT EXISTS` ใน DELETE ถูกถอด (`$1 IS NULL OR TRUE` — ยังผูก) — ลบสัปดาห์ที่ถูกอ้างตอบ 204 และ SET NULL ปลดสอบกลางภาคเงียบ ๆ (log สะอาด — นี่คือเหตุที่ด่านต้องมี) | **แถวที่มันค้ำ · ตายที่** แถว 6 · บรรทัด 210 — 400 กลายเป็น 204 · **แถวอื่นที่ตายไปด้วย** 8 (250) — การปนเปื้อน: สัปดาห์ 1 ถูกลบจริงไปแล้วในแถว 6 · ที่มา `docs/acceptance/31-teaching-plan.md:175` `docs/acceptance/31-teaching-plan.md:93` |
| `wrongweek` | **แตะอะไร** route · **ทำอะไร** ประโยคด่านบอกสัปดาห์ 0 แทนเลขจริง | **แถวที่มันค้ำ · ตายที่** แถว 6 · บรรทัด 211 — แถบต้องเอ่ย "สัปดาห์ที่ 1" · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:176` `docs/acceptance/31-teaching-plan.md:93` |
| `anysection` | **แตะอะไร** **`enrolment.js`** · **ทำอะไร** ทะเบียนผู้สอนหลุดจาก WHERE ของ `sectionOf` | **แถวที่มันค้ำ · ตายที่** แถว 7 · บรรทัด 230 — 404 กลายเป็น 200 · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:177` |
| `swallowrefusal` | **แตะอะไร** หน้าจอ · **ทำอะไร** จอกลืนคำปฏิเสธตอนโหลด — เล็งใหม่ 22 ก.ย. 2569 เพราะ #151 ลบบรรทัด `setData(null)` ที่มันยก กวาดซ้ำแล้ว ฆ่าแถวเดิม | **แถวที่มันค้ำ · ตายที่** แถว 7 · บรรทัด 231 — แถบไม่ขึ้น · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:178` |
| `saveswallows` | **แตะอะไร** หน้าจอ · **ทำอะไร** จอกลืนคำปฏิเสธตอนบันทึก | **แถวที่มันค้ำ · ตายที่** แถว 8 · บรรทัด 249 — แถบไม่ขึ้น · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/31-teaching-plan.md:179` |
"""

from harness import main

FILES = {
    "route": "backend/routes/teachingPlan.js",
    "enrolment": "backend/routes/enrolment.js",
    "screen": "frontend/src/pages/TeachingPlan.js",
    "entry": "frontend/src/components/SidebarItem/Teacher.js",
}

MUTANTS = {
    # The menu entry loses the section token, so the click lands on an address
    # with no Section in it and the GET the row waits for never comes. Kills
    # row 1 at the Promise.all.
    "menudropssection": ("entry",
                         "        path: '/teacher/teacherDashboard/%SECTION%/teachingPlan',",
                         "        path: '/teacher/teacherDashboard/teachingPlan',"),
    # The plan arrives newest-first instead of in calendar order. Kills row 1
    # at the headings read against `planWeeksFor`'s order.
    "orderbyid": ("route",
                  "        WHERE section_id = $1\n"
                  "        ORDER BY week_no ASC, id ASC`,",
                  "        WHERE section_id = $1\n"
                  "        ORDER BY id DESC`,"),
    # The Section filter stops filtering - $1 stays bound, the OR is always
    # true, and every Section's plan of every year arrives as one list. The
    # widening #28 could not have: here the column exists, so the mutant can.
    # Kills rows 1 and 2 at the headings that should be this Section's three.
    "graincrossed": ("route",
                     "        WHERE section_id = $1\n"
                     "        ORDER BY week_no ASC, id ASC`,",
                     "        WHERE section_id = $1 OR $1 IS NOT NULL\n"
                     "        ORDER BY week_no ASC, id ASC`,"),
    # The edit answers 200 and keeps the old title - the CASE keeps $4 bound
    # and never true. Kills row 2 at the marker that never appears on the
    # editing screen itself.
    "noupdate": ("route",
                 "              SET week_no = $3, title = $4, description = $5, remark = $6, updated_at = now()",
                 "              SET week_no = $3, title = CASE WHEN $4 = '' THEN $4 ELSE title END, description = $5, remark = $6, updated_at = now()"),
    # The typed week number is ignored and every new topic lands on week 1 -
    # $2 stays bound. Kills row 3 at the [1, 2, 3, 4] that reads [1, 1, 2, 3].
    "weekstuck": ("route",
                  "         VALUES ($1, $2, $3, $4, $5, $6)",
                  "         VALUES ($1, CASE WHEN $2 < 0 THEN $2 ELSE 1 END, $3, $4, $5, $6)"),
    # A successful save no longer re-reads the plan, so the added card never
    # appears. Kills row 3 at the poll after the POST; rows 2 and 4 die with
    # it, being the same reload around other writes.
    "savenoreload": ("screen",
                     "        setEditing(null)\n"
                     "      }\n"
                     "      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n",
                     "        setEditing(null)\n"
                     "      }\n"
                     "      const reloaded = true\n"),
    # The delete takes every topic wearing the same week number, not the one
    # row the person named - the CLO screens' renumbering instinct sneaking
    # into a place where the number is not a key. Kills row 4 where the seeded
    # week 2 vanishes alongside the temporary one.
    #
    # Bound to the DELETE's first two lines together: `WHERE id = $1 AND
    # section_id = $2` alone appears in the PUT as well, and the harness
    # refuses an ambiguous mutant rather than editing the first match.
    "wrongrow": ("route",
                 "`DELETE FROM course_syllabus\n"
                 "            WHERE id = $1 AND section_id = $2\n",
                 "`DELETE FROM course_syllabus\n"
                 "            WHERE week_no = (SELECT week_no FROM course_syllabus WHERE id = $1)\n"
                 "              AND section_id = $2\n"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 5 at the DELETE
    # that should never have been sent.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The in-use guard stops looking, and the delete of a referenced week
    # answers 204 - which the SET NULL foreign key permits, silently orphaning
    # สอบกลางภาค from its week. This is the mutant #30 could not have cleanly;
    # here the schema does not catch the fall, which is the point of the
    # guard. Kills row 6 at the 400 that answers 204, log clean.
    #
    # It breaks the `NOT EXISTS` inside the DELETE rather than an `if` before
    # it, because the guard moved into the statement when the review found the
    # gap between asking and deleting. `$1 IS NULL OR TRUE` keeps the parameter
    # bound while always passing - 27:nodetail's lesson, one clause along.
    "guardoff": ("route",
                 "              AND NOT EXISTS (SELECT 1 FROM activities WHERE course_syllabus_id = $1)`,",
                 "              AND ($1 IS NULL OR TRUE)`,"),
    # The refusal still refuses but names week 0 whatever week was asked.
    # Kills row 6 at the banner built from refusals.js with the real 1 in it.
    "wrongweek": ("route",
                  "        if (rows[0]) return res.status(400).json({ message: REFUSALS.weekInUse(week.week_no) });",
                  "        if (rows[0]) return res.status(400).json({ message: REFUSALS.weekInUse(0) });"),
    # The teaching register leaves the WHERE clause of `sectionOf` - in
    # enrolment.js, where #31 imports it from (#104). Kills row 7 at the 404
    # that answers 200.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in enrolment.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against 31a.
    "anysection": ("enrolment",
                   "      ${THIS_ACCOUNTS_SECTION}`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 7 at
    # the banner that never appears.
    # Re-aimed 22 Sep 2569 (#151): the failed load no longer clears `data`,
    # so the line this quoted is gone; the notice is what it swallows.
    "swallowrefusal": ("screen",
                       "      if (isCurrent()) {\n        if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      if (isCurrent()) {\n"),
    # The screen swallows the refusal a failed save carries. Kills row 8 at
    # the banner with the server's own sentence in it.
    "saveswallows": ("screen",
                     "    } catch (error) {\n"
                     "      if (showing.current === sent && !error.expired)\n"
                     "        setNotice({ error: true, message: error.message })\n"
                     "    } finally {\n"
                     "      setBusy(false)",
                     "    } catch (error) {\n"
                     "    } finally {\n"
                     "      setBusy(false)"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
