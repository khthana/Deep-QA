# -*- coding: utf-8 -*-
"""
#33 กิจกรรมการเรียนรู้ - writing the work, and attributing it to outcomes.

Fourteen mutants. The ticket's centre of gravity is the attribution rather than
the fields, so most of these break the CLO rows in a different way: the rows
are not written, not loaded, not replaced, offered twice, or offered from the
wrong year. The fields have two mutants between them, and both are there
because a form that quietly sends a constant is the failure a person cannot
see - the screen looks right, and the row it writes is not what they typed.

Two mutants die at the HTTP seam rather than in the browser, each for its own
reason, and the acceptance document says so:

- `marksguardoff` removes the guard that refuses to drop a CLO a cohort has
  been marked under. The seed's Activities are the only marked ones, and no
  browser row edits them - editing a marked Activity's attribution is exactly
  what the guard exists to refuse, so a row that did it would be asserting
  the refusal it is testing. `backend/test/activity-editor.test.js` writes it.
- `markfromweight` makes each row's share of the mark the weight itself
  (60 marks of a 20-mark piece of work). Nothing on the screen draws that
  column - the form computes its own preview from what is typed - so the only
  place it shows is the answer the route sends back.

    python mutation/33-activity-editor.py save
    python mutation/33-activity-editor.py <mutant>
    python mutation/33-activity-editor.py restore

Killing them:

    cd e2e && npx playwright test 33a-activity-editor

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `noattribution` | **แตะอะไร** route · **ทำอะไร** บันทึกกิจกรรมโดยไม่เขียนแถว CLO เลย | **แถวที่มันค้ำ · ตายที่** **แถว 1** · บรรทัด 104 `attributionOf(MADE)` ต้องมี `CLO-1 (60%)` · **แถวอื่นที่ตายไปด้วย** 2–7 (ปนเปื้อน — แถว 1 เป็นคนสร้างกิจกรรมที่แถวหลังใช้) · ที่มา `docs/acceptance/33-activity-editor.md:145` `docs/acceptance/33-activity-editor.md:79` |
| `emptyeditor` | **แตะอะไร** form · **ทำอะไร** เปิดแก้ไขแล้วแถว CLO ว่างเปล่า | **แถวที่มันค้ำ · ตายที่** **แถว 2** · บรรทัด 126 `cloRow(1).clo` ต้องมีค่าเป็น CLO-1 · **แถวอื่นที่ตายไปด้วย** 3 · 4 · 6 · 7 (ปนเปื้อน — บันทึกซ้ำแทนที่แถวทั้งชุด แถวเดิมจึงหาย) · ที่มา `docs/acceptance/33-activity-editor.md:146` `docs/acceptance/33-activity-editor.md:85` |
| `duplicateoffered` | **แตะอะไร** form · **ทำอะไร** picker เลิกซ่อน CLO ที่แถวอื่นถืออยู่ | **แถวที่มันค้ำ · ตายที่** **แถว 3** · บรรทัด 144 `second` ต้องไม่มี CLO-1 · **แถวอื่นที่ตายไปด้วย** 4 (จำนวนตัวเลือกเกินไปหนึ่ง) · ที่มา `docs/acceptance/33-activity-editor.md:147` `docs/acceptance/33-activity-editor.md:84` |
| `alwaysnew` | **แตะอะไร** screen · **ทำอะไร** บันทึกกิจกรรมเดิมด้วย POST เสมอ | **แถวที่มันค้ำ · ตายที่** **แถว 6** · บรรทัด 238 ต้องได้ 200 (ได้ 201) · **แถวอื่นที่ตายไปด้วย** 7 (ปนเปื้อน — แถว 6 ไม่ได้เปลี่ยนชื่อให้) · ที่มา `docs/acceptance/33-activity-editor.md:148` `docs/acceptance/33-activity-editor.md:86` |
| `weightsunchecked` | **แตะอะไร** route · **ทำอะไร** เพดานผลรวมน้ำหนักเป็น 1000 แทน 100 | **แถวที่มันค้ำ · ตายที่** **แถว 5** · บรรทัด 208 ต้องได้ 400 · ที่มา `docs/acceptance/33-activity-editor.md:149` `docs/acceptance/33-activity-editor.md:91` |
| `swallowrefusal` | **แตะอะไร** screen · **ทำอะไร** ประโยคปฏิเสธไม่ถูกตั้งเป็น notice | **แถวที่มันค้ำ · ตายที่** **แถว 5** · บรรทัด 209 ประโยค `activityCloWeights(110)` ต้องเห็นบนจอ · ที่มา `docs/acceptance/33-activity-editor.md:150` |
| `cloofanyyear` | **แตะอะไร** route · **ทำอะไร** ตัด `AND sc.academic_year = c.academic_year` — picker เสนอ CLO ทุกปี | **แถวที่มันค้ำ · ตายที่** **แถว 4** · บรรทัด 170 `clos` ต้องยาวเท่า `CLOS.length` ของ seed · **แถวอื่นที่ตายไปด้วย** 3 (ป้าย CLO-1 โผล่ซ้ำจากอีกปี) · ที่มา `docs/acceptance/33-activity-editor.md:151` `docs/acceptance/33-activity-editor.md:83` |
| `weeksofanysection` | **แตะอะไร** route · **ทำอะไร** สัปดาห์จากทุกตอนเรียน ไม่ใช่ของตอนเรียนนี้ | **แถวที่มันค้ำ · ตายที่** **แถว 4** · บรรทัด 185 จำนวนสัปดาห์ต้องเท่ากับ `planWeeksFor` ของตอนเรียนนี้ · ที่มา `docs/acceptance/33-activity-editor.md:152` `docs/acceptance/33-activity-editor.md:83` |
| `onetypesent` | **แตะอะไร** form · **ทำอะไร** ส่ง `individual` เสมอไม่ว่าเลือกอะไร | **แถวที่มันค้ำ · ตายที่** **แถว 1** · บรรทัด 99 การ์ดต้องอ่านว่า *งานกลุ่ม* · **แถวอื่นที่ตายไปด้วย** 2 (ค่าที่โหลดกลับมาเป็น `individual`) · ที่มา `docs/acceptance/33-activity-editor.md:153` `docs/acceptance/33-activity-editor.md:79` |
| `nodateload` | **แตะอะไร** form · **ทำอะไร** ไม่โหลดวันที่กลับเข้าฟอร์ม | **แถวที่มันค้ำ · ตายที่** **แถว 2** · บรรทัด 119 *วันที่ประกาศ* ต้องเป็น `2026-08-03` · ที่มา `docs/acceptance/33-activity-editor.md:154` `docs/acceptance/33-activity-editor.md:85` |
| `norowadded` | **แตะอะไร** form · **ทำอะไร** ปุ่ม *เพิ่มผลการเรียนรู้* คำนวณแถวใหม่แล้วไม่ต่อเข้าไป | **แถวที่มันค้ำ · ตายที่** **แถว 1** · `activities-screen.js` บรรทัด 137 — ไม่มี control ของแถวที่สองให้เลือก CLO · **แถวอื่นที่ตายไปด้วย** 2–7 (ปนเปื้อน — แถว 1 เป็นคนสร้างกิจกรรม) · ที่มา `docs/acceptance/33-activity-editor.md:155` `docs/acceptance/33-activity-editor.md:82` |
| `norowdropped` | **แตะอะไร** form · **ทำอะไร** ปุ่มนำแถวออกเก็บทุกแถวไว้ | **แถวที่มันค้ำ · ตายที่** **แถว 6** · บรรทัด 238 ต้องได้ 200 (ได้ 400 เพราะแถวเดิมยังอยู่ ผลรวมเป็น 140) · **แถวอื่นที่ตายไปด้วย** 7 (ปนเปื้อน) · ที่มา `docs/acceptance/33-activity-editor.md:156` `docs/acceptance/33-activity-editor.md:82` |
| `marksguardoff` | **แตะอะไร** route · **ทำอะไร** ปิดด่านที่ห้ามถอด CLO ที่มีคะแนนแล้ว | **แถวที่มันค้ำ · ตายที่** **ตายที่ seam ของ backend** — `activity-editor.test.js` ข้อ *a CLO a cohort has already been marked against…* · ที่มา `docs/acceptance/33-activity-editor.md:157` `docs/acceptance/33-activity-editor.md:94` |
| `markfromweight` | **แตะอะไร** route · **ทำอะไร** คะแนนต่อ CLO กลายเป็นตัวน้ำหนักเอง (60 คะแนนของงาน 20 คะแนน) | **แถวที่มันค้ำ · ตายที่** **ตายที่ seam ของ backend** — ข้อ *an activity is created…* และ *saving twice updates…* · ที่มา `docs/acceptance/33-activity-editor.md:158` |
"""

