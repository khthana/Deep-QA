# -*- coding: utf-8 -*-
"""#272 ชิ้นที่สาม — ช่องค้นหาของตัวเลือกบัญชีบน *ประวัติการใช้งาน*

    python mutation/272-the-search-box-on-the-history-picker.py save
    python mutation/272-the-search-box-on-the-history-picker.py <mutant>
    python mutation/272-the-search-box-on-the-history-picker.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/272c-the-search-box-on-the-history-picker.spec.js`
ใบ `docs/acceptance/272-the-search-box.md` §ชิ้นที่สาม

    cd e2e && npx playwright test tests/272c-the-search-box-on-the-history-picker.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

ตัวเดียว: ช่องกลับเป็นช่องเดิมของ #13 ที่ไม่มีแว่นและถามทุกตัวอักษร (`s272chistoryinput`) — คือโค้ดก่อนคำตอบของ
เจ้าของงาน 13 พ.ย. 2569 (#115) · ชื่อขึ้นต้นด้วย `s272c` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185)

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **`%` `_` เป็นตัวอักษร** — เป็นของเส้นทาง `GET /api/users` ซึ่ง `s272busersescape` ของชิ้นที่สองทำให้พัง
  และ `s272searchignored` ของชิ้นแรกทำให้ `searchOf` ไม่ตอบอะไร แถวของแฟ้มนี้ไปถึงทั้งสองจุดผ่านจอนี้ จึงเป็น
  ข้ออ้างว่าทางเข้าของจอนี้ไปถึงที่นั่น (#191) ไม่ใช่มัตแตนต์ใหม่
- **การหน่วง** — ชิ้นแรกบอกเหตุผลไว้แล้ว (#52)

## ตารางคำทำนาย (เขียนก่อนกวาด 13 พ.ย. 2569)

**H1** *the history picker: the box is the shared search box, and an underscore is a character* · แถวของ
มัตแตนต์ในแฟ้มอื่นที่แถวใหม่ไปถึงได้ถูกทำนายด้วย เพราะสเปคที่ได้แถวใหม่ทำให้จำนวนที่ฆ่าของมัตแตนต์ที่ไม่มีใครแก้
หมดอายุ (#257, #258)

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s272chistoryinput` | H1 | `toBeVisible` ของ `searchbox` | แถวของ `13a`: `users.search` หาช่องด้วย placeholder ซึ่งช่องเดิมก็มี |
| `272-the-search-box-on-three-more-screens:s272busersescape` | H1 | `total` — `teacher_one` พบ `teacher.one` | — |
| `272-the-search-box:s272searchignored` | H1 | `total` — เส้นทางไม่ค้น จึงได้ทุกบัญชีที่บทบาทนี้ไปถึง | — |
| `272-the-search-box:s272searchcase` | ไม่มี | — | H1: `teacher_one` ตัวเล็กทั้งคำ และไม่พบใครทั้งสองแบบ |
| `272-the-search-box:s272boxforgets` | ไม่มี | — | H1: ช่องไม่ถูกถอดแล้วต่อใหม่ในแถวนี้ |

## บันทึกผลกวาด (13 พ.ย. 2569 · ทีละตัว · `_local/sweep272h.ps1`)

ห้าตัวตรงตามตารางทุกตัว: `s272chistoryinput` ล้ม 1 ที่ `toBeVisible` ของช่อง (*the search box of `components/SearchBox.js`*) และแถวหกแถวของ `13a`
ผ่าน · `s272busersescape` กับ `s272searchignored` ล้ม 1 ที่ `total` (*the server reads the underscore as itself*) · `s272searchcase` กับ
`s272boxforgets` ผ่าน
"""
from harness import main

FILES = {
    'userhistory': 'frontend/src/pages/UserHistory.js',
}

BOX = '          <SearchBox label="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้" value={q} onSearch={setQ} />\n'
INPUT = (
    '          <input\n'
    '            className={`${control} w-64`}\n'
    '            value={q}\n'
    '            onChange={event => setQ(event.target.value)}\n'
    '            placeholder="ค้นหาชื่อ อีเมล หรือรหัสผู้ใช้"\n'
    '          />\n'
)

MUTANTS = {
    # ช่องเดิมของ #13 - โค้ดก่อน 13 พ.ย. 2569
    's272chistoryinput': ('userhistory', BOX, INPUT),
}

main(FILES, MUTANTS)
