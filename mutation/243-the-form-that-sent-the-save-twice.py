# -*- coding: utf-8 -*-
"""#243 สองจอที่ข้ออ้างแวดล้อมของ #228 ไม่เป็นจริง

    python mutation/243-the-form-that-sent-the-save-twice.py save
    python mutation/243-the-form-that-sent-the-save-twice.py <mutant>
    python mutation/243-the-form-that-sent-the-save-twice.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/243a-the-form-that-sent-the-save-twice.spec.js`

    cd e2e && npx playwright test tests/243a-the-form-that-sent-the-save-twice.spec.js
    cd e2e && npx playwright test tests/258a-the-box-opened-while-the-change-was-out.spec.js
สามแถว · ใบ `docs/acceptance/10-application-shell.md` (สองแถวแรก) กับ
`docs/acceptance/50-sign-in-screens.md` (แถวที่สาม)

## คำถามที่เลือกจอ

#228 ล้อมข้อบกพร่องของตัวเองไว้ด้วยประโยคหนึ่ง — *ปุ่ม บันทึก ของทั้งห้าจอ
`disabled={busy}` อยู่แล้ว การขยับช่องระหว่างนั้นจึงไม่ได้ทำให้ส่งซ้ำ* ซึ่งเป็นข้ออ้าง
เกี่ยวกับแต่ละจอ (#133) ตารางของ #243 นับ **ช่องกรอก** และการวัดใหม่เมื่อ 29 ต.ค. 2569
ให้ 66 ช่องใน 17 แฟ้ม แต่สิ่งที่เรียงลำดับงานได้คือคำถามอีกข้อ: **ปุ่มที่ส่งฟอร์มนั้นถือ
ธงอะไร** — 25 ปุ่มถือธงของหน้า และ **สองปุ่มไม่ถือ**อะไรเลย คือสองแฟ้มที่ข้อ 3 ของใบ
ตั้งชื่อไว้พอดี `components/Navbar.js` กับ `components/LoginForm.js` และคำตอบของทั้งสอง
ตรงกันข้าม

- `Navbar.js` — กล่องเปลี่ยนรหัสผ่านอยู่ต่อเมื่อถูกปฏิเสธ (`10a` ข้อ 7 ถือไว้) และ
  ไม่มีอะไรห้ามการกดครั้งที่สอง ข้อบกพร่องที่นี่จึงเป็น**คำขอที่สอง** ไม่ใช่แค่ค่าที่
  แยกทาง จึงเป็นที่ที่รูปของ #228 ลง
- `LoginForm.js` — `pages/Login.js` เอาฟอร์มทั้งฟอร์มออกจากหน้าจอขณะที่การเข้าสู่ระบบ
  ค้างอยู่ หน้าต่างจึงไม่มีให้คนเจอ (#203 การอ่านที่ตอบด้วยการ**แทนที่หน้าจอ**) แฟ้มนั้น
  ได้เหตุผลพร้อมวันที่ ไม่ได้ธง (#141) — และเหตุผลนั้นเป็นข้ออ้างเกี่ยวกับเฟรม จึงถูก
  **อ่าน** ไม่ใช่ถูกเถียง (#169) มัตแตนต์ตัวสุดท้ายคือกลไกของเหตุผลนั้นเองที่ถูกถอด

## มัตแตนต์

เจ็ดตัว เพราะแถวรายงานข้อยืนยัน**ตัวแรก**ที่ตาย ข้ออ้างที่เขียนใต้ข้ออ้างอื่นจึงไม่มีอะไร
พิสูจน์ถ้าไม่มีมัตแตนต์ของตัวเอง (#88)

| ชื่อ | สิ่งที่มันทำ | สิ่งที่มันฆ่า |
|---|---|---|
| `oldpasswordlive` | เอา `disabled={pwdBusy}` ออกจากช่องรหัสผ่านเดิม คือโค้ดก่อนตั๋วนี้เป๊ะ ๆ (#115) | ข้ออ้างที่ 1 ของแถว 1 |
| `newpasswordlive` | เช่นเดียวกันที่ช่องรหัสผ่านใหม่ | ข้ออ้างที่ 2 ของแถว 1 |
| `confirmpasswordlive` | เช่นเดียวกันที่ช่องยืนยัน | ข้ออ้างที่ 3 ของแถว 1 |
| `savelive` | เอา `disabled={pwdBusy}` ออกจากปุ่ม *บันทึกรหัสใหม่* | ข้ออ้างที่ 4 ของแถว 1 **และข้ออ้างของแถว 2** — การกดครั้งที่สองส่งคำขอที่สองจริง ซึ่งเป็นข้อบกพร่องที่ใบนี้วัดได้ |
| `flagneverlowered` | เอาการลงธงใน `finally` ออก ธงขึ้นแล้วไม่ลง | ข้ออ้างสุดท้ายของแถว 2 — ช่องกลับมากดได้หลังคำปฏิเสธ ซึ่งเป็นข้ออ้างที่สี่ข้อข้างบนทั้งหมดยังจริงอยู่ขณะที่มันเท็จ (#227) · และข้ออ้างสุดท้ายของแถวที่สองของ `258a` ตั้งแต่ 1 พ.ย. 2569 ดูหัวข้อข้างล่าง |
| `cancelclosed` | ให้ *ยกเลิก* ของกล่องนี้อ่าน `disabled={pwdBusy}` คือข้อเสนอที่เจ้าของงานปฏิเสธเมื่อ 26 ต.ค. 2569 ทำให้รันได้ (#48) | ข้ออ้างที่ 5 ของแถว 1 · และ **สองแถวของ `254a` กับสองแถวของ `258a`** ซึ่งใช้ปุ่มนั้นเป็น**เครื่องมือ**จัดสถานการณ์ ไม่ใช่เป็นเรื่องที่อ้าง (#199, #221) |
| `loginformstays` | ให้ `pages/Login.js` วาดฟอร์มไว้แทนที่จะสลับเป็นสถานะกำลังโหลด คือกลไกที่เหตุผลข้างแฟ้ม `LoginForm.js` ยืนอยู่บน ถูกถอดออก | ข้ออ้างของแถว 3 |

ชื่อของ attribute ในสามแถวแรกกับแถว `savelive` อ่านว่า `disabled={sending}` จนถึง
1 พ.ย. 2569 เมื่อ #258 เปลี่ยนธงของกล่องนี้เป็นตัวที่ถือการเปิดที่ส่ง ความผิดที่
มัตแตนต์ทำไม่เปลี่ยน คือตัวควบคุมนั้นไม่ถือธงอะไรเลย (#203, #54)

`savelive` ฆ่าสองแถว ซึ่งไม่ใช่ข้ออ้างเดียวที่นับสองครั้ง แต่เป็นข้ออ้างเรื่อง**การไปถึง**
สองข้อ (#191): แถว 1 อ่านว่าปุ่มถูกปิด แถว 2 อ่านว่าการกดมันไม่ส่งอะไร ซึ่งเป็นคนละ
ประโยคและเป็นประโยคที่ทำให้ใบนี้ไม่ใช่เรื่องของค่าที่แยกทางอย่างเดียว

ไม่มีมัตแตนต์ของ *ตา* ที่เปิดดูรหัสผ่าน — มันไม่ใช่ช่องกรอก และการเปิดดูสิ่งที่พิมพ์ไว้
ไม่เปลี่ยนสิ่งที่กำลังถูกส่ง ซึ่งเป็นทั้งหมดที่ธงนี้เกี่ยวกับ เหตุผลนั้นอยู่ข้าง
`sendingFor` ใน `Navbar.js` (ชื่อนั้นคือ `sending` จนถึง 1 พ.ย. 2569)

## ตอนกวาด

`frontend/src/components/Navbar.js` อยู่ใน `10-application-shell.py`, `47-profile-photo.py`,
`66-sign-in-landing.py`, `111-refusals-announced.py`, `167-a-cancelled-dialog-forgets.py`,
`254-the-refusal-that-outlived-the-box.py` กับ
`258-the-box-opened-while-the-change-was-out.py` ด้วย และ
`pages/Login.js` อยู่ใน `50-sign-in-screens.py` — ชื่อทั้งแปดมาจาก
`grep -ln 'components/Navbar.js' mutation/*.py` ไม่ใช่จากความจำ (#126) และรายการเดิม
ของย่อหน้านี้เขียนไว้สี่ชื่อ ซึ่งหมดอายุไปแล้วสามใบ · เส้นทางที่ซ้ำกันทำให้การกวาดเสีย
จึงเทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง และอย่ากวาดใบนี้ข้างเจ็ดใบนั้น (#85, #87, #125)
"""
from harness import main

