# -*- coding: utf-8 -*-
"""#203 - คำปฏิเสธชนะในสิบจอฝ่ายบริหารที่ #152 ไม่ได้แก้

เจ้าของระบบตัดสินเมื่อ 10 ตุลาคม 2569 ว่าเมื่อการเขียนสำเร็จแต่การอ่านรายการใหม่ถูกปฏิเสธ
คนใช้งานต้องเห็นคำปฏิเสธ ไม่ใช่ประโยคว่าบันทึกเรียบร้อยแล้ว #152 ทำให้ครบสิบจอของผู้สอน
#203 คือส่วนที่เหลือ: ยี่สิบจุดในสิบจอฝ่ายบริหาร ซึ่ง census ของ #200
(`frontend/scripts/swallowed-refusals.js`) เป็นตัวหา และยังเป็น 20 จาก 37 เมื่อวัดซ้ำวันที่
12 ตุลาคม 2569 ก่อนแก้อะไรทั้งนั้น

การแก้มีรูปเดียวกับ #152 ทุกตัวอักษร: `load` ตอบว่ามันวาดได้หรือไม่ (`return true` ท้าย `try`
และ `return false` ใน `catch`) แล้ว handler อ่านคำตอบนั้นก่อนพูดประโยคของตัวเอง

## มิวแทนต์

สิบแปดตัวแรกคือหนึ่งตัวต่อหนึ่งจุด และทำสิ่งเดียวกันหมด: ให้ `reloaded` เป็นจริงเสมอด้วย
`|| true` ประโยคจึงถูกพูดทับคำปฏิเสธเหมือนก่อนแก้ แถวที่แต่ละตัวต้องฆ่าคือแถวของจุดนั้นเอง
ใน `e2e/tests/203a-the-refusal-wins-on-the-admin-screens.spec.js`

ยี่สิบจุดแต่สิบแปดตัว เพราะสองจุดของ `RubricCriteria.js` ไม่มีมัตแตนต์ และนั่นเป็นผลของการกวาด
ไม่ใช่การลืม: `load` ของจอนั้นไม่ตั้งแบนเนอร์เมื่อถูกปฏิเสธ มันตั้ง `refusal` ซึ่งแทนที่ทั้งจอ
ด้วยการ์ด `<Notice>` จึงไม่ถูกวาด และประโยคที่ handler ตั้งไว้ไม่มีที่ไปทั้งก่อนแก้และหลังแก้
มัตแตนต์สองตัวที่เขียนไว้ตามรูปของอีกสิบแปดจุดจึง **รอดทั้งคู่ 0 จาก 22** เมื่อ 12 ตุลาคม 2569
และถูกถอดออก สองแถวของจอนั้นอยู่ต่อในฐานะตาข่ายที่บอกว่ามันเป็นตาข่าย และยืนยันกลไกด้วย
(#45 การอ่านแบบที่หนึ่งของการกวาด และ #47) วันที่จอนั้นเปลี่ยนไปวาดแบนเนอร์เหนือตารางแบบอีกเก้าจอ
คือวันที่ข้อนี้ไปถึงได้ และสองตัวนั้นคือตัวที่ต้องเขียนกลับ

อีกสองตัวอยู่ที่สาขาที่ census มองไม่เห็น เพราะ handler ไม่ได้ await loader เลย - `save` ของ
`Students.js` ที่ขอหน้าหนึ่งแทนการอ่านหน้าที่อยู่ ซึ่งการอ่านนั้นเป็นของ effect:

* `studentsmovedanyway` - พูดประโยคตอนย้ายหน้า แทนที่จะส่งต่อให้ `waiting` ฆ่าแถวที่สองของคู่นั้น
* `studentsdrewunsaid` - `load` วาดแล้วแต่ไม่พูดประโยคที่รออยู่ ฆ่าแถวแรก

สองแถวนั้นเป็นคู่กันโดยเจตนา: ถ้ามีแต่แถวที่สอง การลบบรรทัดที่พูดประโยคที่รออยู่ทิ้งไปเลย
จะไม่ทำให้อะไรแดง อีกหกจอที่ถอยหน้าหลังการลบ และการคัดลอกภาคเรียนของ `Offerings.js`
เป็นโค้ดรูปเดียวกัน - ที่วัดที่นี่คือรูปของมัน ไม่ใช่ทางเข้าของแต่ละจอ (#191)

## สิ่งที่ต้องอ่านให้ถูกตอนอ่านผลกวาด

มิวแทนต์ที่รอดในตระกูลนี้เคยหมายถึง *แถวอ่านผิดจังหวะ* - การอ่านที่เจ็ดของ `CLAUDE.md` ซึ่ง
#152 จ่ายด้วยมิวแทนต์สองตัวที่รอด 21 จาก 21 ประโยคที่ถูกคำปฏิเสธเขียนทับหายไปก่อนจุดนิ่งทุกจุด
ทุกแถวของ `203a` จึงอ่านทีละเฟรมด้วย `e2e/support/frame-sampler.js` ไม่ใช่อ่านครั้งเดียวตอนนิ่ง
#203 เจอข้อนี้ด้วยราคาถูกกว่า: สิบเก้าจากยี่สิบแถวเขียวทับโค้ดที่ยังไม่แก้ ก่อนเขียนมิวแทนต์
ตัวไหนเลย

## ผลกวาด

วันที่ 12 ตุลาคม 2569 baseline ของ `203a` คือ **22 ผ่าน จาก 22** (1.3 นาที) และก่อนแก้โค้ด
ทั้งยี่สิบแถวแรกแดงที่ `neverSaid` ทุกแถว - ไม่ใช่แดงเพราะจออื่นหรือเพราะคำปฏิเสธไม่มา

กวาดทีละตัวด้วย `203a` ทั้งไฟล์วันเดียวกัน: ยี่สิบสองตัวที่เขียนไว้ตอนนั้น **ยี่สิบตัวล้ม 1 ผ่าน 21**
และแถวที่ตายคือแถวของจุดของตัวเองทุกตัว ไม่มีตัวไหนล้มแถวข้างเคียง อีกสองตัวของ
`RubricCriteria.js` รอด 0 จาก 22 ด้วยเหตุผลข้างบน และถูกถอดออก เหลือยี่สิบตัว — สิบแปดตัว
ตัวละหนึ่งจุด บวกสองตัวของสาขาที่ย้ายหน้าที่จอนักศึกษา
ผลของแต่ละมิวแทนต์อยู่ในตารางเกณฑ์ของจอนั้น ๆ ใน `docs/acceptance/`

## วิธีใช้

    python mutation/203-the-refusal-wins-on-the-admin-screens.py save
    python mutation/203-the-refusal-wins-on-the-admin-screens.py <mutant>
    python mutation/203-the-refusal-wins-on-the-admin-screens.py restore

แถวที่มิวแทนต์เหล่านี้ค้ำ: `e2e/tests/203a-the-refusal-wins-on-the-admin-screens.spec.js`
"""
from harness import main

