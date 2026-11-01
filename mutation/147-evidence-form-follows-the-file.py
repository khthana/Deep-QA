# -*- coding: utf-8 -*-
"""#147 - ฟอร์มหลักฐานแสดงแฟ้มที่ดินสอถูกกด

`EvidenceForm` ตั้งค่าประเภทและคำอธิบายครั้งเดียวตอน mount และหน้าวาดมันโดยไม่มี `key`
ดินสอของแฟ้มที่สองที่ถูกกดขณะฟอร์มเปิดอยู่จึงส่งแฟ้มใหม่ให้ฟอร์มโดยไม่มีอะไรในกล่องเปลี่ยน
ค่าของแฟ้มแรกยืนอยู่เหนือชื่อแฟ้มที่สอง และ บันทึก เขียนค่าเหล่านั้นลงแฟ้มที่สอง

## ทางที่เลือก

หน้าวาดฟอร์มด้วย `key` ต่อแฟ้ม (`'new'` สำหรับ แนบหลักฐาน) - แฟ้มอื่นคือฟอร์มอื่น ห้าจอพี่น้อง
ใช้ effect ที่ผูกกับแถวแทน และบนฟอร์มนี้สองทางต่างกันเรื่องเดียว: กล่องไฟล์เป็น input ของ DOM
ที่ state ล้างไม่ได้ effect จะล้าง `file` แต่ชื่อไฟล์ที่เลือกไว้ยังถูกวาดอยู่ในกล่อง และการบันทึก
ไม่ส่งไฟล์ไป ทั้งสองทางทิ้งสิ่งที่พิมพ์ไว้เมื่อกดดินสออื่น - พี่น้องทำอย่างนั้นอยู่แล้ว - และมีแถว
ที่ตรึงมันไว้

## มัตแตนต์

* `unkeyed` - ไม่มี `key` คือโค้ดก่อน #147 ควรฆ่าทั้งห้าแถว
* `keyedbymode` - `key` บอกแค่ว่า *เพิ่ม* หรือ *แก้* ไม่ได้บอกว่าแฟ้มไหน - ความผิดที่คนเขียน
  จริง ๆ จะเขียน ควรฆ่าสี่แถวที่ดินสอของแฟ้มหนึ่งตามด้วยดินสอของอีกแฟ้ม และ**ไม่**ฆ่าแถว
  *the attach form's draft does not go to the file a pencil opens* ซึ่งเข้าทางแนบหลักฐาน - ทางเข้า
  ที่สอง แถวที่สอง (#66)
* `typeunseeded` - `key` อยู่ แต่ประเภทไม่ได้ตั้งจากแฟ้ม (ได้ประเภทแรกเสมอ) - เพิ่มหลังการตรวจ
  เพราะทุกตัวข้างบนฆ่าแถวที่หนึ่งและสี่ที่คำอธิบาย ซึ่งอ่านก่อน assertion ของประเภท ครึ่ง
  *ประเภท* ของสองแถวนั้นจึงไม่มีมัตแตนต์ไปถึง ควรฆ่าแถวที่หนึ่ง สี่ และห้า ที่ประเภท
* `syncedbyeffect` - ทางของพี่น้อง: ไม่มี `key` และ effect บน `[evidence]` ตั้งกล่องใหม่ (และ
  `setFile(null)`) ควรฆ่าแถว *a file chosen for one file is not carried to another* แถวเดียว - ซึ่ง
  คือแถวเดียวที่บอกว่าทำไมเลือก `key`

## สิ่งที่ไฟล์นี้ชนกับใบอื่น

`ActivityEvidence.js` อยู่ใน `FILES` ของ `35` `146` `149` และ `151` ด้วย **ห้ามกวาดใบนี้พร้อมกับสี่ใบนั้น**
`EvidenceForm.js` ไม่มีใบอื่นถือ

## การกวาด

กวาดเมื่อ 21 ก.ย. 2569 ด้วย `147a` ทั้งไฟล์ ทีละตัว - baseline **5 ผ่านทั้ง 5** (21 วินาที)

* `unkeyed` **ล้ม 5** (1.2 นาที) - ทุกแถว ที่ค่าของกล่อง แถวไฟล์ตายที่จุดรอคำอธิบาย
  ก่อนถึงกล่องไฟล์ จึงไม่ถูกอ้างที่แถวนั้น
* `keyedbymode` **ล้ม 4 ผ่าน 1** (1.0 นาที) - แถวแนบหลักฐานรอดตามที่ทำนาย
* `syncedbyeffect` **ล้ม 1 ผ่าน 4** (25 วินาที) - ที่ *a file in the box of the second form*
  แถวเดียว และมันผ่านแถวสิ่งที่พิมพ์ - ตั๋วเขียนว่าสองทางต่างกันที่ร่าง วัดแล้วไม่ใช่

หลังการตรวจ fixture เปลี่ยนประเภทเป็น `good` กับ `fair` และเพิ่ม `typeunseeded` กวาดทั้งสี่ใหม่ -
baseline 5 ผ่าน สามตัวเดิมได้ผลเดิม `typeunseeded` **ล้ม 3 ผ่าน 2** (47 วินาที) ที่ประเภทของแถวที่หนึ่ง
และแถวแนบหลักฐาน และที่ฐานข้อมูลของแถว บันทึก

อ่านจากชื่อเทสต์ที่ตาย ไม่ใช่จากจำนวน รายละเอียดอยู่บน `docs/acceptance/35-assessment-evidence.md`

## วิธีรัน

    python mutation/147-evidence-form-follows-the-file.py save
    python mutation/147-evidence-form-follows-the-file.py <mutant>
    python mutation/147-evidence-form-follows-the-file.py restore

แถวอยู่ใน `e2e/tests/147a-evidence-form-follows-the-file.spec.js`

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือห้าแถวเกณฑ์ของ `docs/acceptance/35-assessment-evidence.md` (บรรทัด 417–421) กับย่อหน้าบันทึกผลกวาดของใบเดียวกัน (บรรทัด 409 และ 429) ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `unkeyed` | ถอด `key` ต่อแฟ้มออกจาก `<EvidenceForm>` ทั้งก้อน คือสภาพก่อน #147 | **สี่แถวของ `147a`** — *another file's pencil puts that file's type and description in the form* (ครึ่ง*คำอธิบาย*) · *what was typed for one file does not go with the pencil to another* · *a file chosen for one file is not carried to another* ที่จุดรอคำอธิบาย ไม่ใช่ที่กล่องไฟล์ จึงไม่ถูกอ้างในแถวนั้น · *the attach form's draft does not go to the file a pencil opens* (ครึ่ง*คำอธิบาย*) · และ *บันทึก after another pencil writes that file with its own values* |
| `keyedbymode` | `key` ผูกกับ**โหมด** (`'new'` กับ `'file'`) ไม่ใช่กับแฟ้ม ฟอร์มจึงไม่ remount เมื่อดินสอย้ายจากแฟ้มหนึ่งไปอีกแฟ้ม | **สามแถวเดียวกันกับตัวบน แต่ไม่ฆ่าแถว *the attach form's draft does not go to the file a pencil opens*** ซึ่งคือเหตุผลที่แถวนั้นเป็นแถวของตัวเอง (#66 — ทางเข้าที่สอง) |
| `typeunseeded` | ช่อง *ประเภทหลักฐาน* ไม่ seed จากแฟ้มที่เปิด (`useState(types[0]?.evidence_type ?? '')`) | **ครึ่ง*ประเภท* ของสามแถว** — *another file's pencil…* · *the attach form's draft…* · และ *บันทึก after another pencil…* ซึ่ง `toMatchObject` ตัวเดียวอ่านทั้งสองค่า |
| `syncedbyeffect` | ทางของห้าจอพี่น้อง: effect ที่ผูกกับ `[evidence]` แทน `key` — ตั๋วเขียนว่าสองทางต่างกันที่ร่างที่คนพิมพ์ไว้ **วัดแล้วไม่ใช่** ทั้งสองทางทิ้งร่างเหมือนกัน และต่างกันที่กล่องไฟล์ ซึ่งเป็น input ของ DOM ที่ state ล้างไม่ได้ | **ล้ม 1 ผ่าน 4** (25 วินาที) — แถว *a file chosen for one file is not carried to another* ที่ assertion *a file in the box of the second form* แถวเดียว ซึ่งคือสิ่งที่ทางที่เลือกทำนายไว้ และเป็นแถวที่บอกว่าทำไมเป็น `key` ไม่ใช่ effect |
"""
from harness import main

