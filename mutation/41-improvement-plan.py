# -*- coding: utf-8 -*-
"""
#41 แผนการปรับปรุงอย่างต่อเนื่อง - the four sentences a year is judged by.

Thirteen mutants, one per claim `41a` makes, and two of them in a file this
ticket did not write.

The grain, the create-on-demand, the year that gets referenced, the four
permitted types and every refusal are pinned in
`backend/test/improvement-plan.test.js`, where the answer is a row and can be
counted. What is left to a browser is what only exists once the screen is
drawn: that what one ผู้สอน writes the other reads, that a second save replaces
rather than stacks, that the confirmation is asked, that the four sections
follow the outcome that is chosen, that last year's words stand beside this
year's for the same *number*, and that the panel carrying them is not drawn at
all where there is no earlier year.

`register` is `backend/routes/clos.js`, which #27 wrote and this screen reuses
whole. Two claims of `41a` are claims about it - that both ผู้สอน of one
Offering are admitted, and that a stranger is not - and there is no way to
break either from inside this ticket's own files, because the record has no
Section column to filter on and no owner to compare against. So the mutants go
where the decision lives. **Do not run this sweep while `27`'s is applied**, and
`save` first: `restore` rewrites every file in FILES from this script's backup.

    python mutation/41-improvement-plan.py save
    python mutation/41-improvement-plan.py <mutant>
    python mutation/41-improvement-plan.py restore

Killing them:

    cd e2e && npx playwright test tests/41a-improvement-plan.spec.js

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `onlythreesections` | **แตะอะไร** screen · **ทำอะไร** ตัด *แนวทางพัฒนาครั้งถัดไป* ออกจากฟอร์ม | **แถวที่มันค้ำ · ตายที่** **แถว 1** · หัวข้อที่สี่ต้องมองเห็นได้ · **แถวอื่นที่ตายไปด้วย** 4 (ปนเปื้อน — แถว 4 เขียนลงหัวข้อที่หายไป) · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:236` `docs/acceptance/41-continuous-improvement-plan.md:86` |
| `savesthelabel` | **แตะอะไร** screen · **ทำอะไร** บันทึกชื่อหัวข้อแทนสิ่งที่พิมพ์ | **แถวที่มันค้ำ · ตายที่** **แถว 2** · ข้อความบนการ์ดต้องเป็นประโยคที่พิมพ์ · **แถวอื่นที่ตายไปด้วย** 3 · 5 · 6 (ปนเปื้อน — ทุกแถวที่อ่านข้อความกลับมา) · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:237` `docs/acceptance/41-continuous-improvement-plan.md:86` |
| `writesagainstthefirstoutcome` | **แตะอะไร** screen · **ทำอะไร** เขียนลง CLO ตัวแรกเสมอ ไม่ใช่ที่เลือก | **แถวที่มันค้ำ · ตายที่** **แถว 2** · `entries[0].clo_id` ต้องเป็นของ CLO-9 · **แถวอื่นที่ตายไปด้วย** 3 · 4 · 5 · 6 · 7 (ปนเปื้อน — ทุกแถวที่เขียนลง CLO อื่นที่ไม่ใช่ตัวแรก) · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:238` `docs/acceptance/41-continuous-improvement-plan.md:86` |
| `editkeepstheoldwords` | **แตะอะไร** route · **ทำอะไร** upsert เก็บข้อความเดิมไว้ | **แถวที่มันค้ำ · ตายที่** **แถว 3** · บันทึกครั้งที่สองต้องได้ *ฉบับที่สอง* · **แถวอื่นที่ตายไปด้วย** 6 (ปนเปื้อน — การแก้ของอีกฝั่งไม่ถึงจอแรก) · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:239` `docs/acceptance/41-continuous-improvement-plan.md:90` |
| `editorstartsempty` | **แตะอะไร** form · **ทำอะไร** เปิดแก้ไขแล้วได้กล่องเปล่า | **แถวที่มันค้ำ · ตายที่** **แถว 3** · `toHaveValue('ฉบับแรก')` · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:240` `docs/acceptance/41-continuous-improvement-plan.md:90` |
| `cancelalsoremoves` | **แตะอะไร** screen · **ทำอะไร** *ยกเลิก* บนกล่องยืนยันลบทิ้งด้วย | **แถวที่มันค้ำ · ตายที่** **แถว 4** · รายการ DELETE ระหว่างที่กล่องเปิดต้องว่าง · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:241` `docs/acceptance/41-continuous-improvement-plan.md:90` |
| `everyoutcomeshowseverything` | **แตะอะไร** screen · **ทำอะไร** สี่หัวข้อเลิกกรองตาม CLO | **แถวที่มันค้ำ · ตายที่** **แถว 5** · CLO-5 ต้องไม่มีข้อความของ CLO-4 · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:242` `docs/acceptance/41-continuous-improvement-plan.md:86` |
| `referencejoinedbyid` | **แตะอะไร** screen · **ทำอะไร** แผงอ้างอิง join ด้วย `clo_id` | **แถวที่มันค้ำ · ตายที่** **แถว 7** · แผงต้องมีข้อความของปีก่อน · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:244` `docs/acceptance/41-continuous-improvement-plan.md:93` |
| `panelignorestheoutcome` | **แตะอะไร** screen · **ทำอะไร** แผงอ้างอิงเลิกกรองตามเลขข้อ | **แถวที่มันค้ำ · ตายที่** **แถว 7** · CLO-8 ต้องไม่เห็นบันทึกของ CLO-7 · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:245` `docs/acceptance/41-continuous-improvement-plan.md:93` |
| `improvementforgetstheyear` | **แตะอะไร** route · **ทำอะไร** การปรับปรุงไม่บันทึกปีที่อ้างถึง | **แถวที่มันค้ำ · ตายที่** **แถว 7** · การ์ดต้องมีปี 2568 อยู่ในนั้น · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:246` `docs/acceptance/41-continuous-improvement-plan.md:93` |
| `panelopensontonothing` | **แตะอะไร** route · **ทำอะไร** ส่ง `previous` เสมอ แผงจึงเปิดบนความว่างเปล่า | **แถวที่มันค้ำ · ตายที่** **แถว 8** · `toHaveCount(0)` · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:247` `docs/acceptance/41-continuous-improvement-plan.md:94` |
| `onesectionperoffering` | **แตะอะไร** register · **ทำอะไร** ทะเบียนรับเฉพาะตอนเรียนที่ 1 | **แถวที่มันค้ำ · ตายที่** **แถว 6** · `multi.role@` ต้องเปิดแผนของตัวเองได้ · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:243` `docs/acceptance/41-continuous-improvement-plan.md:97` |
| `registerignored` | **แตะอะไร** register · **ทำอะไร** ทะเบียนเลิกถามว่าใครเรียก | **แถวที่มันค้ำ · ตายที่** **แถว 9** · `teacher.two@` ต้องได้ 404 · ที่มา `docs/acceptance/41-continuous-improvement-plan.md:248` `docs/acceptance/41-continuous-improvement-plan.md:99` |
"""

