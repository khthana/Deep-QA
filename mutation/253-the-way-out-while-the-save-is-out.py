# -*- coding: utf-8 -*-
"""#253 ปุ่มที่ส่งคนออกจากฟอร์ม ขณะการบันทึกของฟอร์มนั้นยังค้างอยู่

    python mutation/253-the-way-out-while-the-save-is-out.py save
    python mutation/253-the-way-out-while-the-save-is-out.py <mutant>
    python mutation/253-the-way-out-while-the-save-is-out.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/253a-the-way-out-while-the-save-is-out.spec.js`

    cd e2e && npx playwright test tests/253a-the-way-out-while-the-save-is-out.spec.js
สี่แถว · ใบ `docs/acceptance/35-assessment-evidence.md` กับ
`docs/acceptance/47-profile-photo.md`

## ประชากร ซึ่งไม่ใช่ตัวเลขที่คำบรรยายของ #249 ถือไว้

คำตอบของเจ้าของงานเมื่อ 26 ต.ค. 2569 บน #228 มีสองครึ่ง — ฟอร์มที่ส่งการบันทึกปิดช่องของ
ตัวเองด้วยธงของตัวเอง **และ *ยกเลิก* ไม่ถืออะไร** #249 ลงครึ่งแรกครบสิบห้าแฟ้มเมื่อ
30 ต.ค. 2569 แล้วเลื่อนครึ่งที่สองไว้ใน§ *What this does not close* ของ
`components/users/UserForm.js` ไม่ใช่ในตัวติดตาม ซึ่งเป็นสิ่งที่กฎที่มันอ้างห้ามไว้ (#119)
ใบนี้คือครึ่งนั้น

คำบรรยายนั้นพูดว่า *สี่* และ *สี่* คือจำนวนของ `202a` — `Plos`, `Rubrics`,
`RubricCriteria`, `ProgramSubjects` — ซึ่ง **#242 ปล่อยทั้งสี่เมื่อ 28 ต.ค. 2569**
สองวันก่อนย่อหน้าที่เอ่ยชื่อมันถูกเขียน ตัวเลขนั้นจึงเป็นบันทึกที่ค้างไว้ ไม่ใช่งานที่ค้างไว้
(#66, #81) การเคลื่อนไหวแรกของใบนี้คือสำมะโนด้วย**กลไก** (#174) ซึ่งตอนนี้เป็นคำถามที่สาม
ของ `frontend/scripts/save-window-fields.js` วัดเมื่อ 31 ต.ค. 2569 บนฟอร์ม 27 ฟอร์ม:
ทางออก 23 ทาง ถือธง **สอง** ทาง และไม่มีทางใดอยู่ในสี่นั้น

- `components/evidence/EvidenceForm.js` ถือ `busy` ของหน้า
- `components/ProfilePhotoDialog.js` ถือ `busy` ของตัวเอง

ทั้งสองอยู่ในใบนี้ สองแถวต่อจอ เพราะสิ่งที่สองจอทำเมื่อคำตอบลงบนฟอร์มที่หายไปแล้ว
ไม่ใช่เรื่องเดียวกัน

## มัตแตนต์

ห้าตัว แถวรายงานข้อยืนยัน**ตัวแรก**ที่ตาย ข้ออ้างที่เขียนใต้ข้ออ้างอื่นจึงต้องมีมัตแตนต์
ของตัวเอง (#88) สองตัวในห้าคือ**ทางเลือกที่ถูกตัดสินแล้วทำให้รันได้** (#48) ไม่ใช่
การถอดการแก้ออก

| ชื่อ | สิ่งที่มันทำ | สิ่งที่มันฆ่า |
|---|---|---|
| `evidencecancelbusy` | ใส่ `disabled={busy}` กลับที่ปุ่ม *ยกเลิก* ของฟอร์มหลักฐาน คือโค้ดก่อนตั๋วนี้เป๊ะ ๆ (#115) | ข้ออ้างที่ 1 ของ**ทั้งสองแถว**ของหลักฐานการประเมิน ซึ่งเป็นข้ออ้างเรื่องการไปถึงสองข้อ ไม่ใช่ข้อเดียวที่นับสองครั้ง (#191): โค้ดเดียวกัน ทางเข้าสองทาง คือคำตอบที่สำเร็จกับคำตอบที่ปฏิเสธ |
| `evidencecancelmoves` | ให้ `onCancel` เขียน `showing.current = {}` ก่อน `setEditing(null)` คือการอ่านที่คอมเมนต์ของจอนั้นปฏิเสธไว้ ทำให้รันได้ (#48) — *ยกเลิก* กลายเป็นคนเอาจอไป | ข้ออ้างสุดท้ายของทั้งสองแถว — แบนเนอร์ของแถวแรกกับคำปฏิเสธของแถวที่สอง เพราะทั้งคู่อยู่หลัง `showing.current === sent` ใน `save` ข้อยืนยัน *ฟอร์มหายไปแล้ว* ที่อยู่ระหว่างสองข้อนั้นยังจริงอยู่ใต้มัน จึงเป็นการอ่านที่ตามมา ไม่ใช่ข้ออ้างแยก (#233) |
| `photocancelbusy` | ใส่ `disabled={busy}` กลับที่ปุ่ม *ยกเลิก* ของกล่องรูปโปรไฟล์ (#115) | ข้ออ้างที่ 1 ของทั้งสองแถวของรูปโปรไฟล์ สองทางเข้าเช่นเดียวกัน (#191) |
| `photoboxstays` | ให้ `close()` คืนค่าทันทีขณะ `busy` คือรูปที่เจ้าของงานปฏิเสธเมื่อ 26 ต.ค. 2569 ทำให้รันได้ (#48) — การบันทึกของตัวเองกันคนไว้ในกล่อง | ข้ออ้างของแถวที่สาม — ความเงียบ กล่องยังอยู่ `setError` จึงมีที่วาด ข้อยืนยัน *กล่องหายไปแล้ว* อยู่**ใต้**ข้ออ้างนั้นเพราะเหตุนี้ (#233) |
| `photoquietsaved` | เอา `await onSaved()` ออกจาก `submit` | แถวที่สี่ — การอัปโหลดที่คนเดินจากไปยังถึงเปลือก ซึ่งเป็นคำยืนยันที่ `47a` บอกว่าจอนี้มีแทนประโยค · **มันตายที่ timeout ไม่ใช่ที่ข้อยืนยัน** ดูย่อหน้าใต้ตาราง |

ข้ออ้างของแถวที่สี่คือคำขอที่**ถูกส่ง** และคำขอที่ไม่มีใครส่งอ่านได้ด้วยการรอเท่านั้น `photoquietsaved` จึงตายที่ timeout ของ `waitForResponse` ไม่ใช่ที่ข้อยืนยัน ซึ่งเป็นสิ่งเดียวกับที่มัตแตนต์ที่ทำให้แอปพลิเคชันหยุดจะพิมพ์ (#139) สิ่งที่บอกว่าแอปพลิเคชันยังเดินอยู่ใต้มันคือสามแถวที่เหลือของการรันนั้น ซึ่งเขียว — การอ่านนั้นถูกจ่ายด้วยหนึ่งนาทีของนาฬิกาต่อการกวาด และ `47a` คือที่ที่การเปลี่ยนรูปถูกอ่านเป็นการวาด

`evidencecancelmoves` กับ `photoboxstays` คือการอ่านและรูปที่ถูกตัดสินแล้ว ทำให้รันได้
อย่างละข้อ ซึ่งเป็นสิ่งเดียวที่เปลี่ยน *เราเลือกอย่างอื่น* จากประโยคบนใบให้เป็นข้ออ้าง
ที่ชุดทดสอบถือไว้ (#48)

ไม่มีมัตแตนต์ของ *กล่องหายไปแล้ว* ในแถวที่สามหรือของ *ฟอร์มหายไปแล้ว* ในสองแถวแรก —
ทั้งสองเป็นการอ่านที่ตามมาจากข้ออ้างที่อยู่เหนือมัน ไม่ใช่ข้ออ้างที่สอง และการเรียงแบบนี้
คือสิ่งที่ทำให้ข้ออ้างของแถวถูกอ่านจริงใต้มัตแตนต์ของมัน (#233)

และไม่มีมัตแตนต์ของเฟรมที่ `RetiringPresence` ยังถือกล่องไว้ราว 190 มิลลิวินาที (#169) —
สิ่งที่อ่านมันได้คือตัววัดต่อเฟรม ไม่ใช่การรอที่ยาวกว่า (#164) และ **#257** ถือการวัดนั้น
แถวที่สามรอเกินช่วงนั้นแล้วอ่าน ซึ่งเป็นขีดจำกัดที่เขียนไว้ ไม่ใช่จุดนิ่งที่เลือกเพราะสบายใจ
(#209)

## ตอนกวาด

ชื่อข้างล่างนี้มาจาก `grep -ln 'pages/ActivityEvidence.js' mutation/*.py` ไม่ใช่จากความจำ —
รุ่นแรกของย่อหน้านี้เขียนชื่อผิดห้าชื่อ สี่ชื่อไม่มีอยู่จริงและ
`141-superseded-across-a-section-jump.py` มีอยู่แต่ถือจออื่น ซึ่งไม่มีเครื่องมือไหนรายงาน
`anchors.py` เขียวทั้งหก และคำเตือนที่ชื่อผิดคือคำเตือนที่ทำตามไม่ได้ (#126)

`evidence/EvidenceForm.js` อยู่ใน `147-evidence-form-follows-the-file.py` ด้วย
`ProfilePhotoDialog.js` อยู่ใน `47-profile-photo.py` ด้วย และ
`pages/ActivityEvidence.js` ซึ่งมัตแตนต์ `evidencecancelmoves` แก้ อยู่ใน
`35-assessment-evidence.py`, `141-superseded-across-a-history-jump.py`,
`146-save-closes-a-later-form.py`, `147-evidence-form-follows-the-file.py`,
`149-reload-keeps-the-open-form.py`, `151-failed-reload-keeps-the-list.py` กับ
`152-the-refusal-wins.py` ด้วย เส้นทางที่ซ้ำกันทำให้การกวาดเสีย จึงเทียบ `FILES`
ไม่ใช่เรื่องที่ใบพูดถึง และอย่ากวาดใบนี้ข้างเจ็ดใบนั้น (#85, #87, #125)
"""
from harness import main

