# -*- coding: utf-8 -*-
"""#238 — ประโยคว่าสำเร็จเป็นของการอ่านที่วาดสิ่งที่มันพูดถึง

คำตอบของเจ้าของงานเมื่อ 28 ต.ค. 2569 ต่อคำถามข้อที่สองของ #210 ซึ่ง #221 วัดไว้ครบแต่
ตอบไม่ได้: ประโยคผูกกับการอ่านที่มันพูดถึง ฉะนั้นถ้าหน้าหรือตัวกรองขยับไปขณะที่คำสั่งเขียน
ยังค้างอยู่ การอ่านที่ลงจอเป็นการอ่านของรายการอื่น และไม่มีอะไรพูดประโยคนั้น

สองจอที่เปลี่ยนคือ `Users.js` (พูดครบหกลำดับที่ #221 วัด) กับ `Plos.js` (พูดทุกลำดับ
ที่ #241 วัด รวมลำดับที่ไม่ต้องมีหน้าต่างเลย) · `Students.js` ทำตามกฎนี้อยู่แล้วตั้งแต่ #205
ฉะนั้นคำตอบของคำถามข้อที่สองคือไม่แก้อะไรที่นั่น และแฟ้มนี้ไม่มีมัตแตนต์ของจอนั้น

## ที่ที่ความผิดเขียนได้ และที่ที่มันเขียนไว้แล้ว

กลไกมีสองครึ่ง: ผู้เรียก **ส่งประโยคต่อโดยติดกุญแจ** ของรายการที่คำสั่งเขียนพูดถึง แล้ว
`load` **พูดเมื่อกุญแจตรง** · ครึ่งแรกผิดได้คือผู้เรียกพูดเองหลังการอ่าน ซึ่งเป็นรูปของ
สองจอนี้ก่อนตั๋วนี้ และถูกถือไว้แล้วโดยมัตแตนต์ที่เล็งใหม่ในวันเดียวกัน —
`239:savesaysitovertheoldpage` กับ `239:switchsaysitovertheoldpage` ที่ `Users.js`
และ `203:plossaveanyway` กับ `203:plosremovalanyway` ที่ `Plos.js` — แฟ้มนี้จึงไม่เขียน
ซ้ำ (#201 — มัตแตนต์ที่กลายเป็นฝาแฝดของตัวอื่นอย่างเงียบ ๆ ทิ้ง assertion ของตัวเอง
ไม่ถูกรันเหมือนเดิม) และถือ **ครึ่งที่สอง** คือกุญแจ ทีละจอ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `userssaysanyread` | `load` ของ `Users.js` พูดประโยคที่ค้างอยู่กับการอ่านตัวไหนก็ได้ที่วาด คือทิ้งการเทียบกุญแจไป · รูปของ `205:saysanyread` อีกจอหนึ่ง | `238a` แถวลบของ `Users.js` |
| `usersneversays` | ที่เดียวกัน ถอดประโยคออกทั้งก้อน — แถวบวกของจอนี้ถูกค้ำด้วยอะไร | `238a` แถวบวกของ `Users.js` |
| `plossaysanyread` | อย่างเดียวกันที่ `Plos.js` ซึ่งกุญแจคือ **หลักสูตร** เพราะ `load` ถาม `listPlos({ program_id: program })` อย่างเดียว ไม่มีหน้าและไม่มีตัวกรองอื่น (#185) | `238a` แถวลบของ `Plos.js` |
| `plosneversays` | ถอดประโยคของ `Plos.js` ออกทั้งก้อน | `238a` แถวบวกของ `Plos.js` |

สองตัวที่ถอดประโยคออกอยู่ในโค้ดที่ใช้ร่วมกันกับทุกแถวที่อ่านแบนเนอร์ของสองจอนี้ ฉะนั้น
แฟ้มของมันคือหนึ่งในที่ที่มันฆ่า ไม่ใช่รายการทั้งหมด (#123) และจำนวนที่ตายอ่านเทียบกับ
แถวที่มัตแตนต์ตัวนั้นถูกเขียนขึ้นมาเพื่อ ไม่ใช่เทียบกับยอดรวม (#203)

## สิ่งที่แฟ้มนี้ไม่ได้พิสูจน์

ห้าจุดที่ `frontend/scripts/sentences-after-a-move.js` นับว่ามีมาร์กเกอร์ยังพูดประโยค
หลังการอ่านโดยเจตนา และเหตุผลพร้อมวันกำกับอยู่ที่แต่ละจุด — ของ `Offerings.js` เป็น
การตัดสินใจของเจ้าของงานเมื่อ 1 ต.ค. 2026 ว่าประโยคเป็นของคำสั่งที่คนสั่ง ไม่ใช่ของแผง
ที่คนกำลังดู (#143) ซึ่งเป็นคำถามอื่น ไม่ใช่คำถามนี้ (#196) · ไม่มีมัตแตนต์ไหนในแฟ้มนี้
ถืออะไรเกี่ยวกับห้าจุดนั้น

## วิธีรัน

    python mutation/238-the-sentence-and-the-list-it-is-about.py save
    python mutation/238-the-sentence-and-the-list-it-is-about.py <mutant>
    python mutation/238-the-sentence-and-the-list-it-is-about.py restore
    cd e2e && npx playwright test tests/238a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'users': 'frontend/src/pages/Users.js',
    'plos': 'frontend/src/pages/Plos.js',
}

# สมอยึดกับโค้ดที่มัตแตนต์ทำให้พัง ไม่ใช่คอมเมนต์ข้างมัน (#121, #123) — คอมเมนต์ของ
# `Plos.js` ถูกย้ายขึ้นไปอยู่เหนือบล็อกเมื่อ 28 ต.ค. 2569 ก็เพื่อข้อนี้
# #246, 29 ต.ค. 2569 - เล็งใหม่ทั้งสองตัว เพราะคำตอบของเจ้าของงานวันนั้นแยกบล็อกนี้
# เป็นสองกิ่งที่จอนี้ด้วย ข้ออ้างของทั้งสองตัวคงเดิม: สองแถวของ `Users.js` ใน `238a`
# ไม่เปิดฟอร์ม กิ่งที่เดินจึงเป็นกิ่งที่พูด
USERS_SAYS_ITS_OWN = (
    '        if (waiting.current && waiting.current.of === key) {\n'
    '          if (formShown.current) {\n'
    '            waiting.current = { ...waiting.current, held: true }\n'
    '          } else {\n'
    '            setNotice(waiting.current.said)\n'
    '          }\n'
    '        }\n'
)
# #246, 29 ต.ค. 2569 - เล็งใหม่ทั้งสองตัว เพราะคำตอบของเจ้าของงานวันนั้นแยกบล็อกนี้
# เป็นสองกิ่ง ข้ออ้างของทั้งสองตัวคงเดิม — แถวลบของ `238a` ไม่เปิดฟอร์ม กิ่งที่เดินจึงเป็นกิ่งที่พูด
# แต่ `plosneversays` เวลานี้เอาการเก็บประโยคไว้ออกด้วย มันจึงฆ่าแถวของ `246a` ด้วย
# หนึ่งมัตแตนต์ฆ่าหลายแถวคือหลายข้ออ้างเรื่องการไปถึง ไม่ใช่ข้อเดียวนับซ้ำ (#191)
PLOS_SAYS_ITS_OWN = (
    '        if (waiting.current && waiting.current.of === program) {\n'
    '          if (formShown.current) {\n'
    '            waiting.current = { ...waiting.current, held: true }\n'
    '          } else {\n'
    '            setNotice(waiting.current.said)\n'
    '          }\n'
    '        }\n'
)

MUTANTS = {
    'userssaysanyread': ('users', USERS_SAYS_ITS_OWN,
        '        if (waiting.current) {\n'
        '          if (formShown.current) {\n'
        '            waiting.current = { ...waiting.current, held: true }\n'
        '          } else {\n'
        '            setNotice(waiting.current.said)\n'
        '          }\n'
        '        }\n'),
    'usersneversays': ('users', USERS_SAYS_ITS_OWN, ''),
    'plossaysanyread': ('plos', PLOS_SAYS_ITS_OWN,
        '        if (waiting.current) {\n'
        '          if (formShown.current) {\n'
        '            waiting.current = { ...waiting.current, held: true }\n'
        '          } else {\n'
        '            setNotice(waiting.current.said)\n'
        '          }\n'
        '        }\n'),
    'plosneversays': ('plos', PLOS_SAYS_ITS_OWN, ''),
}

main(FILES, MUTANTS)
