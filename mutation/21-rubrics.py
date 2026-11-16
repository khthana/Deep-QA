# -*- coding: utf-8 -*-
"""
#21 ข้อมูล Rubric กลาง — the mutants that proved `21a-rubrics.spec.js`.

Thirteen, one per ⚙ row of `docs/acceptance/21-rubrics.md` except where a row
makes two claims that break independently — the row about the way into a
rubric's criteria makes three, and two of them are separate pieces of code.

Three of these are worth reading before trusting the rows they back.

`tiebreakreversed` turns `rubric_code ASC` into `DESC` rather than deleting the
tiebreak altogether. Deleting it is what the code would actually look like if
somebody had never thought about ties, but PostgreSQL is free to return the tied
rows in any order and on this data it happens to return them in the order they
were inserted — so the mutant would pass and prove nothing. Reversing the
tiebreak makes the two tied rubrics swap and leaves every untied pair where it
was, which is precisely the claim.

`nopaging` widens the LIMIT and flattens the OFFSET *in terms of the same two
parameters* rather than replacing them with constants. A LIMIT that named
neither would leave the route binding four parameters into a statement wanting
two, and the list would answer 500 — killing the first row, which is a crash
and not evidence about paging. Written as arithmetic, the rows above still read
the same order at the top of the list and the paging row is the first to notice
that page two is page one again.

`hardcancel` makes the confirmation's ยกเลิก do what its ยืนยัน does. It is
written that way round on purpose: a mutant that skipped the dialog entirely
would kill the removal rows as well, and then neither would be evidence about
confirmation specifically.

`21a-rubrics.spec.js` runs `serial`, so the first row to die stops every row
after it and each mutant reports one failure whatever it broke. **Read the name
of the test that died, never the count** — that is the trap #19 lost a session
to.

    python mutation/21-rubrics.py save
    python mutation/21-rubrics.py codeorder
    cd e2e && npx playwright test 21a-rubrics    # expect exactly the named failure
    python mutation/21-rubrics.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `alwaysadropdown` | **ทำอะไรพัง** หน้ารายการวาด dropdown แม้มีหลักสูตรเดียว | **แถวที่ตาย** กรรมการหลักสูตรเห็นหลักสูตรตัวเองและ Rubric ของมัน · ที่มา `docs/acceptance/21-rubrics.md:152` |
| `codeorder` | **ทำอะไรพัง** เรียงตาม `rubric_code` แทนลำดับที่ตั้งไว้ | **แถวที่ตาย** รายการเรียงตามลำดับที่ตั้งไว้ ไม่ใช่ตามรหัส · ที่มา `docs/acceptance/21-rubrics.md:153` |
| `tiebreakreversed` | **ทำอะไรพัง** ตัวตัดสินลำดับซ้ำกลับทาง (`rubric_code DESC`) | **แถวที่ตาย** ลำดับเท่ากันก็ยังเรียงนิ่ง · ที่มา `docs/acceptance/21-rubrics.md:154` |
| `nopaging` | **ทำอะไรพัง** `LIMIT`/`OFFSET` ถูกแทนด้วยค่าคงที่ที่กว้างพอจะเอาทุกแถวมา | **แถวที่ตาย** รายการแบ่งหน้าเมื่อเกินสิบแถว · ที่มา `docs/acceptance/21-rubrics.md:155` |
| `countnotshown` | **ทำอะไรพัง** ลิงก์เกณฑ์ไม่อ่าน `criteria_count` เลย | **แถวที่ตาย** ทางเข้าไปที่เกณฑ์ (ครึ่งจำนวนเกณฑ์) · ที่มา `docs/acceptance/21-rubrics.md:156` |
| `linkforgetsrubric` | **ทำอะไรพัง** ลิงก์ยังอยู่แต่ชี้กลับมาที่รายการ ไม่พา id ไปด้วย | **แถวที่ตาย** ทางเข้าไปที่เกณฑ์ (ครึ่งที่พาไปถูก Rubric) · ที่มา `docs/acceptance/21-rubrics.md:157` |
| `staleafterasave` | **ทำอะไรพัง** บันทึกแล้วหน้าจอไม่อ่านรายการใหม่ (POST ยังสำเร็จ) | **แถวที่ตาย** เพิ่ม Rubric ได้ และเปิดฟอร์มแล้วยกเลิกไม่สร้างอะไรทิ้งไว้ · ที่มา `docs/acceptance/21-rubrics.md:158` `docs/acceptance/14-departments.md:2166` |
| `editnotsaved` | **ทำอะไรพัง** `PUT` ผูก `$3` ด้วยชื่อเดิมแทนชื่อที่ส่งมา (ตอบ 200 ตามเดิม การสร้างยังเขียนชื่อ) | **แถวที่ตาย** แก้ไขได้ · ที่มา `docs/acceptance/21-rubrics.md:159` |
| `wrongduplicatesentence` | **ทำอะไรพัง** ปฏิเสธรหัสซ้ำด้วยประโยคของฟอร์มไม่ครบ แทนประโยครหัสซ้ำ | **แถวที่ตาย** รหัสที่หลักสูตรอื่นจองไว้ ก็ใช้ไม่ได้ · ที่มา `docs/acceptance/21-rubrics.md:160` |
| `nofilter` | **ทำอะไรพัง** `?program_id=` ไม่ถูกใช้ (reach ยังกันอยู่) | **แถวที่ตาย** ผู้ดูแลภาควิชาเลือกหลักสูตรแล้วรายการเปลี่ยนตาม · ที่มา `docs/acceptance/21-rubrics.md:161` |
| `hardcancel` | **ทำอะไรพัง** ปุ่ม *ยกเลิก* ในกล่องยืนยันทำสิ่งที่ปุ่มยืนยันทำ | **แถวที่ตาย** ถามยืนยันก่อนลบ และกดยกเลิกแล้วไม่มีอะไรเปลี่ยน · ที่มา `docs/acceptance/21-rubrics.md:162` |
| `criterianotcounted` | **ทำอะไรพัง** ตอบ `criteria_removed: 0` ทั้งที่เกณฑ์ถูกลบไปจริง | **แถวที่ตาย** ลบแล้วบอกว่าเกณฑ์ย่อยไปด้วยกี่ข้อ · ที่มา `docs/acceptance/21-rubrics.md:163` |
| `facultyadmin` | **ทำอะไรพัง** ใส่ `FACULTY_ADMIN` เข้า `MAINTAINERS` ตามที่เกณฑ์ข้อ 7 เขียนไว้ | **แถวที่ตาย** บัญชีที่ไม่ควรเข้าถึงเลย — ครึ่งที่เป็นกฎ · ที่มา `docs/acceptance/21-rubrics.md:164` |

`countnotshown` เก็บไว้เป็นบันทึก (`SUPERSEDED`) ตั้งแต่ 14 พ.ย. 2569: คำตอบของเจ้าของต่อ #276
เอาคอลัมน์จำนวนเกณฑ์ออก (*เอาออกแบบเดิม*) โค้ดที่มันเคยทำลายจึงไม่อยู่แล้ว และข้ออ้างของมันถูกขีดออก
ไม่ใช่ถูกพิสูจน์ด้วยตัวอื่น `alwaysadropdown` กับ `facultyadmin` ถูกเล็งใหม่วันเดียวกัน — ตัวแรกเพราะ
ย่อหน้าเปลี่ยน ตัวหลังเพราะ `MAINTAINERS` เหลือ `PROG_MANAGER` ตัวเดียว ความผิดที่มันทำยังเป็นความผิดเดิม

## คำทำนาย #276 (14 พ.ย. 2569) — เขียนก่อนรันมัตแตนต์ตัวแรกของตารางนี้ (#255)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันจะฆ่า (คำทำนาย) |
|---|---|---|
| `deptadminkept` | **ทำอะไรพัง** `DEPT_ADMIN` กลับเข้า `MAINTAINERS` — รูปที่โค้ดเคยเป็นก่อนคำตอบของเจ้าของ (#115) | **แถวที่ตาย** *the accounts this screen is not for are refused it* ที่ `expect(answer.status(), ...).toBe(403)` ของรอบ `departmentAdmin05` · แถวก่อนหน้าทุกแถวไม่ได้ลงชื่อเป็นผู้ดูแลภาควิชาโดยไม่สวมหมวก จึงไม่ตาย |
| `deptadminmenu` | **ทำอะไรพัง** เมนูของผู้ดูแลภาควิชากลับมามีรายการ *ข้อมูล Rubric กลาง* (route ยังปฏิเสธ) | **แถวที่ตาย** *the department administrator has no menu entry for the screen* ที่ `menuLink(page, 'ข้อมูล Rubric กลาง')).toHaveCount(0)` · แถวก่อนหน้าไม่มีแถวไหนนับเมนู |
| `addignoresnextorder` | **ทำอะไรพัง** ปุ่มเพิ่มเปิดแถวด้วยลำดับ 1 แทน `next_order` ที่ server ตอบ | **แถวที่ตาย** *a rubric is added through the form* ที่ `toHaveValue(String(nextOrder))` ของช่องลำดับ · ข้อยืนยันเหนือมันอ่านคำตอบของ server ซึ่งมัตแตนต์ไม่แตะ |
| `addcancelkept` | **ทำอะไรพัง** *ยกเลิก* ของแถวเพิ่มไม่ทำอะไร | **แถวที่ตาย** *a rubric is added through the form* ที่ `expect(editRow(page)).toHaveCount(0)` หลังกดยกเลิกครั้งแรก |
| `editcancelkept` | **ทำอะไรพัง** *ยกเลิก* ของแถวแก้ไขไม่ทำอะไร แถวเพิ่มยังปิดได้ | **แถวที่ตาย** *a rubric is added through the form* ที่ `rubricRow(page, MINE)).toContainText('เกณฑ์ที่เพิ่มระหว่างการทดสอบ')` หลังกดยกเลิกของแถวแก้ไข |
| `addrowatbottom` | **ทำอะไรพัง** แถวเพิ่มถูกวาดใต้รายการแทนบนสุด | **แถวที่ตาย** *a rubric is added through the form* ที่ `'the add row is the first row of the table'` |
| `namesswapped` | **ทำอะไรพัง** ชื่ออังกฤษมาก่อนชื่อไทย (เล็งใหม่ 14 พ.ย. 2569 เมื่อแต่ละภาษาได้คอลัมน์ของตัวเอง: สลับสองช่องแทนสองส่วนของช่องเดียว) | **แถวที่ตาย** *the list is order, code, Thai name, English name and actions* ที่ `expect(cells.nth(2)).toHaveText(SEEDED[0].th)` · ก่อนเล็งใหม่ *the list is code, name, order and actions* ที่ `toHaveText` ของช่องชื่อ ที่อ่านชื่อไทยต่อด้วยชื่ออังกฤษ · แถวที่ 1 ใช้ `toContainText` ทีละชื่อจึงไม่ตาย |
| `lastprogramfirst` | **ทำอะไรพัง** บัญชีที่ถือสองหลักสูตรเริ่มที่หลักสูตรสุดท้ายแทนหลักสูตรแรก (บัญชีหลักสูตรเดียวไม่เห็นความต่าง) | **แถวที่ตาย** *an account holding two curricula is shown one at a time* ที่ `searchParams.get('program_id')).toBe('0501')` |

สองตัวที่ review ของวันเดียวกันเพิ่ม เขียนก่อนรัน:

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันจะฆ่า (คำทำนาย) |
|---|---|---|
| `addduringload` | **ทำอะไรพัง** ปุ่ม *เพิ่ม Rubric* กดได้ระหว่างที่รายการที่วาดอยู่เป็นของหลักสูตรก่อนหน้า | **แถวที่ตาย** *the add row is not offered while another curriculum is read* ที่ `expect(add).toBeDisabled()` · แถวอื่นกดปุ่มนี้หลังรายการวาดแล้วเท่านั้น จึงไม่ตาย |
| `rowownsitsflag` | **ทำอะไรพัง** ธงที่ปิดช่องของแถวกลับไปเป็นของแถวเอง (รูปก่อน review) แถวที่ถูกวาดใหม่ระหว่างการบันทึกจึงเริ่มด้วยธงลง | **แถวที่ตาย** *an edit row drawn again while its save is out keeps its fields shut* ที่ `toBeDisabled()` ตัวที่สอง (หลังสลับกลับ) · ตัวแรกผ่าน เพราะแถวยังเป็นแถวเดิม · `242a` ไม่ตาย ไม่มีแถวไหนในนั้นวาดแถวใหม่ระหว่างการบันทึก |
| `addorderkept` | **ทำอะไรพัง** แถวเพิ่มที่เปิดค้างข้ามการสลับหลักสูตรเก็บลำดับของหลักสูตรก่อนหน้า (ตัวเลือก ง ของคำถามที่สามของ #276 ที่เจ้าของไม่เลือก) | **แถวที่ตาย** *an add row kept open across a switch of curriculum keeps what was typed* ที่ `expect(order).toHaveValue(String(after))` · แถวอื่นไม่เปิดแถวเพิ่มข้ามการสลับ จึงไม่ตาย |

## คำทำนาย (16 พ.ย. 2569) — เขียนก่อนรัน

คำตอบของเจ้าของวันนี้เอาข้อความ *หลักสูตร วิศวกรรมคอมพิวเตอร์* ของบัญชีหลักสูตรเดียวออก เพราะงานทำทีละภาควิชาอยู่แล้ว
มัตแตนต์ของตารางนี้คือข้อความนั้นกลับมา — โค้ดที่ถูกเอาออก (#48)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันจะฆ่า (คำทำนาย) |
|---|---|---|
| `statesprogram` | **ทำอะไรพัง** บัญชีหลักสูตรเดียวเห็นข้อความ *หลักสูตร วิศวกรรมคอมพิวเตอร์* อีกครั้ง | **แถวที่ตาย** *a committee member is not asked which curriculum, and sees its rubrics* ที่ `statedLabel(page, 'หลักสูตร', 'วิศวกรรมคอมพิวเตอร์')).toHaveCount(0)` · ข้อยืนยันเหนือมันอ่านแถวกับ combobox ซึ่งมัตแตนต์ไม่แตะ · แถวอื่นไม่อ่านข้อความนี้ จึงไม่ตาย |
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import main  # noqa: E402

FILES = {
    "route": "backend/routes/rubrics.js",
    "page": "frontend/src/pages/Rubrics.js",
    "menu": "frontend/src/components/SidebarItem/DeprtAdmin.js",
    "row": "frontend/src/components/rubrics/RubricRow.js",
}

# Kept as a record of a claim proved once against code that no longer exists:
# the criteria-count column went on 14 พ.ย. 2569 by the owner's answer to #276.
SUPERSEDED = {"countnotshown"}

MUTANTS = {
    # Row 1 — a committee member is not asked which curriculum. The picker is
    # drawn for an account holding one, which is the control the row exists to
    # say this account does not see. Re-aimed 16 พ.ย. 2569, when the ternary
    # became `&&` with the statement gone: the same mistake.
    "alwaysadropdown": (
        "page",
        "          {programs.length > 1 && (",
        "          {programs.length > 0 && (",
    ),
    # Row 1, since the owner's answer of 16 พ.ย. 2569 — one curriculum in reach
    # is not stated. The statement the answer took away comes back (#48).
    "statesprogram": (
        "page",
        "            </label>\n"
        "          )}\n",
        "            </label>\n"
        "          )}\n"
        "          {programs.length === 1 && (\n"
        "            <span className=\"flex items-center gap-2 text-sm text-slate-600\">\n"
        "              หลักสูตร\n"
        "              <span className=\"rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900\">\n"
        "                {programs[0].program_name_th}\n"
        "              </span>\n"
        "            </span>\n"
        "          )}\n",
    ),
    # Row 2 — the list is in the stated order, not in the order of the codes.
    "codeorder": (
        "route",
        "          ORDER BY r.display_order ASC, r.rubric_code ASC",
        "          ORDER BY r.rubric_code ASC",
    ),
    # Row 3 — two rubrics claiming the same place are drawn in a settled order.
    # Reversed rather than removed: see the note at the top of the file.
    "tiebreakreversed": (
        "route",
        "          ORDER BY r.display_order ASC, r.rubric_code ASC",
        "          ORDER BY r.display_order ASC, r.rubric_code DESC",
    ),
    # Row 4 — the eleventh rubric is on the second page, and none is on both.
    # Both parameters are still spent, and the arithmetic is what makes this a
    # mutant rather than a crash: a LIMIT that named neither of them would leave
    # the route binding four parameters into a statement that wants two, and
    # every row would die of a 500 including the first. As written the page is
    # always wide enough for the whole list and always starts at the top, so the
    # rows above still read the same order and the paging row is the first to
    # notice that page two is page one again.
    "nopaging": (
        "route",
        "          LIMIT $3 OFFSET $4`,",
        "          LIMIT ($3 + 100) OFFSET ($4 * 0)`,",
    ),
    # Row 5, first half — the label carries how many criteria are behind it.
    "countnotshown": (
        "page",
        "                          {rubric.criteria_count > 0",
        "                          {false",
    ),
    # Row 5, second half — the way in carries the rubric it is on. The door is
    # still there and still says the right number; it just leads to the list.
    "linkforgetsrubric": (
        "page",
        "                          to={`/main/rubrics/${rubric.id}/criteria`}",
        "                          to=\"/main/rubrics\"",
    ),
    # Row 6, first half — the rubric that was added is there afterwards. The
    # POST still happens and still answers 201; what stops is the list being
    # read again, so the screen keeps showing the page it drew before the save.
    # Re-aimed by #242 on 28 October 2569, which put the hand-over inside
    # `showing.current === sent`. The replacement keeps that guard: this mutant
    # is for the sentence being said before the read draws (#203).
    "staleafterasave": ("page",
        "      if (showing.current === sent) {\n"
        "        waiting.current = { of: readOf(onPage.current, program), said }\n"
        "      }\n"
        "      const drawing = onScreen.current\n"
        "      await drawing(() => onScreen.current === drawing)\n",
        "      if (showing.current === sent) setNotice(said)\n"),
    # Row 6, second half — the edit is saved. Creation still writes the name, so
    # every row up to this one is untouched, and the add half of the row above
    # still passes; the edit is the first thing that notices.
    #
    # The value that is bound is what changes, not the statement that binds it:
    # $3 stays referenced and stays spent, the PUT still answers 200, and the
    # name it writes is simply the name that was already there. Silencing the
    # assignment instead — `rubric_name_th = rubric_name_th` — leaves $3
    # referenced nowhere while six values are still passed, and PostgreSQL
    # answers 42P18 rather than a default: the PUT 500s and the row dies of a
    # crash. That is `nopaging`'s trap in a second place.
    "editnotsaved": (
        "route",
        "          existing.id,\n          draft.values.rubric_code,\n          draft.values.rubric_name_th,",
        "          existing.id,\n          draft.values.rubric_code,\n          existing.rubric_name_th,",
    ),
    # Row 7 — a code held by a curriculum this account cannot see is refused,
    # and the sentence says why. The refusal still happens and still answers
    # 409; what it stops saying is the one thing the person can act on.
    "wrongduplicatesentence": (
        "route",
        "        return res.status(409).json({ message: REFUSALS.duplicateRubricCode });\n      }\n      return next(error);\n    }\n  });\n\n  /**\n   * Changing one",
        "        return res.status(409).json({ message: REFUSALS.invalidRubric });\n      }\n      return next(error);\n    }\n  });\n\n  /**\n   * Changing one",
    ),
    # Row 8 — the filter narrows to one curriculum. The reach still holds, so
    # nothing leaks; the control simply stops controlling anything.
    "nofilter": (
        "route",
        "                       AND ($2::text IS NULL OR r.program_id = $2)`;",
        "                       AND ($2::text IS NULL OR TRUE)`;",
    ),
    # Row 9 — removal asks first, and answering no changes nothing.
    "hardcancel": (
        "page",
        "        onConfirm={confirmRemoval}\n        onCancel={() => {\n          setNotice(null)\n          setRemoving(null)\n        }}",
        "        onConfirm={confirmRemoval}\n        onCancel={confirmRemoval}",
    ),
    # Row 10 — the removal says how many criteria went with the rubric. They
    # still go: what stops is the screen being able to say so.
    "criterianotcounted": (
        "route",
        "          criteria_removed: counted.rows[0].total,",
        "          criteria_removed: 0,",
    ),
    # Row 11 — the accounts this screen is not for are refused it. #79 in one
    # line, put back the way the ticket's seventh criterion wrote it.
    "facultyadmin": (
        "route",
        "const MAINTAINERS = ['PROG_MANAGER'];",
        "const MAINTAINERS = ['PROG_MANAGER', 'FACULTY_ADMIN'];",
    ),
    # #276 - the owner's answer made to run backwards (#115): the departmental
    # administrator a maintainer again, as the code was the day before.
    "deptadminkept": (
        "route",
        "const MAINTAINERS = ['PROG_MANAGER'];",
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
    ),
    # #276 - the menu entry put back while the route still refuses, so the
    # only row that can notice is the one that counts the menu.
    "deptadminmenu": (
        "menu",
        "        icon: <HiOutlineBookOpen />,\n      },\n",
        "        icon: <HiOutlineBookOpen />,\n      },\n"
        "      {\n"
        "        key: 'ข้อมูล Rubric กลาง',\n"
        "        label: 'ข้อมูล Rubric กลาง',\n"
        "        path: '/main/rubrics',\n"
        "        icon: <HiOutlineBookOpen />,\n"
        "      },\n",
    ),
    # #276 - the add row opens at 1 rather than at the order the server said
    # comes next.
    "addignoresnextorder": (
        "page",
        "setEditing({ display_order: data.next_order ?? 1 })",
        "setEditing({ display_order: 1 })",
    ),
    # #276 - the add row's ยกเลิก does nothing.
    "addcancelkept": (
        "page",
        "\n      onCancel={cancel}\n    />\n  )",
        "\n      onCancel={() => {}}\n    />\n  )",
    ),
    # #276 - the edit row's ยกเลิก does nothing; the add row's still closes.
    "editcancelkept": (
        "page",
        "                    onCancel={cancel}\n",
        "                    onCancel={() => {}}\n",
    ),
    # #276 - the add row drawn under the list instead of above it.
    "addrowatbottom": [
        ("page",
         "            {editing && !editing.id && row}\n",
         ""),
        ("page",
         "          </tbody>",
         "            {editing && !editing.id && row}\n          </tbody>"),
    ],
    # #276 - English before Thai. Re-aimed 14 พ.ย. 2569, when the owner gave
    # each language its own column: the same mistake, made to the two cells
    # instead of to the two spans of one.
    "namesswapped": (
        "page",
        "                    <td className=\"px-4 py-2\">{rubric.rubric_name_th}</td>\n"
        "                    <td className=\"px-4 py-2 text-slate-500\">{rubric.rubric_name_en}</td>",
        "                    <td className=\"px-4 py-2 text-slate-500\">{rubric.rubric_name_en}</td>\n"
        "                    <td className=\"px-4 py-2\">{rubric.rubric_name_th}</td>",
    ),
    # #276 - an account holding two curricula starts on the last one. One
    # curriculum reads the same either way, so only the two-curricula row sees it.
    "lastprogramfirst": (
        "page",
        "    : programs[0]?.program_id ?? ''",
        "    : programs[programs.length - 1]?.program_id ?? ''",
    ),
    # The review of 14 พ.ย. 2569 (#276) - the add button live while the drawn
    # list is another curriculum's.
    "addduringload": (
        "page",
        "            disabled={data.of !== program}\n",
        "",
    ),
    # The same review - the row's own flag, which the row drawn anew does not
    # carry: the code as it stood before the review, word for word.
    # #276's third owner's answer (ก, 14 พ.ย. 2569), with the option that kept
    # today's behaviour made to run (#48): the add row is never told which
    # curriculum its order came from, so the switch leaves the old order in it.
    "addorderkept": (
        "page",
        "              addOrderOf.current = data.of\n",
        "",
    ),
    "rowownsitsflag": [
        ("row",
         "import { FaSave } from 'react-icons/fa'\n",
         "import { useState } from 'react'\nimport { FaSave } from 'react-icons/fa'\n"),
        ("row",
         "export default function RubricRow({ draft, onChange, busy, sending, onSave, onCancel }) {\n",
         "export default function RubricRow({ draft, onChange, busy, onSave, onCancel }) {\n"
         "  const [sending, setSending] = useState(false)\n"),
        ("row",
         "    event.preventDefault()\n    onSave({\n",
         "    event.preventDefault()\n    setSending(true)\n    onSave({\n"),
        ("row",
         "      display_order: draft.display_order,\n    })\n",
         "      display_order: draft.display_order,\n    }).finally(() => setSending(false))\n"),
    ],
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
