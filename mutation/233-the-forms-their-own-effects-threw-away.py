# -*- coding: utf-8 -*-
"""#233 — อีกสี่ฟอร์มที่ยังถือรูปที่ #232 แก้ และทางเข้าสองทางที่ไม่เหมือนกัน

#232 แก้ `rubrics/RubricForm` ซึ่งมี effect ที่ `setDraft` ใหม่ทั้งก้อน โดยมี `onlyOne` —
ค่าที่คำนวณจากคำตอบ **ด้วย identity** — อยู่ใน dependency คำตอบเป็นอาเรย์ตัวใหม่ทุกครั้ง
ฉะนั้น effect นั้นรันใหม่ทุกครั้งที่จออ่าน pool อีกรอบ และล้างฟอร์มที่พิมพ์ค้างไว้ ซึ่งเป็นสิ่งเดียว
ที่ #198 ทำให้กลไกแคบลงเพื่อรักษาไว้ `grep -rln onlyOne frontend/src/components` เจอเจ็ดแฟ้ม
สี่แฟ้มในนั้นเขียน draft แบบเดียวกัน แฟ้มนี้คือสี่แฟ้มนั้น

**ทางเข้าสองทางไม่เหมือนกัน และมีเพียงทางเดียวที่มีจอรองรับวันนี้**

*การอ่าน pool รอบที่สอง* เกิดที่จอซึ่งใส่ generation ไว้ใน dependency ของการอ่าน และในสี่จอนี้
มีจอเดียวที่ทำ คือ `Programs.js` (วัดเทียบกับ `useScreenGeneration` ทั้ง `frontend/src/pages`
วันที่ 26 ต.ค. 2569 — `Plos.js` `ProgramSubjects.js` และ `Subjects.js` ปิดการอ่าน pool
ด้วย `}, [report])` ทั้งสามจอ) `233a` แถว 1 คือทางเข้านั้น

*คำตอบที่การ mount รออยู่เอง* คือทางเข้าที่อีกสามจอมี การอ่าน pool เกิดหนึ่งครั้งต่อการ mount
และคำตอบนั้นเองย้าย `onlyOne` จาก `null` เป็นออบเจ็กต์หนึ่งครั้ง คนที่เปิดฟอร์มแล้วพิมพ์ก่อน
คำตอบมาถึงจึงเสียสิ่งที่พิมพ์ — ทุกจอในสี่จอ โดยไม่ต้องมีสิทธิ์ใบที่สองและไม่ต้องสลับหมวก
`233a` แถว 3 ถึง 5 คือทางเข้านั้น หนึ่งแถวต่อหนึ่งฟอร์ม เปิดหน้าต่างด้วย
`e2e/support/late-answer.js` (#170)

**โค้ดถูกคัดลอก ไม่ได้ถูกใช้ร่วมกัน ฉะนั้นมัตแตนต์ในฟอร์มหนึ่งไม่มีแถวของฟอร์มอื่นมาพิสูจน์ให้ (#83)**
นั่นคือเหตุที่มัตแตนต์ของ *การล้างฟอร์ม* มีสี่ตัว ไม่ใช่ตัวเดียว

## ตัวค้ำ

| ชื่อ | สิ่งที่มันทำ | แถวที่มันฆ่า |
|---|---|---|
| `programmearrayidentity` | โค้ดที่ตั๋ววินิจฉัยไว้ เขียนให้รันได้ (#115) — effect เดียวใน `ProgramForm` ที่ `setDraft` ใหม่ทั้งก้อน โดยมี `onlyOne` อยู่ใน dependency · **การแก้สี่จุด** เพราะ `starting` กับ `pool` จะไม่มีใครอ้าง ซึ่ง `CI=true` เปลี่ยนเป็นคอมไพล์ตก คือมัตแตนต์ที่หยุดแอป ไม่ใช่ที่ล้มแถว (#101) | `233a` แถว 1 ที่ `what was typed survived the re-read` |
| `movesanexistingprogramme` | ข้อ `if (editing) return` ใน `ProgramForm` หายไป คือครึ่งที่ปล่อยหลักสูตรที่มีอยู่แล้วไว้ · **เขียน effect ทั้งก้อนใหม่** เพราะ `editing` ต้องออกจาก dependency ด้วย | `233a` แถว 2 ที่ `the programme still says which department it is in` |
| `keepsthedepartment` | ตัวควบคุม (#145) — ฟอร์มไม่ถูกล้าง แต่ช่องภาควิชาไม่ถูกเลือกใหม่เลย คือตัวเลือก *ทำให้ dependency นิ่ง* เขียนให้รันได้ (#48) | `233a` แถว 1 ที่ `the department the new grant reaches` — **ข้ออ้างแรกของแถวเดียวกันนั้นผ่าน** และนั่นคือจุดของมัน: มันบอกว่าสองประโยคในแถว 1 เป็นสองข้ออ้าง ไม่ใช่ข้อเดียวอ่านสองครั้ง |
| `subjectarrayidentity` | โค้ดที่วินิจฉัยไว้ของ `SubjectForm` เขียนให้รันได้ · **การแก้ห้าจุด** ด้วยเหตุผลเดียวกับตัวแรก | `233a` แถว 3 |
| `outcomearrayidentity` | โค้ดที่วินิจฉัยไว้ของ `PloForm` เขียนให้รันได้ · **การแก้ห้าจุด** | `233a` แถว 4 |
| `pairarrayidentity` | โค้ดที่วินิจฉัยไว้ของ `ProgramSubjectForm` เขียนให้รันได้ · **การแก้สี่จุด** | `233a` แถว 5 |

**แถว 2 ผ่านกับโค้ดก่อนแก้** และนั่นคือเหตุที่มันต้องมีมัตแตนต์ของตัวเอง: โค้ดที่ `HEAD`
เขียน draft ใหม่ทั้งก้อนจาก `value` อยู่แล้ว ซึ่งพาภาควิชาของหลักสูตรนั้นมาด้วย ข้อ
`if (editing) return` เป็นข้อใหม่ของการแก้ครั้งนี้ ไม่ใช่สิ่งที่โค้ดก่อนแก้ทำผิด ฉะนั้นสิ่งที่
วัดมันได้คือ `movesanexistingprogramme` ไม่ใช่การรันแถวนั้นกับโค้ดก่อนแก้ (#203)

และการกวาดเองย้ายลำดับของแถว 2: ตัวแรกที่ `movesanexistingprogramme` ทำให้แดง
คือการอ่านข้อตั้งต้น — ตัวเลือกของภาควิชาที่ปิดไปแล้วถูกวาดเพราะช่องถืออยู่ ฉะนั้นมัตแตนต์
ที่ล้างช่องก็เอาตัวเลือกไปด้วย และข้ออ้างของแถวเองถูกทิ้งไว้ใต้เส้นแดงโดยไม่มีใครอ่าน (#88)
แถวนี้จึงอ่านค่าก่อน แล้วนับตัวเลือกทีหลัง

**ข้อ `if (editing) return` อีกสามสำเนาไม่มีแถวมาพิสูจน์** — ไปถึงได้ด้วยวิธีเดียวกัน
(ปิดหลักสูตรหรือภาควิชาที่แถวเดิมอยู่) จึงเป็น *ไม่ได้ทดสอบ* ไม่ใช่ *ไปถึงไม่ได้เชิงโครงสร้าง*
(#102 สามคำตอบ) และอยู่ในตัวติดตามแล้วที่ #244 ไม่ได้อยู่แค่ในย่อหน้านี้

## วิธีรัน

    python mutation/233-the-forms-their-own-effects-threw-away.py save
    python mutation/233-the-forms-their-own-effects-threw-away.py <mutant>
    python mutation/233-the-forms-their-own-effects-threw-away.py restore
    cd e2e && E2E_BACKEND_PORT=3600 E2E_FRONTEND_PORT=5310 npx playwright test tests/233a
"""
from harness import main

