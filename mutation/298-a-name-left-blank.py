# -*- coding: utf-8 -*-
"""#298 — ชื่อที่ว่าง: ฟอร์มที่ค้างเมื่อบันทึก คำถามลบที่พิมพ์ null และตัวเลือกหลักสูตรที่ไม่มีข้อความ

    python mutation/298-a-name-left-blank.py save
    python mutation/298-a-name-left-blank.py <mutant>
    python mutation/298-a-name-left-blank.py restore

ข้อ 1 เป็นข้อบกพร่อง: `ProgramForm` และ `DepartmentForm` ตั้งฟอร์มด้วย `{ ...EMPTY, ...value }` ซึ่ง `null` ที่ route เขียนเอง
(`blankToNull`) ทับ `''` และ `submit` เรียก `.trim()` บนมันหลัง `sending` ขึ้นแล้ว · ข้อ 2 และ 3 คือคำตอบของเจ้าของงาน
(21 พ.ย. 2569): หน่วยที่ไม่มีชื่อไทยอ่านด้วยคำบอกชนิดกับรหัส และคำถามลบตัดชื่อที่ไม่มีออก

มัตแตนต์อยู่ที่จุดเรียก (#104) หนึ่งตัวต่อจุดที่มีแถว (#125) · ตัวเลือกหลักสูตรสิบเอ็ดจุดกับสามจุดที่วาดข้างป้ายกำกับใช้กลไกเดียวกัน
แถวเบราว์เซอร์และมัตแตนต์พิสูจน์จุดของ `Plos.js` จุดเดียว ส่วนอีกสิบสามจุดถือด้วย census `frontend/scripts/nameless-units.js` (#298)
ซึ่งแถวของมันบนชีตเป็น ☐ ไม่ใช่ ⚙

## ตารางคำทำนาย (เขียนก่อนกวาด 21 พ.ย. 2569, #255)

| มัตแตนต์ | สิ่งที่มันทำ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|---|
| `programseedednull` | ฟอร์มหลักสูตรตั้งด้วย `null` อีกครั้ง คือโค้ดก่อนใบนี้ (#115) | `298a` 1 | `getByRole('heading', { name: 'แก้ไขหลักสูตร' })).toBeHidden()` | `298a` 2–5 |
| `departmentseedednull` | ฟอร์มภาควิชาแบบเดียวกัน | `298a` 2 | `getByRole('heading', { name: 'แก้ไขภาควิชา' })).toBeHidden()` | `298a` 1, 3–5 |
| `departmentquestionnull` | คำถามลบภาควิชาพิมพ์ชื่อเปล่าอีกครั้ง | `298a` 3 | `toContain('ต้องการลบภาควิชา 05 ใช่หรือไม่')` | `298a` 1, 2, 4, 5 |
| `programquestionnull` | คำถามลบหลักสูตรแบบเดียวกัน | `298a` 4 | `toContain('ต้องการลบหลักสูตร 0501 ใช่หรือไม่')` | `298a` 1–3, 5 |
| `plosbarename` | ตัวเลือกหลักสูตรของจอ PLO วาดชื่อเปล่า | `298a` 5 | `toHaveText('หลักสูตร 0501')` | `298a` 1–4 |
| `plosprogramcodealone` | ตัวเลือกนั้นตกกลับเป็นรหัสเปล่า คือทางเลือกที่เจ้าของงานไม่เลือก (#48) | `298a` 5 | `toHaveText('หลักสูตร 0501')` | `298a` 1–4 |

**บันทึกผลกวาด (21 พ.ย. 2569, คอมมิต `08ca6aa`, `298a` ทีละตัว):** ทั้งหกตัวตายที่แถวและบรรทัดที่ทำนาย และแถวอื่นทั้งสี่ผ่านทุกครั้ง · `programseedednull` `departmentseedednull` ที่ `toBeHidden()` ของแถว 1 และ 2 · `departmentquestionnull` `programquestionnull` ที่ `toContain('ต้องการลบ…')` ของแถว 3 และ 4 · `plosbarename` และ `plosprogramcodealone` ที่ `toHaveText('หลักสูตร 0501')` ของแถว 5
"""
from harness import main

FILES = {
    'programform': 'frontend/src/components/programs/ProgramForm.js',
    'departmentform': 'frontend/src/components/departments/DepartmentForm.js',
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
    'plos': 'frontend/src/pages/Plos.js',
}

SEEDED = "      ...Object.fromEntries(Object.entries(value ?? {}).map(([key, held]) => [key, held ?? ''])),\n"

MUTANTS = {
    # The code before #298, at each form (#115, #125).
    'programseedednull': ('programform', SEEDED, '      ...value,\n'),
    'departmentseedednull': ('departmentform', SEEDED, '      ...value,\n'),
    'departmentquestionnull': ('departments',
        "${removing.department_id}${removing.department_name_th ? ` ${removing.department_name_th}` : ''}",
        '${removing.department_id} ${removing.department_name_th}'),
    'programquestionnull': ('programs',
        "${removing.program_id}${removing.program_name_th ? ` ${removing.program_name_th}` : ''}",
        '${removing.program_id} ${removing.program_name_th}'),
    'plosbarename': ('plos',
        '                      {programNamed(entry)}\n',
        '                      {programNamed && entry.program_name_th}\n'),
    # The option the owner did not take, made to run (#48).
    'plosprogramcodealone': ('plos',
        '                      {programNamed(entry)}\n',
        '                      {programNamed && (entry.program_name_th || entry.program_id)}\n'),
}

main(FILES, MUTANTS)
