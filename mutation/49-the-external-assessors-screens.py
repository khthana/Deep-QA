# -*- coding: utf-8 -*-
"""#49 - the screens an external assessor may reach.

The requirement owner settled the set on 16 October 2569: the four
programme-level results screens, read-only, within the curriculum the grant
names, and nothing else (`docs/01` section 9 `OWN-01`). Before that day this
role's menu was one invented entry that said so in its own docstring, while
every `/program-results/*` route was already open to the role - so the shape
of the defect was a menu **hiding** three screens rather than refusing them,
and the fix is a menu, a requirement and a refusal test, with no change to any
guard.

## What each half is proved by

The set that is drawn, and the three arrivals, are the browser's half
(`e2e/tests/49a-the-external-assessors-screens.spec.js`). The complement - the
screens the set leaves out, refused at the route and not merely absent from the
sidebar - is `backend/test/shell.test.js`, where #10's eighth criterion already
lived for the teacher.

## The mutants

* `assessormenuiscommittee` - the role is handed the committee's whole menu.
  Every entry `49a` presses is still there and still points where it did, so
  rows 2-4 pass and row 1's `toEqual` over the whole menu fails. That is what
  row 1 is for: a row that asked after each of the four by name would pass with
  a fifth beside them, and this mutant is a fifth beside them.

  Swept on 16 October 2569 over every spec that reads this role's landing, it
  kills **two** rows and not one: `49a` row 1 and `52a` row 2. The second is
  the committee's menu moving the landing, so the account whose window is aged
  mid-session is no longer standing on the report that row arranged itself on,
  and never reaches the intake change. `11-user-accounts.md` row 4 carries a
  dated note saying so; the row's own props are #52's four mutants, and this
  sheet is where this mutant lives (#123).
* `comparegoestobyintake`, `individualgoestobyintake`,
  `allstudentsgoestobyintake` - one entry per mutant is pointed at a sibling's
  address, the label untouched. Row 1 therefore passes and the arrival row for
  that entry dies at its own `toHaveURL`, which is why `49a` asserts the URL
  rather than waiting for it: the red names both addresses instead of saying
  where it waited (#139, #160).
* `assessorreadsthecurriculum` - the declined option made to run (#48). One of
  the shapes put to the owner was *the four reports plus the curriculum
  documents, read-only*; they chose the reports alone. It is written at the one
  `router.get('/plos')` line and **not** at `MAINTAINERS`, which that constant
  would have made a different mutant: `MAINTAINERS` guards three GETs and the
  POST, PUT and DELETE as well, so widening it grants the role *write* on the
  PLOs - which is not the proposal, is not read-only, and would kill
  `plos.test.js`'s write-refusal rows that no sheet credits it with (#97, #123).
* `assessorwritesthecurriculum` - the other half of `OWN-01`'s first clause.
  *Read-only* is two claims, and a mutant on a GET cannot put the second one at
  risk: this one admits the role to `router.post('/plos')` alone, so the row
  that says a write is refused is proved by the write and not by the read.
* `assessorreadstheaccounts` - the same question asked of the other half of the
  tree. Narrowed to the one route rather than written at the shared
  `ADMIN_ROLES` in `backend/auth/administration.js`, so it fails the row it is
  about and leaves grants and history alone (#97).

## What has no mutant of its own, and why

The refusal table in `shell.test.js` has eleven rows and two of them are at
risk here. The other nine are **copies of the same guard shape** - a role
constant at the top of a route file, read by `requireRole` - at nine other
families, and a mutant per family would be nine mutants varying one property
(#96). So those nine rows are **untested rather than proved**, in the sense
`docs/lessons.md` asks a clause to be classified under: each is a reachability
claim that nothing can presently break, and what makes them worth having is
that a new family with no row there is a family nobody asked about.

## A mutant this ticket did not write and did re-run

`42-program-level-by-intake.py:assessorlosesthescreen` drops the role from
`programResults.js`'s `READERS`. It was written when the assessor had one row
in one spec; #49 gave that role rows in `49a` and two more in
`program-results.test.js`, all of which it now kills. Nothing reports that -
the anchor is exact and the code untouched - so it was swept again and `42`'s
sheet re-counted (#202).

## Running it

    python mutation/49-the-external-assessors-screens.py save
    python mutation/49-the-external-assessors-screens.py assessormenuiscommittee
    cd e2e && npx playwright test tests/49a tests/52a tests/66a tests/42a --reporter=line
    # พอร์ต: ย่อหน้า Ports ของ e2e/README.md — ตั้ง E2E_BACKEND_PORT หรือ E2E_FRONTEND_PORT เฉพาะเมื่อพอร์ตของชุดนี้ตกในช่วงที่ Hyper-V จอง
    python mutation/49-the-external-assessors-screens.py restore

    python mutation/49-the-external-assessors-screens.py assessorreadsthecurriculum
    node --test backend/test/shell.test.js backend/test/plos.test.js
    python mutation/49-the-external-assessors-screens.py restore

`plos.test.js` is in that command and not in the one above it because a mutant
on a `plos.js` route can reach its rows, and a sweep narrower than the files a
mutant can reach is a kill count about a smaller suite (#202, #85).

Four files are in the browser command for the same reason: the menu constant
decides where every role lands, so the files that can go red are the ones that
read a landing, not the one this ticket wrote.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาของทุกแถวอ้างไว้ในแถวเอง คือตารางมัตแตนต์และแถว ⚙ ของ
`docs/acceptance/` ไม่ใช่ความจำ **สิ่งที่แถวพวกนี้ไม่ได้บอก**คือจำนวนข้อที่ตายทั้งการกวาด
เว้นที่ใบรับงานจดไว้ และคำที่คัดมาเป็นคำของวันที่กวาด ไม่ใช่ของวันนี้ (#173)

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `assessormenuiscommittee` | **ทำอะไร** บทบาทนี้ได้เมนูทั้งชุดของคณะกรรมการ (`EXT_ASSESSOR: PROG_MANAGER`) ทุกรายการที่ `49a` กดยังอยู่และยังชี้ที่เดิม | **ฆ่าที่** **สองแถว ไม่ใช่แถวเดียว** (กวาด 16 ต.ค. 2569 ทุกสเปคที่อ่าน landing ของบทบาทนี้) — `49a` แถว 1 ที่ `toEqual` เหนือเมนูทั้งอัน ซึ่งเป็นสิ่งที่แถว 1 มีไว้เพื่อ: แถวที่ถามถึงทั้งสี่รายการทีละชื่อจะผ่านทั้งที่มีรายการที่ห้าอยู่ข้างๆ และตัวนี้คือรายการที่ห้านั้น · และ `52a` แถว 2 เพราะเมนูของคณะกรรมการย้าย landing บัญชีที่หน้าต่างถูกทำให้เก่ากลางเซสชันจึงไม่ได้ยืนอยู่บนรายงานที่แถวนั้นจัดฉากไว้ และไปไม่ถึงการเปลี่ยนรุ่น · แถว 2-4 ของ `49a` ผ่าน · ที่มา บันทึกการกวาดของใบนี้เอง กับหมายเหตุลงวันที่ที่แถว 4 ของ `docs/acceptance/11-user-accounts.md` |
| `comparegoestobyintake` | **ทำอะไร** รายการ *เทียบหลักสูตร* ถูกชี้ไปที่ที่อยู่ของพี่น้องตัวเอง (`/main/programLevelByIntake`) ป้ายไม่ถูกแตะ หนึ่งรายการต่อหนึ่งมัตแตนต์ | **ฆ่าที่** **แถวการมาถึงของรายการนั้น** ที่ `toHaveURL` ของแถวเอง — แถว 1 จึงผ่าน ซึ่งเป็นเหตุที่ `49a` ยืนยัน URL แทนการรอมัน: ตัวแดงจะเอ่ยที่อยู่ทั้งสองที่ ไม่ใช่บอกว่ารออยู่ที่ไหน (#139, #160) · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/44-program-level-across-intakes.md` |
| `individualgoestobyintake` | **ทำอะไร** รายการ *รายบุคคล* ถูกชี้ไปที่ที่อยู่ของพี่น้องตัวเอง (`/main/programLevelByIntake`) ป้ายไม่ถูกแตะ หนึ่งรายการต่อหนึ่งมัตแตนต์ | **ฆ่าที่** **แถวการมาถึงของรายการนั้น** ที่ `toHaveURL` ของแถวเอง — แถว 1 จึงผ่าน ซึ่งเป็นเหตุที่ `49a` ยืนยัน URL แทนการรอมัน: ตัวแดงจะเอ่ยที่อยู่ทั้งสองที่ ไม่ใช่บอกว่ารออยู่ที่ไหน (#139, #160) · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/45-program-level-individual.md` |
| `allstudentsgoestobyintake` | **ทำอะไร** รายการ *นักศึกษาทั้งหมด* ถูกชี้ไปที่ที่อยู่ของพี่น้องตัวเอง (`/main/programLevelByIntake`) ป้ายไม่ถูกแตะ หนึ่งรายการต่อหนึ่งมัตแตนต์ | **ฆ่าที่** **แถวการมาถึงของรายการนั้น** ที่ `toHaveURL` ของแถวเอง — แถว 1 จึงผ่าน ซึ่งเป็นเหตุที่ `49a` ยืนยัน URL แทนการรอมัน: ตัวแดงจะเอ่ยที่อยู่ทั้งสองที่ ไม่ใช่บอกว่ารออยู่ที่ไหน (#139, #160) · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/43-program-level-all-students.md` |
| `assessorreadsthecurriculum` | **ทำอะไร** ข้อเสนอที่ถูกปฏิเสธ ทำให้รันได้ (#48) — รูปหนึ่งที่เสนอเจ้าของคือ *สี่รายงาน บวกเอกสารหลักสูตรแบบอ่านอย่างเดียว* เจ้าของเลือกสี่รายงานลำพัง เขียนที่บรรทัด `router.get('/plos')` ตัวเดียว **ไม่ใช่**ที่ `MAINTAINERS` ซึ่งจะเป็นมัตแตนต์อีกตัว เพราะค่าคงที่นั้นเฝ้าสาม GET กับ POST, PUT และ DELETE ด้วย การขยายมันจึงให้สิทธิ์**เขียน** ซึ่งไม่ใช่ข้อเสนอ ไม่ใช่อ่านอย่างเดียว และจะไปฆ่าแถวปฏิเสธการเขียนของ `plos.test.js` ที่ไม่มีใบไหนให้เครดิตมัน (#97, #123) | **ฆ่าที่** แถวที่บอกว่าบทบาทนี้ถูกปฏิเสธการ**อ่าน**เอกสารหลักสูตร (`node --test backend/test/shell.test.js backend/test/plos.test.js`) ซึ่งเป็นครึ่งแรกของสองข้ออ้างใน clause แรกของ `OWN-01` · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/10-application-shell.md:45` |
| `assessorwritesthecurriculum` | **ทำอะไร** ครึ่งอีกข้างของ clause แรกของ `OWN-01` — *อ่านอย่างเดียว* เป็นสองข้ออ้าง และมัตแตนต์ที่ GET เอาข้อที่สองไปเสี่ยงไม่ได้ ตัวนี้จึงรับบทบาทนี้เข้า `router.post('/plos')` ตัวเดียว | **ฆ่าที่** แถวที่บอกว่าการ**เขียน**ถูกปฏิเสธ ข้อนั้นจึงถูกค้ำด้วยการเขียน ไม่ใช่ด้วยการอ่าน · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/10-application-shell.md:45` |
| `assessorreadstheaccounts` | **ทำอะไร** คำถามเดียวกันถามกับอีกครึ่งของต้นไม้ แคบไว้ที่ route เดียวแทนการเขียนที่ `ADMIN_ROLES` ที่แชร์กันใน `backend/auth/administration.js` | **ฆ่าที่** แถวที่มันพูดถึง คือแถวที่บอกว่าบทบาทนี้อ่านทะเบียนบัญชีไม่ได้ **และปล่อยสิทธิ์กับประวัติไว้เฉยๆ** (#97) · ที่มา บันทึกการกวาดของใบนี้เอง กับ `docs/acceptance/10-application-shell.md:45` |
"""

