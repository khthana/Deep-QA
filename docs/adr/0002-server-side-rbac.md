# Authorization is enforced server-side, derived from the database

The inherited system had no server-side authorization at all. The JWT carried identity only (`user_id`, `email`,
names); `verifyToken` proved *who* the caller was and nothing about what they may do; only 4 of 32 controllers looked
at roles, and those read `role_id` and `scope_id` **from the request body** — so the client asserted its own
privileges. `blockDirectAccess`, the one gate in front of the API, returns `next()` unconditionally outside
production and otherwise only compares an `Origin` header. In practice the sidebar was the access-control system.

We therefore add an `attachRoles` middleware that loads the caller's active rows from `user_roles` on each request and
exposes them as `req.auth`, plus `requireRole()` / `requireScope()` guards declared per route. `role_id` and
`scope_id` are removed from every request body — the server derives them and never trusts the client. This lands as a
Phase 1 ticket, before any CRUD screen, so every later ticket inherits the guards rather than retrofitting them.

Roles are read from the database per request rather than baked into the JWT, so a revoked or newly granted role takes
effect immediately instead of after the 30-minute token expiry. The cost is one indexed lookup per request, which is
irrelevant at this system's scale.

## Consequences

- Endpoints that currently take `role_id`/`scope_id` in the body change shape — most visibly
  `POST /api/programs/get-program-by-role`, which the frontend calls with a hardcoded `role_id: 'FULL_ADMIN'`.
  Those call sites are rewritten during the copy-and-modify pass.
- `blockDirectAccess` is no longer load-bearing and is dropped rather than carried over.
- Requirements R004, R006, R014, R033, R042 and R054 become testable for the first time: each turns into a `403`
  assertion in the screen's API integration tests.

## As built

Delivered by [#9](https://github.com/khthana/Deep-QA/issues/9) in `backend/auth/authorise.js`, as three pieces
declared in order: `attachRoles(pool)` puts the caller's active grants on `req.auth`, `requireRole(...roleIds)` asks
what kind of account the endpoint is for, and `requireScope(pool, target)` asks whether what the account holds reaches
the record. `target` is a function of the request returning the *record's* identifier; the pool is a parameter, as it
is for every router in the house.

Four things a later ticket can violate by accident:

- **The public surface is positional, not per-route.** `app.use('/api', requireSession, attachRoles(pool))` sits below
  the health and sign-in routers and above everything else, so every route added afterwards is guarded by
  construction. The two above it are the whole of the anonymous surface: sign-in cannot require having signed in, and
  `/api/health` is read by a load balancer that holds no cookie.
- **A global grant passes `requireScope` everywhere, by design.** What keeps the Central Admin out of the curriculum
  is curriculum routes *not listing* `FULL_ADMIN` in `requireRole` — never the scope check. A route author who reaches
  for `requireScope` alone as the fence gets it wrong.
- **An empty scope chain is covered by nobody**, the global grant included, and is checked *before* the grants rather
  than left to fall out of them. A chain comes back empty for a target no table claims — including a route handing
  over `undefined` from a mistyped parameter — and the routes that list `FULL_ADMIN` are exactly the grant-management
  ones where a global grant would otherwise turn that mistake into a pass.
- **An account whose last grant was revoked mid-session is refused at `attachRoles`** with `403` and the same words
  sign-in uses for the same state, rather than left to fail at whichever guard it happens to meet.

The refusal for both a role and a scope failure is deliberately identical and names nothing — no other user, no table,
no identifier. The messages live in one table in `backend/auth/refusals.js`.

The rules are asserted through HTTP in `backend/test/authorise.test.js`; `scopeChain` and `covers` are not exported,
because docs/06's Testing Decisions allow the tests one seam.

## Amended by #10 — the acting grant

[#10](https://github.com/khthana/Deep-QA/issues/10) narrowed what the guards read, and added the one endpoint that
does take `role_id` and `scope_id` in a body. Both are deliberate, and the rule above still holds.

An account can hold several grants. Until #10, `attachRoles` put all of them on `req.auth` and `requireRole` passed if
*any* matched, so a lecturer who was also a programme committee member passed a committee-only guard while wearing the
lecturer hat — and the only thing distinguishing the two was the sidebar, which is what this ADR exists to stop.
`req.auth` therefore gains `acting`: the one grant in effect, chosen by `actingFrom(roles, selected)`. `requireRole`
and `requireScope` consult `acting` **only**; `roles` remains, but as the list the role picker offers, not as an
authority.

`PUT /api/me/acting-role` is where the choice is made. It carries `role_id` and `scope_id` in a body, and the sentence
above about removing them from every request body is unchanged in spirit: what arrives is not an assertion of
privilege but a *choice among the grants the server has already read from `user_roles` for this caller*. The route
matches the pair against `req.auth.roles` and refuses anything not found there, so a body naming a grant the account
does not hold is a `403`, never an escalation. Both halves are required, because one account can hold one role at two
scopes and a role alone could not say which.

The selection then rides in the JWT, and this is the one place it is easy to read as a contradiction of the decision
above. It is a **pointer, not an authority**: `attachRoles` still reads the grants from the database on every request,
and `actingFrom` falls back to the most senior grant when the selected one is no longer among them. A revoked role
therefore stops working on the next request, exactly as before — the claim in the token cannot outlive the row.

What a later ticket can violate by accident:

- **`requireRole` now means "is acting as", not "holds".** Tickets #12–#46 were written against the older reading. A
  guard that should admit an account regardless of which hat it is wearing has no expression here and needs one added
  deliberately, not by reaching back into `req.auth.roles`.
- **`req.auth.roles` is not an authorisation input.** It exists so the shell can draw the picker. Any guard reading it
  reintroduces exactly the problem #10 removed.

## Amended by #11 — a grant made *for somebody else*

[#11](https://github.com/khthana/Deep-QA/issues/11) adds the third kind of body that carries `role_id` and `scope_id`:
`POST /api/users`, and every row of `POST /api/users/import`. #10's paragraph covered a body naming *the caller's own*
grant; this one names a grant the caller is about to hand to a stranger, which is a larger thing to allow and needs
saying plainly.

It is allowed because none of it is read as an assertion. What the body says is a **request**, and the answer comes
from the database and from `req.auth.acting` alone:

- **Scope.** `coveredScopes(pool, req.auth.acting.scope_id)` walks the organisation downwards from the acting grant's
  own scope and returns the set of scopes it reaches. Both the account's place (`COALESCE(program_id, department_id)`)
  and the scope the new grant names must be in that set, or the answer is `403 scopeNotYours`.
- **Seniority.** `roles.priority` is read from the database, never from the request. An administrator cannot grant a
  role more senior than the one they are acting as, cannot see an account holding one, and cannot deactivate it.
- **Who did it.** `user_roles.assigned_by` is `req.auth.userId`, from the token, never from the body.

So the body chooses among the grants the acting administrator was *already entitled to make*, in the same sense #10's
paragraph means it. A body naming a scope outside their reach or a role above their own is a `403`, not an escalation.

What a later ticket can violate by accident:

- **#12 owns the second grant onwards.** `readAccount` deliberately ignores a role named in an edit body
  (`PUT /api/users/:userId`) rather than half-applying it. When #12 adds grant management it must apply the same two
  checks above; a route that adds a grant without them is the hole this ADR exists to close, reopened from the side.
- **The import is not a lesser door.** Every row goes through the identical checks, because a rule the form enforces and
  the spreadsheet does not is a rule with a way around it — and the spreadsheet is how a hundred accounts arrive at once.
