# -*- coding: utf-8 -*-
"""#152 - คำปฏิเสธของการโหลดใหม่ชนะประโยคว่าบันทึกแล้ว

#152 เป็นตั๋ว `question`: บันทึกสำเร็จแต่การอ่านรายการใหม่ถูกปฏิเสธ จอบอกว่าบันทึกแล้ว และไม่พูด
ถึงการโหลดเลย เพราะ `load` จับความล้มเหลวของตัวเองแล้วคืนค่าปกติ `save` จึงเดินต่อไปตั้งประโยค
สำเร็จทับคำปฏิเสธ เจ้าของงานเลือกข้อ 1 (10 ต.ค. 2569) - **คำปฏิเสธชนะ** และให้สิบแปดจุดตามอีก
สิบแฟ้มที่ทำอย่างนั้นอยู่แล้ว

ที่วัดได้ไม่ใช่เจ็ดจอเจ็ดจุดอย่างที่ตั๋วเขียน แต่เป็น **สิบแฟ้ม สิบแปดจุด** - นับด้วยกลไก
(*handler คอยสิ่งที่โยนไม่ได้ แล้วบอกว่าสำเร็จ*) ไม่ใช่ด้วยคำว่าจอของผู้สอน (#174)

ทางแก้ไม่ใช่การสลับลำดับ: วัดแล้ว `149a` **ล้ม 14** เพราะประโยคที่ขึ้นก่อนการโหลดขึ้นเหนือฟอร์มที่
เพิ่งเปิด `load` จึงคืนค่าว่าวาดสำเร็จหรือไม่ (`return true` ท้าย `try` `return false` ท้าย `catch`)
และทุก handler ถามสองคำถาม

## มัตแตนต์

สิบแปดตัว ตัวละหนึ่งจุด - แต่ละตัวเอา `reloaded` ออกจากเงื่อนไข คือโค้ดก่อน #152 เป๊ะ ๆ ควรฆ่าแถว
ของจุดตัวเองใน `152a` แถวเดียว และไม่แตะแถวอื่น

* `<จอ>saveanyway` - ครึ่งบันทึก เจ็ดจอ
* `<จอ>removalanyway` - ครึ่งลบ เจ็ดจอ
* `weightssaveanyway` `groupsafteranyway` `enrolmentaddanyway` `enrolmentremovalanyway` - สี่จุด
  ที่ไม่มี `showing.current` คุมอยู่เลย ข้อยกเว้นที่ตั๋วเขียนไว้จึงไม่เคยใช้กับมัน

`return true` ของทางที่ถอยกลับไปหน้าแรกใน `SubjectStudents.js` ไม่มีมัตแตนต์: ไม่มีอะไรถูกปฏิเสธ
ในทางนั้น มันจึงเป็นการตัดสินใจที่เขียนไว้ในคอมเมนต์ ไม่ใช่ข้ออ้างของ `152a`

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`FILES` คือสิบจอ จึงชนกับ `140` `146` `149` `151` และใบของแต่ละจอ (`25` `27` `28` `29` `30` `31`
`33` `35` `41`) **ห้ามกวาดใบนี้พร้อมกับใบไหนในนั้น**

#152 ทำให้สามสิบหกตัวในแปดแฟ้มหลุดสมอ เพราะมันยกสองบรรทัดที่สมอเล็งอยู่ - `149` ยี่สิบแปดตัว
(หกค่าคงที่) `140:enrolmentreloadstalewins` `140:enrolmentremovestalewins` `25:addstaysonpage`
และ `savenoreload` ของ `27` `28` `29` `30` `31` เล็งใหม่ด้วยการเติม `reloaded` อย่างเดียวกัน
ยกเว้นห้าตัวที่ *ลบ* การโหลดทิ้ง ซึ่งจะทำให้ `reloaded` ไม่มีตัวตนและแอปหยุดทั้งตัว ห้าตัวนั้นใส่
`const reloaded = true` แทน - ข้ออ้างเดิม (ไม่มีการอ่านใหม่) ในโค้ดที่ยังรันได้ และกวาดซ้ำบนใบ
ของตัวเอง

## การกวาด

กวาด 10 ต.ค. 2569 ทีละตัวด้วย `152a` ทั้งไฟล์ — baseline **18 ผ่านทั้ง 18** (1.0 นาที)
และทั้งสิบแปดตัว **ล้ม 1 ผ่าน 17** ตัวละแถวของตัวเองแถวเดียว อ่านจากชื่อแถวในล็อก
ไม่ใช่จากจำนวน (#52 #146)

สามสิบสามตัวที่เล็งใหม่ถูกกวาดซ้ำวันเดียวกัน ยี่สิบเก้าตัววัดจบ: `savenoreload` ทั้งห้า
(`27a` แถว 4 กับ 8 · `28a` และ `29a` แถว 3 · 4 · 5 · `30a` แถว 3 กับ 5 · `31a` แถว 2 · 3 · 4)
และยี่สิบสี่ตัวของ `149` ที่ **ล้ม 1 ผ่าน 28** ตัวละแถวของจอตัวเอง `31:savenoreload` ล้มน้อยกว่า
ที่ตารางของใบ 31 บันทึก เพราะมัตแตนต์ที่แทนค่ายังเรียกการโหลดอยู่ การเก็บกวาดของแถว 2-4
จึงครบและแถว 5 · 6 · 8 ไม่ปนเปื้อน ยังเหลือสี่ตัวของ `ContinuousImprovement.js` ที่ต้องกวาดใหม่
เพราะเบราว์เซอร์ล้มกลางรันตัวหนึ่งและอีกสามตัวถูกตัดกลางคัน

## วิธีรัน

    python mutation/152-the-refusal-wins.py save
    python mutation/152-the-refusal-wins.py <mutant>
    python mutation/152-the-refusal-wins.py restore

แถวอยู่ใน `e2e/tests/152a-the-refusal-wins.spec.js`
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
    'weights': 'frontend/src/pages/GradingWeights.js',
    'groups': 'frontend/src/pages/StudentGroups.js',
    'enrolment': 'frontend/src/pages/SubjectStudents.js',
}

# เจ็ดจอรูปเดียวกัน - `setEditing(null)` ข้างบนแยกครึ่งบันทึกออกจากครึ่งลบ ซึ่งมี
# `setRemoving(null)` สมอจึงไม่กำกวมในแฟ้มเดียวกัน (harness ยืนยันว่าเจอครั้งเดียว)
SAVE_READS = ("        setEditing(null)\n"
              "      }\n"
              "      const reloaded = await load(() => onScreen.current === load)\n"
              "      if (reloaded && showing.current === sent)\n")
SAVE_ANYWAY = ("        setEditing(null)\n"
               "      }\n"
               "      await load(() => onScreen.current === load)\n"
               "      if (showing.current === sent)\n")

REMOVE_READS = ("      setRemoving(null)\n"
                "      const reloaded = await load(() => onScreen.current === load)\n"
                "      if (reloaded && showing.current === sent)\n")
REMOVE_ANYWAY = ("      setRemoving(null)\n"
                 "      await load(() => onScreen.current === load)\n"
                 "      if (showing.current === sent)\n")

# สามจอที่เหลือเขียนประโยคของตัวเองคนละรูป และสมอตัดก่อนประโยคภาษาไทยทุกตัว - สิ่งที่สมอต้องการ
# คือบรรทัดที่เปลี่ยน ไม่ใช่ข้อความที่คนอ่าน
WEIGHTS_READS = ("      const reloaded = await load(() => onScreen.current === load)\n"
                 "      if (reloaded) setNotice(")
WEIGHTS_ANYWAY = ("      await load(() => onScreen.current === load)\n"
                  "      setNotice(")

# `setWrites` อยู่ที่เดิม: มันไม่ใช่ประโยค และ #152 เป็นเรื่องของประโยค
GROUPS_READS = ("    const reloaded = await load(() => onScreen.current === load)\n"
                "    setWrites(count => count + 1)\n"
                "    if (reloaded) setNotice({ error: false, message })\n")
GROUPS_ANYWAY = ("    await load(() => onScreen.current === load)\n"
                 "    setWrites(count => count + 1)\n"
                 "    setNotice({ error: false, message })\n")

ADD_READS = ("      const reloaded = await reload()\n"
             "      if (reloaded)\n"
             "        setNotice({\n")
ADD_ANYWAY = ("      await reload()\n"
              "      setNotice({\n")

REMOVE_ENROL_READS = ("      let reloaded = true\n"
                      "      if (data.students.length === 1 && page > 1) setPage(page - 1)\n"
                      "      else reloaded = await load(() => onScreen.current === load)\n"
                      "      if (reloaded)\n"
                      "        setNotice({\n")
REMOVE_ENROL_ANYWAY = ("      if (data.students.length === 1 && page > 1) setPage(page - 1)\n"
                       "      else await load(() => onScreen.current === load)\n"
                       "      setNotice({\n")

# เขียนเป็น dict ตรง ๆ ไม่ใช่ loop - `anchors.py` อ่าน `MUTANTS` จาก AST
MUTANTS = {
    'clossaveanyway': ('clos', SAVE_READS, SAVE_ANYWAY),
    'closremovalanyway': ('clos', REMOVE_READS, REMOVE_ANYWAY),
    'criteriasaveanyway': ('criteria', SAVE_READS, SAVE_ANYWAY),
    'criteriaremovalanyway': ('criteria', REMOVE_READS, REMOVE_ANYWAY),
    'behaviorssaveanyway': ('behaviors', SAVE_READS, SAVE_ANYWAY),
    'behaviorsremovalanyway': ('behaviors', REMOVE_READS, REMOVE_ANYWAY),
    'plansaveanyway': ('plan', SAVE_READS, SAVE_ANYWAY),
    'planremovalanyway': ('plan', REMOVE_READS, REMOVE_ANYWAY),
    'activitiessaveanyway': ('activities', SAVE_READS, SAVE_ANYWAY),
    'activitiesremovalanyway': ('activities', REMOVE_READS, REMOVE_ANYWAY),
    'evidencesaveanyway': ('evidence', SAVE_READS, SAVE_ANYWAY),
    'evidenceremovalanyway': ('evidence', REMOVE_READS, REMOVE_ANYWAY),
    'improvementsaveanyway': ('improvement', SAVE_READS, SAVE_ANYWAY),
    'improvementremovalanyway': ('improvement', REMOVE_READS, REMOVE_ANYWAY),
    'weightssaveanyway': ('weights', WEIGHTS_READS, WEIGHTS_ANYWAY),
    'groupsafteranyway': ('groups', GROUPS_READS, GROUPS_ANYWAY),
    'enrolmentaddanyway': ('enrolment', ADD_READS, ADD_ANYWAY),
    'enrolmentremovalanyway': ('enrolment', REMOVE_ENROL_READS, REMOVE_ENROL_ANYWAY),
}

main(FILES, MUTANTS)
