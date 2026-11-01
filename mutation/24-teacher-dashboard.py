# -*- coding: utf-8 -*-
"""
#24 หน้าหลักผู้สอน - the ตอนเรียน a Teacher teaches, and the one they have open.

Mutants for both seams. What the routes answer is asked in
`backend/test/teaching.test.js`; what only a browser can show - a term that has
quietly stopped being named, a menu entry pointing at a placeholder, a Section
that survived a reload for the wrong reason - is asked in
`e2e/tests/24a-teacher-dashboard.spec.js`.

    python mutation/24-teacher-dashboard.py save
    python mutation/24-teacher-dashboard.py <mutant>
    cd backend && node --test test/teaching.test.js
    # or, for the browser ones:
    cd e2e && npx playwright test tests/24a-teacher-dashboard.spec.js
    python mutation/24-teacher-dashboard.py restore

`notoken`, `termlessempty`, `rememberedsection`, `staydashboard` and
`nosectionnumber` mutate CRA source. Do not apply one while a run is in flight
or a dev frontend is up: the running server compiles what is on disk at that
moment, and a mutant applied mid-run is a result about nothing. The e2e stack
boots its own frontend per run (`reuseExistingServer: false`), so apply first,
then run.

## The two that are worth reading first

`notoken` is the one this file was written for. ADR-0004 replaced `%SUBJECT%`,
read out of `localStorage`, with a `section_id` taken from the address, and the
single line that does the replacing had no assertion anywhere: a token that was
never substituted navigates to a path *containing the token*, which routes to
NotBuiltYet - on the screen, indistinguishable from a screen that has genuinely
not been built yet. Every other row in the file passed with that line broken.
The row added to kill it is the only one that clicks a menu entry.

`staydashboard` deliberately kills three rows at once and is kept anyway. Rows
3, "the menu entry", and 5 are three consequences of one claim - the address is
the carrier - so a mutant that removes the id from the address ought to take all
three, and one that took only one would mean two of them were passing for some
other reason. What discriminates *between* them is elsewhere: `notoken` for the
menu, `rememberedsection` for the reload.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `anyterm` | **ทำอะไร** เอาเงื่อนไขปีและภาคออกจากรายการ (คงจำนวนพารามิเตอร์ไว้) | **ตายที่** 4 จาก 10 subtests รวมทั้ง *a teacher sees the sections they teach this term, and not last year and this* — `teacher.one@` เห็นสองตอนเรียนแทนที่จะเป็นหนึ่ง คู่ตอนเรียน 1 ของสองปีคือตัวแยกแยะทั้งหมดของแถวนี้ · ที่มา `docs/acceptance/24-teacher-dashboard.md:145` |
| `anysection` | **ทำอะไร** เอา `cst.user_id = $2` ออกจากการอ่านทีละตอน | **ตายที่** 3 subtests รวมทั้ง *a section the caller does not teach is refused, and refused as not found* และ *a colleague teaching the next section along of the same subject is still refused* — ด่านภาควิชายังอยู่และยังตอบว่าใช่ ซึ่งเป็นประเด็นทั้งหมด · ที่มา `docs/acceptance/24-teacher-dashboard.md:146` |
| `norolegate` | **ทำอะไร** เอา `requireRole(...TEACHING)` ออกจากหน้าหลัก | **ตายที่** 2 subtests คือ *the account holding two roles has to be acting as the teacher* และ *a role that is not a teaching one does not reach these routes at all* — บัญชีผู้สอนบทบาทเดียวทุกบัญชีไม่กระทบ ซึ่งเป็นสิ่งที่ทำให้มันเป็นมัตแตนต์ของแถวสองบทบาทโดยเฉพาะ · ที่มา `docs/acceptance/24-teacher-dashboard.md:147` |
| `currenttermonly` | **ทำอะไร** เอากฎของ *รายการ* ไปบังคับกับการอ่านทีละตอน | **ตายที่** 1 subtest คือ *the section of the year before is still reachable one at a time* — ตัวเดียว ตรงตามแถวที่มันค้ำ · ที่มา `docs/acceptance/24-teacher-dashboard.md:148` `docs/acceptance/24-teacher-dashboard.md:86` |
| `countjoin` | **ทำอะไร** นับนักศึกษาข้าม join ขึ้นไปถึงรายวิชาที่เปิดสอน | **ตายที่** 1 subtest ที่ `student_count` — 113 แทน 57 ทั้งสองเลขอ่านดูสมเหตุสมผลบนการ์ด · ที่มา `docs/acceptance/24-teacher-dashboard.md:149` `docs/acceptance/24-teacher-dashboard.md:76` |
| `nonumericguard` | **ทำอะไร** ผูก query ด้วยที่อยู่ดิบ แทนค่าที่ `integerId` ตรวจแล้ว (เดิมเอาด่าน `/^\d+$/` ออก — #107 ทำให้ต้องเล็งใหม่) | **ตายที่** **2 subtests** คือ *an id that is not a number is refused rather than raised* และ *an id too large for the column is ไม่พบ, not a 500* — id ที่ไม่ใช่ตัวเลขทะลุไปถึง PostgreSQL แล้วกลับมาเป็น 22P02 ส่วนตัวเลขล้วนที่กว้างเกินคอลัมน์กลับมาเป็น 22003 ทั้งคู่ผ่าน error handler เป็น 500 · ที่มา `docs/acceptance/24-teacher-dashboard.md:150` |
| `notoken` | **ทำอะไร** `sub.path.replace(SECTION_TOKEN, section)` กลายเป็น `sub.path` | **ตายที่** แถว *a section-specific menu entry leads to that section and not to a placeholder* บรรทัด 124 (`waitForURL`) — ตายแถวเดียว อีกหกแถวผ่านหมด · ที่มา `docs/acceptance/24-teacher-dashboard.md:156` |
| `termlessempty` | **ทำอะไร** สถานะว่างเลิกเอ่ยชื่อเทอม | **ตายที่** แถว 2 บรรทัด 89 — ตายแถวเดียว · ที่มา `docs/acceptance/24-teacher-dashboard.md:157` |
| `rememberedsection` | **ทำอะไร** เขียนตอนเรียนที่เลือกลง `localStorage` ด้วย (พฤติกรรมเดิมที่รับสืบมา) | **ตายที่** แถว 5 บรรทัด 155 (`toEqual([null, null])`) — ตายแถวเดียว ทุกแถวที่พูดถึง *การเดินทาง* ยังผ่าน ซึ่งเป็นประเด็นทั้งหมด · ที่มา `docs/acceptance/24-teacher-dashboard.md:158` |
| `staydashboard` | **ทำอะไร** ไม่ใส่ `section_id` ลงในที่อยู่เลย | **ตายที่** สามแถว คือ 3, แถวเมนู และ 5 ทั้งหมดตายที่ `waitForResponse` ใน `support/teaching-screen.js:33` · ที่มา `docs/acceptance/24-teacher-dashboard.md:159` |
| `nosectionnumber` | **ทำอะไร** หน้าตอนเรียนเลิกบอกว่าเป็นตอนเรียนที่เท่าไหร่ | **ตายที่** แถว 3 บรรทัด 103 — ตายแถวเดียว ที่อยู่ยังถูกและวิชายังถูก · ที่มา `docs/acceptance/24-teacher-dashboard.md:160` |
"""

