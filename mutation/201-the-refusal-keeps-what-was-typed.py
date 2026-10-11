# -*- coding: utf-8 -*-
"""#201 - คำปฏิเสธของการอ่านเก็บสิ่งที่คนพิมพ์ไว้ สองจอที่กฎของ #151 ไม่เคยไปถึง

#151 บอกว่า *การอ่านที่ล้มเหลวเก็บสิ่งที่จอวาดไว้ล่าสุด* และแก้ด้วยการลบ `setData(null)`
ออกจาก `catch` ที่เจ็ดจอการ์ด กฎนั้นไม่ได้เดินไปถึงสองจอที่ถือ**ร่าง** คือสัดส่วนคะแนน
กับคะแนนกิจกรรม ทั้งสองทิ้งร่างไปพร้อมข้อมูล จอแรกพูดตรงๆ (`setDraft([])`) จอที่สอง
พูดผ่าน `recorded` (`if (!data) return {}`) กับ effect ที่เขียน `setDraft(recorded)`
คำปฏิเสธครั้งเดียวจึงลบคะแนนทั้งชั้นที่พิมพ์ไว้ โดยไม่มีบรรทัดไหนในแฟ้มบอกว่าจะลบ

เจ้าของตัดสินเมื่อ 11 ต.ค. 2569: ใบ 30 **เก็บตารางกับตัวเลข** ใบ 34 **เก็บเมื่อกิจกรรมเดิม
ล้างเมื่อตัวเลือกย้าย** เพราะที่จอนั้น `load` ขึ้นกับ `activityId` ด้วย การอ่านที่ถูกปฏิเสธ
จึงเป็นสองอย่าง และมีอย่างเดียวที่เป็นของ #151

## ห้าตัว สามแถว และเหตุที่แถวหนึ่งต้องมีสองตัว

แถวของทั้งสองจออ่านสองอย่าง คือ *ยังมีแถว/กริดอยู่* แล้วจึง *ในช่องมีสิ่งที่พิมพ์ไว้*
มัตแตนต์ที่ล้างทั้งจอตายที่การอ่านแรก การอ่านที่สองจึงไม่เคยถูกรันเลยถ้ามีแต่ตัวนั้น —
บทเรียนของ #151 (`blanks` ตายที่การอ่าน visibility ส่วน `blinks` ถึงจะพิสูจน์ว่าในช่องมีอะไร)
ฉะนั้นจอละสองตัว: ตัวที่ล้างทั้งจอ และตัวที่เก็บจอไว้แต่ทิ้งร่าง

ตัวที่ห้า `scoreskeepsanyway` คือข้อเสนอที่**ไม่ได้**เลือก ทำให้รันได้ — การแก้ที่เขียน
แบบไม่มีเงื่อนไข ซึ่งเป็นสิ่งเดียวที่ทำให้แถว 3 (ครึ่งที่บอกว่า *เท่านั้น*) เป็นข้ออ้างที่
ชุดทดสอบถือไว้ ไม่ใช่ประโยคบนใบ (#48) มันเทียบ `activityId` กับค่าว่าง ซึ่ง `load` กันไว้
ที่บรรทัดแรกแล้ว (`if (!activityId) return`) จึงไม่เคยจริง โดยที่ตัวถูกเปรียบเทียบยัง
ถูกอ้างถึงอยู่ (#101) และไม่ใช่การเทียบตัวแปรกับตัวเอง ซึ่ง lint จะทัก

## การกวาด (11 ต.ค. 2569)

```
python mutation/201-the-refusal-keeps-what-was-typed.py save
python mutation/201-the-refusal-keeps-what-was-typed.py <ชื่อ>
cd e2e && npx playwright test 201a
python mutation/201-the-refusal-keeps-what-was-typed.py restore
```

| มัตแตนต์ | แถวที่ล้ม | ที่ assertion |
|---|---|---|
| `weightsblanks` | ใบ 30 | `the scheme the screen last drew` |
| `weightsforgetsthenumbers` | ใบ 30 | `what was typed` |
| `scoresblanks` | ใบ 34 (นำเข้า) | `the grid the screen last drew` |
| `scoresforgetsthedraft` | ใบ 34 (นำเข้า) | `the mark typed before the import` |
| `scoreskeepsanyway` | ใบ 34 (สลับ) | `the grid of the Activity left behind` |

ตัวเลขที่วัดได้อยู่ในใบ `docs/acceptance/30-weighting-scheme.md` และ
`docs/acceptance/34-activity-marks.md`

*สิ่งที่ทำให้การกวาดเสียคือเส้นทางที่ซ้ำ เทียบ `FILES` ไม่ใช่เรื่องที่มันพูดถึง*
(#85, #87, #125) — และสองเส้นทางของแฟ้มนี้ซ้ำกับอีกเก้าแฟ้ม — จอสัดส่วนคะแนนอยู่ใน
`30` `111` `122` `133` `141-superseded` `152` ส่วนจอคะแนนกิจกรรมอยู่ใน `34` `133`
`141-superseded` `141-the-guard` `179` สองแฟ้มหลังถือทั้งสองจอ จึงกวาดสองแฟ้ม
พร้อมกันไม่ได้ สิ่งที่ `151` ไม่ทับคือเจ็ดจอการ์ดของมัน ส่วนการแก้ของ #201
ย้ายสมอของสองตัวในสองแฟ้มนั้น คือ `133:scoresstalewins` กับ `30:swallowrefusal` (#140)
"""
from harness import main

