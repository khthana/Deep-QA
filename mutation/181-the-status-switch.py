# -*- coding: utf-8 -*-
r"""#181 - สวิตช์สถานะของสองจอที่ไม่มีแถวไหนเคยกด

ห้าฟอร์มมีช่องสถานะ สามจอมีแถวที่ seam เบราว์เซอร์กดช่องของตัวเองแล้วอ่านตารางกลับ
(`16a` `18a` `19a`) ส่วน **ภาควิชา** กับ **หลักสูตร** ไม่มี และแถวของมันถูกค้ำด้วย
การเดินด้วยมือเท่านั้น — `14-departments.md` ข้อ 3 กับ `15-programs.md` ข้อ 4 และ 5

ที่สำคัญที่สุดคือจอแรก เพราะ `DELETE` ของภาควิชา **ปฏิเสธ** แทนที่จะปิดให้ (#60) และคำปฏิเสธ
ทั้งสองประโยคจบด้วย *หากต้องการเลิกใช้งานให้ปิดการใช้งานแทน* ซึ่งเป็นข้ออ้างว่าทางออกนั้น
ไปถึงได้จากหน้าจอที่ประโยคนั้นถูกอ่าน

## มัตแตนต์

หกตัว - **สองตัวต่อฟอร์ม** เพราะช่องนี้มีสองทิศทาง และตัวที่ตรึงค่าไว้ค่าเดียวมองไม่เห็นทิศทางที่
ค่านั้นถูกต้องอยู่แล้ว (#96 #102 #107) ตัวที่แทนค่าเริ่มต้นจะมองไม่เห็นอะไรเลยทุกที่ที่ค่าจริง
ต่างจากมัน (#154) จึงต้องมีแถวที่พาฟอร์มไปอยู่ตรงจุดที่ทั้งสองค่าตรงกันทั้งสองรอบ - แล้วอีก
**สองตัวที่ `coveredScopes`** สำหรับคำกล่าวอ้างอีกข้อของแถวเหล่านี้ ที่ฟอร์มไม่มีทางพิสูจน์

* `departmentalwaysopen` - ฟอร์มภาควิชาส่ง `is_active: true` เสมอ การปิดจากฟอร์มจึงไม่เกิด
* `departmentalwaysclosed` - ส่ง `is_active: false` เสมอ การ **คืนสถานะ** จึงไม่เกิด
* `programalwaysopen` - ฟอร์มหลักสูตรส่ง `true` เสมอ **และแถวที่ปิดผ่าน *ลบ* ต้องรอด** เพราะ
  เส้นทางนั้นเป็นของ route ไม่ใช่ของฟอร์ม - นั่นคือเหตุที่แถวที่ปิดจากฟอร์มต้องมี
* `programalwaysclosed` - ส่ง `false` เสมอ ควรฆ่าการเปิดกลับทั้งสองทาง
* `grantreadsdepartmentstatus` - `coveredScopes` อ่าน `d.is_active` **เฉพาะ branch ของ
  ขอบเขตตัวเอง** ไม่ใช่ทั้ง query: ตัวที่กว้างกว่าทำให้รายการภาควิชาของผู้ดูแลคณะหายไปด้วย
  แถวจึงตายที่ป้ายในตารางก่อนจะถึงคำกล่าวอ้างเรื่องสิทธิ์ - หนึ่งลิงก์หนึ่งตัว (#96 #107)
* `grantreadsprogramstatus` - อย่างเดียวกันกับ `p.program_id` branch ของหลักสูตร

ทั้งหกไม่ได้ทำให้แอปพลิเคชันหยุด - สี่ตัวแรกตรึงค่าของช่องเดียว สองตัวหลังตัดแถวของขอบเขตที่ถูกปิด
ออกจากคำตอบของ `coveredScopes` เท่านั้น

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`FILES` คือสองฟอร์มกับ `backend/auth/authorise.js` เทียบ `FILES` ไม่ใช่หัวเรื่อง (#85 #87 #125)
สองฟอร์มไม่มีใบไหนถือ ตรวจด้วย `grep -rl 'DepartmentForm\|ProgramForm' mutation/*.py` ส่วน
`authorise.js` ใช้ร่วมกับ `10-application-shell.py` `23-offerings.py` `52-access-ended.py` และ
`102-department-boundary.py` - กวาดทีละไฟล์ และฮาร์เนสจะไม่ยอม `save` ทับมัตแตนต์ของคนอื่น (#126)

**`departmentalwaysopen` ฆ่าแถวของไฟล์อื่นด้วย** - `16a` แถว 97 ปิดภาควิชา `01` จากบริบทที่สอง
เป็นฟิกซ์เจอร์ แล้วอ่านว่า dropdown ของจอรายวิชาเขียน *(ปิดใช้งาน)* ไหม ฉะนั้นช่องนี้ *ถูกกด* ที่ seam
นี้อยู่ก่อนแล้ว สิ่งที่ไม่มีใครถามคือ **จอภาควิชาเองอ่านค่านั้นกลับไหม** - เครื่องมือไม่ใช่คำกล่าวอ้าง (#171)

## การกวาด

กวาดเมื่อ 1 ต.ค. 2569 ทีละตัว กับ `181a` - baseline **5 ผ่านทั้ง 5** (31.3 วินาที)
ตัวเลขบรรทัดคือของไฟล์สเปกฉบับที่กวาดรอบสุดท้าย

| มัตแตนต์ | ผล | แถวและ assertion ที่ตาย |
|---|---|---|
| `departmentalwaysopen` | ล้ม 2 ผ่าน 3 (49.7 วิ) | `:198` กับ `:218` ป้าย *ปิดใช้งาน* ของสองแถวภาควิชา |
| `departmentalwaysclosed` | ล้ม 1 ผ่าน 4 (40.8 วิ) | `:203` *คืนสถานะได้* - แถวที่สองรอดเพราะไม่ได้อ่านการเปิดกลับ |
| `programalwaysopen` | ล้ม 2 ผ่าน 3 (49.2 วิ) | `:254` กับ `:273` สองแถวที่ปิดจากฟอร์ม **และแถวที่ปิดผ่าน *ลบ* รอด** ตามที่คาด |
| `programalwaysclosed` | ล้ม 2 ผ่าน 3 (51.0 วิ) | `:257` กับ `:320` การเปิดกลับ ทั้งทางฟอร์มและทางที่ route ปิดให้ |
| `grantreadsdepartmentstatus` | ล้ม 1 ผ่าน 4 (40.9 วิ) | `:236` ผู้ดูแลภาควิชายังเห็นคนที่ขอบเขตของเขาคือ `05` |
| `grantreadsprogramstatus` | ล้ม 1 ผ่าน 4 (40.8 วิ) | `:290` กรรมการหลักสูตรยังเห็น `PLO-12` ของหลักสูตรที่ถูกปิด |

**สามรอบ ไม่ใช่รอบเดียว และสองรอบแรกวัดข้อบกพร่องของสเปกเอง** (#146 - แถวที่เขียนขึ้นเพื่อตอบอะไร
ยังไม่เป็นหลักฐานจนกว่ามัตแตนต์ตัวนั้นจะถูกรันอีกครั้ง)

1. **รอบแรก** ทุกแถวคืนสถานะใน `finally` ด้วยฟังก์ชันเดียวกับที่ใช้ตั้งค่า ซึ่ง assert สถานะก่อนกด
   และ `finally` ที่โยนจะ **แทนที่** ข้อผิดพลาดที่มันกำลังเก็บกวาดอยู่ (กฎของ JavaScript) ทุกตัวจึง
   ฆ่าถูกแถว แต่ประโยคที่พิมพ์ออกมาชี้ไปที่ขั้นตอนคืนสถานะ ไม่ใช่ที่คำกล่าวอ้างที่เพิ่งล้ม
2. **รอบที่สอง** การคืนสถานะเงียบแล้ว แต่ยังกดฟอร์มเดิมที่มัตแตนต์ตรึงไว้ มันจึงลงไม่ได้เลยตอน
   `*alwaysclosed` ถูกใช้ และแถวถัดไปตายที่เงื่อนไขตั้งต้นของตัวเอง - **กลายเป็นตัวเลขการฆ่าที่เป็น
   เรื่องของแถวก่อนหน้า** (#52 #89 ขยับขึ้นมาอีกชั้น) ตอนนี้การคืนสถานะเป็น `UPDATE` ตรงฐานข้อมูล
   ซึ่งเป็นเครื่องมือ ไม่ใช่คำกล่าวอ้าง (#171) และ `afterAll` ล้มไฟล์ถ้ามีการคืนครั้งไหนไม่ลง
3. **รอบที่สาม** สองตัวใหม่ยังเล็งผิดจุด: ตัวของภาควิชาที่อ่าน `is_active` ทั้ง query ฆ่าป้ายในตาราง
   ของผู้ดูแลคณะก่อนถึงคำกล่าวอ้างเรื่องสิทธิ์ และตัวของหลักสูตรทำให้ `openPlos` รอ list ที่หน้าจอ
   ไม่เคยขอ แถวจึงตายที่ timeout ไม่ใช่ที่ assertion (#139) แก้ด้วยการแคบมัตแตนต์ลงเหลือ branch
   ของขอบเขตตัวเอง และให้แถวเปิดหน้าจอด้วย `waitForReach` - คำขอที่หน้าจอส่งเสมอ

**และแถวของภาควิชาเคยอ่านคนผิดคน** - `teacher.one@` มีหลักสูตร `0501` ขอบเขตของบัญชีจึงเป็น
หลักสูตร ไม่ใช่ภาควิชา reach ที่ทิ้งภาควิชาไปแล้วก็ยังเห็นเขา มัตแตนต์จึงรอดทั้งที่โค้ดถูกทำลายจริง
แถวนี้อ่าน `dept.admin.05@` เพิ่ม ซึ่งเป็นบัญชีที่ `program` เป็น `null` - คนชนิดเดียวที่คำกล่าวอ้างนี้
หักได้

## วิธีรัน

    python mutation/181-the-status-switch.py save
    python mutation/181-the-status-switch.py <mutant>
    python mutation/181-the-status-switch.py restore

แถวอยู่ใน `e2e/tests/181a-the-status-switch-two-screens-never-pressed.spec.js`
"""
from harness import main

