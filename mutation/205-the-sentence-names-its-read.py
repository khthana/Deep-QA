# -*- coding: utf-8 -*-
"""#205 ประโยคที่ฝากไว้บอกว่ามันเป็นของการอ่านไหน

จอที่ย้ายหน้าแทนการโหลดซ้ำไม่มีอะไรให้ `await` จึงฝากประโยคไว้ที่ ref `waiting`
แล้วให้ `load` พูดเมื่อวาดแล้ว (#152 ซึ่ง #203 พาไปถึงจอฝ่ายบริหาร) สิ่งที่ #205 วัดได้
ที่ seam เบราว์เซอร์คือสองครึ่งของรูปนั้นผิดทั้งคู่

* `finally` ล้าง `waiting.current` **นอก** `isCurrent()` — การอ่านที่ถูกแทนไปแล้ว
  จึงทิ้งประโยคที่ถูกฝากหลังมันออกจากบ้านไป คนเพิ่มนักศึกษาสำเร็จแล้วไม่ได้ยินอะไร
* `reload` ถูกสร้างบน `page` ของ render ที่มันปิดทับ — handler ที่ออกจากหน้า 2
  แล้วพบว่าคนกลับมาหน้า 1 แล้ว สั่ง `setPage(1)` ซึ่งไม่ทำให้เกิดการอ่านเลย
  ประโยคจึงค้างใน ref และถูกพูดโดยการเดินครั้งถัดไปของคน **บนรายการที่ไม่ใช่ของมัน**

ทางแก้คือ ref ถือ `{ of, said }` โดย `of` เขียนจาก `readOf` ซึ่งเป็นรายการ dependency
ของ loader เองในค่าเดียว `load` พูดเฉพาะเมื่อกุญแจของการอ่านตัวเองตรง และล้างเฉพาะเมื่อ
การอ่านที่จอยังต้องการลงถึงแล้ว ส่วน `reload` ถามหน้าที่ pager อยู่ **ตอนนี้** จาก ref
`onPage` และอ่านผ่าน `onScreen.current`

สี่ตัวนี้คือสี่ข้ออ้าง หนึ่งต่อหนึ่งแถว ที่สเปกของตั๋วนี้ถือไว้
`e2e/tests/205a-the-handed-over-sentence-and-a-superseded-read.spec.js`

## สิ่งที่แต่ละตัวทำ

| มัตแตนต์ | ความผิดที่เขียนกลับเข้าไป | แถวที่ต้องตาย |
|---|---|---|
| `clearsoutside` | ย้ายการล้างกลับไปนอก `isCurrent()` | แถวที่ 1 — การอ่านที่ถูกแทนลงก่อน |
| `alwaysmoves` | ให้ handler ย้ายหน้าเสมอ ซึ่งคือสิ่งที่หน้าที่ค้างใน closure ทำทุกครั้งที่คนกลับมาหน้า 1 | แถวที่ 2 — การย้ายที่ไม่ทำให้เกิดการอ่าน |
| `saysanyread` | พูดประโยคโดยไม่ถามกุญแจ | แถวที่ 3 — การอ่านของรายการอื่น |
| `keyforgetsthefilter` | กุญแจลืมตัวกรอง เหลือแต่หน้า (`Students.js` ซึ่งเป็นจอที่ `readOf` มีตัวกรองอยู่ด้วย) | แถวที่ 4 — การอ่านของตัวกรองอื่น |

## วิธีรัน

    python mutation/205-the-sentence-names-its-read.py save
    python mutation/205-the-sentence-names-its-read.py <mutant>
    python mutation/205-the-sentence-names-its-read.py restore
"""
from harness import main

FILES = {
    'enrolment': 'frontend/src/pages/SubjectStudents.js',
    'register': 'frontend/src/pages/Students.js',
}

MUTANTS = {
    # ล้างประโยคไม่ว่าการอ่านนี้จะยังเป็นการอ่านที่จอต้องการหรือไม่ — รูปของ #152
    # ที่ #205 วัดว่าผิด
    'clearsoutside': ('enrolment',
        '        waiting.current = null\n'
        '      }\n',
        '      }\n'
        '      waiting.current = null\n'),
    # ย้ายหน้าเสมอ แทนการอ่านด้วยมือเมื่อการย้ายจะไม่ทำให้เกิดการอ่าน: `setPage(1)`
    # บนจอที่อยู่หน้า 1 แล้วไม่ขอการอ่านใด ประโยคจึงรอการอ่านที่ไม่มีใครทำ
    'alwaysmoves': ('enrolment',
        '      if (onPage.current === 1) {\n',
        '      if (onPage.current === 0) {\n'),
    # พูดประโยคกับการอ่านตัวไหนก็ได้ที่วาด ซึ่งพาประโยคขึ้นบนรายการที่มันไม่ได้พูดถึง
    'saysanyread': ('enrolment',
        '        if (waiting.current && waiting.current.of === key) {\n',
        '        if (waiting.current) {\n'),
    # กุญแจที่ลืมตัวกรอง: การอ่านของตัวกรองอื่นจึงคิดว่าประโยคเป็นของมัน
    # ทิ้งพารามิเตอร์ตัวที่สองไปเลย เพราะพารามิเตอร์ที่ไม่ถูกอ้างถึงทำให้ lint แดง
    # และมัตแตนต์ที่หยุดแอปไม่พิสูจน์อะไร (#101) — อาร์กิวเมนต์ที่เกินมาที่จุดเรียก
    # ภาษาไม่สนใจอยู่แล้ว
    'keyforgetsthefilter': ('register',
        'const readOf = (page, program) => `${page}:${program}`\n',
        'const readOf = page => `${page}`\n'),
}

main(FILES, MUTANTS)
