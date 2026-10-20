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
ของตัวเองที่นี่ ซึ่งเปลี่ยนธงของจุดนั้นจุดเดียวเป็น `drawing(() => true)` - รูปเดียวกับ
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
| `users` | `11a-users` `11b` `11c` `84a` | 18 ผ่าน | 1 ล้ม 17 ผ่าน (3 ตัว) |
| `departments` | `14a` `14b` `14c` `57a` | 24 ผ่าน | 1 ล้ม 23 ผ่าน (4 ตัว) |
| `programs` | `55a` `57a` | 16 ผ่าน | 1 ล้ม 15 ผ่าน (4 ตัว) |
| `subjects` | `16a` | 12 ผ่าน | 1 ล้ม 11 ผ่าน (4 ตัว) |
| `pairs` | `18a` `18b` `18c` | 22 ผ่าน | 1 ล้ม 21 ผ่าน (4 ตัว) |
| `rubrics` | `21a-rubrics` | 14 ผ่าน | 1 ล้ม 13 ผ่าน (3 ตัว) |
| `offerings` | `23a` `23b` | 17 ผ่าน | 1 ล้ม 16 ผ่าน (5 ตัว) |
| `enrolment` | `25a` | 17 ผ่าน | `reload` 2 ล้ม 15 ผ่าน · `remove` 1 ล้ม 16 ผ่าน |

