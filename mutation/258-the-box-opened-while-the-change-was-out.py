# -*- coding: utf-8 -*-
"""#258 กล่องเปลี่ยนรหัสผ่านที่เปิดขณะคำขอของการเปิดครั้งก่อนยังค้าง

    python mutation/258-the-box-opened-while-the-change-was-out.py save
    python mutation/258-the-box-opened-while-the-change-was-out.py <mutant>
    python mutation/258-the-box-opened-while-the-change-was-out.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/258a-the-box-opened-while-the-change-was-out.spec.js`

    cd e2e && npx playwright test tests/258a-the-box-opened-while-the-change-was-out.spec.js
    cd e2e && npx playwright test tests/243a-the-form-that-sent-the-save-twice.spec.js
    cd e2e && npx playwright test tests/254a-the-refusal-that-outlived-the-box.spec.js

สองแถว · ใบ `docs/acceptance/10-application-shell.md`

## สิ่งที่ตั๋ววินิจฉัย และสิ่งที่การวัดเพิ่ม

#249 ปิดช่องกรอกทั้งสามและปุ่ม *บันทึกรหัสใหม่* ของกล่องเปลี่ยนรหัสผ่านด้วย
`disabled={sending}` ตามคำตอบของเจ้าของงานเมื่อ 26 ต.ค. 2569 และคำตอบเดียวกันนั้นให้
*ยกเลิก* กับฉากหลัง**ไม่ถือธง** เพราะคนที่เลิกบันทึกแล้วต้องออกได้ สองประโยคนั้นรวมกันคือ
ทางเข้าของใบนี้ — คนกดบันทึก กด *ยกเลิก* ขณะคำขอยังค้าง เปิดกล่องใหม่ แล้วได้กล่องที่
กรอกไม่ได้ ปิดด้วยธงของ**การเปิดครั้งก่อน** โดยไม่มีอะไรบนจอบอกว่าทำไม

วัดก่อนแก้ด้วย `e2e/probes/258-the-second-opening.spec.js` เมื่อ 1 พ.ย. 2569 สามแขน:

| แขน | สิ่งที่อ่านได้บนกล่องที่เปิดครั้งที่สอง |
|---|---|
| `ปฏิเสธ` | `fields 3` · `fields disabled [true, true, true]` · `save disabled true` · `cancel disabled false` · กดแล้ว `requests 1` คือไม่มีอะไรออกไป · เมื่อคำตอบแรกถึง ทั้งสี่กลับมา `false` |
| `สำเร็จ` | เหมือนกันตอนค้าง · เมื่อคำตอบถึง **กล่องปิด** และประโยคสำเร็จของเปลือกขึ้น |
| `ซ้อน` | บน `HEAD` ไม่มีคำขอที่สองออกไปเลย จึงไม่มีการซ้อนให้อ่าน — ซึ่งเป็นสิ่งที่แขนนี้พิมพ์ ไม่ใช่ข้าม |

บรรทัดที่สามของแขนแรกคือสิ่งที่ทำให้นี่เป็น**หน้าต่าง** ไม่ใช่ความตายถาวร และความยาวของมัน
คือรอบของคำขอนั้น ไม่ใช่ 190 ms ของ tween (#257) และไม่ใช่สิ่งที่คนที่เพิ่งพิมพ์รหัสผ่านลงไป
รู้ว่าต้อง reload ล้าง

**การวัดหักราคาของข้อ ข ด้วยคำพูดของมันเอง** ตั๋วเขียนว่าข้อ ข *ถูกกว่าข้อ ก หนึ่งบรรทัด
และได้พฤติกรรมเดียวกัน* วัดด้วยการใส่ `setSending(false)` ลงใน `closeChangePassword`
แล้วอ่านแขน `ซ้อน` ได้ `requests 3` และกล่องที่สองมีช่องกรอกที่ใช้ได้ขณะ**คำขอของตัวเอง
ยังค้าง** นั่นไม่ใช่พฤติกรรมเดียวกัน แต่เป็นข้อบกพร่องสปีชีส์ #243 ตัวใหม่ จึงถูกตัดออก
จากรายการของเจ้าของงานด้วยการวัด ไม่ใช่ด้วยการเถียง (#152, #228) · ส่วนข้อ ก วัดได้ว่า
กล่องที่สองใช้ได้ทันที คำขอที่สองออกไปได้ และคำตอบของคำขอแรก**ไม่**ปลดกล่องที่สอง

## คำถามของเจ้าของงาน และคำตอบ — 1 พ.ย. 2569

คำถามที่หนึ่ง *คนที่ทิ้งคำขอไว้กลางทางแล้วเปิดกล่องใหม่ ควรส่งคำขอที่สองได้ไหม* —
**ข้อ ก ธงบอกว่าเป็นของการเปิดครั้งไหน** คือส่งได้

คำถามที่สอง ซึ่งเป็นใบสั่งที่ย่อหน้าใน `Navbar.js` เขียนไว้ข้างเงื่อนไขของมันเองตั้งแต่ #254
(#242, #54) *เมื่อคำขอแรกสำเร็จขณะกล่องที่สองเปิดอยู่ ควรปิดกล่องนั้นไหม* — **ปิดอย่าง
วันนี้** ใบสั่งนั้นจึงถูกนำไปถามพร้อมการวัด ไม่ใช่ถูกทำตาม และสิ่งที่การวัดเพิ่มคือกล่องที่สอง
*ถือสิ่งที่พิมพ์ไว้แล้ว* ซึ่งคือรหัสผ่านปัจจุบันที่คำขอนั้นเพิ่งเปลี่ยนไป กล่องที่เปิดค้างไว้
จึงถูกปฏิเสธ 403 หนึ่งการกดถัดไป คือประโยคปฏิเสธหลังความสำเร็จ

## ตารางทำนาย เขียนก่อนรันมัตแตนต์ตัวแรก (#255)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันจะฆ่า |
|---|---|---|
| `pagewideflag` | `pwdBusy` อ่านแค่ว่า *มีคำขอค้างอยู่ไหม* (`sendingFor !== null`) ไม่ถามว่าของการเปิดครั้งไหน คือ **ข้อ ง อย่างวันนี้** ทำให้รันได้ (#48) และเป็นรูปของโค้ดก่อนตั๋วนี้เป๊ะ ๆ ที่ทั้งสี่ตัวควบคุม | **แถวแรก** ที่ `the current-password field of the second opening` ไม่ใช่การนับเหนือมัน ซึ่งเป็นเงื่อนไขก่อนที่ยังจริงใต้มัน (#233) · และ**แถวที่สอง**ที่เงื่อนไขก่อนของมัน คือ `fill` บนช่องที่ถูกปิด ซึ่งตายที่ `locator.fill` ไม่ใช่ที่ข้ออ้าง (#139) — ข้ออ้างเรื่องการไปถึงสองข้อของโค้ดที่แบ่งกันใช้ ไม่ใช่ข้อเดียวนับสองครั้ง (#191, #193) |
| `secondsendrefused` | `handlePasswordSubmit` ขึ้นต้นด้วย `if (sendingFor !== null) return` คือ **ครึ่งกลไกของข้อ ค** ย้ายจาก attribute เข้าไปใน handler — คำขอที่สองถูกปฏิเสธ โดยไม่มีประโยคบอก ซึ่งเป็นครึ่งที่ไม่มีโค้ดถือ จึงเขียนเป็นมัตแตนต์ไม่ได้ (#48) | **แถวแรก** ที่ข้ออ้าง**สุดท้าย**ของมัน `requests after the second opening pressed save` ซึ่งไม่มีมัตแตนต์ตัวไหนฆ่ามาก่อน · และ**แถวที่สอง**ที่การจัดสถานการณ์ซึ่งต้องการคำขอที่สอง คือข้อยืนยันชื่อเดียวกัน |
| `flagdownatanyanswer` | `finally` ลงธงโดยไม่ถามว่าเป็นของการเปิดนี้ไหม คือ **ข้อ ข** ทำให้รันได้ — ธงลงที่คำตอบไหนก็ได้ที่มาถึงก่อน | **แถวที่สองเท่านั้น** ที่ `the current-password field while its own change is out` · แถวแรกเขียวใต้มัน เพราะมีคำขอออกไปทีเดียวหนึ่งคำขอ และกล่องที่สองใช้ได้เพราะกุญแจของ `pwdBusy` ไม่ใช่เพราะ `finally` |

มัตแตนต์ทั้งสาม**ปล่อยสองแถวแรกของ `243a` ยืนอยู่** ซึ่งคือเกณฑ์ที่ตั๋วเขียนไว้: กดสองครั้ง
บนกล่องเดิมยังต้องส่งครั้งเดียว ใต้ `pagewideflag` ธงขึ้นตอนกดและลงตอนคำตอบถึงเหมือนบูลีน
ของวันก่อน ใต้ `flagdownatanyanswer` มีคำขอเดียวออกไป ธงจึงลงที่คำตอบของมันเอง

**ข้อ ข เขียนเต็มรูปคือมัตแตนต์ที่เท่ากับตัวที่สอง** — บูลีนกลับมา บวกการลงธงใน
`closeChangePassword` ด้วย แต่การลงธงตอนออกจากกล่องปลดได้เฉพาะกล่องที่**ไม่มี**คำขอของ
ตัวเองค้างอยู่ ซึ่งเป็นสิ่งที่แถวแรกเรียกร้องให้ว่างอยู่แล้ว สองแถวนี้จึงแยกสองรูปนั้นไม่ออก
และข้ออ้างที่ซ้ำคือข้ออ้างที่ไม่มีที่ไหนพิสูจน์ได้ (#97, #201)

ไม่มีมัตแตนต์ของ `sendingFor !== null` ที่เป็นข้อแรกของ `pwdBusy` — เอาออกแล้ว `pwdBusy`
เป็นจริงตอนกล่องปิด (`null === null`) ซึ่งไม่มีแถวไหนอ่านได้ เพราะฟอร์มไม่ถูกวาดตอนนั้นเลย
เป็นข้อที่**ไปถึงไม่ได้เชิงโครงสร้าง** ไม่ใช่ *ไม่ถูกทดสอบ* (#102) และอยู่เพื่อคนอ่าน ไม่ใช่
เพื่อการพิสูจน์ (#142)

## ตัวที่สาม ที่การทบทวนสองแกนขอ — 1 พ.ย. 2569

การทบทวนถามว่ามัตแตนต์ตัวไหนฆ่าข้ออ้าง**สุดท้าย**ของแถวแรก คือ *คำขอที่สองออกไป* และ
คำตอบคือ**ไม่มี** — ทั้งสองตัวข้างบนปลดหรือปิดตัวควบคุม ซึ่งแถวอ่านห้าบรรทัดเหนือข้ออ้างนั้น
มันจึงตายที่นั่น และบรรทัดใต้เส้นแดงไม่เคยถูกอ่าน (#88) · ⚙ หมายถึงข้อยืนยันที่ใบอ้างถึง
ครอบคลุมแถว**ทั้งแถว** ฉะนั้นก่อนตัวที่สาม แถวแรกเป็นการอ้างเกินจริงที่อ่านดูถ่อมตัว (#116)

`secondsendrefused` จึงเป็นกลไกของข้อ ค ที่ย้ายที่: ไม่ปิดอะไรเลย แต่ปฏิเสธการส่งครั้งที่สอง
ใน handler ทุกการอ่าน `disabled` ของแถวจึงผ่าน แล้วแถวตายที่การนับคำขอ · วัดได้เมื่อ
1 พ.ย. 2569 ว่า **ล้ม 2 ผ่าน 5** — แถวแรกที่ `requests after the second opening pressed
save` ซึ่งคือข้ออ้างของมันเอง และแถวที่สองที่ข้อยืนยันชื่อเดียวกัน ซึ่งที่นั่นเป็น**การจัด
สถานการณ์** ไม่ใช่ข้ออ้าง — ตรงตามตารางที่เขียนไว้ก่อนกวาด

**และข้ออ้างกลางของแถวที่สองยังเป็นตาข่าย** คือ *การกดขณะคำขอของตัวเองยังค้าง ไม่ส่งอะไร*
มัตแตนต์ที่จะทำให้การกดนั้นส่งต้องปลดปุ่ม ซึ่งเป็นสิ่งที่แถวอ่านสี่บรรทัดเหนือมัน การกลับข้อ
นั้นจึงฆ่าการอ่านข้างบนก่อนทุกครั้ง — ข้ออ้างที่ harness เอาเข้าเสี่ยงไม่ได้ (#47 การอ่าน
ครั้งที่หก) · เขียนไว้ข้างมันในสเปค พร้อมเงื่อนไขที่จะทำให้มันอ่านได้ คือวันที่การกดถูก
ปฏิเสธที่อื่นนอกจาก attribute ซึ่งคือสิ่งที่ `secondsendrefused` ทำ และที่นั่นมันฆ่าแถว
ก่อนถึงบรรทัดนั้น

## สองจำนวนของ #243 ที่การแก้นี้ทำให้ต้องกวาดซ้ำ — ทำนายไว้ก่อนกวาด

การแก้เขียน `disabled={pwdBusy}` ทับทั้งสี่ตำแหน่งและเปลี่ยน `setSending(false)` เป็น
updater ที่มีกุญแจ สมอของมัตแตนต์สี่ตัวของ #243 จึงถูก**เล็งใหม่** สิ่งที่คงไว้คือความผิด
ไม่ใช่บรรทัด (#203) และ `anchors.py` บอกได้แค่ว่าสมอยังตรง มีแต่การรันซ้ำที่บอกว่ามันยัง
พิสูจน์สิ่งที่ใบให้เครดิตมันไว้ (#107, #68)

| ชื่อ | ทำนาย |
|---|---|
| `243:oldpasswordlive` | เท่าเดิม — แถวที่ 1 ของ `243a` ยังตาย · `258a` เขียว เพราะกล่องที่สองไม่ควรปิดอยู่แล้ว |
| `243:newpasswordlive` | เท่าเดิม |
| `243:confirmpasswordlive` | เท่าเดิม |
| `243:savelive` | เท่าเดิม — และ **ไม่** เพิ่มแถวของ `258a`: แถวแรกอ่านว่าปุ่มของกล่องที่สอง*ใช้ได้* ซึ่งมัตแตนต์นี้ทำให้จริงยิ่งขึ้น ไม่ใช่เท็จ |
| `243:flagneverlowered` | เท่าเดิมหนึ่งแถว และ**เพิ่มแถวที่สองของ `258a`** ที่ข้อยืนยันสุดท้าย — ธงที่ไม่เคยลงทำให้กล่องที่สองไม่กลับมาใช้ได้เมื่อคำตอบของมันเองถึง |
| `243:cancelclosed` | เท่าเดิมหนึ่งแถว และ**เพิ่มแถวแรกของ `258a`** ที่ `ยกเลิก of the second opening` ไม่ได้ — มันตายก่อนนั้น ที่ `cancelButton(page).click()` ของแถวแรก ซึ่งรอปุ่มที่ถูกปิดแล้วตายที่ timeout (#139) · และ**เพิ่มแถวที่สอง**ด้วยเหตุเดียวกัน |
| `243:loginformstays` | ไม่เกี่ยว — อีกไฟล์ |

## ตอนกวาด

`components/Navbar.js` อยู่ใน `mutation/10-application-shell.py`,
`mutation/47-profile-photo.py`, `mutation/66-sign-in-landing.py`,
`mutation/111-refusals-announced.py`, `mutation/167-a-cancelled-dialog-forgets.py`,
`mutation/243-the-form-that-sent-the-save-twice.py` กับ
`mutation/254-the-refusal-that-outlived-the-box.py` ด้วย — ชื่อทั้งเจ็ดมาจาก
`grep -ln 'components/Navbar.js' mutation/*.py` ไม่ใช่จากความจำ (#126) · เส้นทางที่ซ้ำกัน
ทำให้การกวาดเสีย จึงเทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง และอย่ากวาดใบนี้ข้างเจ็ดใบนั้น
(#85, #87, #125)
"""
from harness import main

