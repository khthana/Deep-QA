# -*- coding: utf-8 -*-
"""#315 ปุ่มเพิ่มหลักของทุกหน้าวาดผ่าน `PageHeader` — สถานะปิดของปุ่ม

    python mutation/315-the-main-add-in-the-page-header.py save
    python mutation/315-the-main-add-in-the-page-header.py <mutant>
    python mutation/315-the-main-add-in-the-page-header.py restore

คำตอบของเจ้าของงาน 27 พ.ย. 2569 (`docs/ui-consistency.md` ข้อ 6) · ใบรับงาน `docs/acceptance/315-page-header-add.md`

    cd e2e && npx playwright test tests/21a-rubrics.spec.js tests/279a-the-term-picker.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

`PageHeader` รับ `addDisabled` เป็นของใหม่ของ #315 — สองหน้าส่งมัน (Rubrics ระหว่างรายการที่วาดเป็นของหลักสูตรอื่น ·
Offerings ก่อนรู้ภาค) และแต่ละหน้ามีมัตแตนต์ของตัวเองที่เอา prop ออกที่หน้า (`21:addduringload` · `279:s279openbeforeterm`
re-aim วันเดียวกัน) · ตัวนี้เอามันออกที่คอมโพเนนต์ ซึ่งเป็นที่เดียวที่ทั้งสองหน้าผ่าน: ข้ออ้างว่าทางเข้าของทั้งสองไปถึง
ปุ่มจริง (#191)

## ตารางคำทำนาย (เขียนก่อนกวาด 27 พ.ย. 2569 และ commit ก่อนการรัน)

ยังไม่ได้รัน — รอรอบ e2e รวม #336 ตามที่เจ้าของงานขอ

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s315nodisabled` | `21a` *the add row is not offered while another curriculum is read, and starts from that one* · `279a` *row 8: before the terms are known nothing that needs a term can be pressed* | `21a` ที่ `await expect(add).toBeDisabled()` · `279a` ที่ *the form, which opens a subject in the term shown* — ตัวเลือกภาคและปุ่มคัดลอกไม่ได้วาดผ่าน `PageHeader` จึงผ่านสองบรรทัดก่อน | แถวอื่นของ `21a` และ `279a` ทั้งหมด — กดปุ่มเพิ่มหลังรายการวาดแล้วหรือหลังรู้ภาคแล้ว ซึ่งปุ่มเปิดอยู่ทั้งก่อนและหลังมัตแตนต์ |
"""

from harness import main

FILES = {
    'header': 'frontend/src/components/PageHeader.js',
}

MUTANTS = {
    # The button is live whatever the screen says - the prop reaches nothing.
    's315nodisabled': ('header',
        '              disabled={addDisabled}\n',
        ''),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
