# -*- coding: utf-8 -*-
"""#232 — ฟอร์มที่พิมพ์ค้างไว้ถูกล้างด้วย effect ของตัวเอง เมื่อการอ่านรอบที่สองตั้งค่า pool ใหม่

#198 เลือกกลไก *อ่านใหม่โดยไม่ถอดจอ* เพื่อให้ฟอร์มที่พิมพ์ค้างไว้รอดจากการสลับหมวกที่ไม่ขยับที่อยู่
และการรีวิวของใบนั้นเองเติม dependency ให้การอ่าน **หลักสูตรที่เอื้อมถึง** ด้วย — ซึ่งเป็นการอ่าน
ที่ตั้งค่า `programs` ใหม่ `RubricForm` คำนวณ `onlyOne` จาก `programs.filter(...)` แล้ววางมันไว้
ใน dependency ของ effect ที่ `setDraft` ใหม่ทั้งก้อน ฉะนั้นอาเรย์ตัวใหม่ทุกครั้งที่คำตอบมาถึง
เท่ากับล้างฟอร์ม — **ข้อบกพร่องที่ #198 เปิดมาเพื่อไม่ให้เกิด อ่านกลับทาง**

`198a` แถว 1 คือแถวที่ถือข้ออ้างนั้น และมันแดง 3 ใน 5 ที่ `99ee1e3` เพราะการอ่านของมันแข่งกับ
คำตอบรอบที่สอง ไม่ใช่รออยู่หลังมัน (#152 ความหมายที่เจ็ด) แถวนั้นจึงอ่านหลังคำตอบและหลังการวาด
ที่คำตอบพามา (#132) และแดง 1 ใน 1 กับโค้ดก่อนแก้

**สิ่งที่ลงไปในโค้ดมีสองครึ่ง และสองมัตแตนต์นี้คือสองครึ่งนั้น** ครึ่งแรกคือ *อะไรล้างฟอร์ม* —
เฉพาะการเปลี่ยนเรื่องที่กำลังแก้ (`value`) ซึ่งเป็น state ของจอข้างบน ไม่ใช่ค่าที่คำนวณที่นี่
ครึ่งที่สองคือ *อะไรขยับช่องหลักสูตร* — pool เขียนเป็นค่า (สตริงของรหัส) และช่องถูกเลือกใหม่
เมื่อค่าที่อยู่ในช่องไม่อยู่ใน pool อีก ซึ่งเป็นคำตอบที่แถว 3 ของ `198a` ตัดสินไว้แล้วว่า pool
เป็นของหมวกใบใหม่ (ADR-0002) — ค่าที่ไม่อยู่ใน pool คือค่าที่เซิร์ฟเวอร์ปฏิเสธ ฉะนั้นโค้ดที่นี่เลือกมันให้เองไม่ได้

## ตัวค้ำ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `arrayidentity` | โค้ดที่ตั๋ววินิจฉัยไว้ เขียนให้รันได้ (#115) — effect เดียวที่ `setDraft` ใหม่ทั้งก้อน โดยมี `onlyOne` อยู่ใน dependency · **สามการแก้** เพราะ `starting` กับ `pool` จะไม่มีใครอ้าง ซึ่ง `CI=true` เปลี่ยนเป็นคอมไพล์ตก คือมัตแตนต์ที่หยุดแอป ไม่ใช่ที่ล้มแถว (#101) | `198a` แถว 1 ที่ `what was typed survived the switch` **และแถว 4** ที่ข้ออ้างที่สอง คือสิ่งที่พิมพ์ไว้ |
| `movesanexistingrubric` | ข้อ `if (editing) return` หายไป คือครึ่งที่ปล่อย Rubric ที่มีอยู่แล้วไว้ · **สองการแก้** เพราะ `editing` ต้องออกจาก dependency ด้วย มิฉะนั้น `CI=true` เปลี่ยน warning เป็นคอมไพล์ตก (#101) | `198a` แถว 5 ที่ `the rubric still says which curriculum it is in` — อีกสี่แถวผ่าน |
| `keepsthecurriculum` | ตัวเลือกข้อ 1 ของตั๋ว (*ทำให้ dependency นิ่ง*) เขียนให้รันได้ (#48) — ฟอร์มไม่ถูกล้าง แต่ช่องหลักสูตรไม่ถูกเลือกใหม่เลย · **สองการแก้** ด้วยเหตุผลเดียวกับตัวบน | `198a` แถว 4 ที่ข้ออ้างแรก คือหลักสูตรของหมวกใบใหม่ (ได้ `''` เพราะค่าเก่าไม่มี `option` ไหนวาดมัน) · **แถว 1 ผ่าน** และนั่นคือจุดของมัน: มันคือตัวควบคุมที่บอกว่าแถว 4 วัดการจับคู่ ไม่ใช่วัดฟอร์มที่รอดซ้ำอีกครั้ง (#145) |

**ข้อ `if (editing) return` มีตัวค้ำ และร่างแรกของแฟ้มนี้เขียนว่ามันไปถึงไม่ได้**
การรีวิวของ 23 ต.ค. 2569 วัดแล้วว่าผิด: `reachablePrograms` ตอบหลักสูตรที่ปิดไปแล้วมาด้วย
(*Retired ones come too*) ส่วน `usable` กรองมันออก Rubric ที่อยู่ในหลักสูตรที่ปิดไปแล้ว
จึงถือ `program_id` ที่ **ไม่** อยู่ใน pool สร้างสถานการณ์นั้นได้ด้วยการปิดหลักสูตรผ่าน route
ของผู้ดูแลคณะ แล้วเปิดฟอร์มแก้ไข — แถว 5 ทำอย่างนั้น และ `movesanexistingrubric`
คือสิ่งที่พิสูจน์ว่าข้อนั้นทำงานจริง (#141 · #102 สามคำตอบ: พิสูจน์แล้ว · ไปถึงไม่ได้เชิงโครงสร้าง · ไม่ได้ทดสอบ)

## วิธีรัน

    python mutation/232-the-form-the-second-read-kept.py save
    python mutation/232-the-form-the-second-read-kept.py <mutant>
    python mutation/232-the-form-the-second-read-kept.py restore
    cd e2e && npx playwright test tests/198a
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
"""
from harness import main

