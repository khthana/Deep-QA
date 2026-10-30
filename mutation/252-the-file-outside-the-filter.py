# -*- coding: utf-8 -*-
"""#252 — ประโยคของแฟ้มที่ตกนอกตัวกรองของตาราง

เจ้าของงานตอบเมื่อ 30 ต.ค. 2569 ว่า **ข้อ ง** — จอแม่พูด ผ่าน `onImported` ที่
`ImportPanel` เรียกอยู่แล้ว ไม่ใช่ผ่าน prop ใหม่บนแผงที่มีสิบจุดเมานต์ ฉะนั้นกฎยังถูก
คัดลอกต่อจอ ไม่ใช่แชร์กัน และข้ออ้างของแต่ละจอยังแยกมัตแตนต์ได้ (#68, #104) — ซึ่งคือ
สิ่งที่ตารางข้างล่างนี้เป็น

สองกลไก: สามจอถาม `someImportedOutside` ที่ `lib/outsideTheFilter.js` ด้วยคีย์เดียว
ส่วน `Users` ถาม `importedOutsideTheFilters` ของแฟ้มตัวเอง ซึ่งเป็นสองคำถาม — และ
คำถามที่สาม (บทบาท) ถามกับคำตอบของการนำเข้าไม่ได้เลย ซึ่งเป็น #256 ไม่ใช่ตัวที่นี่

## หกตัว

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `importquiet` | `someImportedOutside` ตอบ `false` ทุกครั้ง ซึ่งคือโค้ดก่อนตั๋วนี้ของสามจอที่ใช้คีย์เดียว | `252a` แถว 1 |
| `importalways` | ตอบ `true` ทุกครั้ง — *พูดทุกครั้ง* ซึ่งเป็นคำตอบที่ทำให้ประโยคไม่มีความหมาย | `252a` แถว 2 |
| `usersterm` | ข้อคำค้นของ `importedOutsideTheFilters` ตอบ `false` ข้อสถานะยังอยู่ | `252a` แถว 3 |
| `usersstatus` | ข้อสถานะตอบ `false` ข้อคำค้นยังอยู่ | `252a` แถว 5 |
| `usersalways` | `importedOutsideTheFilters` ตอบ `true` ทุกครั้ง | `252a` แถว 4 |
| `panelkeepsanswer` | `ImportPanel` เรียก `onImported?.()` เปล่า ๆ อย่างที่เคยเรียกก่อนตั๋วนี้ คำตอบจึงไปไม่ถึงจอแม่ | `252a` แถว 1, 3 และ 5 |

`usersterm` กับ `usersstatus` แยกกันเพราะมัตแตนต์ต้องฆ่าแถวหนึ่งแถวแล้วปล่อยที่เหลือยืนได้
(#97) — ข้อสองข้อใน `importedOutsideTheFilters` เป็นสองข้ออ้าง ไม่ใช่ข้ออ้างเดียวนับสองครั้ง

`panelkeepsanswer` คือมัตแตนต์ของ **ตะเข็บ**: มันฆ่าสามแถวในสองกลไก เพราะโค้ดที่มันแก้
อยู่ในแผงที่ใช้ร่วมกัน สิ่งที่แต่ละแถวเพิ่มจึงเป็นข้ออ้างว่า *ทางเข้าของมันไปถึงที่นั่น* และการฆ่า
คือการพิสูจน์ (#191) — ตัวที่ไปไม่ถึงจะผ่าน

`importquiet` กับ `importalways` ปล่อยพารามิเตอร์ `filter` ไม่ถูกอ้าง ซึ่งกฎ #101 เขียนไว้ว่า
มัตแตนต์ที่เอาเงื่อนไขออกต้องคงพารามิเตอร์ให้ถูกอ้าง · กฎนั้นมีไว้กันมัตแตนต์ที่ทำให้แอปหยุด และ
การกวาดเป็นหลักฐานว่าไม่หยุด — ทั้งสองตัวได้ ล้ม 1 ผ่าน 4 ไม่ใช่ตายทั้งแฟ้ม (#107, #68: การกวาด
ตอบ ไม่ใช่การอ่านโค้ด) · อาร์กิวเมนต์ที่ไม่ถูกใช้ไม่ใช่ error ของ CRA ฉะนั้นการบิดมัตแตนต์ให้อ้าง
`filter` จะเปลี่ยนสิ่งที่มันทำโดยไม่ซื้ออะไร (รีวิวของ 30 ต.ค. 2569)

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **คำถามเรื่องบทบาทของ `Users`** — ไม่มีโค้ดให้แก้ คำตอบของการนำเข้าไม่ถือบทบาทมา
  ฉะนั้นมันเป็นครึ่งที่ **เงียบ** ลงวันไว้ที่ docblock ของ `importedOutsideTheFilters`
  และคิวของมันคือ #256 (#119)
- **`ProgramSubjects` กับ `Subjects`** — ทั้งสองเรียก `someImportedOutside` ตัวเดียวกัน
  ฉะนั้น `importquiet` แก้โค้ดที่ทั้งสองใช้อยู่ด้วย แต่ไม่มีแถวของทั้งสองในชุดนี้ สิ่งที่ถือ
  สองจอนั้นคือสำมะโน `frontend/scripts/rows-outside-the-filter.js` คำถามที่สี่
  (#68 — สำมะโนถือจอที่ใช้กลไกร่วม แถวถือจอที่เขียนกลไกของตัวเอง)
- **จออีกหกจอที่เมานต์แผงแต่ไม่สนใจอาร์กิวเมนต์** — `panelkeepsanswer` ไม่เปลี่ยนอะไร
  ให้ทั้งหกเลย ซึ่งเป็นเหตุผลที่ข้อ ง ถูกกว่าข้อ ข: prop ที่ต้องมีจะไปถึงทั้งสิบจุด

## วิธีรัน

    python mutation/252-the-file-outside-the-filter.py save
    python mutation/252-the-file-outside-the-filter.py importquiet
    python mutation/252-the-file-outside-the-filter.py restore
    cd e2e && npx playwright test tests/252a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง

**อย่ากวาดแฟ้มนี้พร้อมกับแฟ้มอื่นที่ `FILES` ถือทางเดินเดียวกัน** — `pages/Users.js` อยู่ใน
`86`, `91`, `111`, `124`, `141`, `144`, `202`, `203`, `208`, `215`, `238`, `247`;
`components/ImportPanel.js` อยู่ใน `179`; `lib/outsideTheFilter.js` อยู่ใน `247`
เทียบ `FILES` ไม่ใช่หัวเรื่อง (#85, #87, #125)
"""
from harness import main

