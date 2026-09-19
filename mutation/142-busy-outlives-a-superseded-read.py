# -*- coding: utf-8 -*-
"""#142 - การอ่านที่มาถึงช้า ไม่คืนปุ่มให้การเขียนที่ยังไม่กลับ

แปดจออ่านแถวใหม่ก่อนเปิดฟอร์มหรือแผง (`openEditor` เจ็ดจอ `openSections` บน `Offerings`)
และการอ่านนั้นถือธง `busy` ตัวเดียวกับการเขียน - ธงที่ปิด บันทึก กล่องยืนยัน และปุ่มตอนเรียน
ของแผงระหว่างที่การเขียนยังไม่กลับ `finally` ของการอ่านปลดธงเสมอ ไม่ว่าหลังจากนั้นจะมีการเขียน
หยิบธงไปแล้วหรือไม่ บันทึกจึงกดซ้ำได้ระหว่างที่การบันทึกครั้งแรกยังไม่กลับ

ตอนนี้การเขียนถือ `writing` การอ่านถือ `reading` และ `busy` ที่ปุ่มอ่านคือ `writing || reading`
การอ่านยังปลดธงของตัวเองเสมอเหมือนที่เคยปลดธงตัวเดียว สิ่งเดียวที่เปลี่ยนคือมันไม่ได้ปลด `writing`
JSX ไม่ได้เปลี่ยน เหตุผลอยู่บน `frontend/src/pages/Departments.js`

## สิ่งที่วัดก่อนแก้ - ทางเข้ามีมากกว่าที่ตั๋วนับ

วัดบนข้อมูลภาควิชาเมื่อ 19 ก.ย. 2569 ที่ `8bb9a92`:

* **อ่าน อ่านอีกแถว บันทึก** - ลำดับของตั๋ว แดงตามที่ตั๋วบอก
* **อ่าน แล้วลบ** - ไม่ใช่ทางเข้า กล่องยืนยันเปิดมาแบบถูกปิดจนกว่าการอ่านจะมาถึง
* **บันทึก แล้วลบ** - ไม่ใช่ทางเข้า ยกเลิก ของฟอร์มกดได้ระหว่างบันทึก ตารางจึงกลับมา แต่กล่องยืนยัน
  เปิดมาแบบถูกปิด การเขียนสองอย่างซ้อนกันไม่ได้ เพราะทุกปุ่มที่เริ่มการเขียนถูกปิดด้วยธง

สิ่งเดียวที่ปลดธงของงานอื่นก่อนเวลาได้จึงเป็นการอ่าน เพราะเป็นสิ่งเดียวที่ตารางยอมให้เริ่มระหว่าง
ที่ธงยกอยู่ และมันทำได้สองลำดับ:

* **ถูกแทน** (`…supersededletsgo`) - การอ่านที่ถูกการอ่านอีกครั้งแซง มาถึงหลังการเขียนเริ่ม
  ลำดับของตั๋ว แถวแรกของทุกจอ
* **ปัจจุบัน** (`…currentletsgo`) - การเขียนยังไม่กลับ สิ่งที่ส่งมันถูกปิดด้วย ยกเลิก ซึ่งธงไม่ได้ปิด
  แล้วการอ่านที่เริ่มจากตารางมาถึง - การอ่านนั้นเป็นการอ่านที่ถูกขอ ธงที่มันปลดเป็นของการเขียน
  guard ของ #139 (`asked.current === ask`) จึงไม่เห็นลำดับนี้เลย

ลำดับปัจจุบันมี ยกเลิก สองตัวให้กด และ*แถวที่เรียกสองทางเข้าคือสองแถว* (#66):

* ยกเลิก ของ**กล่องยืนยัน**ไม่เคยถูกปิด ทางนี้จึงถึงทุกจอรายการ - แถวที่สอง (การลบยังไม่กลับ แล้ว
  แก้ไข อีกแถว) บน Offering คือ กลับไปหน้ารายการ ระหว่างที่การเขียนตอนเรียนยังไม่กลับ แล้วเปิด
  แผงเดิมอีกครั้ง
* ยกเลิก ของ**ฟอร์ม**กดได้ระหว่างบันทึกแค่บนข้อมูลภาควิชา หลักสูตร และรายวิชา - อีกสี่ฟอร์ม
  (Rubric เกณฑ์ PLO รายวิชาในหลักสูตร) มี `disabled={busy}` วัดจากแถวที่เขียนไว้ให้ทั้งเจ็ดจอ
  ซึ่งหมดเวลาที่การกด ยกเลิก บนสี่จอนั้นพอดีเมื่อรันกับโค้ดเก่า บนสามจอที่เหลือ แก้ไข แถวเดิมอีกครั้ง
  แล้วบันทึกซ้ำได้ ซึ่งคือความเสียหายของตั๋วตามตัวอักษร - แถวที่สี่ มีแค่สามจอ

`…currentletsgo` ล้มทั้งแถวที่สองและแถวที่สี่บนสามจอนั้น เพราะทั้งสองคือบรรทัดเดียวกันปลดธงเดียวกัน
ไม่ใช่สองข้ออ้างที่มัตแตนต์แยกได้

## ทำไมไม่นับงานที่ค้าง และทำไมการปลดไม่ถามว่าเป็นการกดไหน

ตั๋วเสนอให้นับงานที่ค้าง ตัวนับทำให้ฟอร์มของแถวที่สองถูกปิดจนกว่าคำตอบของแถวแรก ซึ่งถูกทิ้งไปแล้ว
จะมาถึง - เป็นสิ่งที่จอไม่เคยทำ และเป็นการเปลี่ยน UI (docs/06 §Out of Scope) การเขียนไม่ต้องนับ
เพราะการเขียนสองอย่างซ้อนกันไม่ได้ (วัดไว้ข้างบน)

**รุ่นแรกของการแก้ทำผิดแบบเดียวกันในอีกที่หนึ่ง** มันให้ `reading` ถือการกดที่หยิบมัน และปลดเฉพาะ
ถ้ายังเป็นการกดนั้น code review ทั้งสองทางเจอจากคนละด้าน: การอ่านที่ถูกอีกการอ่านแซงทิ้งธงไว้จน
การอ่านที่ใหม่กว่ามาถึง ทั้งที่ธงตัวเดียวเคยลงทันที - เปลี่ยนสิ่งที่จอปิด เหมือนตัวนับ - และไม่มีมัตแตนต์
ตัวไหนแตะเงื่อนไขนั้น แทนด้วยการปลดเสมอแล้วทุกแถวยังเขียว เพราะเงื่อนไขนั้นไม่ได้ช่วยเรื่องส่งซ้ำเลย
(`reading` ไม่เคยปิด `writing`) ตอนนี้ `reading` เป็น boolean ที่การอ่านปลดเสมอ

## แถวที่สาม และมัตแตนต์ตัวที่สาม

ตั๋วบอกไว้แล้วว่าทำไม guard ของ #139 ลอกมาใช้ไม่ได้ ถ้าการอ่านปลดเฉพาะตอนที่ยังถูก `asked`
เพิ่มกับลบ (ซึ่งเขียน `asked` และไม่ได้หยิบธงของตัวเอง) จะทำให้ไม่มีใครปลดเลย กล่องยืนยันที่เปิด
ระหว่างนั้นจะถูกปิดตลอดไป แถวที่สามค้ำว่าการปลดไม่ได้ถาม `asked` และ `…letgowhileasked` คือการแก้
แบบที่ตั๋วปฏิเสธ **แถวที่สามไม่เคยแดงก่อนการแก้** มันไม่ได้มีไว้จับข้อบกพร่อง แต่จับการแก้ที่ผิด
มัตแตนต์ตัวนี้จึงเป็นหลักฐานเดียวว่ามันล้มได้

มัตแตนต์ทั้งสามตัวยึดบรรทัดเดียว - `setReading(false)` ใน `finally` ของการอ่าน - เพราะการอ่านคือ
สิ่งเดียวที่จบก่อนเวลาได้ระหว่างที่การเขียนยังไม่กลับ สองตัวแรกเพิ่มการปลด `writing` กลับเข้าไป
โดยแยกด้วยคำถามเดียวที่ทำให้สองลำดับต่างกัน (`asked.current !== ask` กับ `=== ask`) จึงล้ม
คนละแถว ตัวที่สามแทนบรรทัดนั้นด้วย guard ของ #139

## เวลาที่แถวแรกรอ

แถวที่สองและสี่อ่านปุ่มเมื่อฟอร์มหรือแผงที่การอ่านเปิดขึ้นบนจอแล้ว - `finally` ของการอ่านรันใน task
เดียวกับการตั้ง state ที่วาดมัน และ React commit ทั้งสองพร้อมกัน แถวแรกไม่มีจุดแบบนั้น การอ่านที่ถูกแซง
ไม่วาดอะไร จึงอ่านปุ่ม 250 ms หลังคำตอบถูกส่งถึงหน้า ตัวเลขนี้ตัดสินผลได้ (#52) สิ่งที่ค้ำมันคือการกวาด
และการรัน `…supersededletsgo` ทั้งแปดตัวกับแถวแรกโดยทำให้ CPU ช้าลงหกเท่า (#136) - baseline
ผ่าน 8 และทั้งแปดตัวยังล้มที่ `isDisabled`

## การกวาด

กวาดเมื่อ 19 ก.ย. 2569 ทีละจอ แต่ละจอรัน baseline ที่สะอาดก่อน แล้วรันมัตแตนต์สามตัวของจอนั้น
กับแถวของจอใน `142a` `139a` `140a` รวมกับ spec เดิมของจอ และตรวจ checksum ของแปดไฟล์หลัง
`restore` ทุกตัว ทุกตัวล้มที่ assertion ของแถว (`isDisabled` หรือ `toBeEnabled`) ไม่ใช่ที่ timeout
และแถวที่ล้มคือแถวที่ชื่อของมันบอก อ่านจากชื่อเทสต์ ไม่ใช่จากจำนวน spec เดิมกับแถวของ `139a`
`140a` ไม่ล้มกับมัตแตนต์ตัวไหน

| จอ | spec เดิมที่รวมกวาด | baseline | `…supersededletsgo` | `…currentletsgo` | `…letgowhileasked` |
|---|---|---|---|---|---|
| Departments | `14a` `14b` `14c` | 26 ผ่าน | ล้ม 1 ผ่าน 25 (แถวแรก) | ล้ม 2 ผ่าน 24 (แถวที่สอง แถวที่สี่) | ล้ม 1 ผ่าน 25 (แถวที่สาม) |
| Programs | `55a` | 18 ผ่าน | ล้ม 1 ผ่าน 17 (แถวแรก) | ล้ม 2 ผ่าน 16 (แถวที่สอง แถวที่สี่) | ล้ม 1 ผ่าน 17 (แถวที่สาม) |
| Subjects | `16a` | 23 ผ่าน | ล้ม 1 ผ่าน 22 (แถวแรก) | ล้ม 2 ผ่าน 21 (แถวที่สอง แถวที่สี่) | ล้ม 1 ผ่าน 22 (แถวที่สาม) |
| ProgramSubjects | `18a` `18b` `18c` | 32 ผ่าน | ล้ม 1 ผ่าน 31 (แถวแรก) | ล้ม 1 ผ่าน 31 (แถวที่สอง) | ล้ม 1 ผ่าน 31 (แถวที่สาม) |
| Rubrics | `21a` | 23 ผ่าน | ล้ม 1 ผ่าน 22 (แถวแรก) | ล้ม 1 ผ่าน 22 (แถวที่สอง) | ล้ม 1 ผ่าน 22 (แถวที่สาม) |
| RubricCriteria | `22a` | 19 ผ่าน | ล้ม 1 ผ่าน 18 (แถวแรก) | ล้ม 1 ผ่าน 18 (แถวที่สอง) | ล้ม 1 ผ่าน 18 (แถวที่สาม) |
| Plos | `19a` `133a` | 33 ผ่าน | ล้ม 1 ผ่าน 32 (แถวแรก) | ล้ม 1 ผ่าน 32 (แถวที่สอง) | ล้ม 1 ผ่าน 32 (แถวที่สาม) |
| Offerings | `23a` `23b` | 27 ผ่าน | ล้ม 1 ผ่าน 26 (แถวแรก) | ล้ม 1 ผ่าน 26 (แถวที่สอง) | ล้ม 1 ผ่าน 26 (แถวที่สาม) |

ก่อนแก้ `142a` ทั้งไฟล์ถูกรันกับแปดหน้าที่ `8bb9a92` วันเดียวกัน - **ล้ม 19 ผ่าน 8** ทุกแถวที่อ่านปุ่ม
ล้มที่ assertion ของตัวเอง (`Received: false`) และแปดแถวที่ผ่านคือแถวที่สามของทุกจอ

ยังไม่ได้กวาดกลับทาง - ไม่มีใครวัดว่ามัตแตนต์ของ #139 หรือ #140 ล้มแถวไหนของ `142a`

## รันอย่างไร

```
python mutation/142-busy-outlives-a-superseded-read.py save
python mutation/142-busy-outlives-a-superseded-read.py departmentssupersededletsgo
cd e2e && E2E_FRONTEND_PORT=5300 npx playwright test 142a --grep "Departments.js"
python mutation/142-busy-outlives-a-superseded-read.py restore
```
"""
from harness import main

