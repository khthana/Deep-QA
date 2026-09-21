# -*- coding: utf-8 -*-
"""#146 - คำตอบของการบันทึกปิดฟอร์มที่มันถูกส่งมาจาก ไม่ใช่ฟอร์มที่มันเจอ

`save` ของสิบสามจอจบด้วย `setEditing(null)` (หรือ `setAdding(false)` หรือ `setOpening(false)`) กับประโยคสำเร็จ
โดยไม่ถามอะไรเลย การเขียนไม่มีอะไรมารื้อมันทิ้ง คำตอบจึงมาถึงหน้าจอที่ขยับไปแล้วได้ - ยกเลิก
กดได้ระหว่างการเขียนยังไม่กลับ ตารางที่มันกลับไปไม่ปิดปุ่มไหนเลย และ แก้ไข หรือ เพิ่ม… เปิดฟอร์ม
ที่สอง คำตอบของการบันทึกครั้งแรกจึงเอาฟอร์มที่สองออกไปพร้อมสิ่งที่พิมพ์ค้างไว้ แล้ววางประโยค
ของตัวเองไว้เหนือตาราง ในที่ที่มันอ่านได้ว่าเป็นเรื่องของรายการที่คนกำลังมอง

นี่คือกฎของ #133 ที่ปลายอีกข้าง - *คำตอบของการบันทึกคือการอ่าน* มันจึงถามคำถามเดียวกับที่
#139 ให้การอ่านถาม: *หน้าจอยังอยู่ที่เดิมกับตอนที่ฉันถูกส่งไปไหม* ถามด้วย ref ด้วยเหตุผลเดียวกัน
คือไม่มีอะไรรื้อ handler ทิ้ง ทุกตัวควบคุมที่เปลี่ยนว่าฟอร์มไหนอยู่บนหน้าจอเขียน `showing`
และคำตอบที่เจอฟอร์มอื่นไม่ปิดอะไรและไม่พูดอะไร ทั้งประโยคสำเร็จและคำปฏิเสธ
แถวอยู่ใน `e2e/tests/146a-save-closes-a-later-form.spec.js`

## สองรูปร่าง ไม่ใช่รูปร่างเดียว

**จอรายการ** (ภาควิชา หลักสูตร รายวิชา ผู้ใช้งาน) วางประโยคไว้*ก่อน*การโหลดใหม่ guard จึงเป็น
`if (showing.current === sent)` ก้อนเดียวครอบทั้งการปิดและประโยค

**จอที่วาดฟอร์มไว้เหนือรายการ** (เจ็ดจอของผู้สอน) วางประโยคไว้*หลัง*การโหลดใหม่ จึงต้องมี
`const mine` ถือคำตอบไว้ข้าม await และที่นั่นไม่ต้องมี ยกเลิก เป็นทางเข้า - ดินสอของการ์ดอื่น
มาแทนฟอร์มได้ทันทีตอนการเขียนยังไม่กลับ

**การเปิดรายวิชา** มีฟอร์มเดียวและไม่มี แก้ไข ทางเข้าคือการกด เปิดรายวิชา ซ้ำ - ทางที่ #139
ต้องตั้งชื่อเหมือนกัน และ guard ที่นั่นครอบ `asked.current = ask` กับ `refresh` ด้วย เพราะ
คำตอบที่มาช้าไม่ควรลากคนไปที่แผงของรายวิชาที่เขาเลิกมองแล้ว

**ข้อมูลนักศึกษากลาง** เป็นรูปร่างของจอรายการทุกอย่าง แต่ทางเข้าสั้นกว่าหนึ่งตัวควบคุม ไม่มี แก้ไข
จึงเป็น ยกเลิก แล้ว เพิ่มนักศึกษา อีกครั้ง มันไม่ได้อยู่ในรายการสิบสองจอของตั๋ว เพราะรายการนั้นคือ
การ grep `setEditing(null)` และจอนี้ถือ `adding` ใบเดียว - *รายการไฟล์ของตั๋วคือ grep ที่คนอื่นรันไว้*
(#133) มันถูกเจอด้วยคำถามอีกคำถามหนึ่ง คือจอไหนมี `save` แต่ไม่มี `showing`

## หกจอที่ตอบด้วยตัวเอง

คำถามเดียวกันนั้นคืนมาเจ็ดจอ หกจอในนั้นตอบเองแล้ว **ผลการเรียนรู้ระดับหลักสูตร รายวิชาของหลักสูตร
เกณฑ์การให้คะแนน และเกณฑ์ย่อย** วาดฟอร์ม*แทน*รายการ และปิด ยกเลิก ระหว่างการเขียน (#142 วัดไว้)
ตอนการบันทึกยังไม่กลับจึงไม่มีตัวควบคุมไหนบนจอที่จะมาแทนฟอร์มได้ - **โครงสร้างไปไม่ถึง** (#102)
**สัดส่วนคะแนน** ไม่มีฟอร์มให้ปิด และความเห็นในไฟล์ของมันเองบอกอยู่แล้วว่าไม่มีอะไรที่นั่นเปลี่ยน
สิ่งที่การโหลดถามได้ (#83) **คะแนนกิจกรรม** guard ตารางไว้แล้ว และประโยคของมันอ่านชื่อกิจกรรมจาก
closure ของ handler เอง ไม่ใช่จาก state ประโยคจึงตั้งชื่อสิ่งที่มันบันทึกไป ไม่ว่าตัวเลือกจะขยับไปไกลแค่ไหน

## ครึ่งหลังที่ไม่มีอะไรไปถึง - วัดแล้ว ไม่ได้เถียง

ร่างแรกของเจ็ดจอนั้นถามซ้ำหลังการโหลด (`mine && showing.current === null`) ด้วยเหตุผลว่า
การโหลดใหม่คือโอกาสที่สองที่หน้าจอจะขยับ **แถวที่เขียนขึ้นมาเพื่อสร้างช่วงนั้นหมดเวลาไปกับ
การหาปุ่ม** ทั้งเจ็ดจอวาด `{!loading && data && …}` รายการ ฟอร์ม และปุ่มทุกปุ่มจึงหายไป
จากหน้าจอตลอดความยาวของการโหลด ไม่มีอะไรเหลือให้กด ข้อที่ไม่มีการกดไหนไปถึงไม่ใช่ระยะ
ปลอดภัย (#97) จึงถอดออก - **โครงสร้างไปไม่ถึง ไม่ใช่ยังไม่ได้ทดสอบ** (#102)

**หมดอายุเมื่อ 21 ก.ย. 2569** - #149 ยกประตูนั้นออก รายการถูกวาดอยู่ระหว่างการโหลด และประตูนี้
ก็เปิด ประโยคของการบันทึกทั้งเจ็ดจอจึงถาม `showing.current === sent` หลังการโหลดแล้ว และ `remove`
ถามเหมือนกัน แถวและมัตแตนต์อยู่ใน `149-reload-keeps-the-open-form.py` - *ข้อบกพร่องที่ไปไม่ถึงวันนี้
มีวันที่ติดอยู่ และสิ่งที่เลื่อนวันมักเป็นการแก้ของอีกตั๋ว* (#131) ซึ่งหัวข้อนี้เขียนไว้เองว่ามันคือ
*โครงสร้างไปไม่ถึง* ไม่ใช่ *ไปไม่ถึงตลอดไป*

## ทำไม `!== null` ไม่ใช่การถอดเงื่อนไขทิ้ง

มัตแตนต์เปลี่ยนการเทียบเป็น *ทางเลือกอื่น* ไม่ใช่เป็น *ไม่เลือก* (#102) - `!== null` คือ guard
ที่จำว่า *มีฟอร์มเปิดอยู่ไหม* แทนที่จะจำว่า *ฟอร์มไหน* ซึ่งเป็นความผิดที่คนเขียนจริง ๆ จะเขียน
และมันยังทิ้งคำตอบที่มาหลัง ยกเลิก เปล่า ๆ ตามเดิม จึงไม่ได้หยุดแอปพลิเคชัน

## สิ่งที่ #146 ไม่ได้เปลี่ยน

สิ่งที่หน้าจอปิดการใช้งาน ยกเลิก ยังกดได้ระหว่างการบันทึก เพราะการปิดมันคือการเปลี่ยนหน้าจอ
ซึ่งเป็นคำถาม ไม่ใช่การแก้ (#142, `docs/06` §Out of Scope) และการโหลดรายการใหม่ทำเสมอ
ไม่ว่าการเทียบจะออกทางไหน (#131)

## สิ่งที่แถวของตั๋วนี้เจอ แต่ไม่ใช่ของตั๋วนี้

* #147 - `EvidenceForm` ไม่เติมค่าใหม่เมื่อกดดินสอของแฟ้มอื่นขณะฟอร์มเปิดอยู่ - state ของมัน
  ตั้งต้นครั้งเดียว แถวที่นี่จึงอ่านว่าฟอร์ม*ยังอยู่ไหม* ไม่ใช่ว่าในฟอร์มมีอะไร
  แก้แล้วเมื่อ 21 ก.ย. 2569 - หน้าให้ฟอร์มหนึ่งฟอร์มต่อแฟ้มด้วย `key` แถวอยู่ใน `147a`
* #148 - `EntrySection` ตั้ง draft ใหม่ทุกครั้งที่ `entry` เปลี่ยนตัว การโหลดใหม่จึงล้างสิ่งที่พิมพ์
  ค้างไว้ในช่องของอีกหัวข้อ - ซึ่ง #146 เป็นคนทำให้ไปถึงได้ เพราะก่อนหน้านี้ไม่มีทางที่
  ฟอร์มจะยังเปิดอยู่ตอนรายการโหลดใหม่
  แก้แล้วเมื่อ 21 ก.ย. 2569 พร้อม #149 - การวัดเจอว่ามันเป็นชั้นที่สอง ใต้ประตู `loading`
  ที่ถอดฟอร์มทิ้งก่อน effect จะได้ทำงาน

## การกวาด - 20 ก.ย. 2569

กวาดทั้งยี่สิบเจ็ดตัวด้วย `npx playwright test 146a` ทีละตัว (`E2E_FRONTEND_PORT=5300`)
ยี่สิบห้าตัวแรกกวาดบนฐาน **ยี่สิบแปดแถว** ซึ่งเป็นจำนวนแถวของไฟล์ในตอนนั้น อีกสามแถว - คำปฏิเสธ
ของแผนพัฒนาต่อเนื่อง และสองแถวของทะเบียน - ถูกเขียนทีหลัง และกวาดบนฐานสามสิบเอ็ด
ทุกฐานผ่านหมด ทุกตัวฆ่าแถวที่ตัวเองอ้าง และไม่ฆ่าตัวอื่น:

* `<จอรายการ>closewins` ฆ่าสองแถว - ทางเข้าทั้งสองของจอนั้น (แก้ไข และ เพิ่ม…) เป็นข้อเดียวกัน
* `<จอรายการ>refusalwins` ฆ่าแถวคำปฏิเสธของจอนั้นแถวเดียว
* เจ็ดจอที่วาดฟอร์มเหนือรายการ กับ การเปิดรายวิชา ฆ่าแถวละหนึ่งทั้ง `closewins` และ `refusalwins`
* `improvementpickerkeepsshowing` ฆ่าแถวของตัวเลือกผลการเรียนรู้แถวเดียว
* `students…` ทั้งสองตัวฆ่าแถวละหนึ่ง - ทะเบียนมีทางเข้าทางเดียว ไม่ใช่สอง

**สองจำนวนในนั้นไม่ใช่สิ่งที่มันดูเหมือน** `behaviorsclosewins` กับ `criteriaclosewins` รายงาน
สองล้ม แต่ชื่อบอกว่าแถวที่สองเป็นแถวของแผนพัฒนาต่อเนื่อง ไม่ใช่ของจอตัวเอง - เป็นแถวที่ล้มเป็น
ครั้งคราว ไม่ใช่การฆ่า สองรันนั้นใช้ 2.6 นาที เทียบกับ 1.6 ของตัวอื่น ซึ่งคือหกสิบวินาทีที่หมดไป
กับการรอ *ก่อนจะอ่านจำนวนที่ดูเหมือนทั้งชุด ให้อ่านชื่อ* (#52) กลไกอยู่ในหัวข้อข้างล่าง

**`improvementrefusalwins` รอดในการกวาดรอบแรก** ยี่สิบแปดจากยี่สิบแปด - แผนพัฒนาต่อเนื่องเป็นจอเดียว
ที่ยังไม่มีแถวคำปฏิเสธ ซึ่งเป็นการอ้างเกินที่มีแต่การกวาดเท่านั้นที่เห็น (#97) แถวถูกเขียนเพิ่ม
แล้ว **วัดซ้ำบนฐานสามสิบเอ็ด - ล้ม 1 ผ่าน 30** ที่แถวคำปฏิเสธนั้น ตอนแรกหัวข้อนี้เขียนไว้ว่า
*มัตแตนต์ตัวเดิมจึงฆ่ามันได้* โดยยังไม่ได้รัน ซึ่งเป็น ⚙ ที่ไม่มีใครได้มา - การเขียนแถวไม่ใช่
หลักฐานว่ามัตแตนต์ฆ่ามันได้ การรันเป็นหลักฐาน

## แถวที่ล้มเป็นครั้งคราว - กลไกของมัน (20 ก.ย. 2569)

สามแถวของ **แผนพัฒนาต่อเนื่อง** ล้มสามครั้งในยี่สิบหกรอบของการกวาดรอบแรก ทุกครั้งที่หกสิบวินาที
และไม่เคยล้มตอนรัน describe เดี่ยว ๆ ห้ารอบสะอาดของทั้งไฟล์ก็สร้างมันขึ้นมาใหม่ไม่ได้
**ภายใต้ตัวเรนเดอร์ที่ถูกหน่วงหกเท่า ทั้งสามล้มพร้อมกัน** และล้มที่บรรทัดเดียวกัน คือการอ่านว่า
ปุ่มไหนอยู่ตรงนั้นระหว่าง เขียน… กับ แก้ไข… - `openPlan` รอคำตอบ ไม่ได้รอการวาด (#132) และ
`count()` ไม่ retry การอ่านจึงมาถึงก่อนที่ปุ่มไหนจะมีอยู่ เลือกทางที่สอง แล้วรอดินสอที่ไม่มีวันถูกวาด
จนหมดเวลา *การแข่งกันระหว่างคำตอบกับการวาดของมัน วัดด้วยการหน่วงตัวเรนเดอร์ ไม่ใช่ด้วยการรันซ้ำ*
(#136) แก้ด้วยการรอปุ่มใดปุ่มหนึ่งก่อนอ่าน ทั้งในแถวของ #146 และใน `support/improvement-screen.js`
ซึ่งเป็นที่ที่ #146 ลอกมา

## การกวาดทั้งใบ หลังคำตอบของอาจารย์ที่ปรึกษา - 20 ก.ย. 2569

คำตอบเปลี่ยน*ความหมาย*ของ `showing` ไม่ใช่รูปของการเทียบ ยี่สิบหกตัวข้างบนจึงเกาะที่เดิมทั้งหมด
แต่สมอที่ยังอยู่ไม่ได้แปลว่ายังพิสูจน์อะไรได้ มีแต่การกวาดที่บอกได้ (#107) และไฟล์โตจากสามสิบเอ็ด
เป็นสี่สิบเก้าแถว จึงกวาดใหม่ทั้งใบ สี่สิบสองตัว ทีละตัว - baseline **49 ผ่านทั้ง 49**
ทุกตัวฆ่าเฉพาะแถวของตัวเอง ไม่มีตัวรอด ไม่มี MISS และทุกรัน ล้ม + ผ่าน = 49 พอดี

* `<จอรายการที่อ่านกลับ>closewins` (ภาควิชา หลักสูตร รายวิชา) ฆ่า **สาม** ไม่ใช่สอง - แถวที่สาม
  คือหน้าต่างการอ่านที่คำตอบเพิ่งทำให้ไปถึงได้
* `usersclosewins` ฆ่าสอง - ผู้ใช้งานเปิดฟอร์มด้วย `setEditing(user)` จากแถวที่ถืออยู่
  ไม่มีการอ่านกลับ จึงไม่มีหน้าต่างให้เป็นแถวที่สาม
* `<จอ>cancelclears` สิบสองตัว ใส่ `showing.current = null` กลับเข้าไปใน ยกเลิก ซึ่งคือร่างแรก
  ก่อนคำตอบ - ตัวละหนึ่งแถว ยกเว้นสามจอที่ถือแถวคำปฏิเสธของทรงตัวเองไว้ด้วย (ภาควิชา
  ผลการเรียนรู้รายวิชา แผนพัฒนาต่อเนื่อง) ซึ่งฆ่าสอง
* `<จอ>showingatthelanding` สามตัว ย้ายการเขียน ref กลับไปไว้ตรงที่การอ่านลง - ฆ่าแถวหน้าต่าง
  แถวเดียว ซึ่งเป็นการแยกที่ `closewins` ทำไม่ได้ ตัวหนึ่งบอกว่ามีคนอ่าน ref อีกตัวบอกว่าอ่าน*ตอนกด*
* หลักฐานการประเมิน ไม่มี `cancelclears` เพราะ ยกเลิก ของมันถือ `disabled={busy}` ไว้ -
  โครงสร้างไปไม่ถึง ไม่ใช่ยังไม่ได้ทดสอบ (#102)

**หน่วยของเวลาขยับไปพร้อมไฟล์** รอบก่อน 2.6 นาทีคือสัญญาณของการรอ เทียบกับ 1.6 ของตัวปกติ
รอบนี้ 2.6-3.0 คือความยาวของ baseline เอง สี่สิบเก้าแถวใช้เวลาเท่านั้น สิ่งที่อ่านได้จึงเป็น
*ส่วนต่าง*จาก baseline ของวันที่รัน ไม่ใช่ตัวเลขดิบ รอบนี้ไม่มีตัวไหนต่างจาก baseline เกินครึ่งนาที
และแถวที่เคยล้มเป็นครั้งคราวไม่กลับมาเลยในสี่สิบสามรัน

## หลัง #149 - 21 ก.ย. 2569

#149 แยกประโยคของการบันทึกบนเจ็ดจอของผู้สอนออกจาก `mine` (มันถามซ้ำหลังการโหลด) `closewins`
ของเจ็ดจอนั้นจึงเห็นแค่การปิด กวาดซ้ำกับ `146a` (49 แถว) พร้อม `cancelclears` หกตัวและ
`improvementpickerkeepsshowing` - ทุกตัวฆ่าแถวเดิม แต่ `improvementclosewins` **ล้ม 1 ไม่ใช่ 2**
(แถวตัวเลือกเคยตายที่ประโยค) และครึ่งประโยคของแถว *a save that lands after …* ไม่มีใครฆ่า -
`149:<จอ>savebannerunguarded` ฆ่ามัน ผลอยู่ใน `149-reload-keeps-the-open-form.py`

## วิธีรัน

    python mutation/146-save-closes-a-later-form.py save
    python mutation/146-save-closes-a-later-form.py <mutant>
    python mutation/146-save-closes-a-later-form.py restore

ผลการกวาดอยู่ใน `docs/acceptance/` ของแต่ละจอ และในหัวข้อของ #146 ใน `docs/lessons.md`
"""
from harness import main

