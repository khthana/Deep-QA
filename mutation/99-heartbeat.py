# -*- coding: utf-8 -*-
"""#99 - คนที่กำลังพิมพ์อยู่คือคนที่กำลังทำงาน และตอนนี้ server รู้

`requireSession` ต่ออายุ token ที่เหลือไม่ถึงสิบนาที แต่เฉพาะเมื่อมีคำขอ และการพิมพ์ไม่ใช่คำขอ
ตั๋วเขียนว่า *ไม่ต่ออายุเลย* ซึ่งไม่เคยจริง - การต่ออายุอยู่มาตั้งแต่ `d368652` (17 ส.ค. 2569)
ก่อนตั๋วเปิดแปดวัน ต้นเหตุจริงคือ คำขอที่นาทีที่สิบเก้าไม่ต่ออะไรและเหลือสิบเอ็ดนาที ฟอร์มยาวที่เขียน
ในสิบเอ็ดนาทีนั้นจึงถูกบันทึกลง session ที่หมดแล้ว

คำตอบ (22 ก.ย. 2569, ADR-0005) คือ shell ส่ง `POST /api/me/activity` เมื่อมีการกดปุ่มหรือคลิก
ห่างกันอย่างน้อยห้านาที route นั้นไม่ทำอะไรเลย การต่ออายุมาจาก `requireSession` ด้วยเกณฑ์เดิม
สิบลบห้าคือช่วงที่คนทำงานหยุดกดได้โดยไม่ถูกเด้งออก ไม่มีเพดานอายุ

การคลิกที่ส่ง heartbeat อาจเป็นการคลิกออกจากระบบหรือสลับบทบาทเอง และคำตอบของ heartbeat อาจมี
คุกกี้ที่ต่ออายุแล้ว ถ้ามันมาถึงทีหลังก็จะพาเบราว์เซอร์กลับเข้าระบบ หรือเอาบทบาทเก่ากลับมา (#51)
`logout` กับ `switchRole` จึงรอ heartbeat ที่ยังค้างอยู่ใน `beating` ก่อน - ผู้รีวิวเจอ ไม่ใช่การกวาด
รีวิวรอบสองเจอทางที่สาม: การออกจากระบบของ listener เมื่อบัญชีถูกจบ (#52) - `requireSession` ต่ออายุ
ก่อน `attachRoles` ปฏิเสธ heartbeat ที่ถูกปฏิเสธจึงยังพาคุกกี้กลับมาได้ listener จึงรอด้วย

## มัตแตนต์

ฝั่ง browser (`99a-heartbeat.spec.js`)

* `nobeat` - ไม่ส่ง heartbeat เลย คือโค้ดก่อน #99 ควรฆ่าแถวที่หนึ่งและสอง ที่จำนวน และแถว
  ที่สี่ที่ precondition ของมัน (*the first heartbeat*) ไม่ฆ่าแถวที่สาม แถวห้าถึงเจ็ดจะตายที่ timeout
  เพราะไม่มี heartbeat ให้กั้น - การรอ ไม่นับ (#139)
* `clicksonly` - ไม่ฟัง `keydown` ควรฆ่าแถวการพิมพ์ (หนึ่ง และสี่ที่ precondition) ไม่ฆ่าแถวคลิก
* `keysonly` - ไม่ฟัง `pointerdown` ควรฆ่าแถวคลิกแถวเดียวที่ assertion - สองทางเข้า สองแถว (#66)
  แถวห้าถึงเจ็ดส่ง heartbeat ด้วยการคลิก จึงตายที่ timeout เหมือน `nobeat` ไม่นับ
* `timerbeat` - เพิ่มตัวจับเวลาที่ส่ง heartbeat ทุก `HEARTBEAT_MS` ไม่ว่าจะมีใครกดหรือไม่
  และตั้งเวลาล่าสุดด้วย แถวการกดจึงยังนับได้หนึ่ง ควรฆ่าแถวที่สาม (*ten minutes with nothing
  pressed*) - เก้าอี้ว่างที่ไม่มีวันหมดอายุ - และแถวห้าถึงเจ็ดที่ assertion ของมัน เพราะ heartbeat
  ที่ถูกกั้นคือของตัวจับเวลา ซึ่งไม่มีใครรอ แถวห้าถึงเจ็ดไม่ได้อ้างมัน มันไม่ได้แยกสามแถวนั้นออกจากกัน
* `slowbeat` - `HEARTBEAT_MS` เป็นหกนาที ควรฆ่าแถวที่หนึ่งและสองที่จำนวน - แถวตรึง *ไม่เกินห้า*
  ซึ่งเป็นครึ่งของ browser ในสิบลบห้า
* `fastbeat` - `HEARTBEAT_MS` เป็นสามสิบวินาที ควรฆ่าแถวที่สี่ที่ *heartbeats within five
  minutes* แถวเดียว
* `nostart` - นาฬิกาไม่เริ่มตอน session เริ่ม คลิกดินสอตอนเตรียมแถวจึงส่ง heartbeat ไปแล้วหนึ่ง
  ควรฆ่าแถวหนึ่ง สอง ที่จำนวน (ได้สอง) และสี่ที่ precondition ไม่ฆ่าแถวสาม เพราะมันนับหลังเตรียม
* `logoutunwaited` - `logout` ไม่รอ ควรฆ่าแถวที่ห้า (*a sign-out sent while the heartbeat was out*)
  แถวเดียว
* `switchunwaited` - `switchRole` ไม่รอ ควรฆ่าแถวที่หก (*switches sent while the heartbeat was
  out*) แถวเดียว
* `endedunwaited` - listener ของการจบไม่รอ ควรฆ่าแถวที่เจ็ด (*an ended account signed out while the
  heartbeat was out*) แถวเดียว

ส่วนที่ไม่มีมัตแตนต์: `!expired` ใน `working` - หลังประกาศหมดอายุ ทุกคำขอถูกตอบ 401 อยู่แล้ว
heartbeat ที่หลุดไปจึงไม่เปลี่ยนอะไรที่แถวไหนอ่านได้ **ไม่ได้ทดสอบ** และ `<` เทียบกับ `<=`
ใน throttle ต่างกันที่มิลลิวินาทีเดียว **ไม่ได้ทดสอบ** - นาฬิกาในแถวเลยห้านาทีไปหลายมิลลิวินาทีเสมอ

ฝั่ง HTTP (`backend/test/shell.test.js` *a heartbeat (#99)*)

* `unrouted` - ไม่มี route ควรฆ่าแถวหนึ่งและสอง (404) แถวสามผ่านทั้งสองทาง เพราะ 401 มาจาก
  middleware ก่อนถึง route - แถวนั้นจึงไม่ได้อ้างมัตแตนต์นี้
* `alwaysrenew` - route ต่ออายุทุกครั้ง ควรฆ่าแถวที่สอง (*leaves a session with more than that
  alone*) แถวเดียว - แถวที่บอกว่า heartbeat ไม่ได้ต่ออายุแรงกว่าคำขออื่น ซึ่งคือเหตุผลเรื่อง #51
* `fivethreshold` - `RENEW_BELOW_SECONDS` เป็นห้านาที ควรฆ่าแถวที่หนึ่งแถวเดียว เพราะ token
  เก้านาทีเขียนเป็นตัวเลข ไม่ได้อ่านจากค่าคงที่ - ครึ่งของ server ที่ตรึงสิบ

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`AuthContext.js` อยู่ใน `FILES` ของ `10` `52` และ `97` ด้วย `me.js` กับ `session.js` อยู่ใน
`FILES` ของ `10`
**ห้ามกวาดใบนี้พร้อมกับสามใบนั้น**

## การกวาด

กวาดครั้งที่สามเมื่อ 22 ก.ย. 2569 ทีละตัว หลังเพิ่มแถวเจ็ด - baseline `99a` **7 ผ่านทั้ง 7**
(0.5 นาที) `shell.test.js` **27 ผ่าน**

* `nobeat` **ล้ม 6 ผ่าน 1** - แถวหนึ่ง สอง ที่จำนวน สี่ที่ precondition และห้าถึงเจ็ด **ที่ timeout**
  (3.4 นาที) ไม่นับ
* `clicksonly` **ล้ม 2 ผ่าน 5** - แถวหนึ่ง และสี่ที่ precondition
* `keysonly` **ล้ม 4 ผ่าน 3** - แถวสอง และห้าถึงเจ็ดที่ timeout ไม่นับ
* `timerbeat` **ล้ม 4 ผ่าน 3** - แถวสาม และห้าถึงเจ็ดที่ชื่อของมัน
* `slowbeat` **ล้ม 6 ผ่าน 1** - แถวหนึ่ง สอง สี่ที่ precondition และห้าถึงเจ็ดที่ timeout ไม่นับ
* `fastbeat` **ล้ม 1 ผ่าน 6** - แถวสี่ที่ *heartbeats within five minutes*
* `nostart` **ล้ม 3 ผ่าน 4** - แถวหนึ่ง สอง ที่จำนวน และสี่ที่ precondition
* `logoutunwaited` **ล้ม 1 ผ่าน 6** - แถวห้า
* `switchunwaited` **ล้ม 1 ผ่าน 6** - แถวหก
* `endedunwaited` **ล้ม 1 ผ่าน 6** - แถวเจ็ด
* `unrouted` - `not ok` ที่แถว HTTP หนึ่งและสอง (404) node รายงาน **fail 3 pass 24** เพราะนับ
  test แม่ *a heartbeat (#99)* ด้วย
* `alwaysrenew` - `not ok` ที่แถว HTTP สอง node รายงาน **fail 2 pass 25** (รวมแม่)
* `fivethreshold` - `not ok` ที่แถว HTTP หนึ่ง node รายงาน **fail 2 pass 25** (รวมแม่)

ทุกตัวตายที่ assertion ที่ทำนายไว้ อ่านจากชื่อ ไม่ใช่จากจำนวน - ไม่มีตัวไหนไปถึงคำตอบ 204 ที่แถว
หนึ่งกับสองอ่านต่อ มันจึงไม่ได้อ้าง แถวอยู่บน `docs/acceptance/10-application-shell.md`

`52:cookiekept` ยกบรรทัดเดียวกับ `endedunwaited` จึงถูกเล็งใหม่ในรอบเดียวกัน และกวาดซ้ำบน `52a`

## วิธีรัน

    python mutation/99-heartbeat.py save
    python mutation/99-heartbeat.py <mutant>
    python mutation/99-heartbeat.py restore
"""
from harness import main

