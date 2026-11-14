# -*- coding: utf-8 -*-
"""#275 — คำค้นที่เปลี่ยนระหว่างที่การเขียนหรือการโหลดใหม่ของการนำเข้ายังไม่กลับ

    python mutation/275-a-term-typed-while-a-write-is-out.py save
    python mutation/275-a-term-typed-while-a-write-is-out.py <mutant>
    python mutation/275-a-term-typed-while-a-write-is-out.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/275a-a-term-typed-while-a-write-is-out.spec.js`
ใบ `docs/acceptance/272-the-search-box.md` §#275

    cd e2e && npx playwright test tests/275a-a-term-typed-while-a-write-is-out.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ชื่อขึ้นต้นด้วย `s275` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185)

- `s275classkeynoq` — กุญแจ `readOf` ของรายชื่อนักศึกษาไม่ถือ `q` · ช่องที่ 1 ของ #275
- `s275groupswritesent` — ประโยคของการเขียนบนกลุ่มงานตัดสินด้วย `q` ของการเรนเดอร์ที่ส่ง คือโค้ดก่อนคำตอบของเจ้าของงาน
  14 พ.ย. 2569 (#115) และทางเลือก *คงอย่างวันนี้* ที่ไม่ถูกเลือกทำให้รันได้ (#48) · ช่องที่ 3
- `s275groupsimportsent` — อย่างเดียวกัน สำหรับประโยคของการนำเข้า
- `s275groupsimportnosecond` — `onImported` ไม่ถามข้อที่สอง (`onScreen.current === drawing`) · ช่องที่ 2

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **ทางเลือก *เงียบอย่างรายชื่อนักศึกษา* และ *ปิดช่องค้นหาระหว่างบันทึก*** — ไม่ทำให้รัน: ทางแรกคือ
  `s275groupswritesent` ในแถว G2 ไม่ได้ เพราะเงียบไม่ใช่ประโยคใดของสองแบบ แต่ G1 กับ G2 อ่านประโยคเต็มด้วย
  `toHaveText` จึงแดงกับความเงียบเหมือนกัน · ทางที่สองไม่มีจุดในโค้ดให้แก้กลับ ช่องไม่เคยถูกปิด
- **การ์ดที่วาด** — ข้ออ้างของ `272b` ไม่ใช่ของแฟ้มนี้ · `cardsAre` ในแถวเป็นการจัดฉาก

## ตารางคำทำนาย (เขียนก่อนกวาด 14 พ.ย. 2569)

แถว S1 G1–G4 ของ `275a` · มัตแตนต์ในแฟ้มอื่นที่แถวใหม่ไปถึงได้ถูกทำนายด้วย (#257, #258) และสี่ตัวของ
`272-the-search-box-on-three-more-screens.py` ที่การแก้ของ #275 เล็งใหม่ ถูกกวาดกับ `272b` ด้วย (#107, #68)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s275classkeynoq` | S1 | *the sentence of the term the add was sent under* | G1–G4 ไม่ใช่จอนี้ |
| `s275groupswritesent` | G1 G2 | *judged by the term in the box* — G1 ไม่มีหมายเหตุ · G2 มีหมายเหตุ | S1 G3 G4 |
| `s275groupsimportsent` | G3 | *judged by the term in the box* — ไม่มีประกาศ | S1 G1 G2 · G4: `q` ของการเรนเดอร์ที่ส่งว่าง จึงไม่ซ่อนอะไร |
| `s275groupsimportnosecond` | G4 | *the import's sentence, about the ตอนเรียน that was left* | S1 G1 G2 G3: ไม่มีการกระโดด สองข้อตอบเหมือนกัน (#117) |
| `268:groupsimporthandlerstale` | ไม่มี | — | G4: คำตอบเก่าถูกวาด แต่ข้อที่สองยังตอบไม่ · `drawn` เป็นตอนเรียนที่ถูกทิ้งหลังการนำเข้า และการ์ดทุกใบถูกซ่อน แต่ข้อที่สองกันไว้ |
| `272-the-search-box-on-three-more-screens:s272bgroupssavequiet` | G1 | *judged by the term in the box* | G2 พูดประโยคเปล่าอยู่แล้ว · S1 G3 G4 |
| `272-the-search-box-on-three-more-screens:s272bgroupssavealways` | G2 | *judged by the term in the box* | G1 มีคำค้นตอนคำตอบกลับ จึงมีหมายเหตุอยู่แล้ว · S1 G3 G4 |
| `272-the-search-box-on-three-more-screens:s272bgroupsimportquiet` | G3 | *judged by the term in the box* | ที่เหลือ |
| `272-the-search-box-on-three-more-screens:s272bgroupsimportalways` | ไม่มี | — | G3 มีคำค้นอยู่แล้ว · G4 ข้อที่สองกันไว้ |
| `272-the-search-box-on-three-more-screens:s272bgroupsunfiltered` | G1 G2 G3 G4 | ที่การจัดฉาก `cardsAre` | S1 |
| `272-the-search-box-on-three-more-screens:s272bclassnoq` | S1 | ที่การจัดฉาก — คำขอที่ถือ `q` ไม่มา (#139) | G1–G4 |

## บันทึกผลกวาด (14 พ.ย. 2569 · ทีละตัว · `_local/sweep275a.ps1`)

สะอาด 5 ผ่าน · สิบเอ็ดตัวตรงตามตารางทุกตัว และทุกตัวที่ฆ่าตายที่ข้ออ้างที่ตารางทำนาย: `s275classkeynoq` ล้ม 1 (S1
*the sentence of the term the add was sent under*) · `s275groupswritesent` ล้ม 2 (G1 G2 *judged by the term in the box*) ·
`s275groupsimportsent` ล้ม 1 (G3 ที่ข้ออ้างเดียวกัน ไม่มีประกาศ) · `s275groupsimportnosecond` ล้ม 1 (G4 *the import's
sentence, about the ตอนเรียน that was left*) · `268:groupsimporthandlerstale` ผ่าน 5 · `s272bgroupssavequiet` ล้ม G1 ·
`s272bgroupssavealways` ล้ม G2 · `s272bgroupsimportquiet` ล้ม G3 · `s272bgroupsimportalways` ไม่ล้มแถวใดของแฟ้มนี้ ·
`s272bgroupsunfiltered` ล้ม 4 (G1–G4 ที่ `toEqual` ของ `cardsAre` คือการจัดฉาก) · `s272bclassnoq` ล้ม 1 (S1 ที่
`waitForResponse` ของคำขอที่ถือ `q` คือการจัดฉาก, #139) · สี่ตัวของ `272b` ที่เล็งใหม่ถูกกวาดกับ `272b` ด้วย บันทึกอยู่ในแฟ้มนั้น

หลังรีวิววันเดียวกัน ref เปลี่ยนชื่อจาก `typed` เป็น `termNow` (บังชื่อกับ `typed` ของ `create`) ทั้งสองครึ่งของมัตแตนต์ทุกตัว
ย้ายพร้อมกัน จึงสมมูล (#208) · ราคาของการพิสูจน์ (`_local/sweep275b.ps1`, `275a` กับ `272b`): สะอาด 27 ผ่าน ·
`s275groupsimportnosecond` ล้ม G4 · `272:s272bgroupssavealways` ล้ม `272b` G6 กับ `275a` G2 — ตรงกับการกวาดก่อนเปลี่ยนชื่อ
"""
from harness import main

