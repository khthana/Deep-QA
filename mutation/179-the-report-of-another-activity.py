# -*- coding: utf-8 -*-
r"""#179 - รายงานผลนำเข้าของกิจกรรมหนึ่ง ถูกวาดอยู่ในแผงของอีกกิจกรรม

`ImportPanel` เก็บรายงานไว้ในสเตตของตัวเอง และรายงานนั้นเป็นเรื่องของ *กิจกรรมที่ไฟล์ถูกส่งไปให้*
เก้าในสิบจอที่ใช้แผงนี้ แยกสองอย่างนั้นออกจากกันไม่ได้ เพราะเป้าเป็นฟังก์ชันเปล่าหรือ closure บนค่าจาก
`useParams` จอที่สิบคือ `pages/ActivityScores.js` ที่เป้าเป็นสเตตซึ่ง `<select>` ข้างแผงเขียนได้
และ `load` ของจอนั้นไม่เคลียร์ `data` แผงจึงไม่ถูกถอดขณะที่ตัวเลือกย้าย

**การ์ดที่เขียนเพื่อผู้เรียกรายหนึ่ง คือคำกล่าวอ้างเกี่ยวกับผู้เรียกทุกราย** (#68 #133) การ์ดที่จอนั้นมี
อยู่แล้วคุ้มครองตารางคะแนนของจอ — `onImported` ถาม `onScreen.current === activityId` — มันเอื้อม
เข้าไปในแผงไม่ถึง และสิ่งที่อยู่ในแผงคือประโยค *นำเข้าสำเร็จ N รายการ* กับตารางแถวที่ผิด

## สองกลไก วัดเป็นตาราง ไม่ใช่เถียงว่าเลือกอันไหน (#148)

ลำดับที่ตั๋วเขียนไว้เป็นการแข่ง: คำตอบของการนำเข้า A กลับมาตอนตัวเลือกอยู่ที่ B วัดแล้วเจอทางที่สอง
ที่ไม่ต้องแข่งเลย — รายงานที่ลงมาแล้ว **ค้างอยู่บนจอ** เมื่อตัวเลือกย้าย เพราะไม่มีอะไรเคลียร์มัน
ทางนั้นไม่ใช่หน้าต่างแคบ ๆ มันอยู่จนกว่าจะรีโหลด และเป็นทางที่คนเจอง่ายกว่า

และการ์ดมีขอบ: คำปฏิเสธที่ไม่มีรายบรรทัดไม่ใช่คำตอบเกี่ยวกับอะไรบนจอ มันเป็นเรื่องของคนกับคำขอ
แผงจึงส่งต่อให้จอ และจอพูดมันทุกครั้ง — รูปเดียวกับแถบแจ้งผลของการบันทึกที่ใบ `34` ตัดสินไว้แล้ว
และเป็น *สิ่งที่ต้องเกิดทุกครั้ง ไม่ไปอยู่หลังสิ่งที่ปฏิเสธได้* (#131) มัตแตนต์ตัวที่สี่คือรูปที่ตรงกันข้าม

## มัตแตนต์

สี่ตัว — **หนึ่งตัวต่อกลไก กลไกที่สองลงสองจุด จึงมีมัตแตนต์ต่อจุด** (#125) และตัวที่สี่คือรูปที่
**ถูกปฏิเสธ ทำให้รันได้** (#48)

* `reportoutlivesthetarget` — การเคลียร์ตอนเป้าเปลี่ยนถูกถอดออก `setAimedAt` ยังอยู่ จึงไม่มี
  ลูปของการเรนเดอร์ และแอปไม่หยุด ควรฆ่าแถวที่ 1 กับที่ 3 (ครึ่งหลังของทั้งสอง) และ **ต้องไม่ฆ่า**
  แถวที่ 2 กับที่ 4 เพราะคำตอบที่มาสายยังถูกการ์ดอยู่
* `drawsasupersededsuccess` — การ์ด `latest.current !== asked` ใน branch ที่สำเร็จถูกถอด
  ควรฆ่าแถวที่ 4 เท่านั้น
* `drawsasupersededrefusal` — การ์ดตัวเดียวกันใน branch ที่ถูกปฏิเสธถูกถอด ควรฆ่าแถวที่ 2 เท่านั้น
* `swallowsthesupersededrefusal` — **ย้ายการ์ดขึ้นไปไว้เหนือทั้ง branch** ซึ่งเป็นที่ที่มันอยู่จน
  การรีวิวของ #179 ถามว่าคำปฏิเสธที่ไม่มีรายบรรทัดไปไหน ตอนนั้นคำปฏิเสธชนิดนั้น (เซสชันหมดอายุ
  สิทธิ์ไม่พอ) ถูกกลืนเงียบ ๆ ทั้งที่มันเป็นเรื่องของคน ไม่ใช่เรื่องของกิจกรรมบนจอ ควรฆ่าแถวที่ 5
  เท่านั้น และ**ไม่แตะการวาดเลย** จึงปล่อยแถวที่ 1–4 ยืนอยู่ทั้งหมด

ตัวที่สองกับที่สามเป็น **โค้ดที่ตั๋ววินิจฉัย ทำให้รันได้** ซึ่งเป็นสิ่งเดียวที่ทำให้คำวินิจฉัยกลายเป็นคำกล่าวอ้าง
ที่ชุดทดสอบถือไว้ (#115) ทั้งสองจุดถาม *คำถามเดียวกัน* และถูกเขียนไว้แห่งละครั้ง — `asked` กับ
`latest` มีที่เขียนที่เดียวต่อหนึ่งตัว จึงไม่ใช่สองความเห็น (#97) แต่เมื่อการเปลี่ยนแปลงหนึ่งลงสองจุด
ก็เขียนมัตแตนต์ต่อจุด เพราะแต่ละจุดเป็นคำกล่าวอ้างของแถวต่างกัน: ไฟล์ที่ถูกรับ กับไฟล์ที่ถูกปฏิเสธ

ไม่มีตัวไหนทำให้แอปพลิเคชันหยุด — สองตัวหลังถอดการ์ดออกเท่านั้น ซึ่งคือโค้ดที่เคยอยู่จริงก่อน #179

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`FILES` คือ `frontend/src/components/ImportPanel.js` ไฟล์เดียว เทียบ `FILES` ไม่ใช่หัวเรื่อง
(#85 #87 #125) — ไม่มีใบไหนถือไฟล์นี้ ตรวจด้วย `grep -rl ImportPanel mutation/*.py`
แต่สิบจอวาดแผงนี้ ฉะนั้น **ใบของมันคือหนึ่งในที่ที่มันฆ่า ไม่ใช่ลิสต์** (#123): มัตแตนต์ที่ถอดการ์ด
ออกไม่เปลี่ยนพฤติกรรมของเก้าจอที่เหลือ เพราะเป้าของพวกนั้นเปลี่ยนไม่ได้โดยที่จอไม่หาย

## การกวาด

กวาดเมื่อ 1 ต.ค. 2569 ทีละตัว กับ `179a-the-panel-that-kept-another-activity-s-report.spec.js`
(ชื่อเต็ม ไม่ใช่ `179a` เพราะชื่อไฟล์ถูกจับแบบ substring — #158) baseline **5 ผ่านทั้ง 5 (23.8 วิ)**

| มัตแตนต์ | ผล | แถวและ assertion ที่ตาย |
|---|---|---|
| `reportoutlivesthetarget` | ล้ม 2 ผ่าน 3 (25.9 วิ) | `:217` ตารางรายงานของกิจกรรมที่ถูกทิ้งไว้ และ `:266` ประโยคสีเขียวของมัน |
| `drawsasupersededsuccess` | ล้ม 1 ผ่าน 4 (25.0 วิ) | `:289` ประโยคสีเขียวของคำตอบที่มาสาย |
| `drawsasupersededrefusal` | ล้ม 1 ผ่าน 4 (25.0 วิ) | `:243` ตารางรายงานของคำตอบที่มาสาย |
| `swallowsthesupersededrefusal` | ล้ม 1 ผ่าน 4 (24.2 วิ) | `:322` จำนวนแบนเนอร์ของเปลือก ซึ่งนับครั้งเดียวที่จุดนิ่ง ไม่ใช่การรอ (#139) |

ทุกตัวฆ่าเฉพาะแถวของคำกล่าวอ้างของตัวเอง `reportoutlivesthetarget` ปล่อยแถวที่ 2 กับที่ 4
ยืนอยู่ตามที่คาด — ซึ่งเป็นสิ่งที่บอกว่าสองกลไกนี้แยกกันจริง ไม่ใช่กลไกเดียวที่เขียนสองที่ — และ
`swallowsthesupersededrefusal` ปล่อยทั้งสี่แถวแรกยืนอยู่ เพราะมันไม่ได้แตะการวาดอะไรเลย

**แถวที่ 5 ถูกเขียนใหม่หลังกวาดรอบแรก และมัตแตนต์ของมันถูกรันซ้ำ** (#146) รอบแรกแถวนั้นอ่าน
`toContainText` ซึ่งลองใหม่จนหมดเวลา — การอ่านสิ่งที่มัตแตนต์ทำให้ไม่มีอยู่คือการรอ ไม่ใช่
assertion และหน้าตาเหมือนมัตแตนต์ที่ทำให้แอปหยุด (#139) ตอนนี้มันนับแบนเนอร์ครั้งเดียวที่จุดนิ่ง
ก่อนจะอ่านข้อความ จึงล้มทันทีและล้มด้วยตัวเลข

## คำสั่ง

    python mutation/179-the-report-of-another-activity.py save
    python mutation/179-the-report-of-another-activity.py <mutant>
    python mutation/179-the-report-of-another-activity.py restore

    cd e2e && npx playwright test 179a-the-panel-that-kept-another-activity-s-report.spec.js
"""
from harness import main