FILES = {
    'shared': 'frontend/src/lib/outsideTheFilter.js',
    'users': 'frontend/src/pages/Users.js',
    'panel': 'frontend/src/components/ImportPanel.js',
}

# สมอยึดกับโค้ดที่มัตแตนต์ทำให้พัง ไม่ใช่คอมเมนต์ข้างมัน (#121, #123)
SOME_IMPORTED = (
    'export const someImportedOutside = (filter, values) =>\n'
    '  Array.isArray(values) && values.some(value => outsideFilter(filter, value))\n'
)

USERS_STATUS = (
    '  if (filters.status && filters.status !== row.status) return true\n'
)
USERS_TERM = (
    '  return Boolean(term) && !matchesSearch(term.toLowerCase(), row)\n'
)
USERS_WHOLE = (
    'const importedOutsideTheFilters = (filters, row) => {\n'
    '  if (filters.status && filters.status !== row.status) return true\n'
    "  const term = String(filters.q ?? '').trim()\n"
    '  return Boolean(term) && !matchesSearch(term.toLowerCase(), row)\n'
    '}\n'
)

MUTANTS = {
    # โค้ดก่อนตั๋วนี้ของสามจอที่ใช้คีย์เดียว: ไม่มีแถวไหนอยู่นอกรายการเลย
    'importquiet': ('shared', SOME_IMPORTED,
        'export const someImportedOutside = (filter, values) =>\n'
        '  Array.isArray(values) && false\n'),
    # พูดทุกครั้ง ซึ่งเป็นคำตอบที่แถวคุมมีไว้จับ
    'importalways': ('shared', SOME_IMPORTED,
        'export const someImportedOutside = (filter, values) =>\n'
        '  Array.isArray(values) && values.some(value => value !== undefined)\n'),
    # ข้อคำค้นหายไป ข้อสถานะยังอยู่
    'usersterm': ('users', USERS_TERM,
        '  return Boolean(term) && false\n'),
    # ข้อสถานะหายไป ข้อคำค้นยังอยู่
    'usersstatus': ('users', USERS_STATUS,
        '  if (filters.status && false) return true\n'),
    # พูดทุกครั้ง สำหรับแถวคุมของจอนี้
    'usersalways': ('users', USERS_WHOLE,
        'const importedOutsideTheFilters = (filters, row) => {\n'
        '  return filters !== undefined && row !== undefined\n'
        '}\n'),
    # แผงเรียกเปล่า ๆ อย่างที่เคยเรียกก่อนตั๋วนี้ คำตอบไปไม่ถึงจอแม่
    'panelkeepsanswer': ('panel', '      onImported?.(result)\n',
        '      onImported?.()\n'),
}

main(FILES, MUTANTS)
