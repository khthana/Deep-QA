# -*- coding: utf-8 -*-
"""#211 — ยามที่ ref ถือพิกัด ไม่ใช่ตัว loader: สองผู้เรียกของ `Plos.js` ที่อ่านรายการซ้ำ

#208 ให้แฟ้มหน้าจอสิบเก้าแฟ้มรูปเดียวกัน — handler อ่านตัว loader สดออกมาจาก ref ที่เก็บมันไว้
`Plos.js` อยู่นอกประชากรนั้น เพราะ `onScreen` ถือ *หลักสูตร* ที่เลือกไว้ ไม่ใช่ตัว loader ซึ่งตอบ
คำถาม *ตัวกรองยังอยู่ที่เดิมไหม* ได้ครบถ้วน (#133 — `133a` แถว 2 กับแถว 7) และตอบคำถามถัดไป
ไม่ได้เลย: *loader ตัวไหนควรเป็นผู้อ่าน*

กลไกที่สองของ #208 จึงยังมีชีวิตอยู่ที่นี่ `load` ยก `loading` ก่อนถาม และลดลงเฉพาะเมื่อ
`isCurrent()` loader ที่ `program` ของมันเป็นหลักสูตรที่จอ **ออกมาแล้ว** จึงยกที่ว่างขึ้นโดยไม่มี
ใครลด — `finally` ของมันเองปฏิเสธตัวเอง ส่วนการอ่านที่มาแทนลดที่ว่างของตัวเองไปนานแล้ว
ตารางจึงค้างอยู่ที่ *กำลังโหลด…* ใต้ประโยคที่ handler เพิ่งพูด

## สองมัตแตนต์นี้คือโค้ดที่ตั๋ววินิจฉัยไว้ ทำให้รันได้ (#115)

เอา ref กลับไปถือพิกัดตรง ๆ ไม่ได้ เพราะมัตแตนต์หนึ่งตัวเปลี่ยนได้ที่เดียว แต่
`onScreen.current === load` ให้คำตอบเดียวกับ `onScreen.current === program` ทุกกรณี — `load`
ถูกสร้างใหม่เมื่อและเมื่อ `program` เปลี่ยน (`report` คงที่) จึงเป็นสำเนาที่ซื่อตรงของโค้ดก่อนแก้
ไม่ใช่มัตแตนต์ตัวอื่นที่เผอิญอยู่บรรทัดเดียวกัน (#203 ว่าการย้ายซื่อตรงเมื่อรักษาความผิดเดิมไว้)
รูปนี้คือรูปเดียวกับ `208` ซึ่งเป็นตั๋วที่สอนรูปนี้ให้อีกสิบเก้าแฟ้ม

สองที่นี้ตายคนละแถว และเงียบสนิทในทุกแถวที่ตัวกรองไม่ขยับระหว่างที่คำขอของ handler ค้างอยู่
ตัวเปรียบเทียบตอบจริงเมื่อ loader ที่ปิดทับไว้ยังเป็นตัวที่จออยู่ พฤติกรรมจึงเหมือนเดิมสำหรับ
`19a` `133a` `139a` `142a` `202a` `203a` ซึ่งไม่มีแถวใดขยับตัวกรองในหน้าต่างนั้น

ที่ที่สามของแฟ้มนี้ — `save` — ไม่อยู่ในตารางนี้ ฟอร์มแทนที่ตารางตลอดเวลาที่การเขียนค้างอยู่
และ `save` ล้าง `editing` แล้วเรียก `load` ใน tick เดียวกัน จึงไม่มีขณะใดที่ตัวกรองอยู่บนจอ
พร้อมกับ loader ที่ยังไม่ถูกอ่าน (วัดเมื่อ 15 ตุลาคม 2569 โดยอ่านลำดับในแฟ้ม) ข้อเรียกร้องเรื่อง
คำตอบที่ถูกแทนของผู้เรียกนั้นเป็นของ `133a` แถว 7 และยังเป็นของมันต่อไป

## มัตแตนต์

| ชื่อ | ความผิดที่คืนมา | ที่ควรตาย |
|---|---|---|
| `plosremovalstaleloader` | `confirmRemoval` อ่านรายการซ้ำด้วย loader ที่มันปิดทับไว้ ไม่ใช่ตัวที่จออยู่ | `211a` แถว 1 ที่ *หลักสูตรที่ handler อ่านซ้ำ* — คาด `0503` ได้ `0501` |
| `plosrefusedstaleloader` | `openEditor` ที่ถูกปฏิเสธ อ่านรายการซ้ำด้วย loader ที่มันปิดทับไว้ | `211a` แถว 2 ที่ *หลักสูตรที่ handler อ่านซ้ำ* — คาด `0503` ได้ `0501` |
| `plosremovalstaleguard` | `confirmRemoval` อ่านด้วย loader สด แต่ยามเทียบกับตัวที่มันปิดทับไว้ — กลไกที่สองล้วน | `211a` แถว 1 ที่ `settled` — ที่ว่าง *กำลังโหลด…* ที่ไม่มีใครลด |
| `plosrefusedstaleguard` | `openEditor` ที่ถูกปฏิเสธ อ่านด้วย loader สด แต่ยามเทียบกับตัวที่มันปิดทับไว้ | `211a` แถว 2 ที่ `settled` — ที่ว่างที่ไม่มีใครลด |

สองตัวแรกทำให้ที่ว่าง *กำลังโหลด…* ค้างอยู่ด้วย ซึ่งเป็นข้อเรียกร้องที่สองของแต่ละแถว
แต่แถวตายที่ข้อเรียกร้องแรกก่อน จึงไม่เคยอ่านถึงมัน — ลำดับนี้ตั้งใจไว้ตาม #160: ถ้ารอให้
ตารางวาดก่อน แถวจะตายที่ timeout ซึ่งบอกว่ารอที่ไหน ไม่ได้บอกว่าจอตัดสินใจอย่างไร
ข้อเรียกร้องที่สองจึงมีมัตแตนต์ของตัวเองสองตัว คือคู่ `staleguard` ซึ่งปล่อยให้ข้อแรกผ่าน
แล้วตายที่ข้อที่สอง (#88 — ข้ออ้างที่เขียนใต้ข้ออ้างอื่นไม่มีอะไรพิสูจน์ และการกวาด
บอกไม่ได้ เพราะแถวก็แดงและมัตแตนต์ก็ได้เครดิตอยู่แล้ว)

## คำสั่ง

    python mutation/211-the-loader-a-coordinate-ref-cannot-hold.py save
    python mutation/211-the-loader-a-coordinate-ref-cannot-hold.py <mutant>
    python mutation/211-the-loader-a-coordinate-ref-cannot-hold.py restore
"""
from harness import main

