# -*- coding: utf-8 -*-
"""#149 และ #148 - การโหลดใหม่ไม่ถอดฟอร์มที่คนกำลังพิมพ์อยู่ทิ้ง

เจ็ดจอของผู้สอนวาดทั้งรายการและฟอร์มที่เปิดอยู่ไว้ใน `{!loading && data && (` อันเดียว
และการโหลดทุกครั้งขึ้นต้นด้วย `setLoading(true)` ก่อน #146 ไม่มีฟอร์มไหนเปิดอยู่ตอนรายการ
โหลดใหม่ เพราะการบันทึกที่จบด้วยการโหลดเพิ่งปิดทุกฟอร์มไป #146 หยุดไม่ให้คำตอบที่ถูกแซง
ปิดฟอร์มที่คนย้ายไปแล้ว ฟอร์มจึงยืนอยู่ตอนการโหลดมาถึง - และการโหลดถอดมันทิ้ง แล้วสร้างใหม่
โดยอ่านค่าจากระเบียน สิ่งที่พิมพ์ค้างไว้หายไปโดยไม่มีคำไหนบอก

## คำตอบของเจ้าของ - 21 ก.ย. 2569 - สองชั้น เพราะการวัดเจอสองกลไก

* **จอเก็บสิ่งที่วาดครั้งล่าสุดไว้ระหว่างการโหลด** บรรทัด *กำลังโหลดข้อมูล…* ขึ้นเฉพาะตอนที่
  ยังไม่มีอะไรให้วาด (#149) - `{loading && !data && …}` กับ `{data && (`
* **`EntrySection` ตั้ง draft ตาม `entry_id` ไม่ใช่ตาม object** (#148) - บนแผนพัฒนาต่อเนื่อง
  หัวข้อที่คนกำลังพิมพ์ถูกหาใหม่จากรายการที่โหลดมา object ใหม่ที่ id เดิมจึงตั้งค่าในกล่องใหม่
  บน node เดิม อีกหกจอส่งแถวที่ถืออยู่ใน `editing` ให้ฟอร์ม ซึ่งไม่มีการโหลดไหนแตะตัวตนของมัน
  ชั้นนี้จึงมีแถวเดียวที่แยกมันออกจากชั้นแรกได้ คือหัวข้อที่*เขียนแล้ว* หัวข้อที่ยังไม่เขียนรอด
  ทั้งสองแบบ เพราะ `entry` เป็น `undefined` ทั้งก่อนและหลัง

## ประตูที่การแก้นี้เปิด

`146-save-closes-a-later-form.py` หัวข้อ *ครึ่งหลังที่ไม่มีอะไรไปถึง* เขียนว่าการถามซ้ำหลังการโหลด
ถูกถอดออก เพราะ **โครงสร้างไปไม่ถึง** - ระหว่างการโหลดไม่มีอะไรบนจอให้กด ข้อนั้นจริงในวันที่
เขียน และ #149 คือสิ่งที่เลื่อนวันของมัน (#131) รายการถูกวาดอยู่ระหว่างการโหลดแล้ว ดินสอและ
เขียน… กดได้ ทั้ง `save` และ `remove` ตัดสินประโยคของตัวเอง*หลัง*การโหลด ฟอร์มที่เปิดระหว่างนั้น
จึงจะได้ *บันทึก…แล้ว* หรือ *ลบ…แล้ว* มาทับ - ข้อบกพร่องของ #146 เปิดขึ้นใหม่ ผ่านประตูที่
#146 นับไว้ว่าปิด ทั้งสอง handler จึงถาม `showing.current === sent` ตอนที่มันตัดสิน คือหลัง
การโหลด และ `remove` จับ `sent` ไว้ตอนถูกกด

## มัตแตนต์ - หกตัวต่อจอ และหนึ่งตัวของ `EntrySection`

* `<จอ>gateback` - ใส่ `!loading &&` กลับเข้าไปในประตู ฆ่าแถว *what was typed … survives* ที่
  assertion ของค่าในกล่อง แถวของประโยคสองแถวก็ตายด้วย **แต่ตายที่การรอ** ดินสอที่แถวกดไม่ถูกวาด
  ระหว่างการโหลด และ `UNDER_A_RELOAD` ตัดมันที่ห้าวินาที - *การอ่านสิ่งที่มัตแตนต์ทำให้ไม่มีอยู่
  คือการรอ ไม่ใช่ assertion* (#139) สองแถวนั้นจึงไม่ถูกอ้างด้วยตัวนี้
* `<จอ>loadingline` - บรรทัดกำลังโหลดขึ้นทุกครั้งที่โหลด ไม่ว่ามีอะไรวาดอยู่แล้วหรือไม่ ฆ่าแถว
  ประโยคของการบันทึก ที่ assertion *the loading line over a list already drawn* ซึ่งอ่านตอน
  การโหลดยังถูกกักไว้ ก่อนการกด
* `<จอ>savebannerunasked` - ประโยคของการบันทึกหลังการโหลด ถามด้วย `mine` อย่างที่เคยเป็น
  คำตอบที่ถูกเก็บไว้ก่อนการโหลด ไม่เห็นการกดที่มาระหว่างนั้น ฆ่าแถว *a save whose reload …
  overtook* ที่ประโยค
* `<จอ>removalsentatthelanding` - `remove` จับ `sent` ตอนคำตอบลง ไม่ใช่ตอนถูกกด - ความผิด
  ที่คนเขียนจริง ๆ จะเขียน และทุกตัวแปรยังถูกอ้างอยู่ (#101) **แต่ในผลมันคือการถอดเงื่อนไขทิ้ง**:
  `sent` ที่จับข้างการเปรียบเทียบเท่ากับ ref ตัวเองเสมอ (ผู้ตรวจอ่านจาก diff 21 ก.ย. 2569 -
  ร่างแรกของบรรทัดนี้บอกว่าไม่ใช่) ฆ่าแถว *a removal whose reload … overtook* ที่ประโยค
* `<จอ>savebannerunguarded` - ประโยคของการบันทึกขึ้นเสมอ (`true ||` หน้าเงื่อนไข) ก่อน #149 ประโยค
  ถาม `mine` ตัวเดียวกับการปิด และ `146:<จอ>closewins` ฆ่าทั้งสองครึ่งด้วยตัวเดียว - ที่ assertion
  ของฟอร์ม เพราะมันมาก่อน พอประโยคถามเงื่อนไขของตัวเอง ครึ่ง *the first save's banner* ในแถว
  ของ `146a` ก็ไม่มีใครฆ่า (การกวาดซ้ำ 21 ก.ย. 2569 เห็นมัน) ตัวนี้กวาดกับทั้ง `149a` และ `146a`
* `<จอ>removalbannerunsaid` - ประโยคของการลบไม่ขึ้นเลย (`false &&` หน้าเงื่อนไข `sent` ยังถูกอ้าง)
  ครึ่งที่ `removalsentatthelanding` มองไม่เห็น: สองตัวที่แปรคุณสมบัติเดียวกันไม่เห็นอันที่สาม (#96)
  ฆ่าแถว *a removal nothing took the place of says what it did* ที่ประโยค ซึ่งเพิ่มหลังการตรวจ
* `improvemententrybyobject` - effect ของ `EntrySection` ผูกกับ object `entry` อีกครั้ง
  (`entryId` ยังอยู่ในรายการเพื่อไม่ให้มันไม่ถูกอ้าง) ฆ่าแถวหัวข้อที่เขียนแล้วแถวเดียว
  และไม่ควรแตะแถวหัวข้อที่ยังไม่เขียน - ถ้าแตะ แปลว่าแถวนั้นพิสูจน์ชั้นผิดชั้น

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

ทุกไฟล์ใน `FILES` มีใบอื่นถืออยู่ - ผลของสำมะโนอยู่ใน `mutation/README.md` **ห้ามกวาดใบนี้
พร้อมกับใบที่ชนกัน**

## การกวาด - 21 ก.ย. 2569

ทั้งยี่สิบเก้าตัว ทีละตัว ด้วย `npx playwright test 149a` (`E2E_FRONTEND_PORT=5300`) - baseline
**22 ผ่านทั้ง 22** ใน 1.2 นาที ไม่มีตัวรอด ไม่มี MISS ทุกรัน ล้ม + ผ่าน = 22 และอ่านจากชื่อเทสต์
ที่ตาย ไม่ใช่จากจำนวน:

* `<จอ>loadingline` `<จอ>savebannerunasked` `<จอ>removalsentatthelanding` ทั้งยี่สิบเอ็ดตัว
  **ล้ม 1 ผ่าน 21** ที่ assertion ที่ชื่อของมันบอก (1.3 นาที เท่า baseline บวกการ build)
* `<จอ>gateback` **ล้ม 3 ผ่าน 19** บนหกจอ และ **4** บนแผนพัฒนาต่อเนื่องซึ่งมีแถวสิ่งที่พิมพ์สองแถว -
  ที่ assertion ของค่าในกล่อง บวกสองแถวที่ timeout ห้าวินาทีของการกด (1.5 นาที คือสองการรอนั้น)
  สิบสี่ timeout ในเจ็ดรัน ตรงกับเจ็ดคูณสอง
* `improvemententrybyobject` **ล้ม 1 ผ่าน 21** ที่แถวหัวข้อที่เขียนแล้ว **และไม่ใช่แถวที่ยังไม่เขียน**
  - ซึ่งเป็นสิ่งเดียวที่ตารางสองคูณสองของการวัดทำนายไว้ และเป็นเหตุผลที่แถวนั้นมีอยู่

`31:savenoreload` ถูกเล็งใหม่ในตั๋วเดียวกัน (มันยกบรรทัด `if (mine)` หลังการโหลดมาด้วย) และกวาดกับ
`31a` วันเดียวกัน - ล้ม 3 ผ่าน 5 ที่แถว 2 · 3 · 4 เหมือนก่อนหน้า

## หลังการตรวจโค้ด - 21 ก.ย. 2569

การตรวจเจอว่าไม่มีแถวไหนถามว่าประโยคของการลบยัง*ขึ้น* และว่า `removalsentatthelanding` คือการถอด
เงื่อนไขในผล (แก้คำบรรยายข้างบนแล้ว) แถว *a removal nothing took the place of says what it did*
เจ็ดแถวกับ `<จอ>removalbannerunsaid` เจ็ดตัวจึงเพิ่มเข้ามา แล้วการกวาดซ้ำของ `146` (closewins เจ็ด
cancelclears หก pickerkeepsshowing หนึ่ง กับ `146a`) เจอว่า `closewins` เห็นแค่การปิดแล้ว ครึ่ง
*the first save's banner* ของแถวใน `146a` ไม่มีใครฆ่า จึงได้ `<จอ>savebannerunguarded` เจ็ดตัว

* baseline `149a` **29 ผ่านทั้ง 29** (1.6 นาที) `146a` **49 ผ่านทั้ง 49** (2.5-2.6 นาที)
* `<จอ>removalbannerunsaid` เจ็ดตัว กับ `149a` **ล้ม 1 ผ่าน 28** ที่ *the banner of the removal*
  ของแถวใหม่ของจอนั้น
* `<จอ>savebannerunguarded` เจ็ดตัว กับ `149a` **ล้ม 1 ผ่าน 28** ที่ *the banner of the save before*
  และกับ `146a` **ล้ม 1 ผ่าน 48** ที่ *the first save's banner* - **2** บนแผนพัฒนาต่อเนื่อง บวกแถว
  ตัวเลือกผลการเรียนรู้ที่ *a sentence about the outcome that was left*
* ของ `146`: `closewins` ทุกตัว **ล้ม 1** ที่ฟอร์ม - `improvementclosewins` เคยล้ม 2 (แถวตัวเลือก
  ตายที่ประโยค) `cancelclears` และ `pickerkeepsshowing` เท่า 20 ก.ย. ทุกตัว

ทุกรันเวลาเท่า baseline ล้ม + ผ่าน = จำนวนแถวพอดี และอ่านจากชื่อ ไม่ใช่จากจำนวน

## วิธีรัน

    python mutation/149-reload-keeps-the-open-form.py save
    python mutation/149-reload-keeps-the-open-form.py <mutant>
    python mutation/149-reload-keeps-the-open-form.py restore

แถวอยู่ใน `e2e/tests/149a-reload-keeps-the-open-form.spec.js` ผลการกวาดอยู่ท้าย docstring นี้
และบนใบ acceptance ของแต่ละจอ
"""
from harness import main

