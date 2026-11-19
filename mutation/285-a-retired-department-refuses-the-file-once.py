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