from harness import main

FILES = {
    "routes": "backend/routes/teaching.js",
    "sidebar": "frontend/src/components/SidebarItem.js",
    "dashboard": "frontend/src/pages/TeacherDashboard.js",
    "section": "frontend/src/pages/TeacherSection.js",
}

MUTANTS = {
    # The dashboard stops being about a term. The parameters are kept so the
    # query still takes three - a mutant that changed the shape of the call
    # would fail for a reason that is not the claim. teacher.one@ teaches
    # ตอนเรียน 1 of the same subject in this year and the year before, so the
    # list goes from one row to two: that pair is the whole discriminator, and
    # a seed that happened to give every teacher one Section would make this
    # mutant invisible.
    "anyterm": ("routes",
                "WHERE cst.user_id = $1 AND sc.academic_year = $2 AND sc.semester = $3",
                "WHERE cst.user_id = $1 AND ($2 IS NOT NULL) AND ($3 IS NOT NULL)"),
    # The teaching register dropped from the by-id read: any Section resolves
    # for anybody signed in as a Teacher. The department gate is still there and
    # still says yes, which is the point - a colleague's Section is in the same
    # department, so scope is not what protects it (ADR-0002).
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in teaching.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against teaching.test.js.
    "anysection": ("routes",
                   "${THIS_ACCOUNTS_SECTION}",
                   "WHERE cs.section_id = $1 AND ($2 IS NOT NULL)"),
    # The role gate removed from the dashboard. Every single-role Teacher is
    # unaffected, which is what makes this the mutant for the seventh criterion:
    # the account holding both grants reaches a Teacher screen while it is still
    # acting as the committee, and switching roles stops being worth anything.
    "norolegate": ("routes",
                   "router.get('/teaching/sections', requireRole(...TEACHING), async",
                   "router.get('/teaching/sections', async"),
    # The by-id read restricted to the current term - the dashboard's listing
    # rule enforced as an authorisation rule. A Teacher following a link to a
    # Section they taught last year is refused a Section that is theirs.
    # Re-aimed 29 Sep 2569 (#104): the register's WHERE clause is one
    # constant in `lib/register.js` now, so this aims at the call site that
    # interpolates it - in teaching.js, as before. Aiming at the constant
    # instead would have put all eleven on one line, six of them the same
    # edit, and no sheet's claim could be told from another's. Re-proved
    # against teaching.test.js.
    "currenttermonly": [
        ("routes",
         "`SELECT ${RETURNED} ${FROM} ${THIS_ACCOUNTS_SECTION}`,",
         "`SELECT ${RETURNED} ${FROM} WHERE cs.section_id = $1 AND cst.user_id = $2"
         " AND sc.academic_year = $3`,"),
        ("routes",
         "        [id, req.session.userId],",
         "        [id, req.session.userId, currentTerm().academicYear],"),
    ],
    # The enrolment count climbing a join it should not: counted over the
    # Offering rather than over the Section. Both numbers are plausible on a
    # card and only one of them is the class in front of the lecturer - 113 for
    # a room of 57.
    "countjoin": ("routes",
                  """                  (SELECT count(*)::int FROM student_course sct
                    WHERE sct.section_id = cs.section_id) AS student_count""",
                  """                  (SELECT count(*)::int FROM student_course sct
                    JOIN course_sections cs2 ON cs2.section_id = sct.section_id
                    WHERE cs2.semester_course_id = sc.id) AS student_count"""),
    # The numeric guard removed, so a non-numeric id reaches PostgreSQL and
    # comes back 22P02 through the error handler instead of the refusal the
    # caller has earned. #23 paid for this once already.
    #
    # Re-aimed twice on 7 ก.ย. 2569, and the second time is the one worth
    # reading. #107 replaced the hand-rolled `/^\d+$/` here with `integerId`,
    # so the string this was anchored to stopped existing and the mutant
    # answered MISS - #123's third way to go stale, caught by
    # `mutation/anchors.py`.
    #
    # The obvious re-aim is to disable the `if`, and it was tried: it
    # **killed nothing**. The refactor moved what the query is given. The route
    # used to test one value and bind another, so skipping the refusal let the
    # raw address reach PostgreSQL as a 22P02; it now binds the *validated*
    # value, so skipping the refusal binds `null`, `WHERE cs.section_id = NULL`
    # matches no row, and the caller gets the same 404 by accident. The claim
    # stopped being at risk from that edit - #45's rule, and the sweep is what
    # said so rather than a reading of the diff.
    #
    # So the mutant aims at the line that can still fail: bind the address
    # instead of the id read out of it. A non-numeric id is a 22P02 again and
    # an overlong one a 22003, which is the whole of what this mutant has
    # always claimed. **A guard that returns the value it validated cannot be
    # broken by deleting its refusal alone** - that is a property of the fix
    # worth knowing, not a gap.
    "nonumericguard": ("routes",
                       "      const id = integerId(req.params.sectionId);",
                       "      const id = req.params.sectionId;"),
    # The substitution that ADR-0004 is about, made a no-op. Every
    # Section-specific entry then points at a path with `%SECTION%` still in it,
    # which routes to NotBuiltYet - a screen that looks exactly like the ones
    # that are genuinely not built yet, which is why nothing noticed this until
    # a row clicked one.
    "notoken": ("sidebar",
                "                          subPath = sub.path.replace(SECTION_TOKEN, section)",
                "                          subPath = sub.path"),
    # The empty state stops naming the term. "You have no ตอนเรียน" and "you
    # have no ตอนเรียน in ภาคต้น 2569" are different pieces of news to somebody
    # who taught two of them last term, and the screen still reads perfectly
    # well without the term - which is how a sentence like this rots.
    "termlessempty": ("dashboard",
                      "            ยังไม่มีตอนเรียนที่ได้รับมอบหมายใน{termLabel}",
                      "            ยังไม่มีตอนเรียนที่ได้รับมอบหมาย"),
    # The inherited behaviour restored: the chosen Section written down as well
    # as put in the address. Nothing reads it, so every row about *navigation*
    # still passes - which is the point. A remembered Section that agrees with
    # the URL is invisible until the day it disagrees, and #77 and #81 are what
    # that day looks like.
    "rememberedsection": ("dashboard",
                          """                onClick={() =>
                  navigate(`/teacher/teacherDashboard/${section.section_id}`)
                }""",
                          """                onClick={() => {
                  localStorage.setItem('section', String(section.section_id))
                  navigate(`/teacher/teacherDashboard/${section.section_id}`)
                }}"""),
    # The id kept out of the address altogether. Kills the three rows that are
    # about the address, on purpose - see the header. Read it as the check that
    # rows 3, the menu row and 5 are all genuinely reading the URL, not as a
    # discriminator between them.
    "staydashboard": ("dashboard",
                      "                  navigate(`/teacher/teacherDashboard/${section.section_id}`)",
                      "                  navigate(`/teacher/teacherDashboard`)"),
    # The open Section stops saying which ตอนเรียน it is. The address is still
    # right and the subject is still named, so a row that read only the URL
    # would call this screen correct - and a lecturer teaching two ตอนเรียน of
    # one subject would have no way to tell which one is in front of them.
    "nosectionnumber": ("section",
                        "            ตอนเรียน {section.section_number} · {semesterLabel(section.semester)}{' '}",
                        "            {semesterLabel(section.semester)}{' '}"),
}

main(FILES, MUTANTS)
