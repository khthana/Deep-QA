# -*- coding: utf-8 -*-
"""#305 — หน้าประวัติการใช้งานกลับเป็นตารางของทุกบัญชี แบบที่ส่งมอบ

คำตอบของเจ้าของงานเมื่อ 22 พ.ย. 2569 (`docs/users-screen.md` ข้อ 5 และ 11) · ข้ออ้างอยู่ใน
`e2e/tests/305a-history-of-every-account.spec.js` และแถวของ #13 ที่อ่านผ่านตารางนี้ตั้งแต่ #305 อยู่ใน `13a` ·
ใบรับงานคือ `docs/acceptance/13-user-activity-history.md` §#305

**`13a` เป็น `serial`** — แถวแรกที่ตายหยุดแฟ้ม ฉะนั้นคำทำนายของ `13a` บอกแถวแรกที่มัตแตนต์ไปถึงเท่านั้น และแถวหลังจากนั้น
ไม่ถูกอ่าน (#67) · `305a` `272c` `294a` ไม่ใช่ `serial`

**สีของป้ายกิจกรรม การจัดวาง และขนาดตัวอักษรไม่มีมัตแตนต์** — เป็นรูปลักษณ์ จึงเป็นแถวเดินมือ (`CLAUDE.md` §Two test seams)

**ดัชนี `user_log_time_stamp_id_idx` ไม่มีมัตแตนต์** — มันเปลี่ยนเวลา ไม่เปลี่ยนคำตอบ ข้ออ้างของมันคือ
`db/test/user_log_newest_first.test.js` ที่ถาม `pg_get_indexdef` ตรง ๆ

## ตารางมัตแตนต์ — คำทำนาย เขียนก่อนรันตัวแรก (#255 · 24 พ.ย. 2569)

แต่ละตัวกวาดกับ `13a` `272c` `294a` `305a` ทั้งสี่แฟ้ม

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ทำนายว่ามันฆ่า |
|---|---|---|
| `s305scopegone` | เส้นทางใหม่ไม่จำกัดบรรทัดที่ขอบเขตของสิทธิ์ที่กำลังใช้ (`${OWN_SCOPE} = ANY($1)` เป็น `TRUE`) — กรองหลังอ่านก็ไม่มี | **1** — `13a` แถว 12 ที่ `total` toBe(0) ของการค้น `dept.admin.01@` · แถวก่อนหน้าผ่าน เพราะเป็นผู้ดูแลระบบซึ่งเอื้อมถึงทุกคนอยู่แล้ว |
| `s305order` | เก่าสุดก่อน (`ASC, ASC`) | **4** — `13a` แถว 1, 2, 4 ที่ `กิจกรรม` ของบรรทัด 0 (แล้วแฟ้มหยุด) · `294a` แถว 3 ที่ `ทำกับข้อมูล` ของบรรทัด 0 · `305a` แถว 3 ที่ `รหัสผู้ใช้งาน` ของบรรทัด 0 · `305a` แถว 4 ที่ `found[0].user_id` |
| `s305nottarget` | การค้นไม่อ่านรหัสของระเบียน (`l.target_id ILIKE` ออก) | **2** — `13a` แถว 1, 2, 4 ที่ `กิจกรรม` ของบรรทัด 0: ค้น `teach01` แล้วบรรทัดที่ผู้ดูแลเขียนถึง `teach01` หายไป · `305a` แถว 4 ที่ `found[0].user_id` |
| `s305rawsearch` | คำค้นไม่ผ่าน `searchOf` — `%` `_` เป็นอักขระตัวแทน | **1** — `272c` ที่ `total` toBe(0): `teacher_one` พบ `teacher.one@` |
| `s305noactor` | เส้นทางไม่ส่งชื่อของผู้ลงมือ (`ACTOR` เหลือ `u.title_th`) | **1** — `305a` แถว 3 ที่ `ผู้ใช้งาน` ของบรรทัด 0 · `13a` ไม่อ่านคอลัมน์นั้น |
| `s305nopagereset` | คำค้นใหม่ไม่พากลับหน้า 1 (`setPage(1)` ออกจาก `onSearch`) | **1** — `13a` แถว 6 ที่ `pagerLine` toContainText(`หน้า 1`) · แถวก่อนหน้าไม่เปลี่ยนหน้า |
| `s305menubackfull` | รายการ *ประวัติการใช้งาน* กลับมาในเมนูของ `FULL_ADMIN` | **1** — `305a` แถว 2 ของ `FULL_ADMIN` ที่ `rule 11: the menu entry is gone` |
| `s305menubackfaculty` | เหมือนกัน ของ `FACULTY_ADMIN` | **1** — `305a` แถว 2 ของ `FACULTY_ADMIN` |
| `s305menubackdept` | เหมือนกัน ของ `DEPT_ADMIN` | **1** — `305a` แถว 2 ของ `DEPT_ADMIN` |
| `s305nobutton` | ปุ่ม *แสดงประวัติการใช้งาน* ไม่ไปไหน | **1** — `305a` แถว 1 ที่ `แสดงประวัติการใช้งาน opens the history` |
| `s305backnowhere` | ปุ่ม *แสดงรายชื่อผู้ใช้งาน* ไม่ไปไหน | **1** — `305a` แถว 1 ที่ `แสดงรายชื่อผู้ใช้งาน goes back to the users page` |

## มัตแตนต์ของใบอื่นที่แถวของมันอ่านผ่านตารางนี้ตั้งแต่ #305 — คำทำนาย (24 พ.ย. 2569, ก่อนรัน)

ที่มาของคำทำนาย: แถวที่ฆ่ามันเปลี่ยนทางเข้า (ตัวเลือกบัญชีหายไป และคำค้นไปที่เส้นทางใหม่) ฉะนั้นสิ่งที่การกวาดถามคือ
ทางเข้าใหม่ยังถึงข้ออ้างเดิมไหม (#198) · กวาดกับแฟ้มเดียวกันสี่แฟ้ม

| ชื่อ | คำทำนาย |
|---|---|
| `13:N1` | **รอด** — มันกลับลำดับของ `GET /users/:userId/history` ซึ่งไม่มีจอไหนอ่านแล้ว · ลำดับของเส้นทางใหม่เป็นของ `s305order` · ถ้ารอดตามทำนาย N1 ไปอยู่ใน `SUPERSEDED` พร้อมเหตุผล |
| `13:N2` | `13a` แถว 1, 2, 4 ที่ `รหัสผู้ใช้งาน` ของบรรทัด 0 (`teach01` แทน `admin01`) |
| `13:N3` | `13a` แถว 1, 2, 4 ที่ `ทำกับข้อมูล` ของบรรทัด 0 (`teach01` เปล่า) · `294a` แถว 3 |
| `13:N4` | `13a` แถว 1, 2, 4 ที่บรรทัด `LOGIN` ของ `admin01` คอลัมน์ 5 toHaveText(`—`) |
| `13:N5` | `13a` แถว 8 และ 9 ที่ `เวลา` ของบรรทัด 0 |
| `13:N7` | `13a` แถว 7 ที่ `กิจกรรม` ของบรรทัด 0 (`ออกจากระบบ`) |
| `13:N8` | **ไม่ถึงแถว 12 ของ `13a` แล้ว** — มันแก้ `GET /users` ซึ่งตารางนี้ไม่อ่าน (แถว 12 อ่านเส้นทางใหม่ ซึ่งเป็นของ `s305scopegone`) · รอดในสี่แฟ้มนี้ · ตัวที่ยังฆ่ามันคือ `11a` แถว 8 (*sees only its own department*) ซึ่งกวาดแยกกับ `11a` |
| `272:s272chistoryinput` | `272c` ที่ `toBeVisible` ของ `searchbox` — เหมือนเดิม ช่องที่มันใส่คืนเป็น `<input>` ที่ไม่มีบทบาท `searchbox` · `13a` ตายด้วยที่การค้นครั้งแรก (แถว 1, 2, 4) ที่การจัดฉาก (`fill` บน `searchbox`) ไม่ใช่ข้ออ้าง (#266) |
| `272-the-search-box-on-three-more-screens:s272busersescape` | **ไม่ถึง `272c` แล้ว** — มันแก้ `searchOf` ของ `GET /users` และ `272c` อ่านเส้นทางใหม่ · ตัวที่ถือ `_` ของเส้นทางใหม่คือ `s305rawsearch` · ยังฆ่าแถวของ `272b` ตามใบของมัน |
| `272-the-search-box:s272searchignored` | `272c` ที่ `total` (เส้นทางใหม่ใช้ `searchOf` ตัวเดียวกัน) · `13a` แถว 1, 2, 4 |
| `294:o294historypanelcode` | `294a` แถว 3 ที่ `ทำกับข้อมูล` ของบรรทัด 0 |
| `294:o294historyunnamed` | `294a` แถว 3 ที่ `ทำกับข้อมูล` ของบรรทัด 0 · `305a` แถว 3 ที่ `ทำกับข้อมูล` |
| `294:o294historykindblind` | รอดทั้งสี่แฟ้ม ตามใบของมัน — ข้ออ้างของมันอยู่ที่ HTTP seam |
"""
from harness import main

