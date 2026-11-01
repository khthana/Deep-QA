# -*- coding: utf-8 -*-
"""
#97 รหัสผ่านผิดขึ้นกล่อง Session หมดอายุ ทับประโยคจริง.

Three mutants. The defect was that a wrong password drew the shell's
full-screen *Session หมดอายุ* dialog over the sentence saying the password was
wrong - to somebody who had never had a session, whose only button returned to
the screen they were already on.

The cause was one line in `client.js`:

    if (response.status === 401 && !anonymous) sessionExpiredListener?.()

which is the rule *every 401 is an ended session unless its caller remembered
to say otherwise*. `POST /api/auth/login` is a 401 whenever a password is
mistyped, and it had not remembered.

**What replaced it is not "read the reason", and that is the thing to
understand before touching these.** The server's reason is half the answer:
`expired` is an ended session whoever asks. The other half is not the server's
to know - a cookie cleared mid-session makes the server answer `anonymous`,
because from where it stands there is nothing to have expired, and only this
side knows there was. So `client.js` reports every 401 with its reason and
`AuthContext` decides, because `AuthContext` is what holds whether anybody is
signed in.

**Two mutants were written for this file and deleted after the first sweep,
and what they taught is worth more than they were.** `everyfourohonecounts`
made the listener raise unconditionally; `strangerhasasession` made everybody
count as signed in. They were meant to break the two halves of the rule one at
a time. They killed **eighteen rows out of twenty-two each** - the same
eighteen - because both of them raise the dialog on the 401 that `GET /api/me`
answers with on a first visit, so the dialog is drawn over the sign-in screen
before any spec can sign in at all. Every other ticket's rows then fail inside
`signIn`.

That twenty-two, and the twenty in the comment on `loginhidesitsreason` below,
were measured on 6 September 2569 at `be4e30e`, where `50a-sign-in` held 11 rows
and `10a-shell` held 11. The command was written `50a 10a` then, and `50a` has
also matched `150a-an-entry-arriving-under-an-open-editor` since 23 September -
**two weeks after this was measured**, so neither figure includes it. The two
files hold 14 and 11 today, which is why twenty-two does not reconcile against
today's counts and does not need to: checked 24 September 2569 by counting rows
at that commit, not swept again (#158).

A mutant that stops the application working does not prove a row. It kills the
row, and it kills forty other things first, so the run says nothing about which
assertion was holding what. **A mutant has to be able to fail one row and leave
the rest standing**, and the one below can: it names the reason.

`loginhidesitsreason` is the odd one and is here to be honest about what it
proves. Sending `reason` from the login route is the third thing #97 asked for
and it is **not** what fixes the dialog - the browser rows pass without it,
because a stranger at the sign-in screen is not signed in whatever the refusal
is called. It is a contract: every other 401 in this application names itself,
and this was the exception. So it kills a **backend** test rather than a row,
and the sheet marks that half ☑ at the HTTP seam rather than ⚙.

    python mutation/97-refusal-is-not-expiry.py save
    python mutation/97-refusal-is-not-expiry.py <mutant>
    python mutation/97-refusal-is-not-expiry.py restore

Killing them:

    cd e2e && npx playwright test 50a-sign-in 10a-shell   # the two browser ones
    cd backend && node --test "test/auth.test.js"  # loginhidesitsreason

**Never sweep this file and `10-application-shell.py` in the same run**, and
never with `13-*` or `50-*` either. All three files are held by #10's set as
well - `client.js`, `AuthContext.js` and `backend/routes/auth.js` - which is
not a coincidence: #97 is a defect in how the shell answers a refusal, and the
shell's own ticket owns those files.

Row numbers below are `50a-sign-in.spec.js`'s tests in the order they are
written, except where a `10a` row is named.

## ตารางมัตแตนต์ — บันทึกย้อนหลัง ไม่ใช่คำทำนาย (#259 · 1 พ.ย. 2569)

แถวข้างล่างเขียน**หลัง**การกวาด กฎ *เขียนตารางก่อนรันมัตแตนต์ตัวแรก* (#255) ผูกตั้งแต่ใบที่ลง
หลัง `258` เป็นต้นไป สิ่งที่แถวเหล่านี้เป็นจึงเป็นการ**จด**ว่าอะไรตายไปแล้ว ไม่ใช่คำทำนาย
(#54 — ลงวันที่ ไม่ใช่ลบ) ที่มาคือร้อยแก้วข้างมัตแตนต์ทั้งสามในไฟล์นี้ กับตารางของเกณฑ์ข้อ 6 ใน `docs/acceptance/50-sign-in-screens.md` (บรรทัด 48–50 และ 181) และแถว `onlytheserverknows` ของ `docs/acceptance/10-application-shell.md:231` ไม่ใช่ความจำ

| ชื่อ | สิ่งที่มันทำ | ข้อยืนยันที่มันฆ่า (บันทึกย้อนหลัง) |
|---|---|---|
| `credentialsisanexpiry` | รหัสผ่านผิดนับเป็น session ที่จบลง คือข้อบกพร่องเอง ใส่กลับเข้าไปอย่างแคบที่สุด — กฎเก่าไปถึงกรณีนี้ด้วยการ**ไม่เอ่ยถึง**มัน ตัวนี้ไปถึงด้วยการเอ่ย ซึ่งเป็นสิ่งที่ทำให้มันเป็นมัตแตนต์ ไม่ใช่ไฟดับ | **`50a` แถว 6 กับ 7** (ครึ่งที่สองและที่สามของเกณฑ์ข้อ 6 — รหัสผ่านผิดและอีเมลที่ไม่มีในระบบ) และ**ปล่อยอีกยี่สิบแถวยืน รวมทุกแถวเรื่องหมดอายุของ #10** ความไม่สมมาตรนั้นคือเหตุผลทั้งหมดที่แถวเหล่านั้นไม่เคยจับข้อนี้ได้: ข้อบกพร่องทำให้กล่องขึ้น**มากกว่า**เดิม และทุกแถวเรื่องกล่องเขียนขึ้นเพื่อตรวจว่ามันขึ้น |
| `onlytheserverknows` | ปลายอีกด้าน: ไม่มีใครนับว่าเข้าระบบอยู่ กล่องจึงขึ้นเฉพาะตอน server ตอบ `expired` คือการแก้ที่ทาเกินไป และเป็นความผิดที่ตั๋วนี้เกือบส่งขึ้นจริง — cookie ที่ถูกล้างกลางคันตอบ `anonymous` · สมอผูกกับการกำหนดค่าพร้อม indentation ของมัน เพราะสมอสองช่องว่างเคยตรงกับบรรทัดสี่ช่องว่างโดยอุบัติเหตุ | **`10a` แถว 6 แถวเดียว** (*a session that has ended says so*) และ**ไม่ฆ่าแถวของ #97 เองเลย** นั่นคือรูปที่ต้องการ: แถวเดียว และเป็นแถวที่ข้ออ้างพูดถึง · มันคือกฎฉบับตามตัวอักษรของตั๋วพอดี ซึ่งเป็นเหตุที่ #97 ไม่ได้ทำตามตัวอักษรนั้น |
| `loginhidesitsreason` | เส้นทาง login ทิ้งเหตุผลของตัวเองไปอีกครั้ง ซึ่งเป็นที่ที่มันอยู่ก่อน #97 | **`backend/test/auth.test.js` ข้อ *names its reason, the way every other 401 here does*** และ**ไม่มีแถวเบราว์เซอร์เลย** ซึ่งเป็นคำพูดที่ซื่อตรงว่าครึ่งนี้คืออะไร: สัญญา ไม่ใช่การแก้ — สองแถวบนผ่านได้แม้ไม่มี `reason` นี้ |
"""