from harness import main

FILES = {
    "route": "backend/routes/activities.js",
    "screen": "frontend/src/pages/LearningActivities.js",
    "form": "frontend/src/components/activity/ActivityForm.js",
}

MUTANTS = {
    # The save writes the Activity and none of its attribution: every piece of
    # work would arrive counting towards nothing, which is the one outcome
    # this ticket exists to prevent. Kills row 1 at the card's own line.
    "noattribution": ("route",
                      "      for (const [index, row] of values.clo_rows.entries()) {",
                      "      for (const [index, row] of [].entries()) {"),
    # The editor opens empty on an existing row. Because a save replaces the
    # rows whole, the next save through this form would take the attribution
    # with it - the quiet version of `noattribution`, one screen up.
    "emptyeditor": ("form",
                    "  clo_rows: (activity.clo_rows ?? []).map(row => ({",
                    "  clo_rows: [].map(row => ({"),
    # The picker stops hiding the CLOs other rows hold, so the same one can be
    # added twice from the screen. The server still refuses it (that is the
    # backend suite's row); what dies here is the fifth criterion's screen
    # half. Kills row 3.
    "duplicateoffered": ("form",
                         "                      .filter(clo => clo.clo_id === Number(row.clo_id) || !taken(draft.clo_rows, index, clo.clo_id))\n",
                         ""),
    # Saving an existing Activity posts a new one: the seventh criterion's
    # failure, and the one a person would find weeks later with two of
    # everything. Kills row 6 at the count that must not grow.
    "alwaysnew": ("screen",
                  "      if (editing === 'new') await createActivity(sectionId, draft)\n"
                  "      else await updateActivity(sectionId, editing.id, draft)",
                  "      await createActivity(sectionId, draft)"),
    # The weight total stops being checked, so a set claiming more of the mark
    # than there is saves cleanly. Kills row 5 at the 400 that answers 200.
    "weightsunchecked": ("route",
                         "    if (total > 100) return REFUSALS.activityCloWeights(total);",
                         "    if (total > 1000) return REFUSALS.activityCloWeights(total);"),
    # The refusal never reaches the page: the save fails, the banner does not
    # appear, and the person is left looking at a form that did nothing.
    # Kills row 5 at the sentence.
    "swallowrefusal": ("screen",
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
    # The CLO picker offers every year's outcomes, not this Offering's. The
    # foreign key would admit them and #27's own screen would not show them,
    # so this is the fourth criterion with nothing but the WHERE behind it.
    # Kills row 4 at the option count - counted against the seed's nine, which
    # is the only count a route cannot move (see `weeksofanysection`).
    "cloofanyyear": ("route",
                     "                                 AND sc.academic_year = c.academic_year\n",
                     ""),
    # The week picker offers every Section's plan. #31's grain, borrowed by
    # this screen and broken here. Kills row 4 at the week count.
    #
    # This one **survived the first sweep**, and is why the sweep is worth
    # running: row 4 compared the screen with `answered.weeks.length` - the
    # same query, asked twice - so widening the WHERE grew both sides together
    # and the assertion saw nothing. It counts against `planWeeksFor` now.
    "weeksofanysection": ("route",
                          "      `SELECT id, week_no, title FROM course_syllabus\n"
                          "        WHERE section_id = $1\n",
                          "      `SELECT id, week_no, title FROM course_syllabus\n"
                          "        WHERE section_id = $1 OR $1 IS NOT NULL\n"),
    # Every piece of work is written as งานเดี่ยว whatever the picker says -
    # the second criterion inverted, and invisible on the form itself. Kills
    # row 1 at the card that should read งานกลุ่ม.
    "onetypesent": ("form",
                    "            activity_type: draft.activity_type,",
                    "            activity_type: 'individual',"),
    # The dates are not loaded back into the form, so every edit of a dated
    # Activity clears its dates. Kills row 2, which is the only place the
    # loaded values are read.
    "nodateload": ("form",
                   "const dateField = value => (value ? String(value).slice(0, 10) : '')",
                   "const dateField = value => (value ? '' : '')"),
    # The two halves of "rows can be added and removed", one mutant each,
    # because the acceptance row claims both and one mutant would only prove
    # the half it broke.
    #
    # `norowadded`: the add button computes the new row and appends nothing.
    # Kills row 1, which is where a second row is typed at all.
    "norowadded": ("form",
                   "      clo_rows: [...current.clo_rows, { clo_id: String(unusedClo(clos, current.clo_rows) ?? ''), weight: '' }],",
                   "      clo_rows: [...current.clo_rows],"),
    # `norowdropped`: the remove button keeps every row. Kills row 6, where a
    # row is taken off and the card must stop naming its CLO.
    "norowdropped": ("form",
                     "      clo_rows: current.clo_rows.filter((row, at) => at !== index),",
                     "      clo_rows: current.clo_rows.filter((row, at) => at !== -1),"),
    # The guard that refuses to drop a CLO a cohort has been marked under.
    #
    # **Killed at the HTTP seam, not in the browser.** The only marked
    # Activities are the seed's, and editing one's attribution from a browser
    # row would be asserting the very refusal under test - see the note at the
    # top of this file:
    #
    #     cd backend && npx node --test test/activity-editor.test.js
    "marksguardoff": ("route",
                      "        if (leaving) {",
                      "        if (leaving && false) {"),
    # Each CLO's share of the mark becomes the weight itself: 60 marks of a
    # 20-mark piece of work, which #34 would then enter marks against.
    #
    # **Killed at the HTTP seam too.** The form draws its own preview from
    # what is typed rather than from the stored column, so the browser never
    # reads this number.
    "markfromweight": ("route",
                       "           VALUES ($1, $2, $3, $4, $5, ROUND($6::numeric * $7::numeric / 100, 2))",
                       "           VALUES ($1, $2, $3, $4, $5, ROUND($7::numeric * $6::numeric / $6::numeric, 2))"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
