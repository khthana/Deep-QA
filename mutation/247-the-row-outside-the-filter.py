# -*- coding: utf-8 -*-
"""#247 — แถวที่บันทึกแล้วตกนอกตัวกรองที่ตารางกรองอยู่

คำตอบข้อ จ ของเจ้าของงานเมื่อ 29 ต.ค. 2569: จอพูดประโยคของตัวเอง แล้วต่อด้วย
**ประโยคร่วมหนึ่งประโยค** — *แถวนี้อยู่นอกรายการที่กรองอยู่* — ไม่ใช่ชื่อของที่ที่แถวไปอยู่
(ข้อ ข ซึ่ง `Users.js` เขียนไม่ได้ #128) และไม่ใช่การย้ายตาราง (ข้อ ค)

ประชากรที่ตั๋วเขียนไว้คือ **จอเดียว** การสำรวจด้วยกลไกตอบว่า **เจ็ดจอ** (#174, #223)
และกฎลงทั้งเจ็ดในตั๋วเดียวเพราะข้อบังคับผูกทุกทางเดิน (#166) · สองจอมีแถว — `Plos`
ที่ `247a` และ `Users` ที่ `247b` — อีกห้าจอถูกถือไว้ด้วยสำมะโน
`frontend/scripts/rows-outside-the-filter.js` ไม่ใช่ด้วยมัตแตนต์ที่นี่ (#68)

## เก้าตัว: ทางที่ไม่ได้เลือก และกิ่งของการแก้

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `plosnosuffix` | ข้อ ก ของคำถาม ทำให้รันได้: จอพูดประโยคของตัวเองเฉย ๆ อย่างก่อนตั๋วนี้ ซึ่งเป็นสิ่งเดียวที่ทำให้ *เราเลือกทางอื่น* กลายเป็นข้ออ้างที่ชุดทดสอบถือไว้ (#48) | `247a` แถวที่หนึ่ง |
| `plosalwayssays` | ต่อประโยคร่วม **ทุกครั้ง** ไม่ถามว่าตกนอกตัวกรองไหม — มัตแตนต์ที่มีไว้ให้แถวลบฆ่า ไม่ใช่ให้รอด | `247a` แถวที่สอง |
| `usersalwayssays` | อย่างเดียวกันที่จอที่เจ็ด ซึ่งคำถามของมันเป็นคนละคำถาม (คำค้น บทบาท สถานะ) | `247b` แถวที่สองและแถวที่ห้า — แถวที่ห้าเข้ามาเมื่อ 29 ต.ค. 2569 และเป็นข้ออ้างเรื่องการไปถึงเพิ่มหนึ่งข้อ ไม่ใช่ข้อเดิมนับซ้ำ (#191) แฟ้มสเปคที่ได้แถวที่มัตแตนต์ไปถึงทำให้ยอดของมันหมดอายุโดยไม่มีอะไรรายงาน (#202) |
| `userssearchblind` | ตาบอดกิ่ง **คำค้น**: `outsideTheFilters` ไม่ถามว่าแถวที่เพิ่งเขียนตรงกับคำค้นไหม | `247b` แถวที่หนึ่ง |
| `usersroleblind` | ตาบอดกิ่ง **บทบาท** | `247b` แถวที่สาม |
| `usersstatusblind` | ตาบอดกิ่ง **สถานะ** | `247b` แถวที่สี่ |
| `userssearchuntrimmed` | อ่านคำค้นแบบไม่ `trim` ซึ่งคือข้อบกพร่องที่รีวิวของ 29 ต.ค. 2569 จับได้ในการแก้ของตั๋วนี้เอง เซิร์ฟเวอร์อ่านคำค้นผ่าน `blankToNull` ซึ่ง trim ก่อน จอที่ไม่ trim จึงต่อประโยคเหนือรายการที่ **ถือ** แถวนั้นอยู่ (#96) | `247b` แถวที่ห้า |
| `offeringscopynosuffix` | ข้อ ก ที่ **การบันทึกที่สอง** ของ `Offerings`: `runCopy` พูดรายงานของตัวเองเฉย ๆ อย่างก่อนรีวิววันนั้น | `247c` แถวที่หนึ่ง |
| `offeringscopyalwayssays` | ต่อประโยคร่วมทุกครั้งที่การคัดลอกสร้างแถว ไม่ถามว่าตกนอกตัวกรองไหม | `247c` แถวที่สอง |

สี่ตัวของ `247b` แยกกันได้เพราะแฟ้มนั้น **ไม่ใช่ `serial`** และสองตัวของ `247c` ก็ด้วย
เหตุผลเดียวกัน แถวแรกที่ตายในแฟ้ม `serial` ทำให้ที่เหลือไม่ถูกรันเลย และยอดฆ่าจะอ่าน
เป็นข้ออ้างหลายข้อทั้งที่อ่านไปข้อเดียว (#67, #88)

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **`lib/outsideTheFilter.js`** — ประโยคร่วมกับ `alsoOutside` เป็น *ข้อความร่วม* และ
  มัตแตนต์อยู่ที่จุดเรียก ไม่ใช่ที่ค่าคงที่ การเล็งมาที่นี่แทนคือสิ่งที่เปลี่ยนข้ออ้างของเจ็ดจอ
  ให้เหลือข้อเดียว ซึ่งเป็นการเลือก ไม่ใช่ผลพลอยได้ของการแยกข้อความ (#104)
- **อีกห้าจอ** (`ProgramSubjects`, `Rubrics`, `Students`, `Subjects` และ **ฟอร์มแถว**
  ของ `Offerings` ซึ่งเส้นทางการคัดลอกของมันมีมัตแตนต์แล้ว) —
  สำมะโนถือไว้ และสำมะโนถูกพิสูจน์ด้วยการพังไซต์จริงกับการ **ย้ายประชากร** ไม่ใช่ด้วย
  fixture ของตัวเอง (#141, #230) ตัวเลขอยู่บนใบรับรอง §#247
- **`%` กับ `_` ในคำค้น** — `matchesSearch` ตอบ *อยู่ใน* เสมอ เพราะ `ILIKE` อ่านมัน
  เป็นตัวแทนส่วนจออ่านเป็นอักษรจริง มัตแตนต์ที่ลบกิ่งนั้นออกจะ **เทียบเท่า** กับโค้ดจริง
  ในทุกสถานการณ์ที่แถวสร้างได้ จึงพิสูจน์อะไรไม่ได้ (#47, #143) — เงื่อนไขที่จะทำให้
  มันอ่านได้เขียนไว้ข้าง `outsideTheFilters` ใน `Users.js` เอง
- **ขอบเขตสิทธิ์** — บัญชีที่ตกนอกขอบเขตของคนที่สร้างถูก `placeAllowed` ปฏิเสธด้วย 403
  ทั้งสองทาง ฉะนั้นสถานการณ์นั้นสร้างจากจอไม่ได้ และไม่มีที่บนจอให้พูด (#251 เปิดแล้ว
  หักล้างด้วยการวัดในชั่วโมงเดียวกัน)

## วิธีรัน

    python mutation/247-the-row-outside-the-filter.py save
    python mutation/247-the-row-outside-the-filter.py <mutant>
    python mutation/247-the-row-outside-the-filter.py restore
    cd e2e && npx playwright test tests/247a
    cd e2e && npx playwright test tests/247b
    cd e2e && npx playwright test tests/247c
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง

**อย่ากวาดแฟ้มนี้พร้อมกับแฟ้มอื่นที่ `FILES` ถือ `frontend/src/pages/Plos.js` หรือ
`frontend/src/pages/Users.js`** — `133-superseded-on-screen.py`,
`238-the-sentence-and-the-list-it-is-about.py`, `246-the-sentence-that-waits-for-the-list.py`,
`203-the-refusal-wins-on-the-admin-screens.py`, `211-the-loader-a-coordinate-ref-cannot-hold.py`
และแฟ้มของ `11-12-accounts-and-grants.py` เป็นต้น · เส้นทางที่ซ้ำคือสิ่งที่ทำให้การกวาดเสีย
เทียบ `FILES` ไม่ใช่หัวเรื่อง (#85, #87, #125)
"""
from harness import main

