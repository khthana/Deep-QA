# -*- coding: utf-8 -*-
"""#118 - ConfirmDialog ตัดคำไทยกลางคำ

`ปีการศึกษา` ถูกตัดเป็น `ปีการ` / `ศึกษา` บนกล่องยืนยันที่ทุกการลบในระบบใช้ร่วมกัน

## สาเหตุ ซึ่งไม่ใช่สองข้อที่ตั๋วสงสัย

ตั๋วสงสัย `break-words` กับความกว้าง `max-w-sm` **วัดแล้วทั้งคู่ ไม่ใช่ทั้งคู่** และวัดเพิ่มอีกสองข้อ
ที่ตั๋วไม่ได้เอ่ย — `lang="th"` กับ `word-break: keep-all` — ก็ไม่ขยับรอยตัดแม้แต่ตัวอักษรเดียว
ย่อหน้านั้น**ไม่เคยล้นกรอบ** (`scrollWidth` เท่ากับความกว้างทุกกรณี) `break-words` จึงไม่เคยทำงาน
รอยตัดที่ `ปีการ|ศึกษา` เป็นโอกาสตัดบรรทัดที่ Chromium **เลือกเอง** เพราะ ICU แบ่งคำว่า
`ใน|ปี|การ|ศึกษา` การตัดหลัง `การ` จึงถูกต้องในสายตาของมัน ประโยคที่ยาวที่สุดในระบบโดน
`ผู้|สอน` กับ `ภาค|การ|ศึกษา` ด้วยเหตุผลเดียวกัน

ไม่มี CSS ตัวไหนลดโอกาสตัดพวกนั้นได้ **ตัวข้อความจึงเป็นคนบอกเองว่าตัดตรงไหนได้**
U+2060 WORD JOINER ระหว่างตัวอักษรไทยทุกคู่ที่ติดกัน เหลือไว้เฉพาะช่องว่างที่คนเขียนประโยคใส่ไว้

## มัตแตนต์

* `notglued` — โค้ดก่อนการแก้ ส่ง `message` เข้าไปดิบ ๆ **ฆ่าแถว 1 กับแถว 2** ที่ทั้ง
  *คำนี้ถูกวาดครบ* และ *ทุกบรรทัดจบที่ช่องว่าง* และ **ไม่แตะแถว 3 กับแถว 4** ซึ่งถามว่าชื่อที่ยาว
  เกินบรรทัดยังตัดได้อยู่ไหม — คำถามที่ไม่ได้ขึ้นกับกาว
* `nobreakwords` — ถอด `break-words` ออกจากย่อหน้า **ฆ่าแถว 3 กับแถว 4** — นี่คือสิ่งที่ทำให้
  `break-words` เป็นข้ออ้างที่พิสูจน์แล้ว ไม่ใช่คลาสที่รับมรดกมาจากใครไม่รู้ ก่อนใบนี้ไม่มีอะไรวัดมันเลย
* `nowrapinstead` — **ข้อเสนอที่ถูกปฏิเสธ เขียนให้มันรันจริง** (#48) แทนกาวด้วย
  `white-space: nowrap` ต่อหนึ่งคำที่คั่นด้วยช่องว่าง ซึ่งเป็นทางที่วัดแล้วและไม่เอา
  **ฆ่าแถว 4 แถวเดียว**

## แถวที่ 4 มีอยู่เพราะการกวาดรอบแรก

รอบแรกไฟล์นี้เขียนไว้ว่า `nowrapinstead` จะฆ่าแถว 3 **มันรอด ผ่านครบทั้งสามแถวที่มีตอนนั้น**
เหตุผลคือแถว 3 ใช้ชื่อภาษาอังกฤษ และ nowrap ปล่อยคำที่ไม่มีตัวอักษรไทยไว้เฉย ๆ ตัวเลข 213px
ที่วัดไว้ตอนสำรวจเป็นของ**ชื่อไทย**ที่ยาวเกินบรรทัด ไม่ใช่ของชื่อภาษาอังกฤษ — คนละกรณีกัน
แถว 4 จึงถูกเขียนขึ้น**หลัง**การกวาด ไม่ใช่ก่อน

ถ้าเชื่อคำทำนายในไฟล์นี้แทนที่จะรันมัน ข้ออ้างที่ว่า *กาวดีกว่า nowrap* จะไม่มีแถวไหนค้ำเลยสักแถว
(#51 — คำทำนายของใบเป็นสิ่งที่ตอบคำถามของการกวาดก่อนที่ใครจะได้ถาม)

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`FILES` มีไฟล์เดียวคือ `frontend/src/components/ConfirmDialog.js` ซึ่ง ณ 24 ก.ย. 2569
ไม่มีใบไหนใน `mutation/` แตะเลย (ตรวจด้วย `grep -l ConfirmDialog mutation/*.py`)

## การกวาด

กวาดเมื่อ 24 ก.ย. 2569 ทีละตัว บน `118a-thai-line-breaks` (ชื่อเต็ม ไม่ใช่ `118a` — #158)
คืน `restore` ระหว่างทุกตัว

| มัตแตนต์ | ผล | แถวที่ตาย |
|---|---|---|
| (ไม่ใส่) | ผ่าน 5 | — |
| `notglued` | ล้ม 2 ผ่าน 3 | 1, 2 |
| `nobreakwords` | ล้ม 2 ผ่าน 3 | 3, 4 |
| `nowrapinstead` | ล้ม 1 ผ่าน 4 | 4 |

**ทุกแถวที่เป็นเกณฑ์มีตัวที่ฆ่ามัน และไม่มีสองตัวที่ฆ่าชุดเดียวกัน** — `notglued` กับ
`nobreakwords` แบ่งใบนี้เป็นครึ่ง *อย่าตัดกลางคำ* กับครึ่ง *ที่ยาวเกินยังต้องตัด* ส่วน
`nowrapinstead` ชี้ไปที่แถวเดียวที่แยกการออกแบบสองแบบออกจากกัน

**แถว 5 ยืนอยู่ใต้ทุกตัว และต้องเป็นอย่างนั้น** มันไม่ใช่เกณฑ์ แต่เป็น**ข้อตั้ง** —
`Intl.Segmenter('th')` ตอบ `ใน|ปี|การ|ศึกษา` จริงไหม ไม่มีมัตแตนต์ตัวไหนในไฟล์นี้แตะ ICU ได้
เหมือนที่ไม่มีมัตแตนต์ฆ่าแอตทริบิวต์ที่ locator สร้างอยู่บนมันได้ (#85) อย่านับมันเป็นแถวที่รอด
ตอนอ่านตารางข้างบน

ตารางนี้วัดรอบที่สอง ตอน `118a` มีห้าแถว รอบแรกวัดตอนมีสี่แถว และไฟล์สเปกยังไม่ได้ผูกกับ
`confirm-dialog.js` — ชุดที่ตายเหมือนกันทุกตัว

แถว ⚙ อยู่บน `docs/acceptance/41-continuous-improvement-plan.md` — ใบนี้แตะโค้ดที่ **18 หน้าจอ
ใช้ร่วมกัน เป็น 19 กล่อง** (`Offerings.js` มีสองกล่อง) ใบรับรองใบนั้นจึงเป็น**หนึ่งในที่ที่
มัตแตนต์ฆ่า ไม่ใช่รายการทั้งหมด** (#123)

## วิธีรัน

    python mutation/118-thai-line-breaks.py save
    python mutation/118-thai-line-breaks.py <mutant>
    cd e2e && E2E_FRONTEND_PORT=5300 npx playwright test 118a-thai-line-breaks
    python mutation/118-thai-line-breaks.py restore

แถวอยู่ใน `e2e/tests/118a-thai-line-breaks.spec.js`
"""
from harness import main

