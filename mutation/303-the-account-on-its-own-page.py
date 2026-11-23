# -*- coding: utf-8 -*-
"""#303 — หน้าแก้ไขบัญชีของตัวเอง

คำตอบของเจ้าของงานเมื่อ 22 พ.ย. 2569 (`docs/users-screen.md` ข้อ 6–9) กับคำตอบสามข้อของ 23 พ.ย. 2569
(ประโยค #247 พูดบนหน้าแก้ไข · *บทบาท* เป็น *สิทธิ์* ทั้งหมด · คำถามของถังขยะตามร่าง) ข้ออ้างอยู่ใน
`e2e/tests/303a-the-account-on-its-own-page.spec.js` และใบรับงานคือ `docs/acceptance/11-user-accounts.md` §#303

**`303a` เป็น `serial`** เพราะแถวของมันเขียนลงบัญชีเดียวกันต่อกัน (แถว 15 ให้สิทธิ์ที่แถว 17 กับ 18 ยกเลิก)
ฉะนั้นการกวาดรายงาน **แถวแรกที่ตาย** และข้ามที่เหลือ (#67) ทุกตัวข้างล่างจึงถูกเลือกให้ตายครั้งแรกที่แถวของมันเอง
และคำทำนายบอกแถวแรกนั้น ไม่ใช่ทุกแถวที่มันจะไปถึงถ้าแฟ้มไม่ใช่ `serial`

**`editoutside…` สองตัวคือสิ่งที่ถือการเรียก `alsoOutside` ของ `EditUser.js`** เพราะ `rows-outside-the-filter.js`
มองไม่เห็นมัน: census นับเฉพาะจอที่เรียก `list…({…})` ด้วยค่าจาก `useState` และหน้านี้อ่านบัญชีเดียว ไม่ได้อ่านรายการ
(#226 — ข้อจำกัดคือรายการของที่ต้องไปดู ไม่ใช่คำขอโทษ) ข้อจำกัดนั้นเขียนไว้ในใบรับงานด้วย

## ตารางมัตแตนต์ — คำทำนาย เขียนก่อนรันตัวแรก (#255 · 23 พ.ย. 2569)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `unreadsilent` | บัญชีที่อ่านไม่ได้ไม่พูดอะไร — `Notice` อ่านแค่ประกาศของหน้า | **1** — `303a` แถว 3 ที่ `getByRole('alert')` toHaveText |
| `viewmodeopen` | ฟอร์มเปิดให้แก้ตั้งแต่เข้าหน้า ไม่มีโหมดดู | **1** — `303a` แถว 6 ที่ช่องแรก `toBeDisabled` |
| `cancelkeepsdraft` | *ยกเลิก* ไม่วาดฟอร์มใหม่ ค่าที่พิมพ์ค้างอยู่ | **1** — `303a` แถว 7 ที่ค่าที่บันทึกไว้ `toHaveValue` |
| `savestaysopen` | บันทึกแล้วยังอยู่ในโหมดแก้ | **1** — `303a` แถว 8 ที่ช่อง `toBeDisabled` หลังประกาศ |
| `editoutsideblind` | ไม่ถามว่าบัญชีที่บันทึกยังอยู่ในรายการที่มาจากหรือไม่ — ทางที่เจ้าของงานไม่เลือก (#48) | **1** — `303a` แถว 9 ที่ `getByRole('status')` toHaveText |
| `editalwaysoutside` | บอกว่าออกนอกรายการทุกครั้ง | **1** — `303a` แถว 10 ที่ `getByRole('status')` toHaveText (แถว 9 ผ่าน เพราะที่นั่นออกจริง) |
| `backdropsquery` | ปุ่มกลับไปรายการไม่พาหน้ากับตัวกรองไปด้วย | **1** — `303a` แถว 11 ที่ที่อยู่ `toHaveURL` |
| `bareaddressblank` | ที่อยู่ `edit-user` เปล่า ๆ ไม่กลับไปรายการ | **1** — `303a` แถว 5 ที่ `toHaveURL` |
| `tabremounts` | แท็บสิทธิ์วาดใหม่ทุกครั้งที่สลับ ซึ่งอ่านสิทธิ์อีกรอบ | **1** — `303a` แถว 21 ที่ `expect(reads).toBe(0)` |
| `cardkindblind` | การ์ดเขียน *ขอบเขต :* แทนชนิดของหน่วย | **1** — `303a` แถว 13 ที่ `toHaveCount(1)` ของการ์ด ซึ่ง `grantRow` หาด้วยคำของชนิด — ตัวหาและข้ออ้างเป็นข้อความเดียว ข้อนี้คือข้ออ้าง ไม่ใช่การจัดฉาก (#213) |
| `granterlost` | บรรทัดเล็กไม่บอกว่าใครให้ | **1** — `303a` แถว 13 ที่ *ผู้กำหนด* toHaveText |
| `dialognamedbycode` | หัวของหน้าต่างเพิ่มสิทธิ์เอ่ยรหัสบัญชีแทนชื่อคน | **1** — `303a` แถว 14 ที่ dialog ชื่อ `เพิ่มสิทธิ์ ${NAME}` toBeVisible |
| `dialogstaysopen` | ให้สิทธิ์สำเร็จแล้วหน้าต่างไม่ปิด | **1** — `303a` แถว 15 ที่ `grantDialog` toHaveCount(0) |
| `refusalclosesdialog` | คำปฏิเสธปิดหน้าต่าง คำที่บอกจึงหายไปกับมัน | **1** — `303a` แถว 16 ที่ alert ในหน้าต่าง toHaveText |
| `noconfirm` | ถังขยะยกเลิกทันทีโดยไม่ถาม | **1** — `303a` แถว 17 ที่หน้าต่าง *ยืนยันการยกเลิกสิทธิ์* toBeVisible |
| `asksnoperson` | คำถามไม่เอ่ยว่าสิทธิ์ของใคร | **1** — `303a` แถว 17 ที่ `saidBy` toBe |
| `lastgrantguard` | ห้ามยกเลิกสิทธิ์สุดท้าย อย่างจอที่ส่งมอบ — ทางที่เจ้าของงานไม่เลือก (#48) | **1** — `303a` แถว 13 ที่ปุ่มของสิทธิ์เดียวของ `teacher.one` toBeEnabled — แถวแรกที่เจอบัญชีที่มีสิทธิ์เดียว ก่อนแถว 19 ซึ่งเป็นข้ออ้างเดียวกันที่ไปถึงทางอื่น |
| `emptysilent` | บัญชีที่ไม่มีสิทธิ์เหลือไม่บอกอะไร | **1** — `303a` แถว 19 ที่ `getByText` ของประโยคว่าง toBeVisible |
| `editclosewins` | การบันทึกที่ตอบมาทีหลังปิดฟอร์มเสมอ ไม่ถามว่ามีการเปิดครั้งใหม่หรือยัง (#146 บนหน้านี้) | **1** — `303b` แถว 1 ที่ช่องของการเปิดครั้งหลัง `toBeEnabled` |
| `editrefusalwins` | คำปฏิเสธที่ตอบมาทีหลังพูดทับการเปิดครั้งใหม่ | **1** — `303b` แถว 2 ที่ `getByText(REFUSED)` นับได้ 0 |
| `editcancelclears` | *ยกเลิก* เขียน `showing` ด้วย การบันทึกที่ไม่มีอะไรมาแทนที่จึงเงียบ | **1** — `303b` แถว 3 ที่ประโยค *บันทึกข้อมูลเรียบร้อยแล้ว* toBeVisible |

### เพิ่มหลังการรีวิว — คำทำนาย (23 พ.ย. 2569 ก่อนรัน)

รีวิวพบว่าการให้สิทธิ์ที่ตอบมาหลัง *ยกเลิก* แล้วกด *เพิ่มสิทธิ์* อีกครั้ง ปิดหน้าต่างครั้งที่สอง และคำปฏิเสธที่ตอบมาหลัง *ยกเลิก*
ไม่ถูกบอกใคร · หน้าต่างจึงปิดตัวเองเมื่อยังเป็นการเปิดที่ส่งไป และส่งคำปฏิเสธที่มาถึงหลังมันหายไปให้แผงพูด · `dialogstaysopen`
กับ `refusalclosesdialog` เล็งใหม่ไปที่บรรทัดที่ทำความผิดเดิมตอนนี้

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `latesuccesscloses` | การให้สิทธิ์สำเร็จปิดหน้าต่างที่อยู่บนจอ ไม่ว่าจะเป็นการเปิดครั้งไหน — ข้อบกพร่องที่รีวิวพบ (#115) | **1** — `303b` แถว 4 ที่ `grantDialog` toBeVisible |
| `laterefusalsilent` | คำปฏิเสธที่มาถึงหลังหน้าต่างหายไปไม่ถูกบอกใคร | **1** — `303b` แถว 5 ที่ `getByRole('alert')` toHaveText |
| `dialogstaysopen` (เล็งใหม่) | เหมือนเดิม | **1** — `303a` แถว 15 ที่ `grantDialog` toHaveCount(0) |
| `refusalclosesdialog` (เล็งใหม่) | เหมือนเดิม | **1** — `303a` แถว 16 ที่ alert ในหน้าต่าง toHaveText |

## มัตแตนต์ของใบอื่นที่ #303 เล็งใหม่ — คำทำนาย (23 พ.ย. 2569, ก่อนรัน)

สิบตัวที่สมอหายเพราะตารางกลายเป็นการ์ดและฟอร์มได้โหมดดู (`anchors.py`) · เล็งใหม่ให้ความผิดเดิมอยู่ (#203)

| ชื่อ | คำทำนาย |
|---|---|
| `130:alwaysenabled` | `12a` **1** — แถว 6 ที่ `toBeDisabled` · `303a` **1** — แถว 20 ที่ `toBeDisabled` |
| `130:everyrowisdead` | `12a` ล้มที่ปุ่มของบัญชีอื่น · `111a` กับ `121a` ที่การกด (การจัดฉาก #266) · `303a` **1** — แถว 13 ที่ `toBeEnabled` · `271a` **1** — แถว 6 ที่ `named()` |
| `130:titledrifts` | `12a` **1** — แถว 6 ที่ `title` · `303a` **1** — แถว 20 ที่ `title` |
| `130:selfrowhidesthebutton` | `12a` **1** — แถว 6 ที่ `toBeVisible` · `303a` **1** — แถว 20 ที่ `toBeDisabled` (ปุ่มที่ไม่มีอยู่รอจนหมดเวลา — #139) |
| `215:panelcode` | `215a` **3** — แถว 1 4 6 ที่ `saysScope` dd · `297a` **2** — แถว 2 กับ 5 ที่ dd · แถวที่หาการ์ดด้วย `grantRow` ตายที่ตัวหา (การจัดฉาก) |
| `294:o294panelfromlist` | `215a` **1** — แถว 4 ที่ dd (`01` ไม่อยู่ในรายการ) · `297a` **0** — ชื่อของหน่วยที่ไม่มีชื่อเป็นคำของชนิดกับรหัสทั้งสองทาง · `111a` `121a` ที่ตัวหาการ์ด `01` (การจัดฉาก) |
| `247:usersalwayssays` | `247b` เฉพาะแถวที่**เพิ่ม**บัญชี — แถวของการแก้ย้ายไปหน้าแก้ไขแล้ว และถือโดย `editoutside…` |
| `249:useremaillive` | `249a` **1** — แถวผู้ใช้งานที่ข้ออ้างที่ 1 |
| `249:usernamelive` | `249a` **1** — แถวผู้ใช้งานที่ข้ออ้างที่ 2 |
| `249:usernamepage` | `249a` **1** — แถวผู้ใช้งานที่ฟอร์มที่เปิดหลังการบันทึก |

### มัตแตนต์ของ `pages/Users.js` ที่แถวฆ่าของมันถูกเล็งใหม่ไปที่การเพิ่ม — คำทำนาย (23 พ.ย. 2569, ก่อนรัน)

ตัวเหล่านี้ไม่มีใครเล็งใหม่ anchor ยังตรงและโค้ดที่มันแก้ไม่เปลี่ยนความหมาย แต่แถวที่ฆ่ามันเคยกด *แก้ไข* บนรายการ
และตอนนี้กด *เพิ่มผู้ใช้งาน* แทน (#303) จึงต้องรันอีกครั้งจึงจะรู้ว่ามันยังพิสูจน์อะไร (#107, #68) · รันเฉพาะแถวของจอนี้ด้วย `--grep`

| ชื่อ | คำทำนาย |
|---|---|
| `140:userssavestalewins` | `140a` **1** — แถว *the list บันทึก reloads* ของ Users.js ที่หน้าที่ pager ไปอยู่ |
| `144:usersqnotfollowed` | `144a` **1** — แถวช่องค้นหาของ Users.js |
| `144:usersrolenotfollowed` | `144a` **1** — แถวตัวกรองบทบาท |
| `144:usersstatusnotfollowed` | `144a` **1** — แถวตัวกรองสถานะ |
| `146:usersclosewins` | `146a` **1** — *a save that lands after เพิ่ม* ที่ `the add form after the save answered` · แถว *after แก้ไข* ที่มันเคยฆ่าด้วยไม่รันบนจอนี้แล้ว |
| `146:usersrefusalwins` | `146a` **1** — *a save refused after the screen moved on* ที่เล็งใหม่ให้กด *เพิ่ม* แทนแถวที่สอง ที่ `the overtaken refusal` |
| `146:userscancelclears` | `146a` **1** — *a save that nothing took the place of* ที่ประโยค toBeVisible |
| `202:userssaysanyway` | `202a` **1** — describe ของสวิตช์ ที่ประโยคของสวิตช์นับได้ 0 ขณะฟอร์มเพิ่มอยู่บนจอ |
| `203:userssaveanyway` | `203a` **1** — *a save whose reload is refused* ของ Users.js ที่ `neverSaid` |
| `239:savesaysitovertheoldpage` | `239a` **0** — แถวของมันถอนเป็นบันทึกแล้ว และการเพิ่มทำให้รายการสั้นลงไม่ได้ · คาดว่ารอด ซึ่งคือการบอกว่าโค้ดนั้นไม่มีใครไปถึงคนเดียว ไม่ใช่ข้ออ้างที่ไม่มีใครพิสูจน์ |

## วิธีรัน

    python mutation/303-the-account-on-its-own-page.py save
    python mutation/303-the-account-on-its-own-page.py <mutant>
    python mutation/303-the-account-on-its-own-page.py restore

**แฟ้มที่ใช้ร่วมกับใบอื่น** `GrantsPanel.js` อยู่ใน `121` `130` `215` `294` ด้วย และ `UserForm.js` ใน `249` — `save` ก่อนทุกตัว

## บันทึกการกวาด (23 พ.ย. 2569)

สี่สิบเอ็ดตัวตามตารางข้างบน ทีละตัว `save` ก่อนทุกตัว และทุกการรันถามต้นไม้ก่อนว่ามัตแตนต์ลงจริง (#268) แล้วถามหลัง
`restore` ว่าออกจริง (#302) · ไม่มีตัวไหน *NOT APPLIED* หรือทิ้งส่วนต่างไว้

- **ยี่สิบเอ็ดตัวของใบนี้ ตายที่แถวและบรรทัดที่ทำนายไว้ทั้งหมด ยกเว้นหนึ่งตัว** · `editalwaysoutside` ทำนายว่าแถว 10
  แต่ตายที่แถว 8 (`303a:173` `toHaveText(SAVED)`) ก่อน — แถว 8 อ่านประโยคของการบันทึกตรงตัวเหมือนกัน และ `|| true`
  เติมประโยคของ #247 ลงไปที่นั่นด้วย · คำทำนายผิด และข้ออ้างของแถว 10 ซึ่งอยู่ใต้แถวที่ตายก่อนไม่ถูกอ่าน (#88) จึงรันตัวนี้ซ้ำ
  ด้วย `--grep "row 10:"` — **ตายที่ `303a:206`** ข้อยืนยันของแถว 10 เอง · `lastgrantguard` ตายที่แถว 13 ตามทำนาย และรันซ้ำ
  ด้วย `--grep "row 19:"` ด้วยเหตุผลเดียวกัน — **ตายที่ `303a:372`** ปุ่มของสิทธิ์สุดท้าย `toBeEnabled`
- **มัตแตนต์ของใบอื่นที่เล็งใหม่สิบตัว** ตายตามทำนายทั้งจำนวนและบรรทัด รวมถึงการตายที่การจัดฉากของ `111a` กับ `121a`
  ที่ทำนายไว้ (`130:everyrowisdead` `294:o294panelfromlist`) ซึ่งไม่ใช่การพิสูจน์ของแถวเหล่านั้น (#266)
- **มัตแตนต์ของ `pages/Users.js` สิบตัวที่แถวฆ่าถูกเล็งใหม่ไปที่การเพิ่ม** ตายตามทำนายเก้าตัว ·
  `239:savesaysitovertheoldpage` **รอด** (ผ่าน 2) ตามทำนาย — แถวของมันถอนเป็นบันทึกใน `239a` แล้ว เพราะการเพิ่มทำให้รายการสั้นลงไม่ได้
  มันจึงเป็นโค้ดที่ไม่มีใครไปถึงคนเดียว ไม่ใช่ข้ออ้างที่ไม่มีใครพิสูจน์ · **ตัวเดียวที่ผิดคำทำนายคือ `202:userssaysanyway`**:
  ทำนายว่าแถว *says nothing over the form that was opened while it was out* แต่ตายแค่แถว *says what it did when nothing took
  the screen* (`202a:361`) · อ่านโค้ดแล้วพบเหตุ: ใต้มัตแตนต์ ประโยคของการระงับยังถูกเก็บไว้ แต่การเลื่อนของ #246 (29 ต.ค. 2569)
  **กัก**ประโยคที่การอ่านมาถึงขณะฟอร์มวาดแทนรายการไว้ แล้วค่อยพูดเมื่อรายการกลับมา แถวอ่านแค่ระหว่างฟอร์มเปิด จึงแยก
  *ประโยคที่ guard ทิ้ง* กับ *ประโยคที่การเลื่อนเก็บไว้* ไม่ออก · ฟอร์มแก้ไขเดิมตั้ง `formShown` อย่างเดียวกัน และการกวาดที่บันทึก
  *ล้ม 2* ของตัวนี้ครั้งล่าสุดคือ 28 ต.ค. ก่อน #246 — ตาบอดนี้จึงน่าจะมีมาก่อน #303 จากการอ่านโค้ด ไม่ได้วัดที่ `HEAD` ·
  ซ่อมที่แถว: กด *ยกเลิก* ปิดฟอร์มแล้วอ่านอีกครั้ง (`202a:363`) · แถวนั้นผ่านบนโค้ดสะอาด และรันมัตแตนต์ซ้ำ **ล้ม 2** ทั้งสองแถว
  แถวแรกที่บรรทัดใหม่
- **หลังการรีวิว** สี่ตัวของตารางที่เพิ่ม รันทีละตัวแบบเดียวกัน · `latesuccesscloses` ตายที่ `303b:153` (แถว 4 หน้าต่างครั้งที่สอง
  `toBeVisible`) · `laterefusalsilent` ตายที่ `303b:165` (แถว 5 `alert`) · `dialogstaysopen` ที่เล็งใหม่ตายที่ `303a:303` (แถว 15) ·
  `refusalclosesdialog` ที่เล็งใหม่รอบแรก**หยุดทั้งแอป** — การแทรก `onCancel()` ระหว่าง `if` ที่ไม่มีวงเล็บกับ `else` ของมัน
  ทำให้แฟ้มคอมไพล์ไม่ได้ ทุกแถวตายที่การลงชื่อเข้า (#97 *a mutant that kills too much has stopped the application*) · เล็งใหม่
  ด้วยวงเล็บ แล้วตายที่ `303a:327` (แถว 16) ตามทำนาย
"""