FILES = {
    'students': 'frontend/src/pages/SubjectStudents.js',
    'groups': 'frontend/src/pages/StudentGroups.js',
}

MUTANTS = {
    # ช่องที่ 1: กุญแจไม่ถือคำค้น - `q` ยังถูกอ้างในพารามิเตอร์
    's275classkeynoq': ('students',
        'const readOf = (sectionId, page, q) => `${sectionId}:${page}:${q}`',
        'const readOf = (sectionId, page, q) => `${sectionId}:${page}`'),
    # ช่องที่ 3: โค้ดก่อนคำตอบของเจ้าของงาน 14 พ.ย. 2569 (#115, #48)
    's275groupswritesent': ('groups',
        'alsoOutside(message, hidden(termNow.current, about))',
        'alsoOutside(message, hidden(q, about))'),
    's275groupsimportsent': ('groups',
        'hidden(termNow.current, group => groups.has(group.group_id))',
        'hidden(q, group => groups.has(group.group_id))'),
    # ช่องที่ 2: ข้อที่สองของ `onImported` - `drawing` ยังถูกเรียกข้างบน
    's275groupsimportnosecond': ('groups',
        '                onScreen.current === drawing &&\n'
        '                hidden(termNow.current',
        '                hidden(termNow.current'),
}

main(FILES, MUTANTS)
