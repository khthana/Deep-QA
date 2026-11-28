# -*- coding: utf-8 -*-
"""#336 Escape ไม่ทำงานเฉพาะเมื่อการบันทึกของ*ฟอร์มนั้นเอง*ยังค้าง — ข้อมูลภาควิชา และข้อมูลหลักสูตร

    python mutation/336-escape-is-this-forms.py save
    python mutation/336-escape-is-this-forms.py <mutant>
    python mutation/336-escape-is-this-forms.py restore

คำตอบของเจ้าของงาน 28 พ.ย. 2569 (ถามใน #336): `FormDialog` ได้ `saving` เป็นธง `writing` ทั้งหน้า ซึ่งยกขึ้นด้วย
การบันทึกที่ค้างอยู่หลังกด ยกเลิก (ปุ่มนั้นว่างระหว่างการบันทึก #228 #249) และด้วยการลบที่ถูกกักที่ route — ฟอร์มที่เปิด
ทีหลังและยังไม่ได้ส่งอะไรเลยจึงกด Escape ไม่ได้ เจ้าของงานเลือก *เฉพาะฟอร์มนั้นเอง* จึงถือ `savingOf` คือ `showing`
ของการเปิดที่ส่งการบันทึกออกไป เป็นกุญแจไม่ใช่ธง (#185 #249)

    cd e2e && npx playwright test tests/319a-the-department-form-in-a-dialog.spec.js tests/320a-the-programme-form-in-a-dialog.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

สองข้ออ้างต่อจอ จอละหนึ่งตัว เพราะโค้ดถูกลอกไม่ได้ใช้ร่วม (#83 #125):

- `s336…pagewide` คือรูปก่อนคำตอบ — ธงทั้งหน้ากลับไปเป็น `saving` คือทางเลือกที่เจ้าของงานไม่เลือก ทำให้วิ่ง (#48)
- `s336…nevercleared` คือกุญแจที่ไม่ถูกปลดเมื่อการบันทึกตอบ — Escape ตายไปตลอดการเปิดนั้น

## ตารางคำทำนาย (เขียนก่อนกวาด 28 พ.ย. 2569 และ commit ก่อนการรัน)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s336departmentspagewide` | `319a` *row 5* | `'Escape in a form whose own save is not out'` — `writing` ยังขึ้นจากการบันทึกของการเปิดก่อน | `319a` row 3: ระหว่างการบันทึกของการเปิดนั้นเอง ธงทั้งหน้ากับกุญแจตอบเหมือนกัน และหลังตอบลงทั้งคู่ · row 1 กด Escape ตอนไม่มีอะไรค้าง · row 2 และ row 4 ไม่กด Escape |
| `s336departmentsnevercleared` | `319a` *row 3* | `'Escape once it has answered'` | `319a` row 5: กุญแจค้างอยู่ที่การเปิดแก้ไข ส่วนฟอร์มเพิ่มเป็นการเปิดใหม่ (`showing.current = {}`) จึงกด Escape ได้ · row 1 ไม่บันทึก |
| `s336programspagewide` | `320a` *row 4* | `'Escape in a form whose own save is not out'` | `320a` row 3 เหตุผลเดียวกับ `319a` row 3 · row 1 · row 2 |
| `s336programsnevercleared` | `320a` *row 3* | `'Escape once it has answered'` — บรรทัดที่ #336 เปลี่ยนจาก ยกเลิก เป็น Escape เพราะก่อนหน้านั้นไม่มีแถวไหนของ `320a` กด Escape หลังการบันทึกตอบ (ทำนายได้ 0) | `320a` row 4 เหตุผลเดียวกับ `319a` row 5 · row 1 · row 2 |
"""

from harness import main

FILES = {
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
}

PAGEWIDE = ('          saving={savingOf !== null && savingOf === showing.current}\n',
            '          saving={writing}\n')
CLEARED = ('      setSavingOf(of => (of === sent ? null : of))\n',
           '      void setSavingOf\n')

MUTANTS = {
    's336departmentspagewide': ('departments',) + PAGEWIDE,
    's336departmentsnevercleared': ('departments',) + CLEARED,
    's336programspagewide': ('programs',) + PAGEWIDE,
    's336programsnevercleared': ('programs',) + CLEARED,
}

if __name__ == '__main__':
    main(FILES, MUTANTS)