FILES = {
    'plos': 'frontend/src/pages/Plos.js',
    'users': 'frontend/src/pages/Users.js',
    'offerings': 'frontend/src/pages/Offerings.js',
}

# สมอยึดกับโค้ดที่มัตแตนต์ทำให้พัง ไม่ใช่คอมเมนต์ข้างมัน (#121, #123)
PLOS_SAYS = (
    "      const said = { error: false, "
    "message: alsoOutside('บันทึกข้อมูลเรียบร้อยแล้ว', outside) }\n"
)
PLOS_ASKS = '      const outside = outsideFilter(program, draft.program_id)\n'

USERS_ASKS = (
    '      const outside = outsideTheFilters(filters, draft, !editing?.user_id)\n'
)
USERS_ROLE = (
    "  if (creating && filters.role && filters.role !== draft.role?.role_id) return true\n"
)
USERS_STATUS = (
    "  if (creating && filters.status && filters.status !== 'active') return true\n"
)
USERS_SEARCH = "  return Boolean(term) && !matchesSearch(term.toLowerCase(), draft)\n"
# สองบรรทัด ไม่ใช่บรรทัดเดียว — #252 เขียน `importedOutsideTheFilters` ไว้เหนือ
# `outsideTheFilters` ในแฟ้มเดียวกันเมื่อ 30 ต.ค. 2569 ด้วยคำถามเรื่องคำค้นอันเดียวกัน
# ฉะนั้นบรรทัด `trim()` เดี่ยว ๆ เจอสองที่และ harness ปฏิเสธ สิ่งที่แยกสองที่นั้นคือบรรทัด
# ถัดไป ซึ่งอ่าน `draft` ไม่ใช่ `row` (#202 — guard ที่คัดลอกมาทำให้สมอของตั๋วที่ปิดแล้ว
# กำกวม) · การซ่อมนี้เล็งมัตแตนต์ตัวนี้ใหม่ ฉะนั้นมันถูกรันซ้ำเทียบ `247b` แถวที่ห้า
USERS_TRIM = (
    "  const term = String(filters.q ?? '').trim()\n"
    '  return Boolean(term) && !matchesSearch(term.toLowerCase(), draft)\n'
)