from harness import main

FILES = {
    "route": "backend/routes/improvementPlan.js",
    "screen": "frontend/src/pages/ContinuousImprovement.js",
    "form": "frontend/src/components/improvement/EntrySection.js",
    "register": "backend/routes/clos.js",
}

NEXT_PLAN = """  {
    type: 'NEXT_PLAN',
    label: 'แนวทางพัฒนาครั้งถัดไป',
    hint: 'สิ่งที่ตั้งใจจะทำในปีการศึกษาถัดไป และสิ่งที่จะใช้ดูว่าได้ผลหรือไม่',
  },
]"""

REFERENCE_FILTER = """    return data.previous.entries.filter(
      entry => entry.clo_number === clo.clo_number
    )"""

REGISTER_WHERE = "      ${THIS_ACCOUNTS_SECTION}`,"

MUTANTS = {
    # One of the four sections of the form stops being offered. The screen is
    # otherwise perfect - three headings, three editors, three saves that work -
    # and the record simply never acquires a แนวทางพัฒนาครั้งถัดไป for any
    # รายวิชา in any year. A person who never used the fourth box would not
    # notice it had gone, which is why the row counts them rather than using
    # them. Kills row 1.
    "onlythreesections": ("screen", NEXT_PLAN, "]"),
    # The save posts the name of the section instead of what was typed. The
    # request succeeds, the record fills up, and every box on the screen reads
    # back the word SUMMARY - it is what a slip between two variables in one
    # object literal does, and the screen shows it happily. Kills row 2.
    "savesthelabel": ("screen", "        detail_text: text,", "        detail_text: editing,"),
    # Everything is written against whichever ผลการเรียนรู้ came back first,
    # rather than against the one that is chosen. The screen still shows the
    # words after saving - the read filters by the same wrong id - so nothing
    # on the page disagrees with itself, and a year's narrative quietly piles
    # up under CLO-1. Kills row 2 at the outcome, which is why that row writes
    # under the last outcome and not the first.
    "writesagainstthefirstoutcome": (
        "screen",
        "        clo_id: clo.clo_id,",
        "        clo_id: data.clos[0].clo_id,",
    ),
    # The upsert keeps what was already there. The request answers 200, the
    # entry count stays at one, and the screen redraws with the old words -
    # which reads as a save that did not take rather than as a bug, and is the
    # exact shape of `EXCLUDED` being written the wrong way round. Kills row 3.
    "editkeepstheoldwords": (
        "route",
        "               DO UPDATE SET detail_text = EXCLUDED.detail_text,",
        "               DO UPDATE SET detail_text = clo_course_cycle_detail_cloplan.detail_text,",
    ),
    # Reopening an entry for editing starts from an empty box. Cancelling still
    # cancels and saving still saves, so nothing is lost by the machinery - it
    # is lost by the person, who now retypes from memory whatever they meant to
    # amend. #33 met this one screen over. Kills row 3 at the reopen.
    # Re-aimed by #150, which rewrote the line this sat on. The seeding is now
    # behind `opening || replaced`; the mutant's meaning is unchanged - the
    # editor opens empty instead of holding what was saved - and it was swept
    # again on the day it moved, because an anchor check says a mutant still
    # applies and only a run says it still proves anything.
    "editorstartsempty": (
        "form",
        "    if (opening || replaced) setDraft(entry?.detail_text ?? '')",
        "    if (opening || replaced) setDraft('')",
    ),
    # ยกเลิก on the confirmation removes the entry. The dialog is drawn, the
    # question is asked, and both answers mean yes - the worst version of this
    # defect, because the person who pressed cancel has no reason to look
    # again. Kills row 4.
    "cancelalsoremoves": (
        "screen",
        "        onCancel={() => setRemoving(null)}",
        "        onCancel={remove}",
    ),
    # The four sections stop filtering by outcome, so every ผลการเรียนรู้ shows
    # whatever was written under any of them. With one outcome written about it
    # looks exactly right, and a screen is rarely tested with two. Kills row 5.
    "everyoutcomeshowseverything": (
        "screen",
        "      if (String(entry.clo_id) === cloId) byType[entry.detail_type] = entry",
        "      byType[entry.detail_type] = entry",
    ),
    # The reference panel is joined on `clo_id` rather than on the number. This
    # is the mutant this ticket exists to be able to kill: ADR-0003 gives every
    # ปีการศึกษา its own CLO rows, so the ids never match across years and the
    # panel is empty on every รายวิชา, for ever - and an empty panel is
    # indistinguishable from a year nobody wrote in. Kills row 7.
    "referencejoinedbyid": (
        "screen",
        REFERENCE_FILTER,
        """    return data.previous.entries.filter(
      entry => String(entry.clo_id) === cloId
    )""",
    ),
    # The panel stops filtering at all, so last year's reflection on CLO-7 is
    # offered as background for writing about CLO-8. It is the previous mutant's
    # opposite and the more plausible slip of the two: the request already
    # carries only this รายวิชา's entries, so the filter looks redundant right
    # up until a second outcome has one. Kills row 7 at the outcome.
    "panelignorestheoutcome": (
        "screen",
        REFERENCE_FILTER,
        "    return data.previous.entries",
    ),
    # An improvement stops recording the year it followed from. The words are
    # saved, the panel still shows what they answer, and only the citation is
    # missing - which is the half an accreditation panel reads, because it is
    # the half that says this change was a response and not a coincidence.
    # Kills row 7 at the citation.
    "improvementforgetstheyear": (
        "route",
        """        const reference =
          draft.values.detail_type === REFERRING ? await referenceYear(offering) : null;""",
        "        const reference = null;",
    ),
    # `previous` becomes an envelope that is always sent, so the screen draws
    # the panel over nothing: a heading reading ปีการศึกษา with no year in it,
    # and ไม่มีบันทึกของ CLO-1 underneath. This is #40's defect reproduced on
    # purpose - a control that answers nothing - and every other row in the file
    # passes with it applied, because they all ask whether the panel shows what
    # is in it. Kills row 8.
    "panelopensontonothing": (
        "route",
        """          previous: year
            ? { academic_year: year, entries: await entriesOf(offering, year) }
            : null,""",
        "          previous: { academic_year: year, entries: await entriesOf(offering, year) },",
    ),
    # The register admits only ตอนเรียน 1 of an Offering, which is what an
    # assumption that a รายวิชา has one class per year looks like in SQL. The
    # first teacher sees everything and the second is told their own class does
    # not exist - and the fifth criterion, that the narrative is shared, is
    # exactly the thing that stops being true. Kills row 6.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in clos.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against 41a.
    "onesectionperoffering": (
        "register",
        REGISTER_WHERE,
        "      WHERE cs.section_id = $1 AND cst.user_id = $2 AND cs.section_number = '1'`,",
    ),
    # The register stops asking who is calling. Every ผู้สอน reaches every
    # ตอนเรียน in the institution, reads its narrative and can edit it - and
    # nothing anywhere says so, because a screen that answers is a screen that
    # looks like it was meant to. ADR-0002 in one clause. Kills row 9.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in clos.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against 41a.
    "registerignored": (
        "register",
        REGISTER_WHERE,
        "      WHERE cs.section_id = $1 AND ($2::text IS NOT NULL)`,",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