FILES = {
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
    'subjects': 'frontend/src/pages/Subjects.js',
    'pairs': 'frontend/src/pages/ProgramSubjects.js',
    'rubrics': 'frontend/src/pages/Rubrics.js',
    'plos': 'frontend/src/pages/Plos.js',
    'users': 'frontend/src/pages/Users.js',
    'students': 'frontend/src/pages/Students.js',
    'offerings': 'frontend/src/pages/Offerings.js',
}

# `|| true` แทนการลบการอ่านทิ้ง เพื่อให้ `reloaded` ยังถูกใช้อยู่: มิวแทนต์ตัวหนึ่งควรอ้างอะไร
# อย่างเดียว และข้อนี้คือ *ไม่สนใจคำตอบของการอ่าน* ไม่ใช่ *ตัวแปรที่ไม่มีใครใช้* (#152 ใช้รูปนี้)
# #239 - `SAVE_READS` is three lines longer since 28 ต.ค. 2569. Nothing but the
# two `Users.js` mutants reads it (`PLOS_REMOVAL_READS` is a byte-identical twin
# of its own), so the restatement reaches no other screen's mutant - #202's tenth
# reading. Both rows were re-swept: 203a ล้ม 1 ผ่าน 21, each at its own site.
SAVE_READS = (
    "      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n"
    "      if (reloaded?.handedTo) {\n"
    "        if (showing.current === sent) waiting.current = { of: reloaded.handedTo, said }\n"
    "      } else if (reloaded && showing.current === sent) setNotice(said)\n"
)
SAVE_ANYWAY = (
    "      const drawing = onScreen.current\n      const reloaded = (await drawing(() => onScreen.current === drawing)) || true\n"
    "      if (reloaded?.handedTo) {\n"
    "        if (showing.current === sent) waiting.current = { of: reloaded.handedTo, said }\n"
    "      } else if (reloaded && showing.current === sent) setNotice(said)\n"
)

