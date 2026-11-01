# -*- coding: utf-8 -*-
"""
#56 ไฟล์ผิดกล่องถูกรายงานว่าข้อมูลเสีย - the wrong file, reported as bad data.

Three mutants against the backend seam, not the browser one: what #56 changed
is which sentence the server answers with, and `backend/test/*.test.js` is where
that is asked.

    python mutation/56-wrong-template.py save
    python mutation/56-wrong-template.py <mutant>
    cd backend && node --test test/departments.test.js test/programs.test.js
    python mutation/56-wrong-template.py restore

`nocheck` is the state the six import boxes were in before this ticket. `strict`
is the version of the check that was considered and refused - the whole template
list rather than the columns the reader requires. The row it kills was written in
this same ticket: nothing that existed before #56 uploaded a file with an
optional column deleted, so the strict rule would have gone in as a silent
regression. The mutant is what makes that new row mean something. `firstcheck` swaps the check ahead of the empty one, which is the order
`sendImport`'s doc comment claims and which nothing asserted until #56 added the
header-less file.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือสามแถวของตารางมัตแตนต์ใน `docs/acceptance/14-departments.md` (บรรทัด 210–212) ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `nocheck` | ปิดการตรวจหัวคอลัมน์ทิ้ง (`if (false && …)`) คือสภาพก่อนตั๋วนี้ — ทุกแถวของไฟล์หลักสูตรล้ม `readDepartment` ที่ชื่อเดียวกัน และคำตอบคือรายงานรายบรรทัดที่ตั๋วถูกเปิดขึ้นมาเพราะมัน | **สองแถวใน `backend/test`** (ไฟล์หลักสูตรเข้ากล่องภาควิชา และกลับด้าน) **กับแถว `#56` ใน `14b`** — รอบนี้เดินกับ browser seam จริง ไม่ได้อนุมานจากผลฝั่ง backend: `npx playwright test 14b` ได้ 1 failed / 4 passed และตัวที่ตายคือ assertion ที่หาแถบคำปฏิเสธ ไม่ใช่ assertion เก่าตัวอื่นในไฟล์เดียวกัน · แถวรายงานรายบรรทัดทั้งหมดยังผ่าน ซึ่งคือเกณฑ์ข้อสอง |
| `strict` | เปลี่ยน `required` ของภาควิชาเป็น `IMPORT_COLUMNS` ทั้งชุด คือกฎที่ถ้อยคำของตั๋วชี้ตามตัวอักษร และเป็นทางเลือกที่ปฏิเสธไป — มันปฏิเสธไฟล์ผิดแบบด้วย จึงดูเหมือนถูก สิ่งที่มันปฏิเสธเพิ่มคือไฟล์ที่ถูกแต่ลบคอลัมน์ชื่ออังกฤษซึ่งไม่บังคับออก ซึ่งนำเข้าได้ก่อนตั๋วนี้ | **แถวที่อัปโหลดไฟล์ซึ่งมีคอลัมน์แปลกปลอมและไม่มีชื่ออังกฤษ** แถวไฟล์ผิดกล่องยังผ่าน · แถวที่ตายเป็นแถวที่ #56 เขียนขึ้นเองพร้อมกับมัตแตนต์ตัวนี้ ไม่ใช่แถวเก่า — ก่อนตั๋วนี้ไม่มีชุดทดสอบไหนอัปโหลดไฟล์ที่ขาดคอลัมน์ไม่บังคับเลย สิ่งที่มันพิสูจน์จึงเป็นว่าแถวใหม่นั้นเห็นความต่างระหว่างสองกฎจริง ถ้าไปใช้กฎเข้มโดยไม่มีแถวนี้ มันจะเป็นการถอยหลังแบบเงียบ ๆ |
| `firstcheck` | สลับให้ตรวจหัวคอลัมน์ก่อนตรวจไฟล์เปล่า — body ที่ไม่มีอะไรเลยก็ไม่มีหัวคอลัมน์ การอัปโหลดไฟล์เปล่าจึงถูกตอบว่า *คุณดาวน์โหลดแบบฟอร์มผิด* | **แถวไฟล์ที่ไม่มีบรรทัดหัวเลยแถวเดียว** — ก่อนตั๋วนี้ไม่มีชุดทดสอบไหนยึดลำดับนี้ไว้ ชุดเดิมอัปโหลด `csvOf([])` ซึ่งมีบรรทัดหัวอยู่ #56 จึงเพิ่มแถวที่อัปโหลด body เปล่าจริง ๆ เพื่อให้มัตแตนต์ตัวนี้มีอะไรให้ฆ่า |
"""

from harness import main

FILES = {
    "importer": "backend/lib/importer.js",
    "departments": "backend/routes/departments.js",
}

MUTANTS = {
    # No header check at all. Every row of a programmes file fails
    # `readDepartment` on the same missing name, and the answer is the per-row
    # report the ticket was opened about. Kills the two wrong-template tests and
    # leaves the per-row ones - which is the second acceptance row: this must
    # not swallow the behaviour that was already there.
    "nocheck": ("importer",
                "  if (required.some((column) => !headers.includes(column))) {",
                "  if (false && required.some((column) => !headers.includes(column))) {"),
    # The check the ticket's wording suggests literally - compare the header
    # against `IMPORT_COLUMNS`. It refuses the wrong-template files too, so it
    # looks right; what it also refuses is a correct file whose optional English
    # name column was deleted, which imported before this ticket. Kills the
    # departments test that carries an unknown column and omits an optional one.
    "strict": ("departments",
               "        required: ['department_id', 'department_name_th'],",
               "        required: IMPORT_COLUMNS,"),
    # The header asked about before the rows are counted. A body with nothing in
    # it has no header either, so a blank upload is answered "you downloaded the
    # wrong template". Kills the header-less file test alone.
    "firstcheck": ("importer",
                   """  if (records.length === 0) return { ok: false, empty: true };

  // #56. Asked before any row is read, and after the empty check: a body with
  // nothing in it has no header either, and answering that with "wrong
  // template" would tell somebody who uploaded a blank file to go and download
  // a different one. A header missing a column every row needs is not a file
  // with bad rows in it - it is the wrong file, and the per-row report that
  // used to come back named every line of a file whose data was fine.
  if (required.some((column) => !headers.includes(column))) {
    return { ok: false, wrongTemplate: true };
  }""",
                   """  if (required.some((column) => !headers.includes(column))) {
    return { ok: false, wrongTemplate: true };
  }

  if (records.length === 0) return { ok: false, empty: true };"""),
}

main(FILES, MUTANTS)
