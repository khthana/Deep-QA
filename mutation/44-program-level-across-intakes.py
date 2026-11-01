# -*- coding: utf-8 -*-
"""
#44 เปรียบเทียบผลการเรียนรู้ระดับหลักสูตรข้ามรุ่น - one curriculum, several intakes.

Twelve mutants, and between them they cover every claim `44a` makes.

The arithmetic is not among them, and here that is a stronger statement than
usual: this screen's whole claim is that its figures are #42's figures, and the
way that is made true is that both routes reduce a year's marks with the same
`rollUpOutcomes`. There is nothing left to break independently. So no mutant
here changes a number - `backend/test/program-results.test.js` asserts, outcome
by outcome, that a year read on the trend equals the same year read on the
report beside it, and a browser row asserting a mean would be the same claim in
the place that goes stale.

What is left is what only exists once the grid is drawn: that the range's two
ends drive it, that a year nobody was admitted in is a column rather than a
year quietly closed up, that the column says which kind of empty it is, that a
cell nobody was measured in is blank rather than nought, that the figure a
committee would check against the other screen is written the same way on both,
and that an account the server refuses is not left waiting under the refusal.

    python mutation/44-program-level-across-intakes.py save
    python mutation/44-program-level-across-intakes.py <mutant>
    python mutation/44-program-level-across-intakes.py restore

Killing them:

    cd e2e && npx playwright test 44a-program-level-across-intakes

**Never sweep this file and `42-program-level-by-intake.py` in the same run.**
They share `backend/routes/programResults.js` and
`frontend/src/components/SidebarItem/ProgManager.js`, and `save` in one would
take its snapshot of a file the other has already mutated - so `restore` would
put the mutation back rather than take it away.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `comparemenumisleads` | The committee's entry points at the next screen along. · `path: '/main/programLevelCompare',` → `path: '/main/programLevelIndividual',` | **แถวที่มันค้ำ** ทางเข้าในเมนูกรรมการ · **ตายที่** แถว 1 ที่ `waitForURL` — รายการเมนูเปิดหน้าจอที่ยังไม่ได้สร้าง · ที่มา `docs/acceptance/44-program-level-across-intakes.md:211` `docs/acceptance/44-program-level-across-intakes.md:61` |
| `rangelistsonlyitsends` | The range is the two intakes that were asked for and nothing between them. · บล็อกที่ถูกแทน ท้ายของมัน `return { years };` → `return { years: start === end ? [String(start)] : [String(start), String(end)] };` | **แถวที่มันค้ำ** 1 (ทุกปีระหว่างปลายทั้งสอง) · **ตายที่** แถว 3 ที่ `toBeVisible` ของหัวคอลัมน์ 2564 — ช่วงเหลือแค่สองปลาย · แถว 1, 2, 4 ผ่านหมด เพราะรุ่นของ seed ติดกัน และช่วงที่มีรูคือช่วงที่แถว 3 สร้างขึ้นเองเท่านั้น · ที่มา `docs/acceptance/44-program-level-across-intakes.md:212` `docs/acceptance/44-program-level-across-intakes.md:62` |
| `columnsaysonlyacount` | The column header says how many students the year has and stops there. · บล็อกที่ถูกแทน ท้ายของมัน `return `${year.student_count} คน · ยังไม่มีคะแนน`` → `` | **แถวที่มันค้ำ** 3 (คอลัมน์บอกความว่างแบบไหน) · **ตายที่** แถว 3 ที่ `toContainText('ไม่มีนักศึกษารุ่นนี้')` — คอลัมน์ว่างอ่านว่า *0 คน* · ที่มา `docs/acceptance/44-program-level-across-intakes.md:213` `docs/acceptance/44-program-level-across-intakes.md:67` |
| `startfrozen` | The start of the range stops driving the report: the handler ignores the option that was chosen and puts the old one back. · บล็อกที่ถูกแทน ท้ายของมัน `setFrom(year)` → `setFrom(from)` | **แถวที่มันค้ำ** 1 (ปลาย **ต้น** ขับรายงาน) · **ตายที่** แถว 2 ที่ `waitForResponse` — ไม่มีคำขอที่มีปลายต้นใหม่ออกไปเลย · อีกหกแถวยังผ่าน รายงานยังวาด และเลขยังถูกต้องสำหรับช่วงที่มันแสดง · ที่มา `docs/acceptance/44-program-level-across-intakes.md:214` `docs/acceptance/44-program-level-across-intakes.md:63` |
| `endfrozen` | The other end of the range stops driving the report, the same way. · บล็อกที่ถูกแทน ท้ายของมัน `setTo(year)` → `setTo(to)` | **แถวที่มันค้ำ** 1 (ปลาย **ปลาย** ขับรายงาน) · **ตายที่** แถว 2 ที่ `waitForResponse` ของขั้นที่สาม · **และฆ่าแถว 3 กับ 4 ไปด้วย** เพราะทั้งสองต้องขยับปลายปลายเพื่อไปถึงสถานะที่ตัวเองพูดถึง — ไม่ใช่ความล้มเหลวแบบ `intakefrozen` ของ #42 เพราะรายงานยังโหลดและตัวเลขยังถูก · ที่มา `docs/acceptance/44-program-level-across-intakes.md:215` `docs/acceptance/44-program-level-across-intakes.md:63` |
| `rowdrawsoneyear` | Every row of the grid draws the first year of the range and stops. · `{plo.years.map(cell => {` → `{plo.years.slice(0, 1).map(cell => {` | **แถวที่มันค้ำ** 2 (วางเรียงกันในตารางเดียว) · **ตายที่** แถว 6 ที่ `toHaveAttribute` ของช่อง PLO-4 ปี 2566 · แถว 5 ที่ช่อง PLO-2 ปีเดียวกัน — หัวคอลัมน์ยังครบ ตารางยังดูเหมือนการเปรียบเทียบ แต่ไม่มีข้อไหนถูกวางข้างตัวเองข้ามปี · ที่มา `docs/acceptance/44-program-level-across-intakes.md:216` `docs/acceptance/44-program-level-across-intakes.md:64` |
| `trendroundsitsown` | The trend writes its figures to one decimal place. · `คะแนนเฉลี่ย ${cell.mean.toFixed(2)}` → `คะแนนเฉลี่ย ${cell.mean.toFixed(1)}` | **แถวที่มันค้ำ** 4 (สองหน้าจอเขียนเลขเหมือนกัน) · **ตายที่** แถว 5 ที่ `toHaveAttribute` — จอหนึ่งเขียน 3.9 อีกจอเขียน 3.90 · **ฆ่าแถว 6 ไปด้วย** เพราะแถวนั้นยืนยันรูปแบบสองตำแหน่งกับช่องที่มีคะแนน ซึ่งไม่ได้ตั้งใจแต่เป็นความจริง · ที่มา `docs/acceptance/44-program-level-across-intakes.md:217` `docs/acceptance/44-program-level-across-intakes.md:69` |
| `labelmissestheshare` | The spoken cell keeps the mean and drops the share of students that earned it. · `${verdict} — ผ่าน ${cell.pass_rate}% ของนักศึกษาที่ถูกวัด`` → `${verdict}`` | **แถวที่มันค้ำ** 4 (ครึ่งที่เป็นอัตราผ่าน) · **ตายที่** แถว 5 ที่ `toHaveAttribute` — ป้ายเหลือค่าเฉลี่ยกับคำตัดสิน ไม่บอกว่าเป็นค่าเฉลี่ยของใครกี่คน · นี่คือเหตุผลที่แถว 5 อ่านสองตัวเลข ไม่ใช่ตัวเดียว · ที่มา `docs/acceptance/44-program-level-across-intakes.md:218` `docs/acceptance/44-program-level-across-intakes.md:69` |
| `unmeasuredspeaksasafailure` | A cell nobody was measured in is read aloud as one that did not pass. · `if (cell.mean === null) return `${where} ยังไม่มีการวัด`` → `if (cell.mean === null) return `${where} ไม่ผ่านเกณฑ์`` | **แถวที่มันค้ำ** 3 (ช่องว่างไม่ใช่ศูนย์ · ครึ่งที่ได้ยิน) · **ตายที่** แถว 6 ที่ `toHaveAttribute` — ช่องที่ไม่มีใครวัดอ่านออกเสียงว่า *ไม่ผ่านเกณฑ์* · ที่มา `docs/acceptance/44-program-level-across-intakes.md:219` `docs/acceptance/44-program-level-across-intakes.md:66` |
| `unmeasuredreadsasnought` | And the same defect where it is looked at rather than heard: the cell shows 0.00. · `{score(cell.mean)}` → `{score(cell.mean ?? 0)}` | **แถวที่มันค้ำ** 3 (ครึ่งที่มองเห็น) · **ตายที่** แถว 6 ที่ `toHaveText('—')` — ช่องเดียวกันแสดง 0.00 โดยที่ป้ายยังถูก ซึ่งเป็นครึ่งที่ screen reader จับไม่ได้ · ที่มา `docs/acceptance/44-program-level-across-intakes.md:220` `docs/acceptance/44-program-level-across-intakes.md:66` |
| `emptydrawsthegrid` | A range nobody in it has been marked in gets the grid anyway - thirteen rows of em dashes across however many years were asked for, which is a report shaped like a report with nothing in it to read. · `empty: years.every((year, at) => columns[at].every((row) => row.student_count === 0)),` → `empty: false,` | **แถวที่มันค้ำ** 5 (ช่วงที่ไม่มีคะแนนเลย) · **ตายที่** แถว 4 ที่ `toBeVisible` ของประโยค — ได้ตารางขีดสิบสามแถวแทน · ที่มา `docs/acceptance/44-program-level-across-intakes.md:221` |
| `trendkeepsloading` | The screen goes back to saying it is loading when it has nothing to ask for. · `setLoading(false) return } setLoading(true)` → `return } setLoading(true)` | **แถวที่มันค้ำ** 6 (ไม่ถูกทิ้งให้รอใต้คำปฏิเสธ) · **ตายที่** แถว 7 ที่ `toHaveCount(0)` ของ *กำลังโหลดข้อมูล…* — คำปฏิเสธกับการรอค้างอยู่ด้วยกันตลอดไป · ที่มา `docs/acceptance/44-program-level-across-intakes.md:222` `docs/acceptance/44-program-level-across-intakes.md:72` |
"""

