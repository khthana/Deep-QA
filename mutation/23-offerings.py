# -*- coding: utf-8 -*-
"""
#23 การเปิดรายวิชาในภาคการศึกษา - the term being planned, and who may plan it.

Mutants for both seams, and the split is deliberate: what the routes answer is asked in
`backend/test/offerings.test.js`, and what only a browser can show - a
replacement box that has quietly become an additive one, a refusal that leaves
the screen showing something else - is asked in `e2e/tests/23a-offerings.spec.js`
and `23b-offerings-refusals.spec.js`.

    python mutation/23-offerings.py save
    python mutation/23-offerings.py <mutant>
    cd backend && node --test test/offerings.test.js
    # or, for the eleven browser ones:
    cd e2e && npx playwright test 23a-offerings 23b-offerings-refusals

`nolanding` and `noconfirm` mutate CRA source. Do not apply either while an e2e run
is in flight or the dev frontend is up: the running server compiles what is on disk
at that moment, and a mutant applied mid-run is a result about nothing. The e2e stack
boots its own frontend per run (`reuseExistingServer: false`), so apply first, then
run.
    python mutation/23-offerings.py restore

`sectionglobal` is the one to read first. The third criterion is a fact about a
constraint - `(semester_course_id, section_number)` per Offering, not
`section_number` alone - and the inherited system had it globally unique, which
is what migration 0002's header comment says it corrects. The obvious mutant is
therefore on the migration, and it is the wrong one: the seed itself opens
section `1` under both 2568 and 2567, so a globally unique constraint fails
during seeding and every test in the file errors in `before()`. A mutant that
kills a whole file proves nothing about which assertion discriminates. So this
one reproduces the old rule at the route instead - a pre-check that refuses a
section number already used anywhere - and kills exactly the half of criterion
three that everybody forgets to write.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `sectionglobal` | **ทำอะไร** กฎที่สืบมา: เลขตอนเรียนไม่ซ้ำกันทั้งระบบ เขียนเป็น pre-check ที่ route **ไม่ใช่ที่ migration** เพราะ seed เองเปิดตอนเรียน `1` ไว้ทั้งใต้ 2568 และ 2567 constraint แบบนั้นจึงล้มตั้งแต่ตอน seed และทุก subtest จะ error พร้อมกันใน `before()` ซึ่งไม่บอกอะไรเลยว่า assertion ไหนแยกแยะ | **ฆ่าที่** **12 จาก 21 subtests** และตัวที่แถวเกณฑ์ข้อ 3 อ้างถึงคือ *a section number repeats across subjects and is refused within one Offering* ตายด้วย `409 !== 201` ตรงครึ่งที่มันเล็งไว้ · **ทื่อกว่าที่ตั้งใจ** — อีกสิบเอ็ดตัวตายเพราะ `freshOffering` สร้างตอนเรียน `1` เหมือนกัน แต่ **ไม่ใช่การพังทั้งไฟล์**: 9 subtests ยังผ่าน seed ยังขึ้น และทุกตัวที่ตายตายที่ assertion · ที่มา `docs/acceptance/23-offerings.md:138` |
| `wideopen` | **ทำอะไร** รับบทบาทอื่นทั้งสี่เข้ามาด้วย (`COMMITTEE` รับ `DEPT_ADMIN`, `FACULTY_ADMIN`, `FULL_ADMIN`, `TEACHER`) ซึ่งเป็นสิ่งที่ทุกจอจาก #14 ถึง #18 ทำ และคนอ่านจะเดาว่าจอนี้ทำด้วย | **ฆ่าที่** ฝั่ง backend **2 subtests** — *every other role is refused at the server, Faculty Admin included* และ *a copy is refused when either end is not a term, or both are the same* ทั้งคู่ด้วย `200 !== 403` · ฝั่งเบราว์เซอร์ **ทั้งสี่แถวของ `23b`** ทุกบัญชีตายด้วย `Expected: 403 / Received: 200` ที่ตัว response ตรงๆ · **ตอนแรกมันเติมแค่สองบทบาท จึงพิสูจน์ได้แค่สองแถวจากสี่** และที่เขียวโดยไม่มีอะไรท้าทายไม่ใช่หลักฐาน เพราะเป็นการเลือกของคนเขียนมัตแตนต์ ไม่ใช่คำตอบของระบบ · ที่มา `docs/acceptance/23-offerings.md:157` |
| `nocheckteacher` | **ทำอะไร** `teacherRefusal` ตอบ `null` ทุกกรณี ไม่มีอะไรถูกตรวจก่อนเขียน | **ฆ่าที่** **1 subtest** คือ *a teacher who is not a registered user cannot be assigned* ซึ่งเป็นตัวที่ตั๋วระบุชื่อไว้ — subtest เดียวนี้ถือ assertion ทั้งสองครึ่ง: รหัสที่ไม่มีอยู่จริงทะลุไปตายที่ foreign key แล้วกลับมาเป็น error ที่ไม่ได้ตั้งใจแทนประโยคของเกณฑ์ข้อห้า และบัญชีที่มีจริงแต่ถูกระงับถูก **รับเข้าเงียบ ๆ** ซึ่งเงียบกว่ามาก เพราะไม่มีอะไรพัง มีแต่ผู้สอนที่ระบบระงับไปแล้วโผล่มาอยู่หน้าตอนเรียน · ที่มา `docs/acceptance/23-offerings.md:175` |
| `nocheckplacement` | **ทำอะไร** ไม่ถามว่ารายวิชาอยู่ในหลักสูตรหรือยัง (ถามหลัง insert แทนก่อน) ซึ่งเป็นกับดักที่ `catalogueRefusal` ของ #18 จดไว้: foreign key ยก 23503 ตัวเดียวกับที่การลบที่ถูกป้องกันยก คำปฏิเสธจึงกลายเป็น error ที่ไม่ได้ตั้งใจ | **ฆ่าที่** **2 subtests** คือ *a subject that is not in the programme cannot be opened* ซึ่งคือเกณฑ์ข้อหกทั้งข้อ และ *a subject closed in the catalogue cannot be opened, however the curriculum has it* ซึ่งเป็นชั้นที่ `/code-review` เจอ — ทั้งสองคำถามอยู่ใน `placementRefusal` ตัวเดียวกัน มัตแตนต์ที่ตัดคำถามแรกออกจึงพาคำตอบที่สองไปด้วย · ที่มา `docs/acceptance/23-offerings.md:183` |
| `nosyllabus` | **ทำอะไร** เอาการตรวจแผนการสอนรายสัปดาห์ออก การลบจึงกลับไปเชื่อว่าลูกของตอนเรียนทุกตัวปฏิเสธผ่าน `ON DELETE RESTRICT` — ห้าในหกตัวทำ แต่ `course_syllabus` เป็น CASCADE ตอนเรียนที่มี มคอ.3 และไม่มีคนลงทะเบียนจึงลบได้สะอาด และพาแผนไปด้วย: 204 ไม่มีคำปฏิเสธ ไม่มีบันทึก | **ฆ่าที่** **1 subtest** คือ *a weekly plan protects the section it belongs to, and the Offering above it* · **เกิดจาก `/code-review` ไม่ใช่จากตั๋ว** และเป็นตัวที่สำคัญที่สุดในชุดนี้ เพราะเป็นตัวที่บอกว่าทำไมการตรวจนั้นต้องถามด้วยชื่อ ไม่ใช่ดักจากฐานข้อมูล · ที่มา `docs/acceptance/23-offerings.md:190` |
| `nocatalogue` | **ทำอะไร** เอาชั้นคลังรายวิชาออกจาก `placementRefusal` เหลือแต่การจับคู่ รายวิชาที่เลิกใช้ในข้อมูลรายวิชาแต่ยังอยู่ในหลักสูตรจึงเปิดได้จากแถบที่อยู่ และเส้นทางคัดลอกเปิดใหม่ให้ทุกเทอม ขณะที่ picker บนจอเดียวกันซ่อนมันไว้ | **ฆ่าที่** **2 subtests** คือ *a subject closed in the catalogue cannot be opened, however the curriculum has it* และ *a subject closed in the catalogue is named under its own heading* ตัวหลังคือเส้นทางคัดลอก ซึ่งเมื่อไม่มีชั้นคลังจะเปิดรายวิชาที่เลิกใช้แล้วให้ใหม่ทุกเทอมโดยไม่มีบรรทัดใดในรายงานบอก · ที่มา `docs/acceptance/23-offerings.md:196` |
| `nolength` | **ทำอะไร** เอาการตรวจความยาวเลขตอนเรียนออก ตัวอักษรที่สิบเอ็ดจึงถึงคอลัมน์และยก 22001 — ไม่ใช่ 23505 ที่กรณีซ้ำดักไว้ และไม่ใช่ 23503 ที่การลบดักไว้ การพิมพ์ผิดธรรมดาจึงกลับมาเป็น 500 | **ฆ่าที่** **1 subtest** คือ *a section number longer than the column is refused, not raised* · ที่มา `docs/acceptance/23-offerings.md:203` |
| `additive` | **ทำอะไร** การกำหนดผู้สอนกลายเป็นการเพิ่ม ไม่ใช่การแทนที่ — แถวเดิมถูกเก็บไว้และแถวที่ส่งมาถูกเติมเข้าไป ทุกคำขอยังสำเร็จและเซิร์ฟเวอร์ยังตอบ 200 สิ่งที่ยืนยันแค่ว่าผู้สอน*ถูกกำหนด*จึงไม่รู้สึกอะไร | **ฆ่าที่** ฝั่ง backend **1 subtest** คือ *teachers are assigned to a section and reassigned afterwards* · ฝั่งเบราว์เซอร์ **`23a` แถว 4** (*teachers are assigned, and reassigning replaces them*) ที่ `toHaveText` ของรายชื่อผู้สอนบนการ์ด คือเอาคนออกแล้วคนนั้นยังอยู่ — เป็นตัวที่บอกว่าทำไมเกณฑ์ข้อสี่เขียนว่า *and reassigned afterwards* · `23a` เป็น `mode: 'serial'` แถวที่เหลือหลังแถวที่ตายขึ้นว่า *did not run* ไม่ใช่ผ่าน (#67) · ที่มา `docs/acceptance/23-offerings.md:207` |
| `dupupsert` | **ทำอะไร** การเพิ่มตอนเรียนกลายเป็น upsert เลขที่ซ้ำใต้ Offering นี้จึงไปอัปเดตแถวที่มันชนและตอบ 201 จำนวนการ์ดบนจอยังถูกหมด — ยังมี ตอนเรียน 1 หนึ่งใบ — สิ่งที่หายไปคือคำปฏิเสธเอง และโอกาสที่คนกดจะรู้ว่าเลขนั้นถูกใช้แล้ว | **ฆ่าที่** `23a` **แถว 2** ตรง assertion ข้อความปฏิเสธ มันจึงรอดจากเทสต์ที่นับการ์ดอย่างเดียว · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:229` |
| `noassign` | **ทำอะไร** ครึ่งแทนที่ของ `writeTeachers` ถูกเก็บไว้ ครึ่งเขียนถูกตัดออก การกำหนดจึงล้างตอนเรียนแล้วไม่ใส่ใครกลับ คำขอยังตอบ 200 พร้อมตอนเรียนในนั้น ซึ่งเป็นเหตุที่มันเป็นแถวเบราว์เซอร์: การ์ดที่ว่างเปล่าเห็นได้ที่หน้าจอที่เดียว | **ฆ่าที่** `23a` **แถว 4 ครึ่งแรก** คู่กับ `additive` ที่ตายที่ครึ่งหลัง สองตัวรวมกันจึงครอบเกณฑ์ข้อสี่ทั้งข้อ: กำหนดได้ และกำหนดใหม่แล้วแทนที่ของเดิม · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:233` |
| `nocopysections` | **ทำอะไร** คัดลอกรายวิชามา แต่ไม่คัดลอกตอนเรียนใต้มัน รายงานยังบอกว่าเปิดรายวิชาใหม่ 1 รายวิชาเหมือนเดิม และเทอมดูเหมือนถูกคัดลอกมาจากหน้ารายการ — ต้องเข้าไปอีกจอหนึ่งจึงรู้ว่าเป็นเทอมที่ไม่มีใครลงทะเบียนได้ | **ฆ่าที่** `23a` **แถว 7** ตรง assertion ว่าตอนเรียน `1` มาด้วย (`Expected: 1 / Received: 0`) · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:245` |
| `nocopyreport` | **ทำอะไร** ผลลัพธ์ที่สองกับที่สามของการคัดลอกยุบเป็นอันเดียว — รายวิชาที่เปิดอยู่แล้วยังถูกข้าม แต่ไม่ถูกเอ่ยชื่ออีก การกด คัดลอก ครั้งที่สองจึงไม่รายงานอะไรเลย ซึ่งอ่านเหมือนการคัดลอกที่ไม่ได้ทำอะไร ไม่ใช่การคัดลอกที่พบว่างานทำไว้แล้ว | **ฆ่าที่** `23a` **แถว 7** ตรงการกดคัดลอกครั้งที่สอง — สองมัตแตนต์นี้คู่กันแยกเกณฑ์ข้อเจ็ดออกเป็นสองครึ่ง: *คัดลอกได้* กับ *บอกว่าทำอะไรไปบ้าง* · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:249` |
| `norestrictcatch` | **ทำอะไร** เอาการดัก 23503 ออกจากการลบการเปิดสอน ฐานข้อมูลยังกันการลบไว้เหมือนเดิมและแถวยังอยู่ สิ่งที่หายไปคือเหตุผล คนกดเห็นคำว่าระบบขัดข้องแทนที่จะเห็นว่าเทอมนี้ถูกป้องกันไว้ | **ฆ่าที่** `23a` **แถว 8 ตัวที่สอง** ที่ข้อความ `offeringInUse` ซึ่งคือคำปฏิเสธของเกณฑ์ข้อแปด · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:241` |
| `anyprogram` | **ทำอะไร** เอา `program_id = ANY(reach)` ออกจากรายการ เหลือตัวกรองสามตัวที่หน้าจอส่งมา ทุกบัญชียังต้องเป็นกรรมการหลักสูตรจึงมาถึงที่นี่ได้ แถวของ `wideopen` จึงยังเขียว สิ่งที่พังคืออีกครึ่งของเกณฑ์ข้อเก้า — กรรมการที่เห็นเทอมของหลักสูตรคนอื่น | **ฆ่าที่** `23b` แถว *the committee of another curriculum sees none of this one* ด้วย `Expected: 0 / Received: 1` · **สี่แถวของ `wideopen` ยังเขียวทั้งหมด** เพราะการเป็นกรรมการหลักสูตรกับการเป็นกรรมการของ *หลักสูตรนี้* เป็นคนละคำถาม · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:253` |
| `firstrole` | **ทำอะไร** บัญชีที่ยังไม่เคยเลือกสวมบทบาทที่อาวุโสน้อยที่สุดแทนที่จะสูงที่สุด (`backend/auth/authorise.js`) กรรมการที่สอนด้วยจึงมาถึงในฐานะอาจารย์และถูกจอของตัวเองปฏิเสธ | **ฆ่าที่** `23b` แถว *the account holding two roles gets in as the committee* ด้วย `Expected: 200 / Received: 403` · **บัญชีบทบาทเดียวทุกบัญชีไม่กระทบ** ซึ่งเป็นสิ่งที่ทำให้มันเป็นมัตแตนต์ของแถวสองบทบาทโดยเฉพาะ · เป็นตัวเดียวในชุดนี้ที่ออกไปแก้ไฟล์นอกตั๋ว เพราะการเลือกบทบาทโดยปริยายตัดสินอยู่ที่โค้ดร่วมของ #10 ไม่ได้ตัดสินในเส้นทางของ #23 มัตแตนต์ที่จำกัดตัวเองอยู่แต่ในไฟล์ของตั๋วจึงพูดถึงแถวนี้ไม่ได้เลย (#123) · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:258` |
| `nolanding` | **ทำอะไร** หน้าไม่พาไปที่ตอนเรียนหลังเปิดรายวิชา ค้างอยู่ที่หน้ารายการ การเปิดสอนยังเกิดขึ้นจริงและ backend ไม่รู้สึกอะไร สิ่งที่หายไปมีอยู่บนหน้าจอที่เดียว | **ฆ่าที่** `23a` **แถว 1** ที่ `waitForDetail` ใน `openSubject` — `Test timeout of 60000ms exceeded` ที่ `support/offerings-screen.js:40` เพราะการอ่าน `GET /api/offerings/:id` ที่การพาไปทำให้เกิด ไม่เคยเกิด **นี่คือ assertion ของแถวนี้เอง ไม่ใช่ของแถวก่อนหน้า** ครึ่งแรกของเกณฑ์ข้อหนึ่งคือ *หน้าจอพาไปที่หน้าตอนเรียนทันที* และการรออ่านรายละเอียดคือที่ที่แถวนี้สังเกตมัน · **ถูกเล็งใหม่** เพราะ #140 เปลี่ยน `await load()` เป็น `load(() => onScreen.current === load)` กวาดใหม่เมื่อ 17 ก.ย. 2569 ได้ **ล้ม 1 ไม่ได้รัน 5** ที่แถว 1 ตัวเลขเดียวกับการกวาดซ้ำของ #139 และ **ล้ม 1 ผ่าน 6** ในบันทึกของ #144 · มันแก้ซอร์สของ CRA อย่าใส่ขณะที่ e2e กำลังรันหรือ frontend ของ dev ยังขึ้นอยู่ · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:222` กับ `docs/acceptance/23-offerings.md:468` |
| `noconfirm` | **ทำอะไร** ปุ่มลบตอนเรียนลบทันทีโดยไม่ถาม | **ฆ่าที่** `23a` **แถว 8 ตัวแรก** ที่ assertion ว่ากล่องยืนยันต้องปรากฏ — นี่คือมัตแตนต์ของครึ่ง *ถามก่อน* ซึ่งเทสต์ที่ดูแค่ว่าสุดท้ายแล้วตอนเรียนหายจะไม่เห็น · มันแก้ซอร์สของ CRA อย่าใส่ขณะที่ e2e กำลังรัน · หนึ่งในเก้าตัวที่เป็นของแถวเบราว์เซอร์ล้วนๆ ซึ่งเกิดจากการตรวจซ้ำหลัง `/code-review` ที่พบว่าแถว ⚙ สิบเอ็ดแถวมีมัตแตนต์ของตัวเองเพียงสองแถว ที่เหลืออาศัยว่าสเปคไฟล์นั้นมีมัตแตนต์ตัวหนึ่งตายอยู่แล้ว ซึ่งไม่ใช่หลักฐานของแถวนั้น (#83) เดินเมื่อ 22 ส.ค. 2569 · ที่มา `docs/acceptance/23-offerings.md:237` |
"""

