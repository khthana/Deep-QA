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
