# -*- coding: utf-8 -*-
"""#270 การนำเข้ากลับเป็นหน้าต่าง และแถบหัวจอกลับเป็นของที่ส่งมอบ

    python mutation/270-import-window.py save
    python mutation/270-import-window.py <mutant>
    python mutation/270-import-window.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/270a-import-window.spec.js` ใบ `docs/acceptance/270-import-window.md`

    cd e2e && npx playwright test tests/270a-import-window.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## สิ่งที่ตั๋วนี้เปลี่ยน (12 พ.ย. 2569)

คำตอบของเจ้าของงานเมื่อ 10 พ.ย. 2569 เอารูปที่ส่งมอบกลับมา: แถบหัวจอที่มี **นำเข้า…** กับ **เพิ่ม…**
และหน้าต่างที่ถือแบบฟอร์ม ช่องเลือกไฟล์ และปุ่มสองปุ่ม แทนกล่องท้ายหน้า สิบจอใช้ `ImportPanel`
ตัวเดียวกับ `PageHeader` ตัวเดียวกัน พฤติกรรมของหน้าต่างจึงอ่านที่จอเดียว — ภาควิชา ซึ่งสำมะโนเลือกไว้
ให้การนำเข้ามาตั้งแต่ `14b` (#68, #171)

**ยกเลิกปิดอยู่ระหว่างส่ง** — ตั๋วเขียนไว้เองตรง ๆ และเป็นคำตอบที่ใหม่กว่าและเจาะจงกว่าคำตอบของ #228
(26 ต.ค. 2569) ที่ว่า *ยกเลิกไม่ถืออะไร* ซึ่ง #253 ลงไว้กับฟอร์มหลักฐานและกล่องรูปโปรไฟล์ สองคำตอบนี้
ขัดกันในรูป ใบนี้ทำตามคำที่ใหม่กว่า และส่งความขัดนั้นกลับไปที่เจ้าของงาน ไม่ได้ตัดสินเอง (#228)
`save-window-fields.js` ไม่เห็นหน้าต่างนี้ เพราะประชากรของมันคือแฟ้มที่มี `type="submit"`
และปุ่มของหน้าต่างเป็น `type="button"` ทั้งหมด — ข้อจำกัดที่เขียนไว้ใน docblock ของมันแล้ว

## มัตแตนต์

แปดตัว เขียนใหม่ทั้งหมด แต่ละตัวคือข้ออ้างหนึ่งของตั๋วที่ทำให้ไม่จริง ตัวที่ย้ายมาจาก `ConfirmDialog` (`204:nofocusonopen` `204:noescape` `204:notrap`)
อยู่ในใบของมันเอง และใบนี้ทำนายสิ่งที่มันจะทำกับ `270a` ไว้ข้างล่างด้วย เพราะ `270a` เป็นแถวที่มันไปถึงใหม่

## ตารางคำทำนาย — เขียนก่อนกวาด (12 พ.ย. 2569)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่ต้องตาย |
|---|---|---|
| `sendsonchoose` | ให้ `choose` ส่งไฟล์ทันทีที่เลือก ซึ่งคือพฤติกรรมของกล่องก่อน #270 | แถว *choosing a file sends nothing* ที่ `choosing a file is not sending it` |
| `sendwithoutfile` | ถอด `!file` ออกจาก `disabled` ของปุ่ม นำเข้า | แถว *นำเข้า is not pressable before a file is chosen* ที่ `toBeDisabled` ข้อเดียวของมัน · แถว *ยกเลิก closes the window* ที่ข้อยืนยันสุดท้าย (`sendButton` … `toBeDisabled` หลังเปิดใหม่) |
| `cancelwhilebusy` | ถอด `disabled={busy}` ออกจากปุ่ม ยกเลิก | แถว *while the file is out* ที่ข้อยืนยันยกเลิก `toBeDisabled` — ข้อยืนยันของ กำลังนำเข้า… อยู่บนมันและยังจริง |
| `escapewhilebusy` | ให้ `close` เรียก `onClose()` ไม่ว่า `busy` จะเป็นอะไร | แถว *while the file is out* ที่ `Escape does not take the window away from its own answer` — ยกเลิกยังปิดอยู่ด้วย `disabled` ข้อยืนยันสองข้อบนจึงจริง |
| `staysopen` | เอา `onClose()` หลัง `onImported` ออก | แถว *a success closes the window* ที่ `the window has gone` |
| `closesonreport` | ให้กิ่งที่มี `details` ปิดหน้าต่างหลังวาดรายงาน | แถว *a refused file keeps the window open* ที่ `the report is in the window` — รายงานวาดในหน้าต่างที่ปิดไปแล้ว จึงไม่มีให้อ่าน |
| `keepsonopen` | ถอดการล้างตอนเปิดหน้าต่างออก | แถว *ยกเลิก closes the window* ที่ชื่อไฟล์ `z7.csv` ยังอยู่หลังเปิดใหม่ · แถวอื่นที่เปิดหน้าต่างครั้งที่สองไม่มี (`openImport` เปิดครั้งเดียวต่อแถว) |
| `alwaysopen` | ให้หน้าต่างวาดทุกครั้ง ไม่ว่า `open` จะเป็นอะไร | แถว *the bar holds* ที่ `input[type="file"]` `toHaveCount(0)` · แถว *Escape closes the window when nothing is out* ที่ `toHaveCount(0)` · และแถวอื่นตายที่การจัดฉาก เพราะ `openImport` ไม่กดปุ่ม และผ้าคลุมบังแถบ — ไม่ใช่ข้ออ้างของแถวไหน (#266) |
| `204:nofocusonopen` | (ใบ 204) | `270a` แถว *the focus goes into the window* ที่ `the window has the focus` |
| `204:notrap` | (ใบ 204) | `270a` แถว *the focus goes into the window* ที่ `the focus it took is back in the window` |
| `204:noescape` | (ใบ 204) | `270a` แถว *Escape closes the window when nothing is out* ที่ `toHaveCount(0)` |
"""
from harness import main