FILES = {
    'navbar': 'frontend/src/components/Navbar.js',
}

MUTANTS = {
    # 1 - option ง made to run (#48): the flag says *a change is out* and not
    # *whose*, which is what the boolean of #249 said and what the ticket's
    # fourth option would keep. Anchored on the comparison itself and not on
    # the docblock above it (#101, #121).
    'pagewideflag': (
        'navbar',
        '  const pwdBusy = sendingFor !== null'
        ' && sendingFor === pwdOpening.current\n',
        '  const pwdBusy = sendingFor !== null\n',
    ),

    # 2 - option ข's mechanism made to run (#48): the flag comes down at
    # whichever answer lands first. The claim this one puts at risk is the
    # **key** in the `finally`, which is the half of the fix that no reading of
    # one change out can tell apart from a bare clearing - so it is a mutant of
    # its own and not a second shape of the one above (#88, #97).
    'flagdownatanyanswer': (
        'navbar',
        '      setSendingFor(current => (current === opening ? null : current))\n',
        '      setSendingFor(null)\n',
    ),
    # 3 - the review of 1 พย. 2569 asked which mutant kills row 1's own
    # last claim, *a second request leaves*, and the answer was none: both of
    # the mutants above free or close the controls, which the row reads five
    # lines higher, so they die there and the send is never read (#88).
    #
    # This one is option ค's mechanism moved off the attribute and into the
    # handler - the second send refused, with no sentence to say so, which is
    # the half of ค that no mutant can write because no code holds it (#48).
    # It kills row 1 at its last assertion and row 2 at the arrangement that
    # needs the second request, which is what makes row 1's send claim proved
    # and row 2's own press claim a net (#47, #88).
    'secondsendrefused': (
        'navbar',
        "    e.preventDefault()\n    setError('')\n",
        "    e.preventDefault()\n    setError('')\n"
        '    if (sendingFor !== null) return\n',
    ),
}

main(FILES, MUTANTS)
