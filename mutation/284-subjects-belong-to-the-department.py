# -*- coding: utf-8 -*-
"""#284 — รายวิชาเป็นของภาควิชาของผู้บันทึก (แบบ #282)

    python mutation/284-subjects-belong-to-the-department.py save
    python mutation/284-subjects-belong-to-the-department.py <mutant>
    python mutation/284-subjects-belong-to-the-department.py restore

แถวที่ถูกฆ่าอยู่ใน `backend/test/subjects.test.js`, `e2e/tests/284a-subjects-belong-to-the-department.spec.js`
และ `e2e/tests/16a-subjects.spec.js` ใบ `docs/acceptance/16-subjects.md` §#284

    cd backend && node --test test/subjects.test.js
    cd e2e && npx playwright test tests/284a-subjects-belong-to-the-department.spec.js tests/16a-subjects.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ชื่อขึ้นต้นด้วย `s284` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185) คำตอบของเจ้าของงาน 19 พ.ย. 2569
มีสองข้อ: ประโยคแบบเดียวกับ #282 และเอาตัวกรองภาควิชาออกด้วย ทางที่ไม่ได้เลือกของแต่ละเกณฑ์ถูกเขียนให้รันได้ (#48)

- `s284bodydepartment` — การสร้างอ่าน `department_id` จาก body ก่อนภาควิชาของสิทธิ์ · backend *a department named
  in the body is not read*
- `s284importcolumn` — การนำเข้าอ่านคอลัมน์ `department_id` ของแถว · backend *an old template's department column
  is not read*
- `s284putmoves` — การแก้ไขเขียน `department_id` จาก body คือการย้ายรายวิชาที่ #284 ปิด · backend *cannot move a
  subject out of their reach* — ข้ออ้างที่ `244a` แถว 1 เคยถือที่หน้าจอ ย้ายมาอยู่ที่ server (`244` `movesanexistingsubject`
  ถอนเป็นบันทึกวันเดียวกัน)
- `s284listfilter` — รายการอ่าน `?department_id=` อีกครั้งและแคบลงภายในขอบเขต คือตัวกรองก่อน #284 ·
  backend *a `?department_id=` on the list is not read*
- `s284oldsentence` — คำปฏิเสธของภาควิชาที่ปิดแล้วกลับเป็นประโยคเดิม *นอกภาควิชาที่รับผิดชอบ* · backend *a retired
  department keeps its subjects* · `284a` แถว 2
- `s284retiredaccepted` — ไม่ถามว่าภาควิชาของสิทธิ์ปิดอยู่หรือไม่ · backend แถวเดียวกัน · `284a` แถว 2
- `s284templatecolumn` — แบบฟอร์มนำเข้ามีคอลัมน์ `department_id` กลับมา (หลัง `credits` ตามที่เคยอยู่) · backend
  *the template downloads* · `284a` แถว 1
- `s284departmentcolumn` — ตารางมีคอลัมน์ *ภาควิชา* กลับมา · `284a` แถว 1
- `s284filterbox` — แถบกรองมี `select` *ภาควิชา* กลับมา (รูปของบัญชีที่ถึงหลายภาควิชา) · `284a` แถว 1
- `s284filterstated` — แถบกรองมีคำบอกภาควิชาเดียวกลับมา (รูปของบัญชีที่ถึงภาควิชาเดียว ที่ `16a` แถว 92 เคยอ่าน)
  · `284a` แถว 1
- `s284departmentfield` — ฟอร์มมีช่อง *ภาควิชา* กลับมา (ช่องเปล่าที่ไม่ส่งอะไร — สิ่งที่แถวอ่านคือการมีอยู่) · `284a` แถว 1

สองตัวของแถบกรองแยกกันเพราะแถว 1 อ่านสองข้ออ้าง คือไม่มีตัวเลือกและไม่มีคำบอก (#66) ตัวละครึ่ง

สองตัวที่รีวิวของวันเดียวกันเพิ่ม หลังการกวาดสิบเอ็ดตัวแรก (ตารางของสองตัวนี้ลงคอมมิตก่อนกวาดของมันเอง #255):

- `s284importnotverified` — การนำเข้าไม่ถามว่าภาควิชาของสิทธิ์ปิดอยู่หรือไม่ (`verify` ตอบ `null`) · ครึ่งนำเข้าของ
  backend *a retired department keeps its subjects* ซึ่ง `s284retiredaccepted` ตายก่อนถึง เพราะการสร้างถูกอ่านก่อน (#88)
- `s284retirededitrefused` — การแก้ไขถามข้อเดียวกับการสร้าง คือทางที่ไม่ได้เลือกของ *ภาควิชาที่ปิดแล้วยังแก้รายวิชาเดิมได้*
  (#48) · backend แถวเดียวกัน ครึ่งการแก้ไข · `16a` แถว 97 ซึ่ง `M7` กับ `M13` ของ `16` เคยค้ำผ่าน picker

## ตารางคำทำนาย (เขียนก่อนกวาด 19 พ.ย. 2569)

แถวของ `284a` อ่านตามลำดับ: หัวตาราง · แถบกรอง (ตัวเลือก แล้วคำบอก) · แบบฟอร์มนำเข้า · ฟอร์ม · การสร้าง
ดังนั้นตัวที่ตายในแถว 1 ตายที่ assertion แรกที่มันแตะ และ assertion ใต้นั้นไม่ถูกอ่าน (#88)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s284bodydepartment` | backend *a department named in the body is not read* | `made.body.subject.department_id` เป็น `05` ไม่ใช่ `01` | `284a` ทุกแถว: หน้าจอไม่ส่ง `department_id` · `16a` ทุกแถว |
| `s284importcolumn` | backend *an old template's department column is not read* | `department_id` ของแถวที่นำเข้า | `284a` ทุกแถว: ไม่มีการนำเข้า · `16a` แถว 89: แบบฟอร์มไม่มีคอลัมน์นั้น ค่าว่างจึงตกไปที่ภาควิชาของสิทธิ์ · backend *a valid spreadsheet imports every row* ด้วยเหตุเดียวกัน |
| `s284putmoves` | backend *a department administrator cannot move a subject out of their reach* | `after.department_id` ไม่อยู่ `01` อีก | `284a` ทุกแถว · `16a` แถว 97: หน้าจอไม่ส่ง `department_id` |
| `s284listfilter` | backend *a `?department_id=` on the list is not read* | `deepEqual` ของรหัสในรายการ (ว่าง ไม่ใช่ `T0100006`) | `284a` · `16a`: หน้าจอไม่ส่ง `?department_id=` |
| `s284oldsentence` | backend *a retired department keeps its subjects* · `284a` 2 | backend `refused.body.message` · `284a` 2 *the screen says why, in the owner’s words* (ถ้อยคำพิมพ์ไว้ในแถว ไม่อ่านจาก `REFUSALS` ตามบทเรียนของ `s282oldsentence`) | `284a` 1 · `16a` ทุกแถว |
| `s284retiredaccepted` | backend แถวเดียวกัน · `284a` 2 | backend `refused.status` 403 · `284a` 2 *the server refuses it* | `284a` 1 · `16a` แถว 97: การแก้ไขไม่ถามข้อนี้อยู่แล้ว |
| `s284templatecolumn` | backend *the template downloads and matches what the importer accepts* · `284a` 1 | backend `deepEqual(header, COLUMNS)` · `284a` 1 *the template carries no department column* | `284a` 2 · `16a` แถว 89: `parseTable` อ่านหัวตามชื่อ แถวที่สั้นกว่าหัวได้ค่าว่าง และแถวที่สามเลื่อนคำอธิบายไปหนึ่งช่องซึ่งเป็นช่องที่ไม่ถูกอ่าน การนำเข้าจึงยังได้สามแถว (คำอธิบายภาษาไทยของแถวนั้นผิด แต่ไม่มีแถวไหนอ่าน) |
| `s284departmentcolumn` | `284a` 1 | *with no department column* | `284a` 2 · `16a` ทุกแถว: เติม `th` ไม่ใช่ `td` เซลล์ `nth(3)` จึงยังเป็นสถานะ · backend ทั้งหมด |
| `s284filterbox` | `284a` 1 | *with no department filter* | `284a` 2 · `16a` ทุกแถว · backend ทั้งหมด |
| `s284filterstated` | `284a` 1 | *and no statement of the one department* | `284a` 2 · `16a` ทุกแถว · backend ทั้งหมด |
| `s284departmentfield` | `284a` 1 | *and has no department field* (สามข้อแรกของแถวผ่าน เพราะฟอร์มยังไม่เปิด) | `284a` 2: กรอกด้วย label ซึ่งไม่ชนกับช่องใหม่ · `16a` ทุกแถว ด้วยเหตุเดียวกัน · backend ทั้งหมด |

### สองตัวที่รีวิวเพิ่ม (เขียนก่อนกวาดของมัน 19 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s284importnotverified` | backend *a retired department keeps its subjects* | `imported.status` 400 (ได้ 201) — การสร้างข้างบนยังถูกปฏิเสธ จึงผ่านสองข้อแรก | `284a` ทุกแถว: ไม่มีการนำเข้าใต้ภาควิชาที่ปิด · `16a` แถว 89: ภาควิชา `05` เปิดอยู่ · backend ที่เหลือ |
| `s284retirededitrefused` | backend แถวเดียวกัน · `16a` แถว 97 | backend `edited.status` 200 (ได้ 403) · `16a` 97 *บันทึกข้อมูลเรียบร้อยแล้ว* ที่ไม่ขึ้น (ข้อแรกของแถวหลังเปิดฟอร์ม) | `284a` ทุกแถว: ไม่มีการแก้ไข · `16a` แถวอื่น: ภาควิชาเปิดอยู่ตอนแก้ · backend ที่เหลือ: แก้ในภาควิชาที่เปิด |
"""
from harness import main

