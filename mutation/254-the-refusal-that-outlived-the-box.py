# -*- coding: utf-8 -*-
"""#254 คำปฏิเสธที่มาถึงหลังกล่องเปลี่ยนรหัสผ่านปิด

    python mutation/254-the-refusal-that-outlived-the-box.py save
    python mutation/254-the-refusal-that-outlived-the-box.py <mutant>
    python mutation/254-the-refusal-that-outlived-the-box.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/254a-the-refusal-that-outlived-the-box.spec.js`

    cd e2e && npx playwright test tests/254a-the-refusal-that-outlived-the-box.spec.js
สองแถว · ใบ `docs/acceptance/10-application-shell.md`

## สิ่งที่ตั๋ววินิจฉัย และสิ่งที่การวัดเพิ่ม

`catch` ของ `handlePasswordSubmit` เขียน `setError(err.message)` โดยไม่มีอะไรถามว่ากล่อง
ยังเป็นกล่องที่ส่งคำขอนั้นอยู่ไหม และ **ไม่มีอะไรถอด Navbar** สถานะจึงค้าง แล้วการเปิดครั้ง
ถัดไปวาดมันขึ้นมา เพราะกล่องวาดจาก `{error && <p role="alert">…}` — สปีชีส์ของ #205 ที่มา
เจอบนกล่อง ไม่ใช่บนรายการ

การวัดเพิ่มว่า**มีทางเข้าสองทาง ไม่ใช่ทางเดียว** เพราะ *ยกเลิก* กับฉากหลังไม่ถือธง (คำตอบ
ของเจ้าของงานเมื่อ 26 ต.ค. 2569 บน #228) คนจึงออกแล้วกลับเข้ามาได้**ภายในรอบเดียว** และ
การ์ดที่อ่าน `showChangePwd` เฉย ๆ ตอบทางที่สองไม่ได้ กุญแจจึงเป็นตัวบอกว่า *การเปิดครั้งไหน
เป็นคนส่ง* ไม่ใช่บูลีน (#185, #207) — นั่นคือเหตุที่มัตแตนต์สามตัวข้างล่างเป็นสามตัว

## มัตแตนต์

| ชื่อ | สิ่งที่มันทำ | สิ่งที่มันฆ่า |
|---|---|---|
| `pwdrefusalunguarded` | เอาการ์ดออกจาก `catch` คือโค้ดที่ตั๋ววินิจฉัย เขียนให้รันได้ (#115) | ข้ออ้างของ**ทั้งสองแถว** — ทางเข้าสองทางของข้อบกพร่องเดียว ซึ่งเป็นข้ออ้างเรื่องการไปถึงสองข้อ ไม่ใช่ข้อเดียวนับสองครั้ง (#191) |
| `pwdguardreadsanybox` | ให้การ์ดถามว่า *มีกล่องเปิดอยู่ไหม* (`pwdOpening.current !== null`) แทนที่จะถามว่า *เป็นกล่องนี้ไหม* คือการ์ดที่พอสำหรับทางเข้าแรกและไม่พอสำหรับทางที่สอง | **แถวที่สองเท่านั้น** แถวแรกผ่านใต้มัน เพราะตอนคำตอบลงไม่มีกล่องเปิดอยู่ · นี่คือมัตแตนต์ที่แยก *ปักค่าของวันนี้* ออกจาก *จออ่านกฎ* (#145) และเป็นเหตุที่แถวที่สองมีอยู่ |
| `pwdopeningkept` | ไม่ล้าง `pwdOpening.current` ตอนออกจากกล่อง การ์ดจึงเทียบ sentinel กับตัวเอง | **แถวแรกเท่านั้น** แถวที่สองผ่านใต้มัน เพราะการเปิดครั้งใหม่เขียน sentinel ตัวใหม่ทับ · เป็นข้ออ้างของครึ่ง *ล้างตอนออก* ซึ่ง #167 วางไว้และตั๋วนี้ต่อจากมัน |

ข้ออ้างฝั่งบวก — *คำปฏิเสธ **ถูก** พูดกับกล่องที่ส่งมันเอง* — คือแถวที่สองของ `243a`
ซึ่งไฟล์นี้ไม่พูดซ้ำ สองที่ที่ถือความเห็นเดียวกันคือข้ออ้างที่ไม่มีที่ไหนพิสูจน์ได้ (#97)
มัตแตนต์ทั้งสามข้างบน**ปล่อยแถวนั้นยืนอยู่** ซึ่งคือสิ่งที่ทำให้มันเป็นแถวควบคุม (#48)

ไม่มีมัตแตนต์ของ `setSending(false)` ที่อยู่นอกการ์ด — ธงที่บอกว่า *การเขียนยังไม่กลับ*
ต้องลงทุกทางที่มันขึ้น ไม่งั้นมันค้างถาวร (#227) ราคาของมันคือกล่องที่เปิดขณะคำขอเก่ายังค้าง
ซึ่งช่องกรอกถูกปิดด้วยธงของการเปิดครั้งก่อน **วัดเมื่อ 31 ต.ค. 2569 ด้วย probe ในแถวที่สอง**
(`field0 disabled true | save disabled true` ขณะคำขอค้าง และ `false` ทั้งคู่เมื่อคำตอบถึง)
นั่นเป็นคนละข้ออ้าง คนละการแก้ และเป็นตั๋วของตัวเอง คือ **#258** ซึ่งถือคำถามของ
เจ้าของงานว่าคำขอที่สองส่งได้ไหมขณะคำขอแรกยังไม่กลับ — คำถามที่แถวที่สองของ `243a`
ตัดสินไว้สำหรับการกดสองครั้งบนกล่องเดิม ไม่ใช่สำหรับการเปิดใหม่หลังทิ้งคำขอไว้ (#141)

## ตอนกวาด

`components/Navbar.js` อยู่ใน `mutation/10-application-shell.py`,
`mutation/47-profile-photo.py`, `mutation/66-sign-in-landing.py`,
`mutation/111-refusals-announced.py`, `mutation/167-a-cancelled-dialog-forgets.py` กับ
`mutation/243-the-form-that-sent-the-save-twice.py` ด้วย — ชื่อทั้งหกมาจาก
`grep -ln 'components/Navbar.js' mutation/*.py` ไม่ใช่จากความจำ และการ grep นั้น**หัก**
รุ่นแรกของย่อหน้านี้ ซึ่งเขียนห้าชื่อ ชื่อหนึ่งไม่มีอยู่จริง (`97-one-opinion-about-401.py`)
และขาดสองใบที่มีอยู่ — ความผิดชนิดเดียวกับที่รีวิวของ #253 จับได้เมื่อวันก่อน และ
ไม่มีเครื่องมือไหนรายงาน `anchors.py` อ่านสมอ ไม่ได้อ่านร้อยแก้ว (#126) · เส้นทางที่ซ้ำกัน
ทำให้การกวาดเสีย จึงเทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง และอย่ากวาดใบนี้ข้างหกใบนั้น
(#85, #87, #125)
"""
from harness import main

