# -*- coding: utf-8 -*-
"""
#130 ปุ่มยกเลิกบทบาทบนสิทธิ์ของตัวเอง - the control that could not succeed.

Four mutants, and #84 one screen over is the file to read beside this one: the
same shape, on the button in the accounts list, decided the same way. What
kept the two apart for six weeks is in #130's own table - no browser row
presses the suspend button on its own row, while three pressed this one, and
they pressed it to *obtain its refusal* rather than to revoke anything. So
taking the button away was never one line: it meant finding those rows another
refusal, which is `U_CROSS` in `db/seed.js` and the reason that account exists.

The condition is not per row. `backend/routes/grants.js` refuses on the account
in the path and never reads the grant, so if the panel is about the reader then
every row of it is dead - `isSelf` is computed once, from the shell's profile,
and a per-row version would be a rule the route does not have.

    python mutation/130-own-grant-controls.py save
    python mutation/130-own-grant-controls.py <mutant>
    python mutation/130-own-grant-controls.py restore

Killing them, measured 20 September 2569:

    cd e2e && npx playwright test 12a 111a 121a

    alwaysenabled          1 - 12a "the button on your own grant is dead"
    everyrowisdead         3 - 12a "another account keeps the buttons it always
                               had", 111a row 3, and 121a's one row
    titledrifts            1 - 12a "the button on your own grant is dead"
    selfrowhidesthebutton  1 - 12a "the button on your own grant is dead"

`everyrowisdead` is the one to read twice. `12a`'s control row was written to
fail it - without that row, killing every button in the column passes every
claim this ticket makes - but the count is 3 rather than 1 because `111a` and
`121a` press the button on somebody else's row to obtain their refusal. A sweep
of `12a` alone reports 1, which is a lower bound: **when a mutant lives in
shared code, this sheet is one of the places it kills, not the list** (#123).

**ไฟล์ที่ใช้ร่วมกับใบอื่น** `frontend/src/components/users/GrantsPanel.js` อยู่ใน
`121-grants-notice.py` ด้วย - อย่ากวาดพร้อมกัน และ `save` ก่อนเริ่มทุกครั้ง

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือตารางมัตแตนต์ของ `docs/acceptance/12-role-grants.md` (บรรทัด 297–300) กับของ `docs/acceptance/11-user-accounts.md` (บรรทัด 840–842) ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `alwaysenabled` | `disabled={busy}` — ปุ่มกลับมากดได้ทุกแถวรวมแถวของบัญชีตัวเอง คือสภาพก่อน #130 และเป็นสภาพที่ `12a` แถว 6 เคยกดเพื่อเอาคำปฏิเสธมา | **1** — `12a` *the button on your own grant is dead* ที่ `toBeDisabled` · และ `84a` แถว 1 |
| `everyrowisdead` | `disabled={true}` — ปิดทั้งคอลัมน์แทนที่จะปิดทีละแถว คือความผิดที่ง่ายกว่าและผิด | **3** — `12a` *another account keeps the buttons it always had* (แถวคุมที่เขียนขึ้นเพื่อล้มตัวนี้โดยเฉพาะ ถ้าไม่มีมัน การปิดทุกปุ่มจะผ่านทุกข้ออ้างของตั๋ว) · `111a` แถว 3 · และแถวเดียวของ `121a` · ที่ใบ `11` นับเป็น `84a` แถว 2, `11c` แถว 3, `13a` แถว 1/2/4 — **สองในสามไฟล์นั้นเป็นไฟล์ที่ตั๋วนี้ไม่มีเหตุผลจะเปิด** |
| `titledrifts` | สำเนาของประโยคเลื่อนออกจากต้นฉบับ ซึ่งเป็นสิ่งเดียวที่สำเนาทำได้และไม่มีใครเห็น — รูปเดียวกับ `84:titledrifts` เพราะ CRA ไม่ให้จอ import `backend/auth/refusals` แถวจึงเป็นที่เดียวที่สองสำเนาแยกทางกันได้ | **1** — `12a` แถวแรก ที่ `toHaveAttribute('title', …)` · และ `84a` แถว 1 |
| `selfrowhidesthebutton` | ซ่อนปุ่มแทนที่จะปิด ซึ่งทำให้คอลัมน์ของแถวตัวเองว่างเปล่าโดยไม่บอกอะไรเลย — *วาดไว้ ไม่ได้ซ่อน* เป็นการตัดสินใจของ #84 ที่ใบนี้รับมา | **1** — `12a` แถวแรก ที่ `toBeVisible` |

**#271 (11 พ.ย. 2569)** ปุ่มเป็น `<RowAction>` `selfrowhidesthebutton` เล็งใหม่ให้ห่อ `<RowAction>` ด้วย
`{!isSelf && …}` แทน `<button>` — กวาดใหม่กับ `12a`: 1 ล้ม 6 ไม่ได้รัน 3 ผ่าน ที่ `toBeVisible` ของ
*row 6: the button on your own grant is dead* เหมือนเดิม · สามตัวที่เหลือไม่ได้เล็งใหม่ FROM ของ
`alwaysenabled` กับ `everyrowisdead` (ช่องว่าง 20) ยังจับบรรทัด `disabled=` ที่ตอนนี้ลึก 22 ช่องได้
เป็น substring และบรรทัดนั้นมีที่เดียว · **`everyrowisdead` ฆ่าแถว 6 ของ `271a` ด้วย** เพราะ `named()`
ขอปุ่มที่ `:enabled` — ที่การหาปุ่ม ไม่ใช่ที่ข้ออ้าง บันทึกอยู่ที่ `mutation/271-action-icons.py`
"""