FILES = {
    'panel': 'frontend/src/components/ImportPanel.js',
}

# The first mechanism: what the panel remembers is forgotten when the target
# changes. `setAimedAt` stays, so the render that notices the change still
# records it and there is no loop; only the forgetting goes.
FORGETS = """  if (target !== aimedAt) {
    setAimedAt(target)
    setReport(null)
    setFilename('')
  }"""
KEEPS = """  if (target !== aimedAt) {
    setAimedAt(target)
  }"""

# The second, at each of its two sites. The anchors carry the line beside them
# because the guard itself is written in the same words twice, and the harness
# replaces a string it finds exactly once (#126).
GUARDS_THE_SUCCESS = """      const result = await send(await file.text())
      if (latest.current !== asked) return
"""
DRAWS_THE_SUCCESS = """      const result = await send(await file.text())
"""
GUARDS_THE_REFUSAL = """      if (error.details?.length) {
        if (latest.current !== asked) return
        setReport({ ok: false, errors: error.details })
      } else onError?.(error)"""
DRAWS_THE_REFUSAL = """      if (error.details?.length) {
        setReport({ ok: false, errors: error.details })
      } else onError?.(error)"""

# And the arrangement that was declined, made to run: the guard above the whole
# branch, which is where it stood until the review of #179 asked what happens to
# a refusal carrying no rows (#48). It swallows the shell's sentence and leaves
# every drawing exactly as the fix leaves it.
SPEAKS = """      if (error.details?.length) {
        if (latest.current !== asked) return"""
SWALLOWS = """      if (latest.current !== asked) return
      if (error.details?.length) {"""

MUTANTS = {
    'reportoutlivesthetarget': ('panel', FORGETS, KEEPS),
    'drawsasupersededsuccess': ('panel', GUARDS_THE_SUCCESS, DRAWS_THE_SUCCESS),
    'drawsasupersededrefusal': ('panel', GUARDS_THE_REFUSAL, DRAWS_THE_REFUSAL),
    'swallowsthesupersededrefusal': ('panel', SPEAKS, SWALLOWS),
}

main(FILES, MUTANTS)
