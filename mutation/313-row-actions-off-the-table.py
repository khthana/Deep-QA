# -*- coding: utf-8 -*-
"""#313 ปุ่มต่อรายการที่อยู่นอกตารางเป็น `RowAction` — แผงกลุ่มเรียน และการนำนักศึกษาออกจากกลุ่ม

    python mutation/313-row-actions-off-the-table.py save
    python mutation/313-row-actions-off-the-table.py <mutant>
    python mutation/313-row-actions-off-the-table.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/271a-action-icons.spec.js` (row 17) และ `e2e/tests/273a-teacher-row-actions.spec.js`
(row 15) ใบ `docs/acceptance/271-action-icons.md` และ `docs/acceptance/273-teacher-row-actions.md`

    cd e2e && npx playwright test tests/271a-action-icons.spec.js tests/273a-teacher-row-actions.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

หนึ่งตัวต่อที่ (#125) ในรูปของ `273`: `title=""` กับ `RowAction` ที่เดียว — ปุ่มเดิมทั้งสี่ไม่มี tooltip
(ปุ่มคำสามปุ่มของแผงวาดคำบนหน้าปุ่มแทน และกากบาทเทามีแต่ `aria-label`) ซึ่งเป็นครึ่งที่ `isAnIcon` และ
`isARowAction` อ่านได้โดยไม่ต้องวาดปุ่มเดิมกลับทั้งปุ่ม (#115) · สามตัวของแผงแยกกัน เพราะ row 17 อ่านสามปุ่ม
เรียงกัน และแถวรายงานเฉพาะ assertion แรกที่ตาย (#88)

ไอคอนของ `assign` (คนกับบวก กรอบน้ำเงิน) เป็นหน้าตา ไม่มีมัตแตนต์ — แถวเดินของใบ 271 (แถว 18)

ชื่อขึ้นต้นด้วย `s313` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185)

## ตารางคำทำนาย (เขียนก่อนกวาด 27 พ.ย. 2569 และ commit ก่อนการรัน)

ยังไม่ได้รัน — รอรอบ e2e รวม #336 ตามที่เจ้าของงานขอ

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s313rename` | `271a` *row 17* | *its tooltip is the word* ที่ปุ่มแรก | `271a` แถวอื่น · `273a` ทั้งหมด |
| `s313assign` | `271a` *row 17* | *its tooltip is the word* ที่ปุ่มที่สอง | เดียวกัน |
| `s313remove` | `271a` *row 17* | *its tooltip is the word* ที่ปุ่มที่สาม | เดียวกัน · `23a` ที่กด *ลบกลุ่มเรียน* ผ่านชื่อ ไม่อ่าน tooltip |
| `s313member` | `273a` *row 15* | *its tooltip is its whole name* | `273a` แถวอื่น · `271a` ทั้งหมด · `26a` ที่กดผ่านชื่อ |

มัตแตนต์ของ `RowAction` เอง (`271:wordsdrawn` `271:notitle` `271:noicon`) ควรฆ่าสองแถวใหม่นี้เพิ่มด้วย — ข้ออ้างว่าทางเข้าของ
แต่ละที่มาถึงคอมโพเนนต์ (#191) · ทำนาย: `wordsdrawn` `notitle` `noicon` ฆ่า `271a` 11 แถว (สิบเดิมกับ row 17)
และ `273a` row 15 เพิ่ม — ทั้งสองที่ไม่ได้ส่ง `title` เอง `notitle` จึงทิ้ง tooltip ของมัน · `reasonlost` ไม่ฆ่าทั้งสองแถว
เพราะไม่มีปุ่มไหนในสองที่นี้ส่ง `title`

คำทำนายข้างบนนับเฉพาะสองแถวที่ใบนี้เพิ่ม ไม่ใช่ยอดฆ่าทั้งหมดของสามตัวนั้น — `273a` แถว 1–10 ตายอยู่แล้วตั้งแต่ #273
และตารางผู้ใช้ที่ #312 คืนสู่ `RowAction` (`6bcf355`) เพิ่มแถวของ `302a` ที่อ่าน tooltip และไอคอนของแก้ไขกับลบ ซึ่งบันทึก
*การกวาดของ #302* ใน `mutation/271-action-icons.py` (23 พ.ย. 2569) ยังบอกว่าจอนั้นไม่ใช้ `RowAction` — บันทึกนั้นถูกในวันของมัน
(#54) · ยอดรวมที่ #336 ต้องทำนายก่อนกวาดคือทุกที่ที่เรียก `<RowAction` ไม่ใช่สองแถวนี้

## กวาดซ้ำใน #336 (27–28 พ.ย. 2569)

ทีละตัวด้วยสคริปต์กวาดของรอบนั้น ทุกตัวผ่านด่าน *ต้นไม้เปลี่ยนหลังใส่* (#268) และ `restore` ก่อนตัวถัดไป · baseline คือชุดเต็มที่ `3d4b95e` · ตัวที่ตารางของแฟ้มนี้ทำนายไว้ ตายที่ข้อยืนยันที่ทำนาย เว้นที่เขียนกำกับ

| ชื่อ | spec | ผล | ตายที่ |
|---|---|---|---|
| `s313rename` | `271a` `273a` `23a` | 1 ล้ม 27 ผ่าน | `271a` *row 17: กลุ่มเรียน of an Offering - แก้ไขเลข, กำหนดผู้สอน and ลบ* บรรทัด 57 |
| `s313assign` | `271a` `273a` `23a` | 1 ล้ม 27 ผ่าน | `271a` *row 17: กลุ่มเรียน of an Offering - แก้ไขเลข, กำหนดผู้สอน and ลบ* บรรทัด 57 |
| `s313remove` | `271a` `273a` `23a` | 1 ล้ม 27 ผ่าน | `271a` *row 17: กลุ่มเรียน of an Offering - แก้ไขเลข, กำหนดผู้สอน and ลบ* บรรทัด 57 |
| `s313member` | `271a` `273a` | 1 ล้ม 21 ผ่าน | `273a` *row 15: กลุ่มงานนักศึกษา - นำ … ออกจาก a group* บรรทัด 54 |
"""

from harness import main

FILES = {
    'sections': 'frontend/src/components/offerings/SectionsPanel.js',
    'groups': 'frontend/src/pages/StudentGroups.js',
}

MUTANTS = {
    # row 17: แก้ไขเลขกลุ่มเรียน has no tooltip again
    's313rename': ('sections',
        '                  label="แก้ไขเลขกลุ่มเรียน"\n',
        '                  label="แก้ไขเลขกลุ่มเรียน"\n                  title=""\n'),
    # row 17: กำหนดผู้สอน has no tooltip again
    's313assign': ('sections',
        '                  label="กำหนดผู้สอน"\n',
        '                  label="กำหนดผู้สอน"\n                  title=""\n'),
    # row 17: ลบกลุ่มเรียน has no tooltip again
    's313remove': ('sections',
        '                  label="ลบกลุ่มเรียน"\n',
        '                  label="ลบกลุ่มเรียน"\n                  title=""\n'),
    # 273a row 15: taking a member out has no tooltip again, as the grey cross had none
    's313member': ('groups',
        '                          label={`นำ ${member.student_id} ออกจาก ${group.group_name}`}\n',
        '                          label={`นำ ${member.student_id} ออกจาก ${group.group_name}`}\n                          title=""\n'),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
