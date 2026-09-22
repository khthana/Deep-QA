# -*- coding: utf-8 -*-
"""#151 - การโหลดใหม่ที่ล้มเหลวเก็บรายการที่วาดไว้ และฟอร์มที่เปิดอยู่บนมัน

ตั้งแต่ #149 เจ็ดจอของผู้สอนเก็บรายการและฟอร์มที่เปิดอยู่ไว้ระหว่างการโหลดใหม่ แต่การโหลดที่
*ล้มเหลว* ยังล้างทั้งคู่: `catch` ของ `load` ทุกจอตั้ง `data` เป็น `null` และรายการกับฟอร์มถูกวาด
ใน `{data && (` ฟอร์มจึงถูกถอด และสิ่งที่พิมพ์ไว้หายไปด้วย

คำตอบ (22 ก.ย. 2569) คือคำตอบของ #149 ต่อไปอีกขั้น: การโหลดที่ล้มเหลวเก็บสิ่งที่จอวาดไว้ล่าสุด
และคำปฏิเสธขึ้นเป็นแบนเนอร์เหนือมัน การโหลดครั้งแรกที่ล้มไม่มีอะไรให้เก็บ `loading && !data`
วาดเหมือนเดิม

## มัตแตนต์

สองตัวต่อจอ

* `<จอ>blanks` - ใส่ `setData(null)` กลับเข้า `catch` คือโค้ดก่อน #151 ควรฆ่าสองแถวของจอตัวเอง
  ใน `151a` ที่การมองเห็นฟอร์มและที่รายการ และไม่ฆ่า *the failed reload's refusal* ซึ่งขึ้น
  ทั้งสองทาง (แถวนั้นไม่ใช่ข้ออ้างของตั๋วนี้ คำปฏิเสธขึ้นอยู่แล้วก่อน #151)
* `<จอ>blinks` - ล้าง `data` แล้วคืนมันในจังหวะถัดไป ฟอร์มถูกถอดแล้ววาดใหม่ เปิดอยู่แต่สิ่งที่
  พิมพ์หายไป ควรฆ่าแถวฟอร์มแถวเดียว ที่ *what was typed* - เพิ่มหลังการตรวจ เพราะ `blanks`
  ตายที่การมองเห็นซึ่งอ่านก่อน ครึ่ง *สิ่งที่พิมพ์* จึงไม่มีมัตแตนต์ไปถึง (#96 #102)

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`FILES` คือเจ็ดจอ จึงชนกับ `146` `149` ใบของแต่ละจอ (`27` `28` `29` `31` `32` `33` `35` `41`)
และ `147` (`ActivityEvidence.js`) **ห้ามกวาดใบนี้พร้อมกับใบไหนในนั้น**

#151 ทำให้สี่ตัวในใบอื่นหลุดสมอ เพราะมันยกบรรทัด `setData(null)` ที่ถูกลบ -
`28:swallowrefusal` `29:swallowrefusal` `31:swallowrefusal` `32:swallowrefusal`
เล็งใหม่ที่ `if (isCurrent()) {` ข้างคำปฏิเสธ และกวาดซ้ำบนใบของตัวเอง

## การกวาด

กวาดเมื่อ 22 ก.ย. 2569 ทีละตัว - baseline ของ `151a` **14 ผ่านทั้ง 14** (0.9 นาที) เจ็ดตัว `blanks`
**ล้ม 2 ผ่าน 12** (0.9 นาที) ที่สองแถวของจอตัวเอง

หลังการตรวจ `151a` ถูกแก้ที่ doc block หลังการกวาดนั้น (บรรทัดเลื่อนหนึ่ง) และเพิ่ม `blinks`
จึงกวาดใหม่ทั้งสิบสี่ตัวบนข้อความสุดท้าย - baseline **14 ผ่านทั้ง 14** (0.8 นาที) `blanks` ทุกตัว
**ล้ม 2 ผ่าน 12** ที่การมองเห็นฟอร์มและที่รายการ `blinks` ทุกตัว **ล้ม 1 ผ่าน 13** ที่
*what was typed* ของจอตัวเอง แถวเดียว

สี่ตัวที่เล็งใหม่ กับ spec ของใบตัวเอง - `28a` 8 ผ่าน `28:swallowrefusal` ล้ม 2 (แถว 7 และ 8)
`29a` 8 ผ่าน `29:swallowrefusal` ล้ม 2 (แถว 7 และ 8) `31a` 8 ผ่าน `31:swallowrefusal` ล้ม 1
(แถว 7) `32a` 9 ผ่าน `32:swallowrefusal` ล้ม 1 (แถว 8) - แถวเดิมที่ใบของมันอ้าง

แถว ⚙ อยู่บนใบของแต่ละจอ (`27` `28` `29` `31` `33` `35` `41`) รูปเดียวกับ `149`

## วิธีรัน

    python mutation/151-failed-reload-keeps-the-list.py save
    python mutation/151-failed-reload-keeps-the-list.py <mutant>
    python mutation/151-failed-reload-keeps-the-list.py restore

แถวอยู่ใน `e2e/tests/151a-failed-reload-keeps-the-list.spec.js`
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
}

KEPT = ("      if (isCurrent()) {\n"
        "        if (!error.expired) setNotice({ error: true, message: error.message })")
BLANKED = ("      if (isCurrent()) {\n"
           "        setData(null)\n"
           "        if (!error.expired) setNotice({ error: true, message: error.message })")
BLINKED = ("      if (isCurrent()) {\n"
           "        setData(d => { setTimeout(() => setData(d)); return null })\n"
           "        if (!error.expired) setNotice({ error: true, message: error.message })")

MUTANTS = {
    'closblanks': ('clos', KEPT, BLANKED),
    'criteriablanks': ('criteria', KEPT, BLANKED),
    'behaviorsblanks': ('behaviors', KEPT, BLANKED),
    'planblanks': ('plan', KEPT, BLANKED),
    'activitiesblanks': ('activities', KEPT, BLANKED),
    'evidenceblanks': ('evidence', KEPT, BLANKED),
    'improvementblanks': ('improvement', KEPT, BLANKED),
    'closblinks': ('clos', KEPT, BLINKED),
    'criteriablinks': ('criteria', KEPT, BLINKED),
    'behaviorsblinks': ('behaviors', KEPT, BLINKED),
    'planblinks': ('plan', KEPT, BLINKED),
    'activitiesblinks': ('activities', KEPT, BLINKED),
    'evidenceblinks': ('evidence', KEPT, BLINKED),
    'improvementblinks': ('improvement', KEPT, BLINKED),
}

main(FILES, MUTANTS)
