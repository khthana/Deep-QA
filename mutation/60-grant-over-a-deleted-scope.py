# -*- coding: utf-8 -*-
"""#60 — สิทธิ์ที่เหลือค้างอยู่เหนือหลักสูตรที่ถูกลบไปแล้ว

`user_roles.scope_id` เป็นขอบเขตที่เป็นคณะ ภาควิชา หรือหลักสูตร อย่างใดอย่างหนึ่ง โดยถูกตัดสินจาก
บทบาท (ADR-0001, ADR-0002) จึงเป็น**การอ้างอิงเดียวที่เป็น foreign key ไม่ได้** ไม่มีข้อบังคับไหน
ยก `23503` ขึ้นมา `lib/removal` จึงลบระเบียนทิ้งจริง และสิทธิ์นั้นค้างอยู่โดยชี้ไปที่ระเบียนที่
ไม่มีตารางไหนถืออยู่

## ข้อตัดสิน และทางที่ไม่ได้เลือก

ตั๋วเสนอสามทาง — นับสิทธิ์เป็นการอ้างอิง · ถอนสิทธิ์ไปพร้อมกับระเบียน · ปฏิเสธการลบโดยบอกว่าใครถือ
**เลือกทางแรก** และใช้ที่ทั้งสอง route โดย *คำตอบ* ของแต่ละ route ยังเป็นคำตอบเดิมที่มันตอบการอ้างอิง
มาตลอด: หลักสูตรปิดการใช้งาน ภาควิชาปฏิเสธ — สองอย่างนี้ต่างกันมาตั้งแต่ #14 กับ #15 และการทำให้
เหมือนกันคือการเปลี่ยนสิ่งที่หน้าจอบอกว่าเกิดอะไรขึ้น `docs/06` §Out of Scope จึงทำให้มันเป็นคำถาม
ไม่ใช่การแก้ ถามไว้ที่ตั๋ว ยังไม่มีตั๋วใหม่ และประโยคบนโค้ดก็ไม่ใช่ตั๋ว (#119)

ทางที่สามถูกปฏิเสธด้วยเหตุผลที่เขียนอยู่ในไฟล์ที่ตั๋วเสนอให้แก้ — หัวของ `auth/refusals.js` เขียนว่า
คำปฏิเสธ *ไม่เอ่ยชื่อผู้ใช้อื่นนอกจากผู้เรียก ไม่เอ่ยตาราง คอลัมน์ หรือรหัส* การบอกว่าใครถือสิทธิ์
จึงขัดกับกฎที่ปิดไปแล้วในไฟล์นั้นเอง (#48) คำปฏิเสธใหม่จึงบอกสิ่งที่ต้องทำต่อ ไม่บอกว่าใคร

ทางที่สองถูกเอามารันเป็นมัตแตนต์ ตามกติกาของ #48 ที่ว่าทางที่ไม่ได้เลือกเป็นเพียงประโยคบนกระดาษ
จนกว่าจะมีมัตแตนต์ทำให้ชุดทดสอบถือมันไว้ (`grantsrevokedwiththeprogramme`)

## ครึ่งที่สองของเกณฑ์ และทำไมมันต้องถามตาราง

เกณฑ์ข้อสองเขียนว่า *หลังลบหลักสูตรแล้ว ต้องไม่มีแถวใน `user_roles` ที่ชี้ `scope_id` ซึ่งไม่มีตารางไหนถือ*
การถอนสิทธิ์ใน `routes/grants` ไม่ได้ลบแถว — มันปิด `is_active` เพื่อให้บันทึกว่าใครให้สิทธิ์นั้นอยู่รอด
แถวที่ถอนแล้วจึงยังชี้ขอบเขตนั้นอยู่ตลอดไป ถ้านับแถวที่ปิดแล้วเป็นการอ้างอิงด้วย หลักสูตรจะลบไม่ได้อีก
ตลอดกาลตั้งแต่มีคนได้รับสิทธิ์คนแรก ซึ่งเป็นราคาที่ตั๋วเองเตือนไว้ ถ้าไม่นับ แถวนั้นก็ค้าง
`forgetRevokedGrants` จึงลบแถวที่ปิดแล้วไปในเส้นทางที่ทำลายระเบียนเท่านั้น — และเป็นแถวที่**ไม่มีใครอ่าน**
ผู้อ่าน `user_roles` ทั้งห้าแห่งกรอง `ur.is_active` ทั้งหมด

ข้อนี้ไม่มี route ไหนตอบได้ ชุดทดสอบจึงถาม `api.pool` ตรง ๆ ซึ่งเป็น seam เดียวที่อ่านมันได้

## การกวาด

```
python mutation/60-grant-over-a-deleted-scope.py save
python mutation/60-grant-over-a-deleted-scope.py list
python mutation/60-grant-over-a-deleted-scope.py programgrantisnotareference

cd backend && node --test test/programs.test.js test/departments.test.js

python mutation/60-grant-over-a-deleted-scope.py restore
```

**ห้ามกวาด `60` พร้อมกับ `56` หรือ `58`** — สำมะโนของ `README.md` ตอบว่าเพื่อนบ้านของ `60` มีสองใบนี้
ไม่ใช่ `102` ซึ่งเป็นสิ่งที่ร่างแรกของบรรทัดนี้เดาไว้จากชื่อเรื่อง ไม่ใช่จาก `FILES`:
`backend/routes/departments.js` ใช้ร่วมกันสามใบ (`56` `58` `60`) และ
`backend/routes/programs.js` ใช้ร่วมกันสองใบ (`58` `60`) `restore` ของใบหนึ่งจะเขียนทับมัตแตนต์
ของอีกใบ ดู `README.md` หัวข้อสำมะโน path ที่ชนกัน

วัดเมื่อ 30 ก.ย. 2569 กับ backend 802 แถว

| มัตแตนต์ | สิ่งที่มันทำ | แถวที่ตาย |
|---|---|---|
| `programgrantisnotareference` | เอา `blocked` ออก หลักสูตรที่มีคนถือสิทธิ์จึงถูกลบจริง ซึ่งคือรูปก่อน #60 | `programs.test.js` — *a programme somebody manages is deactivated instead of deleted* |
| `departmentgrantisnotareference` | เอาด่านสิทธิ์ออกจาก route ของภาควิชา ซึ่งคือรูปก่อน #60 ที่อีกไฟล์ #125 | `departments.test.js` — *a department somebody administers is refused, not deleted* |
| `revokedgrantsurvivesitsprogramme` | ไม่ลบแถวที่ถอนแล้ว แถวจึงค้างชี้หลักสูตรที่หายไป | `programs.test.js` — แถวเดียวกัน ที่ assertion ของ `user_roles` |
| `revokedgrantsurvivesitsdepartment` | ข้อเดียวกันที่ภาควิชา คนละไฟล์ คนละที่ตัดสิน | `departments.test.js` — แถวเดียวกัน ที่ assertion ของ `user_roles` |
| `anygrantevercountsasareference` | นับแถวที่ถอนแล้วเป็นการอ้างอิงด้วย หลักสูตรและภาควิชาจึงลบไม่ได้อีกตลอดกาล | ทั้งสองไฟล์ ที่ 204 บรรทัดสุดท้าย |
| `grantsrevokedwiththeprogramme` | ทางที่สองของตั๋ว เอามารัน: ลบสิทธิ์ทั้งหมดไปพร้อมหลักสูตรแทนที่จะปิดการใช้งาน | `programs.test.js` — แถวเดียวกัน ที่ 200 |

`anygrantevercountsasareference` อยู่ใน `lib/scopeGrants.js` ซึ่งเป็นโค้ดที่ทั้งสอง route ใช้ร่วมกัน
ใบนี้จึงเป็น *หนึ่งในที่ที่มันฆ่า* ไม่ใช่รายการทั้งหมด ตามกติกาของ #123
"""
from harness import main