from harness import main

FILES = {
    "route": "backend/routes/programResults.js",
    "screen": "frontend/src/pages/ProgramLevelCompare.js",
    "menu": "frontend/src/components/SidebarItem/ProgManager.js",
}

MUTANTS = {
    # The committee's entry points at the next screen along. The menu still has
    # it, it still reads the same, and it now opens the one that is not built -
    # the shape of wrongness a rename introduces, and nothing but following the
    # link catches it. Kills row 1 at `waitForURL`.
    "comparemenumisleads": (
        "menu",
        "        path: '/main/programLevelCompare',",
        "        path: '/main/programLevelIndividual',",
    ),
    # The range is the two intakes that were asked for and nothing between
    # them. This is the ticket's central decision written the other way round,
    # and it is a *reasonable* reading of *compare 2563 with 2565* - which is
    # why it needs a mutant rather than a comment. Every figure stays right,
    # every column that is drawn is drawn correctly, and the only thing wrong
    # is that a year nobody was admitted in has been closed up, so two intakes
    # with a year standing between them are drawn as neighbours. Kills row 3.
    #
    # Rows 1, 2 and 4 all pass under it, because the seed's intakes are
    # consecutive and the only range with a hole in it is the one row 3 builds.
    "rangelistsonlyitsends": (
        "route",
        "  const years = [];\n"
        "  for (let year = start; year <= end; year += 1) years.push(String(year));\n"
        "  return { years };",
        "  return { years: start === end ? [String(start)] : [String(start), String(end)] };",
    ),
    # The column header says how many students the year has and stops there. A
    # year nobody was admitted in reads *0 คน* and a year whose roll nobody has
    # marked reads *113 คน*, so the two facts a reader most needs to tell apart
    # are told apart by a number they have to interpret. The gap column is
    # still drawn, which is what makes this a different claim from the mutant
    # above. Kills row 3 at the two sentences.
    "columnsaysonlyacount": (
        "screen",
        "  if (year.student_count === 0) return 'ไม่มีนักศึกษารุ่นนี้'\n"
        "  if (year.measured_count === 0)\n"
        "    return `${year.student_count} คน · ยังไม่มีคะแนน`\n",
        "",
    ),
    # The start of the range stops driving the report: the handler ignores the
    # option that was chosen and puts the old one back. The report still draws
    # and its figures are still right for the years it is showing; the only
    # thing wrong is that one end of the range cannot be moved.
    #
    # It kills row 2 alone, because that row moves each end on its own and this
    # freezes only the start. The report still loads for every other row, which
    # is the lesson #42 learned the hard way with `intakefrozen`: a mutant that
    # stops the first report loading takes the whole screen away and proves
    # nothing about the row it was written for.
    "startfrozen": (
        "screen",
        "  function chooseFrom(year) {\n    setFrom(year)",
        "  function chooseFrom(year) {\n    setFrom(from)",
    ),
    # The other end of the range stops driving the report, the same way. The
    # start still moves, the report still draws, and the only thing wrong is
    # that the range can be opened but never closed.
    #
    # It kills three rows rather than one, and that is not the failure
    # `intakefrozen` was rewritten for: the report loads, every figure it shows
    # is right, and the rows that die are exactly the rows that need to move
    # this control to reach the state they are about. A mutant that stopped the
    # first report loading would kill the same three and prove nothing.
    "endfrozen": (
        "screen",
        "  function chooseTo(year) {\n    setTo(year)",
        "  function chooseTo(year) {\n    setTo(to)",
    ),
    # Every row of the grid draws the first year of the range and stops. The
    # header still has one column per year, so the report still *looks* like a
    # comparison - it is just that no outcome is laid beside itself across the
    # years, which is the whole of what the second criterion asks for. Kills
    # the rows that address a cell by (outcome, year).
    "rowdrawsoneyear": (
        "screen",
        "{plo.years.map(cell => {",
        "{plo.years.slice(0, 1).map(cell => {",
    ),
    # The trend writes its figures to one decimal place. Both screens are still
    # right about the number and a reader holding the two printouts is looking
    # at *3.9* beside *3.90*, which is the drift `lib/bands.js` exists to
    # prevent - the same quantity written two ways by two screens that are
    # supposed to be two views of one thing. Kills row 5.
    "trendroundsitsown": (
        "screen",
        "คะแนนเฉลี่ย ${cell.mean.toFixed(2)}",
        "คะแนนเฉลี่ย ${cell.mean.toFixed(1)}",
    ),
    # The spoken cell keeps the mean and drops the share of students that
    # earned it. A reader who cannot see the grid is told the figure and not
    # what it is a figure over, which on this screen is the difference between
    # *3.90 across ninety per cent of them* and *3.90 across three people*.
    # Kills row 5, and it is why that row reads both figures rather than the
    # one it is named after.
    "labelmissestheshare": (
        "screen",
        " ${verdict} — ผ่าน ${cell.pass_rate}% ของนักศึกษาที่ถูกวัด`",
        " ${verdict}`",
    ),
    # A cell nobody was measured in is read aloud as one that did not pass.
    # This is #38's shipped defect transplanted onto a trend, where it is worse
    # than it was on a table: a row of *ไม่ผ่านเกณฑ์* running the width of the
    # report is a collapse, and a committee acts on collapses. Kills row 6.
    "unmeasuredspeaksasafailure": (
        "screen",
        "  if (cell.mean === null) return `${where} ยังไม่มีการวัด`",
        "  if (cell.mean === null) return `${where} ไม่ผ่านเกณฑ์`",
    ),
    # And the same defect where it is looked at rather than heard: the cell
    # shows 0.00. The label is untouched, so this is the half of the claim a
    # screen reader cannot catch - which is the point, and why row 6 asserts
    # the cell's text as well as its label.
    "unmeasuredreadsasnought": (
        "screen",
        "{score(cell.mean)}",
        "{score(cell.mean ?? 0)}",
    ),
    # A range nobody in it has been marked in gets the grid anyway - thirteen
    # rows of em dashes across however many years were asked for, which is a
    # report shaped like a report with nothing in it to read. Kills row 4.
    "emptydrawsthegrid": (
        "route",
        "        empty: years.every((year, at) => columns[at].every((row) => row.student_count === 0)),",
        "        empty: false,",
    ),
    # The screen goes back to saying it is loading when it has nothing to ask
    # for. An account the server refuses - a ผู้สอน who typed the address -
    # reads the refusal with *กำลังโหลดข้อมูล…* underneath it, for ever. This
    # is the defect #43's hand-walk found on the two screens beside this one,
    # put back. Kills row 7.
    "trendkeepsloading": (
        "screen",
        "      setLoading(false)\n      return\n    }\n    setLoading(true)",
        "      return\n    }\n    setLoading(true)",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
