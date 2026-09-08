# -*- coding: utf-8 -*-
r"""
#67 แถวตัวอย่างในแบบฟอร์มนำเข้าใช้รหัสของนักศึกษาจริงใน seed.

`GET /api/students/import-template` shipped one example row, and its code was
`66010001` - the first student of the seeded 66 cohort by `db/seed.js`'s own
derivation. This is the only import in the system that overwrites a **person**
already on a register - `OVERWRITE` in `backend/routes/students.js`,
deliberately, so that a correction can be sent through the same file - so
downloading the template and uploading it unchanged renamed a real student to
สมชาย ใจดี and reported นำเข้าสำเร็จ 1 รายการ. Nothing on screen said a row had been
written over, and no count could have shown it: the register was the same size
afterwards.

An earlier draft of this file, of the sheet and of the test beside it all said
*the only import that overwrites a key it meets*, and that is false: `weights.js`
upserts a scheme's category and `activityScores.js`' `record()` upserts a mark,
so three imports overwrite. Neither of those two can do what this one did - both
**refuse** a student they have not met, and what they write over is a number
their own screen owns rather than somebody's name. The narrow claim is the true
one and it is the one the fix rests on.

The fix is the second of the two the ticket offers - the sample goes away and
the template ships as a header alone - and it needed no new code, because
`sendTemplate` already reads `example ? [example] : []`.

## Why the convention its three siblings use cannot be borrowed

#25's enrolment, #26's work groups and #34's activity marks all answer this
same ticket with `66019999`, a code no cohort reaches, and they cite #67 in
their comments while doing it. `docs/acceptance/25-section-enrolment.md` row 6
is a walked ☑ recording that as #67's answer. The ticket stayed open anyway,
and it was right to.

The difference is not the code. It is what the two imports do with a student
they have not met: those three **refuse** an unknown one, so their sample
uploaded unchanged writes nothing at all, and this one **creates** - into a
register whose route file holds GET, POST and the import and nothing else. No
eight-digit code is inert here, so the inert template is the one with no row
in it. What the person gets instead is `importRows`' empty-file answer: 400,
`REFUSALS.importEmpty`, `created: 0` - a sentence saying their file has no rows
in it, which is true and is the thing they need to know.

## The survey, because the ticket's count was wrong in both directions

The ticket says *whatever this sample does, six screens do*. `sendTemplate` has
**ten** call sites, and the six that matter behave four different ways. Every
line below is a measurement - each template was fetched and posted back
unchanged through a throwaway suite, which was deleted afterwards - except
`weights`, which is noted as unmeasured.

    students          201 created=1   collides with a SEEDED row -> overwrite
    users             201 created=1   creates `66010001` / somchai.ja@kmitl.ac.th,
                                      active, verified, TEACHER on `05`; sign-in
                                      refused for '' and for the seed password
    departments       201 created=1   creates `07`
    programs          201 created=1   creates `0505`
    subjects          201 created=1   creates `01076106`
    program-subjects  400 created=0   `0501`/`01076105` is already mapped, and
                                      this import refuses a duplicate
    enrolment         -               `66019999`, refused, already #67's answer
    work groups       -               `66019999`, refused, already #67's answer
    activity marks    -               `66019999`, refused, already #67's answer
    weights           not measured    a complete one-category scheme summing to
                                      100; its route's own comment already asks
                                      what an unedited upload does and answers
                                      it with the in-use guard

Two greps decide the whole picture, and the first has to be read rather than
counted. `ON CONFLICT` across `backend/routes` matches eight sites. Three are
inside an import - `students.js:134`, `weights.js:380` and
`activityScores.js:404`, the last of them through `record()` - and the other
five are ordinary screens saving their own work. Of the three, **students is
the only one whose key is a person on a register**; the other two overwrite a
weighting category and a mark, on screens whose imports refuse a student they
do not know. The grep cannot tell those apart, which is #107's rule about
guards arriving in the shape of a write. `router.delete` across the same files
is the plainer one: departments, programs, subjects and program-subjects have
one; **students and users do not**.

`66010001` survives in two other user-facing places, and they are not the same
kind of survival. `frontend/src/components/students/StudentForm.js` uses it as
the `placeholder` on the รหัสนักศึกษา field and stays there on purpose: a
placeholder is never submitted, and the typed form **refuses** a code the
register already holds - `409`, walked as row 11 of
`docs/acceptance/17-students.md`. The two ways into this register disagree
about duplicates by design, and only the import overwrites. That is the whole
of this ticket in one screen. The other is `backend/routes/users.js:316` - the
users template's own sample row, twelve lines up in the survey table above,
live and not fixed here. It is #124.

So the sample is harmless exactly when uploading it unchanged either changes
nothing or changes something you can undo, and students is the only one that
fails both halves. `program-subjects` is inert for the opposite reason to every
other row here - its sample names a pair the seed already holds, and its import
refuses duplicates - which is worth knowing as an accident of the seed rather
than a property to rely on: in a fresh deployment that row would create.

## The sweep

Swept 8 September 2569. `samplenamesastudent` is the defect restored. **2
subtests of 714**, both in `students.test.js`:

    the template downloads and matches what the importer accepts
    the template names nobody, and uploading it unchanged writes nothing

and **browser rows 12 and 23** of `17b-students-import.spec.js`. Both were
measured one at a time with `--grep`: that file is `mode: 'serial'`, so a
whole-file run stops at row 12 and reports one failure where there are two. A
serial spec under-reports its own kills, and the number to write down is the
one from the individual runs.

The round trip is killed because it posts the bytes the server actually sent
and then asserts `created: 1`; with the sample back, two rows arrive. That is
the round trip doing its job rather than an accident - #67 took the example
away, and `importRows` asks whether a file has rows in it *before* it asks
whether the header is one it knows, so posting the template as served now
answers `importEmpty` without ever reading the header. A round trip that just
posted the file back would have stopped proving the third criterion the day
this ticket landed.

`blankexamplerow` is the same route with `{}` in place of the example - what
"no example" looks like to somebody who removes the values instead of the
argument. `{}` is truthy, so `example ? [example] : []` still emits a row, of
four empty cells. It kills **1 subtest** and **browser row 12**, and row 23
passes: `parseRows` drops a line whose every cell is blank, so the upload is
still refused as empty and still renames nobody.

That asymmetry is the reason the second mutant is worth keeping. The two claims
here - *the file carries no row* and *uploading it writes nothing* - look like
one claim, and `samplenamesastudent` fails both together. `blankexamplerow` is
the file that satisfies the second and not the first, and it is what makes them
two rows on the sheet rather than one.

## The third property, and it is the ticket's closing sentence

Both mutants vary the same thing: **what the students template contains**.
Neither says anything about the other nine, and no mutant can, because each
route's example is a literal in its own file - there is no shared line to
break. That is the ticket's last sentence (*`sendTemplate` is shared, so it is
one change for every screen*) turned into a measurement, and it is false: the
helper is shared and the samples are not. The survey above is therefore a
reading taken on 8 September 2569, not a claim these tests hold. Add a
colliding sample to another template tomorrow and nothing in this store will
say so.

`users` is the one the survey found and this ticket does not close - its sample
creates an account nothing can remove, in a register with no delete route -
and it is [#124](https://github.com/khthana/Deep-QA/issues/124) rather than a
second fix here, because its import refuses a duplicate and so nothing existing
is ever written over. That is a different defect wearing this one's clothes.

## Sweeping

`backend/routes/students.js` is in no other file's FILES, so this one sweeps
alone safely. Run `mutation/anchors.py` before believing any of it.

    python mutation/67-import-template-sample.py save
    python mutation/67-import-template-sample.py <mutant>
    python mutation/67-import-template-sample.py restore
"""

from harness import main

FILES = {
    "students": "backend/routes/students.js",
}

MUTANTS = {
    # the defect itself, put back: the example row naming the first student of
    # the seeded 66 cohort. 2 subtests + browser rows 12 and 23.
    "samplenamesastudent": ("students",
        "    sendTemplate(res, 'students-template.csv', IMPORT_COLUMNS),\n",
        "    sendTemplate(res, 'students-template.csv', IMPORT_COLUMNS, {\n"
        "      student_id: '66010001',\n"
        "      first_name_th: 'สมชาย',\n"
        "      last_name_th: 'ใจดี',\n"
        "      program_id: '0501',\n"
        "    }),\n"),
    # a row of empty cells - `{}` is truthy, so the row is still emitted. 1
    # subtest + browser row 12; row 23 survives, which is the point of it.
    "blankexamplerow": ("students",
        "    sendTemplate(res, 'students-template.csv', IMPORT_COLUMNS),\n",
        "    sendTemplate(res, 'students-template.csv', IMPORT_COLUMNS, {}),\n"),
}

main(FILES, MUTANTS)