FILES = {
    'programs': 'backend/routes/programs.js',
    'departments': 'backend/routes/departments.js',
    'grants': 'backend/lib/scopeGrants.js',
}

MUTANTS = {
    # รูปก่อน #60 ที่ route ของหลักสูตร: สิทธิ์ไม่ใช่การอ้างอิง
    'programgrantisnotareference': ('programs',
        "        blocked: (client) => isGranted(client, existing.program_id),\n"
        "        remove: async (client) => {",
        "        remove: async (client) => {"),
    # รูปก่อน #60 ที่ route ของภาควิชา ซึ่งเป็นการตัดสินใจคนละที่ตามกติกาของ #125
    'departmentgrantisnotareference': ('departments',
        "          if (await isGranted(client, existing.department_id)) {\n"
        "            await client.query('ROLLBACK');\n"
        "            return res.status(409).json({ message: REFUSALS.departmentGranted });\n"
        "          }\n",
        ""),
    # แถวที่ถอนแล้วรอดจากหลักสูตรของมัน จึงชี้ระเบียนที่ไม่มีอยู่
    'revokedgrantsurvivesitsprogramme': ('programs',
        "          await forgetRevokedGrants(client, existing.program_id);\n",
        ""),
    # ข้อเดียวกันที่ภาควิชา
    'revokedgrantsurvivesitsdepartment': ('departments',
        "          await forgetRevokedGrants(client, existing.department_id);\n",
        ""),
    # นับทุกแถวไม่ว่าจะถอนแล้วหรือไม่ ซึ่งคือราคาที่ตั๋วเตือนไว้ ทำให้ลบไม่ได้ตลอดกาล
    'anygrantevercountsasareference': ('grants',
        "    'SELECT 1 FROM user_roles WHERE scope_id = $1 AND is_active LIMIT 1',",
        "    'SELECT 1 FROM user_roles WHERE scope_id = $1 LIMIT 1',"),
    # ทางที่สองของตั๋ว เอามารันตามกติกาของ #48
    'grantsrevokedwiththeprogramme': ('programs',
        "        blocked: (client) => isGranted(client, existing.program_id),\n"
        "        remove: async (client) => {\n"
        "          await forgetRevokedGrants(client, existing.program_id);",
        "        remove: async (client) => {\n"
        "          await client.query('DELETE FROM user_roles WHERE scope_id = $1', [\n"
        "            existing.program_id,\n"
        "          ]);"),
}

main(FILES, MUTANTS)