FILES = {
    "weights": "frontend/src/pages/GradingWeights.js",
    "scores": "frontend/src/pages/ActivityScores.js",
}

# ใบ 30 — `return false` อยู่ที่ `catch` ของ `load` ที่เดียวในแฟ้ม ซึ่งเป็นสิ่งที่ทำให้
# สมอนี้ไม่ซ้ำกับ `catch` ของ `save` ที่เขียนประโยคเดียวกัน
WEIGHTS_KEEPS = (
    "        if (!error.expired) setNotice({ error: true, message: error.message })\n"
    "      }\n"
    "      return false\n"
)
WEIGHTS_BLANKS = (
    "        setData(null)\n"
    "        setDraft([])\n"
    "        if (!error.expired) setNotice({ error: true, message: error.message })\n"
    "      }\n"
    "      return false\n"
)
# ตารางยังอยู่ครบทุกแถว แต่ตัวเลขในร่างถูกล้าง สิ่งที่คนพิมพ์จึงหาย
# — ตายที่การอ่านที่สองของแถวเท่านั้น เขียนด้วยตัวอัปเดตแบบฟังก์ชัน
# เพราะรุ่นแรกของมันอ่าน `data` จาก closure ของ render แรก (ยังเป็น `null`
# เพราะ `data` ไม่อยู่ใน dependency ของ `load` — lint ของ webpack บอกไว้ด้วย)
# มันจึงล้างแถวไปด้วย และตายที่การอ่านแรก กลายเป็นตัวซ้อนกับ `weightsblanks`
# โดยที่ `what was typed` ไม่เคยถูกรันเลย (การกวาด 11 ต.ค. 2569)
WEIGHTS_FORGETS = (
    "        setDraft(rows => rows.map(row => ({ ...row, weight: '' })))\n"
    "        if (!error.expired) setNotice({ error: true, message: error.message })\n"
    "      }\n"
    "      return false\n"
)

# ใบ 34
SCORES_KEEPS = "        if (drawn.current !== String(activityId)) setData(null)\n"
SCORES_BLANKS = "        setData(null)\n"
# กริดยังอยู่ ร่างหาย — `rows` มาจาก `data` ส่วนค่าในช่องมาจาก `draft`
SCORES_FORGETS = (
    "        if (drawn.current !== String(activityId)) setData(null)\n"
    "        setDraft({})\n"
)
# ข้อเสนอที่ไม่ได้เลือก: เก็บทุกกรณี
SCORES_ANYWAY = "        if (String(activityId) === '') setData(null)\n"

MUTANTS = {
    "weightsblanks": ("weights", WEIGHTS_KEEPS, WEIGHTS_BLANKS),
    "weightsforgetsthenumbers": ("weights", WEIGHTS_KEEPS, WEIGHTS_FORGETS),
    "scoresblanks": ("scores", SCORES_KEEPS, SCORES_BLANKS),
    "scoresforgetsthedraft": ("scores", SCORES_KEEPS, SCORES_FORGETS),
    "scoreskeepsanyway": ("scores", SCORES_KEEPS, SCORES_ANYWAY),
}

main(FILES, MUTANTS)
