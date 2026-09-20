"""#140 - รายการที่ handler โหลดใหม่ถูกวาดก็ต่อเมื่อยังเป็นรายการที่หน้าจออยู่

ทุกจอรายการโหลดรายการใหม่หลังบันทึก ลบ นำเข้า หรือหลังคำปฏิเสธ (#131) และ handler เรียก
`load()` เฉย ๆ ซึ่งรับค่าเริ่มต้น `isCurrent = () => true` ไป effect ถามได้ว่า render ของมันยังอยู่ไหม
แต่ไม่มีอะไรรื้อ handler ทิ้ง **ถ้าตัวเปลี่ยนหน้าหรือตัวกรองขยับระหว่างที่การโหลดนั้นยังไม่กลับ
คำตอบเก่าที่มาถึงทีหลังจะวาดหน้าหนึ่งไว้ใต้ตัวเปลี่ยนหน้าที่อยู่หน้าสอง**

ตอนนี้ทุก handler ส่ง `() => onScreen.current === load` - `onScreen` เป็น ref ที่ effect เขียน
`load` ตัวล่าสุดลงไป และ `load` ถูกสร้างใหม่พอดีเมื่อสิ่งที่รายการขอเปลี่ยน ค่าเริ่มต้นถูกเอาออก
ทุกจอ ผู้เรียกที่ลืมส่งธงจึงล้มดัง ไม่ใช่วาดรายการที่ไม่มีใครอยู่แล้วเงียบ ๆ

**ราคาคือแถวต่อจุด ไม่ใช่บรรทัดต่อจุด** เก้าจอมีตัวควบคุมอยู่ข้าง handler รวมสามสิบเอ็ดจุด
แต่ละจุดมีแถวของตัวเองใน `e2e/tests/140a-superseded-handler-reload.spec.js` และมัตแตนต์
ของตัวเองที่นี่ ซึ่งเปลี่ยนธงของจุดนั้นจุดเดียวเป็น `load(() => true)` - รูปเดียวกับ
`ploshandlerstalewins` ของ #133 `enrolmentreloadstalewins` เป็นจุดเดียวที่มีผู้เรียกสองทาง
(เพิ่มนักศึกษา และการนำเข้าซึ่งส่ง `reload` ไปทั้งตัว) จึงต้องล้มสองแถว

อีกสิบจอ - `AchievementCriteria` `ActivityEvidence` `ContinuousImprovement` `CourseOutcomes`
`GradingWeights` `LearningActivities` `MeasurableBehaviors` `RubricCriteria` `StudentGroups`
`TeachingPlan` - ขอสิ่งที่ route บอกและไม่มีอะไรบนจอเปลี่ยนมันได้ระหว่างที่การโหลดยังไม่กลับ
จึงมี guard แต่ไม่มีแถวและไม่มีมัตแตนต์ ใบของมันเขียน *ยังไม่ได้ทดสอบ* พร้อมเหตุผลและวันที่
ไม่ใช่ *ไม่ต้องมี* (#141 ติดตามอยู่)

## ผลการกวาด

กวาดเมื่อ 17 ก.ย. 2569 **ทีละจอ ไม่ใช่ทั้งชุด** แต่ละกลุ่มรันแถวของจอนั้นใน
`140a-superseded-handler-reload.spec.js` (ตัดของจออื่นด้วย `--grep-invert` บนชื่อไฟล์ในวงเล็บ) รวมกับ
spec เดิมของจอ มี baseline สะอาดคั่นหน้าทุกกลุ่ม และตรวจ checksum ของสิบเก้าไฟล์หลัง `restore` ทุกตัว
เพราะหน้าจอยังไม่ได้ commit — ไม่มีครั้งไหนที่ checksum ไม่กลับ ทุกตัวล้มที่ `toEqual` ของแถวตัวเอง
ไม่ใช่ที่ timeout 57 นาที รวมการกวาดซ้ำของมัตแตนต์ตั๋วอื่นข้างล่าง

| กลุ่ม | spec เดิมที่รันด้วย | baseline | แต่ละมัตแตนต์ |
|---|---|---|---|
| `students` | `17a` `17b` `17c` | 16 ผ่าน | 1 ล้ม 15 ผ่าน (2 ตัว) |
| `users` | `11a` `11b` `11c` `84a` | 18 ผ่าน | 1 ล้ม 17 ผ่าน (3 ตัว) |
| `departments` | `14a` `14b` `14c` `57a` | 24 ผ่าน | 1 ล้ม 23 ผ่าน (4 ตัว) |
| `programs` | `55a` `57a` | 16 ผ่าน | 1 ล้ม 15 ผ่าน (4 ตัว) |
| `subjects` | `16a` | 12 ผ่าน | 1 ล้ม 11 ผ่าน (4 ตัว) |
| `pairs` | `18a` `18b` `18c` | 22 ผ่าน | 1 ล้ม 21 ผ่าน (4 ตัว) |
| `rubrics` | `21a` | 14 ผ่าน | 1 ล้ม 13 ผ่าน (3 ตัว) |
| `offerings` | `23a` `23b` | 17 ผ่าน | 1 ล้ม 16 ผ่าน (5 ตัว) |
| `enrolment` | `25a` | 17 ผ่าน | `reload` 2 ล้ม 15 ผ่าน · `remove` 1 ล้ม 16 ผ่าน |

มัตแตนต์ของตั๋วอื่นที่การเปลี่ยนนี้ย้าย anchor ไป เล็งใหม่แล้วกวาดกับ spec ของตัวเอง:
`16:M9` 1 ล้ม 1 ไม่ได้รัน (row 89) · `21:staleafterasave` 1 ล้ม 5 ไม่ได้รัน · `23:nolanding` 1 ล้ม 5 ไม่ได้รัน ·
`27:savenoreload` 2 ล้ม (แถว 4 · 8) · `28` และ `29:savenoreload` 3 ล้ม (แถว 3 · 4 · 5) ·
`31:savenoreload` 3 ล้ม (แถว 2 · 3 · 4) — แถวที่ตายตรงกับใบของมันทั้งเจ็ด (สาม spec แรกเป็น `serial` จึงไม่ได้รันแถวหลังแถวที่ตาย) และ `30:savenoreload` 2 ล้ม
(แถว 3 · 5) ซึ่ง**น้อยกว่า**ที่ใบ `30` บันทึกไว้ ใบนั้นเขียนทั้งสองวัน

และอีกสองตัวที่ anchor ไม่ขยับ แต่*สิ่งที่แทนเข้าไป*เรียก `load()` เฉย ๆ ซึ่งตอนนี้โยน error:
`25:addstaysonpage` 1 ล้ม (แถว 2) · `25:importstaysonpage` 1 ล้ม (แถว 7) หลังส่งธงให้ ทั้งคู่ที่ `shown === 1`
ได้ 2 ตามใบ `25` หลัง code review เปลี่ยน `unroute` ของ `140a` ให้ได้ฟังก์ชันเดียวกับ `route` กวาด
`offeringssavestalewins` กับ `departmentssavestalewins` ซ้ำ ยังล้มแถวของตัวเองแถวเดียว

**กวาดซ้ำเมื่อ 18 ก.ย. 2569 (#144)** กับแถวตัวกรองของ `144a` ที่เพิ่มเข้ามา ตัวที่แถวตัวกรองกดจุดของมันด้วยล้มแถวเหล่านั้นด้วย -
`userssavestalewins` และ `offeringsrefusalstalewins` 4 ตัวละ `subjectsrefusalstalewins` `pairsrefusalstalewins`
`rubricsrefusalstalewins` และ `studentssavestalewins` 2 ตัวละ ตัวเลขของแต่ละตัวอยู่ใน `mutation/144-superseded-reload-by-filter.py`

## วิธีรัน

    python mutation/140-superseded-handler-reload.py save
    python mutation/140-superseded-handler-reload.py <mutant>
    python mutation/140-superseded-handler-reload.py restore
"""
from harness import main

