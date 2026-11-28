# -*- coding: utf-8 -*-
"""#321 ฟอร์มเพิ่ม/แก้ไขรายวิชาเป็นหน้าต่างลอย — `pages/Subjects.js` ในรูปของ #319 หลัง #336 และ #337

    python mutation/321-the-subject-form-in-a-dialog.py save
    python mutation/321-the-subject-form-in-a-dialog.py <mutant>
    python mutation/321-the-subject-form-in-a-dialog.py restore

คำตอบของเจ้าของงาน 27 พ.ย. 2569 (`docs/ui-consistency.md` ข้อ 8) · ใบรับงาน `docs/acceptance/321-subject-form-dialog.md`

    cd e2e && npx playwright test tests/321a-the-subject-form-in-a-dialog.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ห้าตัวของหน้านี้เอง เป็นสองตัวของ #320 (`s320listreplaced` `s320refusalonpage`) สองตัวของ #336 (`pagewide`
`nevercleared`) และตัวของ #337 เขียนซ้ำที่หน้านี้ เพราะโค้ดถูกลอกไม่ได้ใช้ร่วม (#83) · พฤติกรรมของ `FormDialog.js`
(Escape และโฟกัส) เป็นของร่วม มัตแตนต์ของมันอยู่ที่แฟ้ม `319` ที่เดียว และไม่ได้กวาดซ้ำกับ `321a` ใน #321 —
แถว 1–4 ของ `321a` ไปถึงมันได้ แต่การวัดว่า *ไปถึง* (#191) รอการรันรวม

ห้าตัวนี้อยู่ในแฟ้มเดียวแทนที่จะต่อท้ายแฟ้ม `320` `336` และ `337` เพราะแต่ละแฟ้มนั้นมีตารางคำทำนายและบันทึกการกวาดที่
ปิดไปแล้ว — ตัวที่เติมเข้าไปจะทำให้ตารางของแฟ้มนั้นอ่านเป็นคำทำนายที่ไม่มีใครถาม (#266)

## ตารางคำทำนาย (เขียนก่อนกวาด 28 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s321listreplaced` | `321a` *row 1* · *row 2* | ทั้งสองแถวที่ `await expect(listTable(page)).toBeVisible()` — ตารางไม่ถูกวาดระหว่างที่ฟอร์มเปิด | `321a` row 3 และ row 4 ไม่อ่านตาราง · row 5 อ่านแถวของตารางก่อนเปิดฟอร์ม และอ่านคำปฏิเสธหลังปิด ซึ่งตอนนั้นตารางกลับมาแล้ว |
| `s321refusalonpage` | `321a` *row 3* · `142a` ข้อมูลรายวิชา *a superseded read that lands during a save leaves บันทึก disabled* | `321a` row 3 ที่ `await expect(dialog(page, EDIT).getByRole('alert')).toHaveText(REFUSED)` · `142a` ที่ `getByText(REFUSED)).toBeVisible()` เหมือน `s320refusalonpage` | `321a` row 4: คำปฏิเสธของมันตอบหลังฟอร์มที่ส่งถูกปิด จึงไปที่แบนเนอร์ทั้งก่อนและหลัง · row 5: คำปฏิเสธเป็นของการลบ ซึ่งเรียก `report` ไม่ใช่ `refuse` · row 1 row 2 ไม่บันทึก |
| `s321pagewide` | `321a` *row 4* | `'Escape in a form whose own save is not out'` | `321a` row 3: ระหว่างการบันทึกของการเปิดนั้นเอง ธงทั้งหน้ากับกุญแจตอบเหมือนกัน · row 1 row 2 row 5 ไม่กด Escape ระหว่างการบันทึก |
| `s321nevercleared` | `321a` *row 3* | `'Escape once it has answered'` | `321a` row 4: ฟอร์มเพิ่มเป็นการเปิดใหม่ กุญแจค้างอยู่ที่การเปิดแก้ไข · row 5 ไม่กด Escape · row 1 row 2 ไม่บันทึก |
| `s321saysover` | `321a` *row 5* | `'the refusal on the page once the list is back'` — ประโยคสำเร็จเขียนทับคำปฏิเสธ | row 1–4: ไม่มีคำปฏิเสธค้างในแบนเนอร์ตอนประโยคสำเร็จถูกพูด |

ตัวของแฟ้ม `146` ที่เล็งใหม่ใน #321 (`subjectsrefusalwins` `subjectscancelclears`) และ `subjectssavesaysanyway` ซึ่งแถวของมัน
อ่านแบนเนอร์ขณะฟอร์มเปิด กวาดซ้ำกับ `146a -g Subjects.js` — คำทำนายเหมือนสามตัวของจอหลักสูตรใน #336: **1**, **1**, **3**
(ตัวสุดท้ายตายที่แถวที่สามด้วยข้อยืนยัน *with the form put away* ที่ `dialog: true` เปิดให้) · ผลบันทึกในแฟ้ม `146`

## การกวาด — บันทึกผล (#321 · 28 พ.ย. 2569)

ทีละตัวด้วย `scratchpad/sweep321.ps1` ของรอบนั้น ทุกตัวผ่านด่าน *ต้นไม้เปลี่ยนหลังใส่* ก่อนรัน (#268) และ `restore` ก่อนตัวถัดไป ·
baseline คือรอบสะอาดของวันเดียวกัน: `321a` `16a` `284a` 14 ผ่าน และแถว `Subjects.js` ของแฟ้มหลายหน้า 42 ผ่าน ·
**ไม่มีตัวไหนผิดคำทำนาย** ทั้งจำนวนและข้อยืนยันที่ตาย

| ชื่อ | spec | ผล | ตายที่ |
|---|---|---|---|
| `s321listreplaced` | `321a` | 2 ล้ม 3 ผ่าน | row 1 บรรทัด 75 · row 2 บรรทัด 89 — `listTable(page)).toBeVisible()` |
| `s321refusalonpage` | `321a` `142a` (`-g` แถวของ `Subjects.js` และ `row N:`) | 2 ล้ม 11 ผ่าน | `321a` row 3 บรรทัด 115 · `142a` ข้อมูลรายวิชา *a superseded read that lands during a save…* บรรทัด 287 |
| `s321pagewide` | `321a` | 1 ล้ม 4 ผ่าน | row 4 บรรทัด 140 — `'Escape in a form whose own save is not out'` |
| `s321nevercleared` | `321a` | 1 ล้ม 4 ผ่าน | row 3 บรรทัด 121 — `'Escape once it has answered'` |
| `s321saysover` | `321a` | 1 ล้ม 4 ผ่าน | row 5 บรรทัด 173 — `'the refusal on the page once the list is back'` |
"""

