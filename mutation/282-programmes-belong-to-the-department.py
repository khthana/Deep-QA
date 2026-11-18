# -*- coding: utf-8 -*-
"""#282 — หลักสูตรเป็นของภาควิชาของผู้ดูแลระดับภาควิชา

    python mutation/282-programmes-belong-to-the-department.py save
    python mutation/282-programmes-belong-to-the-department.py <mutant>
    python mutation/282-programmes-belong-to-the-department.py restore

แถวที่ถูกฆ่าอยู่ใน `backend/test/programs.test.js` และ `e2e/tests/282a-programmes-belong-to-the-department.spec.js`
ใบ `docs/acceptance/15-programs.md` §#282

    cd backend && node --test test/programs.test.js
    cd e2e && npx playwright test tests/282a-programmes-belong-to-the-department.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ชื่อขึ้นต้นด้วย `s282` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185) คำตอบของเจ้าของงาน 18 พ.ย. 2569
มีสามข้อ และทางที่ไม่ได้เลือกของแต่ละข้อถูกเขียนให้รันได้ (#48): ผู้ดูแลระดับคณะยังจัดการหลักสูตร ·
ภาควิชายังถูกอ่านจาก body จากไฟล์ หรือถูกวาดบนจอ · ประโยคเดิมของคำปฏิเสธ

- `s282facultymaintains` — `MAINTAINERS` รับ `FACULTY_ADMIN` กลับ คือ route ก่อน #282 · backend *the Faculty Admin
  is refused* · `282a` แถว 1
- `s282facultymenu` — เมนูของผู้ดูแลระดับคณะมี *ข้อมูลหลักสูตร* กลับมา พร้อมไอคอนเดิม คือเมนูก่อน #282 · `282a` แถว 1
- `s282bodydepartment` — การสร้างอ่าน `department_id` จาก body ก่อนภาควิชาของสิทธิ์ · backend *a department named
  in the body is not read*
- `s282importcolumn` — การนำเข้าอ่านคอลัมน์ `department_id` ของแถว · backend *an old template's department column
  is not read*
- `s282putmoves` — การแก้ไขเขียน `department_id` จาก body คือการย้ายหลักสูตรที่ #282 ปิด · backend *cannot move a
  programme out of their reach* — ข้ออ้างที่ `233a` แถว 2 เคยถือที่หน้าจอ ย้ายมาอยู่ที่ server (#282)
- `s282oldsentence` — คำปฏิเสธของภาควิชาที่ปิดแล้วกลับเป็นประโยคเดิม *นอกภาควิชาที่รับผิดชอบ* · backend *nothing
  new may be filed under a retired department* · `282a` แถว 3
- `s282retiredaccepted` — ไม่ถามว่าภาควิชาของสิทธิ์ปิดอยู่หรือไม่ · backend แถวเดียวกัน · `282a` แถว 3
- `s282departmentcolumn` — ตารางมีคอลัมน์ *ภาควิชา* กลับมา · `282a` แถว 2
- `s282departmentfield` — ฟอร์มมีช่อง *ภาควิชา* กลับมา (ช่องเปล่าที่ไม่ส่งอะไร — สิ่งที่แถวอ่านคือการมีอยู่) · `282a` แถว 2

## ตารางคำทำนาย (เขียนก่อนกวาด 18 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s282facultymaintains` | backend *the Faculty Admin is refused by the server on every endpoint* · `282a` 1 | backend `refused.status` 403 ที่ endpoint แรก · `282a` 1 *the server refuses the list* (เมนูไม่ถูกแก้ สอง assertion แรกจึงผ่าน) | `282a` 2 3 · backend ที่เหลือ |
| `s282facultymenu` | `282a` 1 | *and the programmes entry is not in it* | `282a` 2 3 · backend ทั้งหมด |
| `s282bodydepartment` | backend *a department named in the body is not read* | `department_id` ของหลักสูตรที่สร้าง เป็น `05` ไม่ใช่ `01` | `282a` ทุกแถว: หน้าจอไม่ส่ง `department_id` |
| `s282importcolumn` | backend *an old template's department column is not read* | `department_id` ของแถวที่นำเข้า | `282a` ทุกแถว: ไม่มีการนำเข้า · backend *a valid spreadsheet imports every row*: แบบฟอร์มไม่มีคอลัมน์นั้น |
| `s282putmoves` | backend *a department administrator cannot move a programme out of their reach* | `department_id` ของหลักสูตรหลังแก้ ไม่อยู่ `01` อีก | `282a` ทุกแถว: หน้าจอไม่ส่ง `department_id` |
| `s282oldsentence` | backend *nothing new may be filed under a retired department* · `282a` 3 | backend `body.message` ของการสร้าง · `282a` 3 *the screen says why, in the owner's words* | `282a` 1 2 |
| `s282retiredaccepted` | backend แถวเดียวกัน · `282a` 3 | backend `status` 403 ของการสร้าง · `282a` 3 *the server refuses it* | `282a` 1 2 |
| `s282departmentcolumn` | `282a` 2 | *with no department column* | `282a` 1 3 · backend ทั้งหมด |
| `s282departmentfield` | `282a` 2 | *and has no department field* | `282a` 1 3: แถว 3 กรอกด้วย label ซึ่งไม่ชนกับช่องใหม่ |

## บันทึกการกวาด 18 พ.ย. 2569

ต้นไม้ถูกถามด้วย md5 ของ `git diff` ก่อนรันทุกตัว (#268) — ครั้งแรกของการกวาด backend รอบที่สองเรียก
`apply <mutant>` ซึ่ง harness ไม่มี มันพิมพ์ usage แล้วจบด้วย 0 และทุกแถวเขียว ด่าน md5 คือสิ่งที่บอก

| มัตแตนต์ | backend | `282a` | ตรงคำทำนาย |
|---|---|---|---|
| `s282facultymaintains` | ตาย *the Faculty Admin is refused* เท่านั้น | ตาย แถว 1 *the server refuses the list* | ใช่ |
| `s282facultymenu` | — | ตาย แถว 1 *and the programmes entry is not in it* | ใช่ |
| `s282bodydepartment` | ตาย *a department named in the body is not read* เท่านั้น | รอด | ใช่ |
| `s282importcolumn` | ตาย *an old template's department column is not read* เท่านั้น | รอด | ใช่ |
| `s282putmoves` | ตาย *cannot move a programme out of their reach* เท่านั้น | รอด | ใช่ |
| `s282oldsentence` | ตาย *nothing new may be filed under a retired department* | ตาย แถว 3 *the screen says why, in the owner’s words* — หลังแก้ (ดูข้างล่าง) | ใช่ หลังแก้ |
| `s282retiredaccepted` | ตายแถวเดียวกัน | ตาย แถว 3 *the server refuses it* | ใช่ |
| `s282departmentcolumn` | — | ตาย แถว 2 *with no department column* | ใช่ |
| `s282departmentfield` | — | ตาย แถว 2 *and has no department field* | ใช่ |

สองอย่างที่การกวาดพบ:

- **`s282oldsentence` รอด `282a` ในรอบแรก** ทั้งที่ทำนายว่าตาย — แถว 3 อ่านประโยคที่คาดหวังจาก `REFUSALS`
  ซึ่งคือแฟ้มที่มัตแตนต์แก้ ค่าที่คาดหวังจึงย้ายตามมัตแตนต์ไปด้วย (ค่าคงที่ที่ใช้ร่วมเป็นสมมติฐาน #104)
  แก้ด้วยการพิมพ์ถ้อยคำของเจ้าของงานลงในแถวตรง ๆ แล้วกวาดซ้ำ ตายที่ assertion ของแถวเอง
  backend ไม่โดนเพราะแถว *nothing new may be filed* พิมพ์ประโยคไว้เองอยู่แล้ว
- **การกวาด backend รอบแรกฆ่าเกินแถวของตัวเอง** — `s282facultymaintains` ตาย 2 3 6 8 17 (ลำดับ `ok N` ของการรันวันนั้น ไม่ใช่การอ้างถึงแถว #173),
  `s282bodydepartment` 7 10 และ `s282putmoves` 5 10 สาเหตุคือแถวที่ตายทิ้งสิ่งที่มัตแตนต์ปล่อยผ่านไว้
  (ชื่อ `0501` ที่ถูกเปลี่ยน · `T0103`/`T0104` ที่ไปอยู่ `05` ซึ่งผู้สร้างลบผ่าน HTTP ไม่ได้)
  แก้ด้วยการคืนสภาพใต้ seam ใน `finally` ของสามแถวที่ชื่ออยู่ในตารางข้างบน (#89, #181) กวาดซ้ำแล้วแต่ละตัวตายที่แถวของตัวเองเท่านั้น
"""
from harness import main