from harness import main

FILES = {
    "grants": "frontend/src/components/users/GrantsPanel.js",
}

MUTANTS = {
    # ตัวข้อบกพร่องเอง ปุ่มกลับมากดได้ทุกแถวรวมแถวของบัญชีตัวเอง ซึ่งคือสภาพก่อน #130
    # และเป็นสภาพที่ `12a` แถว 6 เคยกดเพื่อเอาคำปฏิเสธมา
    "alwaysenabled": ("grants",
        "                    disabled={busy || isSelf}\n",
        "                    disabled={busy}\n"),
    # ปิดทั้งคอลัมน์แทนที่จะปิดทั้งแผงเมื่อเป็นบัญชีของตัวเอง - วิธีที่ง่ายกว่าและผิด
    # แถวคุมของ `12a` มีไว้ล้มตัวนี้ ถ้าไม่มีมัน การปิดทุกปุ่มจะผ่านทุกข้ออ้างของตั๋วนี้
    "everyrowisdead": ("grants",
        "                    disabled={busy || isSelf}\n",
        "                    disabled={true}\n"),
    # สำเนาที่เลื่อนออกจากต้นฉบับ ซึ่งเป็นสิ่งเดียวที่สำเนาทำได้และไม่มีใครเห็น
    # รูปเดียวกับ `84:titledrifts` และด้วยเหตุผลเดียวกัน: CRA ไม่ให้จอ import
    # `backend/auth/refusals` แถวจึงเป็นที่เดียวที่สองสำเนาจะแยกทางกันได้
    "titledrifts": ("grants",
        "const CANNOT_REVOKE_SELF = 'ยกเลิกบทบาทของตัวเองไม่ได้'\n",
        "const CANNOT_REVOKE_SELF = 'ไม่สามารถยกเลิกบทบาทนี้ได้'\n"),
    # ซ่อนปุ่มแทนที่จะปิด ซึ่งทำให้คอลัมน์ของแถวตัวเองว่างเปล่าโดยไม่บอกอะไรเลย
    # *วาดไว้ ไม่ได้ซ่อน* เป็นการตัดสินใจของ #84 ที่ใบนี้รับมา และเหตุผลอยู่ที่ว่า
    # ช่องว่างไม่ได้บอกว่าทำไม ส่วนปุ่มที่ปิดอยู่พร้อม title บอก
    "selfrowhidesthebutton": [
        ("grants",
         "                    <RowAction\n"
         "                      kind=\"remove\"\n"
         "                      label=\"ยกเลิกบทบาท\"\n",
         "                    {!isSelf && <RowAction\n"
         "                      kind=\"remove\"\n"
         "                      label=\"ยกเลิกบทบาท\"\n"),
        ("grants",
         "                    />\n"
         "                  </RowActions>\n",
         "                    />}\n"
         "                  </RowActions>\n"),
    ],
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
