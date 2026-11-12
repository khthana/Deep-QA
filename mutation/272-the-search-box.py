# -*- coding: utf-8 -*-
"""#272 ช่องค้นหาของสี่จอรายการฝั่งผู้ดูแล — ภาควิชา หลักสูตร รายวิชา นักศึกษากลาง

    python mutation/272-the-search-box.py save
    python mutation/272-the-search-box.py <mutant>
    python mutation/272-the-search-box.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/272a-the-search-box.spec.js` ใบ `docs/acceptance/272-the-search-box.md`

    cd e2e && npx playwright test tests/272a-the-search-box.spec.js --reporter=line

พอร์ตอ่านจากย่อหน้า **Ports** ของ `e2e/README.md` (#237)

## มัตแตนต์

แต่ละจอเขียนกลไกของตัวเอง (#68, #104) จึงมีหกตัวต่อจอ หนึ่งตัวต่อจุด: ส่ง `q` ไปกับการอ่าน
(`noq`), ประโยคตอนว่าง (`emptytext`), จุดเรียก `outsideSearch` ตอนบันทึกในสองทิศ (`savequiet` ทำให้
ไม่พูดเลย `savealways` ทำให้พูดทุกครั้งที่มีคำค้น) และจุดเรียกตอนนำเข้าในสองทิศ (`importquiet`,
`importalways`) — ทิศที่สองของแต่ละจุดคือสิ่งที่แถวคุมมีไว้จับ (#48, #108)

ห้าตัวอยู่ในโค้ดที่ใช้ร่วมกัน: `s272searchignored` กับ `s272searchcase` ที่ `backend/lib/search.js`
`s272outsidenever` กับ `s272outsidealways` ที่ `lib/outsideTheSearch.js` และ `s272boxforgets` ที่
`components/SearchBox.js` · ตัวที่อยู่ในโค้ดร่วมฆ่าหลายแถวในหลายจอ สิ่งที่แต่ละแถวเพิ่มคือข้ออ้างว่าทางเข้า
ของจอนั้นไปถึงที่นั่น (#191) ส่วนข้ออ้างที่แยกกันได้ต่อจออยู่ที่ตัวของจุดเรียก

ชื่อขึ้นต้นด้วย `s272` เพราะ harness คีย์มัตแตนต์ในแฟ้มของมันเอง (#185)

## ที่ที่ไม่มีมัตแตนต์ และเหตุผล (#102, #123)

- **`q` ในกุญแจ `readOf`** — ประโยคที่ฝากไว้ถูกคีย์ด้วยคำค้นด้วย แต่คำค้นขยับระหว่างที่ประโยครออยู่ไม่ได้
  บนสี่จอนี้: ช่องค้นหาถูกวาดในกิ่งที่ฟอร์มแทนที่ (ฟอร์มเปิดอยู่ตลอดการบันทึก) และหน้าต่างนำเข้าคลุมจอไว้
  ตลอดการนำเข้า (#270, #274) · *ยังไม่ได้ทดสอบ* ไม่ใช่ *พิสูจน์แล้ว* ลงวันที่ 12 พ.ย. 2569 และเงื่อนไขที่ทำให้
  ข้อนี้ไปถึงได้คือวันที่ช่องค้นหาถูกวาดนอกกิ่งนั้น หรือหน้าต่างนำเข้าเลิกคลุมจอ
- **การหน่วง `SEARCH_DELAY`** — ไม่ได้ตัดสินว่าจะวาดอะไร (#52) มัตแตนต์ที่เปลี่ยนตัวเลขพิสูจน์อะไรไม่ได้
- **การทิ้งคำค้นที่ยังรอเมื่อกล่องถูกถอด** — กล่องถูกถอดเมื่อฟอร์มเปิด ซึ่งเป็นการกดภายในสามร้อย
  มิลลิวินาทีหลังพิมพ์ ไม่มีแถวสร้างจังหวะนั้น และมันเขียนไว้ใน docblock ของ `SearchBox` ว่าเป็นการเลือก
  ไม่ใช่สิ่งที่พิสูจน์แล้ว

## ตารางคำทำนาย (เขียนก่อนกวาด 12 พ.ย. 2569)

แถวของ `272a` ตั้งชื่อว่า `<จอ>: <ข้ออ้าง>` ข้างล่างย่อเป็น a ถึง f ตามลำดับในแฟ้ม: a *the term is asked
of the server* · b *a term nothing holds says so* · c *a save the term does not find* · d *a save the term
finds* · e *a file the term does not find* · f *a file the term finds* · และ g คือแถวสุดท้าย *the box comes
back holding the term* · D P S T คือ Departments Programs Subjects Students

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s272searchignored` | a b c e ของทั้งสี่จอ (16) | a ที่ `total` · b ที่ประโยคตอนว่าง · c e ที่ *over a list without it* (รายการไม่ได้ถูกค้น จึงถือแถวที่เพิ่งเขียน) — ข้ออ้างของ c e คือประโยค ซึ่งยังถูกอยู่ เพราะ `outsideSearch` อยู่ฝั่งจอ | d f ทั้งสี่จอ และ g |
| `s272searchcase` | a ของ D P S (3) | `total` — คำค้นถูกพิมพ์เป็นตัวใหญ่ | a ของ T: คำค้นเป็นตัวเลข ตัวใหญ่ตัวเล็กเท่ากัน ข้ออ้างนี้ไม่เคยเสี่ยงบนจอนั้น |
| `s272outsidenever` | c e ของทั้งสี่จอ (8) | ประโยค | ที่เหลือ |
| `s272outsidealways` | d f ของทั้งสี่จอ (8) | ประโยค | ที่เหลือ |
| `s272boxforgets` | g | `toHaveValue` | ทั้งยี่สิบสี่แถวของจอ |
| `s272deptnoq` | ทั้งหกแถวของ D และ g (7) | ที่การจัดฉาก — `search` รอคำขอที่ถือ `q` ซึ่งไม่มาจนหมดเวลา (#139: การรอ ไม่ใช่ข้อยืนยัน) | P S T |
| `s272prognoq` | ทั้งหกแถวของ P (6) | ที่การจัดฉาก เหมือนข้างบน | ที่เหลือ |
| `s272subjnoq` | ทั้งหกแถวของ S (6) | ที่การจัดฉาก | ที่เหลือ |
| `s272studnoq` | ทั้งหกแถวของ T (6) | ที่การจัดฉาก | ที่เหลือ |
| `s272deptemptytext` | b ของ D | ประโยคตอนว่าง | ที่เหลือ: คำค้นของแถวเขียนของ D พบหนึ่งแถว จึงรอบรรทัดของตัวแบ่งหน้า |
| `s272progemptytext` | b ของ P | ประโยคตอนว่าง | ที่เหลือ |
| `s272subjemptytext` | b ของ S | ประโยคตอนว่าง | ที่เหลือ |
| `s272studemptytext` | b c d e f ของ T (5) | b ที่ข้ออ้าง · c ถึง f ที่การจัดฉาก: คำค้นของแถวเขียนของ T (`ตรงคำค้น`) ไม่พบใครตอนเริ่ม `searchAndDraw` จึงรอประโยคตอนว่าง | a ของ T และจออื่น |
| `s272deptsavequiet` | c ของ D | ประโยค | ที่เหลือ |
| `s272progsavequiet` | c ของ P | ประโยค | ที่เหลือ |
| `s272subjsavequiet` | c ของ S | ประโยค | ที่เหลือ |
| `s272studsavequiet` | c ของ T | ประโยค | ที่เหลือ |
| `s272deptsavealways` | d ของ D | ประโยค | c ของ D ยังผ่าน — มันพูดอยู่แล้ว |
| `s272progsavealways` | d ของ P | ประโยค | ที่เหลือ |
| `s272subjsavealways` | d ของ S | ประโยค | ที่เหลือ |
| `s272studsavealways` | d ของ T | ประโยค | ที่เหลือ |
| `s272deptimportquiet` | e ของ D | ประโยค | ที่เหลือ |
| `s272progimportquiet` | e ของ P | ประโยค | ที่เหลือ |
| `s272subjimportquiet` | e ของ S | ประโยค | ที่เหลือ |
| `s272studimportquiet` | e ของ T | ประโยค | ที่เหลือ |
| `s272deptimportalways` | f ของ D | `notice` นับได้หนึ่ง | ที่เหลือ |
| `s272progimportalways` | f ของ P | `notice` นับได้หนึ่ง | ที่เหลือ |
| `s272subjimportalways` | f ของ S | `notice` นับได้หนึ่ง | ที่เหลือ |
| `s272studimportalways` | f ของ T | `notice` นับได้หนึ่ง | ที่เหลือ |

## บันทึกการกวาด 12 พ.ย. 2569

ฐานคือ `f598668` กับงานของ #272 ที่ยังไม่ commit · `272a` ทั้งไฟล์ (25 แถว) ต่อหนึ่งมัตแตนต์ · ประตูคือบรรทัด
`applied <ชื่อ>` และสำหรับห้าตัวในแฟ้มที่ยังไม่ถูกติดตามคือ hash ของแฟ้มที่เปลี่ยน เพราะ `git diff` มองไม่เห็นแฟ้มเหล่านั้น
(รอบแรกห้าตัวนี้บันทึกว่า *NOT APPLIED* แล้วรันใหม่ด้วยประตู hash — #268)

**ยี่สิบสี่ตัวของจุดเรียกบนจอตรงตารางทุกตัว** — `noq` ฆ่า 7 6 6 6 (D นับ g ด้วย) ที่การจัดฉาก · `emptytext` ฆ่าหนึ่งแถว
บน D P S และห้าแถวบน T · `savequiet` `savealways` `importquiet` `importalways` ตัวละหนึ่งแถว ที่แถวที่ทำนายไว้

**สามข้อที่ตารางผิด**

- `s272searchignored` ฆ่า 16 เท่ากับที่ทำนาย แต่คนละชุด: **a ของ S รอด** และ **g ตาย** · g ตายที่ข้อยืนยันที่สองของมัน
  (*the list is still the searched one* — `05` ถูกวาดเมื่อเซิร์ฟเวอร์ไม่ค้น) ซึ่งตารางลืมไปว่ามี · a ของ S รอด
  เพราะข้อมูลตั้งต้นมีรายวิชาเดียว เซิร์ฟเวอร์ที่ไม่ค้นจึงนับได้หนึ่งเหมือนกัน — ข้ออ้างไม่เคยเสี่ยงบนจอนั้น
- `s272searchcase` ฆ่า 8 ไม่ใช่ 3: a ของ D P และ **d f ของ D P S** · d ตายที่ *the list holds it* — แถวที่เพิ่ง
  บันทึกถือคำค้นคนละตัวพิมพ์ จึงไม่อยู่ในรายการ ซึ่งเป็นข้ออ้างของ d เอง · f ตายที่ *precondition of the claim below*
  ซึ่งเป็นการจัดฉาก ไม่ใช่ข้ออ้างของ f (#266) จึงไม่นับเป็นหลักฐานของแถว f · **a ของ S รอด** เพราะชื่ออังกฤษ
  ของรายวิชาตั้งต้นเป็นตัวใหญ่อยู่แล้ว (`OBJECT ORIENTED PROGRAMMING`) คำค้นตัวใหญ่จึงเจอทั้งแบบสนและไม่สนตัวพิมพ์
- `s272boxforgets` `s272outsidenever` `s272outsidealways` ตรงตาราง (1 · 8 · 8)

**การซ่อม** — a ของ S ได้รายวิชาที่สองของภาควิชา 05 (`K2720005` ซึ่งไม่ถือคำค้น ใส่ใน `beforeAll` และ `hold()`
คืนให้) เป็น `hidden` และพิมพ์ `object` ตัวเล็ก ตรงข้ามกับระเบียน · และอ่าน `total` **ก่อน** รอตัวแบ่งหน้า เพราะ
เซิร์ฟเวอร์ที่หาไม่เจอไม่วาดตัวแบ่งหน้า แถวจะตายที่การรอแทนที่ข้ออ้าง (#139) · กวาดซ้ำเฉพาะหกแถวของ S:
สะอาด 6 ผ่าน · `s272searchignored` ล้ม 4 (a ที่ `total` · b · c · e) · `s272searchcase` ล้ม 3 (a ที่ `total` · d · f)
— a ของ S ตายที่ข้ออ้างของมันเองทั้งสองตัว · การย้าย `total` ขึ้นก่อนไม่ได้กวาดซ้ำบน D P T: ที่นั่น a ตายที่
`total` อยู่แล้วตอนที่มันอยู่หลังการรอ และการรอผ่านเพราะคำตอบมีแถว

**สองตัวที่ถูกเล็งใหม่** (`_local/reaim272.py`) — `57-pager.py deptpage` ล้ม 1 ที่ row 3 (`57a-pager.spec.js:191`) หลังผ่าน 4
ตรงกับตารางของ `docs/acceptance/57-pager.md` · `205-the-sentence-names-its-read.py keyforgetsthefilter` ล้ม 1 ผ่าน 3
ที่แถว *Students.js › a read of another filter clears the sentence* ตรงกับบันทึก 13 ต.ค. 2569 ใน
`docs/acceptance/17-students.md` · อีกยี่สิบสี่ตัวที่ถูกเล็งใหม่ไม่ได้กวาด: `anchors.py` บอกว่ามันยังลงที่เดิม แต่ไม่ได้บอกว่า
มันยังพิสูจน์อะไร (#107) — สองตัวนี้คือราคาที่วัด (#208)

## ตารางคำทำนายของสามตัวที่รีวิวเพิ่ม (เขียนก่อนกวาด 12 พ.ย. 2569)

รีวิวของวันเดียวกันพบสองเรื่อง: รายวิชาไม่ได้ค้นหน่วยกิต ทั้งที่ตารางวาดมันและระบบที่ส่งมอบค้นมัน (`SubjectTable.js`,
`Object.values`) · และช่องค้นหาส่งคำค้นที่ตัดช่องว่างแล้วเท่ากับคำค้นเดิมต่อไป ซึ่งพาคนกลับไปหน้าหนึ่งโดยไม่มีอะไรเปลี่ยน
· สองแถวใหม่ต่อท้าย `272a`: h *Subjects: a save the credits find says only the screen's sentence* · i *a term the
list is already on, once trimmed, leaves the page where it is*

| มัตแตนต์ | แถวที่ควรตาย | ตายที่ | แถวที่ควรรอด |
|---|---|---|---|
| `s272subjcredits` | h | *and the screen does too* — เซิร์ฟเวอร์ยังหาเจอ จอบอกว่าอยู่นอก | ที่เหลือ: คำค้นของแถวเขียนของ S คือ `object` ซึ่งชื่อของระเบียนถืออยู่แล้ว |
| `s272creditsunsearched` | h | *the server finds it by its credits* | ที่เหลือ |
| `s272boxsame` | i | *no read was asked for* | ที่เหลือ: ทุกแถวที่พิมพ์ พิมพ์คำที่ต่างจากคำที่รายการอยู่ |

## ตารางคำทำนายของการกวาดซ้ำตาม #257 (เขียนก่อนกวาด 12 พ.ย. 2569)

รีวิวชี้ว่า `272a` เป็นสเปกที่เพิ่มแถวซึ่งมัตแตนต์ของแฟ้มอื่นไปถึงได้ และยี่สิบเจ็ดตัวที่ถูกเล็งใหม่ยังไม่ได้ถูกถามกับมัน (#257) ·
ยี่สิบเจ็ดตัว ไม่ใช่ยี่สิบหกอย่างที่ docstring ข้างบนเขียน — นับใหม่ด้วยการเทียบ `MUTANTS` ของสิบแฟ้มกับ `HEAD` (#119)

**ทั้งยี่สิบเจ็ดตัวไม่ฆ่าแถวใดของ `272a`** เพราะแต่ละตัวต่างจากโค้ดจริงเฉพาะเมื่อการอ่านถูกแทนที่ (`140` `146` `202` `208`)
เมื่อหน้าขยับหรือถูกส่งต่อ (`57` `206` `209` `224`) เมื่อลบ (`203` ทุกตัวที่ชื่อ `removal…` `206:sentenceofthepagetheyleft`
`208` `209`) หรือเมื่อตัวกรองหลักสูตรขยับ (`205`) — `272a` ไม่สร้างสถานการณ์ใดในนั้น · ตัวที่ใกล้ที่สุดคือ `203:…saveanyway`
ซึ่งพูดประโยคหลังโหลดเองแทนที่จะฝากไว้ ข้อความเดียวกันจึงขึ้นบนจอ และ `203:studentsmovedanyway` ซึ่งอยู่ในกิ่ง *ไม่ได้อยู่หน้าหนึ่ง*
ที่ c d ของ T ไม่ไปถึง เพราะ `ตรงคำค้น` มีหน้าเดียว

**ตัวเดิมของแฟ้มนี้กับสองแถวใหม่ (h i)** — `s272subjnoq` ฆ่า h ที่การจัดฉาก · `s272subjemptytext` ฆ่า h ที่การจัดฉาก (`9`
ไม่พบอะไรตอนเริ่ม จึงรอประโยคตอนว่าง) · `s272outsidealways` และ `s272subjsavealways` ฆ่า h ที่ *and the screen does too* ·
`s272searchignored` ไม่ฆ่า h (รายการของภาควิชา 05 มีหน้าเดียว จึงถือแถวที่เพิ่งเขียนอยู่ดี และจอค้นหน่วยกิตเอง) · `s272studnoq`
ไม่ฆ่า i (ไม่มีการอ่านเกิดขึ้นทั้งสองทาง) · ตัวอื่นไม่ไปถึง h i

## บันทึกการกวาดหลังรีวิว 12 พ.ย. 2569

ฐานเดียวกัน (`f598668` กับงานที่ยังไม่ commit หลังแก้ตามรีวิว) · `272a` มี 27 แถว · ประตู `applied <ชื่อ>` คู่กับ hash ของแฟ้มที่ยังไม่ถูกติดตาม
และ `git diff` ของ `frontend/src` กับ `backend`

- **สะอาด** 27 ผ่าน ส่วนที่เหลือค้างมีแค่ `user_log`
- **สามตัวใหม่ตรงตาราง** — `s272subjcredits` ล้ม 1 (h ที่ *and the screen does too*) · `s272creditsunsearched` ล้ม 1
  (h ที่ *the server finds it by its credits*) · `s272boxsame` ล้ม 1 (i ที่ *no read was asked for*)
- **ยี่สิบเจ็ดตัวที่ถูกเล็งใหม่ กับ `272a` ทั้งไฟล์** — ทุกตัว 27 ผ่าน ตรงคำทำนาย: สเปกนี้ไม่ได้เพิ่มแถวให้ตัวใดในนั้น (#257)
- **ตัวเดิมกับ h i** (`--grep "credits find|already on"`) — `s272subjnoq` ล้ม h ที่การรอคำขอ (`272a:101`) · `s272subjemptytext`
  ล้ม h ที่การรอประโยคตอนว่าง (`272a:124`) — ทั้งสองเป็นการจัดฉาก ไม่ใช่ข้ออ้างของ h (#266) · `s272outsidealways` กับ
  `s272subjsavealways` ล้ม h ที่ *and the screen does too* (`272a:390`) ซึ่งเป็นข้ออ้างของมัน · `s272searchignored` กับ
  `s272studnoq` ไม่ล้มอะไร — ตรงคำทำนายทั้งหก

## ชุดที่ต้องถามซ้ำหลังชุดเต็มแดงหก (เขียนก่อนกวาด 12 พ.ย. 2569)

ชุดเต็มหลังรีวิวแดงหกแถว ทุกแถวเป็น `Students.js` ใน `146a` `203a` `205a` และแดงเมื่อรันลำพังด้วย · กลไก: `save` ของทะเบียน
อ่าน `student` จากคำตอบตั้งแต่ #272 (ชื่อเต็มกับปีที่เข้าเซิร์ฟเวอร์เป็นผู้คิด) แต่สามแฟ้มนั้นตอบการเขียนที่กั้นไว้ด้วย `{}`
ซึ่ง docblock ของมันเองเขียนว่า *ไม่มีจอใดวาด* · `searched(undefined)` จึงโยนข้อผิดพลาดใน `save` ก่อนประโยคและก่อนการอ่านใหม่
· การซ่อมคือคำตอบที่อ่านได้ (`answerOfAnAddition` ใน `e2e/support/students-screen.js`) ตามแบบของ `craftedOffering` ใน
`146a` ไม่ใช่สอนจอให้ทนคำตอบที่เซิร์ฟเวอร์ไม่เคยส่ง

**บันทึกของ `keyforgetsthefilter` ข้างบนถูกผิดเหตุ** (#209) — log ของมันแสดงว่าแถว 4 ของ `205a` ตายที่ timeout เดียวกับที่
โค้ดไม่กลายพันธุ์ตาย ไม่ใช่ที่ข้ออ้างของแถว · ฉะนั้นตัวกลายพันธุ์ของ Students ที่แถวของมันแดงตอนสะอาดต้องถามใหม่ทั้งเจ็ด —
`140` ไม่อยู่ในนั้น เพราะ `140a` เขียวตลอด

คำทำนาย: แต่ละตัวล้ม 1 คือแถวที่ตารางของแฟ้มมันเองระบุ และตายที่ข้ออ้างของแถวนั้น ไม่ใช่ที่ timeout —
`146:studentsclosewins` *leaves what was typed* · `146:studentsrefusalwins` *says nothing over the new form* ·
`146:studentscancelclears` *nothing took the place of* · `203:studentssaveanyway` *an addition whose reload is refused* ·
`203:studentsmovedanyway` *not said when that page is refused* · `203:studentsdrewunsaid` *said when that page draws* ·
`205:keyforgetsthefilter` *a read of another filter*

**ผล** (`--grep Students` ของแฟ้มของแต่ละตัว หลังซ่อม ประตู `applied` คู่กับ `git diff`) — ทั้งเจ็ดล้ม 1 คือแถวของมันเอง
ที่ข้ออ้าง ไม่มีตัวใดตายที่ timeout: `studentsclosewins` ที่ *the form opened again* · `studentsrefusalwins` ที่
*the overtaken refusal* · `studentscancelclears` ที่ประโยคของการเพิ่ม · `studentssaveanyway` กับ `studentsmovedanyway`
ที่ `seen.saying` ของ `theRefusalWins` · `studentsdrewunsaid` ที่ *the banner of the addition* · `keyforgetsthefilter` ที่
*the banner of the addition, over a list it is not of* · ตรงคำทำนายทั้งเจ็ด · สามแฟ้มสะอาด 75 ผ่าน
"""
from harness import main