FILES = {
    'clos': 'frontend/src/pages/CourseOutcomes.js',
    'criteria': 'frontend/src/pages/AchievementCriteria.js',
    'behaviors': 'frontend/src/pages/MeasurableBehaviors.js',
    'plan': 'frontend/src/pages/TeachingPlan.js',
    'activities': 'frontend/src/pages/LearningActivities.js',
    'evidence': 'frontend/src/pages/ActivityEvidence.js',
    'improvement': 'frontend/src/pages/ContinuousImprovement.js',
    'entry': 'frontend/src/components/improvement/EntrySection.js',
}

# ประตูของรายการกับฟอร์ม
GATE = '      {data && (\n'
GATE_BACK = '      {!loading && data && (\n'

# บรรทัดกำลังโหลด
LINE = '      {loading && !data && <p className="text-sm text-slate-500">'
LINE_ALWAYS = '      {loading && <p className="text-sm text-slate-500">'

# ประโยคของการบันทึก หลังการโหลด - ยึดกับการปิดที่อยู่ข้างบน เพราะ remove ก็จบด้วยสองบรรทัดเดียวกัน
SAVE_ASKED = (
    '        setEditing(null)\n'
    '      }\n'
    '      await load(() => onScreen.current === load)\n'
    '      if (showing.current === sent)\n'
)
SAVE_KEPT = (
    '        setEditing(null)\n'
    '      }\n'
    '      await load(() => onScreen.current === load)\n'
    '      if (mine)\n'
)

