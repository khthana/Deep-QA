# -*- coding: utf-8 -*-
"""
#32 กิจกรรมการเรียนรู้ - the assessed work of one Section, grouped by หมวด.

Fifteen mutants. The screen shows two grains at once, so two of them are grain
mutants pulling in opposite directions: `graincrossed` widens the Activities
to the whole Offering (they are the Section's), and `schemefromrows` narrows
the groups to whatever happens to be filed (they are the scheme's). The
second is the mutant that says why the categories come from the server at
all, and it is invisible to every row except the one written for it.

The delete guard is two guards over one statement, and only one of them has a
browser row. `markguardoff` kills cleanly with a 204 and a clean log, because
`activity_scores.activity_id` CASCADEs - the delete succeeds and takes a
cohort's marks with it, which is the whole reason the guard is in the DELETE
rather than before it. The evidence half has no mutant here: the seed plants
no evidence (a real one is a real PDF, #35's business), so nothing in the
browser can reach that branch. It is proved at the HTTP seam instead, and the
acceptance document says so.

Two mutants step outside the ticket's own files, each with the 23:firstrole
justification. `anysection` breaks `sectionOf` in enrolment.js, where the
question "is this Section mine" is decided and from where #32 imports it.
`menudropssection` breaks the sidebar entry in Teacher.js, because the way in
is the menu and the menu is the shell's.

    python mutation/32-activity-list.py save
    python mutation/32-activity-list.py <mutant>
    python mutation/32-activity-list.py restore

Killing them:

    cd e2e && npx playwright test 32a

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `menudropssection` | **แตะอะไร** **`Teacher.js`** (เมนู) · **ทำอะไร** เมนูทิ้ง token ของตอนเรียน | **แถวที่มันค้ำ · ตายที่** แถว 1 · บรรทัด 82 — GET ที่รอไม่มีวันมา · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:149` |
| `schemeorder` | **แตะอะไร** route · **ทำอะไร** สัดส่วนคะแนนมาแบบ id ใหม่ก่อน หัวข้อกลุ่มจึงสลับ | **แถวที่มันค้ำ · ตายที่** แถว 3 · บรรทัด 138 — หัวข้อกลุ่มเทียบกับลำดับของ `SCORE_RATIOS` · **แถวอื่นที่ตายไปด้วย** 1 (89) ตายตรง ๆ ด้วยเหตุเดียวกัน · ที่มา `docs/acceptance/32-activity-list.md:150` `docs/acceptance/32-activity-list.md:86` |
| `schemefromrows` | **แตะอะไร** หน้าจอ · **ทำอะไร** กลุ่มถูกสร้างจากรายการที่มีอยู่ หมวดว่างจึงหายจากจอ | **แถวที่มันค้ำ · ตายที่** **ไม่ตายเลยทั้งชุด** — seed เติมงานครบทุกหมวด ดูย่อหน้าใต้ตาราง · ที่มา `docs/acceptance/32-activity-list.md:151` `docs/acceptance/32-activity-list.md:90` |
| `graincrossed` | **แตะอะไร** route · **ทำอะไร** ตัวกรองตอนเรียนถูกถ่าง (`OR $1 IS NOT NULL` — ยังผูก) ทุกตอนเรียนทุกปีไหลมารวมกัน | **แถวที่มันค้ำ · ตายที่** แถว 4 · บรรทัด 176 — การ์ดของตอนเรียนอื่นโผล่บนจอนี้ · **แถวอื่นที่ตายไปด้วย** 1 (95), 2 (113), 3 (149), 9 (210), 6 (242), 7 (255) — ทุกแถวที่อ่านรายการตายหมด **แถว 5 กับ 8 รอด** · ที่มา `docs/acceptance/32-activity-list.md:152` |
| `wrongbucket` | **แตะอะไร** หน้าจอ · **ทำอะไร** งานถูกวาดใต้หัวข้อผิดหมวด | **แถวที่มันค้ำ · ตายที่** แถว 2 · บรรทัด 113 — โครงงานสามรายการต้องอยู่ใต้ *โครงงาน* · **แถวอื่นที่ตายไปด้วย** 3 (149), 4 (174), 9 (195), 5 (230), 6 (242), 7 (255) — การ์ดที่หาไม่เจอทำให้แถวที่กดปุ่มบนการ์ดตายตาม · ที่มา `docs/acceptance/32-activity-list.md:153` `docs/acceptance/32-activity-list.md:86` |
| `orderbyid` | **แตะอะไร** route · **ทำอะไร** ในหมวดเดียวกันเรียงใหม่ก่อนเก่า | **แถวที่มันค้ำ · ตายที่** แถว 2 · บรรทัด 113 — ลำดับทั้งลิสต์ ไม่ใช่แค่สมาชิก · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:154` |
| `markguardoff` | **แตะอะไร** route · **ทำอะไร** ด่านคะแนนออกจาก DELETE — ลบกิจกรรมที่มีคะแนนสำเร็จ และ CASCADE พาคะแนนทั้งรุ่นไปด้วย (log สะอาด — นี่คือเหตุที่ด่านต้องมี) | **แถวที่มันค้ำ · ตายที่** แถว 7 · บรรทัด 256 — 400 กลายเป็น 204 · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:158` `docs/acceptance/32-activity-list.md:97` |
| `wrongcount` | **แตะอะไร** route · **ทำอะไร** ประโยคปฏิเสธบอกจำนวนคะแนนเป็น 1 เสมอ | **แถวที่มันค้ำ · ตายที่** **ตายที่ seam HTTP** — `backend/test/activities.test.js` คาด 171 ได้ 1 · ในเบราว์เซอร์ไม่ตาย ดูย่อหน้าใต้ตาราง · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:159` `docs/acceptance/32-activity-list.md:97` |
| `wrongrow` | **แตะอะไร** route · **ทำอะไร** การลบจับทุกแถวของตอนเรียน ไม่ใช่แถวที่ชี้ | **แถวที่มันค้ำ · ตายที่** แถว 5 · บรรทัด 231 — ลิสต์ต้องหายไปแถวเดียว · **แถวอื่นที่ตายไปด้วย** 6 (242), 7 (255) — การปนเปื้อน: ทั้งตอนเรียนถูกลบไปแล้วตั้งแต่แถว 5 · ที่มา `docs/acceptance/32-activity-list.md:160` |
| `nodates` | **แตะอะไร** หน้าจอ · **ทำอะไร** ทุกวันที่กลายเป็นขีด | **แถวที่มันค้ำ · ตายที่** แถว 9 · บรรทัด 205 — วันที่จริงของ *แบบฝึกหัดท้ายบท* หายไป · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:155` `docs/acceptance/32-activity-list.md:88` |
| `onetype` | **แตะอะไร** หน้าจอ · **ทำอะไร** ทุกกิจกรรมอ่านว่า *งานเดี่ยว* — ป้ายเลิกเป็นการอ่านค่าและกลายเป็นค่าคงที่ | **แถวที่มันค้ำ · ตายที่** แถว 9 · บรรทัด 202 — *โครงงานย่อยที่ 1* เป็นงานกลุ่ม · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:156` `docs/acceptance/32-activity-list.md:88` |
| `nomark` | **แตะอะไร** หน้าจอ · **ทำอะไร** คะแนนเต็มกลายเป็นขีดที่แปลว่า *ยังไม่กำหนด* | **แถวที่มันค้ำ · ตายที่** แถว 9 · บรรทัด 196 — 20 ของ *แบบฝึกหัดท้ายบท* (และ 100 ของโครงงาน) · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:157` `docs/acceptance/32-activity-list.md:88` |
| `cancelremoves` | **แตะอะไร** หน้าจอ · **ทำอะไร** ปุ่ม *ยกเลิก* ต่อสายไปที่การลบ | **แถวที่มันค้ำ · ตายที่** แถว 6 · บรรทัด 242 — DELETE ที่ไม่ควรถูกส่ง · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:161` |
| `anysection` | **แตะอะไร** **`enrolment.js`** · **ทำอะไร** ทะเบียนผู้สอนหลุดจาก WHERE ของ `sectionOf` | **แถวที่มันค้ำ · ตายที่** แถว 8 · บรรทัด 275 — 404 กลายเป็น 200 · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:162` |
| `swallowrefusal` | **แตะอะไร** หน้าจอ · **ทำอะไร** จอกลืนคำปฏิเสธตอนโหลด — เล็งใหม่ 22 ก.ย. 2569 เพราะ #151 ลบบรรทัด `setData(null)` ที่มันยก กวาดซ้ำแล้ว ฆ่าแถวเดิม | **แถวที่มันค้ำ · ตายที่** แถว 8 · บรรทัด 276 — แถบไม่ขึ้น · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/32-activity-list.md:163` |

**กวาดซ้ำกับ `266b` 4 พ.ย. 2569 — `wrongbucket` ได้สองแถวเพิ่ม ซึ่งคำทำนายบอกว่าจะไม่ได้อะไร**
ล้ม 2 ผ่าน 8 ใน 1.1 นาที ใน
`e2e/tests/266b-the-list-a-handler-reloads-across-a-section-jump.spec.js` สองแถวของ `LearningActivities`
(*บันทึก* และ *ลบ*) เหตุผลที่ #266 เขียนไว้คือถังขยะถูกหาด้วย `aria-label` ของตัวเอง ไม่ใช่ด้วย
หมวดที่มันอยู่ ซึ่ง**ยังถูก และไม่ใช่เหตุที่แถวตาย** สิ่งที่เหตุผลนั้นมองไม่เห็นคือ *ความไม่ซ้ำ*:
มัตแตนต์วาดกิจกรรมเดียวกันใต้หลายหัวข้อ ปุ่มของกิจกรรมนั้นจึงมีสามตัว locator ที่เขียน `exact: true`
เจอสามตัว และ strict mode ปฏิเสธ แถว *บันทึก* ตายที่ `locator.click` ของ
`แก้ไขกิจกรรม ${activity.activity_name}` แถว *ลบ* ตายที่ `bin()` ซึ่งอยู่ในสเปคเดียวกัน
ทั้งสองตายที่ **การกด**
ไม่ใช่ที่ข้ออ้างและไม่ใช่ที่การรอ — *locator จะไม่ซ้ำได้ด้วยความบังเอิญของสิ่งที่กำลังจะถูกเพิ่ม
เข้ามา* (#93, #116, #118) สองแถวนี้จึงไม่ได้เพิ่มการพิสูจน์ของ `wrongbucket` เลย และเป็นข้อค้นพบ
เกี่ยวกับ locator ของแถวมากกว่า — *คำทำนายเป็นคำทำนายเกี่ยวกับข้อยืนยันและเงื่อนไขนำของแถว ไม่ใช่
เกี่ยวกับพาดหัวของมัน* (#258)
บันทึกเต็ม: `mutation/266-the-list-a-handler-reloads-across-a-section-jump.py`
§ *ผลการกวาดซ้ำเก้าสิบเก้าตัว 4 พ.ย. 2569*

"""

