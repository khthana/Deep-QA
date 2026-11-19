# -*- coding: utf-8 -*-
"""#287 — เกณฑ์ข้อแปดของใบ 23: ครึ่งของจอ คือแถบแดงของ server และแถวที่ยังอยู่หลังการปฏิเสธ

    python mutation/287-the-refusal-stays-on-the-screen.py save
    python mutation/287-the-refusal-stays-on-the-screen.py <mutant>
    python mutation/287-the-refusal-stays-on-the-screen.py restore

แถวที่มันเล็งคือ `e2e/tests/23a-offerings.spec.js` *row 8: an Offering with enrolled students is refused and stays on the screen*
ใบ `docs/acceptance/23-offerings.md` §#287 · กวาดกับ `23a` และ spec อื่นที่กด *ยกเลิกการเปิด*:

    cd e2e && npx playwright test tests/23a-offerings.spec.js tests/118a-thai-line-breaks.spec.js tests/139a-superseded-row-detail.spec.js tests/140a-superseded-handler-reload.spec.js tests/142a-busy-outlives-a-superseded-read.spec.js tests/203a-the-refusal-wins-on-the-admin-screens.spec.js tests/210a-the-pager-while-a-write-is-out-on-the-administration-screens.spec.js tests/250a-the-window-that-draws-no-rows.spec.js tests/271a-action-icons.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237) · ทั้งสองตัวแก้ซอร์สของ CRA อย่าใส่ขณะที่ e2e กำลังรัน

## มัตแตนต์

ตั้งแต่ #281 เกณฑ์ข้อแปดเป็น ☑ เพราะมัตแตนต์ฝั่ง server ตัวเดียวทำให้ `23a` แดงไม่ได้ (สอง guard ให้ประโยคเดียวกัน #97)
ครึ่งที่เป็นของจอไม่ขึ้นกับว่า guard ตัวไหนปฏิเสธ จึงเล็งที่จอ ทั้งสองตัวอยู่ในกิ่ง *การเปิดสอน* ของ `catch` ของ `confirmRemoval`
จึงถึงได้เฉพาะการยกเลิกการเปิดที่ถูกปฏิเสธ กิ่งกลุ่มเรียน การยกเลิกที่สำเร็จ และการอ่านทุกอย่างไม่ถูกแตะ (#97, #102)

- `s287genericrefusal` — จอพูดประโยคทั่วไปแทนประโยคของ server เฉพาะเมื่อการยกเลิกการเปิดถูกปฏิเสธ
- `s287rowtakenaway` — จอเอาแถวออกจากรายการเมื่อการยกเลิกการเปิดถูกปฏิเสธ แถบแดงยังพูดถูก แต่ตารางบอกว่าแถวหายไปแล้ว

## คำทำนาย (19 พ.ย. 2569) — เขียนก่อนรัน (#255)

`23a` เป็น `serial` แถวหลังแถวที่ตายจึงไม่ได้รัน แถวที่เล็งมีสองข้อยืนยันเรียงกัน คือแถบแดงก่อน แถวที่ยังอยู่หลัง (#233: ตัวที่เอาแถวออก
ไม่แตะแถบแดง จึงไม่ตายที่ข้อบน) spec อื่นแปดไฟล์ไม่มีแถวใดอ่านประโยค `offeringInUse` หรือยกเลิกการเปิดที่ถูกปฏิเสธเท่าที่อ่านโค้ด จึงทำนายว่าผ่าน

| มัตแตนต์ | แถวที่ตาย | ตายที่ (คำทำนาย) | แถวที่ควรรอด |
|---|---|---|---|
| `s287genericrefusal` | `23a` *row 8: an Offering with enrolled students is refused and stays on the screen* | `expect(page.getByText(REFUSALS.offeringInUse)).toBeVisible()` | `23a` แถวก่อนแถว 8 ทั้งหมด · `118a` `139a` `140a` `142a` `203a` `210a` `250a` `271a` ทั้งไฟล์ |
| `s287rowtakenaway` | `23a` *row 8: an Offering with enrolled students is refused and stays on the screen* | `expect(offeringRow(page, SEEDED)).toHaveCount(1)` — แถบแดงเหนือมันผ่าน | เหมือนข้างบน |

ผลการกวาด (19 พ.ย. 2569, เก้าไฟล์) — ทั้งสองคำทำนายตรง:

- `s287genericrefusal` ล้ม 1 ไม่ได้รัน 1 ผ่าน 157 ที่ `23a-offerings.spec.js:250` `toBeVisible()` ของ `REFUSALS.offeringInUse` (element(s) not found)
- `s287rowtakenaway` ล้ม 1 ไม่ได้รัน 1 ผ่าน 157 ที่ `23a-offerings.spec.js:254` `toHaveCount(1)` (Received: 0) — แถบแดงที่ :250 ผ่าน

## สองตัวของครึ่งกลุ่มเรียน และคำทำนาย (19 พ.ย. 2569) — เขียนก่อนรัน (#255)

เกณฑ์ข้อแปดพูดถึง *ทั้งระดับการเปิดสอนและระดับกลุ่มเรียน* และข้อยืนยันของกลุ่มเรียนในแถว 8 อยู่ใต้ของการเปิดสอน สองตัวข้างบนจึงไม่เคย
ทำให้มันถูกอ่าน (#88) ⚙ ที่อ้างแค่สองตัวนั้นจะเกินครึ่งหนึ่งของแถว จึงเขียนคู่ของมันในกิ่งกลุ่มเรียนของ `catch` เดียวกัน

- `s287sectiongeneric` — ประโยคทั่วไปแทนประโยคของ server เฉพาะเมื่อการลบกลุ่มเรียนถูกปฏิเสธ
- `s287cardtakenaway` — การ์ดกลุ่มเรียนหายจากแผงเมื่อการลบถูกปฏิเสธ แทนการอ่านแผงกลับ (`refresh`)

กวาดกับ `23a` และ spec อื่นที่กด *ลบกลุ่มเรียน* (`139a` `143a`) ซึ่งลบกลุ่มเรียนที่ลบได้ จึงไม่ถึงกิ่งนี้

| มัตแตนต์ | แถวที่ตาย | ตายที่ (คำทำนาย) | แถวที่ควรรอด |
|---|---|---|---|
| `s287sectiongeneric` | `23a` *row 8: an Offering with enrolled students is refused and stays on the screen* | `expect(page.getByText(REFUSALS.sectionInUse)).toBeVisible()` — สองข้อของการเปิดสอนเหนือมันผ่าน | `23a` แถวอื่น · `139a` `143a` ทั้งไฟล์ |
| `s287cardtakenaway` | `23a` *row 8: an Offering with enrolled students is refused and stays on the screen* | `expect(sectionCard(page, '1')).toHaveCount(1)` — แถบแดงของกลุ่มเรียนเหนือมันผ่าน | เหมือนข้างบน |
"""
from harness import main

