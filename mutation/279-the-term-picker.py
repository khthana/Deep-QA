# -*- coding: utf-8 -*-
"""#279 — ตัวเลือกภาคการศึกษาตัวเดียวแบบ `ภาค/ปี` บนจอการเปิดรายวิชาในภาคการศึกษา

    python mutation/279-the-term-picker.py save
    python mutation/279-the-term-picker.py <mutant>
    python mutation/279-the-term-picker.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/279a-the-term-picker.spec.js` และ `e2e/tests/247c-the-term-outside-the-filter.spec.js`
แถว 2 ใบ `docs/acceptance/23-offerings.md` §#279

    cd e2e && npx playwright test tests/279a-the-term-picker.spec.js tests/247c-the-term-outside-the-filter.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ชื่อขึ้นต้นด้วย `s279` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185) แต่ละตัวทำให้ข้อหนึ่งของคำตอบเจ้าของงาน
17 พ.ย. 2569 กลับเป็นอย่างก่อน หรือทำให้กลไกที่ข้อนั้นยืนอยู่หาย

- `s279opensonnewest` — จอเปิดที่ภาคใหม่สุดที่มีให้เลือก ไม่ใช่ภาคปัจจุบันของเซิร์ฟเวอร์ · แถว 1
- `s279optionyearfirst` — ตัวเลือกเขียน `ปี/ภาค` · แถว 1
- `s279everytermback` — *ทุกภาค* กลับมา · แถว 2
- `s279everyprogramback` — *ทุกหลักสูตร* กลับมา · แถว 2
- `s279programcolumnback` — คอลัมน์หลักสูตรกลับมา · แถว 3
- `s279formsemesterone` — ฟอร์มส่งภาคต้นเสมอ ไม่ว่ารายการแสดงภาคไหน · แถว 4 (สร้างที่ภาคปลาย ที่ซึ่งสองค่าไม่ตรงกัน #117, #154)
- `s279sourcesincludeshown` — ภาคต้นทางรวมภาคที่แสดงอยู่เอง · แถว 5
- `s279readsbeforeterms` — `load` อ่านเมื่อรู้หลักสูตรแล้วแต่ยังไม่รู้ภาค · แถว 6
- `s279closelivewhilecopying` — ปุ่มปิดกดได้ระหว่างคัดลอก · แถว 7
- `s279sourcelivewhilecopying` — ตัวเลือกต้นทางเปลี่ยนได้ระหว่างคัดลอก · แถว 7
- `s279escapecloseswhilecopying` — Escape ปิดหน้าต่างระหว่างคัดลอก · แถว 7
- `s279pickerbeforeterm` — ตัวเลือกภาคกดได้ก่อนรู้ภาค · แถว 8
- `s279copybeforeterm` — ปุ่มคัดลอกกดได้ก่อนรู้ภาค · แถว 8
- `s279openbeforeterm` — ปุ่มเปิดรายวิชากดได้ก่อนรู้ภาค ซึ่งเปิดฟอร์มที่ไม่มีภาคให้ใช้ · แถว 8
- `s279copytargetnotshown` — การคัดลอกส่งปลายทางเป็นภาคอื่นที่ไม่ใช่ภาคที่แสดง · `247c` แถว 2
- `s279termsaskwrite` — `/offerings/terms` ตรวจหลักสูตรด้วย `programInReach` ซึ่งเป็นคำถามของการเขียน คือโค้ดของ
  #279 ก่อน `234a` แถว 4 จับได้ 17 พ.ย. 2569 (#115) · `backend/test/offerings.test.js`
  *the term picker answers for a retired programme in reach* และ `234a` แถว 4

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **คำว่า กลุ่มเรียน** — ข้ออ้างอยู่ที่ตัวควบคุมที่ถูกกด (`23a` และไฟล์อื่นที่กดปุ่มเดียวกัน) ซึ่งเป็นตัวระบุตำแหน่ง
  (#85, #111) ไม่ใช่ข้ออ้างที่มัตแตนต์จะพิสูจน์แยกได้
- **การคัดลอกไปภาคที่รายการไม่ได้แสดง** — ไม่มีทางเข้าแล้ว `247:offeringscopynosuffix` ถอนเป็นบันทึก และ `247c`
  แถว 1 เป็นตาข่าย

## ตารางคำทำนาย (เขียนก่อนกวาด 17 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s279opensonnewest` | 1 5 6 | 1 *and the list opens on the current term* · 5 *the terms before this one that ran* (ภาคที่แสดงไม่ใช่ภาคปัจจุบัน) · 6 *one read, of one curriculum in one term* | 2 3 4 7 8 · `247c` |
| `s279optionyearfirst` | 1 | *every term the server offered, written ภาค/ปี* | ที่เหลือ: ตัวระบุตำแหน่งอ่าน `value` ไม่ใช่ข้อความ |
| `s279everytermback` | 1 2 | 1 *every term the server offered* (ตัวเลือกเกิน) · 2 *no ทุกภาค and no ทุกปี* | ที่เหลือ |
| `s279everyprogramback` | 2 | *no ทุกหลักสูตร* | ที่เหลือ: บัญชีของแถวอื่นเข้าถึงหลักสูตรเดียว ไม่มีตัวเลือกหลักสูตรถูกวาด |
| `s279programcolumnback` | 3 | *neither is a column* | ที่เหลือ |
| `s279formsemesterone` | 4 | *the term the list shows, and not one the form chose* | ที่เหลือ |
| `s279sourcesincludeshown` | 5 | *the terms before this one that ran* | ที่เหลือ · `247c` เลือกต้นทางเอง |
| `s279readsbeforeterms` | 6 | *one read, of one curriculum in one term* | ที่เหลือ |
| `s279closelivewhilecopying` | 7 | *ปิด while the copy is out* | ที่เหลือ |
| `s279sourcelivewhilecopying` | 7 | *the source while the copy is out* | ที่เหลือ |
| `s279escapecloseswhilecopying` | 7 | *Escape while the copy is out* | ที่เหลือ |
| `s279pickerbeforeterm` | 8 | *the term picker* | ที่เหลือ |
| `s279copybeforeterm` | 8 | *the copy, which copies onto the term shown* | ที่เหลือ |
| `s279openbeforeterm` | 8 | *the form, which opens a subject in the term shown* | ที่เหลือ |
| `s279termsaskwrite` | backend *retired programme in reach* · `234a` 4 | backend `answer.status` 200 · `234a` 4 ที่ `waitForList` ของ `filterOfferingsTo` (ตายที่การจัดฉาก ไม่ใช่ที่ข้ออ้าง #266) | `279a` ทุกแถว `247c`: หลักสูตรที่อ่านเปิดอยู่ |
| `s279copytargetnotshown` | `247c` 2 | *the copy goes to the term the list is on* | `247c` 1: ไม่กดคัดลอก · `279a` ทุกแถว: แถว 7 ตอบด้วย gate |
"""
from harness import main

