# -*- coding: utf-8 -*-
"""#257 คำปฏิเสธที่ลงในเฟรมที่ tween ขาออกยังถือกล่องรูปโปรไฟล์ไว้

    python mutation/257-the-refusal-inside-the-tween.py save
    python mutation/257-the-refusal-inside-the-tween.py <mutant>
    python mutation/257-the-refusal-inside-the-tween.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/257a-the-refusal-inside-the-tween.spec.js` หนึ่งแถว
และใน `e2e/tests/47a-profile-photo.spec.js` สองแถว

    cd e2e && npx playwright test tests/257a-the-refusal-inside-the-tween.spec.js
    cd e2e && npx playwright test tests/47a-profile-photo.spec.js
    cd e2e && npx playwright test tests/253a-the-way-out-while-the-save-is-out.spec.js

ใบ `docs/acceptance/47-profile-photo.md` §#257

## สิ่งที่วัดได้ และข้ออ้างที่มันหัก

คำตอบของเจ้าของงานเมื่อ 31 ต.ค. 2569 บน #253 คือ **ข้อ ก — ไม่พูดอะไร** และเหตุผลของ
คำตอบคือการปิดกล่องนี้ถอดคอมโพเนนต์ คำปฏิเสธจึงไปถึง `setError` บนคอมโพเนนต์ที่ไม่มีใครวาด
`253a` แถวแรกถือคำตอบนั้นและอ่านที่ `GONE_MS = 400` ซึ่งเกิน tween ขาออกโดยเจตนา และ
บอกบนตัวเองว่าสิ่งที่การรอความยาวใดก็ตอบไม่ได้คือ *ประโยคนั้นเคยอยู่บนจอในหน้าต่างนั้นไหม*
ซึ่งต้องใช้ตัววัดต่อเฟรม (#164)

`e2e/probes/257-the-refusal-inside-the-tween.spec.js` สี่แขนที่ต่างกันที่เมื่อใดคำตอบลง สองรัน เมื่อ 1 พ.ย. 2569 (แขนที่ห้า *เปิดซ้ำ* เข้ามาหลังคำตอบ และอยู่ในหัวข้อข้างล่าง):

| ปล่อยคำตอบเมื่อ | กล่องอยู่ในเอกสารถึง | ประโยคอยู่กี่เฟรม | เฟรมแรก / opacity |
|---|---|---|---|
| ไม่ปล่อย | 201 / 205 ms | 0 | — |
| 0 ms | 199 / 211 ms | 9 / 9 | 37 ms ที่ 0.966 · 40 ms ที่ 0.930 |
| 90 ms | 208 / 199 ms | 5 / 4 | 127 ms ที่ 0.092 |
| 400 ms (`GONE_MS`) | 195 / 227 ms | **0** | — |

เหตุผลที่คำตอบยืนอยู่บนจึงเป็นเท็จตามถ้อยคำของตัวเอง — ประโยคนั้น**ถูกวาด** ที่ opacity
เกือบเต็ม แล้วจางไปพร้อมกล่องราว 160 มิลลิวินาที `PerformanceObserver` แบบ
`type: 'element'` รายงาน `renderTime` ของมัน ซึ่งเป็นคำตอบของเบราว์เซอร์เอง ไม่ใช่การอนุมาน
และมี 60 ถึง 62 เฟรมวิ่งต่อหลังเฟรมสุดท้ายที่เห็นมัน · แขนควบคุมที่ `GONE_MS` ได้ 0 เฟรม
ซึ่งเป็นสิ่งที่บอกว่าสองแขนที่เห็นเฟรมวัดอะไรได้จริง (#164, #171)

การวัดนั้นกลับไปหาเจ้าของงาน ไม่ใช่ลงไปในข้อความของ commit (#228) **คำตอบเมื่อ
1 พ.ย. 2569 คือข้อ ข — เงียบในหน้าต่างนั้นด้วย** ซึ่งเป็นสิ่งที่ถ้อยคำของข้อ ก บรรยายไว้
การ์ดอยู่ใน `catch` ของ `submit` ถามว่าคนส่งกล่องคืนไปแล้วหรือยัง

## ตารางทำนาย เขียนก่อนรันมัตแตนต์ตัวแรก (#255)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันจะฆ่า |
|---|---|---|
| `saysitwhileitfades` | เอาการ์ดออก คือโค้ดก่อนตั๋วนี้เป๊ะ ๆ (#115) | `257a` ที่ข้ออ้าง *frames drawing the refusal of a box being handed back* ไม่ใช่สองบรรทัดเหนือมัน ซึ่งเป็นเงื่อนไขก่อนที่ยังจริงใต้มัน (#233) · ไม่แตะ `253a` ซึ่งอ่านที่ 400 ms และไม่แตะ `47a` ซึ่งกล่องยังเปิดอยู่ |
| `quietalways` | `if (true) return` คือข้อที่ถูกตัดสินว่าไม่เอา ทำให้รันได้ (#48) — เงียบทุกกรณี ไม่ใช่เงียบตอนกล่องถูกส่งคืน ซึ่งเป็นทิศทางที่สองที่การ์ดรูป *ปฏิเสธเฉพาะที่ X* ผิดได้ (#108) | `47a` สองแถวที่ `toHaveText(REFUSALS.photoNotImage)` — แถว *a PDF named .png is refused in words* ที่ข้ออ้างของมัน และแถว *a dialog reopened after a refusal remembers nothing* ที่**เงื่อนไขก่อน** ของมัน (#233) · `257a` เขียว เพราะความเงียบคือสิ่งที่มันอ้าง · `253a` เขียว |

ไม่มีมัตแตนต์ของ `handedBack.current = true` ใน `close` แยกอีกตัว — การเอาบรรทัดนั้นออกทำให้
การ์ดไม่เคยยิง ซึ่งเป็นพฤติกรรมเดียวกับ `saysitwhileitfades` ทุกแถว จึงเป็นมัตแตนต์ที่เท่ากัน
และข้ออ้างที่ซ้ำ (#97, #201)

และไม่มีมัตแตนต์ของสองบรรทัดที่อ่าน *ตัววัดรันจริง* กับ *หน้าต่างมีจริง* ใน `257a` — ไม่มีอะไร
ใน `src/` เอาหน้าต่างนั้นไปได้ สองบรรทัดนั้นอยู่เพื่อพูดวันที่มีอะไรทำได้ (#164, #171)

## สองจำนวนของ #253 ที่สเปคใหม่นี้ทำให้หมดอายุ — ทำนายไว้ก่อนกวาด

สเปคที่ได้แถวซึ่งมัตแตนต์ไปถึงทำให้จำนวนของมัตแตนต์นั้นหมดอายุ โดยไม่มีเครื่องมือไหนรายงาน
สมอยังตรงและโค้ดที่มันแก้ไม่ขยับ มีแต่การรันซ้ำที่พูด (#248, #202) — `257a` กด *ยกเลิก*
ขณะการอัปโหลดค้างอยู่ จึงเดินผ่านโค้ดที่สองตัวของ #253 แก้

| ชื่อ | ทำนาย |
|---|---|
| `253:photocancelbusy` | เพิ่มแถวของ `257a` — ปุ่มถูกปิด `cancel().click()` จึงรอแล้วตายที่ timeout ไม่ใช่ที่ข้อยืนยัน (#139) |
| `253:photoboxstays` | เพิ่มแถวของ `257a` ที่ข้ออ้าง — `close` คืนค่าทันที การ์ดของ #257 จึงไม่เคยยิงและกล่องยังอยู่ให้วาด |
| `253:photoquietsaved` | ไม่เพิ่ม — `257a` ไม่เดินทางสำเร็จ · กวาดซ้ำเพื่อ**วัด** ไม่ใช่เพื่ออนุมาน (#107, #68) |

`253:photoboxstays` ถูก**เล็งใหม่**ในวันเดียวกันด้วย เพราะการแก้ของ #257 เขียน
`handedBack.current = true` ลงระหว่างสองบรรทัดที่สมอของมันอ้าง ซึ่ง `anchors.py` รายงาน
สิ่งที่คงไว้คือข้ออ้าง — `if (busy) return` เป็นคำสั่งแรกของ `close` — ไม่ใช่บรรทัด (#203)

## ตอนกวาด

`frontend/src/components/ProfilePhotoDialog.js` อยู่ใน
`mutation/47-profile-photo.py` กับ `mutation/253-the-way-out-while-the-save-is-out.py` ด้วย
ซึ่งมาจาก `grep -ln 'ProfilePhotoDialog.js' mutation/*.py` ไม่ใช่จากความจำ (#126)
เส้นทางที่ซ้ำกันทำให้การกวาดเสีย จึงเทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง
และอย่ากวาดใบนี้ข้างสองใบนั้น (#85, #87, #125)
"""
from harness import main

FILES = {
    'photo': 'frontend/src/components/ProfilePhotoDialog.js',
}

MUTANTS = {
    # 1 - the diagnosed code, exactly as it stood until 1 November 2569 (#115):
    # the refusal reaches `setError` on a component that is still mounted and
    # fading, and is drawn in it. Anchored on the two lines together because
    # `setError(err.message)` alone is `47:refusalnotsaid`'s anchor and has to
    # stay unique for it (#202).
    'saysitwhileitfades': (
        'photo',
        '      if (handedBack.current) return\n      setError(err.message)',
        '      setError(err.message)',
    ),

    # 2 - the other direction of the guard, made to run (#48, #108): quiet
    # whatever the person did, which is what `47a`'s own rows are about. A
    # guard of the shape *stay quiet where X* is wrong in two directions, and
    # this is the one no row of #257 can see.
    'quietalways': (
        'photo',
        '      if (handedBack.current) return\n',
        '      if (true) return\n',
    ),
}

main(FILES, MUTANTS)