from harness import main

FILES = {
    "client": "frontend/src/api/client.js",
    "authctx": "frontend/src/context/AuthContext.js",
    "authroutes": "backend/routes/auth.js",
}

MUTANTS = {
    # The defect, put back and nothing else: a wrong password counts as a
    # session that ended. It is the narrowest statement of what #97 was - the
    # old rule reached this case by *not naming* it, and this reaches it by
    # naming it, which is what makes it a mutant rather than a power cut.
    #
    # Kills the two #97 rows and leaves the other twenty standing, including
    # every one of #10's expiry rows. That asymmetry is the whole reason those
    # rows never caught this: the defect made the dialog appear *more*, and
    # every row about the dialog was written to check it appears.
    "credentialsisanexpiry": (
        "authctx",
        "      if (reason === 'expired' || signedIn.current) setExpired(true)",
        "      if (reason === 'expired' || reason === 'credentials' || signedIn.current)\n        setExpired(true)",
    ),
    # The other direction: nobody ever counts as signed in, so only the
    # server's `expired` raises the dialog. This is the fix over-applied, and
    # it is here because it is the mistake this ticket nearly shipped - a
    # cookie cleared mid-session answers `anonymous`, so `10a`'s row 6 goes
    # quiet and a person working is returned to the sign-in screen without a
    # word.
    #
    # Kills exactly one row - `10a` *row 6: a session that has ended says so* -
    # and none of #97's own. That is the shape to want: one row, and the one
    # the claim is about.
    # Anchored on the assignment with its indentation, which changed when #97's
    # own review moved the write into an effect. A two-space anchor still
    # matched the four-space line by accident; an anchor that matches by
    # accident is one that stops matching without warning.
    "onlytheserverknows": (
        "authctx",
        "    signedIn.current = state !== null",
        "    signedIn.current = false",
    ),
    # The login route throws its own reason away again, which is where it was
    # before #97. Kills `backend/test/auth.test.js` - *names its reason, the
    # way every other 401 here does* - and **no browser row**, which is the
    # honest statement of what this half is: a contract, not the fix.
    "loginhidesitsreason": (
        "authroutes",
        "          .json({ message: admission.message, reason: admission.reason });",
        "          .json({ message: admission.message });",
    ),
}

main(FILES, MUTANTS)
