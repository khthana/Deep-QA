# -*- coding: utf-8 -*-
"""#231 — เมนูสลับบทบาทบอกขอบเขตด้วยชื่อ ไม่ใช่รหัสเปล่า

ป้ายของ `RoleDropdown` อ่านว่า `กรรมการหลักสูตร 0501` คือชื่อบทบาทกับรหัสเปล่า เพราะ
`allRoles` ของ `backend/auth/accounts.js` ไม่ได้ส่งชื่อของขอบเขตมาเลย และคนที่อ่านป้ายนี้คือ
สองบทบาทที่ `GET /users/grantable` ปฏิเสธ ฉะนั้นรายการที่อีกสองจอยืมชื่อมาใช้ (#215) มาถึง
ที่นี่เป็นรายการว่าง · การแก้อยู่ที่เซิร์ฟเวอร์ คือ `allRoles` แปล `scope_id` ด้วยลำดับของ
`scopeChain` แล้วส่ง `scope_name` กับ `scope_kind` มาข้างรหัส และถ้อยคำเป็นของเจ้าของงาน
ซึ่งตอบเมื่อ 27 ต.ค. 2569 ว่า **ชื่อกับรหัส ไม่มีคำบอกชนิด**

## สามตัว กับครึ่งที่ตั๋วไม่ได้บอก

ตั๋วบอกว่า `/api/me` ไม่มีชื่อ ซึ่งจริง แต่สิ่งที่ตั๋วไม่ได้บอกคือ **ตัวกระตุ้นของเมนูไม่ได้วาดจาก
`roles`** มันวาดจาก `acting` ซึ่ง `shellState` ส่งมาเป็นตัวชี้สองคอลัมน์ (`role_id`,
`scope_id`) และ `carryGrants` ใส่หัวตอบด้วยสองคอลัมน์เดียวกัน ฉะนั้นชื่อที่มาถึงแล้วยัง
ไม่ถึงตัวกระตุ้น — วัดเมื่อ 27 ต.ค. 2569 ด้วยหัววัดที่อ่านคำตอบของการเข้าระบบ: body มี
`scope_name` ครบ ส่วนปุ่มยังอ่านว่า `กรรมการหลักสูตร 0501` และแถวที่อ่าน**ตัวเลือก**ในเมนู
ที่เปิดอยู่ผ่าน · การแก้ครึ่งนี้คือ `worn = roles.find(isActing) ?? acting` คือหยิบสิทธิ์ที่
ตัวชี้ชี้อยู่ออกมาจากรายการ ไม่ใช่พาชื่อไปไว้สองที่ ซึ่งเป็นความเห็นเดียวที่อยู่สองที่และ
พิสูจน์ไม่ได้ทั้งคู่ (#97)

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `namelessresolver` | `allRoles` เลิกแปลชื่อ คือ `COALESCE(...)` กลายเป็น `NULL AS scope_name` ส่วน `scope_kind` ยังมา · คือโค้ดก่อนการแก้ของฝั่งเซิร์ฟเวอร์ เขียนให้รันได้ (#115) | `231a` ทั้งสามแถว |
| `triggerreadsthepointer` | ตัวกระตุ้นกลับไปวาดจาก `acting` คือ `{label(worn)}` กลายเป็น `{label(acting)}` | `231a` แถว 1 และแถว 2 ที่ `toHaveText` ของปุ่ม ส่วนแถว 3 ยืน เพราะมันอ่านตัวเลือก ไม่ใช่ปุ่ม |
| `kindwordinfront` | **ทางเลือกของถ้อยคำที่เจ้าของงานไม่ได้เลือก เขียนให้รันได้** (#48) — จุดเรียกใช้ `scopeLabel` แทน `scopeCoded` ฉะนั้นป้ายได้ `หลักสูตร · ` นำหน้า เหมือนสองจอฝั่งผู้ดูแล | `231a` ทั้งสามแถว ที่ข้อความของป้าย |
| `nameofanothertier` | ชื่อกลับไปหาด้วย `COALESCE` ของชื่อสามตัว ขณะที่ชนิดยังหาด้วยการเดินของ guard · **รูปที่รีวิวเจอเมื่อ 27 ต.ค. 2569 เขียนให้รันได้** (#115) — ทั้งสองคอลัมน์เป็น `varchar` ที่ว่างได้ ฉะนั้นหลักสูตรที่ไม่มีชื่อจะยืมชื่อของภาควิชาที่ใช้รหัสเดียวกัน | `backend/test/shell.test.js` แถว *keeps the code where the tier the walk stopped at has no name* — ตัวเดียวในแฟ้มนี้ที่พิสูจน์ที่ seam ของ HTTP |

ตัวที่สามเล็งที่**จุดเรียก** ไม่ใช่ที่ `scopeLabel.js` เพราะถ้อยคำที่ถูกแยกออกมาเป็นโมดูลไม่เสีย
การพิสูจน์อะไรเลยถ้ามัตแตนต์อยู่ที่จุดเรียก (#104) และตัวที่อยู่ในโมดูลนั้นเป็นของ #90 กับ #215
ซึ่งฆ่าแถวของใบอื่นด้วย

## วิธีรัน

    python mutation/231-the-picker-names-the-scope.py save
    python mutation/231-the-picker-names-the-scope.py <mutant>
    python mutation/231-the-picker-names-the-scope.py restore
    cd e2e && npx playwright test tests/231a
    cd backend && node --test "test/shell.test.js"   # เฉพาะ nameofanothertier
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'accounts': 'backend/auth/accounts.js',
    'picker': 'frontend/src/components/RoleDropdown.js',
}

# The anchor is the code the mutant breaks and never the comment beside it
# (#121, #123).

RESOLVED_NAME = """            CASE WHEN p.program_id IS NOT NULL THEN p.program_name_th
                 WHEN d.department_id IS NOT NULL THEN d.department_name_th
                 WHEN f.faculty_id IS NOT NULL THEN f.faculty_name_th
                 END AS scope_name,
