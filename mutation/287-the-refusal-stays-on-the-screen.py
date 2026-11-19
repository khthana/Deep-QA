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
}

main(FILES, MUTANTS)