FILES = {
    'route': 'backend/routes/history.js',
    'page': 'frontend/src/pages/UserHistory.js',
    'users': 'frontend/src/pages/Users.js',
    'full': 'frontend/src/components/SidebarItem/FullAddmin.js',
    'faculty': 'frontend/src/components/SidebarItem/FacultyAdmin.js',
    'dept': 'frontend/src/components/SidebarItem/DeprtAdmin.js',
}

MUTANTS = {
    's305scopegone': ('route',
        '         WHERE ($1::text[] IS NULL OR ${OWN_SCOPE} = ANY($1))\n           AND COALESCE(${SENIORITY}, 99) >= $2\n           AND ($3::text IS NULL\n',
        '         WHERE ($1::text[] IS NULL OR TRUE)\n           AND COALESCE(${SENIORITY}, 99) >= $2\n           AND ($3::text IS NULL\n'),
    's305order': ('route', 'ORDER BY l.time_stamp DESC, l.id DESC LIMIT $4 OFFSET $5',
                  'ORDER BY l.time_stamp ASC, l.id ASC LIMIT $4 OFFSET $5'),
    's305nottarget': ('route', "                OR l.target_id ILIKE '%' || $3 || '%'\n", ''),
    # The term as typed, with `%` and `_` left to ILIKE - before #272.
    's305rawsearch': ('route', '      const search = searchOf(req);\n',
                      "      const search = (req.query.q || '').trim() || null;\n"),
    's305noactor': ('route',
        "const ACTOR = 'u.title_th, u.first_name_th, u.last_name_th, u.first_name_en, u.last_name_en';",
        "const ACTOR = 'u.title_th';"),
    's305nopagereset': ('page', '        onSearch={term => {\n          setPage(1)\n          setQ(term)\n',
                        '        onSearch={term => {\n          setQ(term)\n'),
    # The entry as it stood before #305, re-added after the users entry.
    's305menubackfull': ('full', '    icon: <HiOutlineUserGroup />,\n  },\n',
        "    icon: <HiOutlineUserGroup />,\n  },\n  {\n    key: 'ประวัติการใช้งาน',\n"
        "    label: 'ประวัติการใช้งาน',\n    path: '/main/users/user-history',\n"
        "    icon: <HiOutlineUserGroup />,\n  },\n"),
    's305menubackfaculty': ('faculty', '    icon: <HiOutlineUsers />,\n  },\n',
        "    icon: <HiOutlineUsers />,\n  },\n  {\n    key: 'ประวัติการใช้งาน',\n"
        "    label: 'ประวัติการใช้งาน',\n    path: '/main/users/user-history',\n"
        "    icon: <HiOutlineUsers />,\n  },\n"),
    's305menubackdept': ('dept', '    icon: <HiOutlineUsers />,\n  },\n',
        "    icon: <HiOutlineUsers />,\n  },\n  {\n    key: 'ประวัติการใช้งาน',\n"
        "    label: 'ประวัติการใช้งาน',\n    path: '/main/users/user-history',\n"
        "    icon: <HiOutlineUsers />,\n  },\n"),
    's305nobutton': ('users', "onClick={() => navigate('/main/users/user-history')}",
                     'onClick={() => {}}'),
    's305backnowhere': ('page', "onClick={() => navigate('/main/users')}", 'onClick={() => {}}'),
}

main(FILES, MUTANTS)
