"""#144 - รายการที่ handler โหลดใหม่ไม่ถูกวาดทับตัวกรองที่ขยับไปแล้ว

#140 ให้ทุก handler ถาม `onScreen.current === load` และ `load` ถูกสร้างใหม่เมื่ออะไรก็ได้ที่รายการขอเปลี่ยน -
หน้า และบนหกจอนี้ตัวกรองด้วย การเทียบครั้งเดียวจึงตอบแทนตัวแบ่งหน้าและตัวกรองทุกตัว มัตแตนต์ของ #140
ซึ่งเปลี่ยนธงที่จุดเรียกเป็น `load(() => true)` ทำลาย guard ของทุกตัวควบคุมพร้อมกัน และแยกมันออกจากกันไม่ได้

มัตแตนต์ที่นี่ไม่แตะจุดเรียก แต่แตะ effect ที่เขียน `onScreen` โดยตัดตัวควบคุม**หนึ่งตัว**ออกจาก dependency
ref จึงหยุดตาม `load` เฉพาะเมื่อตัวควบคุมนั้นขยับ และยังตามเมื่อตัวอื่นขยับ แถวของแต่ละตัวอยู่ใน
`e2e/tests/144a-superseded-reload-by-filter.spec.js` แถวละตัวควบคุม

## ผลการกวาด

กวาดเมื่อ 18 ก.ย. 2569 **ทีละจอ** แต่ละกลุ่มรันแถวของจอนั้นใน `144a` และ `140a` (ตัดของจออื่นด้วย
`--grep-invert` บนชื่อไฟล์ในวงเล็บ) รวมกับ spec เดิมของจอ มี baseline สะอาดคั่นหน้าทุกกลุ่ม และตรวจ checksum
ของหกไฟล์หลัง `restore` ทุกตัว ไม่มีครั้งไหนที่ checksum ไม่กลับ ทุกตัวล้มแถวของตัวเองที่ `toEqual`
และไม่ล้มแถวตัวแบ่งหน้าหรือแถวตัวกรองอื่นเลย 50 นาที รวมการกวาดซ้ำของ #140 ข้างล่าง

| กลุ่ม | spec เดิมที่รันด้วย | baseline | มัตแตนต์ | ล้ม | ผ่าน |
|---|---|---|---|---|---|
| `users` | `11a-users` `11b` `11c` `84a` | 21 ผ่าน | `usersqnotfollowed` | 2 (แถวตัวเอง · `11c` แถว 3) | 19 |
| | | | `usersrolenotfollowed` | 1 | 20 |
| | | | `usersstatusnotfollowed` | 1 | 20 |
| `subjects` | `16a` | 13 ผ่าน | `subjectsdepartmentnotfollowed` | 1 | 12 |
| `pairs` | `18a` `18b` `18c` | 23 ผ่าน | `pairsprogramnotfollowed` | 2 (แถวตัวเอง · `18c` แถว 8) ไม่ได้รัน 1 | 20 |
| `rubrics` | `21a-rubrics` | 15 ผ่าน | `rubricsprogramnotfollowed` | 1 | 14 |
| `offerings` | `23a` `23b` | 20 ผ่าน | `offeringsprogramnotfollowed` | 1 | 19 |
| | | | `offeringsyearnotfollowed` | 1 | 19 |
| | | | `offeringssemesternotfollowed` | 1 | 19 |
| `students` | `17a` `17b` `17c` | 17 ผ่าน | `studentsprogramnotfollowed` | 2 (แถวตัวเอง · `17c` แถว 10) ไม่ได้รัน 1 | 14 |

**ชื่อ spec ในคอลัมน์ที่สองเขียนเต็มเมื่อ 24 ก.ย. 2569 (#158)** `11a` กับ `21a` เคยเขียนสั้น ซึ่ง
Playwright จับ `111a` (5 แถว) กับ `121a` (1 แถว) ด้วย **baseline ไม่ได้รวมสองไฟล์นั้น**: users
21 = 15 แถวของสี่ spec บวก 3 ของ `144a` บวก 3 ของ `140a` และ rubrics 15 = 11 + 1 + 3
ถ้าไฟล์ที่ชนได้รันด้วยจะเป็น 26 กับ 16 ตรวจเมื่อ 24 ก.ย. 2569 ด้วยการบวกจำนวนแถว ไม่ได้กวาดใหม่

**แถวเดิมสามแถวที่ตายด้วยตายจริง ไม่ได้รั่ว** แต่ละแถวย้ายตัวกรองก่อนกดจุดเรียก (`11c` ค้นหาบัญชี `18c` กรองไปที่ `0503`
`17c` กรองแล้วกลับ ซึ่งสร้าง `load` ตัวใหม่ ไม่ใช่ตัวเดิม) ref ที่ไม่ตามตัวกรองจึงทิ้งทุกการโหลดใหม่หลังจากนั้น
ไม่ใช่แค่ตัวที่แข่งกัน และ `loading` ที่มันตั้งไว้ไม่มีใครปิด `11c` ตายที่การรอปุ่ม *เปิดใช้งาน* ที่ไม่ถูกวาด `18c` ที่
`toHaveText('วิชาเลือก')` ด้วย *element(s) not found* เพราะตารางค้างที่ *กำลังโหลด…* `17c` ที่ `expect.poll`
ของจำนวนทั้งหมด (173 แทน 175) `18c` และ `17c` เป็น `serial` แถวหลังแถวที่ตายจึงไม่ได้รันในการกวาด
แต่ละแถววัดเดี่ยวแล้ว: แถวสุดท้ายของ `18c` ผ่านภายใต้ `pairsprogramnotfollowed` ส่วนแถว 11 ของ `17c` วัดแยกไม่ได้ —
บนต้นไม้สะอาดมันก็ได้ 201 แทน 409 เพราะนักศึกษาที่มันถามคือคนที่แถว 10 เพิ่ม

**การกวาดซ้ำของ #140** กับชุดเดียวกัน: ตัวที่แถวตัวกรองกดจุดของมันด้วยล้มแถวตัวกรองเหล่านั้นด้วย -
`userssavestalewins` 4 ล้ม 17 ผ่าน · `offeringsrefusalstalewins` 4 ล้ม 16 ผ่าน · `subjectsrefusalstalewins` 2 ล้ม 11 ผ่าน ·
`pairsrefusalstalewins` 2 ล้ม 21 ผ่าน · `rubricsrefusalstalewins` 2 ล้ม 13 ผ่าน · `studentssavestalewins` 2 ล้ม 15 ผ่าน -
และอีกสิบห้าตัวของหกจอนี้ยังล้มแถวเดียว ตัวเลขนั้นคือสิ่งที่ตั๋วนี้เปิดมาเพื่อวัด: ที่จุดเรียกแยกไม่ได้ ที่ effect ของ ref แยกได้

## การเล็งใหม่ของ #279 — คำทำนายเขียนก่อนกวาด (17 พ.ย. 2569)

จอเปิดรายวิชาเหลือตัวเลือกภาคการศึกษาตัวเดียวแบบ `ภาค/ปี` ไม่มี *ทุกปี* *ทุกภาค* *ทุกหลักสูตร* และ `load`
รอ `poolRead` กับ `termsRead` ก่อนอ่าน มัตแตนต์สามตัวของจอนี้จึงคง `poolRead, termsRead` ไว้ในรายการ
ทุกตัว ตัดออกแค่ตัวควบคุมที่ชื่อบอก แถวปีการศึกษาของ `144a` ย้ายจากภาคของ seed ไปภาคเดียวกันของ
`MOVED_YEAR` และแถวภาคการศึกษาย้ายไปอีกภาคของปีเดียวกัน แต่ละการย้ายเปลี่ยนแค่ค่าเดียว

| ชื่อ | คำทำนาย | เหตุผล |
|---|---|---|
| `offeringsyearnotfollowed` | **ล้ม** แถวปีการศึกษาของ `144a` ที่ `toEqual` · แถวอื่นของจอไม่ล้ม | การย้ายเปลี่ยน `year` อย่างเดียว ref จึงค้างที่ `load` ของภาคเดิม |
| `offeringssemesternotfollowed` | **ล้ม** แถวภาคการศึกษาของ `144a` ที่ `toEqual` · แถวอื่นของจอไม่ล้ม | การย้ายเปลี่ยน `semester` อย่างเดียว |
| `offeringsprogramnotfollowed` | **รอด** — เทียบเท่า | การย้ายหลักสูตรผ่าน `termsRead` เป็นเท็จ และ `year` เป็น `''` ระหว่างรอภาคของหลักสูตรใหม่ ทั้งสองยังอยู่ในรายการ ref จึงตาม `load` ตัวใหม่อยู่ดี ถ้ารอดจริงจะถอนเป็นบันทึก (`SUPERSEDED`) และแถวหลักสูตรของ `144a` เป็นตาข่าย (#47, #198) |

**ผลการกวาด 17 พ.ย. 2569** ชุดเดียวกันทุกตัว: สามแถวของจอนี้ใน `144a` กับ `23a` และ `23b` รวม 15 แถว
baseline สะอาดผ่านก่อนกวาด และ `git diff --stat` ของ `Offerings.js` กลับเท่าเดิมหลัง `restore` ทุกตัว
ทั้งสามตรงคำทำนาย

| ชื่อ | ล้ม | ผ่าน | ตายที่ |
|---|---|---|---|
| `offeringsyearnotfollowed` | 1 — แถวปีการศึกษาของ `144a` | 14 | `toEqual` ของการอ่านจอ ไม่ใช่การจัดฉาก |
| `offeringssemesternotfollowed` | 1 — แถวภาคการศึกษาของ `144a` | 14 | `toEqual` เช่นกัน |
| `offeringsprogramnotfollowed` | 0 | 15 | รอด — ถอนเป็นบันทึกข้างล่าง |

แถวหลักสูตรของ `144a` จึงเป็นตาข่ายตั้งแต่วันนี้: ข้อยืนยันยังจริงและยังรัน แต่ไม่มีมัตแตนต์ที่ effect ของ ref
แยกมันออกจากแถวภาคได้ สิ่งที่จะทำให้แยกได้อีกคือการที่หลักสูตรขยับได้โดยภาคที่อ่านแล้วไม่หายไประหว่างทาง
เช่นถ้าภาคของทุกหลักสูตรถูกอ่านไว้พร้อมกัน

## ถอน `subjectsdepartmentnotfollowed` (19 พ.ย. 2569, #284)

เจ้าของงานเอาตัวกรองภาควิชาออกจากข้อมูลรายวิชาพร้อมคอลัมน์ ตัวควบคุมที่มัตแตนต์นี้พูดถึงจึงไม่มีอยู่แล้ว มันถูกลบออกจาก
`MUTANTS` (ไม่ใช่ `SUPERSEDED` ด้วยเหตุผลเดียวกับ `offeringsprogramnotfollowed`: สมอของมันคือ `REF` ซึ่งยังเป็นโค้ด)
และแถวภาควิชาของ `144a` ถูกเอาออกพร้อมกัน แถวในตารางข้างบนเป็นบันทึกของวันที่กวาด (#54)

## วิธีรัน

    python mutation/144-superseded-reload-by-filter.py save
    python mutation/144-superseded-reload-by-filter.py <mutant>
    python mutation/144-superseded-reload-by-filter.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `usersqnotfollowed` | ข้อมูลผู้ใช้งาน: ช่องค้นหา — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, filters.role, filters.status])` | **ล้ม** 2 — แถวช่องค้นหา และ `11c` แถว 3 · **ผ่าน** 19 · แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list บันทึก reloads does not land on the search the box has moved to* · ที่มา `docs/acceptance/11-user-accounts.md:1172` `docs/acceptance/11-user-accounts.md:1154` |
| `usersrolenotfollowed` | ข้อมูลผู้ใช้งาน: ตัวกรองบทบาท — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, filters.q, filters.status])` | **ล้ม** 1 — แถวตัวกรองบทบาท · **ผ่าน** 20 · แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list บันทึก reloads does not land on the บทบาท filter that has moved* · ที่มา `docs/acceptance/11-user-accounts.md:1173` `docs/acceptance/11-user-accounts.md:1155` |
| `usersstatusnotfollowed` | ข้อมูลผู้ใช้งาน: ตัวกรองสถานะ — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, filters.q, filters.role])` | **ล้ม** 1 — แถวตัวกรองสถานะ · **ผ่าน** 20 · แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list บันทึก reloads does not land on the สถานะ filter that has moved* · ที่มา `docs/acceptance/11-user-accounts.md:1174` `docs/acceptance/11-user-accounts.md:1156` |
| `subjectsdepartmentnotfollowed` | ข้อมูลรายวิชา: ตัวกรองภาควิชา — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, report])` | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list a refused แก้ไข reloads does not land on the ภาควิชา filter that has moved* · ที่มา `docs/acceptance/16-subjects.md:316` |
| `pairsprogramnotfollowed` | รายวิชาในหลักสูตร: ตัวกรองหลักสูตร — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, report])` | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list a refused แก้ไข reloads does not land on the หลักสูตร filter that has moved* · ที่มา `docs/acceptance/18-program-subjects.md:289` |
| `rubricsprogramnotfollowed` | Rubric: ตัวกรองหลักสูตร — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, report, generation, poolRead])` (เล็งใหม่ 19 พ.ย. 2569 #278 — **ล้ม** 3 ที่ข้ออ้าง: แถวของตัวเองใน `144a` · `140a` Rubric บันทึก และ ลบ — กับ 18 spec ที่เปิดจอ) | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list a refused แก้ไข reloads does not land on the หลักสูตร filter that has moved* · ที่มา `docs/acceptance/21-rubrics.md:280` (เดิมเขียน `:270` ซึ่งเลื่อนก่อน 19 พ.ย. 2569) |
| `offeringsprogramnotfollowed` | ข้อมูลการเปิดรายวิชา: ตัวกรองหลักสูตร — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, year, semester, report, poolRead, termsRead])` (เล็งใหม่ 17 พ.ย. 2569) | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list a refused ตอนเรียนและผู้สอน reloads does not land on the หลักสูตร filter that has moved* · ที่มา `docs/acceptance/23-offerings.md:490` |
| `offeringsyearnotfollowed` | ข้อมูลการเปิดรายวิชา: ตัวกรองปีการศึกษา — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, program, semester, report, poolRead, termsRead])` (เล็งใหม่ 17 พ.ย. 2569) | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list a refused ตอนเรียนและผู้สอน reloads does not land on the ปีการศึกษา filter that has moved* · ที่มา `docs/acceptance/23-offerings.md:491` |
| `offeringssemesternotfollowed` | ข้อมูลการเปิดรายวิชา: ตัวกรองภาคการศึกษา — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, program, year, report, poolRead, termsRead])` (เล็งใหม่ 17 พ.ย. 2569) | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list a refused ตอนเรียนและผู้สอน reloads does not land on the ภาคการศึกษา filter that has moved* · ที่มา `docs/acceptance/23-offerings.md:492` |
| `studentsprogramnotfollowed` | ข้อมูลนักศึกษา: ตัวกรองหลักสูตร — บล็อกที่ถูกแทน ท้ายของมัน `REF` → `}, [page, report])` | แถวที่ใบรับงานบอกว่ามันค้ำไว้ *the list บันทึก reloads does not land on the หลักสูตร filter that has moved* · ที่มา `docs/acceptance/17-students.md:310` |
"""
from harness import main