FILES = {
    'route': 'backend/routes/programs.js',
    'refusals': 'backend/auth/refusals.js',
    'menu': 'frontend/src/components/SidebarItem/FacultyAdmin.js',
    'screen': 'frontend/src/pages/Programs.js',
    'form': 'frontend/src/components/programs/ProgramForm.js',
}

MUTANTS = {
    's282facultymaintains': ('route',
        "const MAINTAINERS = ['DEPT_ADMIN'];\n",
        "const MAINTAINERS = ['FACULTY_ADMIN', 'DEPT_ADMIN'];\n"),
    # The entry as it stood before #282, icon and import included, so the
    # sidebar's own rows (`105a`) see the drawing they saw then (#115).
    's282facultymenu': [
        ('menu',
         '  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา\n',
         '  HiOutlineBuildingOffice2, // ข้อมูลภาควิชา\n'
         '  HiOutlineAcademicCap, // ข้อมูลหลักสูตร\n'),
        ('menu',
         "        path: '/main/departments',\n"
         '        icon: <HiOutlineBuildingOffice2 />,\n'
         '      },\n',
         "        path: '/main/departments',\n"
         '        icon: <HiOutlineBuildingOffice2 />,\n'
         '      },\n'
         '      {\n'
         "        key: 'ข้อมูลหลักสูตร',\n"
         "        label: 'ข้อมูลหลักสูตร',\n"
         "        path: '/main/programs',\n"
         '        icon: <HiOutlineAcademicCap />,\n'
         '      },\n'),
    ],
    's282bodydepartment': ('route',
        '          req.auth.acting.scope_id,\n'
        '          draft.values.revision_year,\n',
        '          req.body?.department_id || req.auth.acting.scope_id,\n'
        '          draft.values.revision_year,\n'),
    's282importcolumn': [
        ('route',
         '          return draft.ok ? { ok: true, draft: draft.values } : draft;\n',
         '          return draft.ok\n'
         '            ? { ok: true, draft: { ...draft.values, department_id: record.department_id } }\n'
         '            : draft;\n'),
        ('route',
         '                values.program_name_en,\n'
         '                department,\n',
         '                values.program_name_en,\n'
         '                values.department_id || department,\n'),
    ],
    's282putmoves': [
        ('route',
         '                is_active = coalesce($5, is_active),\n',
         '                is_active = coalesce($5, is_active),\n'
         '                department_id = coalesce($6, department_id),\n'),
        ('route',
         "          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,\n",
         "          typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,\n"
         '          req.body?.department_id ?? null,\n'),
    ],
    's282oldsentence': ('refusals',
        "  departmentRetired: 'ภาควิชาของคุณถูกปิดใช้งาน จึงเพิ่มหลักสูตรใหม่ไม่ได้',\n",
        "  departmentRetired: 'ไม่สามารถจัดการหลักสูตรนอกภาควิชาที่รับผิดชอบได้',\n"),
    # `open` stays referenced, so nothing is left unread (#101).
    's282retiredaccepted': ('route',
        "    return open ? null : 'departmentRetired';\n",
        '    return open ? null : null;\n'),
    's282departmentcolumn': ('screen',
        '                  <th className="px-4 py-2">ชื่อหลักสูตร</th>\n',
        '                  <th className="px-4 py-2">ชื่อหลักสูตร</th>\n'
        '                  <th className="px-4 py-2">ภาควิชา</th>\n'),
    's282departmentfield': ('form',
        '          <Field label="ชื่อหลักสูตร (ไทย)">\n',
        '          <Field label="ภาควิชา">\n'
        '            <select className={field} disabled={sending}>\n'
        '              <option value="">—</option>\n'
        '            </select>\n'
        '          </Field>\n'
        '          <Field label="ชื่อหลักสูตร (ไทย)">\n'),
}

main(FILES, MUTANTS)