# ประโยคของการบันทึกไม่ถามอะไรเลย - ก่อน #149 มันใช้ `mine` ร่วมกับการปิด และ `closewins` ฆ่าทั้งสองครึ่ง
# พร้อมกัน พอแยกเป็นสองเงื่อนไข ครึ่งของประโยคในแถวของ `146a` ก็ไม่มีมัตแตนต์ของมันอีก
SAVE_UNGUARDED = (
    '        setEditing(null)\n'
    '      }\n'
    '      await load(() => onScreen.current === load)\n'
    '      if (true || showing.current === sent)\n'
)

# `remove` จับ `sent` ตอนถูกกด
REMOVE_TOP = '  const remove = async () => {\n    const sent = showing.current\n'
REMOVE_TOP_LATE = '  const remove = async () => {\n'
REMOVE_ASKED = (
    '      setRemoving(null)\n'
    '      await load(() => onScreen.current === load)\n'
    '      if (showing.current === sent)\n'
)
# ประโยคของการลบไม่ขึ้นเลย - ครึ่งที่ตัวบนมองไม่เห็น
REMOVE_UNSAID = (
    '      setRemoving(null)\n'
    '      await load(() => onScreen.current === load)\n'
    '      if (false && showing.current === sent)\n'
)
REMOVE_ASKED_LATE = (
    '      setRemoving(null)\n'
    '      await load(() => onScreen.current === load)\n'
    '      const sent = showing.current\n'
    '      if (showing.current === sent)\n'
)

