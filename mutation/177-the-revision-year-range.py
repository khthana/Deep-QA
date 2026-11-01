# -*- coding: utf-8 -*-
r"""
#177 ปีหลักสูตรถูกตรวจแค่รูปร่าง ไม่ได้ตรวจว่าเป็นปีที่มีได้จริง.

`programs.revision_year` holds the Buddhist-era year a Program's curriculum was
revised in, as text, kept as the registrar writes it. `readProgram` in
`backend/routes/programs.js` checked it with `/^\d{4}$/` and nothing else, so
`1234`, `9999` and - the mistake the ticket opens with - `2024`, the common-era
year for what somebody means as 2567, were all stored, and three screens then
printed the wrong label.

**A guard that is strict about a format cannot see a mistake about meaning**
(#124), which is also #125's whole ticket one column along. The difference is
the direction of the arithmetic: there a Buddhist year was typed into a
common-era column, here a common-era year into a Buddhist one.

## The answer the owner took

The ticket asked two questions and was labelled `question` for them. On 22
October 2569 the owner took **both links of the guard** - a range, and the
sentence that names the year to use instead - and a **constant** ceiling rather
than one derived from the clock. The second answer is why `LATEST_REVISION_YEAR`
is 2600: no bound in this server's validation is derived from the clock - one
guard does read it, `auth/accounts.js`'s `validityRefusal`, and what it reads it
*for* is a window somebody stored - and a bound that moved with today would let
the day a test runs decide what the test asserts (#52).

`lib/revisionYear.js` is its own file and says why it is not `lib/year.js` in
its own docblock: that range is 1900-2200 *of the common era*, so measured,
`yearRefusal(2565)` refuses the correct value and offers 2022 while
`yearRefusal(2024)` returns null - the exact wrong way round (#107).

## Two sentences, not one with a hole in it

`revisionYearEra` does the arithmetic; `revisionYearOutOfRange` names the
range. A year gets the first only when its Buddhist reading lands inside the
range, because offering 1777 to somebody who typed 1234 is worse than offering
nothing. `alwaysoffersthebuddhistreading` is the merge of the two, and it is the
more tempting mistake: one sentence is less code and reads as friendlier.

## Three paths out of one reader

The form, the edit and the CSV import all read `readProgram`, and the sentence
has to reach all three. The two route sites looked the refusal up as a key,
`REFUSALS[draft.reason]`, which cannot carry a sentence that names a value;
they read `sentenceOf` now, as `lib/importer.js` has since #26. The import
needed no change, which is the thing worth measuring rather than asserting:
`formsentenceisakey` and `editsentenceisakey` are one mutant per site, and
neither touches the import, so the three paths fail one at a time or they were
never three (#125's rule, met again).

## What no mutant here can say

**Nothing proves the floor separately from the choice of sentence.** The value
the era link exists for - 2024 - is *below* the floor, so a mutant that stops
reading the floor stops refusing 2024 as well, and dies at the era row rather
than at the range row: it is a duplicate of `theyearisonlyshaped` and is not
written. The floor is proved whole by `theyearisonlyshaped`, at its edge by
`edgesoftherangearerefused`, and apart from the sentence by
`alwaysoffersthebuddhistreading`. The ceiling has no such tangle, 9999 being
above it with its Buddhist reading above it too, which is why
`ceilingisnotread` exists and `floorisnotread` does not - #101's second answer
of three, *structurally unreachable*, and not a gap.

**Nothing here is about the shape gate.** `25` is refused above this code by
the regex that was always there, so the generic sentence the walked row
recorded is not at risk from any mutant below - it is at risk from the *order*
of the two gates, which is what the row asserting it is for (#60).

## The sweep

Swept 22 October 2569 against `cd backend && node --test "test/programs.test.js"`,
27 subtests green on a clean tree, and - for the two that reach the browser -
against `e2e/tests/177a-the-revision-year-that-was-only-shaped.spec.js`,
2 rows green.

`theyearisonlyshaped` is the defect itself, restored, which is also #203's *run
a new row against the unfixed code* without waiting hours for a sweep. It kills
**both** of the subtests this ticket added - the refusals in the first and the
edit in the second - and **both** browser rows: with the range gone the save
answers 201, so the row that reads the banner never gets to the banner and the
row that reads the form back is looking at a table.

`edgesoftherangearerefused` turns `>=`/`<=` into `>`/`<` - the boundary
off-by-one, which is the defect shape an arbitrary constant cannot have. It
kills **1 subtest**, the first one, at the accepting loop, and the assertion
message names which bound: *2500 was refused*.

`ceilingisnotread` kills **1**, the same subtest, at the row that sends 9999 -
the one assertion that is about the ceiling alone.

`alwaysoffersthebuddhistreading` kills **1**, at the row that sends 1234:
somebody who typed a number with no year in it would be told to use 1777.

`formsentenceisakey` kills **1** subtest, at the row that sends 2024, and the
**first** browser row, at the banner. The second browser row survives it,
correctly: that row is about the form still being open on what was typed, which
a wrong sentence does not change.

`formclosesonarefusal` is that second row's own mutant, and the only one of the
seven that is. It closes the form in the `catch`, leaving the banner where it
was, so the row that reads the sentence passes and the row that reads the form
back dies at the heading. It is here because of what the standards review of
this ticket found: `theyearisonlyshaped` kills that row at the line **above**
its claim - the status assertion, because with the range gone the save answers
201 - so it proves the row's precondition and not the row (#193), and a ⚙ that
rests on it is one that was never earned.

Swept 22 October 2569 against `177a` and the four other specs that press this
screen's form, 124 rows passing and **3 dying**: `177a`'s second row at
`toBeVisible()` on the heading, which is its claim, and two bystanders —
`142a`'s *a superseded read that lands during a save leaves บันทึก disabled* and
`55a`'s *คำปฏิเสธครั้งที่สองที่ข้อความเหมือนเดิม ก็ถูกพากลับมาอยู่ในจอ*, both of which
lose the control they are about when the form closes. `Programs.js` is shared,
so this sheet is one of the places this mutant kills and not the list (#123);
the three specs were re-run clean afterwards, 32 rows green. `177a`'s **first**
row passes under it, which is the point: the banner is still drawn.

`editsentenceisakey` kills **1**, the second subtest, at the edit's own
sentence, and nothing else - the import, whose report
has read a `message` before a `reason` since #26, needed no change and is
proved by the row below it rather than by a mutant of its own.

**Do not sweep this beside `58-master-data-in-the-log.py`,
`60-grant-over-a-deleted-scope.py`, `57-pager.py`,
`139-superseded-row-detail.py`, `140-superseded-handler-reload.py`,
`142-busy-outlives-a-superseded-read.py`, `146-save-closes-a-later-form.py`,
`203-the-refusal-wins-on-the-admin-screens.py` or
`210-the-administration-pagers-take-busy.py`.** The first two hold
`backend/routes/programs.js` and the seven after them hold
`frontend/src/pages/Programs.js`,
and a repeated path is what corrupts a sweep - the check is `FILES` and not
subject matter (#85), and this list was built with `grep -l` over `FILES`
rather than by reading titles (#125). `backend/auth/refusals.js` is not in
`FILES` here, so `95-route-not-found.py` and `128-a-way-to-ask.py` are not on
the list. Run `mutation/anchors.py` before believing any of it.

    python mutation/177-the-revision-year-range.py save
    python mutation/177-the-revision-year-range.py <mutant>
    python mutation/177-the-revision-year-range.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `theyearisonlyshaped` | **ทำอะไร** ตัวบกพร่องเอง คืนมา — ปีคือสี่หลัก ไม่มีอะไรมากกว่านั้น เรียก `refusal` ทิ้งไว้เพื่อให้ยังถูกอ้างถึง (#101) | **ฆ่าที่** **ทั้งสอง subtest ที่ตั๋วนี้เพิ่ม** (คำปฏิเสธในข้อแรก การแก้ไขในข้อที่สอง) **และแถวเบราว์เซอร์ทั้งสองแถว** — เมื่อช่วงปีหายไป การบันทึกตอบ 201 แถวที่อ่านแบนเนอร์จึงไปไม่ถึงแบนเนอร์ และแถวที่อ่านฟอร์มกลับมามองอยู่ที่ตาราง · **มันฆ่าแถวที่สองที่บรรทัดเหนือข้ออ้างของแถวนั้น** คือที่ assertion ของสถานะ จึงค้ำ precondition ไม่ได้ค้ำแถว (#193) `formclosesonarefusal` จึงมีอยู่ · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/15-programs.md:67` `docs/acceptance/15-programs.md:68` |
| `edgesoftherangearerefused` | **ทำอะไร** `>=`/`<=` เป็น `>`/`<` คือขอบเพี้ยนไปหนึ่ง ซึ่งเป็นรูปของความบกพร่องที่ค่าคงที่ตั้งเอาเองมีไม่ได้ — ปีที่ช่วงเอ่ยชื่อกลายเป็นปีที่ช่วงปฏิเสธ | **ฆ่าที่** **1 subtest** ข้อแรก ที่ลูปของปีที่ต้องรับ และข้อความของ assertion บอกว่าปลายไหน — *2500 was refused* · ที่มา บันทึกการกวาดของใบนี้เอง |
| `ceilingisnotread` | **ทำอะไร** อ่านแต่ปลายล่าง ปีไกลในอนาคตจึงเป็นปีที่รับได้ — ปลายบนมีลิงก์ของตัวเอง ส่วนปลายล่างไม่มีตัวเทียบ จึงไม่มี `floorisnotread` ซึ่งเป็นคำตอบที่สองของสามของ #101 *โครงสร้างไปไม่ถึง* ไม่ใช่ช่องว่าง | **ฆ่าที่** **1** subtest เดียวกัน ที่แถวซึ่งส่ง 9999 คือข้ออ้างข้อเดียวที่พูดเรื่องปลายบนลำพัง · ที่มา บันทึกการกวาดของใบนี้เอง |
| `alwaysoffersthebuddhistreading` | **ทำอะไร** ประโยคเดียวสำหรับความผิดทั้งสองแบบ (`readable = true`) คือการรวม `revisionYearEra` กับ `revisionYearOutOfRange` เข้าด้วยกัน ซึ่งเป็นความผิดที่น่าเลือกกว่า เพราะโค้ดน้อยกว่าและอ่านดูเป็นมิตรกว่า | **ฆ่าที่** **1** ที่แถวซึ่งส่ง 1234 — คนที่พิมพ์เลขที่ไม่มีปีอยู่ในนั้นเลยจะถูกบอกให้ใช้ 1777 · ที่มา บันทึกการกวาดของใบนี้เอง |
| `formsentenceisakey` | **ทำอะไร** ประโยคถูกเปิดหาเป็นคีย์ (`REFUSALS[draft.reason]`) ที่ route ของฟอร์ม คีย์ไม่พาปีไปด้วย คนจึงได้ประโยคกลางๆ แทนประโยคของตัวเอง | **ฆ่าที่** **1** subtest ที่แถวซึ่งส่ง 2024 และ**แถวเบราว์เซอร์แถวแรก** ที่แบนเนอร์ · **แถวเบราว์เซอร์แถวที่สองรอดไป ซึ่งถูก** แถวนั้นพูดเรื่องฟอร์มที่ยังเปิดอยู่บนสิ่งที่พิมพ์ไว้ ซึ่งประโยคที่ผิดไม่ได้เปลี่ยน · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/15-programs.md:67` |
| `formclosesonarefusal` | **ทำอะไร** ปิดฟอร์มใน `catch` ทิ้งแบนเนอร์ไว้ที่เดิม — ประโยคที่บอกให้พิมพ์ 2567 จึงถูกอ่านอยู่เหนือตารางที่ไม่มีฟอร์มอยู่ในนั้น | **ฆ่าที่** **แถวเบราว์เซอร์แถวที่สอง** ที่หัวข้อของฟอร์ม — แถวที่อ่านประโยคผ่าน เพราะแบนเนอร์ยังวาด (#97) · เป็นมัตแตนต์ของแถวนั้นเอง และเป็นตัวเดียวในเจ็ดตัวที่เป็น เขียนขึ้นเพราะการตรวจมาตรฐานของตั๋วนี้พบว่า `theyearisonlyshaped` ฆ่าแถวนั้นที่บรรทัดเหนือข้ออ้าง (#193) ⚙ ที่พิงตัวนั้นจึงเป็น ⚙ ที่ไม่ได้มาด้วยการพิสูจน์ · ที่มา บันทึกการกวาดของใบนี้เอง |
| `editsentenceisakey` | **ทำอะไร** เรื่องเดียวกันที่ route ของการแก้ไข ซึ่งเป็นจุดที่การแก้ของจริงวิ่งผ่าน คือจุดที่ทางออกของประโยคถูกอ่านจากมัน | **ฆ่าที่** **1** subtest ข้อที่สอง ที่ประโยคของการแก้ไขเอง **และไม่โดนอะไรอีก** — การนำเข้า ซึ่งรายงานของมันอ่าน `message` ก่อน `reason` มาตั้งแต่ #26 ไม่ต้องแก้ และถูกค้ำด้วยแถวที่อยู่ใต้มัน ไม่ใช่ด้วยมัตแตนต์ของตัวเอง · สองตัวนี้คือหนึ่งมัตแตนต์ต่อหนึ่งจุด สามทางจึงล้มทีละทาง ไม่งั้นมันไม่เคยเป็นสามทาง (#125) · ที่มา บันทึกการกวาดของใบนี้เอง |
"""

