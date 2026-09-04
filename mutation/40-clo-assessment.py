# -*- coding: utf-8 -*-
"""
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

    cd e2e && npx playwright test 40a
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
        "    } finally {\n"
        "      // #43's walk found two screens that showed a refusal with\n"
        "      // *กำลังโหลดข้อมูล…* under it for ever. The `finally` is the fix, and it\n"
        "      // is one line per page rather than something shared.\n"
        "      setLoading(false)\n"
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
