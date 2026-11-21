# -*- coding: utf-8 -*-
"""#296 — ฟอร์มบัญชีผู้ใช้เลือกภาควิชาและหลักสูตรด้วยชื่อ และ server ถือกฎสองข้อของที่อยู่ของบัญชี

    python mutation/296-the-account-form-picks-units-by-name.py save
    python mutation/296-the-account-form-picks-units-by-name.py <mutant>
    python mutation/296-the-account-form-picks-units-by-name.py restore

คำตอบของเจ้าของงาน (20 และ 21 พ.ย. 2569, #296): สองช่องเป็น dropdown ที่วาดด้วยชื่อ หลักสูตรกรองตามภาควิชา ·
ทุกบัญชีมีภาควิชา เว้นแต่ผู้ดูแลส่วนกลางเว้นไว้ (ถามซ้ำหลังแก้ราคาที่บอกผิด — ผู้ดูแลภาควิชาหรือคณะที่แก้ผู้ประเมิน
ทั้งสามต้องเลือกภาควิชาก่อนบันทึก) · หลักสูตรต้องอยู่ใต้ภาควิชาที่บันทึกคู่กัน · ค่าที่บัญชีถืออยู่แสดงตามจริงและไม่ถูก
เปลี่ยนเงียบ ๆ

ฝั่ง server เป็นเรื่องของ `placeRefusal` (`backend/auth/administration.js`) ซึ่งถูกเรียกเป็นด่านสุดท้ายในสามทาง
(เพิ่ม แก้ นำเข้า) — มัตแตนต์ต่อด่าน (#125) และต่อกฎ · แถวของมันอยู่ใน `backend/test/users.test.js` §#296
(เก้าแถวย่อย เรียกตามลำดับ 1–9 ด้านล่าง) และ `grants.test.js` §#296 · ฝั่งฟอร์มคือ `UserForm.js` และแถวคือ
`e2e/tests/296a-the-account-form-picks-units-by-name.spec.js` (ห้าแถว) · สองคำปฏิเสธใหม่ไปไม่ถึงจากจอนี้
(ตัวกรองไม่เสนอหลักสูตรนอกภาควิชา และภาควิชาเป็น `required` ที่ใดที่เว้นไม่ได้) จึงถูกถือที่ seam HTTP

แถวย่อยของ `users.test.js` §#296: 1 ผู้ดูแลภาควิชาไม่ใส่ภาควิชา · 2 ใส่แล้วผ่าน (ตัวควบคุม) · 3 ผู้ดูแลส่วนกลาง
เว้นได้ · 4 หลักสูตรนอกภาควิชา (ส่วนกลาง) · 5 เดียวกัน (คณะ) · 6 ผู้ดูแลภาควิชาแก้ผู้ประเมิน · 7 ส่วนกลางบันทึก
ผู้ประเมินโดยไม่แตะ · 8 แก้ให้หลักสูตรออกนอกภาควิชา · 9 การนำเข้า (ครึ่งแรกกฎข้อ 1 ครึ่งหลังกฎข้อ 2)

## ตารางคำทำนาย (เขียนก่อนกวาด 21 พ.ย. 2569, #255)

ข้ออ้างอ้างด้วยข้อความของ assertion ไม่ใช่เลขบรรทัด (#173)

| มัตแตนต์ | สิ่งที่มันทำ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|---|
| `anyonemayleaveblank` | กฎข้อ 1 ไม่ทำงาน คือ server ก่อน #296 ในครึ่งนี้ (#115) | users 1, 6, 9 | `assert.equal(response.status, 400` (1) · `untouched.status, 400` (6) · `response.status, 400, response.text` (9) | users 2–5, 7, 8 · `296a` ทุกแถว (ฟอร์มปฏิเสธเองด้วย `required`) |
| `nobodymayleaveblank` | กฎข้อ 1 กับทุกคน คือทางเลือกที่เจ้าของงานไม่เลือก (#48) | users 3, 7 · `296a` 3 | `response.status, 201` (3) · `saved.status, 200` (7) · `answer.status()).toBe(200)` ของแถว 3 | users 1, 2, 4, 5, 6, 8 · `296a` 1, 2, 4, 5 — และ**ผู้อยู่ข้างทาง**: แถวอื่นของ `users.test.js` ที่สร้างบัญชีโดยไม่ใส่ภาควิชา (เช่น *an external assessor with a validity period*) ตายที่ `created.status, 201` ซึ่งเป็นการจัดฉาก ไม่นับ (#266) |
| `programanywhere` | กฎข้อ 2 ไม่ทำงาน (#115) | users 4, 5, 8, 9 | `response.status, 400` (4, 5, 8) · `across.status, 400` (9) | users 1–3, 6, 7 · `296a` ทุกแถว |
| `createunplaced` | ด่านของการเพิ่มหายไป | users 1, 4, 5 | `response.status, 400` | users 6–9 · `296a` ทุกแถว |
| `editunplaced` | ด่านของการแก้หายไป | users 6, 8 | `untouched.status, 400` · `response.status, 400` | users 1–5, 7, 9 · `296a` ทุกแถว |
| `importunplaced` | ด่านของการนำเข้าหายไป | users 9 | `response.status, 400, response.text` | users 1–8 · `296a` ทุกแถว |
| `noparent` | `grantable` ไม่บอกภาควิชาของหลักสูตร | grants §#296 · `296a` 2, 4 | `assert.deepEqual(parents` · แถว 2 ที่ `expect.poll(() => values(programField(page))).toEqual(['', ...UNDER_01])` · แถว 4 ที่ `toHaveValue(PROGRAM.id)` หลังเลือกภาควิชา (หลักสูตรถูกล้างเพราะไม่รู้ว่าอยู่ใต้ 05) | `296a` 1 (ยังไม่เลือกภาควิชา ไม่กรอง), 3 (ภาควิชาว่าง), 5 (หลักสูตรที่ถืออยู่ได้ชื่อจาก `all`) |
| `blankforall` | ทุกคนเห็น *ไม่ระบุ* และไม่ต้องเลือก | `296a` 1, 4 | แถว 1 `not.toHaveText(UNSPECIFIED)` · แถว 4 `validity.valueMissing)).toBe(true)` | `296a` 2, 3, 5 |
| `blankfornone` | ไม่มีใครเห็น *ไม่ระบุ* | `296a` 2, 3 | แถว 2 `option[value=""]')).toHaveText(UNSPECIFIED)` · แถว 3 **ที่การรอ** `saveEdit` — เบราว์เซอร์ไม่ส่งฟอร์มที่ `required` ว่าง จึงหมดเวลา ไม่ใช่ข้ออ้าง (#139) ไม่นับ | `296a` 1, 4, 5 |
| `nofilter` | หลักสูตรไม่กรองตามภาควิชา | `296a` 2 | `expect.poll(() => values(programField(page))).toEqual(['', ...UNDER_01])` | `296a` 1, 3, 4, 5 |
| `keepsprogram` | เปลี่ยนภาควิชาแล้วหลักสูตรเดิมค้าง | `296a` 2 | `programField(page)).toHaveValue('')` | `296a` 1, 3, 4, 5 |
| `clearsalways` | เปลี่ยนภาควิชาแล้วหลักสูตรถูกล้างเสมอ | `296a` 4 | `toHaveValue(PROGRAM.id)` หลังเลือกภาควิชา | `296a` 1, 2, 3, 5 |
| `heldgone` | ค่าที่บัญชีถือแต่ไม่อยู่ในรายการไม่มีตัวเลือก — select แสดงตัวแรกแทน (#128) | `296a` 5 | `departmentField(page)).toHaveValue(DEPARTMENT.id)` | `296a` 1–4 |
| `heldbarecode` | ตัวเลือกของค่าที่ถือเป็นรหัสเปล่า | `296a` 5 | `` toHaveText(`ภาควิชา ${DEPARTMENT.id}`) `` | `296a` 1–4 |
| `codesnotnames` | ตัวเลือกวาดด้วยรหัส คือความผิดของ #294 | `296a` 1, 3 | แถว 1 `toHaveText(DEPARTMENT.th)` · แถว 3 `toHaveText(PROGRAM.th)` | `296a` 2, 4, 5 |

## บันทึกผลกวาด (21 พ.ย. 2569, คอมมิต `b412526`)

ทีละตัว save → apply → ตรวจต้นไม้ → รัน → restore → ตรวจต้นไม้ · มัตแตนต์ server รัน `users.test.js grants.test.js` กับ `296a` ·
มัตแตนต์ฟอร์มรัน `296a` `247b` `272b` (แถวที่ใช้ฟอร์มเป็นเครื่องมือ, #248) · **ทุกตัวตายที่แถวที่ทำนาย และที่บรรทัดที่ทำนาย** ·
ไม่มีแถวที่ทำนายว่ารอดตาย นอกจากผู้อยู่ข้างทางที่ทำนายไว้

| มัตแตนต์ | ผล | ตายที่ |
|---|---|---|
| `anyonemayleaveblank` | users 1, 6, 9 · `296a` 5 ผ่าน | `response.status, 400, response.body.message` (1) · `untouched.status, 400` (6) · `response.status, 400, response.text` (9) |
| `nobodymayleaveblank` | users 3, 7 · `296a` 3 · ผู้อยู่ข้างทางแปดแถวย่อยของ *an external assessor with a validity period* | `response.status, 201, response.body.message` (3) · `saved.status, 200` (7) · `answer.status()).toBe(200)` ของแถว 3 · ผู้อยู่ข้างทางตายที่ `created.status, 201` หรือที่การเข้าระบบของบัญชีที่ไม่ได้ถูกสร้าง — การจัดฉาก ไม่นับ (#266) |
| `programanywhere` | users 4, 5, 8, 9 · `296a` 5 ผ่าน | `response.status, 400` (4, 5, 8) · `across.status, 400` (9 — ครึ่งแรกยังผ่าน) |
| `createunplaced` | users 1, 4, 5 | `response.status, 400` |
| `editunplaced` | users 6, 8 | `untouched.status, 400` · `response.status, 400` |
| `importunplaced` | users 9 | `response.status, 400, response.text` |
| `noparent` | grants §#296 · `296a` 2, 4 | `assert.deepEqual(parents` · แถว 2 `toEqual(['', ...UNDER_01])` · แถว 4 `toHaveValue(PROGRAM.id)` |
| `blankforall` | `296a` 1, 4 | `not.toHaveText(UNSPECIFIED)` · `validity.valueMissing)).toBe(true)` |
| `blankfornone` | `296a` 2 (และ 3 ที่การรอ ไม่นับ #139) | `option[value=""]')).toHaveText(UNSPECIFIED)` · แถว 3 หมดเวลาใน `saveEdit` |
| `nofilter` | `296a` 2 | `toEqual(['', ...UNDER_01])` |
| `keepsprogram` | `296a` 2 | `programField(page)).toHaveValue('')` |
| `clearsalways` | `296a` 4 | `toHaveValue(PROGRAM.id)` |
| `heldgone` | `296a` 5 | `departmentField(page)).toHaveValue(DEPARTMENT.id)` |
| `heldbarecode` | `296a` 5 | `` toHaveText(`ภาควิชา ${DEPARTMENT.id}`) `` |
| `codesnotnames` | `296a` 1, 3 | `toHaveText(DEPARTMENT.th)` · `toHaveText(PROGRAM.th)` |

`247b` และ `272b` ผ่านภายใต้มัตแตนต์ฟอร์มทั้งแปด — การเล็งใหม่ของมันไม่พึ่งสิ่งที่มัตแตนต์เหล่านี้หักใด

## จากการทบทวน: แถว 6 และ 7 กับมัตแตนต์สามตัว (คำทำนายเขียนก่อนกวาดซ้ำ 21 พ.ย. 2569, #255)

การทบทวนหลังกวาดพบว่ามีสองทางของ `withHeld` ที่ไม่มีมัตแตนต์ใดหัก (#111) ทางแรกคือการหาชื่อจาก `all` ให้หลักสูตรที่บัญชีถืออยู่แต่ตัวกรองตัดออก
ทางที่สองคือทางตกกลับของหน่วยที่ไม่มีชื่อ และพบว่า `toHaveJSProperty('required', true)` ของแถว 1 อยู่ใต้ `not.toHaveText(UNSPECIFIED)`
ซึ่ง `blankforall` ฆ่าก่อน จึงไม่มีอะไรอ่านมัน (#88) · ข้ออ้างของแถว 1 ว่า*ไม่มีช่องข้อความชื่อรหัสภาควิชา*ไม่มีมัตแตนต์ที่หักมันได้
เพราะโค้ดก่อนใบนี้ (#115) จะลบช่องเลือกทั้งสองช่องและทำให้ทุกแถวตายที่ข้อตั้ง ข้ออ้างนี้จึงเป็น net ไม่ใช่ข้ออ้างที่พิสูจน์แล้ว

แถว 6 สร้างคู่ที่ไม่เข้ากันใต้ seam (`ext01` ภาควิชา `01` ถือหลักสูตร `0501`) · แถว 7 ลบชื่อของภาควิชา `05` ใต้ seam

| มัตแตนต์ | สิ่งที่มันทำ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|---|
| `heldprogramcode` | หลักสูตรที่บัญชีถืออยู่และตัวกรองตัดออก อ่านเป็นคำบอกชนิดกับรหัส ทั้งที่มันมีชื่อ | `296a` 6 | `toHaveText(PROGRAM.th)` | `296a` 1–5, 7 |
| `nolabelfallback` | หน่วยที่ไม่มีชื่อได้ตัวเลือกที่ว่าง | `296a` 7 | `` toHaveText(`ภาควิชา ${DEPARTMENT.id}`) `` | `296a` 1–6 (แถว 5 ใช้ทางตกกลับอีกทาง) |
| `notrequired` | ช่องภาควิชาไม่ `required` สำหรับทุกคน | `296a` 1, 4 | `toHaveJSProperty('required', true)` · `validity.valueMissing)).toBe(true)` | `296a` 2, 3, 5–7 |

มัตแตนต์ฟอร์มเดิมกับสองแถวใหม่ (#248): `noparent` และ `nofilter` ฆ่าแถว 6 ที่ `toEqual(['', ...UNDER_01, PROGRAM.id])`
· `heldgone` ฆ่าแถว 6 ที่ `programField(page)).toHaveValue(PROGRAM.id)` · `codesnotnames` ฆ่าแถว 6 ที่ `toHaveText(PROGRAM.th)`
และฆ่าแถว 7 ที่ `` toHaveText(`ภาควิชา ${DEPARTMENT.id}`) `` · `blankforall` `blankfornone` `keepsprogram` `clearsalways`
`heldbarecode` ไม่ถึงแถว 6 หรือ 7 · ส่วนมัตแตนต์ฝั่ง server ไม่กวาดซ้ำ เพราะแถว 6 และ 7 ไม่ได้บันทึกอะไร
"""
from harness import main

