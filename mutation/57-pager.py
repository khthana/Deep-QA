# -*- coding: utf-8 -*-
"""#57 — the shared paging control. Proves `e2e/tests/57a-pager.spec.js`.

Two layers, deliberately kept apart. `Pager.js` is what every screen draws, so
a mutant there kills rows on several screens at once and the one that matters
is the first to die in the file — run with `-g` and read which. The screen
files are what each screen *wires into* it, and that is where #57's whole risk
lives: one component drawn six times still has six call sites to get wrong.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `nofloor` | **ไฟล์ที่ทำพัง** `Pager.js` · **ทำให้เป็นอะไร** ตัดพื้น `Math.max(1, …)` ของจำนวนหน้าออก | **ข้อที่ตาย** row 9 (ตารางว่าง) · **บรรทัด** 141 · **ผ่านก่อนตาย** 3 · ที่มา `docs/acceptance/57-pager.md:113` `docs/acceptance/57-pager.md:1941` |
| `prevalive` | **ไฟล์ที่ทำพัง** `Pager.js` · **ทำให้เป็นอะไร** *ก่อนหน้า* กดได้เสมอ | **ข้อที่ตาย** row 1 (หน้าแรก) · **บรรทัด** 91 · **ผ่านก่อนตาย** 0 · ที่มา `docs/acceptance/57-pager.md:114` |
| `nextalive` | **ไฟล์ที่ทำพัง** `Pager.js` · **ทำให้เป็นอะไร** *ถัดไป* กดได้เสมอ | **ข้อที่ตาย** row 1 (หน้าสุดท้าย) · **บรรทัด** 131 · **ผ่านก่อนตาย** 2 · ที่มา `docs/acceptance/57-pager.md:115` |
| `backforward` | **ไฟล์ที่ทำพัง** `Pager.js` · **ทำให้เป็นอะไร** *ก่อนหน้า* เดินไปข้างหน้าแทนที่จะถอย | **ข้อที่ตาย** row 1 (ถัดไป/ก่อนหน้า) · **บรรทัด** 114 · **ผ่านก่อนตาย** 1 · ที่มา `docs/acceptance/57-pager.md:116` |
| `perpage` | **ไฟล์ที่ทำพัง** `Users.js` · **ทำให้เป็นอะไร** `PAGE_SIZE` 10 → 5 | **ข้อที่ตาย** row 1 (หน้าแรก) · **บรรทัด** 84 · **ผ่านก่อนตาย** 0 · ที่มา `docs/acceptance/57-pager.md:117` |
| `deptperpage` | **ไฟล์ที่ทำพัง** `Departments.js` · **ทำให้เป็นอะไร** `PAGE_SIZE` 10 → 5 | **ข้อที่ตาย** row 3 (สิบแถวต่อหน้า) · **บรรทัด** 173 · **ผ่านก่อนตาย** 4 · ที่มา `docs/acceptance/57-pager.md:118` |
| `progperpage` | **ไฟล์ที่ทำพัง** `Programs.js` · **ทำให้เป็นอะไร** `PAGE_SIZE` 10 → 5 | **ข้อที่ตาย** row 4 (สิบแถวต่อหน้า) · **บรรทัด** 237 · **ผ่านก่อนตาย** 6 · ที่มา `docs/acceptance/57-pager.md:119` |
| `subjperpage` | **ไฟล์ที่ทำพัง** `Subjects.js` · **ทำให้เป็นอะไร** `PAGE_SIZE` 10 → 5 | **ข้อที่ตาย** row 5 · **บรรทัด** 298 · **ผ่านก่อนตาย** 8 · ที่มา `docs/acceptance/57-pager.md:120` |
| `userpage` | **ไฟล์ที่ทำพัง** `Users.js` · **ทำให้เป็นอะไร** ขอหน้าหนึ่งเสมอ ไม่ว่ายืนอยู่หน้าไหน | **ข้อที่ตาย** row 1 (ถัดไป/ก่อนหน้า) · **บรรทัด** 107 · **ผ่านก่อนตาย** 1 · ที่มา `docs/acceptance/57-pager.md:121` |
| `deptpage` | **ไฟล์ที่ทำพัง** `Departments.js` · **ทำให้เป็นอะไร** ขอหน้าหนึ่งเสมอ | **ข้อที่ตาย** row 3 (สิบแถวต่อหน้า) · **บรรทัด** 178 · **ผ่านก่อนตาย** 4 · ที่มา `docs/acceptance/57-pager.md:122` |
| `progpage` | **ไฟล์ที่ทำพัง** `Programs.js` · **ทำให้เป็นอะไร** ขอหน้าหนึ่งเสมอ | **ข้อที่ตาย** row 4 (สิบแถวต่อหน้า) · **บรรทัด** 242 · **ผ่านก่อนตาย** 6 · ที่มา `docs/acceptance/57-pager.md:123` |
| `subjpage` | **ไฟล์ที่ทำพัง** `Subjects.js` · **ทำให้เป็นอะไร** ขอหน้าหนึ่งเสมอ | **ข้อที่ตาย** row 5 · **บรรทัด** 304 · **ผ่านก่อนตาย** 8 · ที่มา `docs/acceptance/57-pager.md:124` |
| `deptstay` | **ไฟล์ที่ทำพัง** `Departments.js` · **ทำให้เป็นอะไร** ลบแถวสุดท้ายแล้วไม่ถอยกลับหนึ่งหน้า | **ข้อที่ตาย** row 3 (ลบแถวสุดท้าย) · **บรรทัด** 202 · **ผ่านก่อนตาย** 5 · แถวที่ใบรับงานบอกว่ามันค้ำไว้ *a removal nobody moved away from…* · ที่มา `docs/acceptance/57-pager.md:125` `docs/acceptance/14-departments.md:2158` |
| `progstay` | **ไฟล์ที่ทำพัง** `Programs.js` · **ทำให้เป็นอะไร** ลบแถวสุดท้ายแล้วไม่ถอยกลับหนึ่งหน้า | **ข้อที่ตาย** row 4 (ลบแถวสุดท้าย) · **บรรทัด** 264 · **ผ่านก่อนตาย** 7 · ที่มา `docs/acceptance/57-pager.md:126` `docs/acceptance/14-departments.md:2159` `docs/acceptance/15-programs.md:115` |
"""

