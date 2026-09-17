# -*- coding: utf-8 -*-
"""#139 - ฟอร์มหรือแผงเปิดด้วยการกดที่ถูกขอเป็นครั้งสุดท้าย

เจ็ดจอรายการอ่านรายละเอียดของแถวใหม่ก่อนเปิดฟอร์ม และข้อมูลการเปิดรายวิชาอ่าน Offering ใหม่
ก่อนเปิดแผง คำตอบถูกวาดโดยไม่ถามว่าคำขอที่ทำให้มันเกิดยังเป็นคำขอที่หน้าจอต้องการอยู่ไหม
**ใบที่มาถึงทีหลังชนะ ไม่ใช่ใบที่ขอทีหลัง** และไม่มีปุ่มไหนในตารางถูกปิดตอน `busy`
สถานการณ์จึงสร้างได้จากหน้าจอเอง

ตอนนี้ทุกจอจำไว้ใน `asked` ว่าการกดครั้งไหนเป็นครั้งสุดท้าย: การกดที่อ่าน (แก้ไข ตอนเรียนและผู้สอน)
สร้างคำขอใหม่ `const ask = {}` และปุ่มที่เอาฟอร์มหรือแผงออก เขียน `null` คำตอบและคำปฏิเสธของการอ่าน
ถูกวาดก็ต่อเมื่อ `asked.current === ask` ส่วนการโหลดรายการใหม่หลังคำปฏิเสธ (#131) ทำเสมอ

## ทางเข้าที่วัดได้ ไม่ใช่ทางเข้าที่ตั๋วนับ

ตั๋วนับทางเข้าไว้สองทาง คือ แก้ไข แถวที่สอง (ทุกจอ) กับการย้ายตัวกรองของ `Plos` เมื่อวัดแล้ว
จอรายการมีห้าทางต่อจอ บวกทางที่หกบนสี่จอที่นำเข้าได้ และแผงของ Offering มีหกทาง:

* **แก้ไข แถวที่สอง** (`…secondwins`) - ฟอร์มของแถวแรกมาแทนฟอร์มของแถวที่สอง
* **คำปฏิเสธของแถวแรก** (`…refusallands`) - แถบแดงเรื่องแถวหนึ่งมาขึ้นเหนือฟอร์มของอีกแถว
  ซึ่งคอมเมนต์ใน `Departments.js` เองเรียกว่าความเสียหายทั้งหมดของ #91
* **เพิ่ม** (`…addkeepsask`) - ฟอร์มเพิ่มกลายเป็นฟอร์มแก้ไขของแถวแรกกลางคัน สิ่งที่พิมพ์ไว้หายไป
* **ลบ / นำออก** (`…removekeepsask`) - ฟอร์มของแถวแรกไปเปิดอยู่ใต้คำถามเรื่องอีกแถว
* **แก้ไข แถวเดิมซ้ำ** (`…samerowmatches`) - คำตอบของการกดครั้งแรกตรงกับการกดครั้งหลัง
  จึงเปิดฟอร์มกลับมาหลังคนกด ยกเลิก
* **การนำเข้า** บนภาควิชา หลักสูตร รายวิชา และรายวิชาในหลักสูตร (`…importkeepsask`) -
  `ImportPanel` เอาฟอร์มออกตอนเริ่มอัปโหลด คำตอบที่มาทีหลังจึงเอาแผงนำเข้าออกจากจอกลางคัน
* Offering: **เปิดรายวิชา** · **ยกเลิกการเปิด** · **กลับไปหน้ารายการ** หลังการเขียนตอนเรียน
  ที่คำขออ่านกลับยังไม่กลับ · **ตอนเรียนและผู้สอน แถวเดิมซ้ำ** ซึ่งวาดการอ่าน Offering
  ที่เก่ากว่าทับที่ใหม่กว่า (`offeringsformkeepsask` · `offeringscancelkeepsask` ·
  `offeringsbackkeepsask` · `offeringssamerowmatches`)

*แถวที่เรียกสองทางเข้าคือสองแถว* (#66) จึงเป็นมัตแตนต์หนึ่งตัวต่อหนึ่งทาง

**สองทางสุดท้ายของจอรายการมาจาก code review ไม่ใช่จากการวัดรอบแรก** การแก้รอบแรกจำ *แถว*
ไม่ใช่ *การกด* จึงกดแถวเดิมซ้ำแล้วฟอร์มกลับมาได้ และนับเฉพาะปุ่มในตาราง ไม่ได้นับ `ImportPanel`
ที่อยู่เหนือตาราง รอบเดียวกันนั้นเจอว่า `return` ก่อนกำหนดของ guard ใน `catch` ข้าม `load()`
ไปด้วย ซึ่งทำให้ผลของ #131 หายไปเงียบ ๆ - *ผลที่ต้องเกิดเสมอ อย่าวางไว้หลังผลที่ล้มได้* (#131)
ตอนนี้ guard ครอบเฉพาะ `report` และ `load()` อยู่นอกมัน

**`secondwins` เปลี่ยนเงื่อนไขเป็นทางเลือกอื่น ไม่ใช่ถอดเงื่อนไขทิ้ง** (#102) ถอดทิ้งแล้ว แก้ไข เพิ่ม
และลบ เสียพร้อมกัน (อ่านจากโค้ด ไม่ได้กวาด - คำปฏิเสธมีเงื่อนไขของตัวเองใน `catch`) ซึ่งเป็นสามข้ออ้าง
ที่พิสูจน์แยกไม่ได้ `asked.current !== null` ยังทิ้งคำตอบที่มาหลังเพิ่มกับลบ (ซึ่งเขียน `null`)
แต่ปล่อยคำตอบที่มาหลังการกดอ่านครั้งอื่นให้วาด **จึงล้มสองแถว ไม่ใช่แถวเดียว**: แก้ไข แถวที่สอง
และแก้ไข แถวเดิมซ้ำ เพราะทั้งสองแถวคือ *การกดอ่านอีกครั้ง* ต่างกันแค่แถวที่กด แถวแถวเดิมซ้ำจึง
มีตัวของมันเอง `…samerowmatches` ซึ่งทำให้คำขอเป็น *แถว* แทนการกด และล้มแถวนั้นแถวเดียว

**การย้ายรายการไม่ใช่ทางเข้า** ตั๋วเขียนว่าฟอร์มของ `Plos` ที่เปิดหลังตัวกรองย้าย เป็นอันตราย
เดียวกับที่ธงบน `load` ของ #133 ปิด อ่านแล้วฟอร์มพูดความจริงเกี่ยวกับตัวเอง ช่องหลักสูตรเป็นของ
PLO นั้นและล็อกไว้ ตัวเลือกข้อหลักไปขอ PLO ของหลักสูตรนั้นเอง ไม่ได้ใช้ของตาราง
สิ่งที่เหลือคือฟอร์มที่คนขอเปิดขึ้นหลังจากเขามองไปที่อื่นแล้ว ซึ่งเกิดกับตัวกรองและตัวเปลี่ยนหน้า
ทุกจอ ไม่ใช่เฉพาะ `Plos` คำถามว่าควรยกเลิกคำขอไหมเป็นของเจ้าของ UI (docs/06 §Out of Scope)
และคำตอบเมื่อ 17 ก.ย. 2569 คือไม่ `plosfiltercancels` คือคำตอบอีกข้าง
และแถวตัวกรองของ `139a` ต้องล้มเมื่อมันถูกใส่

`offeringscreatedasksnothing` ไม่ได้ค้ำแถวของ `139a` - มันค้ำว่าเปิดรายวิชาแล้วแผงของ
รายวิชาที่เพิ่งเปิดยังขึ้นมา ซึ่งเป็นแถวที่ 1 ของ `23a` อยู่แล้ว ส่วน `asked.current = ask`
ใน `openSections` ไม่มีมัตแตนต์ ถอดแล้วไม่มีแผงไหนเปิดได้เลย มันเป็นเงื่อนไขตั้งต้นของทุกแถว
ที่เปิดแผง ไม่ใช่ข้ออ้างที่มัตแตนต์วัดแยกได้

## สิ่งที่ #139 ไม่ได้แก้

* `finally` ของการอ่านที่ถูกแทนยังตั้ง `busy` เป็น false ระหว่างที่งานอื่นยังไม่กลับ - มีมาก่อน
  #139 และ guard แบบเดียวกันใช้ไม่ได้ (เพิ่มกับลบไม่ได้ตั้ง `busy` เอง) จึงแยกเป็นตั๋ว
* ประโยคของการเขียนตอนเรียนบนแผงหนึ่ง ขึ้นเหนือแผงของ Offering อื่นได้ - เป็นคำถามเรื่อง UI
  จึงแยกเป็นตั๋วที่ถาม

## การกวาด

กวาดเมื่อ 17 ก.ย. 2569 **ทีละจอ ไม่ใช่ทั้งชุด** แต่ละจอรัน describe ของจอนั้นใน
`139a-superseded-row-detail.spec.js` (ตัดของจออื่นออกด้วย `--grep-invert`) รวมกับ spec เดิม
ทุกไฟล์ของจอนั้น มี baseline สะอาดคั่นหน้าทุกกลุ่ม และตรวจ checksum ของแปดไฟล์หลัง `restore`
ทุกตัว เพราะหน้าจอยังไม่ได้ commit `git status` จึงบอกไม่ได้ว่าต้นไม้กลับมาแล้ว - ไม่มีครั้งไหน
ที่ checksum ไม่กลับ

| กลุ่ม | spec เดิมที่รันด้วย | baseline | `…secondwins` | ตัวอื่นแต่ละตัว |
|---|---|---|---|---|
| `departments` | `14a` `14b` `14c` `57a` | 26 ผ่าน | 2 ล้ม 24 ผ่าน | 1 ล้ม 25 ผ่าน (5 ตัว) |
| `programs` | `55a` `57a` | 18 ผ่าน | 2 ล้ม 16 ผ่าน | 1 ล้ม 17 ผ่าน (5 ตัว) |
| `subjects` | `16a` | 14 ผ่าน | 2 ล้ม 12 ผ่าน | 1 ล้ม 13 ผ่าน (5 ตัว) |
| `pairs` | `18a` `18b` `18c` | 24 ผ่าน | 2 ล้ม 22 ผ่าน | 1 ล้ม 23 ผ่าน (5 ตัว) |
| `rubrics` | `21a` | 16 ผ่าน | 2 ล้ม 14 ผ่าน | 1 ล้ม 15 ผ่าน (4 ตัว) |
| `criteria` | `22a` | 15 ผ่าน | 2 ล้ม 13 ผ่าน | 1 ล้ม 14 ผ่าน (4 ตัว) |
| `plos` | `19a` `96a` `133a` และแถวตัวกรอง | 31 ผ่าน | 2 ล้ม 29 ผ่าน | 1 ล้ม 30 ผ่าน (5 ตัว) |
| `offerings` | `23a` `23b` | 18 ผ่าน | 2 ล้ม 16 ผ่าน | 1 ล้ม 17 ผ่าน (5 ตัว) และตัวสุดท้ายข้างล่าง |

**ทั้ง 47 ตัวล้มแถวที่ชื่อของมันบอก** อ่านจากชื่อเทสต์ที่ตาย ไม่ใช่จากจำนวน:
`…secondwins` ล้ม *a second แก้ไข is the form that stays open* และ *แก้ไข pressed again on the
same row is a new ask, so ยกเลิก stays closed* · `…refusallands` ล้ม *a refusal of the first แก้ไข
does not land on the second form* · `…addkeepsask` ล้ม *เพิ่ม pressed while a แก้ไข is out stays
the add form* · `…removekeepsask` ล้ม *ลบ (นำออก) pressed while a แก้ไข is out leaves the table
under its question* · `…samerowmatches` ล้มแถวแถวเดิมซ้ำแถวเดียว · `…importkeepsask` ล้ม *an
import started while a แก้ไข is out keeps its panel on the screen* บนจอของตัวเองทุกจอ
บน Offering `offeringssecondwins` ล้ม *a second ตอนเรียนและผู้สอน is the panel that stays open*
และ *ตอนเรียนและผู้สอน pressed again on the same row draws the later reading* และอีกห้าตัว
ล้มแถวของ describe นั้นตามชื่อ

**แถวคำปฏิเสธไม่เคยแดงก่อนการแก้** เพราะเขียนขึ้นพร้อมกับการแก้ `…refusallands`
จึงเป็นหลักฐานเดียวว่ามันล้มได้ และมันล้มได้ครบทั้งแปด

`offeringscreatedasksnothing` ล้มแถว 1 ของ `23a` ที่ `toBeVisible` ของปุ่ม
*กลับไปหน้ารายการ* (แผงของรายวิชาที่เพิ่งเปิดไม่ขึ้น) `23a` เป็น `serial` อีกห้าแถว
**ไม่ได้รัน** ตัวเลขจึงเป็น 1 ล้ม 12 ผ่าน 5 ไม่ได้รัน - มันค้ำแถว 1 และไม่ได้พูดอะไรถึงห้าแถวนั้น

**`plosfiltercancels` รอบแรกล้มถูกแถวแต่ผิดที่** - `Test timeout of 60000ms exceeded`
ไม่ใช่ `toEqual` เมื่อฟอร์มไม่เปิด แถวไปอ่าน `inputValue()` ของช่องที่ไม่มี ซึ่งรอจนหมดเวลา
แถวถูกเขียนใหม่ให้อ่านช่องเฉพาะเมื่อมีฟอร์ม และในการกวาดรอบนี้ล้มที่ `toEqual` ซึ่งคือข้ออ้าง
ของแถวเอง

`offeringscancelkeepsask` ถูกกวาดซ้ำอีกรอบในการแก้รอบแรก เพื่ออ่านภาพของแถวที่ล้ม: แผงของ
Offering แรกเปิดขึ้น และคำถามกลายเป็น *ยืนยันการลบตอนเรียน* ที่ไม่มีประโยคและมีปุ่ม *ลบตอนเรียน*
ส่วนสิ่งที่ปุ่มนั้นจะทำ (`confirmRemoval` ยังอ่าน `kind: 'offering'` จึงยกเลิกการเปิด Offering
ที่สอง) **อ่านจากโค้ด ไม่ได้กด**

## จุดยึดของตั๋วอื่นที่ #139 ย้าย

* `91:keepsaved` หลุดเพราะ `asked.current = null` มาอยู่เหนือ `setNotice(null)` ในปุ่ม
  เพิ่มภาควิชา เล็งใหม่แล้วกวาดกับ `14c` - 1 ล้ม 2 ผ่าน ล้มแถว *a success does not outlive
  the action it reports* ของตัวเองเหมือนเดิม
* `23:nolanding` หลุดเพราะ `refresh` รับ `ask` เล็งใหม่แล้วกวาดกับ `23a` - 1 ล้ม 5 ไม่ได้รัน
  ล้มแถว 1 ของตัวเอง **แต่ล้มที่การรอ ไม่ใช่ที่ข้ออ้าง**: ไม่มีการอ่าน Offering เกิดขึ้นเลย
  `openSubject` จึงรอคำตอบจนหมดเวลา 60 วินาทีก่อนถึง `toBeVisible` ของแถว ข้ออ้างเดียวกันนั้น
  ถูกฆ่าที่ `toBeVisible` โดย `offeringscreatedasksnothing` ข้างบน
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

MUTANTS = {
    # ภาควิชา: a second แก้ไข - any ask at all lets the late answer draw
    'departmentssecondwins': ('departments',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # ภาควิชา: the refusal of a read somebody moved on from lands anyway
    'departmentsrefusallands': ('departments',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # ภาควิชา: เพิ่ม leaves the last แก้ไข standing
    'departmentsaddkeepsask': ('departments',
        '                asked.current = null\n                setNotice(null)\n                setEditing({})\n',
        '                setNotice(null)\n                setEditing({})\n'),
    # ภาควิชา: ลบ leaves the last แก้ไข standing
    'departmentsremovekeepsask': ('departments',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(department)\n',
        '                            setNotice(null)\n                            setRemoving(department)\n'),
    # ภาควิชา: the ask is the row, so a second press on it matches the first
    'departmentssamerowmatches': ('departments',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = department\n    asked.current = ask\n'),
    # ภาควิชา: the import leaves the last แก้ไข standing
    'departmentsimportkeepsask': ('departments',
        '            onStart={() => {\n              asked.current = null\n              setNotice(null)\n',
        '            onStart={() => {\n              setNotice(null)\n'),
    # หลักสูตร: a second แก้ไข - any ask at all lets the late answer draw
    'programssecondwins': ('programs',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # หลักสูตร: the refusal of a read somebody moved on from lands anyway
    'programsrefusallands': ('programs',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # หลักสูตร: เพิ่ม leaves the last แก้ไข standing
    'programsaddkeepsask': ('programs',
        '                asked.current = null\n                setNotice(null)\n                setEditing({})\n',
        '                setNotice(null)\n                setEditing({})\n'),
    # หลักสูตร: ลบ leaves the last แก้ไข standing
    'programsremovekeepsask': ('programs',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(program)\n',
        '                            setNotice(null)\n                            setRemoving(program)\n'),
    # หลักสูตร: the ask is the row, so a second press on it matches the first
    'programssamerowmatches': ('programs',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = program\n    asked.current = ask\n'),
    # หลักสูตร: the import leaves the last แก้ไข standing
    'programsimportkeepsask': ('programs',
        '            onStart={() => {\n              asked.current = null\n              setNotice(null)\n',
        '            onStart={() => {\n              setNotice(null)\n'),
    # รายวิชา: a second แก้ไข - any ask at all lets the late answer draw
    'subjectssecondwins': ('subjects',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # รายวิชา: the refusal of a read somebody moved on from lands anyway
    'subjectsrefusallands': ('subjects',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # รายวิชา: เพิ่ม leaves the last แก้ไข standing
    'subjectsaddkeepsask': ('subjects',
        '                  asked.current = null\n                  setNotice(null)\n                  setEditing({})\n',
        '                  setNotice(null)\n                  setEditing({})\n'),
    # รายวิชา: ลบ leaves the last แก้ไข standing
    'subjectsremovekeepsask': ('subjects',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(subject)\n',
        '                            setNotice(null)\n                            setRemoving(subject)\n'),
    # รายวิชา: the ask is the row, so a second press on it matches the first
    'subjectssamerowmatches': ('subjects',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = subject\n    asked.current = ask\n'),
    # รายวิชา: the import leaves the last แก้ไข standing
    'subjectsimportkeepsask': ('subjects',
        '            onStart={() => {\n              asked.current = null\n              setNotice(null)\n',
        '            onStart={() => {\n              setNotice(null)\n'),
    # รายวิชาในหลักสูตร: a second แก้ไข - any ask at all lets the late answer draw
    'pairssecondwins': ('pairs',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # รายวิชาในหลักสูตร: the refusal of a read somebody moved on from lands anyway
    'pairsrefusallands': ('pairs',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # รายวิชาในหลักสูตร: เพิ่ม leaves the last แก้ไข standing
    'pairsaddkeepsask': ('pairs',
        '                  asked.current = null\n                  setNotice(null)\n                  setEditing({})\n',
        '                  setNotice(null)\n                  setEditing({})\n'),
    # รายวิชาในหลักสูตร: ลบ leaves the last แก้ไข standing
    'pairsremovekeepsask': ('pairs',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(pair)\n',
        '                            setNotice(null)\n                            setRemoving(pair)\n'),
    # รายวิชาในหลักสูตร: the ask is the row, so a second press on it matches the first
    'pairssamerowmatches': ('pairs',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = pair\n    asked.current = ask\n'),
    # รายวิชาในหลักสูตร: the import leaves the last แก้ไข standing
    'pairsimportkeepsask': ('pairs',
        '            onStart={() => {\n              asked.current = null\n              setNotice(null)\n',
        '            onStart={() => {\n              setNotice(null)\n'),
    # Rubric: a second แก้ไข - any ask at all lets the late answer draw
    'rubricssecondwins': ('rubrics',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # Rubric: the refusal of a read somebody moved on from lands anyway
    'rubricsrefusallands': ('rubrics',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # Rubric: เพิ่ม leaves the last แก้ไข standing
    'rubricsaddkeepsask': ('rubrics',
        '                  asked.current = null\n                  setNotice(null)\n                  setEditing({})\n',
        '                  setNotice(null)\n                  setEditing({})\n'),
    # Rubric: ลบ leaves the last แก้ไข standing
    'rubricsremovekeepsask': ('rubrics',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(rubric)\n',
        '                            setNotice(null)\n                            setRemoving(rubric)\n'),
    # Rubric: the ask is the row, so a second press on it matches the first
    'rubricssamerowmatches': ('rubrics',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = rubric\n    asked.current = ask\n'),
    # เกณฑ์: a second แก้ไข - any ask at all lets the late answer draw
    'criteriasecondwins': ('criteria',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # เกณฑ์: the refusal of a read somebody moved on from lands anyway
    'criteriarefusallands': ('criteria',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # เกณฑ์: เพิ่ม leaves the last แก้ไข standing
    'criteriaaddkeepsask': ('criteria',
        '                  asked.current = null\n                  setNotice(null)\n                  setEditing({})\n',
        '                  setNotice(null)\n                  setEditing({})\n'),
    # เกณฑ์: ลบ leaves the last แก้ไข standing
    'criteriaremovekeepsask': ('criteria',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(criterion)\n',
        '                            setNotice(null)\n                            setRemoving(criterion)\n'),
    # เกณฑ์: the ask is the row, so a second press on it matches the first
    'criteriasamerowmatches': ('criteria',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = criterion\n    asked.current = ask\n'),
    # PLO: a second แก้ไข - any ask at all lets the late answer draw
    'plossecondwins': ('plos',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current !== null) setEditing(current)\n'),
    # PLO: the refusal of a read somebody moved on from lands anyway
    'plosrefusallands': ('plos',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # PLO: เพิ่ม leaves the last แก้ไข standing
    'plosaddkeepsask': ('plos',
        '                  asked.current = null\n                  setNotice(null)\n                  setEditing({})\n',
        '                  setNotice(null)\n                  setEditing({})\n'),
    # PLO: ลบ leaves the last แก้ไข standing
    'plosremovekeepsask': ('plos',
        '                            asked.current = null\n                            setNotice(null)\n                            setRemoving(plo)\n',
        '                            setNotice(null)\n                            setRemoving(plo)\n'),
    # PLO: the ask is the row, so a second press on it matches the first
    'plossamerowmatches': ('plos',
        '    const ask = {}\n    asked.current = ask\n',
        '    const ask = plo\n    asked.current = ask\n'),
    # PLO: the filter moving is taken as withdrawing the ask - the answer 17 Sep 2569 refused
    'plosfiltercancels': ('plos',
        '      if (asked.current === ask) setEditing(current)\n',
        '      if (asked.current === ask && onScreen.current === program) setEditing(current)\n'),
    # Offering: a second ตอนเรียนและผู้สอน - any ask at all lets the late panel draw
    'offeringssecondwins': ('offerings',
        '      if (asked.current === ask) setViewing(offering)\n',
        '      if (asked.current !== null) setViewing(offering)\n'),
    # Offering: the refusal of a panel somebody moved on from lands anyway
    'offeringsrefusallands': ('offerings',
        '      if (asked.current === ask) report(error)\n',
        '      if (asked.current !== null) report(error)\n'),
    # Offering: เปิดรายวิชา leaves the last panel standing
    'offeringsformkeepsask': ('offerings',
        '                  asked.current = null\n                  setNotice(null)\n                  setOpening(true)\n',
        '                  setNotice(null)\n                  setOpening(true)\n'),
    # Offering: ยกเลิกการเปิด leaves the last panel standing
    'offeringscancelkeepsask': ('offerings',
        "                            asked.current = null\n                            setNotice(null)\n                            setRemoving({ kind: 'offering', offering })\n",
        "                            setNotice(null)\n                            setRemoving({ kind: 'offering', offering })\n"),
    # Offering: กลับไปหน้ารายการ leaves the panel asked for
    'offeringsbackkeepsask': ('offerings',
        '            asked.current = null\n            setNotice(null)\n            setViewing(null)\n',
        '            setNotice(null)\n            setViewing(null)\n'),
    # Offering: the ask is the Offering, so a second press on it matches the first
    'offeringssamerowmatches': ('offerings',
        '    const ask = {}\n    asked.current = ask\n    setNotice(null)\n',
        '    const ask = offering.id\n    asked.current = ask\n    setNotice(null)\n'),
    # Offering: a subject just opened is not the panel asked for, so it never opens
    'offeringscreatedasksnothing': ('offerings',
        '      setOpening(false)\n      const ask = {}\n      asked.current = ask\n',
        '      setOpening(false)\n      const ask = {}\n'),
}

main(FILES, MUTANTS)
