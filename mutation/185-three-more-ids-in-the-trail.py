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

**ฝั่งเปลือก** ยิงไปที่ `frontend/src/pages/Mainpage.js` วัดด้วย
`e2e/tests/185a-a-breadcrumb-that-reads-three-more-ids.spec.js`

- `clonumberfromid` คือทางลัดที่ตั๋วปฏิเสธ ทำให้รันได้ (*เมื่อข้อเสนอของตั๋วถูก
  ปฏิเสธ มัตแตนต์ที่ต้องเขียนคือข้อเสนอนั้นเองที่ทำให้รันได้* - #48) ฆ่าแถว 1
  เพราะ id กับเลขไม่ตรงกัน และฆ่าแถว 4 เพราะมันแต่งชื่อขึ้นจาก segment
- `activityidinsteadofname` กับ `rubriccodeisid` คือป้ายที่กลายเป็นกุญแจอีกครั้ง
  ตัวละแถว
- `crumbatthewrongindex` ขยับตำแหน่งของ CLO ลงหนึ่ง ชื่อจึงไปทับเกล็ดที่เป็นคำ
- `deeprefusalinvents` เติมการเขียนลงใน `catch` อันเป็นสิ่งที่การปฏิเสธต้องไม่ทำ
  เหมือนตัวชื่อเดียวกันของ #116 - สิ่งที่ถือข้ออ้างนั้นคือ**การไม่มี**การเขียน

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

`98-narrow-window.py` และ `116-a-breadcrumb-that-reads-the-section.py` ยิงไปที่
`frontend/src/pages/Mainpage.js` ไฟล์เดียวกัน - *สิ่งที่ทำให้การกวาดเสียคือเส้นทางที่ซ้ำกัน เทียบ
`FILES` ไม่ใช่เนื้อเรื่อง* (#125) `mutation/README.md` คือที่ที่เทียบได้
"""
from harness import main

FILES = {
    "shell": "frontend/src/pages/Mainpage.js",
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
    # ชื่อไปลงที่เกล็ดซึ่งเป็นคำ แทนที่จะลงที่เกล็ดซึ่งเป็นค่า
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
