# -*- coding: utf-8 -*-
"""#272 ชิ้นที่สอง — ช่องค้นหาของ `Users` รายชื่อนักศึกษาของรายวิชา และกลุ่มงาน

    python mutation/272-the-search-box-on-three-more-screens.py save
    python mutation/272-the-search-box-on-three-more-screens.py <mutant>
    python mutation/272-the-search-box-on-three-more-screens.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/272b-the-search-box-on-three-more-screens.spec.js`
ใบ `docs/acceptance/272-the-search-box.md` §ชิ้นที่สอง

    cd e2e && npx playwright test tests/272b-the-search-box-on-three-more-screens.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ตัวละจุด เหมือนแฟ้มของชิ้นแรก (#68, #104): ที่ `Users` สามตัว — เส้นทางกลับไปอ่าน `%` `_` เป็นตัวแทน
(`usersescape`) จอกลับไปตอบ *อยู่ใน* ให้คำค้นที่มีสองตัวนั้น (`userswildcard` ซึ่งคือโค้ดก่อนคำตอบของ
13 พ.ย. 2569 #115) และช่องกลับเป็นช่องเดิมที่ไม่มีแว่นและไม่หน่วง (`usersinput`) · ที่รายชื่อนักศึกษา
เก้าตัว — ส่ง `q`, เส้นทางค้น, ตัวเลขบนหัวจอ, ประโยคตอนว่าง, การกลับหน้าหนึ่ง และจุดเรียก `outsideSearch`
สองจุดในสองทิศ · ที่กลุ่มงานสิบสองตัว — การกรอง, สิ่งที่ค้น (สมาชิก และชื่อสมาชิก), ประโยคตอนว่าง, ตัวเลข
บนหัวจอ, ประโยคตอนบันทึกในสองทิศ, ตัวเลือกกลุ่มของการบันทึกสามแบบ และประโยคตอนนำเข้าในสองทิศ — ทิศที่สอง
ของแต่ละจุดคือสิ่งที่แถวคุมมีไว้จับ (#48, #108)

ชื่อขึ้นต้นด้วย `s272b` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185)

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **`q` ในกุญแจ `readOf` ของรายชื่อนักศึกษา** — ต่างจากสี่จอของชิ้นแรก ที่นี่ไปถึงได้: ช่องค้นหาไม่ได้อยู่ในกิ่งที่
  ฟอร์มแทนที่ ฟอร์ม *เพิ่มนักศึกษาเข้าตอนเรียน* วาดอยู่ข้างรายการ ฉะนั้นคนพิมพ์คำค้นระหว่างที่การเพิ่มยังไม่กลับได้
  และกุญแจที่ถือคำค้นคือสิ่งที่กันประโยคของคำค้นเก่าไม่ให้ถูกพูดทับรายการของคำค้นใหม่ · *ยังไม่ได้ทดสอบ* ลงวันที่
  13 พ.ย. 2569 สิ่งที่ขาดคือแถว ซึ่งต้องจับการเขียนไว้ (`hold` ของ `support/gate.js`) แล้วพิมพ์ — ตั๋ว #275
- **คำถามข้อที่สองของ `onImported` บนกลุ่มงาน** (`onScreen.current === drawing` ก่อนพูดประโยคของ #252) —
  `drawing` ตอบ `true` จากใน `try` ไม่ว่า `isCurrent()` จะว่าอย่างไร (#152) ข้อนี้จึงจำเป็น และทางเข้าคือการกระโดด
  ข้ามตอนเรียนของ `268` ขณะที่มีคำค้นอยู่ · *ยังไม่ได้ทดสอบ* ลงวันที่ 13 พ.ย. 2569 ตั๋ว #275 · ข้อแรกของมันคือ
  `drawing(() => onScreen.current === drawing)` ซึ่ง `268:groupsimporthandlerstale` ทำให้พังอยู่แล้ว
- **คำค้นของกลุ่มงานไม่อยู่ในกุญแจของประโยค** — การค้นไม่ส่งคำขอ ประโยคของการบันทึกถามคำค้นของการเรนเดอร์ที่ส่ง
  ไม่ใช่ของตอนที่คำตอบกลับ · ถ้าคนพิมพ์ระหว่างที่การบันทึกยังไม่กลับ ประโยคตัดสินด้วยคำค้นเก่า · *ยังไม่ได้ทดสอบ*
  ลงวันที่ 13 พ.ย. 2569 ตั๋ว #275 (เพิ่มหลังรีวิววันเดียวกัน ใบเกณฑ์ถือข้อนี้อยู่แล้ว แฟ้มนี้ไม่มี)
- **การหน่วง** — ชิ้นแรกบอกเหตุผลไว้แล้ว (#52)

## ตารางคำทำนาย (เขียนก่อนกวาด 13 พ.ย. 2569)

แถวของ `272b` ย่อตามลำดับในแฟ้ม: **U1** *the box is the shared search box, and an underscore is a
character* · **U2** *an account created under a term holding an underscore* · **C1** *finds a student four
pages in* · **C2** *the heading's count is the whole class* · **C3** *a term nothing holds* · **C4** *a term
typed on page two asks for page one* · **C5** *an enrolment the term does not find* · **C6** *an enrolment the
term finds* · **C7** *a file the term does not find* · **C8** *a file the term finds* · **G1** *a group name* ·
**G2** *a member's code* · **G3** *a member's name* · **G4** *a term nothing holds, and the heading's count* ·
**G5** *a group created outside* · **G6** *created inside* · **G7** *a rename* · **G8** *taking out the only
member* · **G9** *a file the term does not find* · **G10** *a file the term finds* · **C9** *the class
list: a jump to another ตอนเรียน clears the term* · **G11** *the groups: a jump …* (สองแถวนี้กับสี่ตัวท้ายของ
ตารางเขียนทีหลัง วันเดียวกัน หลังคำตอบของเจ้าของงานว่าการกระโดดข้ามตอนเรียนล้างคำค้น ก่อนกวาดสี่ตัวนั้น)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s272busersescape` | U1 | `total` — `teacher_one` พบ `teacher.one` | U2: `zz_272` ในแบบตัวแทนก็ไม่พบใคร ทั้งในเมล์ `z272.under` |
| `s272buserswildcard` | U2 | ประโยค — จอตอบ *อยู่ใน* | U1 ไม่ได้อ่านประโยค |
| `s272busersinput` | U1 | `toBeVisible` ของ `searchbox` | U2: `users.search` หาช่องด้วย placeholder ซึ่งช่องเดิมก็มี |
| `s272bclassnoq` | C1 ถึง C8 (8) | ที่การจัดฉาก — `searchClass` รอคำขอที่ถือ `q` (#139) | U และ G |
| `s272bclassunsearched` | C1 C3 C5 (3) | C1 ที่ `total` · C3 ที่ประโยคตอนว่าง · C5 ที่ *รายการไม่ถือแถว* — `65010001` เรียงก่อนทุกคนในหน้าหนึ่ง | C2 (หัวจออ่าน `enrolled`) C4 C6 C7 C8 — ประโยคเป็นของจอ |
| `s272bclassenrolled` | C2 | ตัวเลขบนหัวจอ | ที่เหลือ · เล็งใหม่หลังรีวิว: จอไม่มี `?? data.total` แล้ว |
| `s272bclassempty` | C3 C5 C7 (3) | C3 ที่ข้ออ้าง · C5 C7 ที่การจัดฉาก: คำค้น `zz272-nothing` รอประโยคตอนว่าง | ที่เหลือ · **ทำนายใหม่หลังรีวิว:** `searchClass` ไม่รอประโยคแล้ว จึงเหลือ C3 ที่ข้ออ้างของมันเอง |
| `s272bclasspageone` | C4 | `page` ของคำขอ | ที่เหลือเริ่มที่หน้าหนึ่ง |
| `s272bclasssavequiet` | C5 | ประโยค | ที่เหลือ |
| `s272bclasssavealways` | C6 | ประโยค | ที่เหลือ |
| `s272bclassimportquiet` | C7 | ประโยค | ที่เหลือ |
| `s272bclassimportalways` | C8 | `toHaveCount(0)` ของประกาศ | ที่เหลือ |
| `s272bgroupsunfiltered` | G1 ถึง G5 G7 G8 G9 (8) | G1 ถึง G3 ที่ `toEqual` · G4 ที่ประโยคตอนว่าง · G5 G7 G8 G9 ที่การจัดฉาก `cardsAre` | G6 G10 ใช้ `toContain` |
| `s272bgroupsnamesonly` | G2 G3 G8 (3) | G2 G3 ที่ `toEqual` · G8 ที่การจัดฉาก | ที่เหลือ |
| `s272bgroupsnoname` | G3 | `toEqual` | G2 ค้นด้วยรหัส |
| `s272bgroupsempty` | G4 | ประโยคตอนว่าง | ที่เหลือ |
| `s272bgroupscount` | G4 | ตัวเลขบนหัวจอ — อ่านหลังประโยคตอนว่าง ซึ่งมัตแตนต์ไม่แตะ | ที่เหลือ |
| `s272bgroupssavequiet` | G5 G7 G8 (3) | ประโยค | ที่เหลือ |
| `s272bgroupssavealways` | G6 | ประโยค | ที่เหลือ: แถวอื่นของ `26a` ไม่มีคำค้น |
| `s272bgroupscreateabout` | G5 | ประโยค | ที่เหลือ |
| `s272bgroupsrenameabout` | G7 | ประโยค | ที่เหลือ |
| `s272bgroupstakeoutabout` | G8 | ประโยค | ที่เหลือ |
| `s272bgroupsimportquiet` | G9 | ประโยค | ที่เหลือ |
| `s272bgroupsimportalways` | G10 | `toHaveCount(0)` ของประกาศ | ที่เหลือ |
| `s272bclassjumpkeeps` | C9 | `q` ของคำขอที่การกระโดดส่ง | ที่เหลือไม่กระโดด |
| `s272bclassboxkept` | C9 | `toHaveValue('')` ของช่อง — `SearchBox` ถือสิ่งที่พิมพ์จาก `value` แรกและไม่ตามมันอีก | ที่เหลือ |
| `s272bgroupsjumpkeeps` | G11 | การ์ด — คำค้นยังซ่อนทุกกลุ่ม | ที่เหลือ |
| `s272bgroupsboxkept` | G11 | `toHaveValue('')` ของช่อง | ที่เหลือ |

## บันทึกผลกวาด (13 พ.ย. 2569 · `tests/272b` ทั้งแฟ้ม ทีละตัว · `_local/sweep272e.ps1` กับ `sweep272f.ps1`)

ยี่สิบสองตัวจากยี่สิบสี่ตายตรงตามตาราง ทั้งจำนวนและชื่อแถว · ที่ไม่ตรงมีสองตัว:

- `s272bclassempty` **ล้ม 5 ผ่าน 15** ทำนายไว้ 3 — C6 กับ C8 ตายด้วย ที่การจัดฉากเหมือน C5 C7: คำค้นของสองแถวนั้น
  (`65010002` `65010004`) เป็นนักศึกษาที่ยังไม่ได้ลงทะเบียน รายการจึงว่าง และ `searchClass` รอสิ่งที่จอวาดตอนว่าง ·
  คำทำนายอ่านแค่คำค้นที่เขียนว่า *nothing* ไม่ได้อ่านว่าคำค้นไหนพบอะไรก่อนการเขียน (#258)
  · ทั้งห้าแถวตายที่บรรทัดเดียวกันใน `searchClass` **รวม C3** ซึ่งข้ออ้างของมันเองอยู่ใต้บรรทัดนั้นและอ่านถ้อยคำเดียวกัน
  ฉะนั้น kill ของ C3 อยู่ที่การรอของตัวช่วย ไม่ใช่ที่ `expect` ของแถว (#233, #266) — ข้ออ้างเดียวกัน แต่ถูกอ่านในที่อื่น
- `s272bgroupssavealways` **รอด** ในรอบแรก — G6 กดสร้างทันทีหลังพิมพ์ ระหว่างที่ช่องยังหน่วงอยู่ ฉะนั้นการเรนเดอร์ที่ส่ง
  ถือคำค้นว่าง และมัตแตนต์กับโค้ดจริงตอบเหมือนกัน (#117) · การแก้คือแถว ไม่ใช่มัตแตนต์ (#118): G6 กับ G10 รอให้การ์ด
  ของข้อมูลตั้งต้นหายก่อนเขียน (`seedHidden`) · กวาดซ้ำ **ล้ม 1** ที่ `toHaveText` ของประโยค · `s272bgroupsimportalways`
  กวาดซ้ำด้วย เพราะ G10 ได้จุดรอเดียวกัน **ล้ม 1** ที่ `toHaveCount(0)` ของประกาศ

ตัวอื่น: `usersescape` `userswildcard` `usersinput` ล้ม 1 แถวละตัวตามตาราง (`usersinput` ตายที่ `toBeVisible`
ของช่อง) · `classnoq` ล้ม 8 ที่การจัดฉาก (9.3 นาที ตายที่การรอของ `searchClass`, #139) · `classunsearched` ล้ม 3
(C1 C3 C5) · `groupsunfiltered` ล้ม 8 · `groupsnamesonly` ล้ม 3 (G2 G3 G8) · `groupssavequiet` ล้ม 3 (G5 G7 G8) ·
ที่เหลือล้ม 1 ที่แถวของมัน

**สิบเอ็ดตัวที่ถูกเล็งใหม่** ถูกกวาดกับสเปคของมันเองวันเดียวกัน (#203, #257): `140:enrolmentremovestalewins` ล้ม 1 ·
`152:enrolmentremovalanyway` ล้ม 2 · `152:enrolmentmovedremovalanyway` ล้ม 1 · `202:enrolmentremovekeyedelsewhere`
ล้ม 1 ที่ `toBeVisible` ของประโยคการนำออก (รอบแรกไม่ได้รันแถวใด เพราะ `--grep` ภาษาไทยผ่าน `cmd` แล้วไม่ตรงอะไร
ซึ่งพิมพ์ผลว่างและออก 0 — #268) · `141:groupsstalewins` ล้ม 2 (`141b` กับ `266b`) · `266:groupswritehandlerstale` ล้ม 1 ·
`268:groupsimporthandlerstale` ล้ม 1 · `25:nooffset` ล้ม 1 · `25:pagecount` ล้ม 7 (แถว 1 2 5 7 ของ `25a` อย่างบันทึกเดิม) ·
`25:offeringgrain` ล้ม 1 · `25:importstaysonpage` ล้ม 1

## บันทึกผลกวาดรอบหลังรีวิว (13 พ.ย. 2569 · `tests/272b` ทั้งแฟ้ม 22 แถว · `_local/sweep272g.ps1`)

หกตัว ตายตรงตามตารางทุกตัว ตัวละหนึ่งแถว ที่ข้ออ้างของแถวนั้นเอง:

- `s272bclassempty` ล้ม 1 — C3 ที่ `toBeVisible` ของ *ไม่พบนักศึกษาตามคำค้น* ในแถว ไม่ใช่ใน `searchClass` อีกแล้ว ·
  C5 ถึง C8 รอดเพราะตัวช่วยรอให้แถวของนักศึกษาหาย ซึ่งจอที่วาดประโยคผิดก็ทำ (รีวิว: #81, #233)
- `s272bclassenrolled` (เล็งใหม่) ล้ม 1 — C2 ที่ *นักศึกษา N คน*
- `s272bclassjumpkeeps` ล้ม 1 — C9 ที่ `q` ของคำขอที่การกระโดดส่ง
- `s272bclassboxkept` ล้ม 1 — C9 ที่ `toHaveValue('')` ของช่อง
- `s272bgroupsjumpkeeps` ล้ม 1 — G11 ที่การ์ด
- `s272bgroupsboxkept` ล้ม 1 — G11 ที่ `toHaveValue('')` ของช่อง
"""
from harness import main

