# -*- coding: utf-8 -*-
r"""
#127 ปีพุทธศักราชในวันประกาศและวันกำหนดส่งของกิจกรรม ถูกอ่านเป็นคริสต์ศักราช.

`readDate` in `backend/routes/activities.js` checked the shape of a date and
asked `Date.parse` whether it could read it. `2569-09-30` passes both, and an
Activity's deadline was filed five centuries out; `2026-02-31` passes both too,
and was filed on 3 March. #125 closed the same hole in the accounts' `readDate`
and left this one as its own ticket, because the two parsers are not one guard:
this one takes a timestamp as well as a day.

The fix reads the day off the front of whatever was sent, checks it against
the calendar, and hands its year to `lib/year.js` - the range and the two
sentences #125 wrote, moved there so both routes read one copy. The mutants on
the range itself stay in `125-validity-era.py`, which since #127 holds
`lib/year.js` as well; this file holds `activities.js` alone, so the two never
hold the same path. They are still one subject: a mutant in `lib/year.js`
kills rows in `activity-editor.test.js` as well as in `users.test.js`.

## What each mutant is

`activityeraisaccepted` is the defect restored at this route's own call.
`misdatedislost` keeps the refusal but drops its sentence on the way out of
`readActivity`, so the person is told `invalidActivity` - a form with nothing
wrong they can see. `onlyannouncement` reads the sentence off one date and not
the other. `createsentenceisakey` and `editsentenceisakey` put
`REFUSALS[read.reason]` back at the two route sites, where a refusal with a
message and no reason answers 400 with no message at all (#125's lesson, one
mutant per site). `yearaftercalendar` asks the calendar first again, so a Buddhist 29
February - which exists, and is never a common-era leap day - is refused as a
day that does not. `anytail` puts back the `.*` after the day, which let
`2026-09-30 junk` through to the column as 22007 because V8 reads "jun" as a
month. Both were found by the review of #127, not by the ticket.
`rollsintonextmonth` is the calendar check removed, and
`dayistext` reads the calendar off the whole string instead of its day. That
is not a refusal: `new Date` of a timestamp with `T00:00:00Z` glued on is an
Invalid Date, `toISOString` throws, and the route answers 500. It kills only
the rows that send a timestamp, and each dies at its status assertion - which
says the slice is load-bearing, not that a timestamp would be refused politely
without it.

## What no mutant here can say

**Nothing proves one date separately from the other at the read.** Both are
read by one function called twice, so a mutant that checks one and not the
other at `readDate` does not exist to be written - #125's *structurally
unreachable*. `onlyannouncement` is the one place the two are handled apart.

## The sweep

Swept 19 September 2569 against `cd backend && node --test "test/*.test.js"`,
748 subtests green on a clean tree. Every mutant killed rows of #127:

- `activityeraisaccepted`, `misdatedislost`, `onlyannouncement` - **4** each:
  the Buddhist year, the year of no era, the edit route, and the Buddhist
  leap day.
- `createsentenceisakey` - **3**, the rows reading the create route's
  sentence; `editsentenceisakey` - **1**, the edit route's.
- `yearaftercalendar` - **1**, the Buddhist leap day.
- `anytail` - **1**, the row sending `2026-09-30 junk`.
- `rollsintonextmonth` - **1**, the calendar row.
- `dayistext` - **3**, every row that sends a timestamp, each answered 500
  rather than refused (above).

`dayistext`'s run also failed five rows of `weights.test.js`. They were not
its kills. The first died with `connect EADDRINUSE` on supertest's own
ephemeral port, and the rest failed on state it left behind. The same mutant
against `weights.test.js` alone passes 25 of 25. A kill in an unrelated file is
a leak to measure before it is a count to report (#52).

**Do not sweep this beside `32-activity-list.py` or `33-activity-editor.py`.**
All three hold `backend/routes/activities.js` (#85). Run `mutation/anchors.py`
before believing any of it.

    python mutation/127-activity-dates.py save
    python mutation/127-activity-dates.py <mutant>
    python mutation/127-activity-dates.py restore
"""

from harness import main

FILES = {
    "activities": "backend/routes/activities.js",
}

MUTANTS = {
    # the defect itself, at this route's call: the year is whatever was typed.
    "activityeraisaccepted": ("activities",
        "  const refusal = yearRefusal(Number(day.slice(0, 4)));\n"
        "  if (refusal) return { ok: false, message: refusal };\n",
        "  const refusal = yearRefusal(Number(day.slice(0, 4)));\n"
        "  if (false) return { ok: false, message: refusal };\n"),
    # refused, but told invalidActivity instead of the year.
    "misdatedislost": ("activities",
        "  if (misdated) return { ok: false, message: misdated.message };\n",
        "  if (false) return { ok: false, message: misdated.message };\n"),
    # the sentence read off the announcement only.
    "onlyannouncement": ("activities",
        "  const misdated = [announcement, deadline].find((date) => date.message);\n",
        "  const misdated = [announcement].find((date) => date.message);\n"),
    # the sentence looked up as a key on the create route.
    "createsentenceisakey": ("activities",
        "        const read = readActivity(req.body ?? {});\n"
        "        if (!read.ok) return res.status(400).json({ message: sentenceOf(read) });\n\n"
        "        const refusal = await refuseSave(section.section_id, read.values);\n"
        "        if (refusal) return res.status(400).json({ message: refusal });\n\n"
        "        const created",
        "        const read = readActivity(req.body ?? {});\n"
        "        if (!read.ok) return res.status(400).json({ message: REFUSALS[read.reason] });\n\n"
        "        const refusal = await refuseSave(section.section_id, read.values);\n"
        "        if (refusal) return res.status(400).json({ message: refusal });\n\n"
        "        const created"),
    # and on the edit route.
    "editsentenceisakey": ("activities",
        "        const read = readActivity(req.body ?? {});\n"
        "        if (!read.ok) return res.status(400).json({ message: sentenceOf(read) });\n\n"
        "        const activity = await activityOf(",
        "        const read = readActivity(req.body ?? {});\n"
        "        if (!read.ok) return res.status(400).json({ message: REFUSALS[read.reason] });\n\n"
        "        const activity = await activityOf("),
    # 2026-02-31 filed as 3 March again.
    "rollsintonextmonth": ("activities",
        "  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) return { ok: false };\n",
        "  if (false) return { ok: false };\n"),
    # the calendar asked before the year: 2567-02-29 told invalidActivity.
    "yearaftercalendar": ("activities",
        "  const refusal = yearRefusal(Number(day.slice(0, 4)));\n"
        "  if (refusal) return { ok: false, message: refusal };\n\n"
        "  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) return { ok: false };\n",
        "  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) return { ok: false };\n\n"
        "  const refusal = yearRefusal(Number(day.slice(0, 4)));\n"
        "  if (refusal) return { ok: false, message: refusal };\n"),
    # any tail after the day, as before: `2026-09-30 junk` reaches the column.
    "anytail": ("activities",
        "const DAY_AND_TIME = /^\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}(?::?\\d{2})?)?)?$/;\n",
        "const DAY_AND_TIME = /^\\d{4}-\\d{2}-\\d{2}([T ].*)?$/;\n"),
    # the calendar read off the whole string: a timestamp throws, 500.
    "dayistext": ("activities",
        "  const day = text.slice(0, 10);\n",
        "  const day = text;\n"),
}

main(FILES, MUTANTS)
