# -*- coding: utf-8 -*-
"""
#55 แถบแจ้งผลอยู่เหนือขอบจอ - the banner nobody scrolls up to find.

Two mutants against e2e/tests/55a-notice-in-view.spec.js. `noscroll` is the
state the six screens were in before this ticket: `Notice` no longer brings
itself into view, and all three tests die. `bytext` is subtler and is the reason
the third test exists at all - it puts back the dependency the first draft of
the component had, and only the repeated refusal notices.

Both leave 14c's three passing, since #91's question is whether the banner is on
the screen at all and has nothing to say about where on it.

`if (false)` rather than deleting the line, so the mutation is one substitution
and `restore` has an exact string to put back.

    python mutation/55-notice-in-view.py save
    python mutation/55-notice-in-view.py <mutant>
    python mutation/55-notice-in-view.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือย่อหน้าบันทึกผลกวาด 22 ส.ค. 2569 ใน `docs/acceptance/15-programs.md` (บรรทัด 240–244) ซึ่งอ้างมัตแตนต์ทั้งสองไว้ทีละแถว ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `noscroll` | ปิดการเรียก `scrollIntoView` ทิ้ง (`if (false)` ไม่ใช่ลบบรรทัด เพื่อให้เป็นการแทนที่หนึ่งครั้งและ `restore` มีสายอักขระที่ตรงกลับไปใส่) คือสภาพที่หกหน้าจออยู่ก่อนตั๋วนี้ | **ทั้งสามแถวของ `55a`** — *แถบแดงที่ปฏิเสธการบันทึกอยู่ในจอ* · *คำปฏิเสธครั้งที่สองที่ข้อความเหมือนเดิม* · *แถบเขียวที่ยืนยันการบันทึกอยู่ในจอ* · ปล่อยสามแถวของ `14c` ผ่านตามที่ควรเป็น เพราะคำถามของ #91 คือแถบยังอยู่บนหน้าจอหรือไม่ ไม่ได้พูดว่ามันอยู่ตรงไหนของหน้าจอ |
| `bytext` | dependency ของฉบับแรกกลับเข้าไป คือสองสายอักขระแทนที่จะเป็นตัววัตถุ — คำปฏิเสธที่ซ้ำคำต่อคำจึงไม่ปลุกอะไรเลย และแถบค้างอยู่เหนือขอบจอในครั้งที่คนเลื่อนลงไปแก้ | **แถวที่สามแถวเดียว** ของ `55a` ซึ่งเป็นเหตุที่แถวนั้นมีอยู่ — อีกสองแถวตั้งแถบที่ข้อความต่างจากของเดิมบนจอ มันจึงมองความผิดนี้ไม่เห็น |
"""

from harness import main

FILES = {
    "notice": "frontend/src/components/Notice.js",
}

MUTANTS = {
    # The banner is set, and stays wherever the pane happens to be scrolled to.
    "noscroll": ("notice",
                 "    box.current?.scrollIntoView({ block: 'nearest' })",
                 "    if (false) box.current?.scrollIntoView({ block: 'nearest' })"),
    # The first draft's dependency: the two strings rather than the object. A
    # refusal repeated word for word then re-fires nothing, and the banner stays
    # above the fold on the attempt where the person had scrolled back down to
    # fix something. Kills the third test alone; the other two set a notice whose
    # text differs from whatever was on the screen before it.
    "bytext": ("notice",
               "  }, [notice])",
               "  }, [notice?.message, notice?.error])"),
}

main(FILES, MUTANTS)
