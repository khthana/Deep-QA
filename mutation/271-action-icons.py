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

## การกวาด — บันทึกผล (11 พ.ย. 2569)

สองรอบ เพราะรอบแรกถูกหยุดกลางทางเมื่อเครื่องใกล้หมดหน่วยความจำ (ขณะรัน `139:departmentsremovekeepsask`
ซึ่งยังติดอยู่ในต้นไม้ ถูก `restore` แล้วอ่าน `git status` ว่าสะอาดก่อนรอบสอง) ทุกตัวผ่านด่าน *ต้นไม้สกปรกหลังใส่*
ก่อนรัน และสะอาดหลัง `restore` ไม่มีตัวไหนผิดคำทำนาย — ทั้งจำนวนและข้อยืนยันที่ตาย

| ชื่อ | spec | ผล | ตายที่ |
|---|---|---|---|
| baseline (รอบแรก ที่ `0c81f5c`) | `271a` `12a` `84a` | 24 ผ่าน | — |
| `wordsdrawn` | เดียวกัน | 11 ล้ม 13 ผ่าน | `271a` แถว 1–11 ที่ *the word is not drawn* |
| `notitle` | เดียวกัน | 11 ล้ม 13 ผ่าน | `271a` แถว 1–11 ที่ *its tooltip is the word* |
| `noicon` | เดียวกัน | 11 ล้ม 13 ผ่าน | `271a` แถว 1–11 ที่ *it holds one icon* |
| `reasonlost` | เดียวกัน | 2 ล้ม 6 ไม่ได้รัน 16 ผ่าน | `12a` *row 6: the button on your own grant is dead* กับ `84a` *the signed-in administrator cannot press ระงับ on their own row* ทั้งคู่ที่ `toHaveAttribute` · หกแถวที่ไม่ได้รันคือแถวของ `12a` ที่ตามหลังใน `serial` (#67) |
| baseline (รอบสอง ที่ `ae729ec` หลังแก้สีตอนชี้) | `271a` | 11 ผ่าน | — |
| `86:alwaysofferrestore` | `271a` | 1 ล้ม 10 ผ่าน | แถว 5 ที่ *a button named ระงับ* — การจัดฉาก ไม่ใช่ข้ออ้าง (#266) |
| `86:alwaysoffersuspend` | `271a` | 11 ผ่าน | — |
| `130:everyrowisdead` | `271a` | 1 ล้ม 10 ผ่าน | แถว 6 ที่ *a button named ยกเลิกบทบาท* — การจัดฉาก |

บันทึกของมัตแตนต์ที่ re-aim (`86` สองตัว `130` หนึ่งตัว `139` แปดตัว) อยู่ในใบของมันเอง
## การกวาดของ #302 (23 พ.ย. 2569)

จอผู้ใช้งานไม่ใช้ `RowAction` แล้ว และแถว 5 ของ `271a` ถอนไป · `wordsdrawn` `notitle` `noicon` ฆ่า `271a` 10 ต่อตัว (ไม่ใช่ 11)
และไม่ฆ่า `302a` · `reasonlost` ฆ่าเพียง `12a` แถว 6 (ไม่ใช่ 2 เพราะ `title` ของสวิตช์ใน `84a` ไม่ได้มาจาก `RowAction`) —
ตรงคำทำนายใน `mutation/302-the-users-table-as-delivered.py`

## คำทำนายของการกวาดซ้ำใน #336 (27 พ.ย. 2569, เขียนก่อนรัน)

#312 คืนจอผู้ใช้งานให้ `RowAction` (ไอคอนแก้ไขส่ง `title` เป็นชื่อคน) และ #313 เพิ่ม `271a` แถว 17 (ปุ่มของการ์ดกลุ่มเรียน
ใน `SectionsPanel`) · `273a` ไม่เคยอยู่ในการกวาดของสามตัวนี้ ทั้ง 11 แถวอ่านด้วย `isARowAction` ซึ่งถามสามข้อเดียวกัน
(tooltip · ไม่มีคำ · ไอคอนเดียว) · ผู้เรียกที่ส่ง `title` เองมีสองแฟ้มคือ `Users.js` กับ `GrantsPanel.js` · spec `271a` `273a` `302a`

| ชื่อ | ทำนาย | ตายที่ |
|---|---|---|
| `wordsdrawn` | **23** ล้ม | `271a` แถว 1–4, 6–11, 17 ที่ *the word is not drawn* · `273a` ทั้ง 11 แถวที่ *no word is drawn* · `302a` แถว 6 ที่ *no word drawn beside it* |
| `notitle` | **22** ล้ม | `271a` 11 แถวเดียวกันที่ *its tooltip is the word* · `273a` ทั้ง 11 ที่ *its tooltip is its whole name* · `302a` แถว 6 **รอด** เพราะ `Users.js` ส่ง `title` เอง |
| `noicon` | **23** ล้ม | ที่ *it holds one icon* ทุกแถวเดียวกับ `wordsdrawn` |


## กวาดซ้ำใน #336 (27–28 พ.ย. 2569)

ทีละตัวด้วยสคริปต์กวาดของรอบนั้น ทุกตัวผ่านด่าน *ต้นไม้เปลี่ยนหลังใส่* (#268) และ `restore` ก่อนตัวถัดไป · baseline คือชุดเต็มที่ `3d4b95e` · ตัวที่ตารางของแฟ้มนี้ทำนายไว้ ตายที่ข้อยืนยันที่ทำนาย เว้นที่เขียนกำกับ

| ชื่อ | spec | ผล | ตายที่ |
|---|---|---|---|
| `wordsdrawn` | `271a` `273a` `302a` | 23 ล้ม 5 ผ่าน | `271a` *row 1: ข้อมูลภาควิชา - แก้ไข and ลบ* บรรทัด 58 · `271a` *row 2: ข้อมูลหลักสูตร - แก้ไข and ลบ* บรรทัด 58 · `271a` *row 3: ข้อมูลรายวิชา - แก้ไข and ลบ* บรรทัด 58 · `271a` *row 4: รายวิชาในหลักสูตร - แก้ไข and นำออก* บรรทัด 58 · `271a` *row 6: the grants cards - ยกเลิกสิทธิ์* บรรทัด 58 · `271a` *row 7: รายวิชาที่เปิดสอน - กลุ่มเรียนและผู้สอน and ยกเลิกการเปิด* บรรทัด 58 · `271a` *row 8: ผลการเรียนรู้ของหลักสูตร - แก้ไข and ลบ* บรรทัด 58 · `271a` *row 9: Rubric กลาง - แก้ไข and ลบ* บรรทัด 58 · `271a` *row 10: เกณฑ์ของ Rubric - แก้ไข and ลบ* บรรทัด 58 · `271a` *row 11: นักศึกษาในกลุ่มเรียน - นำออก* บรรทัด 58 · `271a` *row 17: กลุ่มเรียน of an Offering - แก้ไขเลข, กำหนดผู้สอน and ลบ* บรรทัด 58 · `273a` *row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ* บรรทัด 55 · `273a` *row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ* บรรทัด 55 · `273a` *row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ* บรรทัด 55 · `273a` *row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่* บรรทัด 55 · `273a` *row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ* บรรทัด 55 · `273a` *row 6: สัดส่วนคะแนน - ลบหมวดคะแนนที่* บรรทัด 55 · `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* บรรทัด 55 · `273a` *row 8: the activity form - นำผลการเรียนรู้แถวที่ … ออก* บรรทัด 55 · `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* บรรทัด 55 · `273a` *row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry* บรรทัด 55 · `273a` *row 15: กลุ่มงานนักศึกษา - นำ … ออกจาก a group* บรรทัด 55 · `302a` *row 6: แก้ไข is an icon named for the account, with the name as its to* บรรทัด 179 |
| `notitle` | `271a` `273a` `302a` | 23 ล้ม 5 ผ่าน | `271a` *row 1: ข้อมูลภาควิชา - แก้ไข and ลบ* บรรทัด 57 · `271a` *row 2: ข้อมูลหลักสูตร - แก้ไข and ลบ* บรรทัด 57 · `271a` *row 3: ข้อมูลรายวิชา - แก้ไข and ลบ* บรรทัด 57 · `271a` *row 4: รายวิชาในหลักสูตร - แก้ไข and นำออก* บรรทัด 57 · `271a` *row 6: the grants cards - ยกเลิกสิทธิ์* บรรทัด 57 · `271a` *row 7: รายวิชาที่เปิดสอน - กลุ่มเรียนและผู้สอน and ยกเลิกการเปิด* บรรทัด 57 · `271a` *row 8: ผลการเรียนรู้ของหลักสูตร - แก้ไข and ลบ* บรรทัด 57 · `271a` *row 9: Rubric กลาง - แก้ไข and ลบ* บรรทัด 57 · `271a` *row 10: เกณฑ์ของ Rubric - แก้ไข and ลบ* บรรทัด 57 · `271a` *row 11: นักศึกษาในกลุ่มเรียน - นำออก* บรรทัด 57 · `271a` *row 17: กลุ่มเรียน of an Offering - แก้ไขเลข, กำหนดผู้สอน and ลบ* บรรทัด 57 · `273a` *row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ* บรรทัด 54 · `273a` *row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ* บรรทัด 54 · `273a` *row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ* บรรทัด 54 · `273a` *row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่* บรรทัด 54 · `273a` *row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ* บรรทัด 54 · `273a` *row 6: สัดส่วนคะแนน - ลบหมวดคะแนนที่* บรรทัด 54 · `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* บรรทัด 54 · `273a` *row 8: the activity form - นำผลการเรียนรู้แถวที่ … ออก* บรรทัด 54 · `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* บรรทัด 54 · `273a` *row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry* บรรทัด 54 · `273a` *row 15: กลุ่มงานนักศึกษา - นำ … ออกจาก a group* บรรทัด 54 · `302a` *row 6: แก้ไข is an icon named for the account, with the name as its to* บรรทัด 178 · ทำนาย 22 ได้ **23** — `302a` แถว 6 ตายด้วย · เหตุผลของคำทำนายผิด: `title` ที่นับใน `Users.js` เป็นของ `RowAction` อีกตัว ไอคอนแก้ไขใช้ค่าตั้งต้น `label` (#258) |
| `noicon` | `271a` `273a` `302a` | 23 ล้ม 5 ผ่าน | `271a` *row 1: ข้อมูลภาควิชา - แก้ไข and ลบ* บรรทัด 59 · `271a` *row 2: ข้อมูลหลักสูตร - แก้ไข and ลบ* บรรทัด 59 · `271a` *row 3: ข้อมูลรายวิชา - แก้ไข and ลบ* บรรทัด 59 · `271a` *row 4: รายวิชาในหลักสูตร - แก้ไข and นำออก* บรรทัด 59 · `271a` *row 6: the grants cards - ยกเลิกสิทธิ์* บรรทัด 59 · `271a` *row 7: รายวิชาที่เปิดสอน - กลุ่มเรียนและผู้สอน and ยกเลิกการเปิด* บรรทัด 59 · `271a` *row 8: ผลการเรียนรู้ของหลักสูตร - แก้ไข and ลบ* บรรทัด 59 · `271a` *row 9: Rubric กลาง - แก้ไข and ลบ* บรรทัด 59 · `271a` *row 10: เกณฑ์ของ Rubric - แก้ไข and ลบ* บรรทัด 59 · `271a` *row 11: นักศึกษาในกลุ่มเรียน - นำออก* บรรทัด 59 · `271a` *row 17: กลุ่มเรียน of an Offering - แก้ไขเลข, กำหนดผู้สอน and ลบ* บรรทัด 59 · `273a` *row 1: ผลการเรียนรู้รายวิชา - แก้ไข and ลบ* บรรทัด 56 · `273a` *row 2: พฤติกรรมที่วัดได้ - แก้ไขข้อ and ลบข้อ* บรรทัด 56 · `273a` *row 3: เกณฑ์การประเมิน - แก้ไขข้อ and ลบข้อ* บรรทัด 56 · `273a` *row 4: แผนการสอน - แก้ไขสัปดาห์ที่ and ลบสัปดาห์ที่* บรรทัด 56 · `273a` *row 5: กลุ่มงานนักศึกษา - เปลี่ยนชื่อ and ลบ* บรรทัด 56 · `273a` *row 6: สัดส่วนคะแนน - ลบหมวดคะแนนที่* บรรทัด 56 · `273a` *row 7: กิจกรรมการเรียนรู้ - หลักฐาน, แก้ไขกิจกรรม and ลบกิจกรรม* บรรทัด 56 · `273a` *row 8: the activity form - นำผลการเรียนรู้แถวที่ … ออก* บรรทัด 56 · `273a` *row 9: หลักฐานการประเมิน - เปิดหลักฐาน, แก้ไขหลักฐาน and ลบหลักฐาน* บรรทัด 56 · `273a` *row 10: การปรับปรุงอย่างต่อเนื่อง - แก้ไข and ลบ an entry* บรรทัด 56 · `273a` *row 15: กลุ่มงานนักศึกษา - นำ … ออกจาก a group* บรรทัด 56 · `302a` *row 6: แก้ไข is an icon named for the account, with the name as its to* บรรทัด 180 |
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
