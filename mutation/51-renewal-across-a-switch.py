# -*- coding: utf-8 -*-
"""#51 - การต่ออายุที่ข้ามการสลับบทบาท เอาหมวกใบเก่ากลับมาสวม

`requireSession` ต่ออายุ token ที่เหลือไม่ถึงสิบนาที และพา *การเลือก* ในนั้นไปด้วย ไม่งั้นคนที่
ทำงานยาวข้ามนาทีที่ยี่สิบจะถูกดีดกลับไปบทบาทอาวุโสสุดเงียบ ๆ แต่การเลือกที่มันพาไปคือการเลือก
ที่อยู่ใน token *ของคำขอนั้น* ซึ่งคือการเลือก ณ ตอนที่คำขอออกจากเบราว์เซอร์ คำขอที่ยังค้างอยู่
ตอนที่คนสลับบทบาทจึงถือ token จากก่อนการสลับ พอมันเขียนคุกกี้ทีหลังคุกกี้ของการสลับ คนเขียน
ทีหลังชนะ เบราว์เซอร์กลับไปสวมหมวกที่ตัวเลือกบนจอไม่แสดงแล้ว - ซึ่งคือความไม่ตรงกันที่เกณฑ์ข้อสี่
ของ #10 มีไว้กัน

คำตอบ (23 ก.ย. 2569, ADR-0006) คือตัวนับ `users.acting_epoch` (migration 0008) การสลับบวก
หนึ่งก่อนออกคุกกี้ของตัวเอง แล้วประทับเลขใหม่ลงใน token การต่ออายุอ่านเลขของบัญชีมาเทียบกับเลข
ใน token ที่ถืออยู่ ถ้าไม่ตรงก็ **ไม่เขียนคุกกี้เลย** - ไม่ใช่เขียนคุกกี้ที่ไม่มี `acting` ซึ่งจะเป็น
ความไม่ตรงกันอันเดิมจากอีกด้าน คำขอนั้นยังถูกตอบตามปกติ มันถามมาด้วยหมวกใบไหนก็ได้คำตอบของ
หมวกใบนั้น แค่ไม่ได้ต่ออายุ session ที่มันถือมา

สิ่งที่ตัวนับบนบัญชีมองไม่เห็นคือ *เบราว์เซอร์ไหนของบัญชีนั้น* - เครื่องที่สองของคนเดียวกันหยุด
ต่ออายุหลังการสลับที่เครื่องแรก ADR-0006 เขียนราคานั้นไว้

## มัตแตนต์

แถวเบราว์เซอร์อยู่ใน `e2e/tests/51a-renewal-across-a-switch.spec.js` (ที่หนึ่ง *a read still out
when the grant changes…*, ที่สอง *a session inside its last ten minutes renews…*) แถว HTTP อยู่ใน
`backend/test/shell.test.js` *a renewal that crosses a switch (#51)*

* `nobump` - การสลับไม่ขยับตัวนับ (อ่านเลขเดิมจาก token แทนการเขียนลงฐานข้อมูล) เลขในคำขอที่ค้าง
  จึงเท่ากับเลขของบัญชี มันเลยต่ออายุได้ ฆ่าแถวเบราว์เซอร์ที่หนึ่งที่ *the hat in the browser after
  the read landed* กับแถว HTTP ที่หนึ่งและที่สี่ - ครึ่ง*การเขียน*ของกลไก
* `bumpafterissue` - ขยับตัวนับ *หลัง* ออกคุกกี้ คุกกี้ของการสลับจึงพาเลขเก่าไป ฆ่าแถวเบราว์เซอร์
  ที่หนึ่งที่ *the switch counter the browser is carrying* และที่สองที่ *the token the browser holds
  after the request* - คุกกี้ที่พาเลขเก่าไปต่ออายุไม่ได้อีกเลย - กับแถว HTTP ที่สี่ คือลำดับ ไม่ใช่
  การมีอยู่
* `switchkeepsold` - คุกกี้ของการสลับพาหมวกใบเดิมไป ทั้งที่คำตอบใน body บอกใบใหม่ ฆ่าแถวเบราว์เซอร์
  ที่หนึ่งที่ *the hat in the browser after the read landed* และที่สองที่ *the hat the renewal
  carried forward* (กับแถวของ `10a` ที่ถามว่า server อนุญาตอะไร)
* `neverrenew` - การเทียบเป็นเท็จเสมอ ไม่มีอะไรต่ออายุอีกเลย ฆ่าแถวเบราว์เซอร์ที่สองแถวเดียว - นี่คือ
  ตัวควบคุมของทั้งใบ: การแก้ที่ทำให้ไม่มีใครต่ออายุก็ผ่านทุกแถวที่เหลือ มันฆ่าแถว HTTP ที่สาม กับแถว
  ของ #99 และ #8 ที่ถามเรื่องการต่ออายุด้วย ซึ่งเป็นผลจริงของมัน
* `noguard` - ลบการเทียบทิ้ง คือโค้ดก่อน #51 ฆ่าแถวเบราว์เซอร์ที่หนึ่งที่ *the hat in the browser
  after the read landed*: คำขอที่ค้างเขียนคุกกี้ทีหลัง คุกกี้นั้นไม่มี `acting` เลย เบราว์เซอร์จึงกลับไป
  สวมหมวกอาวุโสสุดขณะที่ตัวเลือกบนจอบอก อาจารย์ผู้สอน - ความไม่ตรงกันของ #51 ทั้งดุ้น เห็นในเบราว์เซอร์
  - กับแถว HTTP ที่หนึ่ง แถวเบราว์เซอร์ที่สองไม่ตาย ซึ่งถูก: มันเป็นแถวของการต่ออายุที่*ควร*เกิด

แถวเบราว์เซอร์ที่หนึ่งสร้าง token จากก่อนการสลับได้จริง เพราะคำขอที่ `gate` จับไว้ถือ header ที่มันถูก
ส่งออกไป - token ใบเก่ารวมอยู่ในนั้น - และตอนปล่อยมันเล่นซ้ำ header ชุดนั้น สิ่งที่แถวต้องระวังคือ
*จังหวะที่ย่นอายุ*: คำขออะไรก็ได้ที่ออกไประหว่างนั้นจะต่ออายุให้ แล้วคำขอที่จับไว้ก็จะถือ token ใบใหม่
ซึ่งไม่เก่าและไม่พิสูจน์อะไร แถวจึง assert เงื่อนไขนั้นไว้เองก่อน ไม่ใช่เชื่อมันเฉย ๆ

## ไฟล์ที่ใช้ร่วมกัน

`backend/auth/session.js` กับ `backend/routes/me.js` มี `10` กับ `99` ถืออยู่แล้ว
**ห้ามกวาดใบนี้พร้อมกับสองใบนั้น**

## การกวาด

กวาดครั้งแรกเมื่อ 23 ก.ย. 2569 ทีละตัว และกวาดฝั่งเบราว์เซอร์ใหม่ทั้งห้าตัวในวันเดียวกัน หลังเขียน
แถวที่หนึ่งใหม่ให้ถือ token จากก่อนการสลับจริง ๆ - ของเดิมส่งคำขอด้วยคุกกี้ใบสด แล้วผ่านทั้ง `noguard`

## วิธีรัน

    python mutation/51-renewal-across-a-switch.py save
    python mutation/51-renewal-across-a-switch.py nobump
    cd e2e && E2E_FRONTEND_PORT=5300 npx playwright test 51a --reporter=line
    cd backend && node --test test/shell.test.js
    python mutation/51-renewal-across-a-switch.py restore
"""

from harness import main

FILES = {
    'session': 'backend/auth/session.js',
    'me': 'backend/routes/me.js',
}

COMPARE = '  if (epoch !== session.actingEpoch) return;\n'
BUMP = '      const epoch = await bumpActingEpoch(pool, req.auth.userId);\n'
ISSUE = '      issueSession(res, req.auth.userId, epoch, held);\n'

MUTANTS = {
    'nobump': ('me', BUMP, '      const epoch = req.session.actingEpoch;\n'),
    'bumpafterissue': ('me', BUMP + ISSUE,
                       '      issueSession(res, req.auth.userId, req.session.actingEpoch, held);\n'
                       '      await bumpActingEpoch(pool, req.auth.userId);\n'),
    'switchkeepsold': ('me', ISSUE,
                       '      issueSession(res, req.auth.userId, epoch, req.session.acting);\n'),
    'neverrenew': ('session', COMPARE, '  if (true) return;\n'),
    'noguard': ('session', COMPARE, ''),
}

main(FILES, MUTANTS)
