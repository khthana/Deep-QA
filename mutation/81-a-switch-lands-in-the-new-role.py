# -*- coding: utf-8 -*-
"""#81 — การกลายพันธุ์ที่พิสูจน์ว่าแถวของ `81a` วัดอะไร

หนึ่งข้ออ้าง จึงหนึ่งตัว: `RoleDropdown.choose` พาไปหน้าแรกของบทบาทที่เพิ่งสวม
ตัวกลายพันธุ์ `staysput` ถอด `navigate(...)` ออกทั้งบรรทัด ซึ่งคือโค้ดก่อน #81
พอดี — เมนูยังเปลี่ยน ปุ่มยังเปลี่ยนป้าย ที่อยู่ค้างอยู่ที่เดิม

## ทำไมไม่ใช่ตัวที่เปลี่ยน `landingPath(...)` เป็นค่าคงที่

เคยคิดจะกลายพันธุ์เป็น `navigate('/main')` ซึ่งเป็นข้อเสนอที่สองของตั๋ว แต่ #48
บอกว่าตัวที่ควรเขียนเมื่อข้อเสนอถูกปฏิเสธคือข้อเสนอนั้นเองทำให้รันได้ ซึ่งที่นี่
**แถว 2 ของ `81a` เป็นตัวจับมันอยู่แล้ว** — แถวนั้นสลับออกแล้วสลับกลับ แล้ว assert
ว่าปลายทางสองครั้งไม่เหมือนกัน ที่อยู่คงที่ใด ๆ จึงตายที่แถวนั้นโดยไม่ต้องมีตัว
กลายพันธุ์ใบที่สอง (ดูเลขที่วัดได้ในหัวข้อถัดไป)

## ที่ตัวนี้ฆ่า และที่ตั้งใจให้รอด

`staysput` ต้องฆ่า **ทั้งสองแถว** ของ `81a` และต้องปล่อยแถวอื่นของ `10a` ยืนอยู่ —
`10a` แถว 3 เป็นเรื่องป้ายบนปุ่มกับ `acting` ที่ server ตอบ ซึ่งไม่ได้พูดถึงที่อยู่
และแถว 4 ตั้งแต่ #81 เปิด `/main/course-in-program` ด้วย `goto` เอง ไม่ได้อาศัย
ว่าการสลับทิ้งที่อยู่ไว้ที่เดิมอีกแล้ว (ก่อน #81 มันใช้ `page.reload()` และผ่าน
*เพราะ*ข้อบกพร่องนี้ — เขียนไว้บนแถวนั้นแล้ว)

## การกวาดร่วมกับ `10`

`FILES` ชี้ `RoleDropdown.js` ซึ่ง `mutation/10-application-shell.py` ก็ถืออยู่
(`stalelabel`) — **ห้ามกวาดพร้อมกัน** (#125) แฟ้มรับผลคือ
`docs/acceptance/10-application-shell.md`

## คำสั่ง

    python mutation/81-a-switch-lands-in-the-new-role.py save
    python mutation/81-a-switch-lands-in-the-new-role.py staysput
    cd e2e && E2E_BACKEND_PORT=3110 E2E_FRONTEND_PORT=5300 npx playwright test 81a-a-switch --reporter=line
    python mutation/81-a-switch-lands-in-the-new-role.py restore
"""

from harness import main

FILES = {
    'dropdown': 'frontend/src/components/RoleDropdown.js',
}

MUTANTS = {
    # โค้ดก่อน #81: สลับหมวกแล้วไม่พาไปไหน anchor อยู่บนบรรทัดที่ navigate ถูก
    # เรียก ไม่ใช่บนคอมเมนต์ข้างมัน (#123) — คอมเมนต์เหนือมันอธิบาย `replace`
    # กับ `?? '/main'` และจะอยู่ต่อโดยไม่มีอะไรให้อธิบาย ซึ่งทำให้ตัวนี้อ่านง่าย
    # กว่าการลบทั้งย่อหน้า
    'staysput': (
        'dropdown',
        "      navigate(landingPath(next.acting.role_id) ?? '/main', { replace: true })\n",
        '',
    ),
}

main(FILES, MUTANTS)
