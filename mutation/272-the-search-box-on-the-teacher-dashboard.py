# -*- coding: utf-8 -*-
"""#272 ชิ้นที่สี่ — ช่องค้นหาของ *รายวิชาที่สอน* (หน้ารวมรายวิชาของอาจารย์)

    python mutation/272-the-search-box-on-the-teacher-dashboard.py save
    python mutation/272-the-search-box-on-the-teacher-dashboard.py <mutant>
    python mutation/272-the-search-box-on-the-teacher-dashboard.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/272d-the-search-box-on-the-teacher-dashboard.spec.js`
ใบ `docs/acceptance/272-the-search-box.md` §ชิ้นที่สี่

    cd e2e && npx playwright test tests/272d-the-search-box-on-the-teacher-dashboard.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ทั้งหมดอยู่ที่จุดเรียกใน `TeacherDashboard.js` ไม่ใช่ใน `lib/outsideTheSearch.js` เพื่อให้การใช้ของจอนี้เป็นข้ออ้าง
ของมันเอง (#104) · ชื่อขึ้นต้นด้วย `s272d` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185)

- `s272dnobox` — จอที่ไม่มีช่อง คือโค้ดก่อนคำตอบของเจ้าของงาน 13 พ.ย. 2569 (#115)
- `s272dnocode` `s272dnoth` — ไม่ค้นรหัส / ชื่อไทย
- `s272dnoen` — ค้นรหัสกับชื่อไทยอย่างระบบที่ส่งมอบ คือทางเลือกที่ไม่ถูกเลือกทำให้รันได้ (#48)
- `s272dcase` — สนตัวพิมพ์
- `s272dignored` — คำค้นถูกถือแต่ไม่กรอง
- `s272dnosentence` — ไม่มีประโยคตอนไม่พบ
- `s272dallcard` — ค้นทุกอย่างที่การ์ดแสดง คือทางเลือกที่ไม่ถูกเลือกทำให้รันได้ (#48) · เพิ่มพร้อมแถว D5 หลังรีวิว
- `s272dcardskept` — ตอนไม่พบ การ์ดทุกใบยังถูกวาด (รีวิว 13 พ.ย. 2569: ข้ออ้างที่สองของ D4 ไม่มีมัตแตนต์ตัวใดอ่าน, #88)

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **เลขตอนเรียนไม่ถูกค้น** — การ์ดทั้งสองเป็นตอนเรียนที่ 1 และ `1` อยู่ในรหัสทั้งสอง · ใบเกณฑ์บอกว่าข้ออ้างนี้ไม่ถูกถือ ·
  จำนวนนักศึกษามีแถว D5 และ `s272dallcard` (รีวิว 13 พ.ย. 2569 พบว่าเหตุผลเดิมของบรรทัดนี้ซึ่งรวมจำนวนนักศึกษาไว้ด้วยเท็จ:
  จำนวนของการ์ดตั้งต้นไม่อยู่ในรหัสหรือชื่อใด)
- **การหน่วง** — ชิ้นแรกบอกเหตุผลไว้แล้ว (#52)

## ตารางคำทำนาย (เขียนก่อนกวาด 13 พ.ย. 2569)

แถว D1–D4 ของ `272d` · แต่ละแถวอ่านการ์ดที่ควรหายก่อน (จุดที่จอนิ่ง) แล้วจึงอ่านการ์ดที่ควรอยู่ · มัตแตนต์ในแฟ้มอื่น
ที่แถวใหม่ไปถึงได้ถูกทำนายด้วย (#257, #258)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s272dnobox` | D1 D2 D3 D4 | `toBeVisible` ของ `searchbox` | — |
| `s272dnocode` | D1 | *the code holding the term is shown* | D2 D3 D4 |
| `s272dnoth` | D2 | *the Thai name holding the term is shown* | D1 D3 D4 |
| `s272dnoen` | D3 | *the English name holding the term is shown* | D1 D2 D4 |
| `s272dcase` | D3 | *the English name holding the term is shown* — `engineering` ตัวเล็ก การ์ดเขียน `Engineering` | D1 (ตัวเลข) D2 (ภาษาไทยไม่มีตัวพิมพ์) D4 |
| `s272dignored` | D1 D2 D3 D4 | D1–D3 ที่การ์ดที่ควรหาย · D4 ที่ประโยค | — |
| `s272dnosentence` | D4 | *the sentence* | D1 D2 D3 |
| `s272dcardskept` (เพิ่มหลังรีวิว เขียนก่อนกวาดของมัน) | D4 D5 | *no card is left* · D5 ที่ *the count was on the card* | D1 D2 D3: มีการ์ดที่ถือคำค้นเสมอ |
| `s272dallcard` (เพิ่มหลังรีวิว เขียนก่อนกวาดของมัน) | D5 | *a count is not a term the cards hold* | D1–D4: คำค้นของแถวเหล่านั้นไม่ใช่ตัวเลขที่การ์ดถือเป็นจำนวน |
| `272-the-search-box:s272outsidenever` | D1 D2 D3 D4 | เหมือน `s272dignored` | — |
| `272-the-search-box:s272outsidealways` | D1 D2 D3 | การ์ดที่ควรอยู่ | D4: ไม่มีการ์ดใดถือคำค้นอยู่แล้ว |
| `272-the-search-box:s272boxforgets` | ไม่มี | — | ทุกแถว: ช่องไม่ถูกถอดแล้วต่อใหม่ |
| `272-the-search-box:s272boxsame` | ไม่มี | — | ทุกแถว: คำที่พิมพ์ต่างจากคำว่างที่รายการอยู่ |

**แถว D5 กับมัตแตนต์ที่มีอยู่ (เขียนก่อนกวาดซ้ำ 13 พ.ย. 2569)** — รีวิวเพิ่ม D5 หลังกวาดแรก ตารางข้างบนจึงหมดอายุที่ D5 (#257): `s272dnobox` ฆ่า D5 ที่ช่อง · `s272dignored` `s272dnosentence` และ `s272outsidenever` ฆ่า D5 ที่ *a count is not a term the cards hold* · `s272dnocode` `s272dnoth` `s272dnoen` `s272dcase` `s272outsidealways` `s272boxforgets` `s272boxsame` ไม่ฆ่า D5 (ไม่มีการ์ดใดถือจำนวนนั้นในรหัสหรือชื่อ จึงพูดประโยคทั้งสองทาง) · กวาดซ้ำทั้งสิบสามตัวกับทั้งห้าแถว

## บันทึกผลกวาด (13 พ.ย. 2569 · ทีละตัว · `_local/sweep272i.ps1`)

สิบเอ็ดตัวตรงตามตารางทุกตัว และทุกตัวที่ฆ่าตายที่ข้ออ้างที่ตารางทำนาย: `s272dnobox` ล้ม 4 ที่ *the search box of
`components/SearchBox.js`* · `s272dnocode` ล้ม 1 (D1 *the code holding the term is shown*) · `s272dnoth` ล้ม 1 (D2) ·
`s272dnoen` กับ `s272dcase` ล้ม 1 (D3 *the English name holding the term is shown*) · `s272dignored` กับ `s272outsidenever`
ล้ม 4 (D1–D3 ที่การ์ดที่ควรหาย · D4 ที่ *the sentence*) · `s272dnosentence` ล้ม 1 (D4) · `s272outsidealways` ล้ม 3 (D1–D3
ที่การ์ดที่ควรอยู่) · `s272boxforgets` กับ `s272boxsame` ผ่าน 4

## บันทึกผลกวาดซ้ำหลังรีวิว (13 พ.ย. 2569 · ทีละตัว · `_local/sweep272j.ps1` · ห้าแถว D1–D5)

สะอาด 5 ผ่าน (กับ `24a` 12 ผ่าน) · สิบสามตัวตรงตามตารางและย่อหน้าของ D5 ทุกตัว: `s272dnobox` ล้ม 5 ที่ช่อง ·
`s272dnocode` `s272dnoth` `s272dnoen` `s272dcase` ล้ม 1 ที่แถวเดิมของตัวเอง · `s272dignored` กับ `s272outsidenever` ล้ม 5
(D1–D3 ที่การ์ดที่ควรหาย · D4 ที่ *the sentence* · D5 ที่ *a count is not a term the cards hold*) · `s272dnosentence` ล้ม 2
(D4 D5 ที่ประโยค) · `s272dcardskept` ล้ม 2 (D4 ที่ *no card is left* · D5 ที่ *the count was on the card*) · `s272dallcard`
ล้ม 1 (D5 ที่ *a count is not a term the cards hold*) · `s272outsidealways` ล้ม 3 (D1–D3) · `s272boxforgets` กับ `s272boxsame`
ผ่าน 5
"""
from harness import main

