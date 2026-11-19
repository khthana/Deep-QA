# -*- coding: utf-8 -*-
"""#292 — กรรมการหลักสูตรเข้าข้อมูลนักศึกษากลางได้ อ่านและเขียน เฉพาะหลักสูตรตัวเอง

    python mutation/292-the-committee-reads-its-own-programme.py save
    python mutation/292-the-committee-reads-its-own-programme.py <mutant>
    python mutation/292-the-committee-reads-its-own-programme.py restore

แถวที่ถูกฆ่าอยู่ใน `backend/test/students.test.js` (สามแถวท้ายแฟ้มที่ลงท้าย `- #292`) และ
`e2e/tests/17a-students-refusals.spec.js` แถว 20 ใบ `docs/acceptance/17-students.md` §#292

    cd backend && node --test test/students.test.js
    cd e2e && npx playwright test tests/17a-students-refusals.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237) · `backend/routes/students.js` อยู่ใน `FILES`
ของ `67-import-template-sample.py` ด้วย อย่ากวาดสองแฟ้มนี้พร้อมกัน (#85)

## มัตแตนต์

ชื่อขึ้นต้นด้วย `s292` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185) คำตอบของเจ้าของงาน 20 พ.ย. 2569
คือ อ่านและเขียน เฉพาะหลักสูตรตัวเอง — สองทางที่ไม่ได้เลือกของ *เฉพาะหลักสูตรตัวเอง* ถูกเขียนให้รันได้ (#48)
คือ ถามภาควิชาอย่างเดียวแบบก่อน #292 (`s292departmentonly`) และขยายไปถึงภาควิชาของหลักสูตร (`s292wholedepartment`)

- `s292committeerefused` — `MAINTAINERS` กลับเป็น `DEPT_ADMIN` อย่างเดียว คือคำตัดสินของ #17
- `s292departmentonly` — `IN_REACH` ถามแต่ `department_id` คือ clause ก่อน #292 ซึ่งตอบสิทธิ์ระดับหลักสูตรว่าไม่มีอะไรเลย
- `s292wholedepartment` — `IN_REACH` ถามภาควิชาของหลักสูตรในขอบเขตแทน `program_id` คือทาง *ทั้งภาควิชา* ที่เจ้าของงานไม่ได้เลือก
- `s292nodepartmentbehind` — รายการภาควิชาไม่เติมภาควิชาของหลักสูตรของกรรมการ (`added` ยังถูกอ้างถึง #101)

สามตัวที่รีวิวของวันเดียวกันเพิ่ม หลังการกวาดสี่ตัวแรก: `s292departmentonly` แก้ค่าคงที่ที่สามที่ใช้ร่วมกัน และแถวกรรมการ
ทุกแถวตายที่รายการก่อน การอ่านทีละคนกับ `refuseWrite` จึงไม่มีมัตแตนต์ของตัวเอง (#104, #125, #88) — ตัวละที่:

- `s292listsite` — รายการกลับไปถามภาควิชาอย่างเดียว
- `s292readsite` — การอ่านทีละคนกลับไปถามภาควิชาอย่างเดียว
- `s292ownersite` — `refuseWrite` กลับไปถามภาควิชาอย่างเดียว

เมนูซ้ายไม่มีมัตแตนต์: รายการในเมนูคือสิ่งที่หน้าจอวาด ใบ 17 ให้คนเดิน (☐)

## ตารางคำทำนาย (เขียนก่อนกวาด 20 พ.ย. 2569)

แถว backend ทั้งสามอ่านตามลำดับในแฟ้ม และแถวที่ตายรายงาน assertion แรกที่มันแตะ (#88) แถว 20 ของ `17a`
อ่าน สถานะ · `total` · ตัวเลือกหลักสูตร · คำบอกภาควิชา ตามลำดับนั้น

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s292committeerefused` | backend *reads its own หลักสูตร* · *the other committee* · *writes into its own* · `17a` 20 | backend `theirs.status` (403) · `theirs.body.total` (undefined) · `added.status` (403) · `17a` 20 `response.status()` 403 | backend แถวอื่นทุกแถว: ไม่มีแถวไหนเรียกด้วยกรรมการอีก · `17a` 19, 21, 22 และแถวควบคุม |
| `s292departmentonly` | backend สามแถวเดียวกัน · `17a` 20 | backend `theirs.body.total` 0 · `theirs.body.total` 0 · `file.status` 400 (การนำเข้าที่ทับนักศึกษาที่เพิ่งเพิ่ม ถูกปฏิเสธเป็น `studentNotYours` — การเพิ่มก่อนหน้าผ่าน เพราะยังไม่มีแถวเดิม) · `17a` 20 `body.total` 0 | backend แถวของผู้ดูแลภาควิชาทุกแถว: ขอบเขตของภาควิชามีรหัสภาควิชาอยู่แล้ว · `17a` แถวอื่น |
| `s292wholedepartment` | backend สามแถวเดียวกัน | backend `theirs.body.total` (นับนักศึกษาข้างเคียงเพิ่มหนึ่ง) · `theirs.body.total` (U_COM2 ได้ทั้งภาควิชา) · `moved.status` 201 (ทับนักศึกษาข้างเคียงได้) | **`17a` 20 รอด** — seed ของ e2e มีนักศึกษาใน `0501` ทั้งหมด ไม่มีนักศึกษาข้างเคียงให้แยก ข้ออ้างนี้จึงเป็น ☑ ที่ seam HTTP · backend แถวของผู้ดูแลภาควิชา |
| `s292nodepartmentbehind` | backend *reads its own หลักสูตร* · `17a` 20 | backend `deepEqual` ของ `named.body.departments` ([] ไม่ใช่ `['05']`) · `17a` 20 `stated` toHaveText (ไม่มีคำบอก) — ตัวเลือกหลักสูตรข้างบนผ่าน | backend อีกสองแถวของกรรมการ: ไม่ถามรายการภาควิชา · แถวของ `U_DEPT2`: ภาควิชาของตัวเองอยู่ใน `covered` · `17a` แถวอื่น |

## บันทึกการกวาด 20 พ.ย. 2569

ต้นไม้ถูกถามด้วย md5 ของ `git diff -- frontend backend` ก่อนรันทุกตัว และหลังตัวสุดท้ายกลับมาเท่าเดิม (#268) ·
backend คือ `backend/test/students.test.js` ทั้งแฟ้ม (20 แถว) · e2e คือ `17a` ทั้งแฟ้ม (5 แถว) · รันสะอาดก่อนกวาดผ่านครบ

| มัตแตนต์ | backend | e2e | ตรงคำทำนาย |
|---|---|---|---|
| `s292committeerefused` | ล้ม 3 ผ่าน 17 — *reads its own* ที่ `theirs.status` (403) · *the other committee* ที่ `theirs.body.total` (undefined) · *writes into its own* ที่ `added.status` (403) | ล้ม 1 ผ่าน 4 — แถว 20 ที่ `response.status()` (403) | ใช่ |
| `s292departmentonly` | ล้ม 3 ผ่าน 17 — `theirs.body.total` 0 · `theirs.body.total` 0 · `file.status` 400 | ล้ม 1 ผ่าน 4 — แถว 20 ที่ `body.total` 0 | ใช่ |
| `s292wholedepartment` | ล้ม 3 ผ่าน 17 — `theirs.body.total` 184 · `theirs.body.total` 184 · `moved.status` 201 | **ผ่าน 5** — seed ของ e2e ไม่มีนักศึกษาข้างเคียง | ใช่ |
| `s292nodepartmentbehind` | ล้ม 1 ผ่าน 19 — *reads its own* ที่ `deepEqual` ของ `named.body.departments` | ล้ม 1 ผ่าน 4 — แถว 20 ที่ `stated` (ไม่มีคำบอก) | ใช่ |

ทุกการตายอยู่ที่ข้อยืนยันของแถวเอง ไม่ใช่ที่การจัดฉาก (#266) · ข้อ 20 ได้ ⚙ ครึ่ง server และครึ่งที่จอวาดจากคำตอบ
ครึ่งเมนูยังรอคนเดิน จึงเป็น ◐ · ข้อ 27 และ 28 เป็น ☑ ที่ seam HTTP เพราะ `s292wholedepartment` รอดที่ browser seam ตามที่ทำนาย

## ตารางคำทำนายของสามตัวที่รีวิวเพิ่ม (เขียนก่อนกวาดของมัน 20 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s292listsite` | backend *reads its own* · *the other committee* · `17a` 20 | `theirs.body.total` 0 ทั้งสองแถว · `17a` 20 `body.total` 0 | backend *writes into its own*: ไม่อ่านรายการ และการทับยังถูกถามด้วย `IN_REACH` · แถวของผู้ดูแลภาควิชา |
| `s292readsite` | backend *reads its own* · *the other committee* | `read(cookie, SEEDED_CODE)` 404 ไม่ใช่ 200 · `read(cookie, sibling)` 404 ไม่ใช่ 200 | **`17a` ทุกแถว** — จอไม่อ่านทีละคน · backend *writes into its own* |
| `s292ownersite` | backend *writes into its own* | `file.status` 400 (การนำเข้าที่ทับนักศึกษาที่เพิ่งเพิ่ม) | **`17a` ทุกแถว** — ไม่มีการเขียน · backend สองแถวอ่านของกรรมการ · แถวของผู้ดูแลภาควิชา |

## สามตัวที่รีวิวเพิ่ม — กวาด 20 พ.ย. 2569

รีวิวสองแกนพบว่า `s292departmentonly` แก้ `IN_REACH` ตรงค่าคงที่ ซึ่งสามที่ใช้ร่วมกัน และแถวกรรมการทุกแถวตายที่รายการก่อน
การอ่านทีละคนกับ `refuseWrite` จึงไม่มีมัตแตนต์ของตัวเอง — ถ้าเฉพาะ route อ่านทีละคนกลับไปถามภาควิชาอย่างเดียว ชุดเทสต์ยังเขียว
(#104, #125, #88) · สามตัวใหม่แก้ทีละที่ ตารางคำทำนายลงในแฟ้มมัตแตนต์ก่อนกวาด · ต้นไม้ถูกถามด้วย md5 ก่อนทุกตัวและหลังตัวสุดท้าย

| มัตแตนต์ | backend | e2e | ตรงคำทำนาย |
|---|---|---|---|
| `s292listsite` | ล้ม 2 ผ่าน 18 — *reads its own* และ *the other committee* ที่ `theirs.body.total` 0 | ล้ม 1 ผ่าน 4 — แถว 20 ที่ `body.total` 0 | ใช่ |
| `s292readsite` | ล้ม 2 ผ่าน 18 — *reads its own* ที่ `read(cookie, SEEDED_CODE)` 404 · *the other committee* ที่ `read(cookie, sibling)` 404 | ผ่าน 5 — จอไม่อ่านทีละคน | ใช่ |
| `s292ownersite` | ล้ม 1 ผ่าน 19 — *writes into its own* ที่ `file.status` 400 | ผ่าน 5 — ไม่มีการเขียน | ใช่ |

รีวิวเดียวกันเพิ่มข้อยืนยันครึ่งที่ขาดของเกณฑ์ปิด *ภาควิชาอื่นได้หน้าว่าง* (`?department_id=01` ของกรรมการได้ `total` 0)

"""
from harness import main

