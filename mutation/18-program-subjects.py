# -*- coding: utf-8 -*-
"""
#18 รายวิชาในหลักสูตร - the pairing, its catalogue, its import and its reach.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/18-program-subjects.md
for which assertion, and for what each mutant is about.

    python mutation/18-program-subjects.py save
    python mutation/18-program-subjects.py <mutant>
    python mutation/18-program-subjects.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `noautoprogram` | 18a row 1: the one programme in reach is chosen for the person. · `const onlyOne = usable.length === 1 ? usable[0] : null + const starting = (filtered ? defa…` → `+ const starting = filtered ? defaultProgram : ''` | **แถวที่สเปคของมันบอก** `18a` แถว 1 · **ผลหลังเล็งใหม่** 1 ตก 10 ไม่ได้รัน (แฟ้ม `serial`) คือแถว 1 · ที่มา `docs/acceptance/10-application-shell.md:1263` `docs/acceptance/18-program-subjects.md:120` |
| `alwaysfilter` | **แก้อะไร** หน้ารายการวาด dropdown เสมอ แม้มีหลักสูตรเดียว | **ฆ่าข้ออ้างไหน** 18a ข้อ 1 บรรทัด 113 · ที่มา `docs/acceptance/18-program-subjects.md:121` |
| `labelwithcode` | **แก้อะไร** ป้ายหลักสูตรขึ้นรหัสก่อนชื่ออีกครั้ง | **ฆ่าข้ออ้างไหน** 18a ข้อ 1 บรรทัด 129 และ 18c ข้อ 8 บรรทัด 96 · ที่มา `docs/acceptance/18-program-subjects.md:122` |
| `keepgood` | **แก้อะไร** `lib/importer` COMMIT แทน ROLLBACK เมื่อมีแถวผิด | **ฆ่าข้ออ้างไหน** 18b ข้อ 7 บรรทัด 158 · ที่มา `docs/acceptance/18-program-subjects.md:138` |
| `alwayselective` | **แก้อะไร** insert เขียนประเภทเป็น `elective` เสมอ | **ฆ่าข้ออ้างไหน** 18a ข้อ 1 บรรทัด 146 · ที่มา `docs/acceptance/18-program-subjects.md:123` |
| `typeignored` | **แก้อะไร** PUT เขียนประเภทเดิมกลับไป | **ฆ่าข้ออ้างไหน** 18a ข้อ 2 บรรทัด 161 · ที่มา `docs/acceptance/18-program-subjects.md:124` |
| `nofreeze` | **แก้อะไร** ช่องหลักสูตรไม่ถูก disable ตอนแก้ไข | **ฆ่าข้ออ้างไหน** 18a ข้อ 2 บรรทัด 172 · ที่มา `docs/acceptance/18-program-subjects.md:125` |
| `nohint` | **แก้อะไร** ตัดข้อความว่าย้ายข้ามหลักสูตรไม่ได้ออก | **ฆ่าข้ออ้างไหน** 18a ข้อ 2 บรรทัด 180 · ที่มา `docs/acceptance/18-program-subjects.md:126` |
| `ignorequery` | **แก้อะไร** catalogue ไม่สนใจคำค้น คืนทุกแถว | **ฆ่าข้ออ้างไหน** 18a ข้อ 3 บรรทัด 197 · ที่มา `docs/acceptance/18-program-subjects.md:127` |
| `duplicatesilent` | **แก้อะไร** POST ไม่แปลง unique violation เป็นข้อความ | **ฆ่าข้ออ้างไหน** 18a ข้อ 4 บรรทัด 217 · ที่มา `docs/acceptance/18-program-subjects.md:128` |
| `terseconfirm` | **แก้อะไร** กล่องยืนยันไม่บอกรหัสวิชาและชื่อวิชา | **ฆ่าข้ออ้างไหน** 18a ข้อ 6 บรรทัด 237 · ที่มา `docs/acceptance/18-program-subjects.md:129` |
| `nodelete` | **แก้อะไร** `deleteOrDeactivate` ไม่ลบจริง แต่ตอบว่าลบแล้ว | **ฆ่าข้ออ้างไหน** 18a ข้อ 5 บรรทัด 256 · ที่มา `docs/acceptance/18-program-subjects.md:130` |
| `nodeactivate` | **แก้อะไร** ไม่ปิดการใช้งาน แต่ตอบว่าปิดแล้ว | **ฆ่าข้ออ้างไหน** 18a ข้อ 5 บรรทัด 280 · ที่มา `docs/acceptance/18-program-subjects.md:131` |
| `noreopen` | **แก้อะไร** PUT ไม่รับ `is_active` กลับมา | **ฆ่าข้ออ้างไหน** 18a ข้อ 5 บรรทัด 287 · ที่มา `docs/acceptance/18-program-subjects.md:132` |
| `catalogueowndept` | **แก้อะไร** จำกัด catalogue ไว้ที่ภาควิชา `05` | **ฆ่าข้ออ้างไหน** 18a ข้อ 10 บรรทัด 303 · ที่มา `docs/acceptance/18-program-subjects.md:133` |
| `catalogueretired` | **แก้อะไร** catalogue คืนวิชาที่ปิดการใช้งานแล้วด้วย | **ฆ่าข้ออ้างไหน** 18a ข้อ 10 บรรทัด 341 · ที่มา `docs/acceptance/18-program-subjects.md:134` |
| `nobom` | **แก้อะไร** `saveAsFile` ไม่เติม BOM กลับ | **ฆ่าข้ออ้างไหน** 18b ข้อ 7 บรรทัด 95 · มันอยู่ในโค้ดที่ทุกหน้าจอใช้ร่วมกัน จึงฆ่าอีกสองแถวนอกใบนี้ด้วย — `17b` แถว 12 (มีมาก่อนแล้ว) กับ `11b` แถว 5 (เพิ่งมี assertion ตอน #124) รวมสามแถว อีกสิบห้าแถวในสามสเปคนั้นเขียวหมด วัดเมื่อ 9 ก.ย. 2569 · ที่มา `docs/acceptance/18-program-subjects.md:135` `docs/acceptance/11-user-accounts.md:350` |
| `importdrops` | **แก้อะไร** import รายงานสำเร็จโดยไม่เขียนแถว | **ฆ่าข้ออ้างไหน** 18b ข้อ 7 บรรทัด 120 · ที่มา `docs/acceptance/18-program-subjects.md:136` |
| `wrongcataloguereason` | **แก้อะไร** เหตุผลของแถวผิดเปลี่ยนเป็นข้อความกลาง ๆ | **ฆ่าข้ออ้างไหน** 18b ข้อ 7 บรรทัด 149 · ที่มา `docs/acceptance/18-program-subjects.md:137` |
| `nolimit` | **แก้อะไร** รายการไม่จำกัดสิบแถวต่อหน้า | **ฆ่าข้ออ้างไหน** 18b ข้อ 9 บรรทัด 190 · ที่มา `docs/acceptance/18-program-subjects.md:139` |
| `unordered` | **แก้อะไร** เรียงตามประเภทแทนรหัสวิชา | **ฆ่าข้ออ้างไหน** 18b ข้อ 9 บรรทัด 202 · ที่มา `docs/acceptance/18-program-subjects.md:140` |
| `listeveryone` | **แก้อะไร** รายการไม่ถูกจำกัดด้วย reach | **ฆ่าข้ออ้างไหน** 18c ข้อ 8 บรรทัด 90 · ที่มา `docs/acceptance/18-program-subjects.md:141` |
| `maintainerall` | **แก้อะไร** `MAINTAINERS` รวม `FULL_ADMIN`, `TEACHER` กับ `FACULTY_ADMIN` | **ฆ่าข้ออ้างไหน** 18c ข้อ 8 บรรทัด 152 — เขียนใหม่ที่ #79 รันซ้ำแล้ว · ที่มา `docs/acceptance/18-program-subjects.md:142` |
"""

