# -*- coding: utf-8 -*-
"""
#29 เกณฑ์การบรรลุผลตาม CLO - what counts as having done it well.

Fourteen mutants - #28's thirteen one table over, minus `taglabelraw` (the
band is stored as the Thai word, so there is no label table to break) plus
two of this screen's own: `banddropped`, which is the same lie told the way
this card can tell it - the heading forgets its band - and
`requiredescription`, which turns the one optional field into a gate. The
pair worth reading first are still `removeslast` and `silentdelete`: both
leave every status code correct and differ only in what actually happened to
the rows.

One mutant steps outside the ticket's files. `anysection` breaks `offeringOf`
in `backend/routes/clos.js`, because that is where the teaching register's
join lives - #29 imports the question rather than asking it again, so the
only honest way to break "a Section that is somebody else's is refused" is to
break it where it is decided. `23:firstrole` set the precedent, and the
acceptance document carries the reason.

The row this file has no mutant for is the shared list (row 2). A criterion
carries a `clo_id` and nothing else - no Section, no owner - so there is no
column a mutant could filter by to give two ตอนเรียน two copies. That gap is
recorded in the acceptance document rather than papered over, as #28 recorded
the same one.

    python mutation/29-achievement-criteria.py save
    python mutation/29-achievement-criteria.py <mutant>
    python mutation/29-achievement-criteria.py restore

Killing them:

    cd e2e && npx playwright test 29a

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `linkdropsclo` | **แตะอะไร** การ์ด #27 · **ทำอะไร** ลิงก์ทิ้ง clo id | **แถวที่มันค้ำ · ตายที่** แถว 1 · บรรทัด 76 — GET ที่รอไม่มีวันมา · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/29-achievement-criteria.md:160` |
| `orderbyid` | **แตะอะไร** route · **ทำอะไร** รายการเรียงตาม id ใหม่ก่อน | **แถวที่มันค้ำ · ตายที่** แถว 1 · บรรทัด 92 `[1, 2, 3, 4]` กลับด้าน · **แถวอื่นที่ตายไปด้วย** 4 (156), 5 (198), 6 (217) — ลำดับผิดตัวเดียวกันถูกอ่านทุกที่ **แถว 2 รอด** เพราะสองจอวาดลำดับผิดเหมือนกัน ซึ่งบอกว่าแถว 2 ไม่เคยพูดเรื่องลำดับ · ที่มา `docs/acceptance/29-achievement-criteria.md:161` |
| `noupdate` | **แตะอะไร** route · **ทำอะไร** การแก้ตอบ 200 แต่เกณฑ์การประเมินไม่ถูกเขียน (`COALESCE` — พารามิเตอร์ยังผูกครบ ตามบทเรียน `27:nodetail`) | **แถวที่มันค้ำ · ตายที่** แถว 3 · บรรทัด 133 · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/29-achievement-criteria.md:162` |
| `nextnumber` | **แตะอะไร** route · **ทำอะไร** เลขถัดไปข้ามหนึ่ง | **แถวที่มันค้ำ · ตายที่** แถว 4 · บรรทัด 170 `criterionCard(5)` · **แถวอื่นที่ตายไปด้วย** 5 (198) — การปนเปื้อน: แถว 4 ตายก่อนเก็บกวาดของตัวเอง CLO-9 จึงมีข้อค้าง ไม่ใช่หลักฐานของแถว 5 · ที่มา `docs/acceptance/29-achievement-criteria.md:163` |
| `savenoreload` | **แตะอะไร** หน้าจอ · **ทำอะไร** บันทึกแล้วไม่โหลดรายการใหม่ | **แถวที่มันค้ำ · ตายที่** แถว 4 · บรรทัด 170 · **แถวอื่นที่ตายไปด้วย** 3 (133) — การแก้ที่ไม่ถูกวาดคือความพังเดียวกันคนละกริยา · 5 (198) — การปนเปื้อนแบบเดียวกับ `nextnumber` · ที่มา `docs/acceptance/29-achievement-criteria.md:164` |
| `banddropped` | **แตะอะไร** หน้าจอ · **ทำอะไร** หัวการ์ดลืมระดับของตัวเอง | **แถวที่มันค้ำ · ตายที่** แถว 1 · บรรทัด 93 `bandsOnScreen` ได้ช่องว่างสี่ช่อง · **แถวอื่นที่ตายไปด้วย** 4 (173) — หัว *ข้อ 5 · ต้องปรับปรุง* ไม่มา ซึ่งเป็นข้ออ้างเดียวกันบนแถวที่เพิ่งเพิ่ม · 5 (198) — การปนเปื้อนจากการเก็บกวาดของแถว 4 ที่ไม่ถึง · ที่มา `docs/acceptance/29-achievement-criteria.md:165` `docs/acceptance/29-achievement-criteria.md:94` |
| `requiredescription` | **แตะอะไร** route · **ทำอะไร** ช่องคำอธิบายกลายเป็นบังคับ | **แถวที่มันค้ำ · ตายที่** แถว 4 · บรรทัด 167 — 201 กลายเป็น 400 · **แถวอื่นที่ตายไปด้วย** 5 (196) — การเพิ่มของแถวนั้นเองก็ไม่ส่งคำอธิบายเหมือนกัน จึงตายที่ด่านเดียวกันด้วยบรรทัดของตัวเอง ไม่ใช่การปนเปื้อน · ที่มา `docs/acceptance/29-achievement-criteria.md:166` `docs/acceptance/29-achievement-criteria.md:99` |
| `norenumber` | **แตะอะไร** route · **ทำอะไร** ลบแล้วไม่จัดเลขใหม่ | **แถวที่มันค้ำ · ตายที่** แถว 5 · บรรทัด 201 `[1..5]` ได้ `[1, 2, 3, 4, 6]` · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/29-achievement-criteria.md:167` |
| `removeslast` | **แตะอะไร** route · **ทำอะไร** DELETE เมินแถวที่ถูกขอ ไปเอาแถวท้ายสุด — เลขทุกตัวถูกหมดหลังจากนั้น | **แถวที่มันค้ำ · ตายที่** แถว 5 · บรรทัด 202 — assertion เรื่อง**เนื้อหา**เป็นตัวเดียวที่เห็น · **แถวอื่นที่ตายไปด้วย** ไม่มี — แถว 4 ลบแถวท้ายอยู่แล้วจึงรอด ซึ่งคือเหตุผลที่แถว 5 ต้องลบจากกลาง · ที่มา `docs/acceptance/29-achievement-criteria.md:168` |
| `silentdelete` | **แตะอะไร** route · **ทำอะไร** DELETE ไม่ลบอะไรแต่ตอบ 204 | **แถวที่มันค้ำ · ตายที่** แถว 4 · บรรทัด 177 poll เก็บกวาดที่ไม่ยอมกลับเป็น `[1, 2, 3, 4]` · **แถวอื่นที่ตายไปด้วย** 5 (198) — ข้อค้างจากแถว 4 บวกกับการลบของแถวนั้นเองที่ไม่เกิด · ที่มา `docs/acceptance/29-achievement-criteria.md:169` |
| `cancelremoves` | **แตะอะไร** หน้าจอ · **ทำอะไร** ปุ่ม *ยกเลิก* ต่อสายไปที่การลบ | **แถวที่มันค้ำ · ตายที่** แถว 6 · บรรทัด 215 `toEqual([])` · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/29-achievement-criteria.md:170` |
| `anysection` | **แตะอะไร** **`clos.js`** · **ทำอะไร** ทะเบียนผู้สอนหลุดจาก WHERE ของ `offeringOf` | **แถวที่มันค้ำ · ตายที่** แถว 7 · บรรทัด 236 — 404 กลายเป็น 200 · **แถวอื่นที่ตายไปด้วย** ไม่มี · ที่มา `docs/acceptance/29-achievement-criteria.md:171` |
| `swallowrefusal` | **แตะอะไร** หน้าจอ · **ทำอะไร** จอกลืนคำปฏิเสธตอนโหลด — เล็งใหม่ 22 ก.ย. 2569 เพราะ #151 ลบบรรทัด `setData(null)` ที่มันยก กวาดซ้ำแล้ว ฆ่าแถวเดิม | **แถวที่มันค้ำ · ตายที่** แถว 7 · บรรทัด 237 — แถบไม่ขึ้น · **แถวอื่นที่ตายไปด้วย** 8 (251) — การกลืนเดียวกัน คนละประโยคข้างใน · ที่มา `docs/acceptance/29-achievement-criteria.md:172` |
| `wrongsentence` | **แตะอะไร** route · **ทำอะไร** CLO ที่ไม่พบตอบประโยคของตอนเรียน | **แถวที่มันค้ำ · ตายที่** แถว 8 · บรรทัด 251 `getByText(cloNotFound)` · **แถวอื่นที่ตายไปด้วย** ไม่มี — แถว 7 ยังยืน ซึ่งคือสิ่งที่แยกข้ออ้างของสองแถวออกจากกัน · ที่มา `docs/acceptance/29-achievement-criteria.md:173` |
"""

