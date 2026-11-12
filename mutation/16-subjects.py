# -*- coding: utf-8 -*-
"""
#16 ข้อมูลรายวิชา - the subject catalogue and the department confinement of #61.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/16-subjects.md
for which assertion, and for what each mutant is about.

    python mutation/16-subjects.py save
    python mutation/16-subjects.py <mutant>
    python mutation/16-subjects.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `M1` | **ทำอะไร** รายการภาควิชาที่ picker ดึงมาไม่ถูกจำกัดขอบเขตของสิทธิ์ (`department_id = ANY($1)` เป็น `TRUE`) | **ฆ่าที่** ข้ออ้างว่า dropdown *ภาควิชา* เสนอเฉพาะภาควิชาที่สิทธิ์ครอบ · รันซ้ำโดยกรองเฉพาะข้อท้าย (`16a` **แถว 76 และ 77**) เพราะไฟล์นี้เป็น `serial` การตายที่ข้อแรกจึงบังข้อที่เหลือ และมันตายตรงข้ออ้างของตัวเอง · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:153` กับ `docs/acceptance/16-subjects.md:144` |
| `M2` | **ทำอะไร** ไม่เลือกภาควิชาเดียวที่มีให้อัตโนมัติ (`onlyOne` เป็น `null`) | **ฆ่าที่** ข้ออ้างว่าภาควิชาถูกเลือกไว้ให้แล้วเมื่อคนนั้นมีภาควิชาเดียว · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M3` | **ทำอะไร** คอลัมน์สถานะอ่านกลับด้านกับค่าที่มันถือ | **ฆ่าที่** ข้ออ้างว่าคอลัมน์สถานะอ่านตรงกับ `is_active` · รันซ้ำโดยกรองเฉพาะข้อท้าย (`16a` **แถว 82**) เพราะไฟล์นี้เป็น `serial` และมันตายตรงข้ออ้างของตัวเอง · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:153` กับ `docs/acceptance/16-subjects.md:144` |
| `M4` | **ทำอะไร** การปิดใช้งานถูกรายงานว่าลบ (`deactivated` เป็น `false` เสมอ) | **ฆ่าที่** ข้ออ้างว่าการลบที่กลายเป็นการปิดใช้งาน — เพราะมี Program Subject อ้างอยู่ — ถูกบอกตามที่มันเป็น · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M5` | **ทำอะไร** เปิดแคตตาล็อกให้ผู้ดูแลระดับคณะอีกครั้ง (`MAINTAINERS` รับ `FACULTY_ADMIN` กลับ) คือรูปที่ #61 ปิดไป | **ฆ่าที่** ข้ออ้างของเกณฑ์ข้อ 3 ครึ่งที่เป็นกฎ — *ผู้ดูแลระดับคณะเข้าหน้านี้ไม่ได้เลย* (ครึ่งที่เป็นรายการในเมนูซ้ายเป็นงานของคนเดิน จึงยังเป็น ☐) · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:135` กับ `docs/acceptance/16-subjects.md:144` |
| `M6` | **ทำอะไร** รายการรายวิชาไม่ถูกจำกัดขอบเขตที่สิทธิ์ครอบ (`where` เป็น `TRUE`) — ตัวคู่ของ `M1` ที่ตารางแทนที่จะเป็น picker | **ฆ่าที่** ข้ออ้างว่าตารางแสดงเฉพาะรายวิชาของภาควิชาที่สิทธิ์ครอบ · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M7` | **ทำอะไร** ตัดภาควิชาที่ปิดแล้วออกจาก dropdown ทั้งที่รายวิชาอยู่ในนั้น (ถอดกิ่ง or ที่ต่อ `department.department_id === draft.department_id` ออก) | **ฆ่าที่** ข้ออ้างว่ารายวิชาที่อยู่ในภาควิชาที่ปิดแล้วยังเห็นภาควิชาของตัวเองในตัวเลือก · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M8` | **ทำอะไร** นับภาควิชาที่ปิดแล้วเป็นที่ที่สร้างของใหม่ได้ (ถอด `.filter(is_active !== false)` ออกจาก `usable`) — ตัวคู่ของ `M7` ในทิศตรงข้าม | **ฆ่าที่** ข้ออ้างว่าภาควิชาที่ปิดแล้วไม่นับเป็นที่ที่รายวิชาใหม่ลงได้ · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M9` | **ทำอะไร** ตารางไม่ถูกโหลดใหม่หลังการนำเข้าที่สำเร็จ ผูกกับสองประโยคแทนที่จะเป็น handler ทั้งก้อน เพราะ #68 ใส่คอมเมนต์ไว้ข้างใน และสมอที่อ่านคอมเมนต์จะพังเมื่อมีใครแก้คอมเมนต์ การเอาสองประโยคออกทิ้ง handler ไว้ว่างเปล่า ซึ่งเป็นมัตแตนต์ตัวเดิม | **ฆ่าที่** `16a` *row 89: a good file creates every row it holds* — กวาดใหม่เมื่อ 17 ก.ย. 2569 ได้ **ล้ม 1 ไม่ได้รัน 1 ผ่าน 6** · **ถูกเล็งใหม่** เพราะ #140 เปลี่ยน `if (page === 1) load()` เป็น `load(() => onScreen.current === load)` สมอจึงตามบรรทัดนั้นไป · `16a` เป็น `serial` แถวหลังแถวที่ตายจึงไม่ได้รัน และการกวาดนั้นบอกไม่ได้ว่ามันล้มแถวนั้นด้วยหรือไม่ (#67) · ที่มา `docs/acceptance/16-subjects.md:295` |
| `M10` | **ทำอะไร** ใส่รหัสภาควิชากลับเข้าไปหน้าชื่อ ซึ่งเป็นสิ่งที่ #93 ถอดออกจากทุกป้ายที่เอ่ยชื่อภาควิชา หลักสูตร หรือรายวิชา | **ฆ่าที่** `16a` **แถว 92** · **มันกลับทางแล้ว** หัวข้อ *แถวที่ browser seam รับไป* (20 ส.ค. 2569) ยังเขียนว่ามัตแตนต์ของบรรทัดตัวกรองคือตัวที่**ไม่บอก**รหัสภาควิชา ซึ่งวัดได้ในวันนั้นและไม่ถูกแก้ตาม #93 — บันทึกลงวันที่ ไม่ใช่ลบ (#54) · ที่มา `docs/acceptance/16-subjects.md:490` |
| `M11` | **ทำอะไร** ชื่ออังกฤษไม่ถูกวาดข้างชื่อไทย | **ฆ่าที่** ข้ออ้างว่าแถวของตารางวาดชื่ออังกฤษด้วย · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M13` | **ทำอะไร** ภาควิชาที่ปิดแล้วถูกเสนอให้เลือกได้ — ยังมีป้าย ยังถูกเลือกอยู่ แต่ไม่ถูกปฏิเสธ (`disabled={false}`) **มีแต่ assertion ของ attribute ที่เห็นมันได้** | **ฆ่าที่** ข้ออ้างว่าตัวเลือกนั้นกดไม่ได้ ซึ่งเป็นหนึ่งในสองข้ออ้างที่ *มีตัวฆ่าเป็นของตัวเอง* คู่กับ `M14` · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M14` | **ทำอะไร** ป้ายที่บอกว่าทำไมตัวเลือกนั้นเลือกไม่ได้ หายไป (ถอด ` (ปิดใช้งาน)` ท้ายตัวเลือกออก) | **ฆ่าที่** ข้ออ้างว่าตัวเลือกนั้นบอกเหตุผลด้วยคำ ซึ่งเป็นอีกข้อหนึ่งของสองข้อที่มีตัวฆ่าเป็นของตัวเอง คู่กับ `M13` · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
| `M12` | **ทำอะไร** หน่วยกิตที่พิมพ์ในฟอร์มหายไประหว่างทางลงฐานข้อมูล (`values.credits = 0`) | **ฆ่าที่** ข้ออ้างว่าหน่วยกิตที่พิมพ์คือหน่วยกิตที่ถูกบันทึก · ใบรับงานจดว่า **สิบสี่ตัวกลายพันธุ์ สิบสี่ตัวถูกฆ่าตรงจุดที่ตั้งใจ** (บรรทัด 144) ไม่ได้จดจำนวนแถวต่อตัว · ที่มา `docs/acceptance/16-subjects.md:144` |
"""

