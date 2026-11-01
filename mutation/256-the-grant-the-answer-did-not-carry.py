# -*- coding: utf-8 -*-
"""#256 — บทบาทที่คำตอบของการนำเข้าไม่ได้ถือมา

เจ้าของงานตอบเมื่อ 1 พ.ย. 2569 ว่า **ข้อ ก** — ให้ **คำตอบของการนำเข้าเท่านั้น** ถือบทบาท
ของแถวที่เขียนมา ไม่ใช่ `COLUMNS` ของ `backend/auth/administration.js` ซึ่งทุกการอ่าน
ของปลายทางบัญชีใช้อยู่ · สิ่งที่ตั๋วเสนอไว้ที่ `COLUMNS` **ทำไม่ได้อยู่แล้ว** บทบาทอยู่ที่
`user_roles` ไม่ใช่คอลัมน์ของ `users` และ subquery ใน `RETURNING` ของ INSERT จะรันก่อน
คำสั่งที่เขียนบทบาท แล้วตอบ `[]` ตรงที่ตั๋วต้องการมันพอดี — ข้อที่ตั้งชื่อสถานะที่กลไกถือไม่ได้
ไม่ใช่ข้อให้เลือก (#232) ค่าจึงมาจากที่ที่มันรู้อยู่แล้ว คือ `role` ของ callback นั้นเอง

ครึ่งที่ #252 เขียนว่า **เงียบ** จึงปิด: `importedOutsideTheFilters` ของ `Users` ถามครบ
ทั้งสามคำถามแล้ว (คำค้น สถานะ บทบาท) และถามด้วยกลไกที่เซิร์ฟเวอร์กรอง — EXISTS เหนือ
สิทธิ์ที่ยังใช้ได้ของบัญชี — ไม่ใช่รูปที่จอคิดขึ้นเอง (#96, #174)

## ตารางทำนาย — เขียนก่อนรันตัวแรก (#255)

| ชื่อ | สิ่งที่มันทำ | ข้ออ้างที่มันฆ่า |
|---|---|---|
| `rolequestionoff` | ข้อบทบาทของ `importedOutsideTheFilters` ตอบ `false` สองข้อที่เหลือยังอยู่ | `252a` แถว 6 ที่ `toHaveText(SOME_IMPORTED_OUTSIDE)` — แฟ้มเขียนอาจารย์ผู้สอนลงตารางที่กรองบทบาทอื่น แล้วจอไม่พูด · แถว 7 ผ่านใต้มัน เพราะแถวนั้นอ้างว่าจอ **ไม่** พูด |
| `answerwithoutgrant` | ปลายทางนำเข้าคืน `written.user` เปล่า ๆ อย่างที่คืนถึง 31 ต.ค. 2569 คือโค้ดที่ตั๋ววินิจฉัย เขียนให้รันได้ (#115) | `252a` แถว 7 ที่ `notice(page).toHaveCount(0)` — ไม่มีบทบาทมา `(row.roles ?? [])` ว่าง ข้อบทบาทจึงตอบ *อยู่นอกตัวกรอง* เหนือรายการที่ถือบัญชีนั้นอยู่ · และแถว `answers with each row's grant, in the shape the list publishes` ของ `backend/test/users.test.js` ที่ `deepEqual` · แถว 6 ผ่านใต้มัน ซึ่งเป็นเหตุที่แถว 7 มีอยู่ (#145) |
| `grantisaconstant` | คืนบทบาทมาจริง แต่เป็นค่าคงที่ `TEACHER` ไม่ใช่บทบาทของแถวที่อ่านจาก CSV | แถว `answers with each row's grant` **เท่านั้น** ที่คู่ `PROG_MANAGER` · ทั้งสองแถวของ `252a` ผ่านใต้มัน เพราะแฟ้มของทั้งคู่เขียนอาจารย์ผู้สอน — นี่คือตัวที่บอกว่าแถวฝั่งเบราว์เซอร์ปักค่าของวันนี้ ไม่ใช่ *คำตอบถือบทบาทของแถวนั้น* และเป็นเหตุที่แถวฝั่ง backend มีอยู่ |
| `everywritepublishes` | ข้อที่เจ้าของงานไม่เลือก เขียนให้รันได้ (#48): `insertAccount` คืนบทบาทมาด้วย ฉะนั้น `POST /users` เผยแพร่มันเช่นกัน | แถวคุม `while the single-account answer still publishes no grant` **เท่านั้น** ทุกแถวที่เหลือผ่านใต้มัน เพราะการนำเข้าได้ค่าเดียวกันจากสองทาง — ซึ่งคือสิ่งที่ทำให้ *เลือกข้อ ก* เป็นคำตัดสิน ไม่ใช่ประโยคบนใบ |

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **`(row.roles ?? [])`** — ข้ออ้างว่าคำตอบที่ไม่ถือรายการมาตอบ *ไม่* แทนที่จะโยนในตัว
  handler เป็นข้ออ้างที่ `answerwithoutgrant` ถือไว้แล้ว: มันเอารายการออกทั้งก้อน แถว 7
  จึงเดินผ่านทางนั้นทุกครั้ง มัตแตนต์ที่เปลี่ยน `?? []` เป็น `?? undefined` จะฆ่าแถวเดียวกัน
  ด้วยเหตุเดียวกัน — สองที่ที่ถือความเห็นเดียวกันคือข้ออ้างที่ไม่มีที่ไหนพิสูจน์ได้ (#97)
- **รูปของสิ่งที่เผยแพร่ (`roles` ไม่ใช่ `role`)** — ไม่มีมัตแตนต์ของชื่อคีย์ เพราะแถว
  `deepEqual` ฝั่ง backend อ่านรูปทั้งก้อน และ `answerwithoutgrant` ฆ่ามันอยู่แล้ว
  ชื่อคีย์เป็น **ข้อตั้ง** ของแถวนั้น อย่างเดียวกับ attribute ที่ locator สร้างขึ้นจาก (#85, #111)
- **ปลายทางอื่นที่อ่านบัญชี** — `COLUMNS` ไม่ถูกแก้ ฉะนั้นไม่มีอะไรให้บิด และข้ออ้างว่า
  *มันไม่ถูกแก้* คือ `everywritepublishes` อ่านจากอีกด้าน

## วิธีรัน

    python mutation/256-the-grant-the-answer-did-not-carry.py save
    python mutation/256-the-grant-the-answer-did-not-carry.py rolequestionoff
    python mutation/256-the-grant-the-answer-did-not-carry.py restore
    cd e2e && npx playwright test tests/252a-the-file-outside-the-filter.spec.js
    npm --prefix backend test
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง

**อย่ากวาดแฟ้มนี้พร้อมกับแฟ้มอื่นที่ `FILES` ถือทางเดินเดียวกัน** — ชื่อทั้งสองรายการมาจาก
`grep -ln` เมื่อ 1 พ.ย. 2569 ไม่ใช่จากความจำ (#126, #254) · `pages/Users.js` อยู่ใน
`57`, `84`, `86`, `124`, `140`, `144`, `146`, `202`, `203`, `208`, `215`, `238`, `239`,
`247` กับ `252`; `backend/routes/users.js` อยู่ใน `11-12`, `124`, `125`, `128`, `13`,
`131`, `216`, `49`, `58`, `67`, `83`, `84`, `87` กับ `88` · เทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง
(#85, #87, #125)
"""
from harness import main

