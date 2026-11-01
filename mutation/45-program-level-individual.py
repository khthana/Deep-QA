# -*- coding: utf-8 -*-
"""
#45 ผลการเรียนรู้ระดับหลักสูตรรายบุคคล - one student, against every outcome.

Twelve mutants, and between them they cover every claim `45a` makes but one.

The arithmetic is not among them, for the reason #44's file gives about its own
figures and one step further: this screen's claim is that a student reads the
same here as in the row #43's heatmap draws for them, and what makes that true
is that the server builds both with one `cellsFor` over marks read by one
`cohortMarks`. There is nothing left to break independently, so no mutant here
changes a score. What they break instead is everything *around* the figure -
where the roll comes from, which student the report is about, how the figure is
written down, whether a control is offered where there is nothing to open.

Two of them are defects this repository has already met once. `rollfrommarks`
is #43's first criterion put back the wrong way round, and `sourceofferedonnothing`
is #40's hand-walk finding - a disclosure that works perfectly on nothing.

**A thirteenth was written, applied twice, and killed nothing.** It was #44's
`trendkeepsloading` transplanted: drop the `setLoading(false)` on the path that
has nothing to ask for, and an account the server refuses reads *กำลังโหลด
ข้อมูล…* under the refusal for ever - #43's hand-walk finding on two screens.
It cannot happen here, and the reason is worth keeping rather than tidying
away. `loading` starts **false** on this screen, because it fetches nothing
until a student is chosen, where #42 and #43 start true and fetch on arrival;
and the sentence itself is drawn inside `roll.length > 0`, which a refused
account never satisfies. Two independent guarantees, and no single-point
mutation reaches past both. Rewriting the mutant to hoist the flag above the
guard did not help either - it was the second arrangement that survived.

So `45a`'s seventh row keeps its assertions and its acceptance row is **☑, not
⚙**. A mutant that kills nothing is not evidence, and a ⚙ over one is exactly
the mark `CLAUDE.md` says to distrust most.

    python mutation/45-program-level-individual.py save
    python mutation/45-program-level-individual.py <mutant>
    python mutation/45-program-level-individual.py restore

Killing them:

    cd e2e && npx playwright test 45a

**Never sweep this file, `42-program-level-by-intake.py` or
`44-program-level-across-intakes.py` in the same run.** All three share
`backend/routes/programResults.js` and
`frontend/src/components/SidebarItem/ProgManager.js` - four programme-level
reports are one router and one menu - and `save` in one would take its snapshot
of a file another has already mutated, so `restore` would put the mutation back
rather than take it away.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `individualmenumisleads` | The committee's entry points at the screen beside it. · `path: '/main/programLevelIndividual',` → `path: '/main/programLevelAllStudents',` | **แถวที่มันค้ำ** ทางเข้าในเมนูกรรมการ · **ตายที่** แถว 1 ที่ `waitForURL` — รายการเมนูเปิดหน้าจอของนักศึกษาทุกคนแทน ซึ่งเป็นหน้าที่มีอยู่จริงและวาดออกมาถูกต้อง · ที่มา `docs/acceptance/45-program-level-individual.md:179` `docs/acceptance/45-program-level-individual.md:55` |
| `rollfrommarks` | The picker is built from the marks instead of from the register. · `students: roll.map((student) => ({` → `students: roll.filter((student) => byStudent.has(student.student_id)).map((student) => ({` | **แถวที่มันค้ำ** 1 (รายชื่อมาจากทะเบียน · ครึ่งที่ *เลือกได้*) · **ตายที่** แถว 1 ที่ `toBeVisible` ของแถวนักศึกษาที่ไม่มีคะแนน · **และแถว 6** ที่ `chooseStudent` เพราะคนที่ไม่มีคะแนนหายไปจากรายชื่อ จึงคลิกไม่ได้เลย — สองแถวนี้คือสองครึ่งของเหตุผลที่รายชื่อไม่ได้มาจากคะแนน · ที่มา `docs/acceptance/45-program-level-individual.md:180` |
| `rollhidesthequietone` | The roll no longer says which of its rows has nothing behind it. · `{student.measured_count === 0 && (` → `{false && (` | **แถวที่มันค้ำ** 1 (ครึ่งที่ *รู้ก่อนคลิก*) · **ตายที่** แถว 1 ที่ `toContainText('ยังไม่มีคะแนน')` — คนนั้นยังอยู่ในรายชื่อ กรรมการต้องคลิกเข้าไปดูถึงจะรู้ · ที่มา `docs/acceptance/45-program-level-individual.md:181` `docs/acceptance/45-program-level-individual.md:58` |
| `searchignoresthecode` | The search matches the name and not the code. · ``${student.student_id} ${student.full_name_th}`.toLowerCase().includes(term.trim().toLower…` → ``${student.full_name_th}`.toLowerCase().includes(term.trim().toLowerCase())` | **แถวที่มันค้ำ** 1 (กรองรายชื่อได้) · **ตายที่** แถว 1 ที่ `toHaveCount(1)` — พิมพ์รหัสนักศึกษาแล้วรายชื่อไม่แคบลงเลย · ที่มา `docs/acceptance/45-program-level-individual.md:182` `docs/acceptance/45-program-level-individual.md:56` |
| `reportignoresthechoice` | The report is about the last student on the roll rather than the one who was chosen. · `const answer = await getStudentResults(program, chosen)` → `const answer = await getStudentResults(program, roll[roll.length - 1].student_id)` | **แถวที่มันค้ำ** 2 (รายงานเป็นของคนที่เลือก) · **ตายที่** แถว 2 ที่ `whoLine` · **และแถว 3, 4, 5** ทุกแถวที่พูดถึงคนคนหนึ่ง — เลขทุกตัวยังถูก เป็นของคนอื่น นี่คือมัตแตนต์ที่บอกว่าแถวซึ่งนับได้สิบสามแถวไม่ได้พิสูจน์ว่าเป็นของ *ใคร* · ที่มา `docs/acceptance/45-program-level-individual.md:183` `docs/acceptance/45-program-level-individual.md:59` |
| `reportskipsthequietoutcomes` | Only the outcomes this student was measured on. · บล็อกที่ถูกแทน ท้ายของมัน `plos: outcomes.map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),` → `.map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),` | **แถวที่มันค้ำ** 2 (ทุกข้อมีแถว วัดหรือไม่วัด) · **ตายที่** แถว 2 ที่ `toHaveCount` ของจำนวนแถว · แถว 5 ที่ `unmeasuredCell` — รายงานเหลือเฉพาะข้อที่มีคะแนน อ่านดูสมบูรณ์ และเป็นสิ่งเดียวที่การอุทธรณ์อ่านไม่ได้ · ที่มา `docs/acceptance/45-program-level-individual.md:184` `docs/acceptance/45-program-level-individual.md:59` |
| `cellforgetsthestudent` | The label a reader who cannot see the chip is given loses the student. · `return `${student.student_id} ${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`` → `return `${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`` | **แถวที่มันค้ำ** 5 (สองหน้าจอเขียนเลขเดียวกัน) · **ตายที่** แถว 3 ที่ `scoreCell` — ป้ายยังบอกข้อและคะแนนถูกต้อง แต่ไม่มีอะไรบนช่องบอกว่านี่คือรายงานของใคร · ที่มา `docs/acceptance/45-program-level-individual.md:185` `docs/acceptance/45-program-level-individual.md:66` |
| `labelroundsitsown` | The label rounds to one place while the chip beside it shows two. · `${plo.score.toFixed(2)} คะแนน ${line}` → `${plo.score.toFixed(1)} คะแนน ${line}` | **แถวที่มันค้ำ** 5 (เขียน *เหมือนกัน*) · **ตายที่** แถว 3 ที่ `toHaveAttribute` — จอหนึ่งเขียน 3.9 อีกจอเขียน 3.90 · นี่คือเหตุผลที่แถว 3 อ่านตัวเลขออกจากจอ #43 แทนที่จะเขียนไว้ในเทสต์ · ที่มา `docs/acceptance/45-program-level-individual.md:186` `docs/acceptance/45-program-level-individual.md:66` |
| `drilldownwillnotclose` | The drill-down never closes. Pressing the button that opened it fetches it again, which looks like a refresh and reads like a control that has stopped working. · `setOpen(current => (current === plo.outcome_id ? null : plo.outcome_id))` → `setOpen(plo.outcome_id)` | **แถวที่มันค้ำ** 3 (แผงที่มาเปิดและปิด) · **ตายที่** แถว 4 ที่ `toHaveText('ดูที่มา')` — กดซ้ำแล้วมันไปดึงข้อมูลใหม่ ซึ่งดูเหมือนการรีเฟรชและอ่านได้ว่าปุ่มเสีย · ที่มา `docs/acceptance/45-program-level-individual.md:187` `docs/acceptance/45-program-level-individual.md:61` |
| `drilldownforgetsthestudent` | The panel no longer names the person it is about. · `— ${drill.student.student_id} ${drill.student.full_name_th}`` → ``` | **แถวที่มันค้ำ** 3 (แผงบอกว่าเป็นที่มาของใคร) · **ตายที่** แถว 4 ที่ `toContainText` ของรหัสนักศึกษา — แผงเหมือนของ #42 ทุกประการ ซึ่งเป็นคนละคำกล่าวอ้างที่วาดออกมาหน้าตาเดียวกัน · ที่มา `docs/acceptance/45-program-level-individual.md:188` `docs/acceptance/45-program-level-individual.md:62` |
| `sourceofferedonnothing` | A ดูที่มา on every row, including the outcomes nobody measured this student on. · `{plo.score === null ? ( <span className="text-xs text-slate-400">ยังไม่มีการวัด</span> ) :…` → `{false ? ( <span className="text-xs text-slate-400">ยังไม่มีการวัด</span> ) : (` | **แถวที่มันค้ำ** 2 (ข้อที่ไม่มีใครวัดไม่มีที่มาให้เปิด) · **ตายที่** แถว 5 ที่ `toHaveCount(0)` ของปุ่ม — ปุ่มขึ้นครบทุกแถวและทำงานสมบูรณ์แบบ กับความว่างเปล่า · **นี่คือข้อค้นพบของการเดิน #40 เอามาใส่กลับ** และคราวนี้มีแถวที่จับได้ · ที่มา `docs/acceptance/45-program-level-individual.md:189` |
| `emptydrawsthetable` | A student nobody has marked gets thirteen rows of dashes instead of a sentence, which beside a named person reads as a report that they failed everything. · `empty: measured_count === 0,` → `empty: false,` | **แถวที่มันค้ำ** 6 (คนที่ยังไม่มีคะแนนได้ข้อความ) · **ตายที่** แถว 6 ที่ `toBeVisible` ของประโยค — ได้ตารางขีดสิบสามแถวข้างชื่อคน ซึ่งอ่านได้ว่าเขาตกทุกข้อ · ที่มา `docs/acceptance/45-program-level-individual.md:190` |
"""

