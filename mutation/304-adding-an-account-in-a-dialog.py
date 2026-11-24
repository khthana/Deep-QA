# -*- coding: utf-8 -*-
"""#304 — เพิ่มผู้ใช้เป็น dialog แบบเดิม

คำตอบของเจ้าของงานเมื่อ 22 พ.ย. 2569 (`docs/users-screen.md` ข้อ 10): *dialog + กฎของเจ้าของงาน* · ข้ออ้างอยู่ใน
`e2e/tests/304a-adding-an-account-in-a-dialog.spec.js` และใบรับงานคือ `docs/acceptance/11-user-accounts.md` §#304

**`304a` ไม่ใช่ `serial`** แต่ละแถวลงชื่อเข้าใช้และเปิดหน้าต่างเอง และไม่มีแถวไหนเขียนลงฐานข้อมูล (การบันทึกของแถว 3 กับ 4
ถูกกักแล้วตอบ 409) ฉะนั้นการกวาดอ่านได้ทุกแถวที่มัตแตนต์ไปถึง และคำทำนายบอกทุกแถวนั้น

**การจัดวางไม่มีมัตแตนต์** — `docs/ui-form-layout.md` §การพิสูจน์: การจัดวางเป็นรูปลักษณ์ จึงเป็นแถวเดินมือ และ spec ที่ผ่าน
ทั้งหมดพิสูจน์ว่าการจัดวางไม่ได้พังพฤติกรรม ไม่ใช่ว่าการจัดวางถูก

**ครึ่งหลังของแถว 5 — *การเปิดครั้งหน้าเริ่มว่าง* — ไม่มีมัตแตนต์** มันถูกถือโดยการ mount: `Users.js` วาด `AddUserDialog`
เฉพาะตอน `editing` ฉะนั้นการเปิดทุกครั้งคือ `UserForm` ใหม่ (#167) และมัตแตนต์ที่ทำให้ค่าค้างต้องเปลี่ยนภาชนะทั้งอัน
ซึ่งเป็นมัตแตนต์ของการออกแบบอื่น ไม่ใช่ของบรรทัด · ข้ออ้างจึงเป็นตาข่าย และเงื่อนไขที่จะทำให้มันอ่านได้คือวันที่หน้าต่างถูกวาด
ค้างไว้แล้วซ่อน (#203)

**`role="dialog"` ไม่มีมัตแตนต์** เพราะทุกแถวหาหน้าต่างด้วยบทบาทนั้น — attribute ที่ตัวหาสร้างบนมันเป็นข้อตั้งของแถว
ไม่ใช่ข้ออ้าง (#85, #111) · สิ่งที่แถว 1 อ้างคือ `aria-modal` รายการที่ยังวาดอยู่ข้างหลัง และโฟกัส

## ตารางมัตแตนต์ — คำทำนาย เขียนก่อนรันตัวแรก (#255 · 24 พ.ย. 2569)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `formreplaceslist` | รายการไม่ถูกวาดขณะที่หน้าต่างเปิด — รูปของโค้ดก่อน #304 ที่ฟอร์มวาดแทนรายการ | **1** — `304a` แถว 1 ที่ `listTable` toBeVisible |
| `notmodal` | หน้าต่างไม่บอกว่าเป็น modal | **1** — `304a` แถว 1 ที่ `aria-modal` toHaveAttribute |
| `focusstaysout` | ไม่ย้ายโฟกัสเข้าหน้าต่าง และไม่ฟัง Escape (`useModalFocus` ปิด) | **2** — `304a` แถว 1 ที่ `focus is inside the dialog` · แถว 5 ที่ dialog toBeHidden |
| `escapeignored` | Escape ไม่ปิดหน้าต่าง โฟกัสยังเข้า | **1** — `304a` แถว 5 ที่ dialog toBeHidden |
| `passwordforall` | ช่องรหัสผ่านอยู่ทุกบทบาท บังคับเฉพาะสองบทบาท — รูปของโค้ดก่อน #304 | **1** — `304a` แถว 2 ที่ `password` toHaveCount(0) ตัวแรก |
| `passwordnotrequired` | ช่องรหัสผ่านของสองบทบาทไม่บังคับ | **1** — `304a` แถว 2 ที่ `required` toHaveAttribute ของ `EXT_ASSESSOR` |
| `sendshidden` | ส่งรหัสผ่านที่พิมพ์ไว้แม้บทบาทที่เลือกไม่ใช้ — รูปของโค้ดก่อน #304 | **1** — `304a` แถว 3 ที่ `the hidden password` toBe('') |
| `noticebehind` | คำปฏิเสธวาดที่ประกาศของหน้า ซึ่งอยู่หลังฉากทึบ ไม่วาดในหน้าต่าง | **1** — `304a` แถว 4 ที่ alert ในหน้าต่าง toHaveText |
| `noticetwice` | วาดคำปฏิเสธทั้งในหน้าต่างและที่ประกาศของหน้าหลังฉาก | **1** — `304a` แถว 4 ที่ `alerts on the page` toBe(1) |
| `nomaxheight` | หน้าต่างไม่มีเพดานความสูง | **1** — `304a` แถว 6 ที่ `the box against 90% of 480` |
| `noscroll` | หน้าต่างมีเพดานแต่ไม่เลื่อนภายใน | **1** — `304a` แถว 6 ที่ `save` toBeInViewport · ไม่ใช่ที่ `the box scrolls inside` เพราะ `scrollHeight` ของกล่องที่ `overflow: visible` ยังนับส่วนที่ล้น |

## มัตแตนต์ของใบอื่นที่ #304 เล็งใหม่ — คำทำนาย (24 พ.ย. 2569, ก่อนรัน)

| ชื่อ | คำทำนาย |
|---|---|
| `146:userscancelclears` | เล็งใหม่เพราะ *ยกเลิก* ของการเพิ่มย้ายไปอยู่ใน `onCancel` ของ `AddUserDialog` ตื้นขึ้นสองระดับ ความผิดเดิมบรรทัดเดิม · ตายที่แถวเดิมของ `146a` ซึ่งใบรับงาน `11-user-accounts.md` อ้าง |

## มัตแตนต์ที่กวาดซ้ำเพราะแถวที่ฆ่ามันกดเข้าหน้าต่างนี้ — คำทำนาย (24 พ.ย. 2569, ก่อนรัน)

นับด้วยกลไก (#199, #221): มัตแตนต์ที่แก้ `Users.js` หรือ `UserForm.js` (`census304.py` ใน scratchpad อ่าน `FILES` ของทุกแฟ้ม ได้ 92 ตัว
ใน 23 แฟ้ม) **และ**แถวที่ฆ่ามันเปิดฟอร์มเพิ่มบัญชี · ตัวที่เหลือเป็นมัตแตนต์ของตาราง สวิตช์ การนำเข้า และตัวกรอง ซึ่งแถวไม่ผ่าน
หน้าต่างนี้ · ที่มาไม่เปลี่ยน ฉะนั้นคำทำนายของทุกตัวคือ **ตายที่แถวเดิมที่ใบของมันอ้าง** และสิ่งที่การกวาดถามคือ
การมาถึงผ่านหน้าต่างยังถึงข้ออ้างนั้นไหม (#198) · สามสิบหกตัว รันกับ spec ของใบตัวเองทั้งแฟ้ม

| แฟ้ม | มัตแตนต์ | spec |
|---|---|---|
| `140` | `userssavestalewins` | `140a` |
| `144` | `usersqnotfollowed` `usersrolenotfollowed` `usersstatusnotfollowed` | `144a` |
| `146` | `usersclosewins` `usersrefusalwins` `userscancelclears` | `146a` |
| `202` | `userssaysanyway` | `202a` |
| `203` | `userssaveanyway` | `203a` |
| `238` | `userssaysanyread` `usersneversays` | `238a` |
| `247` | `usersalwayssays` `usersroleblind` `usersstatusblind` `userssearchblind` `userssearchuntrimmed` | `247b` |
| `249` | `useremaillive` `usernamelive` `usernamepage` | `249a` |
| `296` | สิบเอ็ดตัวของ `UserForm.js` | `296a` |
| `88` | หกตัวของ `UserForm.js` | `88a` |

## บันทึกการกวาด (24 พ.ย. 2569, คอมมิต `d681d2b`, ทีละตัว ประตูที่ถามต้นไม้ว่ามัตแตนต์ถูกใส่จริง และ `restore` ไม่เหลือ diff)

**สิบเอ็ดตัวของใบนี้ตายที่ข้อยืนยันที่ทำนายทุกตัว** · `formreplaceslist` `304a:83` · `notmodal` `:81` · `focusstaysout` `:88` และ `:155` ·
`escapeignored` `:155` · `passwordforall` `:95` · `passwordnotrequired` `:103` · `sendshidden` `:128` · `noticebehind` `:144` ·
`noticetwice` `:147` · `nomaxheight` `:168` · `noscroll` `:177`

**สองตัวสุดท้ายฆ่าเกินคำทำนาย และที่เกินเป็นการจัดฉาก ไม่ใช่ข้ออ้าง (#266)** — `nomaxheight` กับ `noscroll` ฆ่าแถว 3 และ 4 ด้วยที่
`scopePicker(...).selectOption` (`:121`, `:139`) หลังรอจนหมดเวลา: ที่จอ 1280×720 ของค่าตั้งต้น กล่องที่ไม่มีเพดานหรือไม่เลื่อน
ล้นจอทั้งบนและล่างภายในฉากที่ `fixed` ซึ่งเลื่อนไม่ได้ ช่อง *ขอบเขตของบทบาท* จึงอยู่นอกจอและเลือกไม่ได้ — ข้อบกพร่องเดียวกับที่แถว 6 อ้าง
ไปถึงทางอื่น ไม่นับเป็นข้ออ้างของแถว 3 และ 4 · ตายที่การรอ ไม่ใช่ที่ข้ออ้าง (#139) จึงใช้เวลา 2.5 นาทีแทน 45 วินาที

**สามสิบหกตัวที่กวาดซ้ำ ตายที่แถวที่ใบของมันอ้างทุกตัว** การมาถึงผ่านหน้าต่างยังถึงข้ออ้างเดิม (#198) ·
`140:userssavestalewins` `140a:531` · `144` สามตัวที่ `:328` `:340` `:352` · `146:usersclosewins` `146a:326` · `usersrefusalwins` `:349` ·
`userscancelclears` (เล็งใหม่) `:367` · `202:userssaysanyway` `202a:363` และ `:375` · `203:userssaveanyway` `203a:312` ·
`238:userssaysanyread` `238a:204` · `usersneversays` `:144` · `247` ห้าตัวที่แถวของมัน (`usersalwayssays` แถว 2 และ 5) ·
`249` สามตัวที่ `249a:143` `:147` `:160` · `296` สิบเอ็ดตัวที่แถวเดียวกับบันทึกกวาดซ้ำของ 21 พ.ย. 2569 ในใบของมัน (`codesnotnames` แถว 1 3 6 7 ·
`notrequired` แถว 1 4 · `nofilter` แถว 2 6 · `heldgone` แถว 5 6) · `88` หกตัวที่แถว 1–5 ของ `88a` ตามคู่ของมัน

## วิธีรัน

พอร์ต: ย่อหน้า **Ports** ของ `e2e/README.md`

```
python mutation/304-adding-an-account-in-a-dialog.py save
python mutation/304-adding-an-account-in-a-dialog.py <ชื่อ>
cd e2e && npx playwright test 304a-adding-an-account-in-a-dialog
python mutation/304-adding-an-account-in-a-dialog.py restore
```
"""
from harness import main