from harness import main

FILES = {
    "programs": "backend/routes/programs.js",
    "revisionyear": "backend/lib/revisionYear.js",
    # The screen, for the second browser row alone: what keeps the form open
    # on a refusal is this handler leaving `editing` where it was.
    "programspage": "frontend/src/pages/Programs.js",
}

MUTANTS = {
    # the defect itself: a year is four digits and nothing more. The call is
    # left in place so `refusal` stays referenced (#101).
    "theyearisonlyshaped": ("programs",
        "  if (values.revision_year) {\n"
        "    const refusal = revisionYearRefusal(Number(values.revision_year));\n"
        "    if (refusal) return { ok: false, reason: 'invalidProgram', message: refusal };\n"
        "  }\n",
        "  if (values.revision_year) {\n"
        "    const refusal = revisionYearRefusal(Number(values.revision_year));\n"
        "    if (false) return { ok: false, reason: 'invalidProgram', message: refusal };\n"
        "  }\n"),
    # the boundary off-by-one, which is the defect shape an arbitrary constant
    # cannot have: the years the range names are the years it refuses.
    "edgesoftherangearerefused": ("revisionyear",
        "  if (year >= EARLIEST_REVISION_YEAR && year <= LATEST_REVISION_YEAR) return null;\n",
        "  if (year > EARLIEST_REVISION_YEAR && year < LATEST_REVISION_YEAR) return null;\n"),
    # only the floor is read, so a year far in the future is a plausible one.
    # The ceiling's own link, which the floor has no equivalent of (above).
    "ceilingisnotread": ("revisionyear",
        "  if (year >= EARLIEST_REVISION_YEAR && year <= LATEST_REVISION_YEAR) return null;\n",
        "  if (year >= EARLIEST_REVISION_YEAR) return null;\n"),
    # one sentence for both mistakes, which offers 1777 to somebody who typed
    # 1234.
    "alwaysoffersthebuddhistreading": ("revisionyear",
        "  const readable = buddhist >= EARLIEST_REVISION_YEAR && buddhist <= LATEST_REVISION_YEAR;\n",
        "  const readable = true;\n"),
    # the sentence looked up as a key on the form route: the key carries no
    # year, so the person is told the generic sentence instead of theirs.
    "formsentenceisakey": ("programs",
        "      const draft = readProgram(req.body ?? {});\n"
        "      if (!draft.ok) return res.status(400).json({ message: sentenceOf(draft) });\n",
        "      const draft = readProgram(req.body ?? {});\n"
        "      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });\n"),
    # the form closed on the way past the refusal, so the sentence telling the
    # person to type 2567 is read over a table with no form in it. The banner is
    # still drawn, which is what leaves the first browser row standing (#97).
    "formclosesonarefusal": ("programspage",
        "      const drawing = onScreen.current\n"
        "      await drawing(() => onScreen.current === drawing)\n"
        "    } catch (error) {\n"
        "      if (showing.current === sent) report(error)\n"
        "    } finally {\n"
        "      setWriting(false)\n"
        "    }\n"
        "  }\n",
        "      const drawing = onScreen.current\n"
        "      await drawing(() => onScreen.current === drawing)\n"
        "    } catch (error) {\n"
        "      if (showing.current === sent) report(error)\n"
        "      if (showing.current === sent) setEditing(null)\n"
        "    } finally {\n"
        "      setWriting(false)\n"
        "    }\n"
        "  }\n"),
    # and the same on the edit route, which is the site a correction goes
    # through - the one the sentence's way out is read from.
    "editsentenceisakey": ("programs",
        "      const draft = readProgram(req.body ?? {}, { editing: true });\n"
        "      if (!draft.ok) return res.status(400).json({ message: sentenceOf(draft) });\n",
        "      const draft = readProgram(req.body ?? {}, { editing: true });\n"
        "      if (!draft.ok) return res.status(400).json({ message: REFUSALS[draft.reason] });\n"),
}

main(FILES, MUTANTS)
