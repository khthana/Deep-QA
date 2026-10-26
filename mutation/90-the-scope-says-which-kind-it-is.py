# -*- coding: utf-8 -*-
"""#90 — ช่องขอบเขตบอกชนิดด้วยคำ ไม่ใช่ด้วยจำนวนหลักของรหัส

พบระหว่างเดินแถว *ให้บทบาทสูงกว่าตัวเองไม่ได้* ของ `docs/acceptance/11-user-accounts.md`
เมื่อ 21 ส.ค. 2569 และเป็นคำถามของเจ้าของข้อกำหนด ไม่ใช่ข้อบกพร่องของกฎ (`docs/06` §Out of Scope) —
จอที่ส่งมอบวาด `{scope.nameTH}` เปล่า ๆ ไม่มีรหัสและไม่มีคำบอกชนิด สิ่งที่กันความกำกวมที่นั่นคือ
**ลิสต์คนละลิสต์**: `user_rolesController.getScope` เลือกชนิดตามบทบาทที่กำลังจะให้ ปนกันแค่
`FULL_ADMIN`/`GUEST` ซึ่งที่นั่นอ่านเป็นชื่อซ้ำกันทุกตัวอักษร คือเลือกไม่ได้เลย รีบิลด์ทิ้งการผูกนั้น
โดยตั้งใจ (ลิสต์มาจาก `coveredScopes` ของด่านเอง) #90 จึงเป็นราคาของการเบนที่ทำไปแล้ว
**คำตอบเมื่อ 17 ต.ค. 2569 คือ บอกชนิดด้วยคำ**

ไม่ใช่เรื่องการตกแต่ง — ช่องนี้ตัดสินว่าสิทธิ์ **กว้างแค่ไหน** `scope_id` คือสิ่งที่ `scopeChain` แปลง
และ `assignable` ถามแค่สองคำถาม (ลำดับของบทบาท และขอบเขตที่เอื้อมถึง) ไม่ผูกบทบาทกับชนิด
ของขอบเขต ฉะนั้นทั้งภาควิชา `05` และหลักสูตร `0501` เป็นค่าที่ถูกกฎทั้งคู่ และไม่มีอะไรร้อง

## ตัวค้ำ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `nokind` | โค้ดที่ตั๋ววินิจฉัยไว้ เขียนให้รันได้ (#115) — ป้ายเป็น `ชื่อ (รหัส)` อย่างก่อน #90 ทุกชนิด · **สามการแก้ตั้งแต่ #216** เพราะป้ายก่อน #90 ไม่มีทั้งแผนที่และตัวช่วย การทิ้ง `KINDS` หรือ `withCode` ไว้โดยไม่มีใครอ้างเป็น warning ที่ react-scripts เปลี่ยนเป็นคอมไพล์ตกเมื่อ `CI=true` ซึ่งจะเป็นมัตแตนต์ที่หยุดแอป ไม่ใช่ที่ล้มแถว (#101) | `90a` แถว 1 2 และ 5 · **และตั้งแต่ #216 แถว 4 กับ `215a` แถว 5 และ 6 ด้วย** ที่ข้ออ้างเรื่องรหัสในวงเล็บ เพราะโค้ดก่อน #90 ใส่รหัสของทุกขอบเขตรวมทั้ง sentinel · แถว 3 **ไม่** ตาย และสองข้ออ้างแรกของแถว 4 ยังจริงใต้มัตแตนต์นี้ คือสิ่งที่ทั้งสองแถวยังควบคุมอยู่ · แถว 1 2 กับ 3 ของ `215a` ก็ตายด้วย (ห้าแถวของไฟล์นั้นรวมแถว 5 กับ 6) ซึ่ง `mutation/215-the-scope-the-reader-is-shown.py` บันทึกไว้ตั้งแต่ 23 ต.ค. 2569 รายชื่อของ `215a` อยู่ที่แฟ้มนั้น ไม่ใช่ที่ช่องนี้ (#123) |
| `swapsthewords` | สลับคำของภาควิชากับหลักสูตร คำยังอยู่ครบและยังมีสองคำต่างกัน แต่ชี้ผิดชนิด | `90a` แถว 1 กับ 2 — แยก *แถวอ่านกฎ* ออกจาก *แถวตรึงว่ามีคำอะไรก็ได้* (#145) |
| `nofaculty` | ถอด `faculty` ออกจากแผนที่ คณะที่ถูกเปลี่ยนชื่อจึงไม่ได้คำที่ควรได้ | `90a` แถว 5 เท่านั้น — **ไม่ใช่แถว 3** เพราะกับชื่อที่ seed ถือไว้ การกดคำไว้กับการไม่เคยมีคำ ให้สตริงเดียวกัน มัตแตนต์จึงมองไม่เห็นที่นั่น (#117) |
| `saysthekindtwice` | ถอดเงื่อนไข `startsWith` ออก ทุกชนิดที่มีคำในแผนที่จึงได้คำนำหน้าเสมอ ซึ่งคือถ้อยคำที่เจ้าของงานปฏิเสธเมื่อ 17 ต.ค. 2569 เขียนให้รันได้ (#48) | `90a` แถว 3 เท่านั้น — แถว 5 ผ่าน เพราะคณะที่ถูกเปลี่ยนชื่อควรได้คำนำหน้าอยู่แล้ว |
| `namestheunconfined` | ใส่ `global` ลงในแผนที่ ขอบเขตที่ไม่ถูกจำกัดจึงได้คำนำหน้าด้วย | `90a` แถว 4 **ที่บรรทัดของข้ออ้างที่สอง** คือข้อที่ห้ามคำนำหน้า ส่วนข้อที่สามเรื่องวงเล็บอยู่ใต้บรรทัดแดงนั้น ไม่มีใครอ่าน (#88) ซึ่งเป็นเหตุที่ข้อที่สามต้องมี `216:bracketsthesentinel` เป็นตัวค้ำของมันเอง · **และตั้งแต่ #216 แถว 5 กับ 6 ของ `215a` ด้วย** เพราะทั้งคอลัมน์บทบาทและช่องของตารางบทบาทที่ถืออยู่ อ่านป้ายเดียวกันนี้ |

`nokind` กับ `swapsthewords` ฆ่าแถว 1 และ 2 ทั้งคู่ และนั่นคือ **ข้ออ้างเรื่องการเอื้อมถึงสองข้อ ไม่ใช่
ข้อเดียวนับสองครั้ง** (#191) — `GrantPicker` เป็นโค้ดร่วมของฟอร์มเพิ่มบัญชี (#11) กับแผงบทบาท (#12)
ไม่มีมัตแตนต์ที่ไซต์นั้นแยกสองจอออกจากกันได้ สิ่งที่แต่ละแถวเพิ่มคือทางเข้าของมันเองไปถึงที่นั่นจริง

แถว 4 ถูกแยกออกจากแถว 3 **เพราะมัตแตนต์** ไม่ใช่เพราะความสวยงาม — แถวเดียวที่ถือสองข้ออ้าง
จะรายงานข้อที่ตายก่อนเท่านั้น (#88) ฉะนั้น `saysthekindtwice` จะกลบ `namestheunconfined` ทั้งตัว
· **แถว 4 ถือสามข้ออ้างตั้งแต่ #216** และไม่มีข้อไหนที่ไม่มีใครอ่าน เพราะข้อที่สามมีตัวค้ำของมันเอง
สองตัว คือ `216:bracketsthesentinel` ซึ่งตายที่ข้อนั้นโดยสองข้อข้างบนยังผ่าน และ `nokind`

**แถว 5 เกิดจากมัตแตนต์ที่มองไม่เห็น ไม่ใช่จากเกณฑ์ข้อใหม่** คำตอบที่สองของเจ้าของงาน
(ตัดคำที่ซ้ำ) ทำให้ `nofaculty` เงียบ เพราะกับชื่อ `คณะวิศวกรรมศาสตร์` สองการทำงานเห็นพ้องกัน
ทางแก้คือ **แถว** ไม่ใช่การลบมัตแตนต์ (#118) และ fixture ถูกสร้างที่จุดซึ่งสองการทำงาน
**ไม่** เห็นพ้องกัน คือคณะที่ชื่อไม่ขึ้นต้นด้วยคำของมัน (#117) · ข้ออ้างที่ว่าไม่มี fixture ใดสร้าง
สถานการณ์นี้ได้เป็นข้ออ้างเกี่ยวกับ seed (#155) — อันนี้สร้างด้วยการเขียนฐานข้อมูลตรง ๆ อย่างที่
`133a` กับ `139a` อ่าน แล้วคืนชื่อใน `finally` ใต้ seam ที่แถวกำลังวัด (#181, #134)
· `leftovers` ของการรันยืนยันว่าตาราง `faculty` ไม่ขยับ (#132)

**สิ่งที่ยังไม่ได้พิสูจน์ (17 ต.ค. 2569)** คำบอกชนิดลงไปไม่ถึงสามจุดที่เหลือซึ่งวาดขอบเขตให้คนอ่าน —
`GrantsPanel.js` (รหัสเปล่าที่ `{grant.scope_id}`), `Users.js` (`ชื่อบทบาท (รหัส)`) และ
`RoleDropdown.js` ที่ `label` ของมัน (`ชื่อบทบาท รหัส`) สามจุดนั้นไม่มีชื่อของขอบเขตเลย ซึ่งกำกวมกว่า
จุดที่ตั๋วชี้ · อ้างด้วยข้อความที่วาดมันไม่ใช่ด้วยเลขบรรทัด เพราะเลขบรรทัดหมดอายุวันที่อะไรข้างบน
มันงอก (#173, #130) · อยู่ที่ [#215](https://github.com/khthana/Deep-QA/issues/215) แล้ว เปิดเมื่อ 17 ต.ค. 2569 และถ้อยคำของ
*ทั้งมหาวิทยาลัย (FULL_ADMIN)* อยู่ที่ [#216](https://github.com/khthana/Deep-QA/issues/216) (#119, #125)

**อ่านย่อหน้าข้างบนตามวันที่ของมัน** เจ้าของงานตอบ #215 เมื่อ 23 ต.ค. 2569 ว่าสองจุดฝั่งผู้ดูแล
ได้ถ้อยคำนี้ทุกตัวอักษร จึงเหลือ `RoleDropdown.js` ซึ่งแก้ที่จอไม่ได้เลย เพราะ `/api/me` ไม่ส่งชื่อ
ของขอบเขตมา และคนที่อ่านป้ายนั้นคือสองบทบาทที่ `grantable` ปฏิเสธ — อยู่ที่
[#231](https://github.com/khthana/Deep-QA/issues/231) · ถ้อยคำของ *ทั้งมหาวิทยาลัย (FULL_ADMIN)*
ที่ #216 ถามถึงนั้น ตอนนี้ไปถึงสองจอนั้นด้วย

**การกวาดรอบที่สี่เมื่อ 24 ต.ค. 2569 คือรอบที่นับที่นี่** #216 ตัดวงเล็บของ sentinel ออก `nokind` จึงถูกเล็งใหม่เป็นสามการแก้ และกวาดใหม่ทั้งห้าตัวกับ `tests/90a tests/215a` สิบเอ็ดแถว (แถว 6 ของ `215a` เข้ามาจากการรีวิววันเดียวกัน) — `nokind` ล้มเก้าแถว คือ `90a` แถว 1 2 4 กับ 5 และ `215a` แถว 1 2 3 5 กับ 6 เหลือ `90a` แถว 3 กับ `215a` แถว 4 · `swapsthewords` ล้มห้าแถว คือ `90a` แถว 1 กับ 2 และ `215a` แถว 1 2 กับ 3 · `nofaculty` ล้มแถวเดียว คือ `90a` แถว 5 · `saysthekindtwice` ล้มแถวเดียว คือ `90a` แถว 3 · `namestheunconfined` ล้มสามแถว คือ `90a` แถว 4 กับ `215a` แถว 5 และ 6 · ไม่มีตัวไหนรอด และทุกการล้มอยู่ที่บรรทัดของข้ออ้างของแถวนั้นเอง ยกเว้นที่ตารางข้างบนระบุไว้ว่าตายที่จุดอื่น

## วิธีรัน

    python mutation/90-the-scope-says-which-kind-it-is.py save
    python mutation/90-the-scope-says-which-kind-it-is.py <mutant>
    python mutation/90-the-scope-says-which-kind-it-is.py restore
    cd e2e && npx playwright test tests/90a tests/215a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    # เล็งใหม่เมื่อ 23 ต.ค. 2569 ถ้อยคำย้ายออกจาก `GrantPicker` ไปอยู่แฟ้มของตัวเองตอน #215
    # ให้อีกสองจอใช้คำเดียวกัน โค้ดที่มัตแตนต์แก้เป็นข้อความเดียวกันทุกตัวอักษร ยกเว้นคำ `export`
    # ที่โมดูลต้องมี — และสิ่งที่ขยับจริงคือ **ประชากรของแถวที่มันเอื้อมถึง** ไม่ใช่โค้ด
    # เพราะ `215a` มีแถวที่อ่านถ้อยคำเดียวกันนี้แล้ว ซึ่งไม่มีเครื่องมือไหนรายงาน (#202)
    # จึงกวาดซ้ำทั้งห้าตัวกับทั้งสองไฟล์วันเดียวกัน
    'wording': 'frontend/src/components/users/scopeLabel.js',
}

MUTANTS = {
    # The label as it read before #90, which is the code the ticket diagnosed
    # made to run (#115). Three edits since #216, because that code had no map
    # and no helper, and leaving either declared and unreferenced is a mutant
    # that can stop the application rather than fail a row (#101). The code
    # before #90 wrote every scope's own code in brackets, the sentinel
    # included, so this mutant now reaches `90a` row 4's third assertion and
    # `215a` row 5 as well - faithfully, and read against the rows it is for
    # rather than against the total (#203).
    'nokind': [
        ('wording', "const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' }\n", ''),
        ('wording',
        'const withCode = scope =>\n'
        "  scope.kind === 'global' ? scope.label : `${scope.label} (${scope.scope_id})`\n",
        'const withCode = scope => `${scope.label} (${scope.scope_id})`\n'),
        ('wording',
        'export const scopeLabel = scope => {\n'
        '  const kind = KINDS[scope.kind]\n'
        '  return kind && !scope.label.startsWith(kind)\n'
        '    ? `${kind} \u00b7 ${withCode(scope)}`\n'
        '    : withCode(scope)\n'
        '}\n',
        'export const scopeLabel = withCode\n'),
    ],
    # The words are all there and still two different words; they point at the
    # wrong kinds, which no digit count and no drawing could catch (#145).
    'swapsthewords': ('wording',
        "const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' }\n",
        "const KINDS = { faculty: 'คณะ', department: 'หลักสูตร', program: 'ภาควิชา' }\n"),
    # The map loses the kind whose entry only ever suppresses a word with the
    # seeded name, which is why its row is the renamed one (#117).
    'nofaculty': ('wording',
        "const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' }\n",
        "const KINDS = { department: 'ภาควิชา', program: 'หลักสูตร' }\n"),
    # The wording the owner declined on 17 October 2569, made to run (#48):
    # every kind in the map is prefixed, whatever its label already says.
    'saysthekindtwice': ('wording',
        '  return kind && !scope.label.startsWith(kind)\n',
        '  return kind\n'),
    # A word for the grant confined to nothing, whose label already holds the
    # whole of the organisation.
    'namestheunconfined': ('wording',
        "const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร' }\n",
        "const KINDS = { faculty: 'คณะ', department: 'ภาควิชา', program: 'หลักสูตร', global: 'ทั้งระบบ' }\n"),
}

main(FILES, MUTANTS)