from harness import main

FILES = {
    "edit": "frontend/src/pages/EditUser.js",
    "panel": "frontend/src/components/users/GrantsPanel.js",
    "dialog": "frontend/src/components/users/GrantDialog.js",
    "routes": "frontend/src/routes/AppRoutes.js",
}

MUTANTS = {
    "unreadsilent": ("edit",
        "      <Notice notice={unread ?? notice} />\n",
        "      <Notice notice={notice} />\n"),
    "viewmodeopen": ("edit",
        "                readOnly={!open}\n",
        "                readOnly={false}\n"),
    # Not a deleted call: `setDrawn` would then be unused, which `CI=true` turns
    # into a build that stops the application (#101). The count stays put.
    "cancelkeepsdraft": ("edit",
        "                    setDrawn(count => count + 1)\n",
        "                    setDrawn(count => count)\n"),
    "savestaysopen": ("edit",
        "      if (showing.current === sent) {\n        setOpen(false)\n",
        "      if (showing.current === sent) {\n"),
    # Both keep the call, so the import stays read (#101).
    "editoutsideblind": ("edit",
        "            outsideTheFilters(filters, draft, false)\n",
        "            outsideTheFilters(filters, draft, false) && false\n"),
    "editalwaysoutside": ("edit",
        "            outsideTheFilters(filters, draft, false)\n",
        "            outsideTheFilters(filters, draft, false) || true\n"),
    "backdropsquery": ("edit",
        "          onClick={() => navigate(`${USERS}${listQuery(page, filters)}`)}\n",
        "          onClick={() => navigate(`${USERS}${listQuery(page, filters) && ''}`)}\n"),
    "bareaddressblank": ("routes",
        '        <Route path="users/edit-user" element={<Navigate to="/main/users" replace />} />\n',
        ''),
    "tabremounts": ("edit",
        "            <GrantsPanel\n              user={account}\n",
        "            <GrantsPanel\n              key={tab}\n              user={account}\n"),
    # `kindOf` stays read, so nothing is left unused (#101).
    "cardkindblind": ("panel",
        '                    {kindOf(grant)} :\n',
        '                    {kindOf({})} :\n'),
    "granterlost": ("panel",
        "                <span>{grant.assigned_by ?? '—'}</span> ·{' '}\n",
        "                <span>{'—'}</span> ·{' '}\n"),
    "dialognamedbycode": ("panel",
        "          name={personName(user)}\n",
        "          name={user.user_id}\n"),
    # Re-aimed after the review of 23 November 2569, when the dialog began to
    # close itself: the same two mistakes, on the lines that now make them.
    "dialogstaysopen": ("dialog",
        "      await onSubmit(draft)\n      if (live.current) onCancel()\n",
        "      await onSubmit(draft)\n"),
    "refusalclosesdialog": ("dialog",
        "      if (live.current) setRefusal(said)\n      else onLateRefusal(said)\n",
        "      if (live.current) {\n        setRefusal(said)\n        onCancel()\n"
        "      } else onLateRefusal(said)\n"),
    # The review's defect made to run (#115): every success closes whatever
    # opening is on the screen.
    "latesuccesscloses": ("dialog",
        "      if (live.current) onCancel()\n",
        "      onCancel()\n"),
    # The refusal that finds its opening gone is said to nobody, which is what
    # the dialog's docblock called true by the container until the review.
    "laterefusalsilent": ("dialog",
        "      else onLateRefusal(said)\n",
        "      else void onLateRefusal\n"),
    "noconfirm": ("panel",
        "                    setRevoking(grant)\n",
        "                    remove(grant)\n"),
    "asksnoperson": ("panel",
        " ของ ${personName(user)} ใช่หรือไม่`\n",
        " ใช่หรือไม่`\n"),
    # The delivered rule the owner answered against on 22 November 2569 (#48).
    "lastgrantguard": ("panel",
        "                  disabled={busy || isSelf}\n",
        "                  disabled={busy || isSelf || grants.length === 1}\n"),
    # #146 on this page: the guard taken off one branch at a time (#97).
    "editclosewins": ("edit",
        "      if (showing.current === sent) {\n        setOpen(false)\n",
        "      if (showing.current === sent || true) {\n        setOpen(false)\n"),
    "editrefusalwins": ("edit",
        "      if (showing.current === sent && !error.expired) {\n",
        "      if (!error.expired) {\n"),
    "editcancelclears": ("edit",
        "                    setNotice(null)\n                    setOpen(false)\n",
        "                    showing.current = {}\n                    setNotice(null)\n                    setOpen(false)\n"),
    "emptysilent": ("panel",
        '        <p className="px-4 py-6 text-center text-slate-500">บัญชีนี้ยังไม่ได้รับสิทธิ์ใด</p>\n',
        '        <p className="px-4 py-6 text-center text-slate-500"></p>\n'),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
