# -*- coding: utf-8 -*-
"""
#271 ปุ่มในคอลัมน์ดำเนินการเป็นไอคอน - the word moves from the face of the button
to its name and its tooltip.

Every action column in the administration and the enrolment screen now draws
`<RowAction>` (`frontend/src/components/RowAction.js`). One component behind
eleven places, so a mutant here kills every row of `271a` that reaches it, and
that is what each row adds: its own screen's way in arrives at the component
(#191). A screen still drawing its old text button would fail its row and leave
the other ten standing.

    python mutation/271-action-icons.py save
    python mutation/271-action-icons.py <mutant>
    python mutation/271-action-icons.py restore

    cd e2e && npx playwright test tests/271a-action-icons.spec.js tests/12a-role-grants.spec.js tests/84a-own-row-controls.spec.js

พอร์ตของ e2e อ่านจากย่อหน้า **Ports** ของ `e2e/README.md` ไม่ใช่จากเลขที่จดไว้ (#237)

**What is not here, on purpose.** Dropping `aria-label` is not a mutant of this
sheet: the accessible name is what `271a` - and every other spec that presses
these buttons - *locates* by, so it is the premise of those rows and not a claim
any of them reads (#85, #111). Such a mutant would stop every row that presses
a row action and prove nothing about this ticket.

## ตารางมัตแตนต์ — คำทำนาย เขียนก่อนรันตัวแรก (#255 · 11 พ.ย. 2569)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `wordsdrawn` | วาดคำไว้ข้างไอคอน - คือสภาพก่อน #271 ที่ยังมีไอคอนเพิ่มมา | **11** - `271a` ทุกแถว ที่ *the word is not drawn* ของปุ่มแรกในแถวนั้น |
| `notitle` | `title={title}` - ทิ้งค่าตั้งต้นที่เป็นคำ ปุ่มที่ผู้เรียกไม่ส่ง `title` มาจึงไม่มี tooltip | **11** - `271a` ทุกแถว ที่ *its tooltip is the word* · ไม่ฆ่า `12a` กับ `84a` เพราะสองแถวนั้นส่ง `title` มาเอง |
| `noicon` | ไม่วาดไอคอน ปุ่มเหลือแต่กรอบเปล่า | **11** - `271a` ทุกแถว ที่ *it holds one icon* (ปุ่มยังมองเห็นได้เพราะมี padding กับเส้นขอบ จึงผ่าน `toBeVisible` ก่อน) |
| `reasonlost` | `title={label}` - เขียนทับเหตุผลที่ผู้เรียกส่งมาด้วยคำ คือคำอธิบายว่าทำไมระงับบัญชีตัวเองหรือยกเลิกบทบาทของตัวเองไม่ได้หายไปจาก tooltip | **2** - `12a` *the button on your own grant is dead* ที่ `toHaveAttribute('title', …)` · `84a` *the signed-in administrator cannot press ระงับ on their own row* ที่ `title` · ไม่ฆ่า `271a` เพราะทุกแถวกดปุ่มที่เปิดอยู่ ซึ่งไม่มีใครส่ง `title` มา |

## มัตแตนต์ของใบอื่นที่ `271a` ไปถึง — คำทำนาย (11 พ.ย. 2569, ก่อนรัน)

`271a` เป็น spec ใหม่ที่กดปุ่มของจอซึ่งใบอื่นถือมัตแตนต์อยู่ จึงทำให้ยอดฆ่าของตัวที่ไม่มีใครแก้หมดอายุ
(#248, #257) รีวิวของ `0c81f5c` อ่านเจอสองตัว ซึ่งถ้าฆ่า ก็ฆ่าที่**การจัดฉาก** ไม่ใช่ที่ข้ออ้างของแถว
(#266): ตัวหาปุ่ม `named()` ไม่เจอปุ่ม ไม่ใช่ข้อยืนยันสามข้อของ `isAnIcon` ตาย ฉะนั้นมันไม่ได้เพิ่มหลักฐาน
ให้แถวไหนของใบนี้ และแถวของใบนี้ไม่อ้างมัน

| ชื่อ | ทำนายว่า `271a` ตายที่ไหน |
|---|---|
| `86:alwaysofferrestore` | **1** — แถว 5 ที่ *a button named ระงับ* (`toBeVisible`) เพราะทุกปุ่มชื่อ *เปิดใช้งาน* · `86:alwaysoffersuspend` ไม่ฆ่า เพราะแถว 5 กดปุ่มที่ชื่อ *ระงับ* อยู่แล้ว |
| `130:everyrowisdead` | **1** — แถว 6 ที่ *a button named ยกเลิกบทบาท* เพราะ `named()` ขอปุ่มที่ `:enabled` |
"""

from harness import main

FILES = {
    "action": "frontend/src/components/RowAction.js",
}

MUTANTS = {
    # สภาพก่อน #271 ที่มีไอคอนเพิ่มเข้ามา - คำยังอยู่บนหน้าปุ่ม
    "wordsdrawn": ("action",
        "      <Icon aria-hidden=\"true\" className=\"text-xl\" />\n",
        "      <Icon aria-hidden=\"true\" className=\"text-xl\" />\n"
        "      {label}\n"),
    # tooltip เป็นของผู้เรียกเท่านั้น ปุ่มที่ไม่ได้รับ title จึงไม่บอกว่าตัวเองคืออะไร
    # แก่คนที่มองเห็นไอคอนแต่จำไม่ได้ว่าถังขยะนี้คือ ลบ นำออก หรือยกเลิกการเปิด
    "notitle": ("action",
        "      title={title ?? label}\n",
        "      title={title}\n"),
    # กรอบเปล่า - ชื่อกับ tooltip ยังถูก แต่ไม่มีอะไรให้เห็น
    "noicon": ("action",
        "      <Icon aria-hidden=\"true\" className=\"text-xl\" />\n",
        ""),
    # เหตุผลของปุ่มที่ปิดอยู่ถูกเขียนทับด้วยคำ - #84 กับ #130 วาดปุ่มไว้แทนที่จะซ่อน
    # ก็เพราะ title บอกว่าทำไม
    "reasonlost": ("action",
        "      title={title ?? label}\n",
        "      title={label}\n"),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