FILES = {
    'programme': 'frontend/src/components/programs/ProgramForm.js',
    'subject': 'frontend/src/components/subjects/SubjectForm.js',
    'outcome': 'frontend/src/components/plos/PloForm.js',
    'pair': 'frontend/src/components/programSubjects/ProgramSubjectForm.js',
}

# The anchors are the code each mutant breaks and never the comment beside it
# (#121, #123): a comment rewritten by a later ticket would re-aim every mutant
# here, and `python mutation/anchors.py` would be the only thing that said so.

DEPARTMENT_STARTING = "  const starting = onlyOne ? onlyOne.department_id : ''\n"
DEPARTMENT_POOL = (
    "  const pool = usable.map(department => department.department_id).join(' ')\n"
)
DEPARTMENT_GUARD = """  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.department_id && pool.split(' ').includes(current.department_id)
        ? current
        : { ...current, department_id: starting },
    )
  }, [editing, pool, starting])
"""
DEPARTMENT_NO_GUARD = """  useEffect(() => {
    setDraft(current =>
      current.department_id && pool.split(' ').includes(current.department_id)
        ? current
        : { ...current, department_id: starting },
    )
  }, [pool, starting])
"""

PROGRAM_STARTING = "  const starting = defaultProgram || onlyOne?.program_id || ''\n"
PROGRAM_POOL = "  const pool = usable.map(program => program.program_id).join(' ')\n"
PROGRAM_GUARD = """  useEffect(() => {
    if (editing) return
    setDraft(current =>
      current.program_id && pool.split(' ').includes(current.program_id)
        ? current
        : { ...current, program_id: starting },
    )
  }, [editing, pool, starting])
"""