from harness import main

FILES = {
    "route": "backend/routes/programResults.js",
    "screen": "frontend/src/pages/ProgramLevelIndividual.js",
    "menu": "frontend/src/components/SidebarItem/ProgManager.js",
}

MUTANTS = {
    # The committee's entry points at the screen beside it. The menu still has
    # the item, it still reads the same, and nothing but following the link
    # catches it. Kills row 1 at `waitForURL`.
    "individualmenumisleads": (
        "menu",
        "        path: '/main/programLevelIndividual',",
        "        path: '/main/programLevelAllStudents',",
    ),
    # The picker is built from the marks instead of from the register. Every
    # student it offers is a real student and every report it opens is right;
    # the one it silently does not offer is the student nobody has assessed,
    # who is the person an appeal is most likely to be about. #43's first
    # criterion, put back the wrong way round one screen along.
    # Kills rows 1 and 6.
    "rollfrommarks": (
        "route",
        "        students: roll.map((student) => ({",
        "        students: roll.filter((student) => byStudent.has(student.student_id)).map((student) => ({",
    ),
    # The roll no longer says which of its rows has nothing behind it. The
    # student is offered, so the criterion the row above is about still holds -
    # what is lost is the committee being able to see it before they click.
    # Kills row 1.
    "rollhidesthequietone": (
        "screen",
        "                      {student.measured_count === 0 && (",
        "                      {false && (",
    ),
    # The search matches the name and not the code. A committee is given a
    # student code and types it, and a roll of a hundred and thirteen answers
    # that nobody matches. Kills row 1's narrowing assertion.
    "searchignoresthecode": (
        "screen",
        "  `${student.student_id} ${student.full_name_th}`.toLowerCase().includes(term.trim().toLowerCase())",
        "  `${student.full_name_th}`.toLowerCase().includes(term.trim().toLowerCase())",
    ),
    # The report is about the last student on the roll rather than the one who
    # was chosen. Every figure on it is correct - about somebody else. This is
    # the mutant that says a row asserting *thirteen outcomes are drawn* proves
    # nothing about *whose*. Kills rows 2 and 3.
    "reportignoresthechoice": (
        "screen",
        "      const answer = await getStudentResults(program, chosen)",
        "      const answer = await getStudentResults(program, roll[roll.length - 1].student_id)",
    ),
    # Only the outcomes this student was measured on. A perfectly reasonable
    # report, and it is the one thing an appeal cannot be read from: a student
    # cannot be held to an outcome nobody assessed them against, and the row
    # that would say so is gone. #38's rule at the grain of one person.
    # Kills rows 2 and 5.
    "reportskipsthequietoutcomes": (
        "route",
        "          plos: outcomes.map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),",
        "          plos: outcomes\n            .filter((outcome) => scores[outcome.outcome_id].score !== null)\n            .map((outcome) => ({ ...outcome, ...scores[outcome.outcome_id] })),",
    ),
    # The label a reader who cannot see the chip is given loses the student.
    # The figure is right and the outcome is named; what is gone is the only
    # thing on the cell that says whose report this is. Kills row 3.
    "cellforgetsthestudent": (
        "screen",
        "  return `${student.student_id} ${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`",
        "  return `${plo.outcome_code} ${plo.score.toFixed(2)} คะแนน ${line}`",
    ),
    # The label rounds to one place while the chip beside it shows two. Two
    # readings of one score, and the one a committee compares against the
    # heatmap is whichever they happen to be given. Kills row 3.
    "labelroundsitsown": (
        "screen",
        "${plo.score.toFixed(2)} คะแนน ${line}",
        "${plo.score.toFixed(1)} คะแนน ${line}",
    ),
    # The drill-down never closes. Pressing the button that opened it fetches
    # it again, which looks like a refresh and reads like a control that has
    # stopped working. Kills row 4.
    "drilldownwillnotclose": (
        "screen",
        "    setOpen(current => (current === plo.outcome_id ? null : plo.outcome_id))\n",
        "    setOpen(plo.outcome_id)\n",
    ),
    # The panel no longer names the person it is about. It is the same drawing
    # as #42's, which is the whole reason it has to say which of the two it is:
    # *what this cohort was marked on* and *what this student was marked on*
    # are different claims that look identical. Kills row 4.
    "drilldownforgetsthestudent": (
        "screen",
        " \u2014 ${drill.student.student_id} ${drill.student.full_name_th}`",
        "`",
    ),
    # A ดูที่มา on every row, including the outcomes nobody measured this
    # student on. The control works perfectly and opens on an empty panel -
    # #40's hand-walk finding, which every automated row of that ticket passed
    # straight through because they all asked whether the disclosure *worked*.
    # Kills row 5.
    "sourceofferedonnothing": (
        "screen",
        "                                  {plo.score === null ? (\n                                    <span className=\"text-xs text-slate-400\">ยังไม่มีการวัด</span>\n                                  ) : (",
        "                                  {false ? (\n                                    <span className=\"text-xs text-slate-400\">ยังไม่มีการวัด</span>\n                                  ) : (",
    ),
    # A student nobody has marked gets thirteen rows of dashes instead of a
    # sentence, which beside a named person reads as a report that they failed
    # everything. Kills row 6.
    "emptydrawsthetable": (
        "route",
        "          empty: measured_count === 0,",
        "          empty: false,",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
