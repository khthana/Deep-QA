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

    cd e2e && npx playwright test 41a
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

REGISTER_WHERE = "      WHERE cs.section_id = $1 AND cst.user_id = $2`,"

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
    "editorstartsempty": (
        "form",
        "    if (editing) setDraft(entry?.detail_text ?? '')",
        "    if (editing) setDraft('')",
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
    "onesectionperoffering": (
        "register",
        REGISTER_WHERE,
        "      WHERE cs.section_id = $1 AND cst.user_id = $2 AND cs.section_number = '1'`,",
    ),
    # The register stops asking who is calling. Every ผู้สอน reaches every
    # ตอนเรียน in the institution, reads its narrative and can edit it - and
    # nothing anywhere says so, because a screen that answers is a screen that
    # looks like it was meant to. ADR-0002 in one clause. Kills row 9.
    "registerignored": (
        "register",
        REGISTER_WHERE,
        "      WHERE cs.section_id = $1 AND ($2::text IS NOT NULL)`,",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
