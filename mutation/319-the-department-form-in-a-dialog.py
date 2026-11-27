# -*- coding: utf-8 -*-
"""#319 ฟอร์มเพิ่ม/แก้ไขภาควิชาเป็นหน้าต่างลอย — `components/FormDialog.js` และ `pages/Departments.js`

    python mutation/319-the-department-form-in-a-dialog.py save
    python mutation/319-the-department-form-in-a-dialog.py <mutant>
    python mutation/319-the-department-form-in-a-dialog.py restore

คำตอบของเจ้าของงาน 27 พ.ย. 2569 (`docs/ui-consistency.md` ข้อ 8) · ใบรับงาน `docs/acceptance/319-department-form-dialog.md`

    cd e2e && npx playwright test tests/319a-the-department-form-in-a-dialog.spec.js tests/14c-departments-notice.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

สี่ตัว หนึ่งตัวต่อสิ่งที่ตั๋วนี้เพิ่ม และแต่ละตัวคือรูปที่ตั๋วไม่ได้เลือกทำให้รัน (#48):
`s319listreplaced` คือรูปก่อนตั๋ว (ฟอร์มแทนที่ตาราง) · `s319escapewhilesaving` คือ Escape ของ `AddUserDialog`
ซึ่งไม่ถาม · `s319nofocusback` คือหน้าต่างที่ไม่คืนโฟกัส ซึ่ง `useModalFocus` ไม่ทำ · `s319refusalonpage` คือคำปฏิเสธ
ไปลงแบนเนอร์ของหน้า ซึ่งอยู่หลังผ้าคลุม คือรูปก่อน #307 ที่จอผู้ใช้งาน

`FormDialog.js` มีผู้ใช้คนเดียววันนี้ (ภาควิชา) จึงไม่มีอะไรต้องแยกว่าการฆ่ามาจากจอไหน — วันที่ #320 ลง มัตแตนต์ของ
คอมโพเนนต์จะไปถึงสองจอ และเป็นข้ออ้างว่าทางเข้าของแต่ละจอไปถึงจริง (#191)

## ตารางคำทำนาย (เขียนก่อนกวาด 27 พ.ย. 2569 และ commit ก่อนการรัน)

ยังไม่ได้รัน — รอรอบ e2e รวม #336 ตามที่เจ้าของงานขอ

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s319listreplaced` | `319a` *row 1* · *row 2* | `319a` row 1 ที่ `await expect(listTable(page)).toBeVisible()` · row 2 ที่ `await expect(listTable(page)).toBeVisible()` ตัวของมันเอง — ตารางไม่ถูกวาดระหว่างที่ฟอร์มเปิด | `319a` row 3 และ row 4 ไม่อ่านตาราง · `14c` ทั้งสามแถว อ่านแถวของตารางหลังฟอร์มปิดเท่านั้น และแถว 2 ใช้หน้าต่างหายเป็นจุดนิ่ง |
| `s319escapewhilesaving` | `319a` *row 3* | `await expect(dialog(page, EDIT).getByLabel('รหัสภาควิชา')).toHaveValue('05')` — Escape ปิดหน้าต่างระหว่างการบันทึก ช่องหายไป | `319a` row 1 กด Escape ตอนไม่มีการบันทึก จึงปิดเหมือนเดิม · row 2 และ row 4 ไม่กด Escape |
| `s319nofocusback` | `319a` *row 1* · *row 2* | row 1 ที่ `await expect(opener, 'the focus is back where the dialog came from').toBeFocused()` · row 2 ที่ `'the focus is back on the row that was edited'` | `319a` row 3 และ row 4 ไม่อ่านโฟกัสหลังปิด · `14c` ไม่อ่านโฟกัส |
| `s319refusalonpage` | `319a` *row 4* · *row 3* | row 4 ที่ `await expect(dialog(page, ADD).getByRole('alert')).toHaveText(REFUSED)` · row 3 ที่ `await expect(dialog(page, EDIT).getByRole('alert')).toHaveText(REFUSED)` — คำปฏิเสธไปอยู่ในแบนเนอร์ของหน้าที่ไม่ถูกวาดระหว่างหน้าต่างเปิด | `319a` row 1 และ row 2 ไม่บันทึก · `14c` แถว 1: คำปฏิเสธไม่อยู่ในหน้าต่าง จึง `toBeVisible()` แรกของแถวตาย — **ทำนายว่าตายด้วย** ที่ `await expect(page.getByText(REFUSALS.duplicateDepartmentId)).toBeVisible()` |
"""

from harness import main

FILES = {
    'dialog': 'frontend/src/components/FormDialog.js',
    'departments': 'frontend/src/pages/Departments.js',
}

MUTANTS = {
    # The form takes the list's place again: the fragment drawn only when no
    # form is open, which is the shape before this ticket.
    's319listreplaced': [
        ('departments',
         '          block still find it (#189). */}\n'
         '      <>\n',
         '          block still find it (#189). */}\n'
         '      {!editing && <>\n'),
        ('departments',
         '      </>\n'
         '\n'
         '      <ConfirmDialog\n',
         '      </>}\n'
         '\n'
         '      <ConfirmDialog\n'),
    ],
    # Escape closes the dialog whatever is out - `AddUserDialog`'s behaviour.
    's319escapewhilesaving': ('dialog',
        '    escape.current = saving ? () => {} : onCancel\n',
        '    escape.current = onCancel\n'),
    # Nothing hands the focus back: the opener is read and never focused.
    's319nofocusback': ('dialog',
        'opener.isConnected) opener.focus()\n',
        'opener.isConnected) opener.blur()\n'),
    # The save's refusal goes to the page's banner, which is behind the cover.
    's319refusalonpage': ('departments',
        '    if (!formShown.current) return report(error)\n',
        '    return report(error)\n'),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
