# -*- coding: utf-8 -*-
"""
#91 แถบแจ้งผลค้างอยู่ข้ามการกระทำ - the banner that outlived what it was about.

Three mutants, one per assertion of e2e/tests/14c-departments-notice.spec.js.
Each puts back one half of the defect the ticket describes, and each kills its
own assertion and leaves the other passing - which is the point: the two ways
the walk found it are two different call sites, not one.

    python mutation/91-stale-notice.py save
    python mutation/91-stale-notice.py <mutant>
    python mutation/91-stale-notice.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือสามแถวของตารางมัตแตนต์ใน `docs/acceptance/14-departments.md` (บรรทัด 139–141) ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `keepcancelled` | เอา `setNotice(null)` ออกจาก `onCancel` ของฟอร์ม — คำปฏิเสธอยู่เกินฟอร์มที่ทำให้เกิดมันอีกครั้ง | **แถว *a refusal does not outlive the form that caused it* ของ `14c`** อีกสองแถวยังผ่าน |
| `keepsaved` | เอา `setNotice(null)` ออกจากปุ่ม *เพิ่มภาควิชา* — ประโยคสำเร็จอยู่เกินการกระทำที่มันรายงานอีกครั้ง | **แถว *a success does not outlive the action it reports*** อีกสองแถวยังผ่าน |
| `keepbeforeupload` | ปิด `onStart?.()` ใน `ImportPanel.js` — การอัปโหลดเลิกล้างสิ่งที่อยู่บนจอก่อนมัน คือจุดที่การแก้รอบแรกของ #91 เดินผ่าน และการรีวิวเป็นผู้เจอ | **แถว *an upload clears the banner from whatever came before it*** อีกสองแถวยังผ่าน |
"""

from harness import main

FILES = {
    "departments": "frontend/src/pages/Departments.js",
    "panel": "frontend/src/components/ImportPanel.js",
}

MUTANTS = {
    # The refusal outlives the form again: cancelling stops clearing.
    "keepcancelled": ("departments",
                      "            setNotice(null)\n"
                      "            setEditing(null)\n"
                      "          }}",
                      "            setEditing(null)\n"
                      "          }}"),
    # The success outlives its action again: opening a new form stops clearing.
    "keepsaved": ("departments",
                  "                asked.current = null\n"
                  "                showing.current = {}\n"
                  "                setNotice(null)\n"
                  "                setEditing({})\n",
                  "                asked.current = null\n"
                  "                showing.current = {}\n"
                  "                setEditing({})\n"),
    # An upload stops clearing what was on the screen before it - the site the
    # first pass at #91 walked past, and the one the code review found.
    "keepbeforeupload": ("panel", "    onStart?.()", "    if (false) onStart?.()"),
}

main(FILES, MUTANTS)
