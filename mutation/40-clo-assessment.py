# -*- coding: utf-8 -*-
r"""
#40 การประเมินผลการเรียนรู้ - the formal assessment table and its PDF.

Sixteen mutants, all of them in the browser. The route and the arithmetic are
covered at the HTTP seam - `backend/test/clo-assessment.test.js` holds both
thresholds from both sides, the agreement with #38, and the refusals - so
breaking any of that would fail the backend suite rather than `40a`.

What is left is what only exists in front of the screen, and on this one that
is unusually load-bearing: the output is a **document somebody files**. Half
the mutants below are therefore about whether the paper still says what it
means once it leaves the application - a verdict that is only a colour, a rule
that is only implied, a font that is named but not carried.

    python mutation/40-clo-assessment.py save
    python mutation/40-clo-assessment.py <mutant>
    python mutation/40-clo-assessment.py restore

Killing them:

    cd e2e && npx playwright test 40a-clo-assessment

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `unmeasuredoutcomenotlisted` | **ทำอะไร** รายงานตัดข้อที่ยังไม่มีใครถูกวัดออกจากตาราง ซึ่งเป็นข้อที่ผู้สอนต้องเห็นก่อนปลายภาคพอดี ตารางที่มีแปดแถวเงียบ ๆ ทั้งที่รายวิชามีเก้าข้อ คือรูปของความผิดที่อ่านแล้วเหมือนถูก | **ฆ่าที่** แถว 3 **ตัวเดียว** — **คอมเมนต์เดิมอ้างแถว 1 กับ 3 และรอบกวาดหักทิ้ง** เพราะทุกข้อใน seed ถูกวัดหมดแล้ว ตัวกรองจึงไม่ตัดอะไรออก และแถว 1 ที่นับแถวเทียบกับคำตอบก็ยังเห็นเลขสองตัวตรงกัน มีแต่แถว 3 ที่สร้างข้อที่ยังไม่ถูกวัดขึ้นมาก่อนจึงบอกได้ · ที่มา `docs/acceptance/40-clo-assessment-report.md:239` |
| `onerowmissingfromthetable` | **ทำอะไร** ตัดแถวแรกของตารางทิ้งโดยไม่มีเงื่อนไข ไม่ใช่การตัดข้อที่ไม่มีคะแนนอย่างตัวข้างบน ซึ่ง seed บอกไม่ได้ | **ฆ่าที่** แถว 1 กับ 2 — **เกิดขึ้นเพราะรอบกวาดพบว่าข้ออ้างนั้นไม่มีอะไรค้ำ**: ครึ่ง *หนึ่งแถวต่อหนึ่งข้อ ครบทุกข้อ* ของแถว ⚙ ข้อ 1 ถูกอ้างโดยตัวข้างบนซึ่งฆ่าแถว 3 ตัวเดียว และ *แถวตรวจรับที่อ้างสองอย่างต้องถูกทุบทั้งสองอย่าง ไม่งั้นเป็น ⚙ ที่ได้มาครึ่งเดียว* · มันพาแถว 2 ไปด้วย **ไม่ใช่อุบัติเหตุ** แถวที่ถูกตัดคือของ CLO-1 ซึ่งเป็นข้อที่แถว 2 ทำให้ไม่ผ่านโดยเจตนาแล้วอ่านคำตัดสินของมัน · ที่มา `docs/acceptance/40-clo-assessment-report.md:178` |
| `fractionsayseverybodypassed` | **ทำอะไร** เศษส่วนอ่านจำนวนผู้เรียนของข้อนั้นทั้งสองข้าง ทุกแถวจึงขึ้นว่า *57 / 57* และทุกข้อดูเป็นเอกฉันท์ ร้อยละข้าง ๆ ยังถูก ซึ่งคือสิ่งที่ทำให้สายตาคนจับไม่ได้: เลขสองตัวขัดกัน และผิดแค่ตัวเดียว | **ฆ่าที่** แถว 1 · **เป็นหนึ่งในสองตัวที่หลุดสมอตอนรัน prettier กับ `CloAssessment.js`** (ไฟล์เดียวในโปรเจกต์ที่ยังไม่ผ่าน) ซึ่งขยับย่อหน้าในตัวตาราง ปักใหม่แล้วและกวาดทั้งสิบหกตัวซ้ำ — บทเรียนคือสมอผูกกับย่อหน้า ตัวจัดรูปแบบจึงเป็นเรื่องของชุดมัตแตนต์ด้วย · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` กับ `docs/acceptance/40-clo-assessment-report.md:250` |
| `criterionsentenceisaliteral` | **ทำอะไร** คอลัมน์เกณฑ์เลิกวาดจากกฎ แล้วพิมพ์ค่าคงที่ — เลขที่กฎถืออยู่วันนี้พอดี ทุกอย่างบนจอยังถูก และประโยคเลิกผูกกับสิ่งที่มันบรรยายไปเงียบ ๆ: ขยับ `PASS` แล้วคอลัมน์นี้ยังอ้างว่าสาม | **ฆ่าที่** แถว 1 — แถวนั้นยืนยันประโยคเทียบกับ `body.rule` ซึ่งประโยคที่ฝังค่าไว้สนองได้เฉพาะตอนที่สองฝั่งยังตรงกัน · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `criterionshareisaliteral` | **ทำอะไร** สัดส่วนในประโยคเลิกเป็นของกฎ รูปเดียวกับตัวข้างบน ถัดไปหนึ่งเส้น และตัวนี้สำคัญกว่าบนกระดาษ: รายงานที่อ้างว่าต้องการร้อยละเจ็ดสิบ ขณะที่คำตัดสินข้าง ๆ ตัดสินที่หกสิบ คือเอกสารที่บิดวิธีของตัวเอง | **ฆ่าที่** แถว 1 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `verdictisonlyacolour` | **ทำอะไร** คำตัดสินเหลือเป็นสีอย่างเดียว บนจอมันยังอ่านได้ในความหมายที่คนรู้ธรรมเนียมแยกแดงจากเขียวออก — และวินาทีที่รายงานนี้ถูกพิมพ์ขาวดำ หรือถูกอ่านโดยคนที่ไม่รู้ธรรมเนียม หรือถูกอ่านออกเสียง มันไม่บอกอะไรเลย | **ฆ่าที่** แถว 2 กับ 3 — **คอมเมนต์เดิมอ้างแถว 2 และรอบกวาดเติมแถว 3 ให้** ซึ่งไม่ใช่อุบัติเหตุของเทสต์: แถว 3 เป็นเรื่องของคำที่สาม *ยังไม่ประเมิน* ซึ่งไม่มีสีไหนเคยสื่อได้ ทั้งสองแถวอ่านคำเพราะคำคือคำกล่าวอ้าง · **และเป็นอีกตัวที่หลุดสมอตอนรัน prettier** ปักใหม่แล้ว · ที่มา `docs/acceptance/40-clo-assessment-report.md:241` กับ `docs/acceptance/40-clo-assessment-report.md:250` |
| `criterionsaysnotlessthan` | **ทำอะไร** เกณฑ์เขียนว่า *ไม่น้อยกว่า* ตรงที่กฎว่า *มากกว่า* คำเดียว และบรรยายกฎอีกข้อหนึ่ง: BR-17 เข้ม ข้อที่ได้ร้อยละหกสิบพอดีจึงไม่ผ่าน — ประโยคนี้จะบอกคนอ่านว่าผ่าน พิมพ์อยู่ข้างคำตัดสินที่บอกตรงข้าม บนเอกสารที่ถูกเก็บเป็นหลักฐาน นั่นคือรายงานบิดวิธีของตัวเอง | **ฆ่าที่** แถว 1 — **เกิดขึ้นเพราะรีวิวสองแกนพบว่าคำว่า *มากกว่า* ไม่เคยถูกยืนยัน**: `40a` อ่านแค่ substring `ร้อยละ 60` ทั้งที่ `bands.js` เขียนไว้เองว่า *มากกว่า* กับ *ไม่น้อยกว่า* คนละกฎกัน แก้เป็นยืนยันทั้งประโยคแล้วจึงเพิ่มตัวนี้ · ที่มา `docs/acceptance/40-clo-assessment-report.md:182` |
| `unmeasuredreadsasfailed` | **ทำอะไร** ข้อที่ยังไม่มีใครถูกวัดถูกรายงานว่า ไม่ผ่าน สองสถานะตรงที่มีสาม และการยุบไปทางกล่าวหา: รายงานบอกว่าผู้สอนทำผลการเรียนรู้ข้อนั้นไม่ได้ ทั้งที่ภาคเรียนยังไม่ไปถึง นี่คือสิ่งที่หน้าจอที่เขียนด้วย boolean ทำ | **ฆ่าที่** แถว 3 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `failingoutcomesnotnamed` | **ทำอะไร** ข้อที่ไม่ผ่านเลิกถูกเอ่ยชื่อไว้ข้างล่าง มันยังอยู่ในตารางพร้อมชิปแดง ผู้สอนที่อ่านละเอียดจึงหาเจอ — ซึ่งเป็นสิ่งที่ #38 ตัดสินไว้ว่าจะไม่พึ่ง ตอนที่มันเลือกเอ่ยชื่อข้อที่ต้องดูแล แทนที่จะปล่อยให้สีทำหน้าที่ | **ฆ่าที่** แถว 4 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `pdffontnamedbutnotembedded` | **ทำอะไร** PDF เรียกชื่อ TH Sarabun โดยไม่พาฟอนต์ไปด้วย ไฟล์ดาวน์โหลดได้ เปิดได้ ชื่อถูก ตารางถูก — และวาดกล่องแทนตัวอักษรไทยทุกตัวบนเครื่องอ่านที่ไม่ได้ติดตั้งฟอนต์นั้นไว้ มันดูสมบูรณ์แบบบนเครื่องที่สร้างมัน ซึ่งคือรูปของความล้มเหลวนี้ | **ฆ่าที่** แถว 5 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `rubricalwaysopen` | **ทำอะไร** สี่แถบออกมาจากหลังแผ่นพับ แล้วกางอยู่บนหน้า ไม่มีตัวเลขไหนผิด สิ่งที่ผิดคือการอ่าน — ประโยครูบริกสี่ประโยคข้างร้อยละ ชวนให้คนอ่านทุกคนเชื่อว่าประโยคพวกนั้นผลิตมันขึ้นมา และไม่มีประโยคไหนทำ | **ฆ่าที่** แถว 6 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `pdffilenamesaysnothing` | **ทำอะไร** ไฟล์ชื่อเดิมทุกครั้ง ดาวน์โหลดได้ เปิดได้ ถูกต้องทั้งฉบับ — และแฟ้มรายวิชาที่เก็บแบบนี้ปีละหนึ่งใบต่อตอนเรียน กลายเป็นโฟลเดอร์ของเอกสารที่แยกกันได้ด้วยการเปิดทีละใบเท่านั้น โดยเบราว์เซอร์เติม (1) (2) (3) ให้ไม่ทับกัน | **ฆ่าที่** แถว 5 — **เกิดขึ้นเพราะการตรวจว่าแถว ⚙ ทุกแถวมีมัตแตนต์ค้ำจริงจับได้ว่าแถวเรื่องชื่อไฟล์ติด ⚙ ไว้ทั้งที่ไม่มีมัตแตนต์ตัวไหนแตะชื่อไฟล์** และ assertion เดิมอ่านแค่รูป `assessment-.+\.pdf` ซึ่งมัตแตนต์ตัวนี้สนองได้ทั้งหมด — ชื่อที่ไม่มีรหัสวิชา เลขตอนเรียน หรือปีเลยก็ผ่าน แก้เป็นเทียบชื่อทั้งชื่อกับค่าจากคำตอบแล้วจึงเพิ่มตัวนี้ · ที่มา `docs/acceptance/40-clo-assessment-report.md:260` |
| `refusalkeepsloading` | **ทำอะไร** หน้าจอเลิกเคลียร์ `loading` เมื่อการอ่านถูกปฏิเสธ ผู้สอนที่พิมพ์ที่อยู่ของตอนเรียนอื่นจึงอ่านคำปฏิเสธคู่กับ *กำลังโหลดข้อมูล…* ใต้มัน ตลอดไป | **ฆ่าที่** แถว 8 — **เกิดขึ้นเพราะการตรวจเดียวกันจับได้ว่าแถวเรื่องการปฏิเสธตอนเรียนของคนอื่นติด ⚙ ไว้โดยไม่มีมัตแตนต์เลย** · นี่คือข้อบกพร่องที่การเดินของ #43 เจอ และ **ไม่ใช่มัตแตนต์ตัวเดียวครอบหลายหน้าจอ**: การแก้คือหนึ่งบรรทัดใน `finally` ของแต่ละหน้า และการเดินเจอมันบนสองหน้าจอแยกกัน #36 #37 กับ #39 จึงต่างมีตัวชื่อเดียวกันของตัวเอง · ที่มา `docs/acceptance/40-clo-assessment-report.md:261` |
| `emptystatenevershown` | **ทำอะไร** ตอนเรียนที่ยังไม่มีใครถูกให้คะแนนได้ตารางไปด้วย: เก้าข้อ ทุกช่องเป็นขีด ไม่มีประโยคบอกว่าทำไม เป็นรายงานที่ชวนให้คนไปหาความหมายในข้อเท็จจริงว่าภาคเรียนยังไม่เริ่ม | **ฆ่าที่** แถว 7 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
| `rubricofferedwithnorubric` | **ทำอะไร** เอาด่าน `!data.no_outcomes` ออก แผ่นพับรูบริกจึงกลับมาขึ้นบนรายวิชาที่ไม่มีผลการเรียนรู้เลย ซึ่งมันเปิดออกมาเป็นกล่องเปล่า | **ฆ่าที่** แถว 9 · **เป็นสิ่งที่การเดินด้วยมือของ #40 เจอ และเป็นตัวเดียวในชุดที่มีอยู่ได้เพราะคนเห็น ไม่ใช่เพราะเทสต์เห็น** — ทุกแถวอัตโนมัติถามว่าแผ่นพับ*ทำงานไหม* และมันทำงานสมบูรณ์แบบ กับความว่างเปล่า รูปเดียวกับที่การเดินของ #43 เจอหนึ่งหน้าจอถัดไป คือตัวควบคุมที่ตอบว่าไม่มีอะไร ยื่นให้คนที่ต้องกดก่อนถึงจะรู้ · มันมาจาก**รอบกวาดครั้งที่สอง** (4 ก.ย. 2569 หลังเดินด้วยมือ) · ที่มา `docs/acceptance/40-clo-assessment-report.md:246` |
| `exportofferedwithnothingtoexport` | **ทำอะไร** ปุ่มส่งออกยังกดได้ทั้งที่ไม่มีอะไรให้ส่งออก และยื่น PDF ของตารางที่เป็นขีดทั้งใบ — เอกสารที่จะไปอยู่ในแฟ้มรายวิชาและไม่บอกอะไรเลย นอกจากว่ามีใครกดปุ่มหนึ่ง | **ฆ่าที่** แถว 7 · รอบกวาด 4 ก.ย. 2569 บันทึกไว้ว่า **ทุกตัวฆ่าแถวที่มันบอกไว้** และกวาดทั้งสิบหกตัวซ้ำอีกครั้งหลัง prettier ปักสมอใหม่สองตัว · ที่มา `docs/acceptance/40-clo-assessment-report.md:236` กับ `docs/acceptance/40-clo-assessment-report.md:252` |
"""

