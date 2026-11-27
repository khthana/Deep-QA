# -*- coding: utf-8 -*-
"""#320 ฟอร์มเพิ่ม/แก้ไขหลักสูตรเป็นหน้าต่างลอย — `pages/Programs.js` ในรูปของ #319

    python mutation/320-the-programme-form-in-a-dialog.py save
    python mutation/320-the-programme-form-in-a-dialog.py <mutant>
    python mutation/320-the-programme-form-in-a-dialog.py restore

คำตอบของเจ้าของงาน 27 พ.ย. 2569 (`docs/ui-consistency.md` ข้อ 8) · ใบรับงาน `docs/acceptance/320-programme-form-dialog.md`

    cd e2e && npx playwright test tests/320a-the-programme-form-in-a-dialog.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

สองตัวของหน้านี้เอง เป็นสองตัวของ #319 ที่ยึดหน้าภาควิชา เขียนซ้ำที่หน้านี้ เพราะโค้ดถูกลอกไม่ได้ใช้ร่วม (#83) ·
พฤติกรรมของ `FormDialog.js` (Escape และโฟกัส) เป็นของร่วม มัตแตนต์ของมันอยู่ที่แฟ้ม `319` ที่เดียว

**มัตแตนต์ของ `319` ที่ไปถึงแถวของ `320a` ด้วย (ทำนาย 27 พ.ย. 2569 ก่อนกวาด — #248 #257):**
`319:s319escapewhilesaving` ฆ่า `320a` row 3 ที่ `toHaveValue(PROGRAM)` หลัง Escape · `319:s319nofocusback` ฆ่า `320a`
row 1 และ row 2 ที่ `toBeFocused()` · สองตัวนี้จึงพิสูจน์ข้ออ้างหนึ่งข้อต่อหนึ่งหน้า ไม่ใช่ข้อเดียวนับสองครั้ง (#191) ·
`319:s319listreplaced` และ `319:s319refusalonpage` แก้ `Departments.js` จึงไม่ไปถึงหน้านี้

## ตารางคำทำนาย (เขียนก่อนกวาด 27 พ.ย. 2569 และ commit ก่อนการรัน)

ยังไม่ได้รัน — รอรอบ e2e รวม #336 ตามที่เจ้าของงานขอ

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s320listreplaced` | `320a` *row 1* · *row 2* | ทั้งสองแถวที่ `await expect(listTable(page)).toBeVisible()` — ตารางไม่ถูกวาดระหว่างที่ฟอร์มเปิด | `320a` row 3 ไม่อ่านตาราง |
| `s320refusalonpage` | `320a` *row 3* · `177a` แถวแรก · `142a` ข้อมูลหลักสูตร *a superseded read that lands during a save leaves บันทึก disabled* · `55a` สองแถวแถบแดง | `320a` row 3 ที่ `await expect(dialog(page, EDIT).getByRole('alert')).toHaveText(REFUSED)` · `177a` แถวแรก (*the field lets it through…*) อ่านประโยคผ่าน `role="alert"` ซึ่งไปอยู่ในแบนเนอร์ของหน้าที่ไม่ถูกวาดระหว่างหน้าต่างเปิด · `142a` ที่ `getByText(REFUSED)).toBeVisible()` · `55a` ที่ `.bg-red-50` (เพิ่มหลังรีวิว 27 พ.ย. 2569 ก่อนการรัน) | `320a` row 1 และ row 2 ไม่บันทึก |
"""

from harness import main

FILES = {
    'programs': 'frontend/src/pages/Programs.js',
}

MUTANTS = {
    # The form takes the list's place again, the shape before this ticket.
    's320listreplaced': [
        ('programs',
         '          block still find it (#189). */}\n'
         '      <>\n',
         '          block still find it (#189). */}\n'
         '      {!editing && <>\n'),
        ('programs',
         '      </>\n'
         '\n'
         '      <ConfirmDialog\n',
         '      </>}\n'
         '\n'
         '      <ConfirmDialog\n'),
    ],
    # The save's refusal goes to the page's banner, which is behind the cover.
    's320refusalonpage': ('programs',
        '    if (!formShown.current) return report(error)\n',
        '    return report(error)\n'),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