from harness import main

FILES = {
    'subjects': 'frontend/src/pages/Subjects.js',
}

MUTANTS = {
    # The form takes the list's place again, the shape before this ticket.
    's321listreplaced': [
        ('subjects',
         '          block still find it (#189). */}\n'
         '      <>\n',
         '          block still find it (#189). */}\n'
         '      {!editing && <>\n'),
        ('subjects',
         '      </>\n'
         '\n'
         '      <ConfirmDialog\n',
         '      </>}\n'
         '\n'
         '      <ConfirmDialog\n'),
    ],
    # The save's refusal goes to the page's banner, which is behind the cover.
    's321refusalonpage': ('subjects',
        '    if (!formShown.current) return report(error)\n',
        '    return report(error)\n'),
    # #336's mistake: Escape inert while any save on the page is out.
    's321pagewide': ('subjects',
        '          saving={savingOf !== null && savingOf === showing.current}\n',
        '          saving={writing}\n'),
    # #336's other: the key is never put down once the save has answered.
    's321nevercleared': ('subjects',
        '      setSavingOf(of => (of === sent ? null : of))\n',
        '      void setSavingOf\n'),
    # #337's mistake: the save's sentence written over a refusal nobody read.
    's321saysover': ('subjects',
        '            setNotice(shown => (shown?.error ? shown : said))\n',
        '            setNotice(said)\n'),
}

if __name__ == '__main__':
    main(FILES, MUTANTS)