# `ProgramForm` and `SubjectForm` keep a hand-picked department across a change
# of `value`, so their first effect is a functional updater and the diagnosed
# line goes back where `HEAD` had it, inside that updater.
KEPT_DEPARTMENT = "      department_id: current.department_id,\n"
DIAGNOSED_DEPARTMENT = (
    "      department_id: onlyOne ? onlyOne.department_id : current.department_id,\n"
)

ON_VALUE = "  }, [value])\n"

MUTANTS = {
    'programmearrayidentity': [
        ('programme', DEPARTMENT_STARTING, ''),
        ('programme', DEPARTMENT_POOL, ''),
        ('programme', DEPARTMENT_GUARD, ''),
        ('programme', KEPT_DEPARTMENT + '      ...value,\n' + '    }))\n' + ON_VALUE,
         DIAGNOSED_DEPARTMENT + '      ...value,\n' + '    }))\n'
         + '  }, [value, onlyOne])\n'),
    ],
    'movesanexistingprogramme': [
        ('programme', DEPARTMENT_GUARD, DEPARTMENT_NO_GUARD),
    ],
    'keepsthedepartment': [
        ('programme', DEPARTMENT_POOL, ''),
        ('programme', DEPARTMENT_GUARD, ''),
        ('programme', KEPT_DEPARTMENT,
         '      department_id: starting || current.department_id,\n'),
        ('programme', ON_VALUE,
         '    // eslint-disable-next-line react-hooks/exhaustive-deps\n' + ON_VALUE),
    ],
    'subjectarrayidentity': [
        ('subject', DEPARTMENT_STARTING, ''),
        ('subject', DEPARTMENT_POOL, ''),
        ('subject', DEPARTMENT_GUARD, ''),
        ('subject', KEPT_DEPARTMENT, DIAGNOSED_DEPARTMENT),
        ('subject', ON_VALUE, '  }, [value, onlyOne])\n'),
    ],
    'outcomearrayidentity': [
        ('outcome', PROGRAM_STARTING, ''),
        ('outcome', PROGRAM_POOL, ''),
        ('outcome', PROGRAM_GUARD, ''),
        ('outcome', '      ...EMPTY,\n      ...value,\n',
         '      ...EMPTY,\n'
         "      program_id: defaultProgram || onlyOne?.program_id || '',\n"
         '      ...value,\n'),
        ('outcome', ON_VALUE, '  }, [value, defaultProgram, onlyOne])\n'),
    ],
    'pairarrayidentity': [
        ('pair', PROGRAM_STARTING, ''),
        ('pair', PROGRAM_POOL, ''),
        ('pair', PROGRAM_GUARD, ''),
        ('pair', '    setDraft({ ...EMPTY, ...value })\n' + ON_VALUE,
         '    setDraft({\n'
         '      ...EMPTY,\n'
         "      program_id: defaultProgram || onlyOne?.program_id || '',\n"
         '      ...value,\n'
         '    })\n'
         '  }, [value, defaultProgram, onlyOne])\n'),
    ],
}

main(FILES, MUTANTS)
