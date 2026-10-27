# -*- coding: utf-8 -*-
"""#234 — ตัวกรองของจอถูกวาดจากรายการที่กว้างกว่า pool ของฟอร์ม

`backend/lib/reach.js` ตอบรายการหลักสูตรของจอเหล่านี้โดยมีหลักสูตรที่ปิดไปแล้วมาด้วย
(*Retired ones come too*) ซึ่งเป็นสิ่งที่ทำให้คนอ่าน Rubric คู่รายวิชา และผลการเรียนรู้ของ
หลักสูตรที่ปิดไปแล้วได้ · จอวาดตัวกรองจากรายการนั้นทั้งก้อน ส่วนฟอร์มกัน
หลักสูตรที่ปิดไปแล้วออกจาก pool ที่มันเลือกเองได้ เพราะ `programInReach` ต้องการ `is_active`
และค่าที่อยู่นอก pool คือค่าที่เซิร์ฟเวอร์ปฏิเสธ (ADR-0002) — แล้วสามฟอร์มจากสี่
ตั้งต้นที่ค่าของตัวกรองอยู่ดี คือ `const starting = defaultProgram || onlyOne?.program_id || ''`

ฉะนั้นคนที่กรองด้วยหลักสูตรที่ปิดไปแล้วแล้วกด *เพิ่ม* ได้ฟอร์มที่ช่องหลักสูตร**ตั้งอยู่แล้ว**
ที่ค่าที่ไม่มีการบันทึกไหนพาไปได้ และจอไม่ได้บอกเลย เพราะตัวเลือกนั้นถูกวาด และสามฟอร์มนี้
ปล่อยตัวเลือกของหลักสูตรที่ปิดไปแล้วให้ **เลือกได้** ขณะที่ช่องถือมันอยู่ ซึ่งเป็นข้อที่ #232
เขียนไว้ให้ระเบียนที่อยู่ในหลักสูตรที่ปิดไปแล้ว (`198a` แถว 5 · `244a` แถว 4)

## สี่สำเนา สามมัตแตนต์ และข้อเสนอที่ถูกปฏิเสธ

`components/offerings/OfferingForm.js` เป็นสำเนาที่สี่และเป็นสำเนาเดียวที่ไม่มีแถว ฉะนั้น
ไม่มีมัตแตนต์: จอของมันเป็นของ `PROG_MANAGER` เท่านั้น (`backend/routes/offerings.js`
`const COMMITTEE = ['PROG_MANAGER']`) และขอบเขตของสิทธิ์กรรมการคือหลักสูตรใบเดียว ฉะนั้น
ตัวกรองไม่ถูกวาดให้ใครเลยในชุดข้อมูล — ต้องสร้างสิทธิ์กรรมการใบที่สองผ่าน HTTP อย่างที่
`198a` ทำ ทับบนการปิดหลักสูตร · การแก้ลงที่นั้นพร้อมอีกสามตัว เพราะเป็นบรรทัดเดียวกัน และ
การเหลือสำเนาที่ไม่ได้แก้คือสิ่งที่ #244 ถูกเปิดขึ้นมาซ่อม ส่วนแถวอยู่ที่ #245

**โค้ดถูกคัดลอก ไม่ได้ถูกใช้ร่วมกัน ฉะนั้นมัตแตนต์ในฟอร์มหนึ่งไม่มีแถวของฟอร์มอื่นมาพิสูจน์ให้**
(#83) และข้อนี้เขียนเหมือนกันทุกตัวอักษรในสามฟอร์ม สิ่งที่ต่างคือแฟ้มที่มันถูกเล็ง ซึ่งคือสิ่งที่
`FILES` ทำ

## ตัวค้ำ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `rubricfollowstheretiredfilter` | `RubricForm` กลับไปตั้งต้นที่ค่าของตัวกรองไม่ว่าค่านั้นยังอยู่ใน pool หรือไม่ | `234a` แถว 1 ที่ `and it starts on the curriculum this account may file a rubric in` |
| `pairfollowstheretiredfilter` | ข้อเดียวกันใน `ProgramSubjectForm` | `234a` แถว 2 ที่ `and it starts on the curriculum this account may file a pair in` |
| `outcomefollowstheretiredfilter` | ข้อเดียวกันใน `PloForm` | `234a` แถว 3 ที่ `and it starts on the curriculum this account may file an outcome in` |
| `rubricfilterhidestheretired` | **ทางเลือกข้อ 2 ของตั๋วที่ถูกปฏิเสธ เขียนให้รันได้** (#48) — ตัวกรองของ `pages/Rubrics.js` เลิกวาดหลักสูตรที่ปิดไปแล้ว · เล็งที่**จอ** ไม่ใช่ที่ฟอร์ม เพราะสิ่งที่ข้อ 2 จะเอาออกคือการ**อ่าน** ไม่ใช่การเขียน | `234a` แถว 1 ที่ `the closed curriculum is still offered, so its rubrics can be read` — ได้ `Received: 0` ส่วนอีกสองแถวยืน (1 ตก 2 ผ่าน) |

**ตัวที่สี่ต้องการข้ออ้างที่แถวยังไม่มี และร่างแรกของมันฆ่าเร็วเกินไป** วัดเมื่อ 27 ต.ค. 2569
ก่อนเติมข้ออ้างนั้น: ความสามารถถูกถือไว้เป็น**ข้อตั้ง**ของแถว คือ `filterTo` ที่เลือกหลักสูตร
ที่ปิดไปแล้วในตัวกรอง ฉะนั้นตัวกรองที่ไม่เสนอตัวเลือกนั้นทำให้ `selectOption` ไม่มีอะไรให้เลือก
และ `waitForList` ตายที่ timeout ไม่ใช่ที่ข้ออ้าง (#139) · แถว 1 จึงได้การอ่านว่าตัวเลือกนั้น
**ถูกเสนอ** เพิ่มมาหนึ่งข้อ วางไว้**เหนือ**การกรอง ซึ่งเป็นความจำเป็นไม่ใช่ทางเลือก (#233
อ่านจากอีกด้าน — ปกติข้ออ้างมาก่อนการอ่านที่ตามมาจากมัน) แล้วมัตแตนต์ตัวนี้ฆ่าที่ข้ออ้างนั้น
ด้วย `Received: 0` · และจอนี้เป็นจอที่พิสูจน์กฎ เลือกด้วยสำมะโนไม่ใช่ด้วยหัวเรื่อง (#68)

ตัวค้ำสามตัวแรกเป็นข้อเสนอของตั๋วที่ถูกเลือกไว้แล้วเขียนให้รันได้ (#115 — เมื่อการวินิจฉัยของตั๋ว
ถูกรับ มัตแตนต์ที่ต้องเขียนคือโค้ดที่ถูกวินิจฉัย) และทั้งสามแถวตกกับโค้ดก่อนการแก้จริง วัดเมื่อ
27 ต.ค. 2569 ก่อนเขียนมัตแตนต์ (#203) — สามแถวแดงที่ข้ออ้างของตัวเองด้วย `Received "0501"`
ทั้งสามแถว

**การเอา `filtered` ออกทั้งบรรทัด ไม่ใช่แค่เลิกอ่านมัน** เพราะตัวแปรที่ไม่มีใครอ้างทำให้
`CI=true` คอมไพล์ตก ซึ่งเป็นมัตแตนต์ที่หยุดแอป ไม่ใช่ที่ล้มแถว (#101)

วัดเมื่อ 27 ต.ค. 2569: สะอาด 3 ผ่าน · `rubricfollowstheretiredfilter` 1 ตก 2 ผ่าน ·
`pairfollowstheretiredfilter` 1 ตก 2 ผ่าน · `outcomefollowstheretiredfilter` 1 ตก 2 ผ่าน
แต่ละตัวฆ่าแถวของตัวเองตัวเดียว ซึ่งเป็นสิ่งที่สำเนาสามสำเนาควรทำ ·
`rubricfilterhidestheretired` 1 ตก 2 ผ่าน ที่ข้ออ้างเรื่องความสามารถ

`rubricfollowstheretiredfilter` ถูกรันใหม่หลังแถว 1 ได้ข้ออ้างเพิ่ม เพราะแถวที่โตขึ้นทำให้
จำนวนที่มัตแตนต์ฆ่าหมดอายุโดยไม่มีอะไรรายงาน — ตัวยึดยังตรงและโค้ดที่มันแก้ไม่ขยับ (#202)
ผลยังเป็น 1 ตก 2 ผ่าน และยังตายที่ข้ออ้างของตัวเอง ไม่ใช่ที่ข้ออ้างใหม่ที่อยู่เหนือมัน

## วิธีรัน

    python mutation/234-a-filter-wider-than-the-pool.py save
    python mutation/234-a-filter-wider-than-the-pool.py <mutant>
    python mutation/234-a-filter-wider-than-the-pool.py restore
    cd e2e && npx playwright test tests/234a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'rubric': 'frontend/src/components/rubrics/RubricForm.js',
    'pair': 'frontend/src/components/programSubjects/ProgramSubjectForm.js',
    'outcome': 'frontend/src/components/plos/PloForm.js',
    'screen': 'frontend/src/pages/Rubrics.js',
}

# The anchor is the code the mutant breaks and never the comment beside it
# (#121, #123). These two lines are the same two lines in all three forms, so
# the anchor is unique inside its own file and nowhere else — which is what
# `FILES` is for, as it is in `244-the-copies-of-a-branch.py`.

# `Rubrics.js` draws its filter from `programs` whole, which is what makes the
# rubrics of a closed curriculum readable. The mutant below is option 2 of the
# ticket: narrow that list to the ones still running.
FILTER_OPTIONS = """                    {programs.map(entry => (
"""
USABLE_FILTER_OPTIONS = """                    {programs
                      .filter(entry => entry.is_active !== false)
                      .map(entry => (
"""

POOL_CLAUSE = """  const filtered = usable.some(program => program.program_id === defaultProgram)
  const starting = (filtered ? defaultProgram : onlyOne?.program_id) || ''
"""
NO_POOL_CLAUSE = """  const starting = defaultProgram || onlyOne?.program_id || ''
"""

MUTANTS = {
    'rubricfollowstheretiredfilter': [
        ('rubric', POOL_CLAUSE, NO_POOL_CLAUSE),
    ],
    'pairfollowstheretiredfilter': [
        ('pair', POOL_CLAUSE, NO_POOL_CLAUSE),
    ],
    'outcomefollowstheretiredfilter': [
        ('outcome', POOL_CLAUSE, NO_POOL_CLAUSE),
    ],
    # The option the ticket offered and that was declined, made to run (#48):
    # the screen's own filter stops drawing the curricula that have been closed.
    # It is aimed at the screen and not at a form, because what option 2 would
    # take away is the reading, not the writing.
    'rubricfilterhidestheretired': [
        ('screen', FILTER_OPTIONS, USABLE_FILTER_OPTIONS),
    ],
}

main(FILES, MUTANTS)