FILES = {
    'navbar': 'frontend/src/components/Navbar.js',
}

MUTANTS = {
    # 1 - the diagnosed code, exactly as it stood until 31 October 2569 (#115).
    'pwdrefusalunguarded': (
        'navbar',
        '      if (pwdOpening.current === opening) setError(err.message)\n',
        '      setError(err.message)\n',
    ),

    # 2 - the guard that asks *is a box open* instead of *is this the box*.
    # Right about the box that was closed, blind to the one that was reopened,
    # which is the whole reason the ref holds a key and not a presence flag
    # (#185, #145).
    #
    # This is the second shape written here. The first read `showChangePwd`,
    # and the measurement of 31 ตุลาคม 2569 refuted the table above it: it
    # killed **both** rows, because a handler created in the render that pressed
    # the button holds that render's `true` for as long as it runs (#143, #201),
    # so the mutant read a frozen constant and was a duplicate of mutant 1
    # rather than a weaker guard. A mutant that reads state from outside a
    # dependency list measures the closure and not the claim; this one reads the
    # ref, which is what a live answer can be compared against at all.
    'pwdguardreadsanybox': (
        'navbar',
        '      if (pwdOpening.current === opening) setError(err.message)\n',
        '      if (pwdOpening.current !== null) setError(err.message)\n',
    ),

    # 3 - the other half of the key: the opening has to end on the way out, or
    # the guard compares a sentinel with itself. Anchored on the code the
    # mutant breaks and the line below it, never on the comment beside it
    # (#101, #121).
    'pwdopeningkept': (
        'navbar',
        "    pwdOpening.current = null\n    setError('')\n",
        "    setError('')\n",
    ),
}

main(FILES, MUTANTS)