FILES = {
    'plos': 'frontend/src/pages/Plos.js',
}

REMOVAL = (
    '      const drawing = onScreen.current\n'
    '      const reloaded = await drawing(() => onScreen.current === drawing)\n'
    '      if (reloaded && showing.current === sent) setNotice(said)\n'
)

REFUSED = (
    '      if (asked.current === ask) report(error)\n'
    '      const drawing = onScreen.current\n'
    '      await drawing(() => onScreen.current === drawing)\n'
)

MUTANTS = {
    # ยามของ #208 กลายเป็นพิกัดอีกครั้ง: handler อ่านด้วย loader ที่มันปิดทับไว้ และ
    # loader นั้นปฏิเสธตัวเอง ที่ว่างจึงค้างใต้ประโยคของการลบ
    'plosremovalstaleloader': ('plos', REMOVAL,
        '      const reloaded = await load(() => onScreen.current === load)\n'
        '      if (reloaded && showing.current === sent) setNotice(said)\n'),
    # ที่เดียวกันในทางปฏิเสธ: อ่านรายละเอียดไม่ผ่าน ฟอร์มไม่เปิด จอจึงอ่านรายการซ้ำ
    # ด้วย loader ของหลักสูตรที่ออกมาแล้ว
    'plosrefusedstaleloader': ('plos', REFUSED,
        '      if (asked.current === ask) report(error)\n'
        '      await load(() => onScreen.current === load)\n'),
    # สองตัวอยู่ข้างสุดตายที่ข้อเรียกร้องแรกของแถว สองตัวข้างล่างจึงเหลือกลไกที่สองไว้คนละข้อ:
    # loader สดอ่าน แต่ยามเทียบกับ loader ที่ปิดทับไว้ การอ่านจึงถามหลักสูตรที่ถูก อ่านหน้า
    # แรกของแถวผ่าน แต่ isCurrent() เป็นเท่า setLoading(false) จึงไม่เกิด
    # ที่ว่าง *กำลังหลด…* ค้าง แถวจึงตายที่ข้อเรียกร้องของที่ว่าง ไม่ใช่ข้อแรก (#88)
    'plosremovalstaleguard': ('plos', REMOVAL,
        '      const drawing = onScreen.current\n'
        '      const reloaded = await drawing(() => onScreen.current === load)\n'
        '      if (reloaded && showing.current === sent) setNotice(said)\n'),
    'plosrefusedstaleguard': ('plos', REFUSED,
        '      if (asked.current === ask) report(error)\n'
        '      const drawing = onScreen.current\n'
        '      await drawing(() => onScreen.current === load)\n'),
}

main(FILES, MUTANTS)
