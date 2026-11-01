# -*- coding: utf-8 -*-
"""
#19 ผลการเรียนรู้ระดับหลักสูตร — the mutants that proved `19a-plos.spec.js`.

Sixteen: twelve for #19's own ⚙ rows on
`docs/acceptance/19-programme-learning-outcomes.md`, and four added by #101.
One row has three because a removal on this screen has three possible answers
and each of them is a different piece of code.

#101 moved two anchors on its way past, which is #123's shape arriving inside
the ticket that caused it rather than a fortnight later. `codeorder` was
written against `ORDER BY lo.program_id ASC, lo.path ASC` and there is no
`program_id` in that clause any more — every row of an answer is now of one
curriculum, so sorting by it sorted nothing. `nofilter` was written against the
`($2::text IS NULL OR ...)` that made naming a curriculum optional, and naming
one is what the route now insists on. Both were re-aimed and both still kill
the row they were written for. `codeorder` kills the one row it always did.
`nofilter` kills two more than it did - #101 wrote two rows about the claim it
breaks - and it took two attempts to aim, because the obvious edit left the
statement one parameter short of what was bound to it and answered 500 to
everything, killing row 1 on `openPlos` before any assertion about curricula
ran. The numbers in this file are what the sweep answered rather than what any
of that predicted.

*What #101 could not write a mutant for, and why.* `Plos.js` asks for no
outcomes until a curriculum is chosen — `if (!program) return` at the top of
`load`. Take that line away and the screen asks for the list on arrival with no
`program_id`, the route refuses it, and `openPlos` — which sixteen of the
seventeen rows begin with and which asserts a 200 — fails in all of them. That
is #85's shape: the line is the premise every row stands on rather than a claim
any one of them makes, and a mutant for it would only prove the suite can run.
The claim it is defence in depth for is held where it can fail alone: at the
HTTP seam, by `programoptional` below, on a subtest that asks the route the
question the screen no longer asks.

`/code-review` found two more of that third kind - untested rather than proved
or unreachable - and both are about data the seed does not hold. The landing
rule is *the first curriculum in reach that is still running*, and every
curriculum in the seed is active, so nothing can tell it from `reachable[0]`;
`landsonthelast` breaks both halves at once and cannot separate them. And the
sentence for an account that reaches no curriculum at all cannot be drawn by
any seeded account, because #102 gave department `01` its own curriculum. Both
are written on the rows they belong to rather than left as a silence a reader
would take for proof.

Two of these are worth reading before trusting the rows they back.

The three that are about order are three because the claims they break are
three, and because the file runs serially: the first row to die stops the rest,
so a mutant that kills an earlier row than the one it is written for looks like
a clean kill and proves nothing. Each of these is aimed past the rows before it.

`codeorder` replaces the whole walk's ORDER BY with the outcome code, which
makes 0503's PLO-2 fall back behind PLO-1. That is the *fourth* criterion —
display order respected — and only the seeded pair can see it, for #96's reason:
everywhere else in the seed, sequence_order and the code agree.

`childpath` leaves the roots alone and drops `sequence_order` from the
*recursive* branch's path, so sub-outcomes sort by identifier within their
parent. 0503's pair were seeded in order and survive it; the two children this
spec adds were not, and the row about the tree's shape dies. Ordering the whole
walk by identifier would have killed the code-order row first instead, which is
why the mutant is written against the one branch.

`ordernotsaved` stops the edit route writing the column, leaving creation to
write it as before. Every row up to the fourth is untouched — they only ever
create — and the fifth, which moves an outcome that already exists, is the
first thing that notices.

`hardcancel` makes the dialog's ยกเลิก do what its ยืนยัน does. It is written
that way round on purpose: a mutant that skipped the dialog entirely would kill
the two removal rows as well, and then none of the three would be evidence
about confirmation specifically.

    python mutation/19-plos.py save
    python mutation/19-plos.py codeorder
    cd e2e && npx playwright test 19a        # expect exactly the named failure
    python mutation/19-plos.py restore

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `codeorder` | **ทำอะไรพัง** เรียงต้นไม้ตาม `outcome_code` แทน path ของลำดับ | **แถวที่ตาย** รายการเรียงตามลำดับที่ตั้งไว้ ไม่ใช่ตามรหัส · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:192` |
| `childpath` | **ทำอะไรพัง** path ของกิ่งเวียนไม่อ่าน `sequence_order` (ข้อหลักคงเดิม) | **แถวที่ตาย** ข้อย่อยเรียงอยู่ใต้ข้อหลักของตัวเอง · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:193` |
| `ordernotsaved` | **ทำอะไรพัง** การแก้ไขไม่เขียนคอลัมน์ `sequence_order` | **แถวที่ตาย** เปลี่ยนลำดับแล้วแถวขยับจริง · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:194` |
| `pickeroffersall` | **ทำอะไรพัง** ช่อง *อยู่ใต้ข้อ* เสนอทุกข้อ รวมทั้งตัวเองและลูกหลาน | **แถวที่ตาย** ตัวเลือกข้อหลักไม่เสนอสิ่งที่ server จะปฏิเสธ · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:195` |
| `hardcancel` | **ทำอะไรพัง** ปุ่ม *ยกเลิก* ในกล่องยืนยันทำสิ่งที่ปุ่มยืนยันทำ | **แถวที่ตาย** ถามยืนยันก่อนลบ และกดยกเลิกแล้วไม่มีอะไรเปลี่ยน · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:196` |
| `nochildguard` | **ทำอะไรพัง** ทิ้งการถามเรื่องข้อย่อย ปล่อยให้ `deleteOrDeactivate` จัดการ | **แถวที่ตาย** ข้อหลักที่ยังมีข้อย่อย ลบไม่ได้ · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:197` |
| `saysdeleted` | **ทำอะไรพัง** ตอบ `deactivated: false` ทั้งที่ปิดการใช้งาน | **แถวที่ตาย** PLO ที่ถูกอ้างอิง ถูกปิดการใช้งานแทนการลบ (ครึ่งแถบข้อความ) · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:198` |
| `hideinactive` | **ทำอะไรพัง** รายการซ่อนข้อที่ปิดการใช้งาน | **แถวที่ตาย** ครึ่งที่แถวยังอยู่ในตาราง · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:199` |
| `statusignored` | **ทำอะไรพัง** `PUT` ไม่เขียน `is_active` | **แถวที่ตาย** เปิดกลับได้จากหน้าเดิม · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:200` |
| `nofilter` | **ทำอะไรพัง** `?program_id=` ไม่ถูกใช้ (เล็งใหม่ใน [#101](https://github.com/khthana/Deep-QA/issues/101) หลังจาก `IS NULL OR` หายไป) | **แถวที่ตาย** สามแถว — *ผู้ดูแลภาควิชาเลือกหลักสูตรแล้วรายการเปลี่ยนตาม* ของ #19 บวกสองแถวของ [#101](https://github.com/khthana/Deep-QA/issues/101) วัดทีละแถวด้วย `--grep` · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:201` |
| `facultyadmin` | **ทำอะไรพัง** ใส่ `FACULTY_ADMIN` กลับเข้า `MAINTAINERS` | **แถวที่ตาย** บัญชีที่ไม่ควรเข้าถึงเลย — ครึ่งที่เป็นกฎ · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:206` |
| `alwaysadropdown` | **ทำอะไรพัง** หน้ารายการวาด dropdown แม้มีหลักสูตรเดียว | **แถวที่ตาย** สองแถว — *ช่องหลักสูตรไม่ต้องเลือกเมื่อมีหลักสูตรเดียว* ของ #19 บวกแถวกรรมการหลักสูตรของ [#101](https://github.com/khthana/Deep-QA/issues/101) — ตัวที่สองเพิ่งนับได้หลังจาก locator ของตัวกรองเลิกดูเฉพาะ `0501` · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:191` |
| `alwaysallprograms` | **ทำอะไรพัง** ใส่ตัวเลือก *ทุกหลักสูตร* กลับเข้าตัวกรอง | **แถวที่ตาย** ตัวกรองหลักสูตรไม่มี *ทุกหลักสูตร* อีกต่อไป (แถวเดียว) · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:202` |
| `landsonthelast` | **ทำอะไรพัง** หน้าจอเลือกหลักสูตรสุดท้ายในสิทธิ์ แทนที่จะเลือกตัวแรก | **แถวที่ตาย** เข้าหน้ามาแล้วอยู่ที่หลักสูตรแรก และแถวช่อง *อยู่ใต้ข้อ* ซึ่งตั้งต้นด้วยข้อเดียวกัน · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:203` |
| `formkeepsthetable` | **ทำอะไรพัง** ช่อง *อยู่ใต้ข้อ* อ่านจากหลักสูตรที่ตารางกรองไว้ ไม่ใช่ของหลักสูตรที่ฟอร์มอยู่ | **แถวที่ตาย** ช่อง *อยู่ใต้ข้อ* เสนอข้อของหลักสูตรที่ฟอร์มอยู่ (แถวเดียว) · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:204` |
| `programoptional` | **ทำอะไรพัง** `GET /plos` เลิกปฏิเสธคำขอที่ไม่ระบุหลักสูตร | **แถวที่ตาย** ที่ seam ของ HTTP: *the list refuses to answer without a curriculum* — ตายแถวเดียวใน 717 แถว · ที่มา `docs/acceptance/19-programme-learning-outcomes.md:205` `docs/acceptance/19-programme-learning-outcomes.md:129` |
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from harness import main  # noqa: E402

FILES = {
    "route": "backend/routes/plos.js",
    "page": "frontend/src/pages/Plos.js",
    "form": "frontend/src/components/plos/PloForm.js",
}

MUTANTS = {
    # Row 3 — the list is in the stated order, not in the order of the codes.
    "codeorder": (
        "route",
        "          ORDER BY lo.path ASC`,",
        "          ORDER BY lo.outcome_code ASC`,",
    ),
    # Row 4 — a child is drawn directly under its parent, siblings in order.
    # Only the recursive branch, so the roots — and the row before this one —
    # keep the order they had.
    "childpath": (
        "route",
        "           SELECT child.*, t.path || child.sequence_order || child.outcome_id",
        "           SELECT child.*, t.path || child.outcome_id",
    ),
    # Row 5 — changing the display order moves the row. The walk still walks and
    # creation still writes the field; what stops is the edit that was just made.
    "ordernotsaved": (
        "route",
        "                  sequence_order = $7,",
        "                  sequence_order = sequence_order,",
    ),
    # Row 6 — the parent picker offers neither the outcome being edited nor
    # anything under it.
    "pickeroffersall": (
        "form",
        "  const excluded = editing ? subtreeOf(plos, value.outcome_id) : new Set()",
        "  const excluded = new Set()",
    ),
    # Row 7 — removal asks first, and answering no leaves the outcome alone.
    "hardcancel": (
        "page",
        """        onCancel={() => {
          setNotice(null)
          setRemoving(null)
        }}""",
        "        onCancel={confirmRemoval}",
    ),
    # Row 8 — a main outcome with sub-outcomes is refused rather than switched
    # off. Without the guard `deleteOrDeactivate` reads the children's foreign
    # key as any other reference and quietly deactivates the parent.
    "nochildguard": (
        "route",
        "          if (rows[0]) throw new HasChildren();",
        "          if (false) throw new HasChildren();",
    ),
    # Row 9, first half — the banner says which of the two things happened.
    "saysdeleted": (
        "route",
        "      return res.status(200).json({ plo: outcome.row, deactivated: true });",
        "      return res.status(200).json({ plo: outcome.row, deactivated: false });",
    ),
    # Row 9, second half — a switched-off outcome is still listed. This is the
    # screen it is switched back on from, so a list that hides it is a one-way
    # door: the code is held by the row that is already there.
    "hideinactive": (
        "route",
        "            WHERE lo.parent_outcome_id IS NULL",
        "            WHERE lo.parent_outcome_id IS NULL AND lo.is_active",
    ),
    # Row 9, third half — and switching it back on has to reach the column.
    # The swapped coalesce still reads $9, which matters: dropping the parameter
    # instead would leave the statement one short of what is bound to it, and
    # every edit on the screen would fail with it — killing the order row long
    # before this one.
    "statusignored": (
        "route",
        "                  is_active = coalesce($9, is_active),",
        "                  is_active = coalesce(is_active, $9),",
    ),
    # Row 10 — an administrator narrows the list to one curriculum, and each
    # keeps its own codes. Without the filter both trees stay on screen and the
    # two PLO-1s are two rows.
    #
    # Re-aimed by #101, which deleted the `IS NULL OR` this used to disable:
    # the parameter is no longer optional, so what is left to take away is the
    # comparison itself. It answers the caller's whole reach instead of the
    # curriculum they named, which is the defect #101 is about seen from the
    # route rather than from the screen.
    #
    # `OR true` rather than plain `true`, and that is not cosmetic. Dropping
    # the only mention of `$2` leaves the statement one parameter short of what
    # is bound to it, so every list on the screen answers 500 and the first row
    # of the file dies on `openPlos` before any assertion about curricula runs
    # - #97's mutant that stops the application working, measured and thrown
    # away rather than reasoned about. The condition has to stay a condition.
    "nofilter": (
        "route",
        "              AND lo.program_id = $2",
        "              AND (lo.program_id = $2 OR true)",
    ),
    # Row 11 — the accounts this screen is not for are refused it. #79 names
    # A09 among the three tickets it binds.
    "facultyadmin": (
        "route",
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
        "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'FACULTY_ADMIN'];",
    ),
    # Row 1 — one curriculum in reach is stated rather than asked about. It
    # kills row 16 as well since #101, and the reason is worth keeping: that
    # row asserts the filter is *not drawn* for a committee member, and the
    # locator it asks with had to learn `0503` before it could tell a dropdown
    # holding one curriculum from no dropdown at all. Written against `0501`
    # alone — which is how it was first written — row 16 passed under this
    # mutant, and a row that cannot fail is not evidence.
    "alwaysadropdown": (
        "page",
        "              {programs.length > 1 ? (",
        "              {programs.length > 0 ? (",
    ),
    # #101, row 13 — the filter offers the curricula in reach and nothing
    # wider. The option as it stood, put back. It is `ทุกหลักสูตร` and not
    # some other label because a label the screen never had would prove the row
    # reads the list of options and not that this option is gone.
    #
    # This is the mutant `plos-screen.js` will not let the filter's locator be
    # built against. Found by the absence of a blank option, the control would
    # simply not be found here and the row would die without its assertion ever
    # running - #85's trap, one step from being walked into.
    # The anchor is the `map`, not the comment above it. A comment carrying
    # Thai is the most reflow-prone line on the screen - a reworded note or a
    # formatter would move it and this mutant would answer MISS, which is
    # #123's whole subject. `/code-review` asked for the code line instead.
    "alwaysallprograms": (
        "page",
        """                    {programs.map(entry => (""",
        """                    <option value="">ทุกหลักสูตร</option>
                    {programs.map(entry => (""",
    ),
    # #101, row 14 — the screen lands on the *first* curriculum in reach.
    #
    # The last rather than none, deliberately. Choosing none leaves `program`
    # empty, `load` never fires, and every row in the file waits on a list that
    # is never asked for: #97's mutant that stops the application working,
    # which says nothing about which assertion was holding what. Choosing the
    # wrong one leaves the screen working perfectly on the wrong curriculum,
    # which is a thing one row can fail on.
    "landsonthelast": (
        "page",
        "        const first = reachable.find(entry => entry.is_active !== false) ?? reachable[0]",
        "        const first = reachable[reachable.length - 1]",
    ),
    # #101, row 17 — the form's ข้อหลัก picker offers the outcomes of the
    # curriculum the *form* is on, which need not be the one the table shows.
    # This is the caller the ticket predicted would not turn up.
    "formkeepsthetable": (
        "page",
        "  const parentPool = formProgram && formProgram !== program ? formOutcomes : plos",
        "  const parentPool = plos",
    ),
    # #101 at the HTTP seam - the list will not answer without a curriculum.
    # The only one of the four killed by `node --test`, so the row it backs is
    # ☑ and not ⚙. With the guard gone `program` binds null, `lo.program_id =
    # NULL` matches nothing, and the answer is an empty 200 - which is the
    # shape of the thing worth refusing: a question with no answer, answered.
    "programoptional": (
        "route",
        "      if (!program) return res.status(400).json({ message: REFUSALS.ploProgramRequired });",
        "      if (false) return res.status(400).json({ message: REFUSALS.ploProgramRequired });",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