# การบันทึกที่สองของ `Offerings` ที่รีวิวของ 29 ต.ค. 2569 พบ
OFFERINGS_COPY_ASKS = (
    '      const outside =\n'
    '        outsideFilter(year, terms.academic_year) || '
    'outsideFilter(semester, terms.semester)\n'
)
OFFERINGS_COPY_SAYS = (
    '            : alsoOutside(\n'
    '                `คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ ${answer.created.length} รายวิชา รวม ${answer.sections} ตอนเรียน`,\n'
    '                outside\n'
    '              ),\n'
)

MUTANTS = {
    # ข้อ ก: พูดประโยคของจอเฉย ๆ — พฤติกรรมก่อน 29 ต.ค. 2569
    'plosnosuffix': ('plos', PLOS_SAYS,
        "      const said = { error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' }\n"),
    # ต่อทุกครั้ง: แถวลบคือสิ่งเดียวที่อ่านอีกด้านของเงื่อนไข (#48)
    'plosalwayssays': ('plos', PLOS_ASKS,
        '      const outside = outsideFilter(program, draft.program_id) || true\n'),
    'usersalwayssays': ('users', USERS_ASKS,
        '      const outside = outsideTheFilters(filters, draft, !editing?.user_id) || true\n'),
    # หนึ่งกิ่งต่อหนึ่งแถว: มัตแตนต์ต้องฆ่าแถวเดียวและปล่อยที่เหลือยืน (#97, #102)
    'usersroleblind': ('users', USERS_ROLE, ''),
    'usersstatusblind': ('users', USERS_STATUS, ''),
    'userssearchblind': ('users', USERS_SEARCH,
        '  return false && Boolean(term) && !matchesSearch(term.toLowerCase(), draft)\n'),
    # ข้อบกพร่องที่รีวิวจับได้ ทำให้รันได้: อ่านคำค้นแบบที่เซิร์ฟเวอร์ไม่ได้อ่าน (#96)
    'userssearchuntrimmed': ('users', USERS_TRIM,
        "  const term = String(filters.q ?? '')\n"
        '  return Boolean(term) && !matchesSearch(term.toLowerCase(), draft)\n'),
    # การบันทึกที่สองของ `Offerings`: ข้อ ก และ *ต่อทุกครั้ง* ที่เส้นทางการคัดลอก
    'offeringscopyalwayssays': ('offerings', OFFERINGS_COPY_ASKS,
        '      const outside =\n'
        '        outsideFilter(year, terms.academic_year) || '
        'outsideFilter(semester, terms.semester) || true\n'),
    'offeringscopynosuffix': ('offerings', OFFERINGS_COPY_SAYS,
        '            : `คัดลอกเรียบร้อยแล้ว เปิดรายวิชาใหม่ ${answer.created.length} รายวิชา รวม ${answer.sections} ตอนเรียน`,\n'),
}

main(FILES, MUTANTS)