FILES = {
    'page': 'frontend/src/pages/ActivityEvidence.js',
    'form': 'frontend/src/components/evidence/EvidenceForm.js',
}

KEYED = "              key={editing === 'new' ? 'new' : editing.evidence_id}\n"

MUTANTS = {
    'unkeyed': ('page', KEYED, ''),
    'keyedbymode': ('page', KEYED,
                    "              key={editing === 'new' ? 'new' : 'file'}\n"),
    'typeunseeded': ('form',
                     "useState(evidence?.evidence_type ?? types[0]?.evidence_type ?? '')",
                     "useState(types[0]?.evidence_type ?? '')"),
    'syncedbyeffect': [
        ('page', KEYED, ''),
        ('form', "import { useState } from 'react'\n",
                 "import { useEffect, useState } from 'react'\n"),
        ('form', "  const [file, setFile] = useState(null)\n",
                 "  const [file, setFile] = useState(null)\n"
                 "\n"
                 "  useEffect(() => {\n"
                 "    setType(evidence?.evidence_type ?? types[0]?.evidence_type ?? '')\n"
                 "    setDescription(evidence?.description ?? '')\n"
                 "    setFile(null)\n"
                 "    // eslint-disable-next-line react-hooks/exhaustive-deps\n"
                 "  }, [evidence])\n"),
    ],
}

main(FILES, MUTANTS)