FILES = {
    'rules': 'backend/auth/administration.js',
    'users': 'backend/routes/users.js',
    'grantable': 'backend/routes/grants.js',
    'form': 'frontend/src/components/users/UserForm.js',
}

BLANK = "    if (scopes !== null && !departmentId) return 'departmentRequired';\n"
PAIR = '    if (departmentId && programId) {\n'
MAY = "  const mayLeaveBlank = grantable.scopes.some(scope => scope.kind === 'global')\n"
KEEPS = '      const keeps = !department || program?.department_id === department\n'

MUTANTS = {
    # The server before #296, in each rule's half (#115).
    'anyonemayleaveblank': ('rules', BLANK,
        "    if (false && scopes !== null && !departmentId) return 'departmentRequired';\n"),
    # The option the owner did not take, made to run (#48).
    'nobodymayleaveblank': ('rules', BLANK,
        "    if (scopes === scopes && !departmentId) return 'departmentRequired';\n"),
    'programanywhere': ('rules', PAIR, '    if (false && departmentId && programId) {\n'),
    # One per site (#125). The refusal is still computed, so nothing is left
    # unreferenced; it is only not acted on.
    'createunplaced': ('users',
        '      if (misplaced) return res.status(400).json({ message: REFUSALS[misplaced] });\n'
        '\n'
        "      await client.query('BEGIN');\n",
        '      if (false && misplaced) return res.status(400).json({ message: REFUSALS[misplaced] });\n'
        '\n'
        "      await client.query('BEGIN');\n"),
    'editunplaced': ('users',
        '      if (misplaced) return res.status(400).json({ message: REFUSALS[misplaced] });\n'
        '\n'
        '      const { rows } = await pool.query(\n',
        '      if (false && misplaced) return res.status(400).json({ message: REFUSALS[misplaced] });\n'
        '\n'
        '      const { rows } = await pool.query(\n'),
    'importunplaced': ('users',
        '            placeRefusal(req, values.department_id, values.program_id)\n',
        '            (placeRefusal(req, values.department_id, values.program_id) && null)\n'),
    'noparent': ('grantable',
        '          ? { scope_id, label, kind, department_id: parent }\n',
        '          ? { scope_id, label, kind, department_id: parent && null }\n'),
    'blankforall': ('form', MAY,
        "  const mayLeaveBlank = true || grantable.scopes.some(scope => scope.kind === 'global')\n"),
    'blankfornone': ('form', MAY,
        "  const mayLeaveBlank = false && grantable.scopes.some(scope => scope.kind === 'global')\n"),
    'nofilter': ('form',
        '    ? programs.filter(program => program.department_id === draft.department_id)\n',
        '    ? programs\n'),
    'keepsprogram': ('form', KEEPS,
        '      const keeps = true || !department || program?.department_id === department\n'),
    'clearsalways': ('form', KEEPS,
        '      const keeps = false && (!department || program?.department_id === department)\n'),
    'heldgone': ('form',
        '  if (!held || units.some(unit => unit.scope_id === held)) return units.map(named)\n',
        '  if (true || !held || units.some(unit => unit.scope_id === held)) return units.map(named)\n'),
    'heldbarecode': ('form',
        '    known ? named(known) : { scope_id: held, label: `${kind} ${held}` },\n',
        '    known ? named(known) : { scope_id: held, label: held },\n'),
    'codesnotnames': ('form',
        '    label: unit.label || `${kind} ${unit.scope_id}`,\n',
        '    label: unit.scope_id,\n'),
    # From the review (#111): the two branches of withHeld nothing broke, and
    # the `required` row 1 never reached (#88).
    'heldprogramcode': ('form',
        '    known ? named(known) : { scope_id: held, label: `${kind} ${held}` },\n',
        '    false && known ? named(known) : { scope_id: held, label: `${kind} ${held}` },\n'),
    'nolabelfallback': ('form',
        '    label: unit.label || `${kind} ${unit.scope_id}`,\n',
        '    label: unit.label,\n'),
    'notrequired': ('form',
        '              required={!mayLeaveBlank}\n',
        '              required={false && !mayLeaveBlank}\n'),
}

main(FILES, MUTANTS)