from harness import main

FILES = {
    "menus": "frontend/src/components/SidebarItem/menus.js",
    "assessor": "frontend/src/components/SidebarItem/ExtAssessor.js",
    "plos": "backend/routes/plos.js",
    "users": "backend/routes/users.js",
}

MUTANTS = {
    "assessormenuiscommittee": (
        "menus",
        "  TEACHER,\n  EXT_ASSESSOR,\n}",
        "  TEACHER,\n  EXT_ASSESSOR: PROG_MANAGER,\n}",
    ),
    "comparegoestobyintake": (
        "assessor",
        "        path: '/main/programLevelCompare',",
        "        path: '/main/programLevelByIntake',",
    ),
    "individualgoestobyintake": (
        "assessor",
        "        path: '/main/programLevelIndividual',",
        "        path: '/main/programLevelByIntake',",
    ),
    "allstudentsgoestobyintake": (
        "assessor",
        "        path: '/main/programLevelAllStudents',",
        "        path: '/main/programLevelByIntake',",
    ),
    "assessorreadsthecurriculum": (
        "plos",
        "  router.get('/plos', requireRole(...MAINTAINERS), async (req, res, next) => {",
        "  router.get('/plos', requireRole(...MAINTAINERS, 'EXT_ASSESSOR'), "
        "async (req, res, next) => {",
    ),
    "assessorwritesthecurriculum": (
        "plos",
        "  router.post('/plos', requireRole(...MAINTAINERS), async (req, res, next) => {",
        "  router.post('/plos', requireRole(...MAINTAINERS, 'EXT_ASSESSOR'), "
        "async (req, res, next) => {",
    ),
    "assessorreadstheaccounts": (
        "users",
        "  router.get('/users', requireRole(...ADMIN_ROLES), async (req, res, next) => {",
        "  router.get('/users', requireRole(...ADMIN_ROLES, 'EXT_ASSESSOR'), "
        "async (req, res, next) => {",
    ),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