from harness import main

FILES = {
    "pager": "frontend/src/components/Pager.js",
    "users": "frontend/src/pages/Users.js",
    "departments": "frontend/src/pages/Departments.js",
    "programs": "frontend/src/pages/Programs.js",
    "subjects": "frontend/src/pages/Subjects.js",
}

MUTANTS = {
    # The floor of one removed, so an empty list reads "หน้า 1 จาก 0" — a page
    # count that says the page the reader is standing on does not exist.
    "nofloor": ("pager",
                "const pages = Math.max(1, Math.ceil(total / perPage))",
                "const pages = Math.ceil(total / perPage)"),

    # ก่อนหน้า pressable on the first page. Re-aimed on 15 October 2569 when
    # #199 put `busy` in front of the end rule: the mistake these two are about
    # is the **end** rule speaking never, so each drops its own half and leaves
    # `busy` standing. Substituting `false` here would be a different mutant —
    # one with no rule at all, which 199a's rows would kill as well (#203).
    "prevalive": ("pager",
                  "          disabled={busy || page <= 1}",
                  "          disabled={busy}"),

    # ถัดไป pressable on the last page.
    "nextalive": ("pager",
                  "          disabled={busy || page >= pages}",
                  "          disabled={busy}"),

    # ก่อนหน้า walks forward. Chosen over "does nothing" on purpose: a button
    # wired to nothing is caught by a timeout, which is a weak death and reads
    # the same as a slow server.
    "backforward": ("pager",
                    "onClick={() => onPage(Math.max(1, page - 1))}",
                    "onClick={() => onPage(Math.max(1, page + 1))}"),

    # Five to a page instead of ten. One per screen, because "สิบแถวต่อหน้า" is
    # a claim about that screen's own constant - `Pager` is told how many a page
    # holds, it does not decide it. Section 1 of the checklist's open items is
    # about exactly this: four copies of the number ten.
    "perpage": ("users",
                "const PAGE_SIZE = 10",
                "const PAGE_SIZE = 5"),
    "deptperpage": ("departments",
                    "const PAGE_SIZE = 10",
                    "const PAGE_SIZE = 5"),
    "progperpage": ("programs",
                    "const PAGE_SIZE = 10",
                    "const PAGE_SIZE = 5"),
    "subjperpage": ("subjects",
                    "const PAGE_SIZE = 10",
                    "const PAGE_SIZE = 5"),

    # Each screen asking for page one whatever page it is standing on. The
    # buttons still work, the line still counts up — every page just holds the
    # same rows. This is the mutant the "หน้าถัดไปคือคนละชุด" assertions are
    # ordered for: the label reads what the server confirmed, so it dies too,
    # and it must not die first.
    "userpage": ("users",
                 "listUsers({ ...filters, page, per_page: PAGE_SIZE })",
                 "listUsers({ ...filters, page: 1, per_page: PAGE_SIZE })"),
    "deptpage": ("departments",
                 "listDepartments({ page, per_page: PAGE_SIZE, q })",
                 "listDepartments({ page: 1, per_page: PAGE_SIZE, q })"),
    "progpage": ("programs",
                 "listPrograms({ page, per_page: PAGE_SIZE, q })",
                 "listPrograms({ page: 1, per_page: PAGE_SIZE, q })"),
    "subjpage": ("subjects",
                 "listSubjects({ page, per_page: PAGE_SIZE, department_id: department, q })",
                 "listSubjects({ page: 1, per_page: PAGE_SIZE, department_id: department, q })"),

    # The last row of the last page deleted and the screen left standing on the
    # page that is now empty — the table reading "there are none" of a list that
    # has eleven. Two copies of the same three-line rule, which is what #57 was
    # about; each one gets its own mutant.
    "deptstay": ("departments",
        "        if (answer.page > lastPage) {\n",
        "        if (answer.page > lastPage + 1) {\n"),
    "progstay": ("programs",
        "        if (answer.page > lastPage) {\n",
        "        if (answer.page > lastPage + 1) {\n"),
}

main(FILES, MUTANTS)