from harness import main

FILES = {
    "route": "backend/routes/achievementCriteria.js",
    "clos": "backend/routes/clos.js",
    "screen": "frontend/src/pages/AchievementCriteria.js",
    "entry": "frontend/src/pages/CourseOutcomes.js",
}

MUTANTS = {
    # The card link loses the CLO id, so it points at a path no route matches
    # and the screen it lands on never asks the server for criteria. Kills
    # row 1 at the Promise.all waiting for the GET that will not come.
    "linkdropsclo": ("entry",
                     "courseOutcomes/${clo.clo_id}/criteria",
                     "courseOutcomes/criteria"),
    # The list arrives newest-first instead of numbered. Kills row 1 at
    # `numbersOnScreen [1, 2, 3, 4]` - the seed's set comes back reversed.
    # Bound to listOf's SELECT whole, 28:orderbyid's lesson: the renumbering
    # loop's SELECT ends in the same ORDER BY.
    "orderbyid": ("route",
                  "        `SELECT ${RETURNED} FROM subject_clo_achievement_criteria\n"
                  "          WHERE clo_id = $1 ORDER BY criteria_no ASC`,",
                  "        `SELECT ${RETURNED} FROM subject_clo_achievement_criteria\n"
                  "          WHERE clo_id = $1 ORDER BY id DESC`,"),
    # The edit answers 200 and keeps the old detail - COALESCE holds because
    # the column is NOT NULL, and every parameter stays bound, 27:nodetail's
    # lesson. Kills row 3 where the page reads its own edit back.
    "noupdate": ("route",
                 "              SET achievement_level = $3, criteria_detail = $4, criteria_description = $5,",
                 "              SET achievement_level = $3, criteria_detail = COALESCE(criteria_detail, $4), criteria_description = $5,"),
    # The next number skips one. Kills row 4 at `criterionCard(5)` - the row
    # the server just numbered 6 is not the row the screen was told to expect.
    "nextnumber": ("route",
                   "             SELECT $1, COALESCE(MAX(criteria_no), 0) + 1, $2, $3, $4",
                   "             SELECT $1, COALESCE(MAX(criteria_no), 0) + 2, $2, $3, $4"),
    # A successful save no longer reloads the list. Kills row 4 at the card
    # that never appears; row 3 dies with it, because an edit that is not
    # redrawn is the same failure wearing a different verb.
    "savenoreload": ("screen",
                     "        setEditing(null)\n      }\n      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n",
                     "        setEditing(null)\n      }\n      const reloaded = true\n"),
    # The card's heading forgets its band - the wire value is correct, and
    # what a person reads is not. Kills row 1 at `bandsOnScreen` and row 4 at
    # the heading that should say ต้องปรับปรุง.
    "banddropped": ("screen",
                    "                      ข้อ {criterion.criteria_no} ·{' '}\n"
                    "                      {criterion.achievement_level}",
                    "                      ข้อ {criterion.criteria_no} ·{' '}\n"
                    "                      {''}"),
    # The description stops being optional - the route refuses a save that
    # leaves the box alone. Kills row 4 at the 201 that answers 400, which is
    # the second criterion's "optional" failing the only way a browser sees.
    "requiredescription": ("route",
                           "  if (!values.criteria_detail) return { ok: false, reason: 'invalidAchievement' };",
                           "  if (!values.criteria_detail || !values.criteria_description) return { ok: false, reason: 'invalidAchievement' };"),
    # The renumbering loop is disarmed, so a removal leaves a gap. Kills row 5
    # at the poll expecting [1, 2, 3, 4, 5] and getting [1, 2, 3, 4, 6].
    "norenumber": ("route",
                   "            if (row.criteria_no !== index + 1) {",
                   "            if (false) {"),
    # The DELETE ignores which row was asked for and takes the last one. Every
    # number is right afterwards - the renumbering has nothing to close - so
    # the only assertion that can see it is the one about substance: what was
    # ข้อ 6 must now be ข้อ 5 still saying what it said. Kills row 5 there and
    # only there; row 4 removes the last row anyway and passes.
    "removeslast": ("route",
                    "            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2`,",
                    "            `DELETE FROM subject_clo_achievement_criteria WHERE clo_id = $2 AND $1::int > 0"
                    " AND criteria_no = (SELECT MAX(criteria_no) FROM subject_clo_achievement_criteria WHERE clo_id = $2)`,"),
    # The DELETE matches nothing and the route still answers 204. Kills row 4
    # at the cleanup poll - the list that was supposed to shrink back reads
    # [1, 2, 3, 4, 5] - and row 5 at its first poll for the same reason.
    "silentdelete": ("route",
                     "            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2`,",
                     "            `DELETE FROM subject_clo_achievement_criteria WHERE id = $1 AND clo_id = $2 AND false`,"),
    # The dialog's ยกเลิก is wired to the removal. Kills row 6 at
    # `toEqual([])` - the list of DELETEs sent while cancelling, which is the
    # only honest way to assert a cancel, for `removeClo`'s reason.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # The teaching register leaves the WHERE clause of `offeringOf` - in
    # clos.js, where #29 imports it from - so anybody's ตอนเรียน resolves.
    # Kills row 7 at the 404 that answers 200. `$2::text IS NOT NULL` keeps the
    # parameter bound and typed, 25:anysection's lesson.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in clos.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against 29a.
    "anysection": ("clos",
                   "      ${THIS_ACCOUNTS_SECTION}`,",
                   "      WHERE cs.section_id = $1 AND $2::text IS NOT NULL`,"),
    # The screen swallows the refusal a failed load carries. Kills row 7 at the
    # banner that never appears; row 8 dies with it, being the same swallow
    # with a different sentence inside.
    # Re-aimed 22 Sep 2569 (#151): the failed load no longer clears `data`,
    # so the line this quoted is gone; the notice is what it swallows.
    "swallowrefusal": ("screen",
                       "      if (isCurrent()) {\n        if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      if (isCurrent()) {\n"),
    # The unknown-CLO refusal answers with the wrong sentence - the Section's
    # instead of the CLO's. Kills row 8 at `getByText(cloNotFound)` and leaves
    # row 7 standing, which is what separates the two rows' claims.
    "wrongsentence": ("route",
                      "      res.status(404).json({ message: REFUSALS.cloNotFound });",
                      "      res.status(404).json({ message: REFUSALS.sectionNotFound });"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