# การลบที่ถอยหน้าได้: การอ่านอยู่ในสาขา `else` ของมัน
REMOVAL_READS = (
    "        const drawing = onScreen.current\n        const reloaded = await drawing(() => onScreen.current === drawing)\n"
    "        if (reloaded && showing.current === sent) setNotice(said)\n"
)
REMOVAL_ANYWAY = (
    "        const drawing = onScreen.current\n        const reloaded = (await drawing(() => onScreen.current === drawing)) || true\n"
    "        if (reloaded && showing.current === sent) setNotice(said)\n"
)

# สี่จอที่ฟอร์มปิดทับตารางและปิดทุกปุ่ม - #202 วัดแล้วว่าไม่มีใครแย่งจอได้ จึงไม่มี `showing`
MODAL_READS = (
    "      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n"
    "      if (reloaded) setNotice(said)\n"
)
MODAL_ANYWAY = (
    "      const drawing = onScreen.current\n      const reloaded = (await drawing(() => onScreen.current === drawing)) || true\n"
    "      if (reloaded) setNotice(said)\n"
)

# `Plos.js` ถาม `onScreen` ด้วยหลักสูตรอยู่จน #211 ย้าย ref ไปถือตัว loader
# รูปข้างล่างจึงตรงกับ `Users.js` แล้ว ความผิดของมัตแตนต์คงเดิม: `|| true`
PLOS_MODAL_READS = (
    "      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n"
    "      if (reloaded) setNotice(said)\n"
)
PLOS_MODAL_ANYWAY = (
    "      const drawing = onScreen.current\n      const reloaded = (await drawing(() => onScreen.current === drawing)) || true\n"
    "      if (reloaded) setNotice(said)\n"
)
PLOS_REMOVAL_READS = (
    "      const drawing = onScreen.current\n      const reloaded = await drawing(() => onScreen.current === drawing)\n"
    "      if (reloaded && showing.current === sent) setNotice(said)\n"
)
PLOS_REMOVAL_ANYWAY = (
    "      const drawing = onScreen.current\n      const reloaded = (await drawing(() => onScreen.current === drawing)) || true\n"
    "      if (reloaded && showing.current === sent) setNotice(said)\n"
)

# `Users.js` มีสองจุดที่หน้าตาเหมือนกันทั้งบรรทัด - `save` กับสวิตช์สถานะ สิ่งที่แยกสองจุดนี้
# คือ `catch` ของมันเอง (#202: ของ `toggle` ไม่ได้ถาม `showing`)
USERS_SAVE_READS = SAVE_READS + "    } catch (error) {\n      if (showing.current === sent) report(error)\n"
USERS_SAVE_ANYWAY = SAVE_ANYWAY + "    } catch (error) {\n      if (showing.current === sent) report(error)\n"
USERS_TOGGLE_READS = SAVE_READS + "    } catch (error) {\n      setSwitching(null)\n      report(error)\n"
USERS_TOGGLE_ANYWAY = SAVE_ANYWAY + "    } catch (error) {\n      setSwitching(null)\n      report(error)\n"

