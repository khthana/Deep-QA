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
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import main  # noqa: E402

FILES = {
    "route": "backend/routes/rubrics.js",
    "page": "frontend/src/pages/Rubrics.js",
}

MUTANTS = {
    # Row 1 — a committee member is told which curriculum is theirs. The label
    # becomes the dropdown an administrator gets, which is the control the row
    # exists to say this account does not see.
    "alwaysadropdown": (
        "page",
        "              {programs.length > 1 ? (",
        "              {programs.length > 0 ? (",
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
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN'];",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
