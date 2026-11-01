# -*- coding: utf-8 -*-
"""
#27 ผลการเรียนรู้รายวิชา - the CLO set of an Offering, reached through a Section.

Mutants for both seams. What the routes answer is asked in
`backend/test/clos.test.js`; what only a browser can show - two ผู้สอน reading
one list, a confirmation that actually decides, a refusal that reaches the page
- is asked in `e2e/tests/27a-course-outcomes.spec.js`.

    python mutation/27-course-outcomes.py save
    python mutation/27-course-outcomes.py <mutant>
    cd backend && node --test test/clos.test.js
    # or, for the browser ones:
    cd e2e && npx playwright test 27a
    python mutation/27-course-outcomes.py restore

`cancelremoves`, `swallowremoval`, `swallowsave` and `noeditorline` mutate CRA
source. Do not apply one while a run is in flight or a dev frontend is up: the
running server compiles what is on disk at that moment, and a mutant applied
mid-run is a result about nothing. The e2e stack boots its own frontend per run
(`reuseExistingServer: false`), so apply first, then run.

## The three worth reading first

`bodygrain` is the one this file was written for. The route is handed a Section
id and needs a (หลักสูตร, รายวิชา, ปีการศึกษา); the triple is *also* sitting in
the request body of any screen that displays it, and reading it from there is
one line shorter than resolving it. It is also ADR-0002 violated outright, and
nothing on the screen would look different: the frontend sends the triple the
server itself just handed it, so every row would pass. The backend row that
kills this sends a body naming another year and another รายวิชา, which is the
only way to tell the two implementations apart.

`mappedasmarked` breaks nothing a person could see except one sentence. The
eighth criterion has three states behind it and the database collapses two of
them, so it would be easy to answer all three with `cloHasScores` and be right
two times out of three. The mutant does exactly that. It exists to prove that
the row asserting `cloInUse` is asserting the sentence and not the status.

`noplanguard` is the opposite case: the mutant makes the route *succeed*.
`clo_course_cycle_detail_cloplan.clo_id` is ON DELETE CASCADE, so a CLO carrying
a course-cycle reflection deletes cleanly and takes the reflection with it, and
the only thing that ever knew is the row that asserts a 409.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `anysection` | **ทำอะไร** เอา `cst.user_id = $2` ออกจากการแปลงตอนเรียนเป็นการเปิดสอน | **ตายที่** ข้อ 16 *a Section the caller does not teach hides its CLO set behind the section refusal* — ด่านบทบาทยังอยู่และยังตอบว่าใช่ ซึ่งเป็นประเด็นของ ADR-0002 ทั้งหมด · ที่มา `docs/acceptance/27-course-learning-outcomes.md:211` `docs/acceptance/27-course-learning-outcomes.md:235` |
| `norolegate` | **ทำอะไร** เอา `requireRole(...TEACHING)` ออกจากการอ่านรายการ | **ตายที่** ข้อ 19 *a role that is not a teaching one does not reach these routes at all* · ที่มา `docs/acceptance/27-course-learning-outcomes.md:212` |
| `anyyear` | **ทำอะไร** เอาเงื่อนไขปีการศึกษาออกจากรายการ | **ตายที่** ข้อ 1, 3, 17 — สามแถวที่พูดเรื่องปีทั้งหมด สองปีรวมกันเป็นชุดสิบแปดแถว ซึ่งดูสมเหตุสมผลบนหน้าจอที่เคย seed ไว้ปีเดียว · ที่มา `docs/acceptance/27-course-learning-outcomes.md:213` `docs/acceptance/27-course-learning-outcomes.md:236` |
| `bodygrain` | **ทำอะไร** อ่าน `program_id` `subject_id` `academic_year` จาก body ถ้ามีมา | **ตายที่** ข้อ 15 *the Offering is resolved from the Section and never taken from the body* — **ตัวเดียวในระบบที่ฆ่ามันได้** เพราะหน้าจอส่งกลับสิ่งที่เซิร์ฟเวอร์เพิ่งให้มา ทุกแถวเบราว์เซอร์จึงผ่านหมด · ที่มา `docs/acceptance/27-course-learning-outcomes.md:214` |
| `anyclo` | **ทำอะไร** อ่าน CLO ด้วย id อย่างเดียว ไม่ตรวจว่าอยู่ในการเปิดสอนนี้ | **ตายที่** ข้อ 17 *a CLO of another year cannot be edited through this year Section* · ที่มา `docs/acceptance/27-course-learning-outcomes.md:215` |
| `allplos` | **ทำอะไร** สร้าง picker จาก `learning_outcomes` แทน `subject_plo_mapping` | **ตายที่** ข้อ 4 *only the PLOs this subject is mapped to are offered* — ตอบ PLO ทั้ง 52 ข้อรวมข้อย่อย · ที่มา `docs/acceptance/27-course-learning-outcomes.md:216` `docs/acceptance/27-course-learning-outcomes.md:241` `docs/acceptance/27-course-learning-outcomes.md:97` |
| `noploguard` | **ทำอะไร** ยอมรับ `plo_id` ที่ส่งมาโดยไม่ถาม grid | **ตายที่** ข้อ 6 *a PLO outside this subject cannot be linked* — foreign key ยังกันของหลักสูตรอื่นไว้ แต่ของหลักสูตรเดียวกันที่ไม่ได้ map ผ่านฉลุย · ที่มา `docs/acceptance/27-course-learning-outcomes.md:217` |
| `putnoploguard` | **ทำอะไร** เอาด่านนั้นออกเฉพาะตอนแก้ | **ตายที่** ข้อ 6 แถวเดียวกัน — หน้าจอที่เลือกได้แค่จากรายการที่ให้มาจะไม่มีวันส่งค่าอื่น มัตแตนต์นี้จึงมองไม่เห็นจากเบราว์เซอร์เลย · ที่มา `docs/acceptance/27-course-learning-outcomes.md:218` |
| `noeditor` | **ทำอะไร** ตอนแก้ ไม่ขยับ `updated_by` และ `updated_at` | **ตายที่** ข้อ 9 *each CLO carries who last changed it, and an edit moves it to the editor* · ที่มา `docs/acceptance/27-course-learning-outcomes.md:219` `docs/acceptance/27-course-learning-outcomes.md:239` |
| `staletime` | **ทำอะไร** เขียน `updated_by` แต่ไม่ขยับ `updated_at` | **ตายที่** ข้อ 9 แถวเดียวกัน — ครึ่งหนึ่งของตัวบน และเป็นครึ่งที่แถวซึ่ง assert แค่ชื่อจะรอดไปได้ · ที่มา `docs/acceptance/27-course-learning-outcomes.md:220` |
| `nodetail` | **ทำอะไร** ตอนแก้ ไม่เขียน `clo_detail` | **ตายที่** ข้อ 8 *an edit made from one Section is what the other Section reads* — คำขอตอบ **200** และการแก้ไม่ได้เกิดขึ้น · ที่มา `docs/acceptance/27-course-learning-outcomes.md:221` `docs/acceptance/27-course-learning-outcomes.md:238` `docs/acceptance/28-measurable-behaviors.md:156` |
| `mineonly` | **ทำอะไร** กรองรายการด้วย `created_by = ผู้เรียก` | **ตายที่** ข้อ 2, 8, 9 รวมทั้ง *the set is identical from either Section of the same Offering* — คือการอ่านคำว่า *รายวิชาของฉัน* แบบตรงตัว ซึ่งเป็นสิ่งที่ ADR-0003 มีไว้เพื่อกัน · ที่มา `docs/acceptance/27-course-learning-outcomes.md:222` `docs/acceptance/27-course-learning-outcomes.md:237` |
| `nomarksguard` | **ทำอะไร** เอาการตรวจคะแนนออกก่อนลบ | **ตายที่** ข้อ 10 *a CLO with marks against it is refused in words rather than raised* — foreign key ยังปฏิเสธ แต่ 23503 ไปถึง handler แล้วกลายเป็น *เกิดข้อผิดพลาดในระบบ* · ที่มา `docs/acceptance/27-course-learning-outcomes.md:223` `docs/acceptance/27-course-learning-outcomes.md:245` |
| `mappedasmarked` | **ทำอะไร** ตอบสถานะ *ผูกกับกิจกรรม* ด้วยประโยคของ *มีคะแนนแล้ว* | **ตายที่** ข้อ 11 *a CLO mapped to an Activity but never marked is refused with the other sentence* — สองในสามสถานะยังถูก ตัวนี้มีไว้พิสูจน์ว่าแถวนั้น assert ประโยค ไม่ใช่ status · ที่มา `docs/acceptance/27-course-learning-outcomes.md:224` |
| `noplanguard` | **ทำอะไร** เอาการตรวจแผนรอบการสอนออก | **ตายที่** ข้อ 12 *a CLO named in the course-cycle plan is refused rather than cascaded away* — มัตแตนต์นี้ทำให้การลบ **สำเร็จ** และบันทึกทบทวนหายไปเงียบ ๆ ตาม `ON DELETE CASCADE` · ที่มา `docs/acceptance/27-course-learning-outcomes.md:227` |
| `dupnotseen` | **ทำอะไร** `isDuplicate` ไม่รู้จัก 23505 อีกต่อไป | **ตายที่** ข้อ 7 *the code is unique within the year and free in another one* — ฐานข้อมูลยังปฏิเสธ ไม่มีอะไรถูกเขียน สิ่งที่หายคือ *ประโยค* และคำตอบกลายเป็น 500 · ที่มา `docs/acceptance/27-course-learning-outcomes.md:226` `docs/acceptance/27-course-learning-outcomes.md:243` |
| `savenoreload` | **แตะอะไร** หน้าจอ · **ทำอะไร** บันทึกสำเร็จแล้วไม่โหลดรายการใหม่ | **ตายที่** แถว 8 บรรทัด 225 `await expect(cloCard(page, SPARE)).toHaveCount(1)` — และแถว 4 บรรทัด 155 ด้วยเหตุเดียวกัน คือการแก้ที่เกิดขึ้นจริงแต่ไม่ขึ้นบนจอ · ที่มา `docs/acceptance/27-course-learning-outcomes.md:247` |
| `swallowdelete` | **ทำอะไร** ต่อ `AND FALSE` ท้าย `DELETE FROM subject_clo` — $1 ยังผูกอยู่ statement จึงถูกกฎหมาย transaction commit และ route ตอบ 204 | **ตายที่** ข้อ 13 *a CLO nothing points at is removed, and the removal is real* — คือรูปร่างของการลบที่ไม่ได้ลบ ซึ่งเทสต์ที่ดูแค่ status จะเรียกว่าผ่าน · ที่มา `docs/acceptance/27-course-learning-outcomes.md:225` `docs/acceptance/27-course-learning-outcomes.md:248` |
| `cancelremoves` | **แตะอะไร** หน้าจอ · **ทำอะไร** ปุ่ม *ยกเลิก* ในกล่องยืนยันต่อไปที่การลบ | **ตายที่** แถว 8 บรรทัด 227 `expect(await removeClo(page, SPARE, { confirm: false })).toEqual([])` · ที่มา `docs/acceptance/27-course-learning-outcomes.md:249` |
| `swallowremoval` | **แตะอะไร** หน้าจอ · **ทำอะไร** กลืนคำปฏิเสธตอนลบ | **ตายที่** แถว 7 บรรทัด 211 — แถบเดียวกันไม่ขึ้นเลย · ที่มา `docs/acceptance/27-course-learning-outcomes.md:246` |
| `swallowsave` | **แตะอะไร** หน้าจอ · **ทำอะไร** กลืนคำปฏิเสธตอนบันทึก | **ตายที่** แถว 6 บรรทัด 197 — แถบ *รหัสผลการเรียนรู้นี้ถูกใช้แล้ว* ไม่ขึ้น · ที่มา `docs/acceptance/27-course-learning-outcomes.md:244` |
| `noeditorline` | **แตะอะไร** หน้าจอ · **ทำอะไร** เอาบรรทัด *แก้ไขล่าสุดโดย* ออกจากการ์ด | **ตายที่** แถว 4 บรรทัด 147 — ข้อมูลถูกทั้งหมด สิ่งที่หายคือทางเดียวที่คนจะรู้ (เล็งใหม่ 7 ก.ย. 2569 ดูด้านล่าง) · ที่มา `docs/acceptance/27-course-learning-outcomes.md:240` |
| `emptypicker` | **แตะอะไร** ฟอร์ม · **ทำอะไร** `<select>` ไม่วาดตัวเลือกที่ได้รับมาเลย | **ตายที่** แถว 5 บรรทัด 175 `toHaveCount(plos.length + 1)` · ที่มา `docs/acceptance/27-course-learning-outcomes.md:242` `docs/acceptance/27-course-learning-outcomes.md:97` |
"""

