# -*- coding: utf-8 -*-
"""#228 ช่องของฟอร์มที่ส่งการบันทึกไป กับช่องของฟอร์มที่ไม่ได้ส่งอะไร

    python mutation/228-the-form-that-sent-the-save.py save
    python mutation/228-the-form-that-sent-the-save.py <mutant>
    python mutation/228-the-form-that-sent-the-save.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/228a-the-form-that-sent-the-save.spec.js`

    cd e2e && npx playwright test tests/228a-the-form-that-sent-the-save.spec.js
สามแถว จอละแถว · ใบ `docs/acceptance/14-departments.md`, `15-programs.md`
และ `16-subjects.md`

## สิ่งที่เจ้าของงานตัดสิน และสิ่งที่การวัดเปลี่ยน

คำตอบแรกเมื่อ 26 ต.ค. 2569 คือ *ปิดทุกตัวควบคุมทั้งห้าจอ* ด้วย `busy` อย่างที่
`ProgramSubjectForm.js` กับ `PloForm.js` เป็นมาตลอด สิ่งที่ส่งคำตอบนั้นกลับไปคือ
ราคาที่วัดจาก**การกด** ไม่ใช่จากข้ออ้าง (#199, #221): **19 แถวในสองใบที่ปิดแล้ว
จัดสถานการณ์ของตัวเองด้วยการกด *ยกเลิก* ขณะที่การบันทึกยังค้างอยู่บนสามจอนี้** —
`cancelDuringSave` ของ `142a` ชี้สามจอนี้พอดี (3 แถว) และ `saveAndCancel` ของ
`146a` เป็นการจัดสถานการณ์ของบล็อกผู้ดูแลทั้งบล็อก (ภาควิชา 6 หลักสูตร 5 รายวิชา 5)
สามแถวจาก 19 นั้นไปไกลกว่านั้น คือ**พิมพ์ลงฟอร์มที่สองขณะที่การเขียนแรกยังค้างอยู่**
อีกครึ่งของการสำรวจนั้น — แถวที่พิมพ์ลงช่องของฟอร์มที่ **การบันทึกของมันเอง** ยังค้างอยู่
ซึ่งเป็นแถวที่การแก้นี้จะหัก — ตอบด้วยชุดเต็ม ไม่ใช่ด้วย grep: 853 ผ่าน 0 ล้ม เมื่อ
26 ต.ค. 2569 โดยสามจอนี้ปิดช่องแล้ว จึงไม่มีแถวไหนทำอย่างนั้น
ซึ่ง `busy` บนช่องกรอกอย่างเดียวก็หักไปแล้ว เพราะ `busy` เป็นธงของ*หน้า* ไม่ใช่ของ
*ฟอร์มที่ส่งการบันทึกไป* คำตอบที่สองจึงเป็นทางที่ B — ธงของฟอร์มเอง และ *ยกเลิก*
ไม่ถือธงอะไรเลย ซึ่งเป็นรูปที่ทำให้ทั้งสองใบที่ปิดแล้วยังยืนอยู่ (#152)

## มัตแตนต์

สามตัวต่อแฟ้ม เพราะแถวของแต่ละจออ่านสามข้ออ้างเรียงกัน และแถวรายงานข้อยืนยัน
**ตัวแรก**ที่ตาย ข้ออ้างที่เขียนใต้ข้ออ้างอื่นจึงไม่มีอะไรพิสูจน์ถ้าไม่มีมัตแตนต์ของ
ตัวเอง (#88)

| ชื่อ | สิ่งที่มันทำ | สิ่งที่มันฆ่า |
|---|---|---|
| `deptstatuslive` | เอา `disabled={sending}` ออกจากช่องสถานะของ `DepartmentForm.js` คือโค้ดก่อนตั๋วนี้เป๊ะ ๆ ที่ช่องที่ตั๋วตั้งชื่อตาม | ข้ออ้างที่ 1 ของแถวภาควิชา |
| `deptnamedlive` | เอาออกจากช่องชื่อ (ไทย) ของแฟ้มเดียวกัน | ข้ออ้างที่ 2 ของแถวภาควิชา |
| `deptnamedpagewide` | ให้ช่องชื่อ (ไทย) อ่าน `busy` แทน `sending` คือทางที่ A ที่ถูกปฏิเสธ ทำให้รันได้ (#48) | ข้ออ้างที่ 4 ของแถวภาควิชา |
| `programstatuslive` | เช่นเดียวกันใน `ProgramForm.js` | ข้ออ้างที่ 1 ของแถวหลักสูตร |
| `programnamedlive` | เช่นเดียวกัน | ข้ออ้างที่ 2 ของแถวหลักสูตร |
| `programnamedpagewide` | เช่นเดียวกัน | ข้ออ้างที่ 4 ของแถวหลักสูตร |
| `subjectstatuslive` | เช่นเดียวกันใน `SubjectForm.js` | ข้ออ้างที่ 1 ของแถวรายวิชา |
| `subjectnamedlive` | เช่นเดียวกัน | ข้ออ้างที่ 2 ของแถวรายวิชา |
| `subjectnamedpagewide` | เช่นเดียวกัน | ข้ออ้างที่ 4 ของแถวรายวิชา |

สามตัวที่ชื่อลงท้าย `pagewide` เป็นข้อเสนอที่ถูกปฏิเสธที่ถูกทำให้รัน ซึ่งเป็นสิ่งเดียวที่
ทำให้ *เราเลือกอีกทางหนึ่ง* กลายจากประโยคบนใบเป็นข้ออ้างที่ชุดทดสอบถืออยู่ (#48)
และอีกหกตัวเป็นโค้ดที่ตั๋ววินิจฉัย ซึ่งเป็นฝาแฝดของกฎนั้น (#115)

ไม่มีมัตแตนต์ของ *ยกเลิก* เพราะข้ออ้างที่ 3 — *ยกเลิก* ยังกดได้ — ถูกถือไว้โดย
`142a` กับ `146a` ทั้ง 19 แถวอยู่แล้ว ตัวที่จะพิสูจน์มันคือ `disabled={busy}` บน
*ยกเลิก* ซึ่งจะฆ่า 19 แถวในสองแฟ้มอื่น ไม่ใช่ข้ออ้างของแถวนี้: มัตแตนต์ต้องฆ่าแถวหนึ่ง
แล้วปล่อยที่เหลือยืนอยู่ได้ (#97) ข้ออ้างที่ 3 จึงเป็น**ตัวตรวจว่าราคานั้นยังไม่ถูกจ่าย**
ไม่ใช่ข้ออ้างใหม่ และสิ่งที่มันค้ำคือการที่สามแถวของแฟ้มนี้ไปถึงข้ออ้างที่ 4 ได้เลย

ไม่มีมัตแตนต์ของ `hint` เพราะถ้อยคำของมันเป็นแถวเดินมือบนสามใบ อย่างที่รูปและถ้อยคำ
ของตัวควบคุมเองเป็นมาตั้งแต่ #180 — ซึ่งเป็นเหตุผลเดียวกับที่
`180-the-status-field-shape.py` ไม่มีมัตแตนต์ของตัวเลือกในช่องนั้น

## ตอนกวาด

สามแฟ้มนี้อยู่ใน `180-the-status-field-shape.py` (ภาควิชา กับ หลักสูตร),
`181-the-status-switch.py` (ทั้งคู่) และ `16-subjects.py` (รายวิชา) ด้วย เส้นทางที่
ซ้ำกันทำให้การกวาดเสีย จึงเทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง และอย่ากวาดใบนี้
ข้างสามใบนั้น (#85, #87, #125)
"""
from harness import main

