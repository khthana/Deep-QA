# A renewal cannot carry a grant the account has switched away from

`requireSession` re-issues the session cookie when a request arrives with under ten minutes left, and carries the
acting grant in that request's token forward. #51 is the corner where carrying it is wrong.

## What was there

The selection a renewal carries is the one that was in *that request's* token, which is the selection as it stood when
the request left the browser. So:

1. A request goes out under grant A, inside the renewal window.
2. The person switches to grant B. `PUT /api/me/acting-role` answers with a cookie carrying B.
3. The first request finishes and, being inside the window, writes a cookie carrying A.

Last write wins. The browser is acting as A while the picker shows B — which is the divergence #10's fourth criterion
exists to prevent, arrived at from the one direction the ordering inside `PUT /api/me/acting-role` cannot reach. The
window is narrow: it needs an in-flight request, a switch, and under ten minutes of token life at once. #99 widened it,
because a heartbeat is a request the person did not knowingly make.

Not renewing at all is not the alternative. Without the carry, working continuously past the twenty-minute mark puts
the caller silently back in their most senior grant, which is the same divergence from the other side.

## The decision

**The account counts its own switches, and a renewal must match the count.** `users.acting_epoch` (migration 0008) is
an integer starting at zero. `PUT /api/me/acting-role` increments it **before** issuing its cookie and stamps the new
value into that token as `acting_epoch`. Every token carries the number: sign-in stamps the value it reads, a renewal
stamps the one it compared against.

**A renewal that does not match writes no cookie at all.** `renew()` in `backend/auth/session.js` reads the account's
counter and compares. Equal, and it re-issues exactly as before. Different, and the response carries no `Set-Cookie`:
the browser is already holding the switch's cookie, which is younger, and that cookie renews on the next request the
browser sends. Writing a cookie without `acting` instead would land the caller in their most senior grant, which is
the divergence again.

**The stale request is still answered.** It asked under the grant it names and is served as that grant. What it loses
is the right to extend the session it arrived with. Nothing about authorisation changes: `attachRoles` still reads
every grant from the database on every request, and the counter decides nothing about what the caller may do.

**A token with no counter does not renew.** `undefined` is not a number the account can be at, so sessions open across
the deployment of this migration live out the half hour they have and sign in again. The alternative — reading a
missing claim as zero — is true only on the day it deploys and silent afterwards.

**The read is not on every request.** `sessionAdmission` runs for every request and stays the size it was; the
counter is read by `actingEpoch()` only when a renewal is due, which is the last ten minutes of a token's life.
`requireSession` takes the pool for this and spends it on that one line.

## What it costs

**A counter on the account cannot tell the account's own browsers apart.** Somebody signed in on two machines who
switches grant on the first leaves the second holding a token whose number is behind. That token is answered as before
and goes on working, but it never renews again, so the second machine is signed out when its half hour runs out. Before
#51 it would have gone on renewing under its own grant.

This is inherent in counting per account. Telling two cookies of one account apart needs a per-session identity — a row
per live session, or an identifier minted at sign-in and carried through renewals — which is a store of session state
that the JWT deliberately replaces, and a larger change than #51 was opened for. It is written here rather than fixed
quietly: if a second device is ever a case that matters, this paragraph is the one to reopen.

It was reopened, by #153 on 21 October 2569, and left as it stands with the price measured instead — see the section at
the end of this page, which also names the two sentences above that read differently today.

## How it is proved