FILES = {
    'departments': 'frontend/src/pages/Departments.js',
    'programs': 'frontend/src/pages/Programs.js',
    'subjects': 'frontend/src/pages/Subjects.js',
    'users': 'frontend/src/pages/Users.js',
    'offerings': 'frontend/src/pages/Offerings.js',
    'clos': 'frontend/src/pages/CourseOutcomes.js',
    'criteria': 'frontend/src/pages/AchievementCriteria.js',
    'behaviors': 'frontend/src/pages/MeasurableBehaviors.js',
    'plan': 'frontend/src/pages/TeachingPlan.js',
    'activities': 'frontend/src/pages/LearningActivities.js',
    'evidence': 'frontend/src/pages/ActivityEvidence.js',
    'improvement': 'frontend/src/pages/ContinuousImprovement.js',
    'students': 'frontend/src/pages/Students.js',
}

# จอรายการ: การปิดกับประโยคอยู่ในก้อนเดียว ก่อนการโหลดใหม่
CLOSED = '      if (showing.current === sent) {\n'
CLOSED_ANY = '      if (showing.current !== null) {\n'

# คำปฏิเสธของจอที่ส่งผ่าน `report`
REPORTED = '      if (showing.current === sent) report(error)\n'
REPORTED_ANY = '      if (showing.current !== null) report(error)\n'