FILES = {
    'route': 'backend/routes/subjects.js',
    'refusals': 'backend/auth/refusals.js',
    'screen': 'frontend/src/pages/Subjects.js',
    'form': 'frontend/src/components/subjects/SubjectForm.js',
}

MUTANTS = {
    's284bodydepartment': ('route',
        '      const subject = await insertSubject(pool, draft.values, req.auth.acting.scope_id);\n',
        '      const subject = await insertSubject(\n'
        '        pool,\n'
        '        draft.values,\n'
        '        req.body?.department_id || req.auth.acting.scope_id,\n'
        '      );\n'),
    's284importcolumn': [
        ('route',
         '          return draft.ok ? { ok: true, draft: draft.values } : draft;\n',
         '          return draft.ok\n'
         '            ? { ok: true, draft: { ...draft.values, department_id: record.department_id } }\n'
         '            : draft;\n'),
        ('route',
         '            const row = await insertSubject(client, values, department);\n',
         '            const row = await insertSubject(client, values, values.department_id || department);\n'),
    ],
    's284putmoves': [
        ('route',
         '                is_active = coalesce($7, is_active),\n',
         '                is_active = coalesce($7, is_active),\n'
         '                department_id = coalesce($8, department_id),\n'),
        ('route',
         "          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,\n",
         "          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,\n"
         '          req.body?.department_id ?? null,\n'),
    ],
    # Narrowed inside the reach, as the filter was before #284 - not widened,
    # which would be a different mutant (#203).
    's284listfilter': ('route',
        '      const reach = await coveredScopes(pool, req.auth.acting.scope_id);\n'
        '      const { page, perPage, offset } = pageOf(req);\n',
        '      const covered = await coveredScopes(pool, req.auth.acting.scope_id);\n'
        '      const asked = req.query.department_id;\n'
        '      const reach = asked\n'
        '        ? (covered ?? [String(asked)]).filter((id) => id === String(asked))\n'
        '        : covered;\n'
        '      const { page, perPage, offset } = pageOf(req);\n'),
    's284oldsentence': ('refusals',
        "  subjectDepartmentRetired: 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มรายวิชาใหม่ไม่ได้',\n",
        "  subjectDepartmentRetired: 'ไม่สามารถจัดการรายวิชานอกภาควิชาที่รับผิดชอบได้',\n"),
    # `open` stays referenced, so nothing is left unread (#101).
    's284retiredaccepted': ('route',
        "    return open ? null : 'subjectDepartmentRetired';\n",
        '    return open ? null : null;\n'),
    # `retiredRefusal` stays referenced by the create, so nothing is unread (#101).
    's284importnotverified': ('route',
        '        verify: () => retiredRefusal(req),\n',
        '        verify: () => null,\n'),
    's284retirededitrefused': ('route',
        '      const draft = readSubject(req.body ?? {}, { editing: true });\n',
        '      const draft = readSubject(req.body ?? {}, { editing: true });\n'
        '      const retired = await retiredRefusal(req);\n'
        '      if (retired) return res.status(403).json({ message: REFUSALS[retired] });\n'),
    's284templatecolumn': ('route',
        "  'credits',\n"
        "  'description_th',\n",
        "  'credits',\n"
        "  'department_id',\n"
        "  'description_th',\n"),
    's284departmentcolumn': ('screen',
        '                  <th className="px-4 py-2">หน่วยกิต</th>\n',
        '                  <th className="px-4 py-2">หน่วยกิต</th>\n'
        '                  <th className="px-4 py-2">ภาควิชา</th>\n'),
    's284filterbox': ('screen',
        '            />\n'
        '          </PageHeader>\n',
        '            />\n'
        '            <label className="flex items-center gap-2 text-sm text-slate-600">\n'
        '              ภาควิชา\n'
        '              <select className="rounded-lg border border-gray-300 p-2 text-sm text-gray-900">\n'
        '                <option value="">ทุกภาควิชา</option>\n'
        '              </select>\n'
        '            </label>\n'
        '          </PageHeader>\n'),
    # The one-department drawing `16a` row 92 read, with the name written in -
    # the read that fed it went with #284 (#115: the drawing as it stood).
    's284filterstated': ('screen',
        '            />\n'
        '          </PageHeader>\n',
        '            />\n'
        '            <span className="flex items-center gap-2 text-sm text-slate-600">\n'
        '              ภาควิชา\n'
        '              <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900">\n'
        '                วิศวกรรมคอมพิวเตอร์\n'
        '              </span>\n'
        '            </span>\n'
        '          </PageHeader>\n'),
    's284departmentfield': ('form',
        '          <Field label="รหัสวิชา">\n',
        '          <Field label="ภาควิชา">\n'
        '            <select className={field} disabled={sending}>\n'
        '              <option value="">—</option>\n'
        '            </select>\n'
        '          </Field>\n'
        '          <Field label="รหัสวิชา">\n'),
}

main(FILES, MUTANTS)