FILES = {
    'navbar': 'frontend/src/components/Navbar.js',
    'login': 'frontend/src/pages/Login.js',
}

# Each field is anchored on the `type=` above its own `disabled`: the three
# write the same two lines, so the line alone is not unique, and the eye each
# one reveals itself with is what makes the site that field's (#140).
#
# Four of the mutants below were re-aimed on 1 พฤศจิกายน 2569 by #258, which
# replaced the page-wide boolean this file's rows were written against with a
# flag holding **which opening** sent the change: `disabled={sending}` became
# `disabled={pwdBusy}` at all four sites and `setSending(false)` became a keyed
# updater. What is preserved is the mistake and not the line (#203) — each
# mutant still takes the same control's flag away, and `cancelclosed` still
# writes the declined option, in today's spelling. `anchors.py` reports the
# anchors; only re-running them says they still prove what their sheet credits
# them with, so all seven were swept again that day (#107, #68).
FIELD_OPEN = "                            type={show%s ? 'text' : 'password'}\n" \
             "                            required\n" \
             "                            disabled={pwdBusy}\n"
FIELD_LIVE = "                            type={show%s ? 'text' : 'password'}\n" \
             "                            required\n"

MUTANTS = {
    # 1 — the current-password field, live while the change it sent is out:
    # the code as it stood before 29 October 2569.
    'oldpasswordlive': ('navbar', FIELD_OPEN % 'Old', FIELD_LIVE % 'Old'),

    # 2 and 3 — the claims written below the one above, and so proved by
    # nothing without mutants of their own (#88).
    'newpasswordlive': ('navbar', FIELD_OPEN % 'New', FIELD_LIVE % 'New'),

    'confirmpasswordlive': ('navbar', FIELD_OPEN % 'Confirm',
                            FIELD_LIVE % 'Confirm'),

    # 4 — the button, which is the whole of the difference between this screen
    # and the twenty-five whose premise held.
    'savelive': ('navbar',
                 '                          type="submit"\n'
                 '                          disabled={pwdBusy}\n',
                 '                          type="submit"\n'),

    # 5 — the flag raised and never let go. Everything row 1 reads stays true
    # under this one; what goes red is the person being able to correct the
    # password they got wrong (#227).
    # Re-aimed on 31 October 2569 by #254, which put a guard on the
    # `setError` this anchor used to quote and three comment lines inside
    # the `finally`. The claim is unchanged - the flag goes up and never
    # comes down - and the mutant is narrower than the one it replaces:
    # it empties the `finally` instead of deleting it, so `setError` and
    # its guard are left alone (#203, #140).
    'flagneverlowered': ('navbar',
                         '      setSendingFor(current => '
                         '(current === opening ? null : current))\n'
                         '    }\n',
                         '    }\n'),

    # 6 — the declined option made to run (#48): *ยกเลิก* closed with the rest,
    # which the owner's answer of 26 October 2569 refused. It kills row 1's
    # fifth claim and nothing else — `167a` presses this button with no save
    # out, so the flag is down when it does.
    'cancelclosed': ('navbar',
                     '                          type="button"\n'
                     '                          onClick={closeChangePassword}\n',
                     '                          type="button"\n'
                     '                          disabled={pwdBusy}\n'
                     '                          onClick={closeChangePassword}\n'),

    # 7 — the mechanism the sign-in screen's dated reason rests on, taken away:
    # the form is drawn through the round trip instead of being replaced. Both
    # halves of the switch move, which is the screen behaving differently rather
    # than a different screen - but it leaves `LoadLogin` written at three lines
    # and read at none, which the development server this suite runs reports as
    # a warning and not as an error, so the screen draws and this mutant kills
    # its row (measured 29 October 2569). Under `CI=true` that same unread
    # binding fails the build (#101), so a sweep run with `CI` set is the
    # condition to re-aim this one on; nothing in the repository sets it.
    'loginformstays': ('login',
                       "          <RetiringPresence at={LoadLogin ? 'loading' : 'content'} mode=\"wait\">\n"
                       '            {!LoadLogin ? (\n',
                       "          <RetiringPresence at={'content'} mode=\"wait\">\n"
                       '            {true ? (\n'),
}

main(FILES, MUTANTS)
