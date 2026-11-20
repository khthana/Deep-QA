# -*- coding: utf-8 -*-
"""#294 — หน่วยงาน (คณะ ภาควิชา หลักสูตร) อ่านด้วยชื่อ ไม่ใช่รหัส นอกหน้าจัดการ

    python mutation/294-org-units-by-name.py save
    python mutation/294-org-units-by-name.py <mutant>
    python mutation/294-org-units-by-name.py restore

แถวที่ถูกฆ่าอยู่ใน `backend/test/grants.test.js` และ `backend/test/history.test.js` (บล็อกท้ายแฟ้มที่ขึ้นต้น
`#294`) · `e2e/tests/294a-org-units-by-name.spec.js` · `215a` แถว 3–4 · `231a` แถว 1–3 · `18a` แถว 6
กฎของเจ้าของงาน 20 พ.ย. 2569 อยู่ที่ `docs/org-unit-names.md` · ใบ `docs/acceptance/12-role-grants.md` §#294

    cd backend && node --test test/grants.test.js test/history.test.js
    cd e2e && npx playwright test tests/294a tests/215a tests/231a tests/18a-program-subjects --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237) · แฟ้มที่ใช้ร่วมกับแฟ้มอื่นของ `mutation/`:
`RoleDropdown.js` (`231`), `GrantsPanel.js` และ `Users.js` (`215`), `HistoryPanel.js` และ `history.js` (`13`)
อย่ากวาดแฟ้มเหล่านั้นพร้อมกับแฟ้มนี้ (#85)

## มัตแตนต์

ชื่อขึ้นต้นด้วย `o294` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185) · ทุกตัววางที่จุดเรียก ไม่ใช่ใน
`scopeNames.js` หรือ `scopeLabel.js` ที่ใช้ร่วม ฉะนั้นแต่ละจอยังเป็นข้ออ้างของตัวเอง (#104) — ตัวที่แก้ตัวแปลง
ชื่อที่ใช้ร่วมคือ `231:nameofanothertier`

- `o294heldnameless` — `HELD` ของ `grants.js` เลิกส่งชื่อ คือโค้ดก่อน #294 เขียนให้รันได้ (#115)
- `o294listnameless` — `GRANTS` ของรายการบัญชีเลิกส่งชื่อ
- `o294historyunnamed` — ประวัติเลิกแปลชื่อเรคอร์ด
- `o294historykindblind` — ชื่อของเรคอร์ดอ่านจากตารางไหนก็ได้ที่ตรงรหัส คือ `COALESCE` ที่ไม่ถามชนิด
  (ข้อจำกัดชนิดใน `ON` ไม่ใช่สิ่งที่กัน — มันเป็นสำเนาที่สองของความเห็นของ `CASE` ซึ่งถูกเอาออกแล้ว #97)
- `o294pickercodeback` — ป้ายเมนูบทบาทมีรหัสในวงเล็บกลับมา คือคำตอบ 27 ต.ค. 2569 ที่เจ้าของงานกลับ เขียนให้รันได้ (#48)
- `o294kindwordalways` — คำบอกชนิดถูกเติมทุกบทบาท แม้ชื่อบทบาทบอกแล้ว (`กรรมการหลักสูตร หลักสูตร…`)
- `o294kindwordnever` — ไม่เติมคำบอกชนิดเลย ผู้ประเมินภายนอกอ่านชื่อเปล่า
- `o294panelfromlist` — ตารางบทบาทที่ถือหาชื่อในรายการที่เสนอได้อย่างเดียว แบบก่อน #294 (#115)
- `o294listfromlist` — คอลัมน์บทบาทของรายการบัญชีแบบเดียวกัน
- `o294sectionscode` — บรรทัดใต้หัวของแผงกลุ่มเรียนกลับเป็นรหัสหลักสูตร
- `o294removalcode` — คำถามก่อนนำรายวิชาออกจากหลักสูตรกลับเป็นรหัส
- `o294pdfcode` — หัว PDF ของการจับคู่ PLO มีรหัสกลับมา
- `o294historypanelcode` — คอลัมน์ *ทำกับข้อมูล* ไม่อ่านชื่อที่ server ส่งมา

ไม่มีมัตแตนต์ที่จุดเรียกของ `Offerings.js` ที่ส่ง `programName` ให้แผง: แถวเดียวที่จะฆ่ามันคือแถว 1 ของ
`294a` ซึ่ง `o294sectionscode` ฆ่าอยู่แล้วที่ตัวแผง และสิ่งที่มันเพิ่มได้คือการอ้างว่าทางเข้านั้นไปถึง (#191) ซึ่งเป็นทาง
เดียวของแผงนี้

## ตารางคำทำนาย (เขียนก่อนกวาด 20 พ.ย. 2569)

แถว backend อ่านตามลำดับในบล็อก `#294` ของแต่ละแฟ้ม และแถวที่ตายรายงาน assertion แรกที่มันแตะ (#88)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `o294heldnameless` | backend grants *on the grants an administrator opens* · *a programme is a programme* · e2e `215a` 4 | backend `deepEqual` (`scope_name` null) · `grant.scope_name` null · `215a` 4 ที่ `panelScopeCell` toHaveText (อ่าน `01` เปล่า เพราะ 01 ไม่อยู่ในรายการที่เสนอได้) | backend *and on the accounts list* · `215a` 1 (ชื่อในเอื้อมหาได้จากรายการ) · `215a` 3, 5, 6 · `231a` ทุกแถว |
| `o294listnameless` | backend *and on the accounts list* · `215a` 3 | backend `deepEqual` ของ `row.roles` · `215a` 3 ที่ `roleCell` toHaveText (`(01)`) | backend อีกสองแถวของบล็อก · `215a` 1, 2 (ชื่อในเอื้อมมาจากรายการที่เสนอได้) · 4, 5, 6 |
| `o294historyunnamed` | backend history *a programme by its own name* · *a department by its own name* · *a department sharing…* · e2e `294a` 3 | backend `target_name` null ทั้งสาม · `294a` 3 ที่ `entryCell(0)` toHaveText (`หลักสูตร 0501`) | backend *a unit deleted since* และ *an account is not looked up* (null อยู่แล้ว) · `294a` 1, 2 |
| `o294historykindblind` | backend *a department sharing a programme's id* | `of('T294_TWIN').target_name` (ชื่อหลักสูตร 0501) | backend แถวอื่นของบล็อก (ชื่อ 0501 กับ 05 ต่างตาราง ไม่ชนกัน) · `294a` 3 (มีหลักสูตร 0501 ไม่มีภาควิชา 0501 ใน seed) |
| `o294pickercodeback` | `231a` 1, 2, 3 · และทุกแถวที่อ่านปุ่มด้วย `committeeLabel` (`10a`, `12a`, `155a`, `198a`, `264a`, `81a`) | `231a` 1 ที่ `actingButton` toHaveText · 2 ที่ `actingButton` toHaveText · 3 ที่ `roleOption` ของ 0503 (ชื่อไม่ตรง exact) — แถวไฟล์อื่นตายที่การจัดฉาก ไม่ใช่ข้ออ้างของตัวเอง (#266) | แถวที่ไม่แตะเมนูบทบาท · `215a` ทุกแถว |
| `o294kindwordalways` | `231a` 1, 3 และแถวไฟล์อื่นที่อ่านป้ายกรรมการ | `231a` 1 ที่ `actingButton` toHaveText (`กรรมการหลักสูตร หลักสูตร…`) · 3 ที่ `roleOption` ของ 0503 | `231a` 2 — ผู้ประเมินควรได้คำนั้นอยู่แล้ว |
| `o294kindwordnever` | `231a` 2 | `actingButton` toHaveText (`ผู้ประเมินภายนอก วิศวกรรม…`) | `231a` 1, 3 และแถวไฟล์อื่น — กรรมการไม่เติมคำอยู่แล้ว |
| `o294panelfromlist` | `215a` 4 · และแถวที่หาแถว `01` ด้วย `grantRow` (`111a`, `121a`, `12a` ที่ `'01'`) | `215a` 4 ที่ `panelScopeCell` toHaveText (`01`) · แถวไฟล์อื่นตายที่ locator (การจัดฉาก) | `215a` 1 (ในเอื้อม) · 3 (คนละจอ) · 5, 6 (ทั้งมหาวิทยาลัยหาได้จากรายการ) |
| `o294listfromlist` | `215a` 3 | `roleCell` toHaveText (`อาจารย์ผู้สอน (01)`) | `215a` 2 (ในเอื้อม) · 4, 5, 6 |
| `o294sectionscode` | `294a` 1 | `toHaveText` (`… · หลักสูตร 0501`) | `294a` 2, 3 · `139a` (อ่านแค่ภาคการศึกษาต้นบรรทัด) |
| `o294removalcode` | `18a` 6 | `toContain(ออกจากหลักสูตร… ใช่หรือไม่)` | `18a` แถวอื่น |
| `o294pdfcode` | `294a` 2 | `toContain(heading)` — ชื่อไฟล์ข้างบนผ่าน | `294a` 1, 3 · `20a` (ชื่อไฟล์ ไม่ใช่หัว) |
| `o294historypanelcode` | `294a` 3 | `entryCell(0)` toHaveText (`หลักสูตร 0501`) — แถว `entryCell(1)` ไม่ถูกอ่าน | `294a` 1, 2 · `13a` (`บัญชีผู้ใช้ …` ไม่มีชื่อ) |

## ตัวของแฟ้มอื่นที่ #294 เล็งใหม่ — คำทำนายก่อนกวาดซ้ำ (20 พ.ย. 2569)

อยู่ที่นี่เพราะการเล็งใหม่เป็นของตั๋วนี้ ส่วนตารางของ `215` อยู่ในแฟ้มของมันเอง · แต่ละตัวกวาดกับแฟ้มของมัน
ไม่ใช่พร้อมกับแฟ้มนี้ (#85)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ |
|---|---|---|
| `13:N1` | แถวของ `13a` ที่อ่านลำดับ และแถว backend ที่อ่านลำดับ — เหมือนก่อน #294 เพราะลำดับเดียวกันบนคอลัมน์เดียวกัน แค่มีชื่อเล่น `l.` | assertion ลำดับของแถวนั้น ๆ |
| `13:N3` | แถว `13a` ที่อ่านคอลัมน์ *ทำกับข้อมูล* · **และ** `294a` 3 ซึ่งแฟ้มของ `13` ไม่เคยรู้จัก (#248) | `294a` 3 ที่ `entryCell(0)` toHaveText (`วิศวกรรมคอมพิวเตอร์` ไม่มีคำบอกชนิด) |
| `13:N4` | แถวที่ตัวนี้ฆ่าก่อน #294 — ความหมายไม่เปลี่ยน | ที่เดิม |
| `216:bracketsthesentinel` | `215a` 5 กับ 6 และ `90a` 4 — ขอบเขตที่ไม่ถูกจำกัดได้วงเล็บ `(FULL_ADMIN)` | `toHaveText` ของทั้งสามแถว |
| `90:nokind` | `90a` 1, 2, 5 · `215a` 1, 2, 3, 4 (3 กับ 4 ใหม่ เพราะชื่อจาก server ผ่าน `scopeLabel` เหมือนกัน) · `90a` 3 **รอด** เพราะชื่อคณะบอกชนิดเองอยู่แล้ว | `toHaveText` / `toContainText` ของแต่ละแถว |
| `231:namelessresolver` | `231a` 1–3 · และทุกแถวที่อ่านปุ่มด้วย `committeeLabel` — ปุ่มตกเป็นรหัสเปล่า | `231a` 1 ที่ `actingButton` toHaveText · แถวไฟล์อื่นตายที่การจัดฉาก (#266) |
| `231:nameofanothertier` | `backend/test/shell.test.js` แถว *keeps the code where the tier the walk stopped at has no name* — เหมือนเดิม · **และ** ตอนนี้มันแก้ตัวแปลงที่ใช้ร่วมสามการอ่าน แต่ seed ไม่มีหน่วยไหนที่ชื่อว่าง จึงทำนายว่าแถวของ `grants.test.js` และ e2e รอด | assertion ของแถวนั้น |

## ตัวที่ไม่ได้ถูกเล็งใหม่แต่มีแถวใหม่ให้เอื้อม — คำทำนายก่อนกวาดชุดที่สอง (20 พ.ย. 2569)

เขียนหลังกวาดชุดแรกจบ ก่อนรันชุดนี้ และลงคอมมิตก่อนรัน (#255) · ทุกตัวในแฟ้มอื่นที่แก้โค้ดที่ #294 เขียนใหม่
หรือเอื้อมแถวที่ #294 เขียนใหม่ แม้สมอยังตรง (#202, #248)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ |
|---|---|---|
| `90:swapsthewords` | `90a` 1, 2 · **และ** `215a` 1, 2, 3, 4 (3 กับ 4 ใหม่) | `toContain` / `toHaveText` ของแต่ละแถว |
| `90:nofaculty` | `90a` 5 เท่านั้น — `215a` ไม่มีขอบเขตระดับคณะ | `toContain` ของคณะที่ถูกเปลี่ยนชื่อ |
| `90:saysthekindtwice` | `90a` 3 เท่านั้น — ชื่อภาควิชาและหลักสูตรใน seed ไม่ขึ้นต้นด้วยคำบอกชนิด | ข้ออ้างของแถว 3 |
| `90:namestheunconfined` | `90a` 4 · **และ** `215a` 5, 6 | บรรทัดที่ห้ามคำนำหน้า · `roleCell` / `panelScopeCell` toHaveText |
| `231:triggerreadsthepointer` | `231a` 1, 2 เหมือนเดิม | `actingButton` toHaveText |
| `13:N2` `N5` `N6` `N7` `N8` `N9` กับ `294a` | **ไม่มี — ทำนายว่ารอดทั้งหก** แถว 3 ของ `294a` เขียน `user_log` เองและไม่อ่านเวลา หน้า หรือรายชื่อนอกบัญชีของมัน | — |
| `10:senior` | `10a` แถว 3 | `toHaveText(PROGRAM_MANAGER_0501)` |
| `10:stalelabel` | แถวของ `10a` ที่ตัวนี้ฆ่าก่อน #294 — ป้ายเปลี่ยนแค่ถ้อยคำ ไม่เปลี่ยนว่าอ่านจากสิทธิ์ไหน | ที่เดิม |
"""
from harness import main