from harness import main

FILES = {
    "route": "backend/routes/activities.js",
    "enrolment": "backend/routes/enrolment.js",
    "screen": "frontend/src/pages/LearningActivities.js",
    "entry": "frontend/src/components/SidebarItem/Teacher.js",
}

MUTANTS = {
    # The menu entry loses the section token, so the click lands on an address
    # with no Section in it and the GET the row waits for never comes. Kills
    # row 1 at the Promise.all.
    "menudropssection": ("entry",
                         "        path: '/teacher/teacherDashboard/%SECTION%/learningActivities',",
                         "        path: '/teacher/teacherDashboard/learningActivities',"),
    # The scheme arrives in id order rather than in the order it was written.
    # Kills row 1 and row 3 at the headings, which are asserted against
    # SCORE_RATIOS' own order.
    "schemeorder": ("route",
                    "        ORDER BY r.sequence_order ASC, r.score_ratio_id ASC`,",
                    "        ORDER BY r.score_ratio_id DESC`,"),
    # The groups stop coming from the scheme and start coming from whatever is
    # filed: an empty หมวด would silently vanish from the screen.
    #
    # **This one survives the whole browser suite, and that is the finding.**
    # The seed fills all three หมวด in both years, so filtering out the empty
    # ones removes nothing and every row still passes. Nothing here is wrong;
    # what is missing is a category with no work in it, which a browser cannot
    # make until it can add one - #30's screen can, and the acceptance sheet
    # keeps that as a hand-walked row rather than pretending this is covered.
    # Kept in the file because the day the seed grows an empty category, this
    # is the mutant that will start earning its place.
    "schemefromrows": ("screen",
                       "  const groups = categories.map(category => ({",
                       "  const groups = categories.filter(category =>\n"
                       "    activities.some(one => one.score_ratio_id === category.score_ratio_id)\n"
                       "  ).map(category => ({"),
    # The Section filter stops filtering - $1 stays bound, the OR is always
    # true - so every Section's work of every year arrives as one list. Kills
    # rows 1 and 4 at the lists that should be this ตอนเรียน's alone.
    "graincrossed": ("route",
                     "        WHERE a.section_id = $1\n",
                     "        WHERE a.section_id = $1 OR $1 IS NOT NULL\n"),
    # Work is drawn under the wrong heading: the screen groups by the position
    # of the category rather than by its id, so a list whose categories are
    # not in filing order lands under neighbours. Kills row 2.
    "wrongbucket": ("screen",
                    "    activities: activities.filter(one => one.score_ratio_id === category.score_ratio_id),",
                    "    activities: activities.filter((one, at) => at % categories.length === 0),"),
    # Within a category the rows come back newest-first, so the list
    # reshuffles against the order the work was made in. Kills row 2 at the
    # seeded โครงงาน order.
    "orderbyid": ("route",
                  "        ORDER BY r.sequence_order ASC NULLS LAST, a.id ASC`,",
                  "        ORDER BY r.sequence_order ASC NULLS LAST, a.id DESC`,"),
    # The marks guard leaves the DELETE, so deleting a marked Activity
    # succeeds - and the CASCADE takes the cohort's marks with it, silently
    # and with a clean log. This is the mutant the guard exists for. Kills
    # row 7 at the 400 that answers 204.
    "markguardoff": ("route",
                     "              AND NOT EXISTS (SELECT 1 FROM activity_scores s WHERE s.activity_id = $1)\n",
                     "              AND ($1 IS NULL OR TRUE)\n"),
    # The refusal still refuses but the sentence loses the server's count -
    # it says one, whatever was recorded.
    #
    # **Killed at the HTTP seam, not in the browser.** 32a's row 7 builds its
    # expectation from the sentence the server just sent, so a wrong count
    # matches it - the row's claim is that the sentence *reaches the page*,
    # which is a different claim and the one it is allowed to make. The count
    # itself is `backend/test/activities.test.js`, which reads the marks from
    # the database and asserts the sentence against that:
    #
    #     cd backend && npx node --test test/activities.test.js
    #
    # This is the same shape as 27:anyclo, which also dies in a backend suite.
    "wrongcount": ("route",
                   "      return { status: 400, message: REFUSALS.activityHasMarks(marked[0].marks) };",
                   "      return { status: 400, message: REFUSALS.activityHasMarks(1) };"),
    # The delete takes every Activity of the Section, not the one named.
    # Kills row 5 at the list that should have lost exactly one row.
    #
    # `$1::int` and not a bare `$1`, which was the first draft: postgres
    # cannot infer a type for a parameter whose only use is `IS NOT NULL`, so
    # every delete answered 42P08 - a 500, a dirty log, and a "kill" that was
    # really the mutant failing to compile. 25:anysection learned this in the
    # same words one file over.
    "wrongrow": ("route",
                 "`DELETE FROM activities\n"
                 "            WHERE id = $1 AND section_id = $2\n",
                 "`DELETE FROM activities\n"
                 "            WHERE section_id = $2 AND ($1::int IS NOT NULL)\n"),
    # Every date on the screen becomes the dash that means "not set", so a
    # Teacher's announcement and deadline are drawn as absent. Kills row 9 at
    # the one Activity the seed dates - which is the whole reason it is
    # dated. Nothing else on the screen changes.
    "nodates": ("screen",
                "const dateOf = value =>\n  value\n    ? new Date(value).toLocaleDateString('th-TH', {",
                "const dateOf = value =>\n  false\n    ? new Date(value).toLocaleDateString('th-TH', {"),
    # Every Activity reads as งานเดี่ยว, whatever the enum says - the label
    # stops being a reading of the value and becomes a constant. Kills row 9
    # at the โครงงาน, which is group work.
    "onetype": ("screen",
                "const typeName = type => (type === 'group' ? 'งานกลุ่ม' : 'งานเดี่ยว')",
                "const typeName = type => (type === 'nothing' ? 'งานกลุ่ม' : 'งานเดี่ยว')"),
    # The full mark is drawn as the dash that means "not set". Kills row 9 at
    # the 20 and the 100 - the numbers a person plans their marking around.
    "nomark": ("screen",
               "  const mark = Number(score)\n  return Number.isFinite(mark) ? String(mark) : '—'",
               "  const mark = Number(score)\n  return Number.isFinite(mark) ? '—' : '—'"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 6 at the DELETE
    # that should never have been sent.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The teaching register leaves the WHERE clause of `sectionOf` - in
    # enrolment.js, where #32 imports it from (#104). Kills row 8 at the 404
    # that answers 200.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in enrolment.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against 32a.
    "anysection": ("enrolment",
                   "      ${THIS_ACCOUNTS_SECTION}`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 8 at
    # the banner that never appears.
    # Re-aimed 22 Sep 2569 (#151): the failed load no longer clears `data`,
    # so the line this quoted is gone; the notice is what it swallows.
    "swallowrefusal": ("screen",
                       "      if (isCurrent()) {\n        if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      if (isCurrent()) {\n"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
