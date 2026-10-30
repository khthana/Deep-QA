# -*- coding: utf-8 -*-
"""#249 ห้าสิบเจ็ดช่องที่เหลือ และห้ากลไกที่มันเป็น

    python mutation/249-the-form-that-sent-this-save.py save
    python mutation/249-the-form-that-sent-this-save.py <mutant>
    python mutation/249-the-form-that-sent-this-save.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/249a-the-form-that-sent-this-save.spec.js`

    cd e2e && npx playwright test tests/249a-the-form-that-sent-this-save.spec.js
หกแถว · ใบ `docs/acceptance/11-user-accounts.md`,
`docs/acceptance/41-continuous-improvement-plan.md`,
`docs/acceptance/26-work-groups.md`, `docs/acceptance/23-offerings.md`
กับ `docs/acceptance/27-course-learning-outcomes.md`

## คำถามที่เลือกจอ

คำตอบของเจ้าของงานเมื่อ 26 ต.ค. 2569 บน #228 ตัดสินรูปไว้แล้ว — **ฟอร์มที่ส่งการบันทึก
ปิดช่องของตัวเองด้วยธงของตัวเองขณะที่คำขอค้างอยู่ และ *ยกเลิก* ไม่ถืออะไร** #228 ลงสามจอ
#242 พาไปอีกสี่ แล้วสำมะโน `save-window-fields.js` นับที่เหลือได้ 57 ช่องใน 15 แฟ้ม ซึ่งคือ
ใบนี้ สิบห้าแฟ้มนั้น**ไม่เหมือนกัน** และห้าจอข้างล่างคือห้ากลไก สี่กลไกแรกคือที่
สำมะโนวัดได้เมื่อ 30 ต.ค. 2569 (#68, #171 — สำมะโนเลือกจอ ไม่ใช่เรื่องที่ใบพูดถึง)
และ**กลไกที่ห้าคือที่ชุดทดสอบทั้งชุดเป็นผู้พบเย็นวันเดียวกัน** — สิบแถวของ `149a` กับ
`151a` แดง เพราะห้าฟอร์มการ์ดของผู้สอนวาดฟอร์ม**เหนือ**รายการการ์ด ดินสอของการ์ดอีกใบ
จึงกดได้ขณะการบันทึกค้างอยู่ และคอมโพเนนต์ถูกเรนเดอร์ใหม่ไม่ใช่ถูกถอด (#220, #227)
เรื่องเต็มของทั้งสิบห้าอยู่ที่ `frontend/src/components/users/UserForm.js` และของกลไก
ที่ห้าอยู่ที่ `docs/acceptance/27-course-learning-outcomes.md` §#249

## มัตแตนต์

สิบสี่ตัว เพราะแถวรายงานข้อยืนยัน**ตัวแรก**ที่ตาย ข้ออ้างที่เขียนใต้ข้ออ้างอื่นจึงไม่มี
อะไรพิสูจน์ถ้าไม่มีมัตแตนต์ของตัวเอง (#88) สี่ตัวในนั้นคือ**ธงของหน้าที่เจ้าของงานปฏิเสธ
ทำให้รันได้** (#48) ไม่ใช่การถอดธงออก

| ชื่อ | สิ่งที่มันทำ | สิ่งที่มันฆ่า |
|---|---|---|
| `useremaillive` | เอา `disabled={sending}` ออกจากช่อง *อีเมล* คือโค้ดก่อนตั๋วนี้เป๊ะ ๆ (#115) | ข้ออ้างที่ 1 ของแถวผู้ใช้งาน |
| `usernamelive` | เช่นเดียวกันที่ช่อง *ชื่อ (ไทย)* | ข้ออ้างที่ 2 ของแถวนั้น ซึ่งเขียนอยู่ใต้ข้ออ้างที่ 1 |
| `usernamepage` | ให้ช่อง *ชื่อ (ไทย)* อ่าน `busy` ของหน้าแทนธงของฟอร์ม คือทางเลือกที่ #228 ปฏิเสธ ทำให้รันได้ (#48) | ข้ออ้างที่ 3 — ฟอร์ม *เพิ่มผู้ใช้งาน* ที่เปิดขณะหน้ายังอ่านรายการของตัวเองอยู่ ซึ่งเป็นหน้าต่างที่คนเจอได้โดยไม่มีใครอื่นในระบบ ข้ออ้างที่ 1 กับ 2 ยังจริงอยู่ใต้มัน |
| `entryboxlive` | เอา `disabled={sending}` ออกจากกล่องของการ์ด | ข้ออ้างที่ 1 ของแถวที่หนึ่งของแผนการปรับปรุง |
| `entryboxpage` | ให้กล่องนั้นอ่าน `busy` ของหน้า (#48) | ข้ออ้างที่ 2 ของแถวที่หนึ่ง — การ์ดที่ไม่ได้ส่งอะไรยังพิมพ์ได้ — **และแถวที่สองทั้งแถว** ซึ่งเป็นข้ออ้างเรื่องการไปถึงสองข้อ ไม่ใช่ข้อเดียวที่นับสองครั้ง (#191): หนึ่งคือเกรนของธง อีกหนึ่งคือกล่องที่เปิดใหม่ใต้การบันทึกของตัวเอง |
| `entryclosed` | เอา `setSending(false)` ออกจากกิ่ง `!editing` ของเอฟเฟกต์ คือทางลงที่สองของธงถูกถอด (#227) | แถวที่สองของแผนการปรับปรุง — และมันคือกิ่งที่ลงจริง เพราะ `save` ปิดกล่องทันทีที่คำขอสำเร็จ ก่อนการอ่านซ้ำที่มันปิดท้ายด้วย |
| `groupspickerlive` | เอา `disabled` ที่อ่าน `sending === place:<group_id>` ออกจากตัวเลือกนักศึกษาของการ์ด | ข้ออ้างที่ 1 ของแถวกลุ่มงาน |
| `groupskeyless` | ให้กล่อง *สร้างกลุ่มงาน* อ่าน `Boolean(sending)` แทน `sending === 'create'` คือธงที่บอกว่า*มี*คำขอค้างอยู่ ไม่ใช่ว่า**ฟอร์มไหน**ส่ง (#48 — รูปที่หน้านี้ไม่มีคอมโพเนนต์ให้วางธง) | ข้ออ้างที่ 2 — สองฟอร์มที่เหลือของหน้านี้ยังพิมพ์ได้ขณะที่การ์ดกำลังส่ง |
| `sectionclear` | ล้างกล่องเลขตอนเรียนตอน**กด** คือโค้ดก่อนตั๋วนี้ (#115) และเป็นเหตุที่แถวแรกของ `142a` ต้องพิมพ์เลขซ้ำจนถึง 30 ต.ค. 2569 | ข้ออ้างที่ 1 ของแถวตอนเรียน — เลขที่การบันทึกถูกส่งไปพร้อมกับมันยังอยู่ในกล่อง |
| `sectionfieldlive` | เอา `disabled={addSending}` ออกจากกล่องนั้น | ข้ออ้างที่ 2 ของแถวนั้น |
| `sectionflagstuck` | ถอด `try/finally` ออก ธงขึ้นแล้วไม่ลง (#227) | ข้ออ้างที่ 3 — กล่องกลับมาพิมพ์ได้หลังคำปฏิเสธ ซึ่งเป็นข้ออ้างที่สองข้อข้างบนยังจริงอยู่ขณะที่มันเท็จ |
| `sectionclearalways` | ล้างกล่องเมื่อคำตอบกลับมา **ไม่ว่าคำตอบคืออะไร** คือการเอาเงื่อนไข `!== false` ออก | ข้ออ้างที่ 4 — คำปฏิเสธไม่ได้ล้างอะไร ซึ่งเป็นอีกครึ่งของการย้ายการล้างไปไว้ที่คำตอบ |
| `cloboxlive` | เอา `disabled={sending}` ออกจาก textarea ของ `clo_detail` คือโค้ดก่อนตั๋วนี้เป๊ะ ๆ (#115) | ข้ออ้างที่ 1 ของแถวผลการเรียนรู้รายวิชา — กล่องของการ์ดที่ส่งการบันทึก |
| `cloflagstuck` | เอา `setSending(false)` ออกจากเอฟเฟกต์ที่ seed ด้วย subject **แต่ทิ้งคอมเมนต์ที่อธิบายมันไว้** เพราะสมอเล็งโค้ดที่มัตแตนต์ทำให้พัง ไม่ใช่คอมเมนต์ข้างมัน (#101, #121) | ข้ออ้างที่ 2 ของแถวนั้น — กล่องของการ์ดใบที่สองที่เปิดขณะการบันทึกของใบแรกยังค้างอยู่ ซึ่งเป็นข้ออ้างที่แถวนี้มีไว้เพื่อมัน · ข้ออ้างที่ 3 (ค่าที่กล่องนั้นรับไว้) เป็น**เครื่องมือ**ของข้ออ้างที่ 2 ไม่ใช่ข้ออ้างแยก เพราะตัวอ่านที่อ่านแต่ค่าแยกกล่องที่ไม่มีจากกล่องที่ว่างไม่ได้ (#164) |

`usernamepage`, `entryboxpage`, `groupskeyless` กับ `sectionclear` คือข้อเสนอหรือโค้ดเดิม
ที่ถูกตัดสินแล้ว ทำให้รันได้ — อย่างละข้อ ซึ่งเป็นสิ่งเดียวที่เปลี่ยน *เราเลือกอย่างอื่น*
จากประโยคบนใบให้เป็นข้ออ้างที่ชุดทดสอบถือไว้ (#48)

ไม่มีมัตแตนต์ของปุ่มที่ส่งฟอร์ม — ทั้งสิบห้าแฟ้มถือ `busy` ของหน้าอยู่แล้ว ซึ่งเป็นข้ออ้าง
แวดล้อมของ #228 ที่ #243 วัดแล้วว่าจริงที่นี่ และใบนี้ไม่ได้ขยับมัน

## ตอนกวาด

`improvement/EntrySection.js` อยู่ใน `41-improvement-plan.py`,
`149-reload-keeps-the-open-form.py`, `150-entry-arriving-under-an-open-editor.py` กับ
`164-a-reopened-editor-painted-stale.py` ด้วย `pages/StudentGroups.js` อยู่ใน
`26-work-groups.py`, `141-superseded-across-a-section-jump.py` กับ `152-the-refusal-wins.py`
`users/UserForm.js` อยู่ใน `88-the-window-states-its-own-rule.py` และ
`clos/CloForm.js` ซึ่งกลไกที่ห้าพาเข้ามาใน `FILES` เมื่อ 30 ต.ค. 2569 อยู่ใน
`27-course-outcomes.py` ด้วย เส้นทางที่ซ้ำกันทำให้การกวาดเสีย จึงเทียบ `FILES` ไม่ใช่
เรื่องที่ใบพูดถึง และอย่ากวาดใบนี้ข้างเก้าใบนั้น (#85, #87, #125)
"""
from harness import main