from harness import main

FILES = {
    'reach': 'backend/lib/reach.js',
    'subjects': 'backend/routes/subjects.js',
    'page': 'frontend/src/pages/Subjects.js',
    'form': 'frontend/src/components/subjects/SubjectForm.js',
}

# One list of edits per mutant, as in mutate13.py.

MUTANTS = {
 # the pool the picker draws from not narrowed to what the grant covers
 'M1': [('reach',
   "      WHERE ($1::text[] IS NULL OR department_id = ANY($1))\n      ORDER BY department_id ASC",
   "      WHERE ($1::text[] IS NULL OR TRUE)\n      ORDER BY department_id ASC")],
 # the single department not chosen for the person
 'M2': [('form',
   "  const onlyOne = usable.length === 1 ? usable[0] : null",
   "  const onlyOne = null")],
 # the status column reading the opposite of what it holds
 'M3': [('page',
   "{subject.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}",
   "{subject.is_active ? 'ปิดใช้งาน' : 'ใช้งานอยู่'}")],
 # a deactivation reported as a deletion
 'M4': [('page',
   "      const deactivated = Boolean(answer?.deactivated)",
   "      const deactivated = false")],
 # the catalogue opened to the faculty administrator again (the shape #61 closed)
 'M5': [('subjects',
   "const MAINTAINERS = ['DEPT_ADMIN'];",
   "const MAINTAINERS = ['DEPT_ADMIN', 'FACULTY_ADMIN'];")],
 # the list not narrowed to the departments the grant covers
 'M6': [('subjects',
   "      const where = `WHERE ($1::text[] IS NULL OR department_id = ANY($1))",
   "      const where = `WHERE ($1::text[] IS NULL OR TRUE)")],
 # the retired department a subject already sits in dropped from the picker
 'M7': [('form',
   "    department => department.is_active !== false || department.department_id === draft.department_id,",
   "    department => department.is_active !== false,")],
 # a retired department counted as one a new subject may be filed under
 'M8': [('form',
   "  const usable = departments.filter(department => department.is_active !== false)",
   "  const usable = departments")],
 # the table left as it was after an import that succeeded
 # Anchored on the two statements rather than on the whole handler: #68 put a
 # comment inside it, and an anchor that reads a comment breaks the next time
 # somebody edits the comment. Taking the statements away leaves the handler
 # there and empty, which is the same mutant it always was.
 'M9': [('page',
   "              const drawing = onScreen.current\n              if (page === 1) drawing(() => onScreen.current === drawing)\n              else setPage(1)\n",
   "")],
 # the department's code put back in front of its name, which is what #93
 # took out of every label that names a department, a programme or a subject
 # #270 (12 พ.ย. 2569): the filter is `<PageHeader>`'s child now, two spaces
 # shallower.
 'M10': [('page',
   "                    {departments[0].department_name_th}",
   "                    {departments[0].department_id} {departments[0].department_name_th}")],
 # the English name not drawn beside the Thai one
 'M11': [('page',
   "                          {subject.subject_name_en}",
   "                          {''}")],
 # the retired department offered as a choice: still labelled, still
 # selected, but no longer refused. Only the attribute assertion can see it.
 'M13': [('form',
   "                  disabled={department.is_active === false}",
   "                  disabled={false}")],
 # the label that says why the option cannot be chosen, gone
 'M14': [('form',
   "                  {department.is_active === false && ' (ปิดใช้งาน)'}",
   "                  {false}")],
 # the credits typed into the form dropped on the way to the database
 'M12': [('subjects',
   "  values.credits = Number(credits);",
   "  values.credits = 0;")],
}

main(FILES, MUTANTS)