FILES = {
    'panel': 'frontend/src/components/ImportPanel.js',
}

MUTANTS = {
    # The box before #270: the file goes as soon as it is chosen.
    'sendsonchoose': ('panel',
        '    setFile(chosen)\n'
        '    setFilename(chosen.name)\n'
        '  }\n',
        '    setFile(chosen)\n'
        '    setFilename(chosen.name)\n'
        '    chosen.text().then(send)\n'
        '  }\n'),
    # นำเข้า can be pressed with nothing chosen.
    'sendwithoutfile': ('panel',
        '            disabled={busy || !file}\n',
        '            disabled={busy}\n'),
    # ยกเลิก is live while the file is out - #228's shape, made to run (#48).
    'cancelwhilebusy': ('panel',
        '            onClick={close}\n'
        '            disabled={busy}\n',
        '            onClick={close}\n'),
    # Escape takes the window away from its own answer.
    'escapewhilebusy': ('panel',
        '    if (!busy) onClose()\n',
        '    onClose()\n'),
    # A success leaves the window standing.
    'staysopen': ('panel',
        '      onImported?.(result)\n'
        '      onClose()\n',
        '      onImported?.(result)\n'),
    # A report closes the window it is drawn in.
    'closesonreport': ('panel',
        '        setReport({ ok: false, errors: error.details })\n',
        '        setReport({ ok: false, errors: error.details })\n'
        '        onClose()\n'),
    # Opening the window keeps what the last one left.
    'keepsonopen': ('panel',
        '    if (open) {\n'
        '      setReport(null)\n'
        '      setFile(null)\n'
        "      setFilename('')\n"
        '    }\n',
        ''),
    # The window is drawn whether or not it was opened.
    'alwaysopen': ('panel',
        '  if (!open) {\n',
        '  if (false) {\n'),
}

main(FILES, MUTANTS)