FILES = {
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
    'subjects': 'frontend/src/pages/Subjects.js',
    'pairs': 'frontend/src/pages/ProgramSubjects.js',
    'rubrics': 'frontend/src/pages/Rubrics.js',
    'criteria': 'frontend/src/pages/RubricCriteria.js',
    'plos': 'frontend/src/pages/Plos.js',
    'offerings': 'frontend/src/pages/Offerings.js',
}

# The read's `finally`: it puts down `reading` and nothing else. Every mutant
# here is anchored on it, because the read is the one thing that can end early
# while a write is out.
RELEASE = '      setReading(false)\n'

MUTANTS = {
    # ภาควิชา: a read another read overtook puts the write's flag down when it lands
    'departmentssupersededletsgo': ('departments', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # ภาควิชา: the read that was asked for puts down a write's flag it did not pick up
    'departmentscurrentletsgo': ('departments', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # ภาควิชา: #139's guard copied - a read that ลบ took the place of never lets go
    'departmentsletgowhileasked': ('departments', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # หลักสูตร: a read another read overtook puts the write's flag down when it lands
    'programssupersededletsgo': ('programs', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # หลักสูตร: the read that was asked for puts down a write's flag it did not pick up
    'programscurrentletsgo': ('programs', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # หลักสูตร: #139's guard copied - a read that ลบ took the place of never lets go
    'programsletgowhileasked': ('programs', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # รายวิชา: a read another read overtook puts the write's flag down when it lands
    'subjectssupersededletsgo': ('subjects', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # รายวิชา: the read that was asked for puts down a write's flag it did not pick up
    'subjectscurrentletsgo': ('subjects', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # รายวิชา: #139's guard copied - a read that ลบ took the place of never lets go
    'subjectsletgowhileasked': ('subjects', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # รายวิชาในหลักสูตร: a read another read overtook puts the write's flag down when it lands
    'pairssupersededletsgo': ('pairs', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # รายวิชาในหลักสูตร: the read that was asked for puts down a write's flag it did not pick up
    'pairscurrentletsgo': ('pairs', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # รายวิชาในหลักสูตร: #139's guard copied - a read that ลบ took the place of never lets go
    'pairsletgowhileasked': ('pairs', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # Rubric: a read another read overtook puts the write's flag down when it lands
    'rubricssupersededletsgo': ('rubrics', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # Rubric: the read that was asked for puts down a write's flag it did not pick up
    'rubricscurrentletsgo': ('rubrics', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # Rubric: #139's guard copied - a read that ลบ took the place of never lets go
    'rubricsletgowhileasked': ('rubrics', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # เกณฑ์การให้คะแนน: a read another read overtook puts the write's flag down when it lands
    'criteriasupersededletsgo': ('criteria', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # เกณฑ์การให้คะแนน: the read that was asked for puts down a write's flag it did not pick up
    'criteriacurrentletsgo': ('criteria', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # เกณฑ์การให้คะแนน: #139's guard copied - a read that ลบ took the place of never lets go
    'criterialetgowhileasked': ('criteria', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # ผลการเรียนรู้ระดับหลักสูตร: a read another read overtook puts the write's flag down when it lands
    'plossupersededletsgo': ('plos', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # ผลการเรียนรู้ระดับหลักสูตร: the read that was asked for puts down a write's flag it did not pick up
    'ploscurrentletsgo': ('plos', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # ผลการเรียนรู้ระดับหลักสูตร: #139's guard copied - a read that ลบ took the place of never lets go
    'plosletgowhileasked': ('plos', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
    # การเปิดรายวิชา: a read another read overtook puts the write's flag down when it lands
    'offeringssupersededletsgo': ('offerings', RELEASE,
        RELEASE + '      if (asked.current !== ask) setWriting(false)\n'),
    # การเปิดรายวิชา: the read that was asked for puts down a write's flag it did not pick up
    'offeringscurrentletsgo': ('offerings', RELEASE,
        RELEASE + '      if (asked.current === ask) setWriting(false)\n'),
    # การเปิดรายวิชา: #139's guard copied - a read that ยกเลิกการเปิด took the place of never lets go
    'offeringsletgowhileasked': ('offerings', RELEASE,
        '      if (asked.current === ask) setReading(false)\n'),
}

main(FILES, MUTANTS)
