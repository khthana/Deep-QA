# -*- coding: utf-8 -*-
"""#242 สี่ฟอร์มที่ปิดช่องของตัวเองด้วยธงของหน้า

    python mutation/242-the-form-that-sent-nothing.py save
    python mutation/242-the-form-that-sent-nothing.py <mutant>
    python mutation/242-the-form-that-sent-nothing.py restore

แถวที่ถูกฆ่าอยู่ใน `e2e/tests/242a-the-form-that-sent-nothing.spec.js`

    cd e2e && npx playwright test tests/242a-the-form-that-sent-nothing.spec.js
เก้าแถว — สองแถวต่อจอ และแถวคำปฏิเสธอีกหนึ่งแถวบนจอผลการเรียนรู้ · ใบ
`docs/acceptance/18-program-subjects.md`, `19-programme-learning-outcomes.md`,
`21-rubrics.md` และ `22-rubric-criteria.md`

## สิ่งที่ตั๋วนี้เป็น

#228 ตัดสินเมื่อ 26 ต.ค. 2569 ว่าธงที่ปิดช่องของฟอร์มเป็นธง**ของฟอร์มเอง** และ
เปลี่ยนสามจอในวันนั้น เหตุผลที่เจ้าของงานให้เป็นประโยคที่พูดถึงสามจอนั้นและเงียบ
เรื่องสี่จอนี้ ซึ่งคือประชากรของตั๋วนี้ (#141, #223, #222) ทางเข้าไม่ต้องแข่งกับใคร:
`save` ปล่อย `writing` ลงใน `finally` ที่รัน**หลัง**การอ่านรายการใหม่ และ เพิ่ม…
ไม่มีธงอะไรปิดเลย จึงเป็นข้อบกพร่องที่คนพบได้วันนี้ ไม่ใช่คำถามของเจ้าของงาน

## มัตแตนต์

ห้าตัวต่อจอ (จอผลการเรียนรู้หกตัว) เพราะแถวรายงานข้อยืนยัน**ตัวแรก**ที่ตาย ข้ออ้าง
ที่เขียนใต้ข้ออ้างอื่นจึงไม่มีอะไรพิสูจน์ถ้าไม่มีมัตแตนต์ของตัวเอง (#88)

| ชื่อ | สิ่งที่มันทำ | สิ่งที่มันฆ่า |
|---|---|---|
| `pstypelive` | เอา `disabled={sending}` ออกจากช่องประเภทวิชาของ `ProgramSubjectForm.js` — คือโค้ดที่ตั๋ววินิจฉัยไว้ เขียนให้รันได้ (#115) | ข้ออ้างที่ 1 ของแถวแรก (รายวิชาในหลักสูตร) |
| `psstatuslive` | เอาออกจากช่องสถานะของแฟ้มเดียวกัน | ข้ออ้างที่ 2 ของแถวแรก |
| `pspagewide` | ให้ `sending` ทั้งแฟ้มอ่าน `busy` คือรูปก่อนตั๋วนี้เป๊ะ ๆ ทุกตัวควบคุมถือธงของหน้า | ข้ออ้างที่ 3 ของแถวแรก — ฟอร์มที่ไม่ได้ส่งอะไร |
| `psformclosed` | เอา `showing.current === sent` ออกจาก `setEditing(null)` ใน `ProgramSubjects.js` | ข้ออ้างที่ 1 ของแถวที่สอง — ฟอร์มที่คำตอบไม่ได้ถูกส่งมาจากยังอยู่ |
| `pssentencesaid` | เอาการ์ดออกจากบรรทัดที่ส่งต่อประโยคว่าสำเร็จ | ข้ออ้างสุดท้ายของแถวที่สอง — ไม่มีใครพูดอะไร |
| `plonamedlive` | เช่นเดียวกับ `pstypelive` ที่ช่องชื่อผลการเรียนรู้ของ `PloForm.js` | ข้ออ้างที่ 1 ของแถวผลการเรียนรู้ |
| `plotypelive` | ที่ช่องประเภทของแฟ้มเดียวกัน | ข้ออ้างที่ 2 |
| `plopagewide` | เช่นเดียวกับ `pspagewide` | ข้ออ้างที่ 3 |
| `ploformclosed` | เอาการ์ดออกจากบล็อกที่ปิดฟอร์มใน `Plos.js` | ข้ออ้างที่ 1 ของแถวที่สอง |
| `plosentencesaid` | เอาการ์ดออกจากบรรทัดที่ส่งต่อประโยค | ข้ออ้างสุดท้ายของแถวที่สอง |
| `ploreported` | เอาการ์ดออกจาก `report(error)` ใน `catch` | แถวที่สาม — คำปฏิเสธที่ไม่ได้พูดทับฟอร์มอื่น |
| `rubcodelive` | เอา `disabled={sending}` ออกจากช่องรหัสของ `RubricForm.js` | ข้ออ้างที่ 1 ของแถว Rubric |
| `ruborderlive` | ออกจากช่องลำดับของแฟ้มเดียวกัน | ข้ออ้างที่ 2 |
| `rubpagewide` | เช่นเดียวกับ `pspagewide` | ข้ออ้างที่ 3 |
| `rubformclosed` | เอาการ์ดออกจาก `setEditing(null)` ใน `Rubrics.js` | ข้ออ้างที่ 1 ของแถวที่สอง |
| `rubsentencesaid` | เอาการ์ดออกจากบรรทัดที่ส่งต่อประโยค | ข้ออ้างสุดท้ายของแถวที่สอง |
| `critweightlive` | เอา `disabled={sending}` ออกจากช่องน้ำหนักของ `CriterionForm.js` | ข้ออ้างที่ 1 ของแถวเกณฑ์ |
| `critorderlive` | ออกจากช่องลำดับของแฟ้มเดียวกัน | ข้ออ้างที่ 2 |
| `critpagewide` | เช่นเดียวกับ `pspagewide` | ข้ออ้างที่ 3 |
| `critformclosed` | เอาการ์ดออกจาก `setEditing(null)` ใน `RubricCriteria.js` | ข้ออ้างที่ 1 ของแถวที่สอง |
| `critsentencesaid` | เอาการ์ดออกจาก `setNotice(said)` ในแฟ้มเดียวกัน | ข้ออ้างสุดท้ายของแถวที่สอง |

สี่ตัวที่ชื่อลงท้าย `pagewide` คือรูปที่ตั๋ววินิจฉัย — ทุกตัวควบคุมอ่านธงของหน้า — ทำให้
รันได้ และวางไว้ที่การประกาศ `sending` ไม่ใช่ที่ช่องใดช่องหนึ่ง เพราะข้ออ้างที่ 3 อ่าน
ช่องของ**ฟอร์มที่เปิดทีหลัง** ซึ่งเป็นคนละตัวควบคุมกับสองช่องที่แถวอ่านก่อนหน้านั้น
(#228 วางมัตแตนต์คู่นี้ที่ช่องเดียวได้ เพราะที่นั่นช่องที่อ่านทั้งสองฝั่งเป็นช่องเดียวกัน)

ไม่มีมัตแตนต์ของ *ยกเลิก* ด้วยเหตุผลของ #228: ตัวที่จะพิสูจน์มันคือ `disabled={busy}`
บน *ยกเลิก* ซึ่งจะฆ่าแถวของแฟ้มอื่นด้วย — `cancelDuringSave` ของ `142a` ชี้สี่จอนี้
ตั้งแต่ตั๋วนี้ — และมัตแตนต์ต้องฆ่าแถวหนึ่งแล้วปล่อยที่เหลือยืนอยู่ได้ (#97) ข้ออ้าง
*ยกเลิก* ยังกดได้ จึงเป็น**ตัวตรวจว่าราคานั้นยังไม่ถูกจ่าย** และสิ่งที่มันค้ำคือการที่
แถวที่สองเดินต่อไปถึงข้ออ้างของตัวเองได้

ที่อ่านสองช่องต่อจอเลือกจาก**มัตแตนต์** ไม่ใช่จากจอ: ทุกจุดที่นี่มีเพื่อนบ้าน ASCII
ที่ไม่ซ้ำให้ยึด (`maxLength`, `step`, `min`, `max`, `set('…_type')`) จึงไม่มีบรรทัดไทย
ให้พิมพ์ใหม่ในสคริปต์นี้เลย (#121, #140)

## ตอนกวาด

แปดแฟ้มนี้อยู่ในสคริปต์อื่นอีกมาก — `18-program-subjects.py`, `19-plos.py`,
`21-rubrics.py`, `22-rubric-criteria.py`, `142-busy-outlives-a-superseded-read.py`,
`202-the-sentence-belongs-to-the-screen-asked.py`,
`203-the-refusal-wins-on-the-admin-screens.py`,
`228-the-form-that-sent-the-save.py` และ `238-the-sentence-and-the-list-it-is-about.py`
เป็นต้น เส้นทางที่ซ้ำกันทำให้การกวาดเสีย จึงเทียบ `FILES` ไม่ใช่เรื่องที่ใบพูดถึง และ
อย่ากวาดใบนี้ข้างสคริปต์เหล่านั้น (#85, #87, #125)

และตั๋วนี้ทำให้ `cancelDuringSave` ของ `142a` รันบนเจ็ดจอแทนสามจอ ซึ่งทำให้จำนวนที่
มัตแตนต์ของ `142-busy-outlives-a-superseded-read.py` ฆ่าเปลี่ยนโดยไม่มีเครื่องมือไหน
บอก — แองเคอร์ยังตรงและโค้ดที่มันแก้ไม่ถูกแตะ (#48, #202) จึงกวาดมันใหม่
"""
from harness import main