FILES = {
    'search': 'backend/lib/search.js',
    'outside': 'frontend/src/lib/outsideTheSearch.js',
    'box': 'frontend/src/components/SearchBox.js',
    'dept': 'frontend/src/pages/Departments.js',
    'prog': 'frontend/src/pages/Programs.js',
    'subj': 'frontend/src/pages/Subjects.js',
    'stud': 'frontend/src/pages/Students.js',
    'subjroute': 'backend/routes/subjects.js',
}

# สมอยึดกับโค้ดที่มัตแตนต์ทำให้พัง ไม่ใช่คอมเมนต์ข้างมัน (#121, #123)
SAVE_SITE = 'outsideSearch(q, searched({ ...editing, ...draft }))'
IMPORT_SITE = 'outsideSearch(q, searched(row))'
EMPTY_SITE = '{q.trim()'

MUTANTS = {
    # เซิร์ฟเวอร์ไม่อ่านคำค้น
    's272searchignored': ('search',
        "  return term === null ? null : term.replace(/[\\\\%_]/g, '\\\\$&');\n",
        "  return term === null ? null : null;\n"),
    # ค้นแบบสนตัวพิมพ์
    's272searchcase': ('search',
        "    .map((column) => `${column}::text ILIKE '%' || $${param} || '%'`)\n",
        "    .map((column) => `${column}::text LIKE '%' || $${param} || '%'`)\n"),
    's272outsidenever': ('outside',
        '  return !values.some(value =>',
        '  return false && !values.some(value =>'),
    's272outsidealways': ('outside',
        '  return !values.some(value =>',
        '  return true || !values.some(value =>'),
    # กล่องเริ่มจากว่างทุกครั้งที่ถูกเมานต์ใหม่
    's272boxforgets': ('box',
        '  const [typed, setTyped] = useState(value)\n',
        "  const [typed, setTyped] = useState(value && '')\n"),

    's272deptnoq': ('dept', 'listDepartments({ page, per_page: PAGE_SIZE, q })',
        'listDepartments({ page, per_page: PAGE_SIZE })'),
    's272prognoq': ('prog', 'listPrograms({ page, per_page: PAGE_SIZE, q })',
        'listPrograms({ page, per_page: PAGE_SIZE })'),
    's272subjnoq': ('subj', 'department_id: department, q })',
        'department_id: department })'),
    's272studnoq': ('stud', 'program_id: program, q })',
        'program_id: program })'),

    's272deptemptytext': ('dept', EMPTY_SITE, '{q.trim() && false'),
    's272progemptytext': ('prog', EMPTY_SITE, '{q.trim() && false'),
    's272subjemptytext': ('subj', EMPTY_SITE, '{q.trim() && false'),
    's272studemptytext': ('stud', EMPTY_SITE, '{q.trim() && false'),

    's272deptsavequiet': ('dept', SAVE_SITE, 'false'),
    's272progsavequiet': ('prog', SAVE_SITE, 'false'),
    's272subjsavequiet': ('subj', SAVE_SITE, 'false'),
    's272studsavequiet': ('stud', 'outsideSearch(q, searched(student))', 'Boolean(student && false)'),

    's272deptsavealways': ('dept', SAVE_SITE, 'Boolean(q.trim())'),
    's272progsavealways': ('prog', SAVE_SITE, 'Boolean(q.trim())'),
    's272subjsavealways': ('subj', SAVE_SITE, 'Boolean(q.trim())'),
    's272studsavealways': ('stud', 'outsideSearch(q, searched(student))',
        'Boolean(student && q.trim())'),

    's272deptimportquiet': ('dept', IMPORT_SITE, 'false'),
    's272progimportquiet': ('prog', IMPORT_SITE, 'false'),
    's272subjimportquiet': ('subj', IMPORT_SITE, 'false'),
    's272studimportquiet': ('stud', IMPORT_SITE, 'false'),

    's272deptimportalways': ('dept', IMPORT_SITE, 'Boolean(q.trim())'),
    's272progimportalways': ('prog', IMPORT_SITE, 'Boolean(q.trim())'),
    's272subjimportalways': ('subj', IMPORT_SITE, 'Boolean(q.trim())'),
    's272studimportalways': ('stud', IMPORT_SITE, 'Boolean(q.trim())'),

    # หน่วยกิตหายจากสิ่งที่จอถือรายวิชาไว้
    's272subjcredits': ('subj', '  subject.credits,\n]', ']'),
    # หน่วยกิตหายจากสิ่งที่เส้นทางค้น
    's272creditsunsearched': ('subjroute', "'subject_name_en', 'credits'])", "'subject_name_en'])"),
    # ช่องส่งคำค้นต่อเสมอ แม้ตัดช่องว่างแล้วเท่ากับคำที่รายการอยู่
    's272boxsame': ('box', 'if (next.trim() !==', 'if (true || next.trim() !=='),
}

main(FILES, MUTANTS)