FILES = {
    'form': 'frontend/src/components/evidence/EvidenceForm.js',
    'page': 'frontend/src/pages/ActivityEvidence.js',
    'photo': 'frontend/src/components/ProfilePhotoDialog.js',
}

MUTANTS = {
    # 1 - the diagnosed code, exactly as it stood until 31 October 2569 (#115).
    # Anchored on the `onClick` that names which button this is: the `disabled`
    # line alone is written eleven times in this form (#140).
    'evidencecancelbusy': (
        'form',
        '          onClick={onCancel}\n',
        '          onClick={onCancel}\n          disabled={busy}\n',
    ),

    # 2 - the reading this screen's own comment declined, made to run (#48):
    # ยกเลิก becomes somebody taking the screen, and the save it was pressed
    # over is then owed neither its banner nor its refusal.
    'evidencecancelmoves': (
        'page',
        '              onCancel={() => {\n',
        '              onCancel={() => {\n                showing.current = {}\n',
    ),

    # 3 - the same for the photo box, whose flag is its own rather than the
    # page's. The anchor is the button's `onClick`; `close` is also the
    # backdrop's handler, which has never held a flag (#217).
    'photocancelbusy': (
        'photo',
        '              onClick={close}\n',
        '              onClick={close}\n              disabled={busy}\n',
    ),

    # 4 - the shape the owner answered against, made to run (#48): a person who
    # has given up on an upload is kept in the box until it lands. Every way out
    # of this box goes through `close`, the backdrop included, so this is the
    # whole refusal and not one button's.
    'photoboxstays': (
        'photo',
        '  const close = () => {\n    setFile(null)\n',
        '  const close = () => {\n    if (busy) return\n    setFile(null)\n',
    ),

    # 5 - the shell never told. `47a`'s own rows read the photo changing; this
    # one reads it being asked for after the person has left, which is the claim
    # this ticket added.
    'photoquietsaved': (
        'photo',
        '      await uploadProfilePhoto(file)\n      await onSaved()\n',
        '      await uploadProfilePhoto(file)\n',
    ),
}

main(FILES, MUTANTS)
