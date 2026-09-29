# -*- coding: utf-8 -*-
"""#58 — การแก้ข้อมูลหลักถูกบันทึกลง `user_log`

#13 ให้ระบบมีประวัติกิจกรรม แต่การเพิ่ม แก้ ปิด ลบ หรือ import ภาควิชา หลักสูตร รายวิชา และ
นักศึกษา ไม่เขียนอะไรลง `user_log` เลย ใบตรวจรับสามใบ (`14` ข้อ 2, `15` ข้อ 2, `16` ข้อ 1)
แขวนข้อนี้ไว้ตรงกันทั้งสามใบ และตรงกันด้วยว่าควรเป็นตั๋วเดียวของข้อมูลหลักทั้งหมด

มัตแตนต์หกตัวในไฟล์นี้ไม่ได้ถามว่า *มีบรรทัดไหม* — คำถามนั้นแถวจะตายด้วยการลบ `recordActivity`
ทิ้งตัวเดียวก็ได้ และเป็นข้ออ้างที่อ่อนที่สุดที่เขียนได้ ห้าในหกตัวถามว่า **บรรทัดนั้นพูดความจริงไหม**
ซึ่งเป็นสิ่งเดียวที่ทำให้บันทึกตรวจสอบเป็นบันทึกตรวจสอบ ตัวที่หกถามคนละคำถาม ดูข้ออ้างสุดท้าย

## สี่ข้ออ้างที่หกตัวนี้ถืออยู่

- **การกระทำที่ไม่เกิดขึ้น ต้องไม่มีบรรทัด** ภาควิชาที่มีอะไรอ้างอิงอยู่ ลบไม่ได้ — ฐานข้อมูล
  ตอบ 23503 และ route แปลงเป็น 409 บรรทัดที่บอกว่า *ลบภาควิชา* ตรงนั้นคือบรรทัดที่โกหกเรื่อง
  เดียวที่บันทึกตรวจสอบโกหกไม่ได้ (`refusalwritesaline`)
- **ผลลัพธ์สองอย่างคือสองรหัส** การลบหลักสูตรกับรายวิชาที่มีอะไรอ้างอิงอยู่ *กลายเป็น* การปิด
  การใช้งาน และ route ตอบ 200 พร้อม `deactivated: true` — บรรทัดที่เขียนว่า *ลบ* จะขัดกับคำตอบ
  ที่ผู้ใช้เพิ่งได้รับในคำขอเดียวกัน สองไฟล์เขียนกฎเดียวกัน จึงเป็นมัตแตนต์คนละตัวตามกติกาของ #125
  (`deactivationsaysdeleted`, `subjectdeactivationsaysdeleted`)
- **บรรทัดของการนำเข้าต้องชี้ระเบียน และต้องย้อนกลับพร้อมแถวของมัน** นี่คือคำถามที่ #13 ค้างไว้
  และใบนี้ตัดสิน: บรรทัดต่อแถว ไม่ใช่บรรทัดต่อไฟล์ มัตแตนต์สองตัวเล็งที่สองครึ่งของคำตอบนั้น
  ครึ่งแรกคือเป้าหมาย ครึ่งหลังคือ `client` ที่ทำให้บรรทัดอยู่ใน savepoint ของแถว
  (`importnamesnorecord`, `importlineoutsidethesavepoint`)
- **ข้อตัดสินของตั๋วเองต้องมีอะไรถือไว้** #58 เลือกหนึ่งบรรทัดต่อหนึ่งระเบียนแทนรูปเดิมของ #13
  ที่เขียนบรรทัดเดียวต่อหนึ่งไฟล์ ทางที่ไม่ได้เลือกจึงถูกเอามารันเป็นมัตแตนต์ ตามกติกาของ #48
  (`usersimportnamesnoaccount`)

## ทำไมทั้งหกอยู่ที่ seam ของ backend ไม่ใช่ browser seam

บรรทัดใน `user_log` เป็นผลที่เกิดในฐานข้อมูล หน้าจอเห็นมันได้ทางเดียวคือหน้าประวัติของ #13
ซึ่งเป็นอีกจอหนึ่งและอีกบทบาทหนึ่ง การพิสูจน์ที่ browser seam จึงต้องเดินสองจอเพื่อถามคำถาม
ที่ query เดียวตอบได้ ส่วนสิ่งที่ browser seam ตอบได้จริง — ป้ายภาษาไทยยี่สิบป้ายอ่านออกไหม —
เป็นเรื่องของ *การปรากฏ* จึงเป็นแถวเดินมือ ดู `docs/acceptance/13-user-activity-history.md` ข้อ 6

## การกวาด

```
python mutation/58-master-data-in-the-log.py save
python mutation/58-master-data-in-the-log.py list
python mutation/58-master-data-in-the-log.py refusalwritesaline

cd backend && node --test test/departments.test.js

python mutation/58-master-data-in-the-log.py restore
```

วัดเมื่อ 29 ก.ย. 2569 กับ backend 800 แถว ห้าตัวฆ่าแถวเดียว และอีกตัวหนึ่งฆ่าสองแถว ซึ่งเป็น
สิ่งที่วัดได้ ไม่ใช่สิ่งที่ตั้งใจ — `importlineoutsidethesavepoint` ย้ายบรรทัดออกไปนอก transaction
จึงพา *เวลาประทับร่วม* ออกไปด้วย เพราะ `now()` ของการเขียนผ่าน pool เป็น transaction ของมันเอง
สองแถวที่ตายอยู่ในไฟล์เดียวกันและพูดถึงกลไกเดียวกัน จึงเก็บไว้เป็นหนึ่งมัตแตนต์ ไม่ใช่สอง
`usersimportnamesnoaccount` ฆ่าหนึ่งแถวใน 58 แถวของ `users.test.js` ที่เหลือยืนหมด

| มัตแตนต์ | สิ่งที่มันทำ | แถวที่ตาย |
|---|---|---|
| `refusalwritesaline` | เขียนบรรทัด `DELETE_DEPARTMENT` ในทางที่ฐานข้อมูลปฏิเสธการลบ | `departments.test.js` — *a refused removal writes nothing* |
| `deactivationsaysdeleted` | การลบที่กลายเป็นการปิดการใช้งาน เขียนว่า `DELETE_PROGRAM` | `programs.test.js` — *a removal the database turns into a deactivation says so* |
| `subjectdeactivationsaysdeleted` | เหมือนกันที่รายวิชา ซึ่งเป็นไฟล์คนละไฟล์และกฎคนละที่ | `subjects.test.js` — *a removal the database turns into a deactivation says so* |
| `importnamesnorecord` | บรรทัดของการนำเข้าไม่ชี้ระเบียน กลับไปเป็นรูปก่อน #58 | `departments.test.js` — *an import writes a line per row* |
| `importlineoutsidethesavepoint` | เขียนบรรทัดผ่าน pool แทน client บรรทัดจึงรอดจากการย้อนกลับ | `departments.test.js` — *an import that is rolled back writes no lines either* **และ** *an import writes a line per row* ซึ่งเป็นแถวที่ assert เวลาประทับร่วม |
| `usersimportnamesnoaccount` | บรรทัดของการนำเข้าบัญชีไม่ชี้ระเบียน กลับไปเป็นรูปก่อน #58 | `users.test.js` — *an import writes a line per account, each naming it* |

`importnamesnorecord` ยึดอยู่บนสองบรรทัดคู่กัน ไม่ใช่บรรทัดเดียว เพราะ `onDepartment(rows[0].department_id),`
เขียนเหมือนกันเป๊ะทั้งที่ route เพิ่มและที่ import — harness ปฏิเสธมัตแตนต์ที่คลุมเครือ และ
รหัสกิจกรรมข้างบนมันคือสิ่งที่แยกสองที่ออกจากกัน

`usersimportnamesnoaccount` เป็นตัวที่หก และเป็นตัวเดียวที่ไม่ได้ถามว่าบรรทัดพูดความจริงไหม
แต่ถามว่า *ข้อตัดสิน* ของตั๋วยังถูกถือไว้ไหม — #13 เขียนบรรทัดเดียวต่อหนึ่งไฟล์และไม่ชี้ระเบียน
#58 ตัดสินเป็นหนึ่งบรรทัดต่อหนึ่งระเบียน ตัวนี้เอารูปเดิมกลับมารัน ตามกติกาของ #48 ที่ว่าทางที่
ไม่ได้เลือกเป็นเพียงประโยคบนกระดาษ จนกว่าจะมีมัตแตนต์ที่ทำให้ชุดทดสอบถือมันไว้
"""
from harness import main