FILES = {
    'held': 'backend/routes/grants.js',
    'list': 'backend/auth/administration.js',
    'history': 'backend/routes/history.js',
    'picker': 'frontend/src/components/RoleDropdown.js',
    'panel': 'frontend/src/components/users/GrantsPanel.js',
    'users': 'frontend/src/pages/Users.js',
    'sections': 'frontend/src/components/offerings/SectionsPanel.js',
    'removal': 'frontend/src/pages/ProgramSubjects.js',
    'pdf': 'frontend/src/components/ploMapping/exportPdf.js',
    'entries': 'frontend/src/components/users/HistoryPanel.js',
}

# The anchor is the code the mutant breaks and never the comment beside it
# (#121, #123).

TARGET_NAME = """const TARGET_NAME = `CASE l.target_kind
                       WHEN 'DEPARTMENT' THEN td.department_name_th
                       WHEN 'PROGRAM' THEN tp.program_name_th
                     END AS target_name`;
"""

MUTANTS = {
    'o294heldnameless': ('held',
        '                     ${SCOPE_NAME} AS scope_name, ${SCOPE_KIND} AS scope_kind,\n',
        '                     NULL AS scope_name, ${SCOPE_KIND} AS scope_kind,\n'),
    'o294listnameless': ('list',
        "                          'scope_name', ${SCOPE_NAME}, 'scope_kind', ${SCOPE_KIND})\n",
        "                          'scope_name', NULL, 'scope_kind', ${SCOPE_KIND})\n"),
    'o294historyunnamed': ('history', TARGET_NAME,
        'const TARGET_NAME = `NULL AS target_name`;\n'),
    'o294historykindblind': ('history', TARGET_NAME,
        'const TARGET_NAME = `COALESCE(tp.program_name_th, td.department_name_th) AS target_name`;\n'),
    # The answer the owner reversed on 20 November 2569, made to run (#48).
    'o294pickercodeback': ('picker',
        '      ? `${roleName(grant.role_id)} ${scopeOf(grant)}`\n',
        '      ? `${roleName(grant.role_id)} ${scopeOf(grant)} (${grant.scope_id})`\n'),
    # The two branches of the rule "unless the role's name already says it".
    'o294kindwordalways': ('picker',
        '    return word && !roleName(grant.role_id).endsWith(word)\n',
        '    return word\n'),
    'o294kindwordnever': ('picker',
        '      ? `${word}${grant.scope_name}`\n',
        '      ? grant.scope_name\n'),
    # The two administration screens as they named a grant before #294: out of
    # the picker's list, which holds no scope outside the reader's reach (#115).
    'o294panelfromlist': ('panel',
        '                  {grantScope(grantable.scopes, grant)}\n',
        '                  {grantScope(grantable.scopes, { scope_id: grant.scope_id })}\n'),
    'o294listfromlist': ('users',
        '                                grant,\n'
        '                              )})`,\n',
        '                                { scope_id: grant.scope_id },\n'
        '                              )})`,\n'),
    # The three sites that drew a bare code, as they drew it (#115).
    'o294sectionscode': ('sections',
        '            {programName ?? ` ${offering.program_id}`}\n',
        '            {` ${offering.program_id}`}\n'),
    'o294removalcode': ('removal',
        '                programs.find(entry => entry.program_id === removing.program_id)\n'
        '                  ?.program_name_th ?? ` ${removing.program_id}`\n',
        '                ` ${removing.program_id}`\n'),
    'o294pdfcode': ('pdf',
        '    `หลักสูตร${program.program_name_th ?? ` ${program.program_id}`}` +\n',
        '    `หลักสูตร ${program.program_id} ${program.program_name_th}` +\n'),
    'o294historypanelcode': ('entries',
        '  return entry.target_name ? `${kind}${entry.target_name}` : `${kind} ${entry.target_id}`\n',
        '  return `${kind} ${entry.target_id}`\n'),
}

main(FILES, MUTANTS)
