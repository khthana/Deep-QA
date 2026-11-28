# -*- coding: utf-8 -*-
"""#337 คำปฏิเสธที่มาถึงหลังหน้าต่างฟอร์มไม่ถูก *บันทึกข้อมูลเรียบร้อยแล้ว* ของหน้าต่างนั้นเขียนทับ — ข้อมูลภาควิชา ข้อมูลหลักสูตร และข้อมูลผู้ใช้งาน

    python mutation/337-the-refusal-wins-over-the-dialogs-save.py save
    python mutation/337-the-refusal-wins-over-the-dialogs-save.py <mutant>
    python mutation/337-the-refusal-wins-over-the-dialogs-save.py restore

คำตอบของเจ้าของงาน 28 พ.ย. 2569 (ถามใน #337) คือ ข. *คำปฏิเสธชนะ* ตามกฎของ #203: แถวที่บันทึกอยู่ในรายการให้ใครก็เห็น
ส่วนคำปฏิเสธไม่อยู่ที่ไหนอีก · `load` จึงพูดประโยคที่รออยู่ผ่าน updater ที่คืนค่าเดิมเมื่อสิ่งที่แสดงอยู่เป็นคำปฏิเสธ

    cd e2e && npx playwright test tests/337a-the-refusal-wins-over-the-dialogs-save.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ข้ออ้างเดียวต่อจอ จอละหนึ่งตัว เพราะโค้ดถูกลอกไม่ได้ใช้ร่วม (#83 #125) · ทุกตัวคือรูปก่อนคำตอบ ทำให้วิ่ง (#48):
`setNotice(said)` ซึ่งเขียนทับทุกอย่างที่แสดงอยู่ · ตัวแปร `said` ยังถูกอ่าน (#101)

จุดที่สองของแต่ละจอ (effect ที่พูดประโยคที่ถูก*พัก*ไว้ตอนฟอร์มยังเปิด) **ไม่มีมัตแตนต์** — ไม่มีแถวไหนของ `337a`
ไปถึง เพราะต้องมีคำปฏิเสธและประโยคที่พักไว้มาถึงในการเปิดฟอร์มครั้งเดียวกันทั้งคู่ ขณะที่การเขียนออกไปได้ทีละอย่าง
มัตแตนต์ตรงนั้นจึงจะรอดโดยไม่ได้วัดอะไร (#51) · เขียนไว้ที่โค้ดว่า *untested* พร้อมวันที่

## ตารางคำทำนาย (เขียนก่อนกวาด 28 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s337departments` | `337a` *row 1* | `'the refusal on the page once the list is back'` — ประโยคของการบันทึกเขียนทับคำปฏิเสธ `alert` จึงว่าง | `337a` row 2 และ row 3 อยู่คนละจอ |
| `s337programs` | `337a` *row 2* | `'the refusal on the page once the list is back'` | row 1 · row 3 |
| `s337users` | `337a` *row 3* | `'the refusal on the page once the list is back'` | row 1 · row 2 |

## การกวาด — บันทึกผล (28 พ.ย. 2569)

ทีละตัว ทุกตัวผ่านด่าน *ต้นไม้เปลี่ยนหลังใส่* (#268) และ `restore` ก่อนตัวถัดไป · **ไม่มีตัวไหนผิดคำทำนาย**

| ชื่อ | spec | ผล | ตายที่ |
|---|---|---|---|
| `s337departments` | `337a` | 1 ล้ม 2 ผ่าน | row 1 บรรทัด 73 — `'the refusal on the page once the list is back'` |
| `s337programs` | `337a` | 1 ล้ม 2 ผ่าน | row 2 บรรทัด 73 — `'the refusal on the page once the list is back'` |
| `s337users` | `337a` | 1 ล้ม 2 ผ่าน | row 3 บรรทัด 73 — `'the refusal on the page once the list is back'` |

ตัวที่เล็งใหม่ใน `238` กวาดในรอบเดียวกัน — ผลอยู่ใน `docs/acceptance/337-the-refusal-wins-over-the-dialogs-save.md`
"""

from harness import main

FILES = {
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
    'users': 'frontend/src/pages/Users.js',
}

SAYS_OVER = ('            setNotice(shown => (shown?.error ? shown : said))\n',
             '            setNotice(said)\n')

MUTANTS = {
    's337departments': ('departments',) + SAYS_OVER,
    's337programs': ('programs',) + SAYS_OVER,
    's337users': ('users',) + SAYS_OVER,
}

if __name__ == '__main__':
    main(FILES, MUTANTS)
