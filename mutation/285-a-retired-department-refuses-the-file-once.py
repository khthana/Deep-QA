# -*- coding: utf-8 -*-
"""#285 — การนำเข้าใต้ภาควิชาที่ปิดแล้ว บอกประโยคปฏิเสธครั้งเดียว ไม่ซ้ำทุกบรรทัด

    python mutation/285-a-retired-department-refuses-the-file-once.py save
    python mutation/285-a-retired-department-refuses-the-file-once.py <mutant>
    python mutation/285-a-retired-department-refuses-the-file-once.py restore

แถวที่ถูกฆ่าอยู่ใน `backend/test/programs.test.js`, `backend/test/subjects.test.js`,
`e2e/tests/282a-programmes-belong-to-the-department.spec.js` และ `e2e/tests/284a-subjects-belong-to-the-department.spec.js`
ใบ `docs/acceptance/15-programs.md` §#285 และ `docs/acceptance/16-subjects.md` §#285

    cd backend && node --test test/programs.test.js test/subjects.test.js
    cd e2e && npx playwright test tests/282a-programmes-belong-to-the-department.spec.js tests/284a-subjects-belong-to-the-department.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

คำตอบของเจ้าของงาน 19 พ.ย. 2569 มีสามข้อ: ประโยคครั้งเดียว · ทั้งจอหลักสูตรและจอรายวิชา (#284 ลอกรูปรายแถวของ #282
มาในวันเดียวกัน) · ถามก่อนอ่านไฟล์ ไฟล์ว่างหรือไฟล์ของจออื่นจึงได้ประโยคภาควิชาปิดด้วย ทางที่ไม่ได้เลือกของแต่ละข้อเขียนให้รันได้ (#48)
หนึ่งตัวต่อจุดที่การแก้ลง (#125)

- `s285programsperrow` — การนำเข้าหลักสูตรถามภาควิชาปิดเป็นรายแถวอีกครั้ง (`verify` ไม่ใช่ `refuseFile`) คือรูปก่อน #285
- `s285subjectsperrow` — ตัวเดียวกันที่การนำเข้ารายวิชา
- `s285fileasksafter` — `importRows` ถามภาควิชาปิดหลังการตรวจไฟล์ว่างและแม่แบบผิด คือคำตอบข้อที่สามที่เจ้าของงานไม่ได้เลือก
  ใช้ร่วมสองจอ จึงตายในทั้งสองแฟ้ม backend (#123)

สองตัวที่รีวิวของวันเดียวกันเพิ่ม (ดูตารางของมันข้างล่าง):

- `s285asksafterempty` — ถามหลังการตรวจไฟล์ว่าง แต่ก่อนแม่แบบผิด คือครึ่งของข้อที่สามที่ `s285fileasksafter` อ่านไม่ได้
- `s285programsnotasked` — การนำเข้าหลักสูตรไม่ถามภาควิชาปิดเลย (`refuseFile` ตอบ `null`) คู่ของ `284:s284importnotverified`

## ตารางคำทำนาย (เขียนก่อนกวาด 19 พ.ย. 2569)

แถว backend ใหม่ของทั้งสองแฟ้มอ่านตามลำดับ: สถานะ · ประโยค · `errors` ว่าง · `created` · ไฟล์ว่าง · ไฟล์ของจออื่น · ไม่มีรหัสใดถูกเขียน
แถว browser ใหม่ (`282a` แถว 4 · `284a` แถว 3) อ่าน: สถานะ · ประโยคมองเห็น · นับประโยค · ไม่มีตารางรายงาน · ยอดรวมเท่าเดิม

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s285programsperrow` | backend *nothing new may be filed under a retired department* · backend *a file under a retired department is refused once* (programs) · `282a` แถว 4 | backend #282 `imported.body.message` (ได้ *ไฟล์นำเข้ามีข้อผิดพลาด…*) · #285 *with the owner’s sentence* · `282a` 4 *once, and not once per line* (ได้ 2 — สองบรรทัดของรายงาน) | `282a` 1–3 · backend ที่เหลือ · ทุกแถวของรายวิชา |
| `s285subjectsperrow` | backend *a retired department keeps its subjects* · backend *a file under a retired department is refused once* (subjects) · `284a` แถว 3 | backend #284 `imported.body.message` · #285 *with the owner’s sentence* · `284a` 3 *once, and not once per line* (ได้ 2) | `284a` 1–2 · backend ที่เหลือ · ทุกแถวของหลักสูตร |
| `s285fileasksafter` | backend *a file under a retired department is refused once* ทั้งสองแฟ้ม | *an empty file hears it before it hears it is empty* (ได้ *ไม่พบข้อมูลในไฟล์*…) — สี่ข้อแรกผ่าน เพราะไฟล์หลายแถวมีหัวถูก | `282a` 4 · `284a` 3: ไฟล์มีหัวถูกและมีแถว · backend แถว #282/#284: ไฟล์แถวเดียวหัวถูก · การนำเข้าของจออื่น: ไม่ส่ง `refuseFile` |

### มัตแตนต์ของแฟ้มอื่นที่แถวใหม่ไปถึง (เขียนก่อนกวาดซ้ำ 19 พ.ย. 2569)

แถวใหม่สี่แถวเป็นแถวที่มัตแตนต์ของ `282` กับ `284` ไปถึงได้ ยอดฆ่าของมันจึงหมดอายุโดยที่ไม่มีใครแก้ (#257) และ
`284:s284importnotverified` ถูกเล็งใหม่ เพราะ #285 เปลี่ยน `verify:` เป็น `refuseFile:` ในบรรทัดที่มันยึด

| มัตแตนต์ | แถวใหม่ที่ควรตาย | ตายที่ |
|---|---|---|
| `282:s282retiredaccepted` | backend #285 (programs) · `282a` 4 | *the file is refused* (ได้ 201) · *the server refuses the file* |
| `282:s282oldsentence` | backend #285 (programs) · `282a` 4 | *with the owner’s sentence* · *the screen says why, in the owner’s words* (ถ้อยคำพิมพ์ไว้ในแถว) |
| `284:s284retiredaccepted` | backend #285 (subjects) · `284a` 3 | *the file is refused* · *the server refuses the file* |
| `284:s284oldsentence` | backend #285 (subjects) · `284a` 3 | *with the owner’s sentence* · *the screen says why, in the owner’s words* |
| `284:s284importnotverified` (เล็งใหม่เป็น `refuseFile: () => null`) | backend #284 เหมือนเดิม · backend #285 (subjects) · `284a` 3 — `284a` เคยรอดทั้งแฟ้มเพราะไม่มีแถวนำเข้าใต้ภาควิชาที่ปิด | backend #284 `imported.status` (ได้ 201) · #285 *the file is refused* · `284a` 3 *the server refuses the file* |

### สองตัวที่รีวิวเพิ่ม และคำทำนายใหม่ของ `s285fileasksafter` (เขียนก่อนกวาดของมัน 19 พ.ย. 2569)

รีวิวพบสองช่อง ตารางข้างบนเป็นคำทำนายของรอบแรกและคงไว้อย่างที่เขียน (#54):

- **ข้ออ้างเรื่องลำดับมีสองข้อ แต่ข้อที่สองไม่ถูกอ่านใต้มัตแตนต์ใด** — `importRows` ตรวจไฟล์ว่างก่อนแม่แบบผิด
  และแถว backend อ่านไฟล์ว่างก่อน `s285fileasksafter` จึงตายที่ไฟล์ว่าง และ *another screen’s file hears it before the template*
  ไม่เคยถูกอ่าน (#88) แถวจึงอ่านไฟล์ของจออื่นก่อน แล้วค่อยไฟล์ว่าง ตัวที่ถามหลังทั้งสองข้อจะตายที่แม่แบบ ส่วนตัวใหม่
  `s285asksafterempty` ถามระหว่างสองข้อ จะผ่านแม่แบบแล้วตายที่ไฟล์ว่าง
- **ฝั่งหลักสูตรไม่มีตัวที่ทิ้งแค่ hook ของการนำเข้า** — `282:s282retiredaccepted` แก้ `retiredRefusal` ซึ่งการสร้างใช้ร่วม
  จึงตายที่การสร้างก่อน `s285programsnotasked` คือคู่ของ `284:s284importnotverified`
- แถว browser ไม่อ่านยอดรวมแล้ว เพราะ `expect.poll` ผ่านที่ตัวอย่างแรกก่อนรายการโหลดใหม่ (#50) ข้ออ้าง *ไม่มีแถวใดถูกเขียน*
  อยู่ที่แถว backend ซึ่งอ่านทีละรหัส

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s285fileasksafter` (กวาดซ้ำหลังสลับลำดับ) | backend #285 ทั้งสองแฟ้ม | *another screen’s file hears it before the template* (ได้ *หัวคอลัมน์ในไฟล์ไม่ตรงกับแบบฟอร์มของหน้านี้*…) | เหมือนรอบแรก |
| `s285asksafterempty` | backend #285 ทั้งสองแฟ้ม | *an empty file hears it before it hears it is empty* (ได้ *ไม่พบข้อมูลในไฟล์ที่นำเข้า*) — ไฟล์ของจออื่นผ่าน เพราะไฟล์นั้นมีแถว | `282a` 4 · `284a` 3 · backend แถว #282/#284 · การนำเข้าของจออื่น |
| `s285programsnotasked` | backend *nothing new may be filed under a retired department* · backend #285 (programs) · `282a` แถว 4 | backend #282 `imported.status` 400 (ได้ 201 — ไฟล์แถวเดียวที่ดี) · #285 *with the owner’s sentence* (ได้ *ไฟล์นำเข้ามีข้อผิดพลาด…* เพราะแถวที่ไม่มีชื่อไทย — บทเรียนของรอบแรกข้างล่าง) · `282a` 4 *the server refuses the file* (ได้ 201) | `282a` 1–3 · ทุกแถวของรายวิชา |
"""
from harness import main

