# -*- coding: utf-8 -*-
"""#202 - ประโยคสำเร็จเป็นของจอที่ถูกขอ ที่ handler ซึ่งไม่ใช่ `save`

#146 ให้กฎนี้กับการเขียนที่ปิดฟอร์ม และไม่มีใครถามมันที่อื่นเลย สิบเอ็ด handler ใน
สิบจอวางประโยคว่าสำเร็จไว้โดยไม่ถามอะไร คำตอบที่มาถึงจอที่คนย้ายไปแล้วจึงวาง
*ลบ…เรียบร้อยแล้ว* ไว้เหนือฟอร์มของอย่างอื่น ในที่ที่ประโยคอ่านได้ว่าเป็นเรื่องของ
สิ่งที่อยู่ตรงหน้า แถวอยู่ใน
`e2e/tests/202a-the-sentence-belongs-to-the-screen-asked.spec.js`

## สามทรง ไม่ใช่ทรงเดียว

**หลังคำถาม** เก้าจุดเป็น `confirmRemoval` และขณะ `ConfirmDialog` เปิดอยู่ ตารางข้างใต้
ยังมีชีวิต ผ้าคลุมเป็น `fixed inset-0` และไม่กักอะไรเลย ปุ่มทุกปุ่มของตารางยังตอบ Enter
- นั่นคือ #204 ซึ่งปิดเมื่อ 18 ต.ค. 2569 ด้วย**ครึ่งที่ประกาศ**เท่านั้น (กล่องรับโฟกัสตอนเปิดแล้ว
และบอกบทบาทกับภาวะโมดัลของตัวเอง) ส่วน**ครึ่งที่ขัง** คือ trap หรือ `inert` ถูกเลื่อนเป็น #217
ทางเข้านี้หมดอายุเมื่อ #217 ลงในวันเดียวกัน (18 ต.ค. 2569) สองแถวนั้นถูกเล็งใหม่
ไปที่การกด ยกเลิก ปิดคำถามแล้วคลิกคอนโทรลตามปกติ ไม่ได้เหลือเป็นตาข่าย (#203)
และสองตัวข้างล่างต้องถอด ประโยคว่าโฟกัสยังอยู่ที่ `ลบ` เป็นบันทึกของก่อน 18 ต.ค. 2569

**ข้างรายการ** อีกสองจุดคือ `Users.toggle` กับ `Offerings.runCopy` ซึ่งไม่ถามอะไรก่อน
รายการยังอยู่ แก้ไข ของอีกแถวจึงเป็นการคลิกธรรมดา

**จอที่ไม่มี ref เลย** ผลการเรียนรู้ระดับหลักสูตร เกณฑ์การให้คะแนน เกณฑ์ย่อย และ
รายวิชาของหลักสูตร ไม่เคยมี `showing` เพราะ #146 นับจอที่ `save` ถูกแซงได้ และสี่จอนั้น
ปิด ยกเลิก ไว้ระหว่างการบันทึก ref มาถึงพร้อม #202 และมาเพื่อ `confirmRemoval`
`202:plosnorefatadd` คือตัวที่บอกว่า *ปุ่มเพิ่มต้องเขียน ref* ไม่ใช่แค่ *มี ref อยู่*

## ทำไม `!== null` ฆ่าสองแถว

`!== null` คือ guard ที่จำว่า *มีฟอร์มเปิดอยู่ไหม* แทนที่จะจำว่า *ฟอร์มไหน* ซึ่งเป็น
ความผิดที่คนเขียนจริง ๆ จะเขียน (#146 เลือกรูปเดียวกัน) บนแถวลบที่นี่มันออกสองทาง
พร้อมกัน - แถวที่คนย้ายไปแล้วมีฟอร์มเปิดอยู่ ประโยคจึงถูกพูด และแถวที่ไม่มีใคร
มาแทนจอ `showing.current` ยังเป็น `null` ประโยคจึงเงียบ หนึ่งตัวจึงฆ่าทั้งสองแถว
ของจอนั้น และข้อที่แต่ละแถวเพิ่มคือทางเข้าของตัวเองไปถึงที่นั่นจริง (#191)
`departmentssaysnothing` เป็นตัวที่แยกสองข้อนั้นออกจากกัน - มันจับ `{}` ใหม่แทน ref
guard จึงเป็นเท็จตลอด ฆ่าแถวบวกตัวเดียวและปล่อยแถวลบไว้

## สิ่งที่ตั๋วนี้ไม่ได้เปลี่ยน

สิ่งที่หน้าจอปิดการใช้งาน และสิ่งที่ทำเสมอ - กล่องคำถามปิด หน้าถอยกลับ แผงถูกอ่านใหม่
และรายการโหลดใหม่ ไม่ว่าการเทียบจะออกทางไหน (#131) คำปฏิเสธก็ไม่ได้ถูกถาม
เป็นของคนไม่ใช่ของจอ (#179)

## สมอของตั๋วอื่นที่ตั๋วนี้ขยับ - 11 ต.ค. 2569

การแก้นี้ทำให้สมอเก้าตัวของสามตั๋วเลื่อน `python mutation/anchors.py` เป็นคนบอก

* `139:plosaddkeepsask` `139:pairsaddkeepsask` `139:rubricsaddkeepsask`
  `139:criteriaaddkeepsask` - ปุ่มเพิ่มของสี่จอได้ `showing.current = {}` เพิ่มเข้ามา
  สมอจึงเจอ 0 ที่ เล็งใหม่ด้วยการใส่บรรทัดนั้นลงไปทั้งสองข้าง เหมือนที่ภาควิชามีอยู่แล้ว
* `140:userstogglestalewins` - ประโยคของ `toggle` เข้าไปอยู่ในก้อน บรรทัดก่อนการโหลดใหม่
  จึงเป็น `}` ไม่ใช่ `})` และ `save` ก็มีคู่เดียวกัน ที่แยกมันคือหาง - `toggle` ไม่มี `finally`
* `146:departmentsclosewins` `146:programsclosewins` `146:subjectsclosewins`
  `146:usersclosewins` - `confirmRemoval` ถามคำถามเดียวกันที่ย่อหน้าเท่ากัน สมอบรรทัดเดียว
  จึงเจอสองที่ ขยายสมอลงไปอีกบรรทัดคือสิ่งที่อยู่ในก้อน `save` ปิดฟอร์ม การลบไม่มีฟอร์มจะปิด
  (ข้อมูลนักศึกษากลางถือ `adding` ใบเดียว จึงมีคู่ของตัวเอง)

*การตรวจสมอบอกว่ามัตแตนต์ไม่เกาะแล้ว มีแต่การกวาดที่บอกว่ามันไม่พิสูจน์อะไรแล้ว -
รวมถึงตอนที่การเล็งใหม่เป็นการแก้ที่ถูก* (#107, #68) ทั้งเก้าตัวจึงถูกกวาดซ้ำ ผลอยู่ใน
หัวข้อ #202 ของ `docs/lessons.md`

## วิธีรัน

    python mutation/202-the-sentence-belongs-to-the-screen-asked.py save
    python mutation/202-the-sentence-belongs-to-the-screen-asked.py <mutant>
    python mutation/202-the-sentence-belongs-to-the-screen-asked.py restore

## ครึ่งหลัง — สี่จุดที่ประโยคขี่อยู่บนธงของ #152 (11 ต.ค. 2569)

ตัวนับที่รายงานไว้ข้างบนอ่านแปดบรรทัดเหนือประโยค จึงอ่านสี่จุดผิดทั้งสองทาง:
`if (await reload(said))` อยู่ *ใต้* ประโยคจึงอ่านว่าไม่มีด่าน และ
`const reloaded = await drawing(() => onScreen.current === drawing)` บรรทัดเหนือประโยค
อ่านว่าเป็นการเทียบ ref ทั้งที่มันเป็นธงของ #152 ถามจากโค้ดแทน — ผู้บริโภคธงนั้นทุกตัว
และถามว่ามันถาม ref ด้วยไหม — ได้สี่จุด: `SubjectStudents.add` `SubjectStudents.remove`
`GradingWeights.save` และ `StudentGroups.after`

`load` คืน `true` ท้าย `try` แม้ `isCurrent()` เป็นเท็จ ธงจึงแปลว่า *ไม่ถูกปฏิเสธ*
ไม่ใช่ *วาดแล้ว* ทางเข้าที่วัดได้คือ `Pager` ที่ไม่ปิดตอน `busy` (#199): กด *ถัดไป*
ระหว่างที่การเขียนค้างอยู่ จอย้ายไปหน้า 2 แล้วประโยคว่าเพิ่มแล้วขึ้นทับหน้าใหม่

#199 เสนอสามทาง ที่เลือกคือทางที่สาม — ถามคำถามของ #146 ที่จุดเรียกด้วย ref ที่จอนี้มีอยู่
(`onScreen`) ทางที่สอง (ให้ `load` คืน `isCurrent()`) จะเปลี่ยน*ความหมาย*ของธงใน 10 แฟ้ม
และต้องกวาด `152` `140` `25` ใหม่ทั้งสามแฟ้ม ทางที่หนึ่ง (ปิด pager ตอน `busy`) เป็นคำถาม
ของเจ้าของว่าจอควรปิดอะไร (#142) และปิดทางเข้านี้ทางเดียว

แต่ราคาที่เขียนไว้ตอนเลือกว่า *ทางที่สามไม่แตะมัตแตนต์ของแฟ้มอื่น* นั้นผิด และ
`python mutation/anchors.py` บอกทันทีที่ guard ลง: บรรทัดที่ทางที่สามแก้คือบรรทัดที่มัตแตนต์
ของสามตั๋วที่ปิดแล้วอ้างอยู่ จึงยกสมอหกตัว — `140:enrolmentremovestalewins`
`152:weightssaveanyway` `152:groupsafteranyway` `152:enrolmentaddanyway`
`152:enrolmentremovalanyway` และ `25:addstaysonpage` — ที่ต่างกันกับทางที่สองคือ
ทางที่สองเปลี่ยน*ความหมาย*ของธงใน 10 แฟ้ม ส่วนทางนี้เปลี่ยน*ตัวอักษร*ที่สี่จุด
ข้ออ้างของทั้งหกตัวคงเดิม เล็งใหม่แล้วกวาดใหม่ทุกตัว

มัตแตนต์สองตัวของครึ่งหลังเอา `&& onScreen.current === sent` ออกจากจุดของตัวเอง — คือโค้ด
ก่อนครึ่งหลังเป๊ะ ๆ ซึ่งเป็นสิ่งที่ทำให้การวินิจฉัยของ #199 เป็นข้ออ้างที่ชุดทดสอบค้ำไว้
ไม่ใช่ประโยคบนใบ (#115) อีกสองจุด — `GradingWeights` และ `StudentGroups` — ได้ guard
เดียวกันแต่ไม่มีมัตแตนต์และไม่มีแถว เพราะทางเข้าของมันคือการสลับตอนเรียนระหว่างที่การเขียน
ค้างอยู่ ซึ่งยังไม่มีแถวไหนเดิน ใบของทั้งสองจอเขียนไว้ว่ายังไม่ถูกพิสูจน์ (#68)

ผลการกวาดอยู่ใน `docs/acceptance/` ของแต่ละจอ และในหัวข้อของ #202 ใน `docs/lessons.md`
"""
from harness import main