FILES = {
    'department': 'frontend/src/components/departments/DepartmentForm.js',
    'program': 'frontend/src/components/programs/ProgramForm.js',
    'subject': 'frontend/src/components/subjects/SubjectForm.js',
}

# The status select's own `disabled`, anchored on the end of the inline
# `onChange` above it rather than on the Thai option beneath it: the three forms
# write `disabled={sending}` on every field, so the line alone is not unique,
# and the Thai is not what makes this site the status field (#140).
STATUS_OPEN = "                }))\n              }\n              disabled={sending}\n"
STATUS_LIVE = "                }))\n              }\n"

MUTANTS = {
    # 1 — the status field the ticket is named for, live while the save it sent
    # is out: the code as it stood before 26 October 2569.
    'deptstatuslive': ('department', STATUS_OPEN, STATUS_LIVE),

    # 2 — a text box of the same form, which is the claim written below the one
    # above and so proved by nothing without its own mutant (#88).
    'deptnamedlive': ('department',
                      "              onChange={set('department_name_th')}\n"
                      "              disabled={sending}\n",
                      "              onChange={set('department_name_th')}\n"),

    # 4 — the declined option made to run (#48): the page's flag in place of the
    # form's, which closes a form that sent nothing while another's write is out.
    'deptnamedpagewide': ('department',
                          "              onChange={set('department_name_th')}\n"
                          "              disabled={sending}\n",
                          "              onChange={set('department_name_th')}\n"
                          "              disabled={busy}\n"),

    'programstatuslive': ('program', STATUS_OPEN, STATUS_LIVE),

    'programnamedlive': ('program',
                         "              onChange={set('program_name_th')}\n"
                         "              disabled={sending}\n",
                         "              onChange={set('program_name_th')}\n"),

    'programnamedpagewide': ('program',
                             "              onChange={set('program_name_th')}\n"
                             "              disabled={sending}\n",
                             "              onChange={set('program_name_th')}\n"
                             "              disabled={busy}\n"),

    'subjectstatuslive': ('subject', STATUS_OPEN, STATUS_LIVE),

    'subjectnamedlive': ('subject',
                         "              onChange={set('subject_name_th')}\n"
                         "              disabled={sending}\n",
                         "              onChange={set('subject_name_th')}\n"),

    'subjectnamedpagewide': ('subject',
                             "              onChange={set('subject_name_th')}\n"
                             "              disabled={sending}\n",
                             "              onChange={set('subject_name_th')}\n"
                             "              disabled={busy}\n"),
}

main(FILES, MUTANTS)
