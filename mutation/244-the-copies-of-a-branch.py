# -*- coding: utf-8 -*-
"""#244 — ข้อ `if (editing) return` อีกสามสำเนา และสำเนาที่จอของมันแสดงความต่างไม่ได้

#233 ลงข้อ `if (editing) return` ไว้สี่ฟอร์ม คือครึ่งที่ปล่อยระเบียนที่มีอยู่แล้วไว้ ไม่ให้
effect ที่เลือกค่าให้เองย้ายมันไปอยู่หลักสูตรหรือภาควิชาอื่น และฟอร์มเดียวที่มีแถวถือข้อนี้คือ
`programs/ProgramForm.js` ที่ `233a` แถว 2 กับ `233:movesanexistingprogramme`
(`rubrics/RubricForm.js` มี `198a` แถว 5 กับ `232:movesanexistingrubric`) อีกสามสำเนา
ไม่มีอะไรถือ ซึ่งเป็นสิ่งที่แฟ้มนี้กับ `e2e/tests/244a-the-copies-of-a-branch.spec.js` ทำ —
**โค้ดถูกคัดลอก ไม่ได้ถูกใช้ร่วมกัน ฉะนั้นมัตแตนต์ในฟอร์มหนึ่งไม่มีแถวของฟอร์มอื่นมาพิสูจน์ให้** (#83)

## ตั๋วขอสามมัตแตนต์ และวัดได้สอง

ราคาที่ #244 เขียนไว้คือสามแถวกับสามมัตแตนต์ แถวละตัว · ที่วัดได้คือ**สี่แถวกับสองมัตแตนต์**
สองในสามสำเนาเป็นแถวที่ถือข้ออ้างได้ ตัวที่สามเป็น**ตะแกรง** เพราะจอที่ติดตั้ง `PloForm`
พาฟอร์มไปอยู่ในสถานะที่ข้อนี้พูดถึงไม่ได้ และแถวที่สี่มาจากแถว 2 เพราะสองฟอร์มวาดตัวเลือกของ
หลักสูตรที่ปิดไปแล้วไม่เหมือนกัน (ย่อหน้าท้ายหมวด *ตัวค้ำ*)

`starting` ของทั้ง `PloForm` และ `ProgramSubjectForm` คือ
`defaultProgram || onlyOne?.program_id || ''` และ `defaultProgram` คือตัวกรองของจอแม่ ·
`pages/Plos.js` มีจุดติดตั้งจุดเดียว (`Plos.js:371` วัด 26 ต.ค. 2569) และรายการของมันเป็น
**รายหลักสูตร** — `load` ไม่ถามอะไรเลยขณะที่ยังไม่มีหลักสูตรถูกเลือก และการอ่านคือ
`listPlos({ program_id: program })` — ฉะนั้นทุกข้อที่ตารางมีปุ่ม *แก้ไข* ให้ อยู่ในหลักสูตร
ที่ตัวกรองยืนอยู่ ซึ่งคือค่าที่ `starting` ถือ · สองกิ่งของ effect จึงเขียน `program_id`
ค่าเดียวกัน และมัตแตนต์ที่ลบข้อนี้เป็นมัตแตนต์ที่ไม่มีอะไรมองเห็น (#206 — ถามว่าเลขของแถว
ทำให้อะไรเท่ากัน ก่อนเชื่อว่า *ไม่เคยมีความเสี่ยง* ที่นี่เป็นเลขของจอ ไม่ใช่ของแถว)

`movesanexistingoutcome` ถูกเขียนขึ้นและรันแล้วจริงเพื่อให้ได้ตัวเลขนั้น ไม่ใช่เหตุผลแทนการวัด
(#141 — วัดว่าสร้างได้ไหม ไม่ใช่เถียง) ผลเมื่อ 26 ต.ค. 2569 คือ **ยี่สิบแถวเขียว** — แถว 3
ของแฟ้มนี้ และสิบเจ็ดแถวของ `19a-plos.spec.js` ทั้งแฟ้ม ซึ่งเป็นทุกแถวที่เปิดฟอร์มนั้น
ฉะนั้นมัตแตนต์ตัวนั้น
ถูกเอาออก และแถวถือ**กลไก**ไว้แทนการถือการไม่มี (#203 การอ่านตัวที่เก้าของผู้รอดชีวิต)
พร้อมเงื่อนไขที่จะทำให้มันอ่านได้อีกเขียนไว้บนแถว คือวันที่ `PloForm` ถูกติดตั้งที่จอซึ่ง
`defaultProgram` ต่างจากหลักสูตรของข้อที่กำลังถูกแก้ได้ (#220 — *จุดติดตั้งจุดเดียว*
เป็นข้ออ้างที่มีวันที่เหมือนข้ออื่น)

**ตัวที่ถูกเอาออกยังสร้างขึ้นใหม่ได้จากสองบรรทัดนี้** เพราะการวัดที่สร้างเองอีกครั้งไม่ได้
คือการวัดที่ต้องเชื่อคำบอกเล่า: `'outcome': 'frontend/src/components/plos/PloForm.js'`
ใน `FILES` กับ `'movesanexistingoutcome': [('outcome', PROGRAM_GUARD, PROGRAM_NO_GUARD)]`
ใน `MUTANTS` · สองค่าคงที่นั้นยังอยู่ในแฟ้มนี้ เพราะ `movesanexistingpair` ใช้คู่เดียวกัน
และข้อนี้เขียนเหมือนกันทุกตัวอักษรในสามฟอร์ม สิ่งที่ต่างคือแฟ้มที่มันถูกเล็ง ไม่ใช่ตัวข้อเอง

`pages/ProgramSubjects.js` เป็นรูปเดียวกันโดยมีข้อต่างข้อเดียวที่ตัดสินเรื่องนี้ คือตัวกรอง
ของมันเริ่มที่ `''` และรายการ**ไม่ใช่**รายหลักสูตร ฉะนั้นคู่ที่อยู่ในหลักสูตรที่ปิดไปแล้ว
ถูกวาดอยู่ในรายการขณะที่ `starting` ไม่ใช่หลักสูตรนั้น — ซึ่งแถว 2 อ่านเป็นข้อตั้งของตัวเอง (#51)

## ตัวค้ำ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `movesanexistingsubject` | ข้อ `if (editing) return` ใน `SubjectForm` หายไป คือครึ่งที่ปล่อยรายวิชาที่มีอยู่แล้วไว้ · **เขียน effect ทั้งก้อนใหม่** เพราะ `editing` ต้องออกจาก dependency ด้วย ไม่งั้น `CI=true` เปลี่ยนตัวแปรที่ไม่มีใครอ้างเป็นคอมไพล์ตก ซึ่งเป็นมัตแตนต์ที่หยุดแอป ไม่ใช่ที่ล้มแถว (#101) | `244a` แถว 1 ที่ `the subject still says which department it is in` |
| `movesanexistingpair` | ข้อเดียวกันใน `ProgramSubjectForm` หายไป · แฟ้มนั้นมี `if (editing) return undefined` อีกข้อหนึ่งที่บรรทัด 102 ซึ่งเป็นการหน่วงของการค้นสารบบ ไม่ใช่ตระกูลนี้ จึงยึดด้วย effect ทั้งก้อน | `244a` แถว 2 ที่ `the pair still says which curriculum it is in` และแถว 4 ที่ `the retired curriculum the pair sits in is offered rather than greyed out` — สองแถว ตัวเดียว เพราะทั้งคู่เข้าทางเดียวกันและอ่านของต่างกัน (#191) |

**ทุกแถวผ่านกับโค้ดที่ `HEAD`** ซึ่งคือเหตุที่แต่ละฟอร์มต้องมีมัตแตนต์ของตัวเอง: ข้อที่ถูกวัด
เป็นข้อที่ #233 เพิ่งเพิ่ม ไม่ใช่สิ่งที่โค้ดก่อนหน้านั้นทำผิด ฉะนั้นการรันแถวกับโค้ดที่ยังไม่แก้
ไม่ใช่คำตอบ มัตแตนต์เป็นคำตอบ (#203)

และมัตแตนต์เอาตัวเลือกไปด้วย แต่ไม่เหมือนกันในสองฟอร์ม · `SubjectForm` **กรอง** ตัวเลือกของ
ภาควิชาที่ปิดไปแล้วถูกวาดก็ต่อเมื่อช่องถืออยู่ (`offered`) ฉะนั้นแถว 1 อ่านค่าก่อนแล้วนับตัวเลือก
ทีหลัง ไม่ให้ข้ออ้างของแถวถูกทิ้งไว้ใต้เส้นแดงโดยไม่มีใครอ่าน (#88 · `233a` แถว 2 ลำดับเดียวกัน
ด้วยเหตุเดียวกัน) · `ProgramSubjectForm` **ไม่กรอง** มันจับทุกหลักสูตรเป็นตัวเลือกแล้วตั้ง
`disabled` กับใบที่ปิดไปแล้ว เว้นใบที่ช่องถืออยู่ ฉะนั้นการนับเป็นข้ออ้างที่ไม่มีอะไรทำให้
เสี่ยงได้ (#97) และครึ่งที่ข้อนี้ตัดสินคือ `disabled` ซึ่งเป็นข้ออ้างของแถวหนึ่ง ไม่ใช่บรรทัดใต้
ข้ออ้างของแถว 2 (#88 อ่านจากอีกด้าน) ฉะนั้นมันถูกต่อท้ายแฟ้มเป็นแถว 4 ไม่ใช่แทรกกลาง เพื่อให้
การอ้างถึงแถว 1 ถึง 3 ไม่ขยับ (#97 · #85) · วัดเมื่อ 26 ต.ค. 2569: สะอาด 4 ผ่าน ·
`movesanexistingsubject` 1 ตก 3 ผ่าน · `movesanexistingpair` 2 ตก 2 ผ่าน แต่ละแถวตกที่ข้ออ้าง
ของตัวเอง

## วิธีรัน

    python mutation/244-the-copies-of-a-branch.py save
    python mutation/244-the-copies-of-a-branch.py <mutant>
    python mutation/244-the-copies-of-a-branch.py restore
    cd e2e && npx playwright test tests/244a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'subject': 'frontend/src/components/subjects/SubjectForm.js',
    'pair': 'frontend/src/components/programSubjects/ProgramSubjectForm.js',
}

# The anchors are the code each mutant breaks and never the comment beside it
# (#121, #123). Each guard's text is the same in all four forms of #233's
# family bar the column it reads, so the anchor is unique inside its own file
# and nowhere else — which is what `FILES` is for.

DEPARTMENT_GUARD = """  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.department_id && pool.split(' ').includes(current.department_id)
        ? current
        : { ...current, department_id: starting },
    )
  }, [editing, pool, starting])
"""
DEPARTMENT_NO_GUARD = """  useEffect(() => {
    setDraft(current =>
      current.department_id && pool.split(' ').includes(current.department_id)
        ? current
        : { ...current, department_id: starting },
    )
  }, [pool, starting])
"""

PROGRAM_GUARD = """  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [editing, pool, starting])
"""
PROGRAM_NO_GUARD = """  useEffect(() => {
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [pool, starting])
"""

MUTANTS = {
    'movesanexistingsubject': [
        ('subject', DEPARTMENT_GUARD, DEPARTMENT_NO_GUARD),
    ],
    'movesanexistingpair': [
        ('pair', PROGRAM_GUARD, PROGRAM_NO_GUARD),
    ],
}

main(FILES, MUTANTS)