FILES = {
    'importer': 'backend/lib/importer.js',
    'programs': 'backend/routes/programs.js',
    'subjects': 'backend/routes/subjects.js',
}

MUTANTS = {
    's285programsperrow': ('programs',
        '        refuseFile: () => retiredRefusal(req),\n',
        '        verify: () => retiredRefusal(req),\n'),
    's285subjectsperrow': ('subjects',
        '        refuseFile: () => retiredRefusal(req),\n',
        '        verify: () => retiredRefusal(req),\n'),
    # `retiredRefusal` stays referenced by the create, so nothing is unread (#101).
    's285programsnotasked': ('programs',
        '        refuseFile: () => retiredRefusal(req),\n',
        '        refuseFile: () => null,\n'),
    # Between the two file checks: right for another screen's file, which has
    # rows, and wrong for an empty one.
    's285asksafterempty': [
        ('importer',
         '  const refusedFile = refuseFile ? await refuseFile() : null;\n'
         '  if (refusedFile) return { ok: false, message: sentenceOf(refusedFile) };\n'
         '\n'
         '  const { headers, records }',
         '  const { headers, records }'),
        ('importer',
         '  if (records.length === 0) return { ok: false, empty: true };\n',
         '  if (records.length === 0) return { ok: false, empty: true };\n'
         '  const refusedFile = refuseFile ? await refuseFile() : null;\n'
         '  if (refusedFile) return { ok: false, message: sentenceOf(refusedFile) };\n'),
    ],
    # Moved, not dropped: the same question, asked after the file is judged.
    's285fileasksafter': [
        ('importer',
         '  const refusedFile = refuseFile ? await refuseFile() : null;\n'
         '  if (refusedFile) return { ok: false, message: sentenceOf(refusedFile) };\n'
         '\n'
         '  const { headers, records }',
         '  const { headers, records }'),
        ('importer',
         '    return { ok: false, wrongTemplate: true };\n'
         '  }\n',
         '    return { ok: false, wrongTemplate: true };\n'
         '  }\n'
         '  const refusedFile = refuseFile ? await refuseFile() : null;\n'
         '  if (refusedFile) return { ok: false, message: sentenceOf(refusedFile) };\n'),
    ],
}

main(FILES, MUTANTS)