# จอที่พูดหลังการโหลดใหม่: คำตอบถูกถือข้าม await ไว้ใน `mine`
MINE = '      const mine = showing.current === sent\n'
MINE_ANY = '      const mine = showing.current !== null\n'

# คำปฏิเสธของจอเดียวกันนั้น ซึ่งเขียนประโยคเองแทนที่จะเรียก `report`
NOTICED = '      if (showing.current === sent && !error.expired)\n'
NOTICED_ANY = '      if (showing.current !== null && !error.expired)\n'

MUTANTS = {
    # ภาควิชา: ฟอร์มที่เปิดทีหลังถูกปิดโดยคำตอบของการบันทึกครั้งก่อน
    'departmentsclosewins': ('departments', CLOSED, CLOSED_ANY),
    # ภาควิชา: คำปฏิเสธของการบันทึกที่ถูกแซง มาขึ้นเหนือฟอร์มใหม่
    'departmentsrefusalwins': ('departments', REPORTED, REPORTED_ANY),
    # หลักสูตร
    'programsclosewins': ('programs', CLOSED, CLOSED_ANY),
    'programsrefusalwins': ('programs', REPORTED, REPORTED_ANY),
    # รายวิชา
    'subjectsclosewins': ('subjects', CLOSED, CLOSED_ANY),
    'subjectsrefusalwins': ('subjects', REPORTED, REPORTED_ANY),
    # ผู้ใช้งาน
    'usersclosewins': ('users', CLOSED, CLOSED_ANY),
    'usersrefusalwins': ('users', REPORTED, REPORTED_ANY),
    # การเปิดรายวิชา: ฟอร์มที่เปิดขึ้นใหม่ถูกปิด และแผงของรายวิชาที่เพิ่งสร้างแย่งหน้าจอไป
    'offeringsclosewins': ('offerings', MINE, MINE_ANY),
    'offeringsrefusalwins': ('offerings', REPORTED, REPORTED_ANY),
    # ผลการเรียนรู้รายวิชา: ดินสอของการ์ดอื่นเปิดฟอร์มที่สอง แล้วคำตอบเก่าปิดมัน
    'closclosewins': ('clos', MINE, MINE_ANY),
    'closrefusalwins': ('clos', NOTICED, NOTICED_ANY),
    # เกณฑ์การบรรลุผล
    'criteriaclosewins': ('criteria', MINE, MINE_ANY),
    'criteriarefusalwins': ('criteria', NOTICED, NOTICED_ANY),
    # พฤติกรรมบ่งชี้
    'behaviorsclosewins': ('behaviors', MINE, MINE_ANY),
    'behaviorsrefusalwins': ('behaviors', NOTICED, NOTICED_ANY),
    # แผนการสอน
    'planclosewins': ('plan', MINE, MINE_ANY),
    'planrefusalwins': ('plan', NOTICED, NOTICED_ANY),
    # กิจกรรมการเรียนรู้
    'activitiesclosewins': ('activities', MINE, MINE_ANY),
    'activitiesrefusalwins': ('activities', NOTICED, NOTICED_ANY),
    # หลักฐานการประเมิน - จอเดียวที่ ยกเลิก ถูกปิดอยู่แล้ว ทางเข้าจึงมีแต่ดินสอของอีกแฟ้ม
    'evidenceclosewins': ('evidence', MINE, MINE_ANY),
    'evidencerefusalwins': ('evidence', NOTICED, NOTICED_ANY),
    # แผนพัฒนาต่อเนื่อง
    'improvementclosewins': ('improvement', MINE, MINE_ANY),
    'improvementrefusalwins': ('improvement', NOTICED, NOTICED_ANY),
    # ข้อมูลนักศึกษากลาง: ฟอร์มเดียว ไม่มี แก้ไข ทางเข้าคือ ยกเลิก แล้ว เพิ่มนักศึกษา อีกครั้ง
    # รูปร่างเหมือนจอรายการทุกอย่าง เพราะประโยคอยู่ก่อนการกลับไปหน้าแรก
    'studentsclosewins': ('students', CLOSED, CLOSED_ANY),
    'studentsrefusalwins': ('students', REPORTED, REPORTED_ANY),
    # แผนพัฒนาต่อเนื่อง: ตัวเลือกผลการเรียนรู้ปิดฟอร์มโดยไม่ได้เป็นตัวควบคุมของฟอร์ม ถ้ามันไม่เขียน
    # ref ประโยคของหัวข้อที่เพิ่งเขียนไป จะมาขึ้นใต้ผลการเรียนรู้ที่ไม่มีใครเขียนถึงเลย
    # `closewins` วัดแถวนี้ไม่ได้ เพราะตอนนั้น `showing.current` เป็น `null` อยู่แล้ว
    'improvementpickerkeepsshowing': ('improvement',
        '                    showing.current = {}\n'
        '                    setCloId(event.target.value)\n',
        '                    setCloId(event.target.value)\n'),

    # ยกเลิก writes `null` again: a save nothing overtook goes quiet, which
    # is what the code said before the advisor answered the question #146
    # parked. หลักฐานการประเมิน is not here - its ยกเลิก is disabled while a
    # write is out, so nothing can be pressed to reach the row.
    'departmentscancelclears': ('departments',
        '            setNotice(null)\n'
        '            setEditing(null)\n'
        '          }}\n',
        '            showing.current = null\n'
        '            setNotice(null)\n'
        '            setEditing(null)\n'
        '          }}\n'),
    'programscancelclears': ('programs',
        '            setNotice(null)\n'
        '            setEditing(null)\n'
        '          }}\n',
        '            showing.current = null\n'
        '            setNotice(null)\n'
        '            setEditing(null)\n'
        '          }}\n'),
    'subjectscancelclears': ('subjects',
        '            setNotice(null)\n'
        '            setEditing(null)\n'
        '          }}\n',
        '            showing.current = null\n'
        '            setNotice(null)\n'
        '            setEditing(null)\n'
        '          }}\n'),
    'userscancelclears': ('users',
        '              setNotice(null)\n'
        '              setEditing(null)\n'
        '            }}\n',
        '              showing.current = null\n'
        '              setNotice(null)\n'
        '              setEditing(null)\n'
        '            }}\n'),
    'studentscancelclears': ('students',
        '            setNotice(null)\n'
        '            setAdding(false)\n'
        '          }}\n',
        '            showing.current = null\n'
        '            setNotice(null)\n'
        '            setAdding(false)\n'
        '          }}\n'),
    'offeringscancelclears': ('offerings',
        '            setNotice(null)\n'
        '            setOpening(false)\n'
        '          }}\n',
        '            showing.current = null\n'
        '            setNotice(null)\n'
        '            setOpening(false)\n'
        '          }}\n'),
    'closcancelclears': ('clos',
        '                setEditing(null)\n'
        '              }}\n',
        '                showing.current = null\n'
        '                setEditing(null)\n'
        '              }}\n'),
    'criteriacancelclears': ('criteria',
        '                setEditing(null)\n'
        '              }}\n',
        '                showing.current = null\n'
        '                setEditing(null)\n'
        '              }}\n'),
    'behaviorscancelclears': ('behaviors',
        '                setEditing(null)\n'
        '              }}\n',
        '                showing.current = null\n'
        '                setEditing(null)\n'
        '              }}\n'),
    'plancancelclears': ('plan',
        '                setEditing(null)\n'
        '              }}\n',
        '                showing.current = null\n'
        '                setEditing(null)\n'
        '              }}\n'),
    'activitiescancelclears': ('activities',
        '                setEditing(null)\n'
        '              }}\n',
        '                showing.current = null\n'
        '                setEditing(null)\n'
        '              }}\n'),
    'improvementcancelclears': ('improvement',
        '                        setEditing(null)\n'
        '                      }}\n',
        '                        showing.current = null\n'
        '                        setEditing(null)\n'
        '                      }}\n'),
    # The ref written where the read lands, as it was until ยกเลิก stopped
    # writing it: the window between pressing แก้ไข and the form it opens.
    'departmentsshowingatthelanding': ('departments',
        '    showing.current = ask\n'
        '    setNotice(null)\n'
        '    setReading(true)\n'
        '    try {\n'
        '      const { department: current } = await getDepartment(department.department_id)\n'
        '      if (asked.current === ask) setEditing(current)\n',
        '    setNotice(null)\n'
        '    setReading(true)\n'
        '    try {\n'
        '      const { department: current } = await getDepartment(department.department_id)\n'
        '      if (asked.current === ask) {\n'
        '        showing.current = ask\n'
        '        setEditing(current)\n'
        '      }\n'),
    'programsshowingatthelanding': ('programs',
        '    showing.current = ask\n'
        '    setNotice(null)\n'
        '    setReading(true)\n'
        '    try {\n'
        '      const { program: current } = await getProgram(program.program_id)\n'
        '      if (asked.current === ask) setEditing(current)\n',
        '    setNotice(null)\n'
        '    setReading(true)\n'
        '    try {\n'
        '      const { program: current } = await getProgram(program.program_id)\n'
        '      if (asked.current === ask) {\n'
        '        showing.current = ask\n'
        '        setEditing(current)\n'
        '      }\n'),
    'subjectsshowingatthelanding': ('subjects',
        '    showing.current = ask\n'
        '    setNotice(null)\n'
        '    setReading(true)\n'
        '    try {\n'
        '      const { subject: current } = await getSubject(subject.subject_id)\n'
        '      if (asked.current === ask) setEditing(current)\n',
        '    setNotice(null)\n'
        '    setReading(true)\n'
        '    try {\n'
        '      const { subject: current } = await getSubject(subject.subject_id)\n'
        '      if (asked.current === ask) {\n'
        '        showing.current = ask\n'
        '        setEditing(current)\n'
        '      }\n'),
}

main(FILES, MUTANTS)