FILES = {
    'users': 'frontend/src/pages/Users.js',
    'route': 'backend/routes/users.js',
}

# สมอยึดกับโค้ดที่มัตแตนต์ทำให้พัง ไม่ใช่คอมเมนต์ข้างมัน (#121, #123)
USERS_ROLE = (
    '  if (\n'
    '    filters.role &&\n'
    '    !(row.roles ?? []).some(grant => grant.role_id === filters.role)\n'
    '  ) {\n'
    '    return true\n'
    '  }\n'
)
IMPORT_ROW = (
    '          return {\n'
    '            ok: true,\n'
    '            row: { ...written.user, '
    'roles: [{ role_id: role.role_id, scope_id: role.scope_id }] },\n'
    '          };\n'
)
INSERT_RETURN = '    return { ok: true, user: rows[0] };\n'

MUTANTS = {
    # ข้อบทบาทหายไป สองข้อที่เหลือยังอยู่ (#97)
    'rolequestionoff': ('users', USERS_ROLE,
        '  if (\n'
        '    filters.role &&\n'
        '    false\n'
        '  ) {\n'
        '    return true\n'
        '  }\n'),
    # โค้ดที่ตั๋ววินิจฉัย อย่างที่มันยืนอยู่ถึง 31 ตุลาคม 2569 (#115)
    'answerwithoutgrant': ('route', IMPORT_ROW,
        '          return {\n'
        '            ok: true,\n'
        '            row: written.user,\n'
        '          };\n'),
    # ถือบทบาทมาจริง แต่ไม่ใช่บทบาทของแถวนั้น — ตัวที่แยก *ปักค่าของวันนี้*
    # ออกจาก *คำตอบถือบทบาทของแถวที่เขียน* (#145)
    'grantisaconstant': ('route', IMPORT_ROW,
        '          return {\n'
        '            ok: true,\n'
        "            row: { ...written.user, "
        "roles: [{ role_id: 'TEACHER', scope_id: role.scope_id }] },\n"
        '          };\n'),
    # ข้อที่เจ้าของงานไม่เลือก เขียนให้รันได้ (#48): ทุกการเขียนบัญชีเผยแพร่บทบาท
    'everywritepublishes': ('route', INSERT_RETURN,
        '    return {\n'
        '      ok: true,\n'
        '      user: { ...rows[0], '
        'roles: [{ role_id: role.role_id, scope_id: role.scope_id }] },\n'
        '    };\n'),
}

main(FILES, MUTANTS)