from harness import main

FILES = {
    "routes": "backend/routes/offerings.js",
    "acting": "backend/auth/authorise.js",
    "page": "frontend/src/pages/Offerings.js",
}

MUTANTS = {
    # The inherited constraint: a section number unique across the whole
    # system. Kills the half of criterion three that says the same number may
    # exist under two different subjects, and leaves the half everybody thinks
    # of - the same number twice under one Offering - still passing. A test
    # written for only the second half would call this schema correct.
    "sectionglobal": ("routes",
                      """      const { rows } = await pool.query(
        `INSERT INTO course_sections (semester_course_id, section_number)""",
                      """      const clash = await pool.query(
        `SELECT 1 FROM course_sections WHERE section_number = $1`,
        [number],
      );
      if (clash.rows[0]) {
        return res.status(409).json({ message: REFUSALS.duplicateSectionNumber });
      }

      const { rows } = await pool.query(
        `INSERT INTO course_sections (semester_course_id, section_number)"""),
    # Faculty and department administrators admitted, which is what every
    # screen from #14 to #18 does and what a reader will assume this one does
    # too. Kills the ninth criterion's tests at both seams; the committee's own
    # rows stay green, so nothing but those refusals notices.
    "wideopen": ("routes",
                 "const COMMITTEE = ['PROG_MANAGER'];",
                 "const COMMITTEE = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN', 'FULL_ADMIN', 'TEACHER'];"),
    # `teacherRefusal` made to answer `null` for every list, so nothing is
    # checked before the write. An unknown code then reaches the foreign key and
    # comes back as an unexpected error rather than as the fifth criterion's
    # sentence; a code that is real but suspended is simply *accepted*, which is
    # the quieter half. Kills both rows of the fifth criterion - the one the
    # ticket names as a test, and the suspended-account one written beside it.
    "nocheckteacher": ("routes",
                       "    if (userIds.length === 0) return null;",
                       "    if (userIds.length >= 0) return null;"),
    # The placement asked about after the insert rather than before it, which
    # is the trap #18's `catalogueRefusal` documents: the foreign key raises the
    # same 23503 a protected delete does, so the sixth criterion's refusal
    # becomes an unexpected error. Kills the sixth criterion's test.
    "nocheckplacement": ("routes",
                         "      const notPlaced = await placementRefusal(draft.values.program_id, draft.values.subject_id);\n      if (notPlaced) return res.status(400).json({ message: REFUSALS[notPlaced] });",
                         "      const notPlaced = null;\n      if (notPlaced) return res.status(400).json({ message: REFUSALS[notPlaced] });"),
    # The syllabus guard removed, so the removals go back to trusting that every
    # child of a section refuses through ON DELETE RESTRICT. Five of the six do.
    # `course_syllabus` cascades, so a section with a มคอ.3 and no enrolments
    # deletes cleanly and takes the plan with it - 204, no refusal, no record.
    # This is the mutant that says why that check is asked by name rather than
    # caught from the database.
    "nosyllabus": ("routes",
                   """          if (await hasSyllabus(client, [section.section_id])) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: REFUSALS.sectionInUse });
          }""",
                   """          if (false) {
            await client.query('ROLLBACK');
            return res.status(409).json({ message: REFUSALS.sectionInUse });
          }"""),
    # The catalogue tier dropped from `placementRefusal`, leaving only the
    # pairing. A subject retired in ข้อมูลรายวิชา but still live in the
    # curriculum is then openable from the address bar and re-openable by the
    # copy route every term, while the picker on the same screen hides it.
    "nocatalogue": ("routes",
                    "    return rows[0].catalogued ? null : 'subjectClosed';",
                    "    return null;"),
    # The length check dropped, so an eleventh character reaches the column and
    # raises 22001 - neither the 23505 the duplicate case catches nor the 23503
    # the removals catch - and an ordinary typing mistake comes back a 500.
    "nolength": ("routes",
                 "  if (!number || number.length > 10) return null;",
                 "  if (!number) return null;"),
    # The teacher assignment made additive rather than a replacement: the
    # existing rows are kept and the submitted ones added. Every request the
    # screen makes still succeeds and the server still answers 200, so nothing
    # at the HTTP surface that merely asserts a teacher *is* assigned notices.
    # What dies is the browser row that un-ticks somebody and expects them gone
    # - `23a`'s row 4, second half - and the backend row that assigns two and
    # then one. This is the mutant that says why the fourth criterion is worded
    # "and reassigned afterwards".
    "additive": ("routes",
                 "    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);\n    for (const userId of userIds) {",
                 "    for (const userId of userIds) {"),
    # The section create made idempotent: a number already used under this
    # Offering updates the row it collides with and answers 201. Every count on
    # the screen stays right - there is still one ตอนเรียน 1 - so a test that
    # only counts the cards is happy. What is lost is the refusal itself, and
    # with it the person's chance to learn that the number is taken.
    "dupupsert": ("routes",
                  """        `INSERT INTO course_sections (semester_course_id, section_number)
         VALUES ($1, $2) RETURNING section_id`,
        [offering.id, number],""",
                  """        `INSERT INTO course_sections (semester_course_id, section_number)
         VALUES ($1, $2)
         ON CONFLICT (semester_course_id, section_number)
         DO UPDATE SET section_number = EXCLUDED.section_number
         RETURNING section_id`,
        [offering.id, number],"""),
    # The replacement half of `writeTeachers` kept and the writing half dropped,
    # so an assignment clears the section and puts nobody back. The request
    # still answers 200 with a section in it, which is why this is a browser
    # row: the screen is the only place the empty card is visible.
    "noassign": ("routes",
                 """    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);
    for (const userId of userIds) {""",
                 """    await executor.query(`DELETE FROM course_sections_teacher WHERE section_id = $1`, [sectionId]);
    for (const userId of []) {"""),
    # The copy reproduces the Offerings and not the ตอนเรียน under them. The
    # report still says how many subjects were opened, and the term looks
    # copied from the list - it is one screen further in that the term turns
    # out to have nothing anybody can be enrolled in.
    "nocopysections": ("routes",
                       "          for (const section of sections.rows) {",
                       "          for (const section of []) {"),
    # The second and third outcomes of a copy collapsed into one: subjects
    # already open are still skipped, and no longer named. Pressing คัดลอก twice
    # then reports nothing at all the second time, which reads as a copy that
    # did nothing rather than a copy that found the work already done.
    "nocopyreport": ("routes",
                     """            report.skipped_existing.push(row.subject_id);
            continue;""",
                     """            continue;"""),
    # The 23503 catch on the Offering removal dropped, so the eighth
    # criterion's refusal becomes an unexpected error. The row is still there
    # afterwards - the database saw to that - but what the person is told is the
    # generic failure sentence, not the reason, and nothing on the screen says
    # the term is protected rather than broken.
    "norestrictcatch": ("routes",
                        """        if (isReferenced(error)) {
          return res.status(409).json({ message: REFUSALS.offeringInUse });""",
                        """        if (false) {
          return res.status(409).json({ message: REFUSALS.offeringInUse });"""),
    # The reach clause dropped from the list, leaving the three filters the
    # screen sends. Every account still has to be a committee member to get
    # here, so `wideopen`'s rows stay green; what breaks is the other half of
    # the ninth criterion - a committee member seeing a term that belongs to
    # somebody else's หลักสูตร.
    "anyprogram": ("routes",
                   """      const reach = await coveredScopes(pool, req.auth.acting.scope_id);
      const { page, perPage, offset } = pageOf(req);""",
                   """      const reach = null;
      const { page, perPage, offset } = pageOf(req);"""),
    # The acting grant of an account that has never chosen taken as the least
    # senior rather than the most senior. Every single-role account is
    # unaffected, which is what makes this the mutant for the multi-role row:
    # the committee member who also teaches arrives as a teacher and is refused
    # by their own screen.
    "firstrole": ("acting",
                  "  ) ?? roles[0];",
                  "  ) ?? roles[roles.length - 1];"),
    # The create leaves the person on the list instead of opening the new
    # Offering's sections. The Offering is made either way and the banner still
    # says so, so nothing at the HTTP surface notices; what is lost is the
    # first criterion's second half, that an Offering with no ตอนเรียน is not
    # yet anything a teacher can reach and the next step is always to add one.
    # Measured on 17 September 2569 (#139): with no read of the Offering at all,
    # row 1 dies at `openSubject`'s wait for that read, not at its assertion.
    # `139:offeringscreatedasksnothing` reads and does not draw, and dies at it.
    "nolanding": ("page",
        "      if (showing.current === sent) {\n"
        "        waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n"
        "      }\n"
        "      const drawing = onScreen.current\n"
        "      await drawing(() => onScreen.current === drawing)\n"
        "      if (mine) await refresh(offering.id, ask)\n",
        "      if (showing.current === sent) {\n"
        "        waiting.current = { of: readOf(onPage.current, program, year, semester), said }\n"
        "      }\n"
        "      const drawing = onScreen.current\n"
        "      await drawing(() => onScreen.current === drawing)\n"),
    # The confirmation dropped from the section removal: the button on the card
    # deletes. This is the mutant for the half of the eighth criterion that is
    # about being asked - a screen that removes on the first press passes every
    # test that only checks the section is gone afterwards.
    "noconfirm": ("page",
                  """          onRemoveSection={section => {
            setNotice(null)
            setRemoving({ kind: 'section', section })
          }}""",
                  """          onRemoveSection={section => {
            setNotice(null)
            onSection(() => deleteSection(viewing.id, section.section_id))
          }}"""),
}

main(FILES, MUTANTS)