from harness import main

FILES = {
    "screen": "frontend/src/pages/CloAssessment.js",
    "pdf": "frontend/src/components/results/assessmentPdf.js",
    "bands": "frontend/src/lib/bands.js",
}

MUTANTS = {
    # The report drops the outcomes nobody has been marked on. They are exactly
    # the outcomes a ผู้สอน needs to see before the term ends, and a table that
    # quietly holds eight rows where the รายวิชา has nine is the one shape of
    # wrong that reads as right.
    #
    # This was written claiming rows 1 and 3, and the sweep said row 3 alone.
    # The reason is the seed: every outcome in it has been marked, so the
    # filter removes nothing and row 1 - which counts the rows drawn against
    # the answer's own list - sees two numbers that still agree. Only row 3,
    # which builds an unmeasured outcome first, can tell. Kills row 3.
    "unmeasuredoutcomenotlisted": (
        "screen",
        "                    {data.clos.map(clo => (",
        "                    {data.clos.filter(one => one.student_count > 0).map(clo => (",
    ),
    # One outcome is missing from the table. Not the outcomes with no marks -
    # that is the mutant above, and the seed cannot tell - but a row dropped
    # unconditionally, which is what row 1's count of drawn rows against the
    # answer's own list is for.
    #
    # It is here because the sweep found that assertion unproved: the mutant
    # above was written claiming it and killed only row 3. An acceptance row
    # naming two things needs both broken, or it is a ⚙ half earned.
    #
    # It takes row 2 with it, and not by accident: the row it drops is CLO-1's,
    # which is the outcome row 2 fails on purpose and then reads the verdict of.
    # Kills rows 1 and 2.
    "onerowmissingfromthetable": (
        "screen",
        "                    {data.clos.map(clo => (",
        "                    {data.clos.slice(1).map(clo => (",
    ),
    # The fraction reads the outcome's own student count on both sides, so every
    # row says *57 / 57* and every outcome looks unanimous. The percentage
    # beside it is still right, which is what makes this survivable by eye: two
    # numbers that disagree, and only one of them is wrong. Kills row 1.
    "fractionsayseverybodypassed": (
        "screen",
        "                          {clo.passed_count} / {clo.student_count}",
        "                          {clo.student_count} / {clo.student_count}",
    ),
    # The criterion column stops being drawn from the rule and states a literal
    # instead - the exact number the rule happens to carry today. Everything on
    # screen is correct, and the sentence has quietly stopped being tied to the
    # thing it describes: move `PASS` and this column goes on claiming three.
    #
    # It is here because the row asserts the sentence against `body.rule`, which
    # a hard-coded sentence satisfies only while the two agree. Kills row 1.
    "criterionsentenceisaliteral": (
        "bands",
        "  `คะแนน ≥ ${rule.pass_score.toFixed(2)} จาก ${rule.scale}`,",
        "  `คะแนน ≥ 4.00 จาก 5`,",
    ),
    # The share in the sentence stops being the rule's. Same shape as the mutant
    # above, one threshold over, and this is the one that matters more on paper:
    # a report claiming it required seventy per cent while the verdicts beside it
    # were decided at sixty is a document that misrepresents its own method.
    # Kills row 1.
    "criterionshareisaliteral": (
        "bands",
        "  `ผู้ผ่านมากกว่าร้อยละ ${rule.pass_percent} ของผู้มีคะแนน`,",
        "  `ผู้ผ่านมากกว่าร้อยละ 70 ของผู้มีคะแนน`,",
    ),
    # The verdict becomes a colour and nothing else. On screen it still reads,
    # in the sense that a person who knows the convention can tell red from
    # green - and the moment this report is printed in monochrome, or read by
    # somebody who does not know the convention, or read aloud, it says
    # nothing at all.
    #
    # It kills row 3 as well, and that is not an accident of the tests: row 3
    # is about the third verdict, ยังไม่ประเมิน, which is a state no colour has
    # ever been able to carry. Both rows read the word because the word is the
    # claim. Kills rows 2 and 3.
    "verdictisonlyacolour": (
        "screen",
        "                            {verdictLabel(clo.passed)}\n"
        "                          </span>",
        "                            {'\\u00a0'}\n"
        "                          </span>",
    ),
    # The criterion says *ไม่น้อยกว่า* where the rule is *มากกว่า*. One word, and
    # it describes a different rule: BR-17 is strict, so an outcome at exactly
    # sixty per cent fails - and this sentence would tell a reader it passed,
    # printed beside a verdict that says otherwise. On a document filed as
    # evidence, that is the report misrepresenting its own method.
    # Kills row 1.
    "criterionsaysnotlessthan": (
        "bands",
        "  `ผู้ผ่านมากกว่าร้อยละ ${rule.pass_percent} ของผู้มีคะแนน`,",
        "  `ผู้ผ่านไม่น้อยกว่าร้อยละ ${rule.pass_percent} ของผู้มีคะแนน`,",
    ),
    # An outcome nobody has been measured on is reported as ไม่ผ่าน. Two states
    # where there are three, and the collapse goes the accusing way: the report
    # says the ผู้สอน failed to deliver an outcome that the term simply has not
    # reached. This is what a screen written with a boolean does. Kills row 3.
    "unmeasuredreadsasfailed": (
        "bands",
        "  if (passed === null || passed === undefined) return 'ยังไม่ประเมิน'",
        "  if (false) return 'ยังไม่ประเมิน'",
    ),
    # The outcomes that did not pass stop being named underneath. They are still
    # in the table with a red chip, so a ผู้สอน reading carefully finds them -
    # which is exactly what #38 decided not to rely on when it listed the
    # outcomes needing attention instead of leaving them to the colours.
    # Kills row 4.
    "failingoutcomesnotnamed": (
        "screen",
        "              {failing.length > 0 && (",
        "              {false && (",
    ),
    # The PDF names TH Sarabun without carrying it. The file downloads, opens,
    # has the right name and the right table - and draws a box for every Thai
    # glyph on any reader that does not happen to have the face installed.
    # It looks perfect on the machine that made it, which is the failure mode.
    # Kills row 5.
    "pdffontnamedbutnotembedded": (
        "pdf",
        "  doc.addFileToVFS('THSarabun-normal.ttf', THSarabun)\n"
        "  doc.addFont('THSarabun-normal.ttf', FAMILY, 'normal')\n"
        "  doc.addFileToVFS('THSarabun-bold.ttf', THSarabunBold)\n"
        "  doc.addFont('THSarabun-bold.ttf', FAMILY, 'bold')",
        "",
    ),
    # The four bands come out from behind the disclosure and sit open on the
    # page. Nothing is wrong with any figure; what is wrong is the reading -
    # four rubric sentences next to a percentage invite every reader to believe
    # the sentences produced it, and none of them did. Kills row 6.
    "rubricalwaysopen": (
        "screen",
        "              {showRubric && (",
        "              {true && (",
    ),
    # The file is called the same thing every time. It downloads, it opens, it
    # is entirely correct - and a course file collecting one of these per
    # ตอนเรียน per year ends up a folder of documents distinguishable only by
    # opening each one, with the browser appending (1), (2), (3) to keep them
    # apart.
    #
    # It is here because the row's first version asserted the *shape*
    # `assessment-.+\.pdf`, which this mutant would have satisfied completely.
    # The row now holds the whole name against the answer's own values.
    # Kills row 5.
    "pdffilenamesaysnothing": (
        "pdf",
        "    `assessment-${subject.subject_id}-sec${section.section_number}-${section.academic_year}.pdf`",
        "    'assessment.pdf'",
    ),
    # The screen stops clearing `loading` when the read is refused, so a ผู้สอน
    # who types another ตอนเรียน's address reads the refusal with
    # *กำลังโหลดข้อมูล…* under it, for ever.
    #
    # This is the defect #43's hand-walk found. It is not one mutant covering
    # several screens: the fix is one line inside each page's own `finally`,
    # and the walk found it on two screens separately, so each screen earns its
    # own row and its own mutant. #36, #37 and #39 carry one of these too.
    # Kills row 8.
    "refusalkeepsloading": (
        "screen",
        "      if (isCurrent()) setLoading(false)\n"
        "    }",
        "    }",
    ),
    # A ตอนเรียน with nothing marked gets the table anyway: nine outcomes, every
    # figure an em dash, no sentence saying why. It is a report inviting a
    # person to look for meaning in the fact that term has not started.
    # Kills row 7.
    "emptystatenevershown": (
        "screen",
        "          ) : data.empty ? (",
        "          ) : false ? (",
    ),
    # The rubric disclosure comes back on a รายวิชา that has no outcomes at
    # all, where it opens onto an empty box. This is what #40's hand-walk
    # found, and it is the one defect on the sheet that no assertion could
    # have caught: every automated row asked whether the disclosure *worked*,
    # and it worked perfectly - on nothing.
    #
    # It is the shape of #43's finding one screen over: a control that answers
    # nothing, offered to a person who has to press it to learn that. The
    # sentence above it already said the useful thing. Kills row 9.
    "rubricofferedwithnorubric": (
        "screen",
        "          {!data.no_outcomes && (",
        "          {true && (",
    ),
    # The export stays pressable with nothing to export, and hands over a PDF of
    # a table of dashes - a document that would go in a course file and say
    # nothing except that somebody pressed a button. Kills row 7.
    "exportofferedwithnothingtoexport": (
        "screen",
        "              disabled={data.empty || data.no_outcomes}",
        "              disabled={false}",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