"""
NO_NAME = """            NULL AS scope_name,
"""
FIRST_NAMED_TIER = """            COALESCE(p.program_name_th, d.department_name_th, f.faculty_name_th) AS scope_name,
"""

WORN = """        {label(worn)}
"""
POINTER = """        {label(acting)}
"""

CODED_IMPORT = """import { scopeCoded } from './users/scopeLabel'
"""
LABELLED_IMPORT = """import { scopeLabel } from './users/scopeLabel'
"""
CODED_CALL = """      ? scopeCoded({
"""
LABELLED_CALL = """      ? scopeLabel({
"""

MUTANTS = {
    # The server half as it stood before the fix, made to run (#115).
    'namelessresolver': [
        ('accounts', RESOLVED_NAME, NO_NAME),
    ],
    # The half the ticket did not report: the trigger drew the pointer, which
    # carries no name on either side of the wire.
    'triggerreadsthepointer': [
        ('picker', WORN, POINTER),
    ],
    # The wording the owner was offered and did not choose, made to run (#48).
    # Two edits because the import would otherwise be an unused binding, which
    # `CI=true` compiles as an error - a mutant that stops the application
    # rather than one that fails a row (#101).
    'kindwordinfront': [
        ('picker', CODED_IMPORT, LABELLED_IMPORT),
        ('picker', CODED_CALL, LABELLED_CALL),
    ],
    # The shape review found on 27 October 2569: the name resolved by the first
    # tier that has one while the kind is resolved by the walk. The diagnosed
    # code made to run (#115), and the only mutant here proved at the HTTP seam.
    'nameofanothertier': [
        ('accounts', RESOLVED_NAME, FIRST_NAMED_TIER),
    ],
}

main(FILES, MUTANTS)