FILES = {
    'context': 'frontend/src/context/AuthContext.js',
    'me': 'backend/routes/me.js',
    'session': 'backend/auth/session.js',
}

BEAT = "      beating.current = post('/api/me/activity').catch(() => {})\n"
KEYS = "    document.addEventListener('keydown', onActivity, true)\n"
CLICKS = "    document.addEventListener('pointerdown', onActivity, true)\n"
INTERVAL = "const HEARTBEAT_MS = 5 * 60 * 1000\n"
START = "    lastBeat.current = Date.now()\n"
LOGOUT = "      await post('/api/auth/logout')\n"
SWITCH = "    const next = await put('/api/me/acting-role', {\n"
ENDED = ("      Promise.resolve(beating.current)\n"
         "        .then(() => post('/api/auth/logout'))\n"
         "        .catch(() => {})\n")
THRESHOLD = "const RENEW_BELOW_SECONDS = 10 * 60;\n"
ROUTE = "  router.post('/me/activity', (req, res) => res.status(204).end());\n"

MUTANTS = {
    'nobeat': ('context', BEAT, "      lastBeat.current = now\n"),
    'clicksonly': ('context', KEYS, ''),
    'keysonly': ('context', CLICKS, ''),
    'timerbeat': ('context', CLICKS,
                  CLICKS +
                  "    const timer = setInterval(() => {\n"
                  "      lastBeat.current = Date.now()\n"
                  "      post('/api/me/activity').catch(() => {})\n"
                  "    }, HEARTBEAT_MS)\n"
                  "    void timer\n"),
    'slowbeat': ('context', INTERVAL, "const HEARTBEAT_MS = 6 * 60 * 1000\n"),
    'fastbeat': ('context', INTERVAL, "const HEARTBEAT_MS = 30 * 1000\n"),
    'nostart': ('context', START, ''),
    'logoutunwaited': ('context', "      await beating.current\n" + LOGOUT, LOGOUT),
    'switchunwaited': ('context', "    await beating.current\n" + SWITCH, SWITCH),
    'endedunwaited': ('context', ENDED, "      post('/api/auth/logout').catch(() => {})\n"),
    'unrouted': ('me', ROUTE, ''),
    'alwaysrenew': ('me', ROUTE,
                    "  router.post('/me/activity', (req, res) => {\n"
                    "    issueSession(res, req.session.userId, req.session.acting);\n"
                    "    return res.status(204).end();\n"
                    "  });\n"),
    'fivethreshold': ('session', THRESHOLD, "const RENEW_BELOW_SECONDS = 5 * 60;\n"),
}

main(FILES, MUTANTS)
