# -*- coding: utf-8 -*-
"""#185 - เกล็ดขนมปังอ่าน id อีกสามชนิดออกมาเป็นชื่อ

ความผิดเดียวกับ #116 ที่ลึกลงไปอีกหนึ่ง segment และเหลืออยู่สามรูป - `:cloId`
ใต้ `courseOutcomes` `:activityId` ใต้ `learningActivities` และ `:rubricId`
ใต้ `/main/rubrics` ทั้งสามเป็น surrogate key ตาม ADR-0001 ที่การสร้างใหม่เอาไปไว้
ในที่อยู่ `breadcrumbNameMap` จึงไม่มีรายการให้มันและไม่มีทางมีได้ เพราะตารางนั้น
แปลง segment ที่เป็น**คำ** ไม่ใช่ segment ที่เป็น**ค่า**

ทั้งสามรูปเป็น**การคืนของ ไม่ใช่การเพิ่มของ** ซึ่งเป็นข้อแรกที่ `docs/06`
§Out of Scope ถาม ของที่ส่งมอบพิมพ์ชื่อไว้ทั้งสามที่: `CourseOutcomes.js`
พา `navigate` ไปด้วย `CLO-${clo.clo_number}` และอีกสองที่อยู่พกคำคงที่
`activityScores` กับ `edit-Rubric` คำวินิจฉัยแรกของตั๋วเองบอกว่า `:cloId`
เป็นการเพิ่มของ และถูกแก้ด้วยคอมเมนต์บนตั๋วเมื่อ 3 ต.ค. 2569

## ทำไมฟิกซ์เจอร์เป็นตอนเรียนของปี 2568

เหตุผลเดียวกับที่ 116a อยู่บน Section 3 ต่ำลงไปอีกชั้นหนึ่ง seed ลง CLO ของปี
ปัจจุบันก่อน ฉะนั้น `clo_id` 1..9 ถือ `CLO-1`..`CLO-9` พอดี - เกล็ดขนมปังที่เขียน
`CLO-${id}` อันเป็นทางลัดที่ตั๋วเสนอเองแล้วถูกปฏิเสธ จะอ่านถูกที่นั่นและมัตแตนต์
ของมันจะรอด ชุดของปีก่อนถือเลขเก้าตัวเดียวกันบน id เก้าตัวที่ต่างออกไป ซึ่งเป็นที่
เดียวที่กุญแจกับป้ายไม่ตรงกัน และแถว 1 ยืนยันเงื่อนไขนั้นเองแทนที่จะเชื่อ seed
(*ฟิกซ์เจอร์สร้างขึ้นที่จุดที่สองอย่างไม่ตรงกัน* - #117)

## มัตแตนต์ และสิ่งที่แต่ละตัวฆ่า

**ฝั่งเปลือก** ยิงไปที่ `frontend/src/pages/Mainpage.js` ยกเว้น `criteriawordforboth`
ที่ยิงไปที่ `frontend/src/components/breadcrumbNameMap.js` (เพิ่ม 4 ต.ค. 2569 ที่ #189) วัดด้วย
`e2e/tests/185a-a-breadcrumb-that-reads-three-more-ids.spec.js`

- `clonumberfromid` คือทางลัดที่ตั๋วปฏิเสธ ทำให้รันได้ (*เมื่อข้อเสนอของตั๋วถูก
  ปฏิเสธ มัตแตนต์ที่ต้องเขียนคือข้อเสนอนั้นเองที่ทำให้รันได้* - #48) ฆ่าแถว 1
  เพราะ id กับเลขไม่ตรงกัน และฆ่าแถว 4 เพราะมันแต่งชื่อขึ้นจาก segment
- `activityidinsteadofname` กับ `rubriccodeisid` คือป้ายที่กลายเป็นกุญแจอีกครั้ง
  ตัวละแถว
- `rubricwordgone` ถอดคำว่า *Rubric* ออกจากหน้ารหัส เหลือรหัสเปล่าอย่างที่อีก
  สองชนิดวาด ฆ่าแถว 3 ตัวเดียว (วัด 4 ต.ค. 2569 ที่ #190) ตายที่ `toEqual`
  อ่าน `RUB-02` แทน `Rubric RUB-02` - นี่คือข้อเสนอข้อ 2 ของ #190 ที่ถูกปฏิเสธ
  ทำให้รันได้ (#48) และเป็นเหตุที่มันต้องมีแม้ `rubriccodeisid` จะยิงบรรทัด
  เดียวกัน: ตัวนั้นเก็บคำไว้แล้วเปลี่ยนรหัสเป็น id จึงพิสูจน์ว่าเกล็ดอ่าน*รหัส*
  ไม่ได้พิสูจน์ว่า*คำนำหน้า*อยู่ ซึ่งคือ*มัตแตนต์สองตัวที่แปรคุณสมบัติเดียวกัน
  มองคุณสมบัติที่สามไม่เห็น* (#96) หนึ่งตัวต่อหนึ่งข้ออ้าง
- `criteriawordfrommap` กับ `criteriawordforboth` คือสองข้อต่อของการจับคู่คำกับเส้นทางที่ #189
  ตั้งขึ้น (ตอบเมื่อ 4 ต.ค. 2569 ว่าเกล็ดอ่านตามจอ) `criteria` เป็น segment สุดท้ายของสองที่อยู่
  และแมปถือได้ประโยคเดียวต่อคำ *มัตแตนต์สองตัวที่แปรคุณสมบัติเดียวกันมองคุณสมบัติที่สามไม่เห็น*
  (#96) จึงต้องคราฟต์ตัวละข้อต่อ — ตัวแรกถอดการอ่านเส้นทางออก **ฆ่าแถว 1 ตัวเดียว** (วัด 4 ต.ค.
  2569) ตายที่ `toEqual` อ่าน *เกณฑ์การให้คะแนนของ Rubric* แทน *เกณฑ์การบรรลุผล* ตัวที่สองเอา
  ประโยคใหม่ไปใส่ในแมป **ฆ่าแถว 3 กับแถว 6** ซึ่งเป็นสองข้ออ้างเรื่องการเดินไปถึง ([#191](https://github.com/khthana/Deep-QA/issues/191))
  ไม่ใช่ข้อเดียวนับสองครั้ง และแต่ละตัวปล่อยแถวของอีกฝั่งยืน ซึ่งเป็นสิ่งที่บอกว่าสองแถวนั้นพูดคนละข้อ
- `crumbatthewrongindex` ขยับตำแหน่งของ CLO ลงหนึ่ง ชื่อจึงไปทับเกล็ดที่เป็นคำ
- `deeprefusalinvents` เติมการเขียนลงใน `catch` อันเป็นสิ่งที่การปฏิเสธต้องไม่ทำ
  เหมือนตัวชื่อเดียวกันของ #116 - สิ่งที่ถือข้ออ้างนั้นคือ**การไม่มี**การเขียน
  **ฆ่าแถว 4 5 และ 6** ตัวละชนิด (วัด 4 ต.ค. 2569 ที่ #191 ตอนที่มีแถวเดียว
  มันฆ่าแถวเดียว) ทั้งสามตายที่ `toEqual` อ่าน `CLO-999999` แทน `999999`
  `catch` ก้อนนั้นเขียนไว้ก้อนเดียวสำหรับสามชนิด จึงไม่มีมัตแตนต์ที่แยกชนิดได้
  (#123) และข้ออ้างของแต่ละแถวคือ*ชนิดของมันเดินถึงก้อนนั้น* ซึ่งการที่ตัวนี้
  ฆ่าแถวนั้นคือข้อพิสูจน์ - ชนิดที่การปฏิเสธไปไม่ถึงจะยังอ่านตัวเลขและผ่าน

**ฝั่งหลัง** ยิงไปที่เส้นทางรายการเดียวสองเส้นที่ใบนี้เพิ่ม วัดด้วย
`backend/test/clos.test.js` กับ `backend/test/activities.test.js`

- `grainignored` ให้เส้นทางของ CLO ถามด้วย id ล้วนแทนที่จะถามผ่าน Offering
  ซึ่งเป็นรูเดียวกับที่ ADR-0003 มีไว้ปิด
- `strangerhearsabouttheclo` กับ `strangerhearsabouttheactivity` สลับประโยค
  ของประตูบานแรก คนที่ไม่ได้สอนตอนเรียนนั้นจะได้ยินเรื่องของข้างใน
- `nothingrefusestheactivity` ถอดการปฏิเสธของ Activity ออกทั้งข้อ แล้วตอบค่า
  ตั้งต้นแทน ซึ่งเป็นรูที่กฎการจับคู่ของ #28 ปิดไว้

## สิ่งที่ไม่มีมัตแตนต์ และเหตุผล

**ตัวจับคู่ `kind:id`** ไม่มีมัตแตนต์ เพราะไม่มีแถวให้ฆ่า เฟรมที่มันพูดถึงคือ
เฟรมเดียวหลังการย้ายระหว่างที่อยู่สองที่ที่มีรูปเดียวกัน (`:cloId` กับ
`:activityId` อยู่ segment เดียวกันทั้งคู่) และสิ่งที่เกล็ดขนมปังตกกลับไปเป็น
ในเฟรมนั้นคือตัวเลข ซึ่งเป็นสิ่งเดียวกับที่มันพูดก่อนคำตอบมาถึง - *การอ่านที่
ล้มเหลวไม่ได้ไม่ใช่แถว* (#50) `docs/acceptance/10-application-shell.md`
เขียนไว้ด้วยวันที่ ไม่ใช่ด้วยเครื่องหมาย

**การจับคู่ Activity กับตอนเรียนในฝั่งหลัง** ไม่ใช่ข้ออ้างใหม่ของใบนี้ มันอยู่ใน
`activityOf` ซึ่ง DELETE กับ PUT ใช้ร่วมกันและ #32 พิสูจน์ไว้แล้ว เส้นทางใหม่
เป็นผู้ใช้รายที่สาม จึงเป็นสมมุติฐานของแถว ไม่ใช่สิ่งที่แถวอ้าง

## เพื่อนบ้านในไฟล์เดียวกัน

ใบนี้ถือสี่ path และสามในสี่มีเพื่อนบ้าน - **ห้ามกวาด `185` พร้อมกับใบใดก็ตามในสามรายการนี้**

- `frontend/src/pages/Mainpage.js` - `98-narrow-window.py` กับ
  `116-a-breadcrumb-that-reads-the-section.py` (คู่ → กลุ่มสาม)
- `backend/routes/clos.js` - `27` `28` `29` `30` `41` (กลุ่มห้า → กลุ่มหก)
- `backend/routes/activities.js` - `32` `33` `127` (กลุ่มสาม → กลุ่มสี่)
- `frontend/src/components/breadcrumbNameMap.js` - **ไม่มีใครถืออยู่เลย** (#189 เพิ่มเข้ามา
  4 ต.ค. 2569 · สำมะโนของ `FILES` ทั้ง 91 ใบตอบว่าเส้นทางนี้เป็นกลุ่มหนึ่ง)

*สิ่งที่ทำให้การกวาดเสียคือเส้นทางที่ซ้ำกัน เทียบ `FILES` ไม่ใช่เนื้อเรื่อง* (#125) ร่างแรกของหัวข้อนี้เขียนไว้แต่
`Mainpage.js` ซึ่งเป็นกลุ่มเล็กที่สุดของสาม สองเส้นทางฝั่งหลังมีเพื่อนบ้านมากกว่า สำมะโนของ `mutation/README.md`
ตอบว่าสามกลุ่มนี้โตขึ้นพร้อมกัน โดยยอดรวมไม่ขยับ (64 เท่าเดิม) ซึ่งเป็นกับดักที่ README
เขียนเตือนไว้เอง

## กวาดซ้ำเมื่อไฟล์ spec โต

4 ต.ค. 2569 ที่ #191 ไฟล์ `185a` โตจากสี่แถวเป็นหกแถว และ**ห้าตัวฝั่งเปลือก
ถูกกวาดซ้ำทั้งหมด** ไม่ใช่แค่ตัวที่เกี่ยวข้อง เพราะ*จำนวนที่ฆ่าได้เป็นข้ออ้างเรื่อง
ฟิกซ์เจอร์ไม่น้อยกว่าเรื่องโค้ด* (#48) และการให้เหตุผลว่าแถวใหม่ฆ่าอะไรไม่ได้
ไม่ใช่การวัด (#141) · `clonumberfromid` ล้มสองแถว (1 กับ 4) ·
`activityidinsteadofname` ล้มแถว 2 · `rubriccodeisid` ล้มแถว 3 ·
`crumbatthewrongindex` ล้มแถว 1 (แถว 4 5 6 ผ่าน) · `deeprefusalinvents`
ล้มสามแถว คือ 4 5 และ 6 - เท่าเดิมทุกตัวยกเว้นตัวสุดท้าย

4 ต.ค. 2569 ที่ #190 ฝั่งเปลือกเป็นหกตัว ตัวที่หกคือ `rubricwordgone` ซึ่งยิง
บรรทัดของ Rubric บรรทัดเดียว และวัดแล้วล้มแถว 3 ตัวเดียว ส่วนห้าตัวเดิมไม่ได้
กวาดซ้ำรอบนี้ เพราะไฟล์ spec ไม่โตและไม่มีโค้ดใดเปลี่ยน - สิ่งที่ทำให้ #191
ต้องกวาดซ้ำคือไฟล์ที่โตสองแถว ไม่ใช่การมีมัตแตนต์เพิ่ม
4 ต.ค. 2569 ที่ #189 ฝั่งเปลือกเป็นแปดตัว และสองตัวใหม่คือ `criteriawordfrommap`
กับ `criteriawordforboth` ซึ่งเป็นสองข้อต่อของการจับคู่คำกับเส้นทาง ตัวแรกล้มแถว 1
ตัวเดียว ตัวที่สองล้มแถว 3 กับแถว 6 · **และรอบนี้กวาดซ้ำสองตัว ไม่ใช่ศูนย์ ไม่ใช่ทั้งหมด**
เพราะไฟล์ spec ขยับ - แถว 1 เปลี่ยนค่าที่คาด - จึงกวาดซ้ำเฉพาะตัวที่ฆ่าแถว 1 คือ
`clonumberfromid` (ยังล้มแถว 1 กับ 4) กับ `crumbatthewrongindex` (ยังล้มแถว 1 ตัวเดียว)
อีกสามตัวฆ่าแถวที่ไม่ได้ขยับ จึงไม่ได้กวาด และเหตุผลเขียนไว้ตรงนี้แทนการเดา

ข้อต่อที่สามของ `wordCrumbLabel` คือ *เดินขึ้นไปหาคำ* แทนการนับ segment และมัน
**ยังไม่มีมัตแตนต์** โดยเจตนา เพราะตัวที่นับ (`above = segments[index - 2]`) ตอบเหมือนกัน
ทุกที่อยู่ที่เสิร์ฟอยู่วันนี้ จึงรอดโดยไม่มีอะไรผิด - เป็นข้ออ้างที่ฮาร์เนสทำให้เสี่ยงไม่ได้
พูดไว้ว่า *ยังไม่ได้ทดสอบ* ไม่ใช่ *เข้าไม่ถึงโดยโครงสร้าง* (#102 #107) และวันที่มันหมดอายุ
คือวันที่มีที่อยู่ซึ่งคำกับ id ไม่ได้ห่างกันสอง segment

"""
from harness import main

