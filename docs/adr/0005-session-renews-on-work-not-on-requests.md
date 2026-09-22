# A session is kept alive by work, not only by requests, and has no ceiling

docs/06 story 15 asks for a person to be *"signed out after a period of inactivity, so that an unattended session
is not left open"*, and NFR-03 in `docs/01` calls it an idle timeout. What the delivered system had, and the rebuild
carried, was something narrower. #99 is where the difference was measured.

## What was there

The token lives thirty minutes (`LIFETIME_SECONDS`), and `requireSession` re-issues it when a request arrives with
under ten minutes left (`RENEW_BELOW_SECONDS`). #99 said the token was never renewed. That was never true: the renewal
is in `d368652`, eight days before the ticket was opened. What was true is that the half hour counts from the last
token **issued**, not from the last thing the person did:

- A request at minute nineteen renews nothing and leaves eleven minutes. Someone who stops is signed out between ten
  and thirty minutes after their last request, depending on where it fell.
- Typing is not a request. A criterion's four levels written in those eleven minutes were saved into a session that had
  ended. That is the report in #99. It punishes the careful writer rather than the quick one.

## The decision

**Pressing a key or clicking counts as work.** While somebody is signed in, the shell (`AuthContext.js`) sends
`POST /api/me/activity` on a `keydown` or `pointerdown`. It sends at most one every five minutes (`HEARTBEAT_MS`).
The route does nothing itself. The renewal is `requireSession`'s, at the same threshold every request meets.

**Five and ten are one decision, not two numbers.** The promise is exact: somebody who never stops pressing for as
long as five minutes is never signed out. A heartbeat goes on the first press five minutes after the last one, and
with no pause of five minutes that press comes within ten. So heartbeats are less than ten minutes apart, and one
always lands in a token's last ten minutes, where it renews. The pause the promise allows is the difference between
the two numbers. Somebody who pauses longer is back to the old rule, ten to thirty minutes after their last request.
Raising `HEARTBEAT_MS` or lowering `RENEW_BELOW_SECONDS` shrinks that pause, and at equal numbers it is gone. Each
half has a row that pins its number: the browser's rows count a heartbeat five minutes into the session, and the
server's row renews a token with nine minutes left, written out rather than read off the constant, so that lowering
the constant by more than a minute fails it. Change one number and read the other.

**The heartbeat does not renew more eagerly than a save.** A route that always re-issued would put a fresh cookie on
the wire every five minutes of typing. Each renewal is a chance for #51's race, where a renewal that lands after a
role switch carries the old acting grant back.

**Sign-out and a switch of grant wait for a heartbeat that is out.** Keeping the threshold is not enough on its own,
because the heartbeat adds a way into #51 that a save does not have: the click that sends it can be the click on
sign-out, or on another grant. Its answer, renewed, would then land after the sign-out and sign the browser back in,
or after the switch and put the old grant back on. So the shell keeps the heartbeat that is out, and `logout` and
`switchRole` wait for it before sending anything. So does the shell's own sign-out when an account's access ends
(#52): `requireSession` renews before `attachRoles` refuses, so even a refused heartbeat can carry a cookie back after
the sign-out that erased it. Those are the three things in the browser that write or erase the cookie while somebody
is signed in.

What this closes is the gesture: a heartbeat sent by the click that signs out or switches. It does not close a
heartbeat sent by a key pressed *while* the sign-out or switch is in flight, when the token is also in its last ten
minutes and five minutes have passed since the last heartbeat. That is #51's race as a save already has it, one
request in flight across a switch, and it is left to #51 with the save. The wait costs something too: a heartbeat
that is never answered holds the sign-out with it, as the sign-out's own request always could.

**Nothing is sent on a timer.** A heartbeat on an interval would keep an unattended tab signed in forever, which is
story 15 undone. Somebody who presses nothing sends nothing, and expires as before: ten to thirty minutes after their
last request.

**There is no ceiling.** A session renewed by work may run as long as the work does. The spec asks for an idle
timeout and nothing more. A ceiling would sign out the person who is working, which is the complaint #99 was opened
for. If one is wanted later, it needs the sign-in time carried in the token (`iat` is re-stamped by every renewal).
That is a change to the claims `session.js` describes as identity only, which is why it is recorded here rather than
added quietly.

## What this does not change

- The cookie still outlives the token by a full lifetime (#69), and an ended session is still announced rather than
  treated as a stranger.
- Authorisation is untouched. The heartbeat passes through `attachRoles` like any request, so a suspended account's
  heartbeat is refused with `accessEnded` (#52), the same as its next save.
- The idle timeout is still between ten and thirty minutes, not exactly thirty. Making it exact would mean renewing on
  every request, which is the #51 cost above. It is left as it was, and this ADR says so.

## How it is proved

The browser's half is `e2e/tests/99a-heartbeat.spec.js`: a key and a click each send a heartbeat five minutes into the
session, nothing is sent without one, and a second key within five minutes does not send a second heartbeat. Sign-out,
a switch of grant and the sign-out of an ended account each wait for a heartbeat held at the route. Those three rows
measure the order, nothing sent while the heartbeat is out. That a renewed cookie landing second would undo them is
argued from how a response sets a cookie, not measured: the held heartbeat is answered at the route, with no cookie.
The server's half is `backend/test/shell.test.js`
*a heartbeat (#99)*: a heartbeat with nine minutes left renews, one with a full half hour does not, and one after the
end is told the session ended. Neither seam can run thirty real minutes, so the promise is the two halves together.
Each half pins its own number. `mutation/99-heartbeat.py` holds the mutants.