# เขียนเป็น dict ตรง ๆ ไม่ใช่ loop - `anchors.py` อ่าน `MUTANTS` จาก AST และ dict ว่างที่ถูก
# เติมทีหลังเคยอ่านได้ศูนย์ตัวโดยไม่มีคำเตือน ใบนี้คือใบที่เจอมัน
MUTANTS = {
    # ผลการเรียนรู้รายวิชา
    'closgateback': ('clos', GATE, GATE_BACK),
    'closloadingline': ('clos', LINE, LINE_ALWAYS),
    'clossavebannerunasked': ('clos', SAVE_ASKED, SAVE_KEPT),
    'closremovalsentatthelanding': [('clos', REMOVE_TOP, REMOVE_TOP_LATE),
                                    ('clos', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'closremovalbannerunsaid': ('clos', REMOVE_ASKED, REMOVE_UNSAID),
    'clossavebannerunguarded': ('clos', SAVE_ASKED, SAVE_UNGUARDED),
    # เกณฑ์การบรรลุผล
    'criteriagateback': ('criteria', GATE, GATE_BACK),
    'criterialoadingline': ('criteria', LINE, LINE_ALWAYS),
    'criteriasavebannerunasked': ('criteria', SAVE_ASKED, SAVE_KEPT),
    'criteriaremovalsentatthelanding': [('criteria', REMOVE_TOP, REMOVE_TOP_LATE),
                                        ('criteria', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'criteriaremovalbannerunsaid': ('criteria', REMOVE_ASKED, REMOVE_UNSAID),
    'criteriasavebannerunguarded': ('criteria', SAVE_ASKED, SAVE_UNGUARDED),
    # พฤติกรรมบ่งชี้
    'behaviorsgateback': ('behaviors', GATE, GATE_BACK),
    'behaviorsloadingline': ('behaviors', LINE, LINE_ALWAYS),
    'behaviorssavebannerunasked': ('behaviors', SAVE_ASKED, SAVE_KEPT),
    'behaviorsremovalsentatthelanding': [('behaviors', REMOVE_TOP, REMOVE_TOP_LATE),
                                         ('behaviors', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'behaviorsremovalbannerunsaid': ('behaviors', REMOVE_ASKED, REMOVE_UNSAID),
    'behaviorssavebannerunguarded': ('behaviors', SAVE_ASKED, SAVE_UNGUARDED),
    # แผนการสอน
    'plangateback': ('plan', GATE, GATE_BACK),
    'planloadingline': ('plan', LINE, LINE_ALWAYS),
    'plansavebannerunasked': ('plan', SAVE_ASKED, SAVE_KEPT),
    'planremovalsentatthelanding': [('plan', REMOVE_TOP, REMOVE_TOP_LATE),
                                    ('plan', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'planremovalbannerunsaid': ('plan', REMOVE_ASKED, REMOVE_UNSAID),
    'plansavebannerunguarded': ('plan', SAVE_ASKED, SAVE_UNGUARDED),
    # กิจกรรมการเรียนรู้
    'activitiesgateback': ('activities', GATE, GATE_BACK),
    'activitiesloadingline': ('activities', LINE, LINE_ALWAYS),
    'activitiessavebannerunasked': ('activities', SAVE_ASKED, SAVE_KEPT),
    'activitiesremovalsentatthelanding': [('activities', REMOVE_TOP, REMOVE_TOP_LATE),
                                          ('activities', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'activitiesremovalbannerunsaid': ('activities', REMOVE_ASKED, REMOVE_UNSAID),
    'activitiessavebannerunguarded': ('activities', SAVE_ASKED, SAVE_UNGUARDED),
    # หลักฐานการประเมิน
    'evidencegateback': ('evidence', GATE, GATE_BACK),
    'evidenceloadingline': ('evidence', LINE, LINE_ALWAYS),
    'evidencesavebannerunasked': ('evidence', SAVE_ASKED, SAVE_KEPT),
    'evidenceremovalsentatthelanding': [('evidence', REMOVE_TOP, REMOVE_TOP_LATE),
                                        ('evidence', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'evidenceremovalbannerunsaid': ('evidence', REMOVE_ASKED, REMOVE_UNSAID),
    'evidencesavebannerunguarded': ('evidence', SAVE_ASKED, SAVE_UNGUARDED),
    # แผนพัฒนาต่อเนื่อง
    'improvementgateback': ('improvement', GATE, GATE_BACK),
    'improvementloadingline': ('improvement', LINE, LINE_ALWAYS),
    'improvementsavebannerunasked': ('improvement', SAVE_ASKED, SAVE_KEPT),
    'improvementremovalsentatthelanding': [('improvement', REMOVE_TOP, REMOVE_TOP_LATE),
                                           ('improvement', REMOVE_ASKED, REMOVE_ASKED_LATE)],
    'improvementremovalbannerunsaid': ('improvement', REMOVE_ASKED, REMOVE_UNSAID),
    'improvementsavebannerunguarded': ('improvement', SAVE_ASKED, SAVE_UNGUARDED),
    # แผนพัฒนาต่อเนื่อง: หัวข้อที่เขียนแล้วถูกตั้งค่าใหม่ทุกครั้งที่รายการส่ง object ใหม่มา
    'improvemententrybyobject': ('entry',
        '  }, [editing, entryId])\n',
        '  }, [editing, entry, entryId])\n'),
}

main(FILES, MUTANTS)