FILES = {
    "shell": "frontend/src/pages/Mainpage.js",
    "names": "frontend/src/components/breadcrumbNameMap.js",
    "clos": "backend/routes/clos.js",
    "activities": "backend/routes/activities.js",
}

MUTANTS = {
    # ทางลัดที่ตั๋วเสนอแล้วถูกปฏิเสธ: ชื่อที่แต่งขึ้นจาก id ในที่อยู่
    "clonumberfromid": ("shell",
        "  clo: async crumb => (await getCourseOutcome(crumb.sectionId, crumb.id)).clo.clo_number,\n",
        "  clo: async crumb => `CLO-${crumb.id}`,\n"),
    # ป้ายกลายเป็นกุญแจอีกครั้ง หนึ่งชนิดต่อหนึ่งแถว
    "activityidinsteadofname": ("shell",
        "  activity: async crumb => (await getActivity(crumb.sectionId, crumb.id)).activity.activity_name,\n",
        "  activity: async crumb => String((await getActivity(crumb.sectionId, crumb.id)).activity.id),\n"),
    "rubriccodeisid": ("shell",
        "  rubric: async crumb => `Rubric ${(await getRubric(crumb.id)).rubric.rubric_code}`,\n",
        "  rubric: async crumb => `Rubric ${(await getRubric(crumb.id)).rubric.id}`,\n"),
    # #190 ถามว่าเกล็ดนี้ควรวาดคำว่า Rubric นำหน้ารหัสหรือวาดรหัสเปล่าเหมือนอีกสองชนิด
    # คำตอบคือคงคำไว้ และข้อเสนอที่ถูกปฏิเสธคือสิ่งที่มัตแตนต์ตัวนี้ทำให้รันได้ (#48)
    # `rubriccodeisid` แยกไม่ได้ เพราะมันเก็บคำว่า Rubric ไว้แล้วเปลี่ยนรหัสเป็น id
    # — มัตแตนต์สองตัวที่แปรค่าคุณสมบัติเดียวกันมองคุณสมบัติที่สามไม่เห็น (#96)
    "rubricwordgone": ("shell",
        "  rubric: async crumb => `Rubric ${(await getRubric(crumb.id)).rubric.rubric_code}`,\n",
        "  rubric: async crumb => (await getRubric(crumb.id)).rubric.rubric_code,\n"),
    # ชื่อไปลงที่เกล็ดซึ่งเป็นคำ แทนที่จะลงที่เกล็ดซึ่งเป็นค่า
    # #189 ถามว่าเกล็ดคำว่า `criteria` ซึ่งเป็น segment สุดท้ายของสองที่อยู่ ควรอ่านประโยคของจอไหน
    # คำตอบคือให้อ่านตามเส้นทาง และสองตัวนี้คือสองข้อต่อของการจับคู่นั้น หนึ่งตัวต่อหนึ่งข้ออ้าง (#96)
    # `criteriawordfrommap` ถอดความรู้เรื่องเส้นทางออก แมปจึงตอบประโยคของ Rubric ให้ทั้งสองจอ
    # อย่างที่เป็นอยู่ก่อนใบนี้ — ฆ่าแถว 1 และปล่อยแถว 3 ยืน เพราะแถว 3 อยู่บนที่อยู่ของ Rubric
    "criteriawordfrommap": ("shell",
        "      let label =\n"
        "        wordCrumbLabel(decodedNames, index) ||\n"
        "        breadcrumbNameMap[decodedPath] ||\n"
        "        decodedPath\n",
        "      let label = breadcrumbNameMap[decodedPath] || decodedPath\n"),
    # และข้อต่อกลับทาง: ประโยคใหม่ไปอยู่ในแมป จอ Rubric จึงได้คำของ CLO — ฆ่า **แถว 3 กับแถว 6**
    # ทั้งคู่อ่านเกล็ดสุดท้ายบนที่อยู่ของ Rubric จึงเป็นสองข้ออ้างเรื่องการเดินไปถึง ไม่ใช่ข้อเดียวนับสองครั้ง
    # (#191) และปล่อยแถว 1 ยืน เพราะที่อยู่ของ CLO อ่านจาก `breadcrumbNameByParent` ไม่ได้อ่านจากแมป
    "criteriawordforboth": ("names",
        "  criteria: 'เกณฑ์การให้คะแนนของ Rubric',\n",
        "  criteria: 'เกณฑ์การบรรลุผล',\n"),
    "crumbatthewrongindex": ("shell",
        "    return { kind: 'clo', id: segments[4], index: 4, sectionId: section.id }\n",
        "    return { kind: 'clo', id: segments[4], index: 3, sectionId: section.id }\n"),
    # สิ่งที่การปฏิเสธต้องไม่ทำ: แต่งชื่อขึ้นจาก segment
    "deeprefusalinvents": ("shell",
        "        if (isCurrent()) setDeepLabel(null)\n",
        "        if (isCurrent()) setDeepLabel({ key: `${deeperKind}:${deeperId}`, text: `CLO-${deeperId}` })\n"),
    # ADR-0003: CLO อยู่ที่ (หลักสูตร รายวิชา ปีการศึกษา) ไม่ใช่ที่ id ล้วน
    "grainignored": ("clos",
        "        const clo = await cloOf(pool, offering, req.params.cloId);\n",
        "        const clo = await load(req.params.cloId);\n"),
    # ประตูบานแรกพูดประโยคของข้างใน
    "strangerhearsabouttheclo": ("clos",
        "        if (!offering) return res.status(404).json({ message: REFUSALS.sectionNotFound });\n"
        "\n"
        "        const clo = await cloOf(pool, offering, req.params.cloId);\n",
        "        if (!offering) return res.status(404).json({ message: REFUSALS.cloNotFound });\n"
        "\n"
        "        const clo = await cloOf(pool, offering, req.params.cloId);\n"),
    "strangerhearsabouttheactivity": ("activities",
        "        if (!section) return notThisSection(res);\n"
        "\n"
        "        const activity = await activityOf(section.section_id, req.params.activityId);\n"
        "        if (!activity) return notThisActivity(res);\n"
        "\n"
        "        res.json({ activity });\n",
        "        if (!section) return notThisActivity(res);\n"
        "\n"
        "        const activity = await activityOf(section.section_id, req.params.activityId);\n"
        "        if (!activity) return notThisActivity(res);\n"
        "\n"
        "        res.json({ activity });\n"),
    # กฎการจับคู่ของ #28 ถูกถอดออกจากเส้นทางใหม่ แล้วแทนด้วยค่าตั้งต้น
    "nothingrefusestheactivity": ("activities",
        "        const activity = await activityOf(section.section_id, req.params.activityId);\n"
        "        if (!activity) return notThisActivity(res);\n"
        "\n"
        "        res.json({ activity });\n",
        "        const activity = await activityOf(section.section_id, req.params.activityId);\n"
        "\n"
        "        res.json({ activity: activity ?? { id: Number(req.params.activityId), activity_name: null } });\n"),
}

main(FILES, MUTANTS)