FILES = {
    'departments': 'backend/routes/departments.js',
    'programs': 'backend/routes/programs.js',
    'subjects': 'backend/routes/subjects.js',
    'users': 'backend/routes/users.js',
}

MUTANTS = {
    # การลบที่ถูกปฏิเสธ เขียนบรรทัดว่าลบสำเร็จ
    'refusalwritesaline': ('departments',
        "        if (isReferenced(error)) {\n"
        "          return res.status(409).json({ message: REFUSALS.departmentInUse });",
        "        if (isReferenced(error)) {\n"
        "          await recordActivity(\n"
        "            pool,\n"
        "            req.auth.userId,\n"
        "            'DELETE_DEPARTMENT',\n"
        "            onDepartment(req.params.departmentId),\n"
        "          );\n"
        "          return res.status(409).json({ message: REFUSALS.departmentInUse });"),
    # ผลลัพธ์สองอย่างยุบเหลือรหัสเดียว ที่หลักสูตร
    'deactivationsaysdeleted': ('programs',
        "        'DEACTIVATE_PROGRAM',",
        "        'DELETE_PROGRAM',"),
    # ข้อเดียวกันที่รายวิชา ซึ่งเป็นการตัดสินใจคนละที่
    'subjectdeactivationsaysdeleted': ('subjects',
        "        'DEACTIVATE_SUBJECT',",
        "        'DELETE_SUBJECT',"),
    # บรรทัดของการนำเข้ากลับไปไม่มีเป้าหมาย ซึ่งคือรูปก่อน #58
    'importnamesnorecord': ('departments',
        "              'IMPORT_DEPARTMENTS',\n"
        "              onDepartment(rows[0].department_id),",
        "              'IMPORT_DEPARTMENTS',\n"
        "              null,"),
    # บรรทัดหลุดออกนอก transaction จึงรอดจากการย้อนกลับ
    'importlineoutsidethesavepoint': ('departments',
        "            await recordActivity(\n"
        "              client,\n"
        "              req.auth.userId,\n"
        "              'IMPORT_DEPARTMENTS',",
        "            await recordActivity(\n"
        "              pool,\n"
        "              req.auth.userId,\n"
        "              'IMPORT_DEPARTMENTS',"),
    # #13 เขียนบรรทัดเดียวต่อหนึ่งไฟล์และไม่ชี้ระเบียน #58 ตัดสินเป็นหนึ่งบรรทัดต่อหนึ่งระเบียน
    # ตัวนี้คือทางที่ไม่ได้เลือก เอามารันตามกติกาของ #48
    'usersimportnamesnoaccount': ('users',
        "            'IMPORT_USERS',\n"
        "            onUser(written.user.user_id),",
        "            'IMPORT_USERS',\n"
        "            null,"),
}

main(FILES, MUTANTS)