FILES = {
    'departments': 'frontend/src/pages/Departments.js',
    'plos': 'frontend/src/pages/Plos.js',
    'users': 'frontend/src/pages/Users.js',
    'enrolment': 'frontend/src/pages/SubjectStudents.js',
}

MUTANTS = {
    # ภาควิชา: การลบพูดประโยคของตัวเองเหนือฟอร์มที่เปิดขึ้นมาแทน
    'departmentssaysanyway': ('departments',
        '      if (showing.current === sent) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n',
        '      if (showing.current !== null) {\n'
        '        waiting.current = { of: readOf(onPage.current), said }\n'
        '      }\n'
        '      const reader = onScreen.current\n'
        '      await reader(() => onScreen.current === reader)\n'),
    # ภาควิชา: guard ที่จับ `{}` ใหม่แทน ref - เป็นเท็จตลอด การลบจึงไม่เคยพูดอะไร
    'departmentssaysnothing': ('departments',
        '  const confirmRemoval = async () => {\n    const sent = showing.current\n',
        '  const confirmRemoval = async () => {\n    const sent = {}\n'),
    # ผลการเรียนรู้ระดับหลักสูตร: จอที่ ref มาถึงพร้อมตั๋วนี้
    # #238, 28 ต.ค. 2569 - การลบไม่พูดประโยคเองอีกแล้ว มันส่งต่อให้การอ่านที่วาด ฉะนั้น
    # การเปรียบเทียบที่มัตแตนต์นี้ถืออยู่ย้ายไปอยู่บนบรรทัดของการส่งต่อ ความผิดคงเดิม:
    # `!== null` พูดทับฟอร์มที่เปิดขึ้นมาแทน (202a ล้ม 1 ผ่าน 9)
    'plossaysanyway': ('plos',
        '      if (showing.current === sent) waiting.current = { of: program, said }\n',
        '      if (showing.current !== null) waiting.current = { of: program, said }\n'),
    # ผลการเรียนรู้ระดับหลักสูตร: ref มีอยู่ แต่ปุ่มเพิ่มไม่เขียนมัน guard จึงเทียบ
    # `null === null` แล้วพูดทับฟอร์มที่เพิ่งเปิด
    'plosnorefatadd': ('plos',
        '                  asked.current = null\n                  showing.current = {}\n                  setNotice(null)\n                  setEditing({})\n',
        '                  asked.current = null\n                  setNotice(null)\n                  setEditing({})\n'),
    # ผู้ใช้งาน: สวิตช์สถานะ ซึ่งไม่ถามอะไรก่อน รายการจึงยังมีชีวิตอยู่ทั้งเวลา
    # #239 - three lines since 28 ต.ค. 2569, and the comparison this mutant
    # is about is now written twice in the handler, so it is wrong in both: the
    # claim is the comparison, not the line it used to sit on (202a ล้ม 2 ผ่าน 8).
    # #238 - วันเดียวกัน หลังคำตอบของเจ้าของงาน การเปรียบเทียบกลับมาเหลือที่เดียว คือ
    # บรรทัดที่ส่งประโยคต่อ ข้อที่มัตแตนต์ถืออยู่คือการเปรียบเทียบนั้น ไม่ใช่บรรทัดที่มันเคยอยู่
    'userssaysanyway': ('users',
        '      if (showing.current === sent) waiting.current = { of: readOf(page, filters), said }\n'
        '      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n'
        '    } catch (error) {\n'
        '      setSwitching(null)\n'
        '      report(error)\n',
        '      if (showing.current !== null) waiting.current = { of: readOf(page, filters), said }\n'
        '      const drawing = onScreen.current\n      await drawing(() => onScreen.current === drawing)\n'
        '    } catch (error) {\n'
        '      setSwitching(null)\n'
        '      report(error)\n'),
    # รายชื่อนักศึกษาของรายวิชา: การเพิ่ม - โค้ดก่อนครึ่งหลังของตั๋วนี้เป๊ะ ๆ
    # ธงของ #152 อย่างเดียว ซึ่งแปลว่า *ไม่ถูกปฏิเสธ* ไม่ใช่ *วาดแล้ว*
    'enrolmentaddsaysanyway': ('enrolment',
        '      const reloaded = await reload(said)\n      if (reloaded && onScreen.current === sent) setNotice(said)\n',
        '      const reloaded = await reload(said)\n      if (reloaded) setNotice(said)\n'),
    # รายชื่อนักศึกษาของรายวิชา: การนำออกที่ไม่ใช่คนสุดท้ายของหน้า - ย่อหน้าแปด
    # ช่องคือสิ่งที่แยกมันออกจากการเพิ่ม ไม่ใช่คอมเมนต์ข้างบน
    # ถอนเป็นบันทึกเมื่อ 19 ต.ค. 2569 (`SUPERSEDED`) ข้อความข้างล่างคือข้อความก่อน #209
    # เป๊ะ ๆ สมอของมันจึงไม่ตรงกับโค้ดวันนี้ ความผิดที่มันถืออยู่ — พูดประโยคทับจอที่คนย้ายไป —
    # เขียนที่นี่ไม่ได้อีก เพราะตั้งแต่ #209 ฟังก์ชันนี้ไม่พูดอะไรเลย มันส่งประโยคต่อโดยติดกุญแจ
    # `readOf(sectionId, onPage.current)` ไว้ และคนที่พูดคือการอ่านที่วาด ถ้ากุญแจตรง การตัด
    # `onScreen.current === sent` ออกจึงไม่เปลี่ยนอะไร: หลังการกระโดด การอ่านที่ลงจอเป็นของ
    # ตอนเรียนอื่น กุญแจไม่ตรง ประโยคก็ไม่ถูกพูดอยู่แล้ว — ยามที่กุญแจครอบไว้แล้วพิสูจน์อะไรไม่ได้
    # ความผิดนั้นเขียนได้อีกชั้นเดียว คือที่การเทียบกุญแจ ซึ่งเป็นที่ที่ `205:saysanyread` อยู่
    # และวัดเมื่อ 19 ต.ค. 2569 ว่ามันฆ่าสองแถวลบของ `202a` (บรรทัด 497 กับ 525)
    'enrolmentremovesaysanyway': ('enrolment',
        '        if (reloaded && onScreen.current === sent) setNotice(said)\n',
        '        if (reloaded) setNotice(said)\n'),
    # แถวบวกของจุดเดียวกัน: *การนำออกที่ไม่มีใครย้ายหน้า ยังบอกว่ามันนำใครออก* เคยถูกค้ำด้วย
    # ตัวข้างบน และ 19 ต.ค. 2569 ก็ไม่มีอะไรค้ำ จึงเขียนตัวนี้ขึ้นมา: ประโยคถูกส่งต่อโดยติดกุญแจ
    # ของหน้าที่ไม่มีใครจะอ่าน ซึ่งเป็นความผิดของ #206 เขียนที่จุดนี้ ประโยคจึงไม่เคยถูกพูด
    # และแถวลบ (ที่ขอให้เงียบ) ยังเขียว
    'enrolmentremovekeyedelsewhere': ('enrolment',
        '        waiting.current = { of: readOf(sectionId, onPage.current), said }\n',
        '        waiting.current = { of: readOf(sectionId, onPage.current + 1), said }\n'),
}

# ถอนเป็นบันทึก ไม่ใช่ลบ: ข้อความของมันคือโค้ดก่อน #209 และบรรทัดนั้นไม่มีในต้นไม้วันนี้
SUPERSEDED = {'enrolmentremovesaysanyway'}

main(FILES, MUTANTS)