FILES = {
    'dash': 'frontend/src/pages/TeacherDashboard.js',
}

BOX = '        <SearchBox label="ค้นหารายวิชา" value={q} onSearch={setQ} />\n'
FILTER = '  const shown = sections.filter(section => !outsideSearch(q, searched(section)))\n'

MUTANTS = {
    # จอก่อน 13 พ.ย. 2569 - ไม่มีช่อง
    's272dnobox': ('dash', BOX, ''),
    's272dnocode': ('dash', '  section.subject_id,\n  section.subject_name_th,\n',
                    '  section.subject_name_th,\n'),
    's272dnoth': ('dash', '  section.subject_id,\n  section.subject_name_th,\n',
                  '  section.subject_id,\n'),
    # ทางเลือกที่ไม่ถูกเลือก: รหัสกับชื่อไทยอย่างระบบที่ส่งมอบ
    's272dnoen': ('dash', '  section.subject_name_th,\n  section.subject_name_en,\n]',
                  '  section.subject_name_th,\n]'),
    's272dcase': ('dash', FILTER,
                  '  const shown = sections.filter(section => !q.trim() ||'
                  ' searched(section).some(value => String(value ?? \'\').includes(q.trim())))\n'),
    's272dignored': ('dash', FILTER, '  const shown = sections.filter(section => searched(section) && outsideSearch && q !== null)\n'),
    's272dnosentence': ('dash', '        <p className="text-sm text-slate-500">ไม่พบรายวิชาตามคำค้น</p>\n',
                        '        <p className="text-sm text-slate-500"></p>\n'),
    # ทางเลือกที่ไม่ถูกเลือก: ทุกอย่างที่การ์ดแสดง (#48)
    's272dallcard': ('dash', '  section.subject_name_en,\n]',
                     '  section.subject_name_en,\n  section.section_number,\n  section.student_count,\n]'),
    # ตอนไม่พบ การ์ดทุกใบยังถูกวาดใต้ประโยค - ข้ออ้างที่สองของ D4 (รีวิว 13 พ.ย. 2569, #88)
    's272dcardskept': ('dash',
        '      {!loading && shown.length > 0 && (\n'
        '        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">\n'
        '          {shown.map(section => (\n',
        '      {!loading && sections.length > 0 && (\n'
        '        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">\n'
        '          {(shown.length ? shown : sections).map(section => (\n'),
}

main(FILES, MUTANTS)