FILES = {
    "page": "frontend/src/pages/Offerings.js",
}

CATCH = (
    "      const wasSection = removing.kind === 'section'\n"
    "      setRemoving(null)\n"
    "      report(error)\n"
)

MUTANTS = {
    # The server's sentence replaced by a generic one, on the Offering branch
    # only: `error` stays referenced on the section branch (#101).
    "s287genericrefusal": ("page",
        CATCH,
        "      const wasSection = removing.kind === 'section'\n"
        "      setRemoving(null)\n"
        "      report(wasSection ? error : { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' })\n"),
    # The refused Offering taken off the list as if it had gone. The banner
    # still says the server's sentence; what lies is the table.
    "s287rowtakenaway": ("page",
        CATCH,
        "      const wasSection = removing.kind === 'section'\n"
        "      setRemoving(null)\n"
        "      if (!wasSection) {\n"
        "        const gone = removing.offering.id\n"
        "        setData(d => ({ ...d, offerings: d.offerings.filter(o => o.id !== gone) }))\n"
        "      }\n"
        "      report(error)\n"),
    # The section branch's twins. `error` stays referenced on the Offering
    # branch (#101).
    "s287sectiongeneric": ("page",
        CATCH,
        "      const wasSection = removing.kind === 'section'\n"
        "      setRemoving(null)\n"
        "      report(wasSection ? { message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' } : error)\n"),
    # The refused section's card dropped from the panel instead of the panel
    # being read back. `refresh` and `ask` stay referenced by the success path.
    "s287cardtakenaway": ("page",
        "      if (wasSection && viewing) await refresh(viewing.id, ask).catch(report)\n",
        "      if (wasSection && viewing) {\n"
        "        const gone = removing.section.section_id\n"
        "        setViewing(v => ({ ...v, sections: v.sections.filter(s => s.section_id !== gone) }))\n"
        "      }\n"),
}

main(FILES, MUTANTS)