FILES = {
    'userform': 'frontend/src/components/users/UserForm.js',
    'entry': 'frontend/src/components/improvement/EntrySection.js',
    'groups': 'frontend/src/pages/StudentGroups.js',
    'sections': 'frontend/src/components/offerings/SectionsPanel.js',
    'clo': 'frontend/src/components/clos/CloForm.js',
}

# Each field is anchored on its own `onChange`, which names the column: the
# `disabled` line alone is written twelve times in this form (#140).
USER_FIELD = "              onChange={set('%s')}\n              disabled={sending}\n"
USER_FIELD_LIVE = "              onChange={set('%s')}\n"

MUTANTS = {
    # 1 — the email field, live while the save it sent is out: the code as it
    # stood before 30 October 2569.
    'useremaillive': ('userform', USER_FIELD % 'email', USER_FIELD_LIVE % 'email'),

    # 2 — the claim written below the one above, and so proved by nothing
    # without a mutant of its own (#88).
    'usernamelive': ('userform', USER_FIELD % 'first_name_th',
                     USER_FIELD_LIVE % 'first_name_th'),

    # 3 — the page's flag in place of the form's, which is the option the owner
    # answered against on 26 October 2569, made to run (#48). The two claims
    # above stay true under it; what goes red is the form opened after the save
    # has landed, while the screen is still reading its list.
    'usernamepage': ('userform', USER_FIELD % 'first_name_th',
                     "              onChange={set('first_name_th')}\n"
                     '              disabled={busy}\n'),

    # 4 — the card's box, live while its own save is out.
    'entryboxlive': ('entry',
                     '            onChange={event => setDraft(event.target.value)}\n'
                     '            disabled={sending}\n',
                     '            onChange={event => setDraft(event.target.value)}\n'),

    # 5 — the same box reading the page's flag (#48). One flag for four cards
    # closes the card nobody pressed, and closes the box reopened under the
    # save that is still out.
    'entryboxpage': ('entry',
                     '            onChange={event => setDraft(event.target.value)}\n'
                     '            disabled={sending}\n',
                     '            onChange={event => setDraft(event.target.value)}\n'
                     '            disabled={busy}\n'),

    # 6 — the second way down taken away (#227). This card is the one of the
    # fifteen that can reach the state, and this is the branch that reaches it.
    'entryclosed': ('entry',
                    '      setSending(false)\n'
                    '      seededFrom.current = CLOSED\n',
                    '      seededFrom.current = CLOSED\n'),

    # 7 — the card's picker, live while the placement it sent is out.
    'groupspickerlive': ('groups',
                         '                    disabled={sending === `place:${group.group_id}`}\n',
                         ''),

    # 8 — the flag that says *a write is out* in place of the one that says
    # *which form sent it* (#48). This page has no component to put a flag in,
    # so the key is the whole of the answer here.
    'groupskeyless': ('groups',
                      "                disabled={sending === 'create'}\n",
                      '                disabled={Boolean(sending)}\n'),

    # 9 — the box emptied at the press: the code before this ticket, and the
    # reason `142a`'s first row typed the number twice (#115).
    'sectionclear': ('sections',
                     '          setAddSending(true)\n'
                     '          try {\n',
                     '          setAddSending(true)\n'
                     "          setAdding('')\n"
                     '          try {\n'),

    # 10 — the field, live while its own save is out.
    'sectionfieldlive': ('sections',
                         '            onChange={event => setAdding(event.target.value)}\n'
                         '            disabled={addSending}\n',
                         '            onChange={event => setAdding(event.target.value)}\n'),

    # 11 — the flag raised and never let go (#227). Both claims above stay true
    # under it; what goes red is the person being able to correct the number
    # the server refused.
    'sectionflagstuck': ('sections',
                         '          setAddSending(true)\n'
                         '          try {\n'
                         "            if ((await onAddSection(adding.trim())) !== false) setAdding('')\n"
                         '          } finally {\n'
                         '            setAddSending(false)\n'
                         '          }\n',
                         '          setAddSending(true)\n'
                         "          if ((await onAddSection(adding.trim())) !== false) setAdding('')\n"),

    # 12 — the clearing moved to the answer and then made unconditional, which
    # is the other half of this screen's fix: a refusal that empties the box
    # leaves the person without the number and without a way to send it again.
    'sectionclearalways': ('sections',
                           "            if ((await onAddSection(adding.trim())) !== false) setAdding('')\n",
                           '            await onAddSection(adding.trim())\n'
                           "            setAdding('')\n"),

    # 13 - the box of the card that sent the save, live. It is the precondition
    # the next claim is read after, so it needs a mutant of its own (#88): on
    # this screen the form is drawn above its list, so the element the row
    # reads before the pencil and after it is the same one.
    'cloboxlive': ('clo',
                   "            onChange={event => set('clo_detail', event.target.value)}\n"
                   '            disabled={sending}\n',
                   "            onChange={event => set('clo_detail', event.target.value)}\n"),

    # 14 - the way back in taken away, which is the code as it stood until the
    # evening of 30 October 2569: one card's save leaves the flag up over the
    # card a pencil has just opened, the component being re-rendered and not
    # remounted (#220). This is the mutant the full suite wrote - ten rows of
    # `149a` and `151a` were red under it, every one of them dying at a `fill`
    # and so at a timeout rather than at a claim (#139), which is why #249
    # owns a row that reads it as one. Against `249a` it kills that row; run
    # wider it kills those ten too, which is one defect several ways in reach
    # and not several claims (#191). The comment above the line is left
    # standing on purpose: an anchor is built on the code a mutant breaks and
    # never on the prose beside it (#101, #121).
    'cloflagstuck': ('clo',
                     '    setSending(false)\n'
                     '  }, [clo])\n',
                     '  }, [clo])\n'),
}

main(FILES, MUTANTS)
