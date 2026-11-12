# -*- coding: utf-8 -*-
"""#274 ผ้าคลุมของหน้าต่างหยุดก่อนถึงขอบบน 24 px

    python mutation/274-the-cover-that-stopped-short.py save
    python mutation/274-the-cover-that-stopped-short.py <mutant>
    python mutation/274-the-cover-that-stopped-short.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/274a-the-cover-that-stopped-short.spec.js` ใบ `docs/acceptance/274-the-cover-that-stopped-short.md` แถว 1 และ 2

    cd e2e && npx playwright test tests/274a-the-cover-that-stopped-short.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## สิ่งที่ตั๋วนี้เปลี่ยน (12 พ.ย. 2569)

`ConfirmDialog` กับ `ImportPanel` วาดผ้าคลุม `fixed inset-0` และทั้งคู่ถูก mount อยู่ใน `space-y-6`
ของหน้า Tailwind 3 เขียน `space-y-6` เป็น `.space-y-6 > :not([hidden]) ~ :not([hidden])` ผ้าคลุมจึงได้
`margin-top: 24px` และเริ่มที่ `top: 24` โลโก้กับปุ่มโปรไฟล์ในแถบนั้นกดได้ทั้งที่หน้าต่างเปิด พบตอนเดิน
ใบ 270 แถว 11 การแก้คือ `!m-0` ที่ผ้าคลุมของทั้งสองคอมโพเนนต์ — `mt-0` ธรรมดาแพ้ specificity

## มัตแตนต์

สองตัว หนึ่งตัวต่อคอมโพเนนต์ แต่ละตัวคือการแก้ที่ถูกถอดออกจากที่เดียว ซึ่งเป็นตัวที่ทำให้สองแถวของ
`274a` แยกกันได้ (#125 — การแก้ที่ลงสองที่ ต้องมีมัตแตนต์ที่ละที่)

## ตารางคำทำนาย (เขียนก่อนกวาด 12 พ.ย. 2569)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `importshort` | `274a` *the import window covers the top of the screen* | `expect.poll(...).toEqual(WHOLE)` ได้ `{top: 24, left: false, right: false}` | *the confirmation covers…* |
| `confirmshort` | `274a` *the confirmation covers the top of the screen* | `expect.poll(...).toEqual(WHOLE)` ค่าเดียวกัน | *the import window covers…* |

ไม่มีสเปกอื่นอ่านกรอบของผ้าคลุมหรือ `elementFromPoint` ในแถบบน (grep `inset-0` ใน `e2e/` เมื่อ 12 พ.ย. 2569
เจอแต่ใน docblock) จึงไม่ทำนายการตายที่อื่น และสองแถวไม่ใช่ `serial` จึงรันทั้งคู่เสมอ

## บันทึกผลกวาด (12 พ.ย. 2569)

| มัตแตนต์ | ตาย | รอด | ตายที่ |
|---|---|---|---|
| `importshort` | *the import window covers the top of the screen* | *the confirmation covers…* | `toEqual(WHOLE)` ได้ `+ Received + 3` คือสามฟิลด์ผิดทั้งหมด |
| `confirmshort` | *the confirmation covers the top of the screen* | *the import window covers…* | ค่าเดียวกัน |

สองตัวตายตามคำทำนายทั้งคู่ รันเฉพาะ `274a` ไม่ได้รันทั้งชุด เพราะไม่มีสเปกอื่นอ่านผ้าคลุม (ข้างบน)

**สิ่งที่บันทึกนี้พิสูจน์ไม่ได้ ซึ่งต้องเขียนไว้** (#255, #259, #268):

- ตารางคำทำนายกับการกวาดลงในการเปลี่ยนแปลงเดียวกันที่ยังไม่ commit ไม่มี commit ไหนถือตารางไว้ก่อนการรัน
  แบบที่ `270-import-window.py` มี (`727bce4`, `c460894`) คำว่า *เขียนก่อนกวาด* ข้างบนจึงเป็นคำของคนเขียน
  ไม่ใช่สิ่งที่ประวัติตรวจได้
- ประตูของต้นไม้คือ `git status --porcelain frontend/src` ไม่ว่าง ซึ่ง**ไม่ได้ถามอะไร** เพราะตัวแก้เองยัง
  ไม่ commit สองแฟ้มจึงสกปรกอยู่แล้วก่อน apply สิ่งที่บอกว่ามัตแตนต์ลงจริงคือบรรทัด `applied <ชื่อ> (1 edit)`
  ของ harness และการที่แต่ละตัวฆ่าแถวที่ต่างกัน — ต้นไม้ที่ไม่มีมัตแตนต์จะให้สองแถวเขียว
  หลัง `restore` อ่าน `!m-0 flex` ได้หนึ่งที่ต่อแฟ้ม
"""

from harness import main

FILES = {
    'confirm': 'frontend/src/components/ConfirmDialog.js',
    'panel': 'frontend/src/components/ImportPanel.js',
}

COVER = '<ContentMotionDIV className="fixed inset-0 z-[9998] !m-0 flex'
SHORT = '<ContentMotionDIV className="fixed inset-0 z-[9998] flex'

MUTANTS = {
    # The import window's cover takes the page's space-y margin again.
    'importshort': ('panel', COVER, SHORT),
    # The confirmation's cover takes it again.
    'confirmshort': ('confirm', COVER, SHORT),
}

main(FILES, MUTANTS)