FILES = {
    'dialog': 'frontend/src/components/ConfirmDialog.js',
}

# The call, not the comment beside it (#121).
GLUED = '          {glued(message)}'
RAW = '          {message}'

PARAGRAPH = '<p className="text-md mt-4 break-words leading-relaxed text-gray-600">'
NO_BREAK_WORDS = '<p className="text-md mt-4 leading-relaxed text-gray-600">'

# The design that was measured and not taken: every space-delimited token made
# unbreakable. It needs `glued` to hand back elements rather than a string, so
# the whole definition is what moves.
GLUE_FN = """const glued = message =>
  typeof message === 'string' ? message.replace(BETWEEN_THAI, '$1\\u2060') : message"""
NOWRAP_FN = """const glued = message =>
  typeof message !== 'string'
    ? message
    : message
        .split(' ')
        .map((token, at) => [
          at ? ' ' : '',
          /[\\u0E01-\\u0E3A\\u0E40-\\u0E4E]/.test(token) ? (
            <span key={at} style={{ whiteSpace: 'nowrap' }}>
              {token}
            </span>
          ) : (
            token
          ),
        ])"""

MUTANTS = {
    'notglued': ('dialog', GLUED, RAW),
    'nobreakwords': ('dialog', PARAGRAPH, NO_BREAK_WORDS),
    'nowrapinstead': ('dialog', GLUE_FN, NOWRAP_FN),
}

main(FILES, MUTANTS)