FILES = {
    'usersroute': 'backend/routes/users.js',
    'users': 'frontend/src/pages/Users.js',
    'enrolroute': 'backend/routes/enrolment.js',
    'class': 'frontend/src/pages/SubjectStudents.js',
    'groups': 'frontend/src/pages/StudentGroups.js',
}

USERS_BOX = (
    '            <SearchBox\n'
    '              label="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"\n'
    '              value={filters.q}\n'
    '              onSearch={term => {\n'
    '                setPage(1)\n'
    '                setFilters(current => ({ ...current, q: term }))\n'
    '              }}\n'
    '            />\n'
)
USERS_INPUT = (
    '            <input\n'
    '              className={`${control} w-64`}\n'
    '              value={filters.q}\n'
    "              onChange={filter('q')}\n"
    '              placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"\n'
    '            />\n'
)
CLASS_SAVE = 'outsideSearch(q, searched(student))'
CLASS_IMPORT = '(result?.students ?? []).some(row => outsideSearch(q, searched(row)))'
GROUPS_SAVE = 'alsoOutside(message, hidden(q, about))'
GROUPS_IMPORT = 'hidden(q, group => groups.has(group.group_id))'

KEEPS = "  const q = search.of === sectionId ? search.q : ''\n"

MUTANTS = {
    # เส้นทางอ่าน `%` `_` เป็นตัวแทนอีกครั้ง - โค้ดก่อน 13 พ.ย. 2569
    's272busersescape': ('usersroute', 'const search = searchOf(req);',
        'const search = blankToNull(req.query.q);'),
    # จอตอบ *อยู่ใน* ให้คำค้นที่มี `%` หรือ `_` - โค้ดก่อน 13 พ.ย. 2569 (#115)
    's272buserswildcard': ('users', 'const matchesSearch = (term, draft) => {\n',
        "const matchesSearch = (term, draft) => {\n  if (term.includes('%') || term.includes('_')) return true\n"),
    # ช่องเดิมของ #20
    's272busersinput': ('users', USERS_BOX, USERS_INPUT),

    's272bclassnoq': ('class', 'listEnrolled(sectionId, { page, q })', 'listEnrolled(sectionId, { page })'),
    's272bclassunsearched': ('enrolroute', 'const search = searchOf(req);', 'const search = searchOf(req) && null;'),
    's272bclassenrolled': ('class', '{data.enrolled} คน', '{data.total} คน'),
    's272bclassempty': ('class', '{q.trim()', '{q.trim() && false'),
    's272bclasspageone': ('class',
        '              onSearch={term => {\n                setPage(1)\n                setQ(term)\n',
        '              onSearch={term => {\n                setQ(term)\n'),
    's272bclasssavequiet': ('class', CLASS_SAVE, 'Boolean(student && false)'),
    's272bclasssavealways': ('class', CLASS_SAVE, 'Boolean(student && q.trim())'),
    's272bclassimportquiet': ('class', CLASS_IMPORT, 'Boolean(result && false)'),
    's272bclassimportalways': ('class', CLASS_IMPORT, 'Boolean(result && q.trim())'),

    's272bgroupsunfiltered': ('groups',
        'const shown = data?.groups.filter(group => !outsideSearch(q, searched(group))) ?? []',
        'const shown = data?.groups ?? []'),
    's272bgroupsnamesonly': ('groups',
        '  ...group.members.flatMap(member => [member.student_id, member.full_name_th]),\n', ''),
    's272bgroupsnoname': ('groups',
        '[member.student_id, member.full_name_th]', '[member.student_id]'),
    's272bgroupsempty': ('groups',
        '{data.groups.length > 0 && shown.length === 0 && (',
        '{data.groups.length < 0 && shown.length === 0 && ('),
    's272bgroupscount': ('groups',
        '{data.groups.length} กลุ่ม · จัดกลุ่มแล้ว', '{shown.length} กลุ่ม · จัดกลุ่มแล้ว'),
    's272bgroupssavequiet': ('groups', GROUPS_SAVE, 'alsoOutside(message, Boolean(about && false))'),
    's272bgroupssavealways': ('groups', GROUPS_SAVE, 'alsoOutside(message, Boolean(about && q.trim()))'),
    's272bgroupscreateabout': ('groups', '      group => group.group_name === typed,\n', '      () => false,\n'),
    's272bgroupsrenameabout': ('groups', '      group => group.group_id === group_id,\n', '      () => false,\n'),
    's272bgroupstakeoutabout': ('groups', '      one => one.group_id === group.group_id,\n', '      () => false,\n'),
    's272bgroupsimportquiet': ('groups', GROUPS_IMPORT, 'Boolean(groups && false)'),
    's272bgroupsimportalways': ('groups', GROUPS_IMPORT, 'Boolean(groups && q.trim())'),
    # The owner's answer of 13 November 2569: a jump to another ตอนเรียน clears the term.
    's272bclassjumpkeeps': ('class', KEEPS, '  const q = search.q\n'),
    's272bclassboxkept': ('class', '            <SearchBox\n              key={sectionId}\n',
        '            <SearchBox\n'),
    's272bgroupsjumpkeeps': ('groups', KEEPS, '  const q = search.q\n'),
    's272bgroupsboxkept': ('groups', '<SearchBox key={sectionId} label="ค้นหากลุ่มหรือสมาชิก"',
        '<SearchBox label="ค้นหากลุ่มหรือสมาชิก"'),
}

main(FILES, MUTANTS)