FILES = {
    'psform': 'frontend/src/components/programSubjects/ProgramSubjectForm.js',
    'ploform': 'frontend/src/components/plos/PloForm.js',
    'rubform': 'frontend/src/components/rubrics/RubricForm.js',
    'critform': 'frontend/src/components/rubrics/CriterionForm.js',
    'pspage': 'frontend/src/pages/ProgramSubjects.js',
    'plopage': 'frontend/src/pages/Plos.js',
    'rubpage': 'frontend/src/pages/Rubrics.js',
    'critpage': 'frontend/src/pages/RubricCriteria.js',
}

# The declined shape made to run (#115): every control of the form reads the
# page's flag again. Anchored on the declaration rather than on a field, because
# the claim it kills is read on a *second* form's control and not on either of
# the two the row read before it.
PAGEWIDE_OPEN = "  const [sending, setSending] = useState(false)\n"
PAGEWIDE_SHUT = ("  const [, setSending] = useState(false)\n"
                 "  const sending = busy\n")

# Written out four times rather than built by a helper: `mutation/anchors.py`
# reads this dict as text, and a mutant whose edit comes back from a function
# call is one it has to report as UNREADABLE (#233 - an instrument reads what is
# written in the shape it reads).

MUTANTS = {
    # ---- รายวิชาในหลักสูตร -------------------------------------------------
    'pstypelive': ('psform',
                   "              onChange={set('subject_type')}\n"
                   "              disabled={sending}\n",
                   "              onChange={set('subject_type')}\n"),

    'psstatuslive': ('psform',
                     "                  }))\n"
                     "                }\n"
                     "                disabled={sending}\n",
                     "                  }))\n"
                     "                }\n"),

    'pspagewide': ('psform', PAGEWIDE_OPEN, PAGEWIDE_SHUT),

    'psformclosed': ('pspage',
                     "      if (showing.current === sent) setEditing(null)\n",
                     "      setEditing(null)\n"),

    # The guarded hand-over, anchored through the `catch` below it: the same
    # three lines stand in `confirmRemoval`, and what tells the two apart is
    # `const drawing` against `const reader` (#202's ambiguity, one file along).
    'pssentencesaid': ('pspage',
                       "      if (showing.current === sent) {\n"
                       "        waiting.current = { of: readOf(onPage.current, program), said }\n"
                       "      }\n"
                       "      const drawing = onScreen.current\n",
                       "      waiting.current = { of: readOf(onPage.current, program), said }\n"
                       "      const drawing = onScreen.current\n"),

    # ---- ผลการเรียนรู้ระดับหลักสูตร ----------------------------------------
    'plonamedlive': ('ploform',
                     "            maxLength={500}\n"
                     "            disabled={sending}\n",
                     "            maxLength={500}\n"),

    'plotypelive': ('ploform',
                    "              onChange={set('outcome_type')}\n"
                    "              disabled={sending}\n",
                    "              onChange={set('outcome_type')}\n"),

    'plopagewide': ('ploform', PAGEWIDE_OPEN, PAGEWIDE_SHUT),

    'ploformclosed': ('plopage',
                      "      if (showing.current === sent) {\n"
                      "        setEditing(null)\n"
                      "        setFormProgram('')\n"
                      "      }\n",
                      "      setEditing(null)\n"
                      "      setFormProgram('')\n"),

    # `save` writes this guard as a block where `confirmRemoval` writes it on one
    # line, which is what makes the anchor unique - and is itself #242's doing:
    # a guard copied from the sibling made four closed tickets' mutants
    # ambiguous in this file, so the copy was written differently (#202).
    'plosentencesaid': ('plopage',
                        "      if (showing.current === sent) {\n"
                        "        waiting.current = { of: program, said }\n"
                        "      }\n",
                        "      waiting.current = { of: program, said }\n"),

    'ploreported': ('plopage',
                    "      if (showing.current === sent) report(error)\n"
                    "    } finally {\n",
                    "      report(error)\n"
                    "    } finally {\n"),

    # ---- Rubric -------------------------------------------------------------
    'rubcodelive': ('rubform',
                    "              maxLength={20}\n"
                    "              disabled={sending}\n",
                    "              maxLength={20}\n"),

    'ruborderlive': ('rubform',
                     "              min={0}\n"
                     "              disabled={sending}\n",
                     "              min={0}\n"),

    'rubpagewide': ('rubform', PAGEWIDE_OPEN, PAGEWIDE_SHUT),

    'rubformclosed': ('rubpage',
                      "      if (showing.current === sent) setEditing(null)\n",
                      "      setEditing(null)\n"),

    'rubsentencesaid': ('rubpage',
                        "      if (showing.current === sent) {\n"
                        "        waiting.current = { of: readOf(onPage.current, program), said }\n"
                        "      }\n"
                        "      const drawing = onScreen.current\n",
                        "      waiting.current = { of: readOf(onPage.current, program), said }\n"
                        "      const drawing = onScreen.current\n"),

    # ---- เกณฑ์การให้คะแนน --------------------------------------------------
    'critweightlive': ('critform',
                       '              max="999.99"\n'
                       "              disabled={sending}\n",
                       '              max="999.99"\n'),

    'critorderlive': ('critform',
                      "              min={0}\n"
                      "              disabled={sending}\n",
                      "              min={0}\n"),

    'critpagewide': ('critform', PAGEWIDE_OPEN, PAGEWIDE_SHUT),

    'critformclosed': ('critpage',
                       "      if (showing.current === sent) setEditing(null)\n",
                       "      setEditing(null)\n"),

    # `setNotice(said)` stands in both handlers of this file, so the span
    # reaches the `catch` below it, where only `save` asks before reporting.
    'critsentencesaid': ('critpage',
                         "      if (reloaded && showing.current === sent) setNotice(said)\n"
                         "    } catch (error) {\n"
                         "      if (showing.current === sent) report(error)\n",
                         "      if (reloaded) setNotice(said)\n"
                         "    } catch (error) {\n"
                         "      if (showing.current === sent) report(error)\n"),
}

main(FILES, MUTANTS)