**ชื่อ spec ในคอลัมน์ที่สองเขียนเต็มเมื่อ 24 ก.ย. 2569 (#158)** `11a` กับ `21a` เคยเขียนสั้น ซึ่ง
Playwright จับ `111a` (5 แถว) กับ `121a` (1 แถว) ด้วย **baseline ไม่ได้รวมสองไฟล์นั้น**: users
18 = 15 แถวของสี่ spec บวก 3 แถวของกลุ่มเอง และ rubrics 14 = 11 บวก 3 ถ้าไฟล์ที่ชนได้รันด้วย
จะเป็น 23 กับ 15 ตรวจเมื่อ 24 ก.ย. 2569 ด้วยการบวกจำนวนแถว ไม่ได้กวาดใหม่

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

## สิบสองตัวของแฟ้มนี้รอดการกวาดเมื่อ 19 ต.ค. 2569 และหนี้เป็นของ #210

*(หนี้นั้นจ่ายแล้วเมื่อ 20 ต.ค. 2569 — หัวข้อข้างล่างบอกว่าอ่านหัวข้อนี้ต่างไปอย่างไร)*

กวาดซ้ำทั้งสิบสามตัวตอนปิด #209 (สมอของสิบสองตัวถูกเล็งใหม่วันนั้น): **สิบสองตัวรอด 32 ผ่าน 32**
มีแต่ `offeringssavestalewins` ที่ยัง **ล้ม 1 ผ่าน 31** กลไกไม่ได้อยู่ที่ตัวมัตแตนต์และไม่ได้อยู่ที่ #209:
`busy` ของจอเหล่านี้คือ `writing || reading` และการบันทึกกับการลบถือ `writing` ไว้จนกว่าการอ่านใหม่ที่มัน
`await` จะตอบ #210 ให้ตัวแบ่งหน้าของหกจอฝ่ายบริหาร `disabled={busy}` เมื่อ 19 ต.ค. 2569 ปุ่ม *ถัดไป*
จึงกดไม่ได้อยู่ตลอดช่วงที่แถวของ `140a` กักการอ่านไว้ และ `supersede` ของไฟล์นั้นกดปุ่มหลัง
`await expect(next(page)).toBeEnabled()` ซึ่งเป็นการ**รอ**ที่ลองใหม่เรื่อย ๆ ไม่ใช่การยืนยัน — มันจึงไม่แดง
มันเลื่อนการกดไปอยู่หลังคำตอบที่ถูกกักลงจอแล้ว การแซงที่แถวสร้างขึ้นมาเพื่อวัดจึงไม่เกิดขึ้นเลย

ตัวที่ยังฆ่าได้คือตัวยืนยันเรื่องนี้: แถวของ `offeringssavestalewins` เป็นแถวเดียวที่ #210 ให้ทางแซงที่ไม่ติด
`busy` (ตัวกรองปีการศึกษา) สำมะโนของ #210 ถามว่า*แถวไหนที่ `busy` ยังขึ้นอยู่ตอนกดตัวแซง* และตอบว่า
แถวเดียว คำถามที่ตัดสินคือ *แถวไหนที่รอให้ตัวแซงกดได้* เพราะการรอที่ลองใหม่เลื่อนการกด ไม่ทำให้แถวล้ม
ไม่มีเครื่องมือไหนรายงาน เพราะแถวไม่แดง มันผ่านด้วยเหตุผลที่ผิด มีแต่การกวาดที่พูด (#107, #68)

สิบสองตัวจึงอยู่ที่เดิมและไม่ถูกถอน: มันยังทำซ้ำข้อบกพร่องจริงได้ ที่หายไปคือความสามารถของแถวที่จะเห็นมัน
ทางแก้คือให้สิบสองแถวนั้นมีตัวแซงที่ไม่ติด `busy` อย่างที่แถวของ `Offerings.js` ได้ไป ซึ่งเป็นงานของตั๋ว
ไม่ใช่ของแฟ้มนี้ และเป็นราคาของการปิดทางเข้าที่ #217 ว่าไว้ ตั๋วนั้นคือ #223 ยื่นเมื่อ 20 ต.ค. 2569
จนกว่ามันจะปิด ช่องของสิบสองตัวนี้บนใบเกณฑ์เป็นตัวเลขของวันที่วัด ไม่ใช่ของวันนี้

## กวาดซ้ำเมื่อ 20 ต.ค. 2569 (#223) — ทั้งสามสิบเอ็ดตัวฆ่าได้ ที่แถวของตัวเอง

หัวข้อข้างบนเป็นบันทึกลงวันที่ ไม่ได้ลบ สิ่งที่อ่านต่างไปวันนี้มีสองอย่าง หนึ่ง — *สิบสอง* เป็นสิบสอง
ของสิบสามตัวที่ #209 เล็งใหม่ ไม่ใช่ของแฟ้มนี้ #223 กวาดทั้งสามสิบเอ็ดตัวและพบว่า **สิบห้าตัว**
รอด: อีกห้าตัวเป็นของจอที่ตัวแบ่งหน้ายังไม่ถูกปิด (`users` กับ `students` ซึ่งเป็นคำถามของ #221)
และสิบเอ็ดตัวยังฆ่าได้อยู่แล้ว ด้วยแถวตัวกรองของ `144a` ด้วยแผงนำเข้าซึ่งถือธงของตัวเอง หรือด้วย
`onBack` ที่ปล่อย `busy` ลงก่อนสั่งโหลดใหม่ สอง — *สิบสองแถวนั้นต้องได้ตัวแซงที่ไม่ติด `busy`* ทำแล้ว

สิบเก้าแถวถูกเล็งใหม่: สิบสองแถวแซงด้วยแผงนำเข้า (ไปหน้าสองก่อน แล้วการนำเข้าพากลับหน้าหนึ่ง)
สี่แถวแซงด้วยตัวกรอง สองแถวแซงด้วยการกระโดดข้ามตอนเรียนของ `141b` และอีกแถวหนึ่งคือ
`เปิดรายวิชา` ของ `Offerings.js` ที่ #210 ย้ายไปที่ตัวกรองแล้วแต่ไม่ได้แก้ช่อง *ทำอะไร* บนใบ `23`
และ **สองแถวเหลือเป็นตาข่าย** — คำปฏิเสธของ `Rubrics.js` กับของ `Offerings.js` ไม่มีตัวควบคุมที่
ไม่ติด `busy` เหลืออยู่เลย มัตแตนต์ของสองตัวนั้น**ไม่ถูกถอน** เพราะยังล้มแถวตัวกรองของ `144a`
(หนึ่งแถวและสามแถว) ใบของมันเขียน ☐ พร้อมเงื่อนไขที่จะทำให้ข้ออ้างวัดได้อีกครั้ง

กวาดทีละตัว คืนโค้ดทุกครั้ง อ่าน `git status` หลัง `apply` และหลัง `restore` แต่ละตัวรันแถวของจอ
ตัวเองใน `140a` กับ `144a` (`--grep` ชื่อไฟล์ในวงเล็บ) รวม 31 รอบ **19.5 นาที** ทุกตัวล้มแถวที่มัน
ถูกเขียนขึ้นมาเพื่อ ยกเว้นสองตัวคำปฏิเสธข้างบนที่ล้มแถวตัวกรองแทน ไม่มีตัวไหนย้ายไปตายที่แถวอื่น
หรือที่ fixture และ baseline ของ `140a` ทั้งไฟล์วันเดียวกันคือ **32 ผ่านทั้ง 32** (2.8 นาที)
ตัวเลขของแต่ละตัวอยู่บนใบของจอนั้น
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
    # #205 - the branch now reads through `onScreen.current` and hands its
    # sentence over, so the guard this drops is the one on that read.
    'studentssavestalewins': ('students',
        '        await drawing(() => onScreen.current === drawing)\n',
        '        await drawing(() => true)\n'),
    # ข้อมูลนักศึกษา: การนำเข้า
    'studentsimportstalewins': ('students',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => true)\n'),
    # ข้อมูลผู้ใช้งาน: บันทึก
    'userssavestalewins': ('users',
        '      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n'
        '      if (reloaded && showing.current === sent) setNotice(said)\n'
        '    } catch (error) {\n'
        '      if (showing.current === sent) report(error)\n',
        '      const drawing = onScreen.current\n      const reloaded = await drawing(() => true)\n'
        '      if (reloaded && showing.current === sent) setNotice(said)\n'
        '    } catch (error) {\n'
        '      if (showing.current === sent) report(error)\n'),
    # ข้อมูลผู้ใช้งาน: ระงับ
    # #202 wrapped this handler's sentence in a guard, so the line above the
    # reload is now the guard's `}` and `save` carries the same pair. The tail
    # tells them apart: `toggle` has no `finally`.
    'userstogglestalewins': ('users',
        '      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n'
        '      if (reloaded && showing.current === sent) setNotice(said)\n'
        '    } catch (error) {\n'
        '      setSwitching(null)\n'
        '      report(error)\n',
        '      const drawing = onScreen.current\n      const reloaded = await drawing(() => true)\n'
        '      if (reloaded && showing.current === sent) setNotice(said)\n'
        '    } catch (error) {\n'
        '      setSwitching(null)\n'
        '      report(error)\n'),
    # ข้อมูลผู้ใช้งาน: การนำเข้า
    'usersimportstalewins': ('users',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => true)\n'),
    # ข้อมูลภาควิชา: แก้ไข ที่ถูกปฏิเสธ
    'departmentsrefusalstalewins': ('departments',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => true)\n'),
    # ข้อมูลภาควิชา: บันทึก
    'departmentssavestalewins': ('departments',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'),
    # ข้อมูลภาควิชา: ลบ / นำออก
    'departmentsremovestalewins': ('departments',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => true)\n'),
    # ข้อมูลภาควิชา: การนำเข้า
    'departmentsimportstalewins': ('departments',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => true)\n'),
    # ข้อมูลหลักสูตร: แก้ไข ที่ถูกปฏิเสธ
    'programsrefusalstalewins': ('programs',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => true)\n'),
    # ข้อมูลหลักสูตร: บันทึก
    'programssavestalewins': ('programs',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'),
    # ข้อมูลหลักสูตร: ลบ / นำออก
    'programsremovestalewins': ('programs',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => true)\n'),
    # ข้อมูลหลักสูตร: การนำเข้า
    'programsimportstalewins': ('programs',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => true)\n'),
    # ข้อมูลรายวิชา: แก้ไข ที่ถูกปฏิเสธ
    'subjectsrefusalstalewins': ('subjects',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => true)\n'),
    # ข้อมูลรายวิชา: บันทึก
    'subjectssavestalewins': ('subjects',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, department), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, department), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'),
    # ข้อมูลรายวิชา: ลบ / นำออก
    'subjectsremovestalewins': ('subjects',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, department), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, department), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => true)\n'),
    # ข้อมูลรายวิชา: การนำเข้า
    'subjectsimportstalewins': ('subjects',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => true)\n'),
    # รายวิชาในหลักสูตร: แก้ไข ที่ถูกปฏิเสธ
    'pairsrefusalstalewins': ('pairs',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => true)\n'),
    # รายวิชาในหลักสูตร: บันทึก
    'pairssavestalewins': ('pairs',
        '      waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'),
    # รายวิชาในหลักสูตร: ลบ / นำออก
    'pairsremovestalewins': ('pairs',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => true)\n'),
    # รายวิชาในหลักสูตร: การนำเข้า
    'pairsimportstalewins': ('pairs',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n',
        '              const drawing = onScreen.current\n              if (page === 1) drawing(() => true)\n'),
    # Rubric: แก้ไข ที่ถูกปฏิเสธ
    'rubricsrefusalstalewins': ('rubrics',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => true)\n'),
    # Rubric: บันทึก
    'rubricssavestalewins': ('rubrics',
        '      waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'),
    # Rubric: ลบ / นำออก
    'rubricsremovestalewins': ('rubrics',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: ตอนเรียนและผู้สอน ที่ถูกปฏิเสธ
    'offeringsrefusalstalewins': ('offerings',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n',
        '      if (asked.current === ask) report(error)\n      const drawing = onScreen.current\n      await drawing(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: เปิดรายวิชา
    'offeringssavestalewins': ('offerings',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      if (mine) await refresh(offering.id, ask)\n',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'
        '      if (mine) await refresh(offering.id, ask)\n'),
    # ข้อมูลการเปิดรายวิชา: คัดลอก
    # #205 - as `studentssavestalewins`, the same branch one screen along.
    'offeringscopystalewins': ('offerings',
        '        await drawing(() => onScreen.current === drawing)\n',
        '        await drawing(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: ยกเลิกการเปิด
    'offeringsremovestalewins': ('offerings',
        '        if (showing.current === sent) {\n'
        '          waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n'
        '        }\n'
        '        const reader = onScreen.current\n'
        '        await reader(() => onScreen.current === reader)\n',
        '        if (showing.current === sent) {\n'
        '          waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n'
        '        }\n'
        '        const reader = onScreen.current\n'
        '        await reader(() => true)\n'),
    # ข้อมูลการเปิดรายวิชา: กลับไปหน้ารายการ
    'offeringsbackstalewins': ('offerings',
        '            setViewing(null)\n            const drawing = onScreen.current\n            drawing(() => onScreen.current === drawing)\n',
        '            setViewing(null)\n            const drawing = onScreen.current\n            drawing(() => true)\n'),
    # รายชื่อนักศึกษาของรายวิชา: reload (เพิ่มนักศึกษา และการนำเข้า)
    # #205 - `reload` asks the live page and reads through `onScreen.current`.
    'enrolmentreloadstalewins': ('enrolment',
        '        return drawing(() => onScreen.current === drawing)\n',
        '        return drawing(() => true)\n'),
    # รายชื่อนักศึกษาของรายวิชา: นำออก
    'enrolmentremovestalewins': ('enrolment',
        '      if (onScreen.current === sent) {\n'
        '        waiting.current = { of: readOf(sectionId, onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      if (onScreen.current === sent) {\n'
        '        waiting.current = { of: readOf(sectionId, onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => true)\n'),
}

main(FILES, MUTANTS)