from harness import main

FILES = {
    "route": "backend/routes/programSubjects.js",
    "removal": "backend/lib/removal.js",
    "page": "frontend/src/pages/ProgramSubjects.js",
    "form": "frontend/src/components/programSubjects/ProgramSubjectForm.js",
    "importer": "backend/lib/importer.js",
    "client": "frontend/src/api/client.js",
}

MUTANTS = {
    # 18a row 1: the one programme in reach is chosen for the person.
    #
    # Re-aimed by #233 on 26 ตุลาคม 2569, and it is the *mistake* that is
    # preserved rather than the line (#203): the value this mutant was written
    # against moved out of the effect and into `starting`, so the auto-pick is
    # taken away where the pick is now written. `onlyOne` goes with it, because
    # nothing else in the form reads it and `CI=true` turns an unused binding
    # into a compile failure - which would be a mutant that stops the
    # application rather than one that fails a row (#101).
    #
    # Re-aimed again by #234 on 27 ตุลาคม 2569, which rewrote the same line a
    # second time: the pick now reads `filtered` rather than `defaultProgram`.
    # That clause is left standing in both edits, so this mutant goes on
    # reproducing #18's mistake alone and not #234's (#203). Re-swept the same
    # day: `18a` 1 failed, 10 did not run - row 1, which is the row it is for.
    "noautoprogram": [
        ("form", "  const onlyOne = usable.length === 1 ? usable[0] : null\n", ""),
        ("form",
         "  const starting = (filtered ? defaultProgram : onlyOne?.program_id) || ''\n",
         "  const starting = filtered ? defaultProgram : ''\n"),
    ],
    # 18a row 1: one programme is stated, not offered as a choice of one
    "alwaysfilter": ("page", "{programs.length > 1 ? (", "{programs.length > 0 ? ("),
    # 18a row 1 / 18c row 8: the label names the curriculum, and the mutant
    # puts its code back in front of the name - #93 took it out
    "labelwithcode": ("page",
                    "{programs[0].program_name_th}",
                    "{programs[0].program_id} {programs[0].program_name_th}"),
    # 18b row 7: a refused file is rolled back whole
    "keepgood": ("importer",
                 "      await client.query('ROLLBACK');\n      return { ok: false,",
                 "      await client.query('COMMIT');\n      return { ok: false,"),
    # 18a row 1: the type that was chosen is the type that is written
    "alwayselective": ("route",
                       "[values.program_id, values.subject_id, values.subject_type],",
                       "[values.program_id, values.subject_id, 'elective'],"),
    # 18a row 2: the edit changes the type
    "typeignored": ("route", "draft.values.subject_type,", "existing.subject_type,"),
    # 18a row 2: the programme half of the key is frozen on an edit
    # #242 moved this form's flag from the page's to its own on 28 October
    # 2569; the claim is the `|| editing` beside it, which is unchanged.
    "nofreeze": ("form", "disabled={sending || editing}", "disabled={sending}"),
    # 18a row 2: and the form says why
    "nohint": ("form",
               "hint={editing ? '\u0e22\u0e49\u0e32\u0e22\u0e23\u0e32\u0e22\u0e27\u0e34\u0e0a\u0e32\u0e02\u0e49\u0e32\u0e21\u0e2b\u0e25\u0e31\u0e01\u0e2a\u0e39\u0e15\u0e23\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e43\u0e2b\u0e49\u0e25\u0e1a\u0e2d\u0e2d\u0e01\u0e41\u0e25\u0e49\u0e27\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e43\u0e19\u0e2b\u0e25\u0e31\u0e01\u0e2a\u0e39\u0e15\u0e23\u0e43\u0e2b\u0e21\u0e48' : null}",
               "hint={null}"),
    # 18a row 3: the catalogue answers the term that was typed
    "ignorequery": ("route",
                    "AND ($1::text IS NULL\n                 OR subject_id ILIKE",
                    "AND ($1::text IS NOT NULL OR $1::text IS NULL\n                 OR subject_id ILIKE"),
    # 18a row 4: the same pair twice is refused, in words
    "duplicatesilent": ("route", "if (isDuplicate(error)) {", "if (false) {"),
    # 18a row 6: the question names the record it is about
    "terseconfirm": ("page",
                     "${removing.subject_id} ${removing.subject_name_th} ",
                     ""),
    # 18a row 5: a pairing nothing points at is really gone
    "nodelete": ("removal", "      await remove(client);", "      if (false) await remove(client);"),
    # 18a row 5: a referenced pairing is switched off rather than deleted
    "nodeactivate": ("removal", "    await deactivate(client);", "    if (false) await deactivate(client);"),
    # 18a row 5: and can be switched back on
    "noreopen": ("route",
                 "typeof req.body?.is_active === 'boolean' ? req.body.is_active : null,",
                 "null,"),
    # 18a row 10: the catalogue is not confined to the programme's department
    "catalogueowndept": ("route",
                         "WHERE is_active\n            AND (",
                         "WHERE is_active AND department_id = '05'\n            AND ("),
    # 18a row 10: a retired subject is not offered
    "catalogueretired": ("route",
                         "WHERE is_active\n            AND (",
                         "WHERE (is_active OR TRUE)\n            AND ("),
    # 18b row 7: the saved template carries the mark Excel needs
    "nobom": ("client", "text.startsWith(BOM) ? text : BOM + text", "text"),
    # 18b row 7: an imported pairing is actually written
    "importdrops": ("route",
                    "return { ok: true, row: await insertPairing(client, values) };",
                    "return { ok: true, row: null };"),
    # 18b row 7: the reason names what is wrong with the row
    "wrongcataloguereason": ("route",
                             "if (!rows[0]) return 'subjectNotInCatalogue';",
                             "if (!rows[0]) return 'invalidProgramSubject';"),
    # 18b row 9: ten to a page
    "nolimit": ("route", "LIMIT $3 OFFSET $4", "LIMIT $3 + 100 OFFSET $4"),
    # 18b row 9: one order across the pages
    "unordered": ("route",
                  "ORDER BY ps.program_id ASC, ps.subject_id ASC",
                  "ORDER BY ps.subject_type ASC, ps.is_active ASC"),
    # 18c row 8: the list is confined to the reach
    "listeveryone": ("route",
                     "WHERE ($1::text[] IS NULL OR ps.program_id = ANY($1))",
                     "WHERE ($1::text[] IS NOT NULL OR ps.program_id = ANY($1))"),
    # 18c row 8: a curriculum is not the central administrator's, the faculty's
    # nor a teacher's. Rewritten at #79, which took `FACULTY_ADMIN` out of the
    # maintainers: the mutant it was written against no longer exists in the
    # file, and the refused three are now the three this puts back.
    "maintainerall": ("route",
                      "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
                      "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'FULL_ADMIN', 'TEACHER', 'FACULTY_ADMIN'];"),
}

main(FILES, MUTANTS)