# `Offerings.js` มีสามจุดและอยู่คนละชั้นของย่อหน้า: `save` ที่ 6, การคัดลอกที่ 8, การยกเลิกที่ 10
COPY_READS = REMOVAL_READS
COPY_ANYWAY = REMOVAL_ANYWAY
OFFERING_REMOVAL_READS = (
    "          const drawing = onScreen.current\n          const reloaded = await drawing(() => onScreen.current === drawing)\n"
    "          if (reloaded && showing.current === sent) setNotice(said)\n"
)
OFFERING_REMOVAL_ANYWAY = (
    "          const drawing = onScreen.current\n          const reloaded = (await drawing(() => onScreen.current === drawing)) || true\n"
    "          if (reloaded && showing.current === sent) setNotice(said)\n"
)

# สาขาที่ย้ายหน้า: ประโยคถูกส่งต่อให้ `waiting` และ `load` เป็นคนพูดเมื่อวาดได้
# #205 - the handover is written with the key of the read it is for.
MOVED_READS = (
    "        if (showing.current === sent) {\n"
    "          const target = readOf(1, program)\n"
    "          waiting.current = { of: target, said }\n"
    "        }\n"
    "        setPage(1)\n"
)
# #205 - the branch that reloads by hand hands its sentence over as well, so
# saying it here is saying it whatever the read answered.
STUDENTS_BY_HAND_READS = "        await drawing(() => onScreen.current === drawing)\n"
STUDENTS_BY_HAND_ANYWAY = (
    "        await drawing(() => onScreen.current === drawing)\n"
    "        setNotice(said)\n"
)
OFFERINGS_BY_HAND_READS = STUDENTS_BY_HAND_READS
OFFERINGS_BY_HAND_ANYWAY = STUDENTS_BY_HAND_ANYWAY
MOVED_ANYWAY = (
    "        setNotice(said)\n"
    "        setPage(1)\n"
)

# #205 - the sentence is said only by the read it is of.
DREW_READS = (
    "        setData(answer)\n"
    "        if (waiting.current && waiting.current.of === key) {\n"
    "          setNotice(waiting.current.said)\n"
    "        }\n"
)
DREW_UNSAID = "        setData(answer)\n"

MUTANTS = {
    'departmentssaveanyway': ('departments',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'departmentsremovalanyway': ('departments',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'programssaveanyway': ('programs',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'programsremovalanyway': ('programs',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'subjectssaveanyway': ('subjects',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, department), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'subjectsremovalanyway': ('subjects',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, department), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'pairssaveanyway': ('pairs',
        '      waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      setNotice(said)\n'),
    'pairsremovalanyway': ('pairs',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'rubricssaveanyway': ('rubrics',
        '      waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      setNotice(said)\n'),
    'rubricsremovalanyway': ('rubrics',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'plossaveanyway': ('plos', PLOS_MODAL_READS, PLOS_MODAL_ANYWAY),
    'plosremovalanyway': ('plos', PLOS_REMOVAL_READS, PLOS_REMOVAL_ANYWAY),
    'userssaveanyway': ('users', USERS_SAVE_READS, USERS_SAVE_ANYWAY),
    'userstoggleanyway': ('users', USERS_TOGGLE_READS, USERS_TOGGLE_ANYWAY),
    'studentssaveanyway': ('students', STUDENTS_BY_HAND_READS, STUDENTS_BY_HAND_ANYWAY),
    'studentsmovedanyway': ('students', MOVED_READS, MOVED_ANYWAY),
    'studentsdrewunsaid': ('students', DREW_READS, DREW_UNSAID),
    'offeringssaveanyway': ('offerings',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n'
        '      }\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n',
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === drawing)\n'
        '      if (showing.current === sent) setNotice(said)\n'),
    'offeringscopyanyway': ('offerings', OFFERINGS_BY_HAND_READS, OFFERINGS_BY_HAND_ANYWAY),
    'offeringsremovalanyway': ('offerings',
        '        if (showing.current === sent) {\n'
        '          waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n'
        '        }\n'
        '        const reader = onScreen.current\n'
        '        await reader(() => onScreen.current === reader)\n',
        '        const reader = onScreen.current\n'
        '        await reader(() => onScreen.current === reader)\n'
        '        if (showing.current === sent) setNotice(said)\n'),
}

main(FILES, MUTANTS)