The mechanism is `backend/test/shell.test.js` *a renewal that crosses a switch (#51)*, where a token from before the
switch is re-signed and sent after it: it is left alone, it is still answered as the grant it names, the switch's own
cookie goes on renewing and carries the new grant, a switch made inside the renewal window writes the route's cookie
last, and one account's switch does not stop another account renewing. A request interleaved by timing is not what
makes a request stale — the token it holds is — so the rows hold the token rather than the clock.

The browser's half is `e2e/tests/51a-renewal-across-a-switch.spec.js`, which is about the cookie jar, the place
"last write wins" happens, and which builds the whole interleave a person can make: a read held at the route while the
session is inside its window, a switch, the read released afterwards, and the browser ending on the grant it chose with
the counter the switch stamped. A held request carries the headers it was sent with, the pre-switch token among them,
so it is stale rather than merely late — on the code as it stood before this decision that row ends with no `acting`
in the jar at all while the picker says teacher, which is this page's divergence seen from the browser. The second row
is that a session inside its last ten minutes still renews after a switch, carrying the new grant.

What the row costs is care about when the session is aged: any request that leaves in between renews it, and the held
read would then carry a fresh token and prove nothing. The row asserts that precondition — that the token it held was
inside the window and carried the counter from before the switch — rather than trusting it.

**A token with no counter** was decided here and measured later, by #154. No seam can obtain one: every token either
seam mints is signed by this server, and this server stamps the counter, so the two rows sign one by hand — the same
file's *answers a token signed before the counter existed* and *and does not renew it, with a minute of life left*.
They are the two halves this decision promises the people holding a session when 0008 deploys: the request is answered
as the account it names, and nothing is written back however little life the token has.

The mutant is the alternative this decision rejected, written out — `session.actingEpoch ?? 0`. Where it can kill is
the whole of it: `?? 0` differs from `undefined` only where the account's own counter is zero, so against an account
that has switched the comparison fails either way and the mutant walks past a row aimed straight at it. The second row
therefore stands on the account `shell.test.js` never switches, and asserts that its counter is zero before asking
anything — not because the claim is about zero, but because zero is the only state in which the two implementations
part. It kills that row and no other, and nothing at the browser seam.

`mutation/51-renewal-across-a-switch.py` holds the mutants: the write, its order, the grant it carries, the comparison
removed, the comparison always false, and the missing claim read as zero.

## Reopened by #153 — and left as it stands (21 October 2569)

§What it costs above says this paragraph is the one to reopen if a second device is ever a case that matters.
[#153](https://github.com/khthana/Deep-QA/issues/153) reopened it as a question for the owner, who chose to **leave the
behaviour as it stands and have the price measured**. The price is now seven rows at the HTTP seam, in
`backend/test/shell.test.js` *two devices of one account (#153)*, recorded in
`docs/acceptance/10-application-shell.md` §ราคาที่ #51 ยอมแลก วัดแล้ว. Measuring it changed three things this
page had written down.

**The price is wider than this page said.** It is not that a second device stops renewing: it is that **every device
except the one that switched last** stops renewing. The second device is not stuck — switching grant there writes a
cookie whatever the counter said, because the switch bumps the counter and stamps the value it has just written — but
the moment it does, the first device is the one that cannot renew. Two machines take it in turns. A fix for #153 is
priced against that shape, not against one device dying. The rows that hold it are *lets the second device recover by
switching itself* and *and leaves the first device as the one that cannot renew*.

**And it reaches the heartbeat**, which is what makes "signed out however hard the person is working on it" true
rather than rhetorical: `POST /api/me/activity` is a request like any other (#99, ADR-0005), it reaches the same
comparison, and it is refused the same way. The half hour counts from the last token *issued*, and no token is being
issued. The row is *and not for a heartbeat once the first has switched*, with a control row beside it, because a
heartbeat that never renewed anything would make it pass without the counter having refused a thing.

**"A store of session state that the JWT deliberately replaces" is not a decision anybody recorded.** That sentence in
§What it costs reads differently today. Nothing in `docs/` or `CONTEXT.md` chooses a JWT over a session store —
`stateless`, `session store` and `sessions table` appear nowhere — and the JWT is **inherited** from the delivered
student implementation, as `backend/auth/session.js`'s own docstring says of `generateToken`. ADR-0002 is about
authorisation being derived server-side from the database, and it already licenses a claim in the token that is a
*pointer, not an authority*: `acting`, and since #51 `acting_epoch`. A session id would be a third of the same kind. So
a `sessions` table would amend **this** page and not ADR-0002, and its price is one migration, one table and the three
places a token is minted — `routes/auth.js` at sign-in, `routes/me.js` at the switch, `session.js` at the renewal —
rather than the reopening of a founding decision.

**A fourth option the ticket did not list**, for whoever prices this next: store the *selection* on `users` beside the
counter (two columns, no new table) and have a renewal whose counter does not match **stamp the newest selection**
rather than write nothing. Every device goes on renewing, and last-write-wins stops being harmful because every
renewal stamps the newest value — so it would close #51 by a different mechanism and supersede this page as well as
ADR-0002's *selection* paragraph. Its price is behaviour, not code: the hat becomes the account's rather than the
browser's, so one person cannot wear two hats on two machines at once. Nothing stores the selection today — there is
no `acting_role_id` column anywhere in the repo, the hat lives in the cookie alone — which is why "renew under the
account's current hat" is not available as written.

**What is still not measured** is the browser half. There is no `newContext` anywhere in `e2e/`, so the cookie jars of
two devices have never been held side by side in a browser; what the HTTP rows cannot see is anything the jar itself
decides. That claim was true of both seams on the day this page was written, and was never true of the HTTP seam —
#153's own §How it would be proved said so itself, four lines below the §Measured that said it could not be
done.