FILES = {
    'dialog': 'frontend/src/components/users/AddUserDialog.js',
    'form': 'frontend/src/components/users/UserForm.js',
    'page': 'frontend/src/pages/Users.js',
}

MUTANTS = {
    # Two edits: the fragment the list is drawn in becomes the half of a
    # ternary it was until 24 November 2569.
    'formreplaceslist': [
        ('page', '      <>\n', '      {!editing && <>\n'),
        ('page', '      </>\n', '      </>}\n'),
    ],
    'notmodal': ('dialog', '        aria-modal="true"\n', ''),
    'focusstaysout': ('dialog', '  useModalFocus(box, true, onCancel)\n',
                      '  useModalFocus(box, false, onCancel)\n'),
    'escapeignored': ('dialog', '  useModalFocus(box, true, onCancel)\n',
                      '  useModalFocus(box, true, () => onCancel && undefined)\n'),
    # The field as it stood: drawn for everybody, required for the two.
    'passwordforall': [
        ('form', '            {needsPassword && (\n', '            {(true || needsPassword) && (\n'),
        ('form', '                  required\n', '                  required={needsPassword}\n'),
    ],
    'passwordnotrequired': ('form', '                  required\n', ''),
    'sendshidden': ('form', '            ...(needsPassword && { password }),\n',
                    '            ...((true || needsPassword) && { password }),\n'),
    # The page's notice where it stood, and nothing handed to the dialog.
    'noticebehind': [
        ('page', '      {!editing && <Notice notice={notice} />}\n',
                 '      <Notice notice={notice} />\n'),
        ('page', '          notice={notice}\n          onSubmit={save}\n',
                 '          notice={null}\n          onSubmit={save}\n'),
    ],
    'noticetwice': ('page', '      {!editing && <Notice notice={notice} />}\n',
                    '      {(true || !editing) && <Notice notice={notice} />}\n'),
    'nomaxheight': ('dialog', 'className="max-h-[90vh] w-full', 'className="w-full'),
    'noscroll': ('dialog', 'w-full max-w-2xl overflow-y-auto rounded-xl', 'w-full max-w-2xl rounded-xl'),
}

main(FILES, MUTANTS)