FILES = {
    'screen': 'frontend/src/pages/Offerings.js',
    'form': 'frontend/src/components/offerings/OfferingForm.js',
    'copy': 'frontend/src/components/offerings/CopyTermPanel.js',
    'route': 'backend/routes/offerings.js',
}

MUTANTS = {
    's279opensonnewest': ('screen',
        '(termsRead ? termsOf?.current : null)',
        '(termsRead ? terms[0] : null)'),
    's279optionyearfirst': ('screen',
        '                    <option key={termLabel(entry)} value={termLabel(entry)}>\n'
        '                      {termLabel(entry)}\n',
        '                    <option key={termLabel(entry)} value={termLabel(entry)}>\n'
        '                      {`${entry.academic_year}/${entry.semester}`}\n'),
    's279everytermback': ('screen',
        '                  {terms.map(entry => (\n',
        '                  <option value="">ทุกภาค</option>\n'
        '                  {terms.map(entry => (\n'),
    's279everyprogramback': ('screen',
        '                    {programs.map(entry => (\n',
        '                    <option value="">ทุกหลักสูตร</option>\n'
        '                    {programs.map(entry => (\n'),
    's279programcolumnback': ('screen',
        '                  <th className="px-4 py-2">กลุ่มเรียน</th>\n',
        '                  <th className="px-4 py-2">หลักสูตร</th>\n'
        '                  <th className="px-4 py-2">กลุ่มเรียน</th>\n'),
    # `term` stays referenced by the heading, so `CI=true` still compiles (#101).
    's279formsemesterone': ('form',
        '      semester: Number(term.semester),\n',
        '      semester: 1,\n'),
    's279sourcesincludeshown': ('screen',
        'Number(entry.semester) < Number(term.semester)))',
        'Number(entry.semester) <= Number(term.semester)))'),
    # `termsRead` stays in the dependency list, so nothing is left unreferenced.
    's279readsbeforeterms': ('screen',
        '    if (!poolRead || !termsRead) return true\n',
        '    if (!poolRead) return true\n'),
    's279closelivewhilecopying': ('copy',
        '            onClick={close}\n'
        '            disabled={busy}\n',
        '            onClick={close}\n'),
    's279sourcelivewhilecopying': ('copy',
        '              onChange={event => setFrom(event.target.value)}\n'
        '              disabled={busy}\n',
        '              onChange={event => setFrom(event.target.value)}\n'),
    's279escapecloseswhilecopying': ('copy',
        '    if (!busy) onClose()\n',
        '    onClose()\n'),
    's279pickerbeforeterm': ('screen',
        '                    setChosenTerm(event.target.value)\n'
        '                  }}\n'
        '                  disabled={!term}\n',
        '                    setChosenTerm(event.target.value)\n'
        '                  }}\n'),
    's279copybeforeterm': ('screen',
        '                  setCopyOpen(true)\n'
        '                }}\n'
        '                disabled={!term}\n',
        '                  setCopyOpen(true)\n'
        '                }}\n'),
    # Anchored on the attribute and the class after it, not on the comment
    # between the handler and the attribute (#121, #123).
    's279openbeforeterm': ('screen',
        '                disabled={!term}\n'
        '                className="rounded-lg bg-primary px-5',
        '                className="rounded-lg bg-primary px-5'),
    's279copytargetnotshown': ('copy',
        '                academic_year: target.academic_year,\n',
        '                academic_year: String(Number(target.academic_year) + 1),\n'),
    's279termsaskwrite': ('route',
        '      const reach = await reachablePrograms(pool, req.auth.acting.scope_id);\n'
        '      if (!reach.some((entry) => entry.program_id === program)) {\n',
        '      const reach = await programInReach(pool, req.auth.acting.scope_id, program);\n'
        '      if (!reach) {\n'),
}

main(FILES, MUTANTS)