FILES = {
    'department': 'frontend/src/components/departments/DepartmentForm.js',
    'program': 'frontend/src/components/programs/ProgramForm.js',
    # Shared with `10-application-shell.py`, `23-offerings.py`, `52-access-ended.py`
    # and `102-department-boundary.py` - sweeps run a file at a time, and the
    # harness refuses to `save` over somebody else's mutant (#126).
    'authorise': 'backend/auth/authorise.js',
}

READS_THE_BOX = '      is_active: draft.is_active,\n'
ALWAYS_OPEN = '      is_active: true,\n'
ALWAYS_CLOSED = '      is_active: false,\n'

# The other claim of these rows: that closing a scope is not a revocation. It is
# `coveredScopes` that would have to read the switch for it to be one, and it is
# written as one query of three branches, so there is one mutant per branch - the
# department's and the programme's, which are the two scopes a row here closes.
SCOPE_READS_DEPARTMENTS = '      WHERE d.department_id = $1 OR d.faculty_id = $1\n'
SCOPE_READS_ACTIVE_DEPARTMENTS = (
    '      WHERE (d.department_id = $1 AND d.is_active) OR d.faculty_id = $1\n'
)
SCOPE_READS_PROGRAMS = '''      WHERE p.program_id = $1
         OR p.department_id = $1
         OR p.department_id IN (SELECT department_id FROM departments WHERE faculty_id = $1)'''
SCOPE_READS_ACTIVE_PROGRAMS = '''      WHERE (p.program_id = $1 AND p.is_active)
         OR p.department_id = $1
         OR p.department_id IN (SELECT department_id FROM departments WHERE faculty_id = $1)'''

MUTANTS = {
    'departmentalwaysopen': ('department', READS_THE_BOX, ALWAYS_OPEN),
    'departmentalwaysclosed': ('department', READS_THE_BOX, ALWAYS_CLOSED),
    'programalwaysopen': ('program', READS_THE_BOX, ALWAYS_OPEN),
    'programalwaysclosed': ('program', READS_THE_BOX, ALWAYS_CLOSED),
    'grantreadsdepartmentstatus': (
        'authorise',
        SCOPE_READS_DEPARTMENTS,
        SCOPE_READS_ACTIVE_DEPARTMENTS,
    ),
    'grantreadsprogramstatus': ('authorise', SCOPE_READS_PROGRAMS, SCOPE_READS_ACTIVE_PROGRAMS),
}

main(FILES, MUTANTS)