FILES = {
    'form': 'frontend/src/components/rubrics/RubricForm.js',
}

TWO_EFFECTS = """  // The subject changed, so the form starts again: a different rubric is being
  // edited, or the form was opened to add one. This is the only thing that
  // throws away what a person has typed, and `value` is state in the screen
  // above rather than anything derived here, so a re-read cannot move it.
  useEffect(() => {
    setDraft({ ...EMPTY, ...value })
  }, [value])

  // And the curriculum follows the pool, which is the half a re-read may move -
  // #232. The field is left alone while it names something still in reach, and
  // re-picked when it does not: the pool is what this hat may write into, so a
  // value outside it is one the server refuses (ADR-0002), and nothing here may
  // pick one - that would put the form in a refused state before the person had
  // touched anything.
  //
  // An existing rubric is not moved at all, and that branch is not decoration:
  // `GET /api/rubrics/programs` answers with retired curricula too, so a rubric
  // filed in one holds a program_id the pool does not contain, and re-picking
  // would make the form say it belongs somewhere else. `198a` row 5 holds that,
  // and `232:movesanexistingrubric` is the mutant.
  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [editing, pool, starting])
"""

STARTING = """  // A curriculum to start on: the one the list is filtered to, or the only one
  // this account holds. A กรรมการหลักสูตร never picks.
  const starting = defaultProgram || onlyOne?.program_id || ''

"""

POOL = """  // The pool as a value rather than as an array - #232. `programs` is a new
  // array on every answer, so an effect that depended on it, or on anything
  // derived from it by identity, re-ran whenever the screen read the pool
  // again. That is how a form typed and not saved was thrown away by its own
  // effect when a switch of hats which stays put re-read the curricula in
  // reach: the one thing #198 narrowed the remount to keep.
  const pool = usable.map(program => program.program_id).join(' ')

"""

GUARD = """  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [editing, pool, starting])
"""

NOGUARD = """  useEffect(() => {
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [pool, starting])
"""

MUTANTS = {
    'arrayidentity': [
        ('form', STARTING, ''),
        ('form', POOL, ''),
        ('form', TWO_EFFECTS,
        '  useEffect(() => {\n'
        '    setDraft({\n'
        '      ...EMPTY,\n'
        "      program_id: defaultProgram || onlyOne?.program_id || '',\n"
        '      ...value,\n'
        '    })\n'
        '  }, [value, defaultProgram, onlyOne])\n'),
    ],
    'movesanexistingrubric': [
        ('form', GUARD, NOGUARD),
    ],
    'keepsthecurriculum': [
        ('form', POOL, ''),
        ('form', TWO_EFFECTS,
        '  useEffect(() => {\n'
        '    setDraft({ ...EMPTY, program_id: starting, ...value })\n'
        '    // eslint-disable-next-line react-hooks/exhaustive-deps\n'
        '  }, [value, defaultProgram])\n'),
    ],
}

main(FILES, MUTANTS)
