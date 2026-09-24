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

## วิธีรัน

    python mutation/144-superseded-reload-by-filter.py save
    python mutation/144-superseded-reload-by-filter.py <mutant>
    python mutation/144-superseded-reload-by-filter.py restore
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
    'subjectsdepartmentnotfollowed': ('subjects', REF,
        '    onScreen.current = load\n  }, [page, report])\n'),
    # รายวิชาในหลักสูตร: ตัวกรองหลักสูตร
    'pairsprogramnotfollowed': ('pairs', REF,
        '    onScreen.current = load\n  }, [page, report])\n'),
    # Rubric: ตัวกรองหลักสูตร
    'rubricsprogramnotfollowed': ('rubrics', REF,
        '    onScreen.current = load\n  }, [page, report])\n'),
    # ข้อมูลการเปิดรายวิชา: ตัวกรองหลักสูตร
    'offeringsprogramnotfollowed': ('offerings', REF,
        '    onScreen.current = load\n  }, [page, year, semester, report])\n'),
    # ข้อมูลการเปิดรายวิชา: ตัวกรองปีการศึกษา
    'offeringsyearnotfollowed': ('offerings', REF,
        '    onScreen.current = load\n  }, [page, program, semester, report])\n'),
    # ข้อมูลการเปิดรายวิชา: ตัวกรองภาคการศึกษา
    'offeringssemesternotfollowed': ('offerings', REF,
        '    onScreen.current = load\n  }, [page, program, year, report])\n'),
    # ข้อมูลนักศึกษา: ตัวกรองหลักสูตร
    'studentsprogramnotfollowed': ('students', REF,
        '    onScreen.current = load\n  }, [page, report])\n'),
}

main(FILES, MUTANTS)