from harness import main

FILES = {
    "routes": "backend/routes/clos.js",
    "screen": "frontend/src/pages/CourseOutcomes.js",
    "form": "frontend/src/components/clos/CloForm.js",
}

MUTANTS = {
    # The teaching register dropped from the Section lookup: any Section
    # resolves for anybody signed in as a Teacher, and with it every CLO set in
    # the system. The role gate is still there and still says yes - ADR-0002's
    # point, that a scope is not a register.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in clos.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against 27a.
    "anysection": ("routes",
                   "${THIS_ACCOUNTS_SECTION}`,",
                   "WHERE cs.section_id = $1 AND (cst.user_id = $2 OR TRUE)`,"),
    # The role gate removed from the read. Every single-role Teacher is
    # unaffected; what changes is that a committee member reaches a Teacher
    # screen, which is what makes switching roles worth anything.
    "norolegate": ("routes",
                   "  router.get(\n    '/teaching/sections/:sectionId/clos',\n"
                   "    requireRole(...TEACHING),\n",
                   "  router.get(\n    '/teaching/sections/:sectionId/clos',\n"),
    # The year dropped from the list: the two academic years of one รายวิชา
    # become one set of eighteen. ADR-0003's grain is the (หลักสูตร, รายวิชา,
    # ปีการศึกษา) triple, and this is what it looks like to keep two thirds of
    # it - plausible on any screen where only one year has ever been seeded.
    "anyyear": ("routes",
                "            WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3\n"
                "            ORDER BY ${cloOrder('c')}, c.clo_id ASC`,",
                "            WHERE c.program_id = $1 AND c.subject_id = $2 AND (c.academic_year = $3 OR TRUE)\n"
                "            ORDER BY ${cloOrder('c')}, c.clo_id ASC`,"),
    # The grain taken from the request body when it offers one - ADR-0002
    # violated in the way that is hardest to see, because the screen sends back
    # exactly what the server gave it and every browser row still passes.
    "bodygrain": [
        ("routes",
         "            offering.program_id,\n"
         "            offering.subject_id,\n"
         "            offering.academic_year,\n"
         "            draft.values.clo_number,",
         "            req.body?.program_id ?? offering.program_id,\n"
         "            req.body?.subject_id ?? offering.subject_id,\n"
         "            req.body?.academic_year ?? offering.academic_year,\n"
         "            draft.values.clo_number,"),
    ],
    # The CLO looked up by id alone, without the Offering it has to belong to.
    # Every id in the system is reachable from every Section the caller teaches,
    # so last year's set becomes editable through this year's screen.
    # Rewritten 2026-08-28: #28 hoisted `cloOf` to module level (to share it,
    # as rubrics shares `reachableRubric`) and the indentation the old string
    # was bound to went with it. Re-proved the same day - dies at the same
    # subtest as before.
    "anyclo": ("routes",
               "      WHERE c.clo_id = $1 AND c.program_id = $2 AND c.subject_id = $3\n"
               "        AND c.academic_year = $4`,",
               "      WHERE c.clo_id = $1 AND (c.program_id = $2 OR TRUE) AND (c.subject_id = $3 OR TRUE)\n"
               "        AND (c.academic_year = $4 OR TRUE)`,"),
    # The picker built from the หลักสูตร's outcomes rather than from the
    # coverage grid. Every PLO of the Program is offered, sub-outcomes included,
    # and the CLO ladder can bypass the grid - the second criterion's whole
    # premise. The `subject_id` parameter is kept so the query still takes two.
    "allplos": ("routes",
                "              m.mapping_level\n"
                "         FROM subject_plo_mapping m\n"
                "         JOIN learning_outcomes lo\n"
                "           ON lo.program_id = m.program_id AND lo.outcome_id = m.outcome_id\n"
                "        WHERE m.program_id = $1 AND m.subject_id = $2 AND lo.is_active",
                "              NULL AS mapping_level\n"
                "         FROM learning_outcomes lo\n"
                "        WHERE lo.program_id = $1 AND (lo.outcome_code = $2 OR TRUE) AND lo.is_active"),
    # The link accepted whatever it names. The foreign key still holds, so a PLO
    # of another หลักสูตร is still refused - by a 23503 rather than by a
    # sentence - and a PLO of this หลักสูตร that this รายวิชา was never mapped
    # to is written without complaint.
    "noploguard": ("routes",
                   "    if (ploId === null) return null;",
                   "    if (ploId !== null) return null;\n    if (ploId === null) return null;"),
    # The guard on the edit only. A screen that can only pick from the offered
    # list would never send anything else, so this is invisible from the
    # browser: the row that kills it is the backend one that sends both writes.
    "putnoploguard": ("routes",
                      "        const notOffered = await ploRefusal(offering, draft.values.plo_id);\n"
                      "        if (notOffered) return res.status(400).json({ message: REFUSALS[notOffered] });\n"
                      "\n"
                      "        // `updated_by` and `updated_at` are written together",
                      "        // `updated_by` and `updated_at` are written together"),
    # The edit stops saying who made it. The column keeps whatever the seed
    # wrote, so the screen shows a real person's name next to a real time and
    # both are the wrong ones - which is the seventh criterion failing in the
    # only way it can fail without looking broken.
    "noeditor": ("routes",
                 "                  updated_by = $7, updated_at = now()\n"
                 "            WHERE clo_id = $1`,",
                 "                  updated_by = CASE WHEN TRUE THEN updated_by ELSE $7 END, updated_at = updated_at\n"
                 "            WHERE clo_id = $1`,"),
    # `updated_by` written and `updated_at` left alone. Half of the mutant
    # above, and the half that would survive a row asserting only the name: the
    # screen would show the person who just typed beside the hour the row was
    # seeded.
    "staletime": ("routes",
                  "                  updated_by = $7, updated_at = now()",
                  "                  updated_by = $7, updated_at = updated_at"),
    # The edit does not write the detail. Everything else saves, the request
    # answers 200, and the change simply is not there - which from one Section
    # looks like a screen that did not refresh and from the other looks like
    # nothing happened at all.
    "nodetail": ("routes",
                 "              SET clo_number = $2, clo_detail = $3, teaching_method = $4,",
                 "              SET clo_number = $2, clo_detail = COALESCE(clo_detail, $3), teaching_method = $4,"),
    # The list scoped to the person who wrote it - the naive reading of "my
    # รายวิชา", and the one ADR-0003 exists to rule out. Each ผู้สอน sees only
    # the CLOs they created, so the set stops being shared and the third
    # criterion fails while every single-teacher screen still looks right.
    "mineonly": ("routes",
                 "            WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3\n"
                 "            ORDER BY ${cloOrder('c')}, c.clo_id ASC`,\n"
                 "          [offering.program_id, offering.subject_id, offering.academic_year],",
                 "            WHERE c.program_id = $1 AND c.subject_id = $2 AND c.academic_year = $3\n"
                 "              AND c.created_by = $4\n"
                 "            ORDER BY ${cloOrder('c')}, c.clo_id ASC`,\n"
                 "          [offering.program_id, offering.subject_id, offering.academic_year,\n"
                 "           req.session.userId],"),
    # The marks check dropped. The foreign key still refuses, so nothing is
    # destroyed - but a 23503 reaches the handler in app.js and the person is
    # told เกิดข้อผิดพลาดในระบบ about a thing they could have gone and fixed.
    # This is #23's `nonumericguard` one tier up.
    "nomarksguard": ("routes",
                     "    if (marked) return 'cloHasScores';",
                     "    if (marked && false) return 'cloHasScores';"),
    # The Activity mapping answered with the marks sentence. Two of the three
    # states are right and the third sends the person to unmark something that
    # was never marked. Exists to prove the row is asserting the sentence rather
    # than the status.
    "mappedasmarked": ("routes",
                       "    if (mapped) return 'cloInUse';",
                       "    if (mapped) return 'cloHasScores';"),
    # The course-cycle check dropped. Nothing refuses: the FK cascades, so the
    # CLO goes and the บันทึกทบทวน of that รอบการสอน goes with it, silently.
    # The only thing that ever knew is the row asserting the 409.
    "noplanguard": ("routes",
                    "    if (planned) return 'cloInPlan';",
                    "    if (planned && false) return 'cloInPlan';"),

    # The duplicate is no longer recognised as one. 23505 still comes back from
    # the database, so nothing is written either way; what is gone is the
    # sentence, and the route answers 500 through the error handler instead.
    # The sixth criterion is a refusal in words, and this is the mutant for the
    # words - `swallowsave` covers the banner not appearing, which is a
    # different failure and leaves the 409 intact.
    "dupnotseen": ("routes",
                   "const isDuplicate = (error) => error && error.code === '23505';",
                   "const isDuplicate = (error) => error && error.code === '00000';"),
    # The save writes and the screen never looks again. The route answers 201,
    # so a row that stopped at the status code would see nothing wrong; the CLO
    # that was just added is simply not on the list, which is the whole of what
    # "เพิ่ม CLO ใหม่ได้" means to the person doing it.
    #
    # A mutant on the INSERT itself was tried first and was thrown away: making
    # it write into the wrong ปีการศึกษา also defeats the duplicate guard, so
    # row 6 left rows behind and row 8 died at its 201 rather than at the line
    # about the list - a kill by contamination, which proves nothing.
    "savenoreload": ("screen",
                     "        setEditing(null)\n      }\n      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n",
                     "        setEditing(null)\n      }\n      const reloaded = true\n"),
    # The removal removes nothing. `AND FALSE` keeps $1 bound, so the statement
    # is legal, the transaction commits, and the route answers 204 - the exact
    # shape of a delete that a row asserting only the status code would call
    # proof.
    "swallowdelete": ("routes",
                      "DELETE FROM subject_clo WHERE clo_id = $1",
                      "DELETE FROM subject_clo WHERE clo_id = $1 AND FALSE"),

    # --- the browser's own ---

    # ยกเลิก removes it anyway. The dialog appears, it is answered no, and the
    # CLO is gone - which is the ninth criterion failing in the exact way that a
    # row asserting only "a dialog appeared" would not notice.
    "cancelremoves": ("screen",
                      "        onConfirm={remove}\n        onCancel={() => setRemoving(null)}",
                      "        onConfirm={remove}\n        onCancel={remove}"),
    # A refused removal says nothing. The dialog closes, the list redraws
    # unchanged, and the person is left to work out for themselves that the
    # thing they asked for did not happen.
    "swallowremoval": ("screen",
                       "      setRemoving(null)\n"
                       "      if (!error.expired) setNotice({ error: true, message: error.message })",
                       "      setRemoving(null)"),
    # The same for a refused save - the duplicate code, most of all. The form
    # closes on a save that never happened only if `setEditing(null)` had run,
    # which it had not, so the form stays open with no explanation at all.
    "swallowsave": ("screen",
                    "      if (showing.current === sent && !error.expired)\n"
                    "        setNotice({ error: true, message: error.message })\n"
                    "    } finally {\n"
                    "      setBusy(false)\n"
                    "    }\n"
                    "  }\n"
                    "\n"
                    "  const remove = async () => {",
                    "    } finally {\n"
                    "      setBusy(false)\n"
                    "    }\n"
                    "  }\n"
                    "\n"
                    "  const remove = async () => {"),
    # The row stops saying who last changed it. The data is all still correct;
    # what is gone is the only way two ผู้สอน editing one list find out which of
    # them wrote what is on the screen.
    #
    # Re-anchored 2026-09-07 (#123). #29 reflowed this JSX when it added the
    # เกณฑ์การบรรลุผล link above it - `เมื่อ` moved from the end of the first
    # line to the start of the second, and `{' '}` with it. The rendered
    # sentence is character for character what it was; the anchor was bound to
    # where the source happened to wrap. Nothing about the claim changed, so
    # this is a re-aim and not a rewrite - but it was MISSing, and a MISS backs
    # no row at all.
    "noeditorline": ("screen",
                     "                <p className=\"mt-3 text-xs text-slate-400\">\n"
                     "                  แก้ไขล่าสุดโดย {clo.updated_by_name || clo.updated_by || '—'}{' '}\n"
                     "                  เมื่อ {changedAt(clo.updated_at)}\n"
                     "                </p>",
                     ""),
    # The picker ignores what it was given and offers nothing but the empty
    # option. Half the second criterion - a CLO can no longer be linked at all -
    # and it is the mutant for the row that counts the options rather than the
    # one that names them.
    "emptypicker": ("form",
                    "              {plos.map(plo => (",
                    "              {[].map(plo => ("),
}

main(FILES, MUTANTS)