FILES = {
    'students': 'frontend/src/pages/Students.js',
    'users': 'frontend/src/pages/Users.js',
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
    'subjects': 'frontend/src/pages/Subjects.js',
    'pairs': 'frontend/src/pages/ProgramSubjects.js',
    'rubrics': 'frontend/src/pages/Rubrics.js',
    'offerings': 'frontend/src/pages/Offerings.js',
    'enrolment': 'frontend/src/pages/SubjectStudents.js',
}

MUTANTS = {
    # ข้อมูลนักศึกษา: บันทึก
    'studentssavestalewins': ('students',
        '      if (page === 1) await load(() => onScreen.current === load)\n',
        '      if (page === 1) await load(() => true)\n'),
    # ข้อมูลนักศึกษา: การนำเข้า
    'studentsimportstalewins': ('students',
        '              if (page === 1) load(() => onScreen.current === load)\n',
        '              if (page === 1) load(() => true)\n'),
    # ข้อมูลผู้ใช้งาน: บันทึก
    'userssavestalewins': ('users',
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => onScreen.current === load)\n",
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => true)\n"),
    # ข้อมูลผู้ใช้งาน: ระงับ
    'userstogglestalewins': ('users',
        '      })\n      await load(() => onScreen.current === load)\n',
        '      })\n      await load(() => true)\n'),
    # ข้อมูลผู้ใช้งาน: การนำเข้า
    'usersimportstalewins': ('users',
        '              if (page === 1) load(() => onScreen.current === load)\n',
        '              if (page === 1) load(() => true)\n'),
    # ข้อมูลภาควิชา: แก้ไข ที่ถูกปฏิเสธ
    'departmentsrefusalstalewins': ('departments',
        '      if (asked.current === ask) report(error)\n      await load(() => onScreen.current === load)\n',
        '      if (asked.current === ask) report(error)\n      await load(() => true)\n'),
    # ข้อมูลภาควิชา: บันทึก
    'departmentssavestalewins': ('departments',
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => onScreen.current === load)\n",
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => true)\n"),
    # ข้อมูลภาควิชา: ลบ / นำออก
    'departmentsremovestalewins': ('departments',
        '      else await load(() => onScreen.current === load)\n',
        '      else await load(() => true)\n'),
    # ข้อมูลภาควิชา: การนำเข้า
    'departmentsimportstalewins': ('departments',
        '              if (page === 1) load(() => onScreen.current === load)\n',
        '              if (page === 1) load(() => true)\n'),
    # ข้อมูลหลักสูตร: แก้ไข ที่ถูกปฏิเสธ
    'programsrefusalstalewins': ('programs',
        '      if (asked.current === ask) report(error)\n      await load(() => onScreen.current === load)\n',
        '      if (asked.current === ask) report(error)\n      await load(() => true)\n'),
    # ข้อมูลหลักสูตร: บันทึก
    'programssavestalewins': ('programs',
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => onScreen.current === load)\n",
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => true)\n"),
    # ข้อมูลหลักสูตร: ลบ / นำออก
    'programsremovestalewins': ('programs',
        '      else await load(() => onScreen.current === load)\n',
        '      else await load(() => true)\n'),
    # ข้อมูลหลักสูตร: การนำเข้า
    'programsimportstalewins': ('programs',
        '              if (page === 1) load(() => onScreen.current === load)\n',
        '              if (page === 1) load(() => true)\n'),
    # ข้อมูลรายวิชา: แก้ไข ที่ถูกปฏิเสธ
    'subjectsrefusalstalewins': ('subjects',
        '      if (asked.current === ask) report(error)\n      await load(() => onScreen.current === load)\n',
        '      if (asked.current === ask) report(error)\n      await load(() => true)\n'),
    # ข้อมูลรายวิชา: บันทึก
    'subjectssavestalewins': ('subjects',
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => onScreen.current === load)\n",
        "        setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      }\n      await load(() => true)\n"),
    # ข้อมูลรายวิชา: ลบ / นำออก
    'subjectsremovestalewins': ('subjects',
        '      else await load(() => onScreen.current === load)\n',
        '      else await load(() => true)\n'),
    # ข้อมูลรายวิชา: การนำเข้า
    'subjectsimportstalewins': ('subjects',
        '              if (page === 1) load(() => onScreen.current === load)\n',
        '              if (page === 1) load(() => true)\n'),
    # รายวิชาในหลักสูตร: แก้ไข ที่ถูกปฏิเสธ
    'pairsrefusalstalewins': ('pairs',
        '      if (asked.current === ask) report(error)\n      await load(() => onScreen.current === load)\n',
        '      if (asked.current === ask) report(error)\n      await load(() => true)\n'),
    # รายวิชาในหลักสูตร: บันทึก
    'pairssavestalewins': ('pairs',
        "      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      await load(() => onScreen.current === load)\n",
        "      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      await load(() => true)\n"),
    # รายวิชาในหลักสูตร: ลบ / นำออก
    'pairsremovestalewins': ('pairs',
        '      else await load(() => onScreen.current === load)\n',
        '      else await load(() => true)\n'),
    # รายวิชาในหลักสูตร: การนำเข้า
    'pairsimportstalewins': ('pairs',
        '              if (page === 1) load(() => onScreen.current === load)\n',
        '              if (page === 1) load(() => true)\n'),
    # Rubric: แก้ไข ที่ถูกปฏิเสธ
    'rubricsrefusalstalewins': ('rubrics',
        '      if (asked.current === ask) report(error)\n      await load(() => onScreen.current === load)\n',
        '      if (asked.current === ask) report(error)\n      await load(() => true)\n'),
    # Rubric: บันทึก
    'rubricssavestalewins': ('rubrics',
        "      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      await load(() => onScreen.current === load)\n",
        "      setNotice({ error: false, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' })\n      await load(() => true)\n"),
    # Rubric: ลบ / นำออก
    'rubricsremovestalewins': ('rubrics',
        '      else await load(() => onScreen.current === load)\n',
        '      else await load(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: ตอนเรียนและผู้สอน ที่ถูกปฏิเสธ
    'offeringsrefusalstalewins': ('offerings',
        '      if (asked.current === ask) report(error)\n      await load(() => onScreen.current === load)\n',
        '      if (asked.current === ask) report(error)\n      await load(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: เปิดรายวิชา
    'offeringssavestalewins': ('offerings',
        '      await load(() => onScreen.current === load)\n      if (mine) await refresh(offering.id, ask)\n',
        '      await load(() => true)\n      if (mine) await refresh(offering.id, ask)\n'),
    # ข้อมูลการเปิดรายวิชา: คัดลอก
    'offeringscopystalewins': ('offerings',
        '      if (page === 1) await load(() => onScreen.current === load)\n',
        '      if (page === 1) await load(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: ยกเลิกการเปิด
    'offeringsremovestalewins': ('offerings',
        '        else await load(() => onScreen.current === load)\n',
        '        else await load(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: กลับไปหน้ารายการ
    'offeringsbackstalewins': ('offerings',
        '            setViewing(null)\n            load(() => onScreen.current === load)\n',
        '            setViewing(null)\n            load(() => true)\n'),
    # รายชื่อนักศึกษาของรายวิชา: reload (เพิ่มนักศึกษา และการนำเข้า)
    'enrolmentreloadstalewins': ('enrolment',
        '    if (page === 1) await load(() => onScreen.current === load)\n',
        '    if (page === 1) await load(() => true)\n'),
    # รายชื่อนักศึกษาของรายวิชา: นำออก
    'enrolmentremovestalewins': ('enrolment',
        '      else await load(() => onScreen.current === load)\n',
        '      else await load(() => true)\n'),
}

main(FILES, MUTANTS)