FILES = {
    'users': 'frontend/src/pages/Users.js',
    'subjects': 'frontend/src/pages/Subjects.js',
    'pairs': 'frontend/src/pages/ProgramSubjects.js',
    'rubrics': 'frontend/src/pages/Rubrics.js',
    'offerings': 'frontend/src/pages/Offerings.js',
    'students': 'frontend/src/pages/Students.js',
}

# The effect that keeps `onScreen` on the newest `load`. Every mutant here
# narrows its dependencies to leave one filter out, so the ref stops following
# `load` when that filter - and only that filter - moves.
REF = '    onScreen.current = load\n  }, [load])\n'

MUTANTS = {
    # ข้อมูลผู้ใช้งาน: ช่องค้นหา
    'usersqnotfollowed': ('users', REF,
        '    onScreen.current = load\n  }, [page, filters.role, filters.status])\n'),
    # ข้อมูลผู้ใช้งาน: ตัวกรองบทบาท
    'usersrolenotfollowed': ('users', REF,
        '    onScreen.current = load\n  }, [page, filters.q, filters.status])\n'),
    # ข้อมูลผู้ใช้งาน: ตัวกรองสถานะ
    'usersstatusnotfollowed': ('users', REF,
        '    onScreen.current = load\n  }, [page, filters.q, filters.role])\n'),
    # ข้อมูลรายวิชา: ตัวกรองภาควิชา
    #
    # `subjectsdepartmentnotfollowed` stood here until 19 พ.ย. 2569 (#284), and
    # is withdrawn by deletion rather than to `SUPERSEDED` for
    # `offeringsprogramnotfollowed`'s reason: its anchor is `REF`, which is
    # still the code, so a record would still apply - and would now leave out
    # `q` rather than the department. The owner took the department filter off
    # ข้อมูลรายวิชา with the column, so the control it was about is gone, and
    # `144a`'s ภาควิชา row went with it. Sheet 16 §#284 is the record.
    # รายวิชาในหลักสูตร: ตัวกรองหลักสูตร
    # Re-aimed 17 พ.ย. 2569, when `load` gained `poolRead` (the list became
    # one curriculum's): left out of these dependencies too, the ref stayed on
    # the first `load`, which returns before the curricula land, so every reload
    # through it did nothing - a mutant that stops the reload rather than one
    # that misses the filter (#203). `program` alone is left out, as the name says.
    'pairsprogramnotfollowed': ('pairs', REF,
        '    onScreen.current = load\n  }, [page, report, poolRead])\n'),
    # Rubric: ตัวกรองหลักสูตร
    # Re-aimed 19 พ.ย. 2569 (#278), for the reason `pairs` was above: `load`
    # in `Rubrics.js` depends on `generation` (#198) and on `poolRead` (#276),
    # and left out of these dependencies the ref stayed on the first `load`,
    # which returns before the curricula land. Run as it stood, it killed four
    # rows at the arrangement (`144a` and the three Rubric rows of `140a` at the
    # wait for the held request) and `21a`'s add-then-edit row at a list that never reloaded
    # after its save - a mutant that stops the reload, not one that misses the
    # filter (#203). Both stay, in the form `load` reads them; only `program`
    # is left out, as the name says. Re-swept against the 18 specs that open
    # the screen: `144a`'s row dies at its own `toEqual`, and the บันทึก and
    # ลบ rows of `140a` at theirs, the filter they move being หลักสูตร.
    # Sheet 21 §#278 is the record.
    'rubricsprogramnotfollowed': ('rubrics', REF,
        '    onScreen.current = load\n  }, [page, report, generation, poolRead])\n'),
    # ข้อมูลการเปิดรายวิชา: ตัวกรองหลักสูตร
    #
    # `offeringsprogramnotfollowed` stood here until 17 พ.ย. 2569 (#279), and
    # is withdrawn by deletion rather than to `SUPERSEDED`: its anchor is `REF`,
    # which every mutant of this file shares and which is still the code, so a
    # record would still apply. Re-aimed to keep `poolRead, termsRead`, it was
    # swept and survived as predicted - a curriculum move always passes through
    # `termsRead` false and `year` empty while the new curriculum's terms are
    # read, and both stay in the list, so the ref follows `load` anyway. The
    # docblock's #279 table is the record (#54); `144a`'s หลักสูตร row is a net
    # (#47, #198).
    #
    # The two below were re-aimed the same day, when `load` gained `poolRead`
    # and `termsRead`: both stay in the list, as `pairs` keeps `poolRead`, or
    # the ref stays on a `load` that returns before the curricula and the terms
    # land and every reload through it does nothing - a mutant that stops the
    # reload rather than one that misses the filter (#203). Only the control the
    # name says is left out.
    # ข้อมูลการเปิดรายวิชา: ตัวกรองปีการศึกษา
    'offeringsyearnotfollowed': ('offerings', REF,
        '    onScreen.current = load\n  }, [page, program, semester, report, poolRead, termsRead])\n'),
    # ข้อมูลการเปิดรายวิชา: ตัวกรองภาคการศึกษา
    'offeringssemesternotfollowed': ('offerings', REF,
        '    onScreen.current = load\n  }, [page, program, year, report, poolRead, termsRead])\n'),
    # ข้อมูลนักศึกษา: ตัวกรองหลักสูตร
    'studentsprogramnotfollowed': ('students', REF,
        '    onScreen.current = load\n  }, [page, report])\n'),
}

main(FILES, MUTANTS)