FILES = {
    'route': 'backend/routes/students.js',
}

MUTANTS = {
    's292committeerefused': ('route',
        "const MAINTAINERS = ['DEPT_ADMIN', 'PROG_MANAGER'];\n",
        "const MAINTAINERS = ['DEPT_ADMIN'];\n"),
    's292departmentonly': ('route',
        "  `($${n}::text[] IS NULL OR department_id = ANY($${n}) OR program_id = ANY($${n}))`;\n",
        "  `($${n}::text[] IS NULL OR department_id = ANY($${n}))`;\n"),
    's292wholedepartment': ('route',
        "  `($${n}::text[] IS NULL OR department_id = ANY($${n}) OR program_id = ANY($${n}))`;\n",
        "  `($${n}::text[] IS NULL OR department_id = ANY($${n})\n"
        "     OR department_id IN (SELECT department_id FROM programs WHERE program_id = ANY($${n})))`;\n"),
    's292nodepartmentbehind': ('route',
        "      const departments = [...covered, ...added].sort((a, b) =>\n",
        "      const departments = [...covered, ...added.filter(() => false)].sort((a, b) =>\n"),
    's292listsite': ('route',
        '      const where = `WHERE ${IN_REACH(1)}\n',
        '      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))\n'),
    's292readsite': ('route',
        '          WHERE student_id = $1\n            AND ${IN_REACH(2)}`,\n',
        '          WHERE student_id = $1\n            AND ($2::text[] IS NULL OR department_id = ANY($2))`,\n'),
    's292ownersite': ('route',
        '      `SELECT ${IN_REACH(2)} AS mine\n',
        '      `SELECT ($2::text[] IS NULL OR department_id = ANY($2)) AS mine\n'),
}


main(FILES, MUTANTS)
