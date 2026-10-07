# -*- coding: utf-8 -*-
"""
#11 ข้อมูลผู้ใช้งาน and #12 สิทธิ์การใช้งาน - the account and grant routes.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/11-user-accounts.md and docs/acceptance/12-role-grants.md
for which assertion, and for what each mutant is about.

    python mutation/11-12-accounts-and-grants.py save
    python mutation/11-12-accounts-and-grants.py <mutant>
    python mutation/11-12-accounts-and-grants.py restore
"""

from harness import main

FILES = {
    'users': 'backend/routes/users.js',
    'grants': 'backend/routes/grants.js',
    'accounts': 'backend/auth/accounts.js',
    'importer': 'backend/lib/importer.js',
    'authorise': 'backend/auth/authorise.js',
    'client': 'frontend/src/api/client.js',
    'authcontext': 'frontend/src/context/AuthContext.js',
}

MUTANTS = {
 'M1': ('users',
   "title_th = $3, first_name_th = $4, last_name_th = $5,",
   "title_th = $3, first_name_th = $4, last_name_th = COALESCE(last_name_th, $5),"),
 'M2': ('users',
   "      await recordActivity(pool, req.auth.userId, 'UPDATE_USER', onUser(existing.user_id));",
   "      await pool.query('DELETE FROM user_roles WHERE user_id = $1', [existing.user_id]);\n      await recordActivity(pool, req.auth.userId, 'UPDATE_USER', onUser(existing.user_id));"),
 'M3': ('grants',
   "[target.user_id, roleId, scopeId, req.auth.userId],",
   "[target.user_id, roleId, scopeId, 'admin01'],"),
 'M4': ('grants',
   "`UPDATE user_roles SET is_active = false",
   "`UPDATE user_roles SET is_active = true"),
 'M5': ('accounts',
   "WHERE ur.user_id = $1 AND ur.is_active AND r.is_active",
   "WHERE ur.user_id = $1 AND r.is_active"),
 'M6': ('grants',
   "        if (userId === req.auth.userId) {\n          return res.status(403).json({ message: REFUSALS.selfRevoke });\n        }\n",
   ""),
 # The live session's own copy of the suspension check, and only that copy:
 # `admit` makes the same test at sign-in, so with this gone a suspended
 # account is still refused at the sign-in screen and goes on working in the
 # tab it already had. Anchored on the line above it because the two copies of
 # the check are written the same way.
 'M8': ('accounts',
   "  if (!user) return refuse(403, 'unknown');\n  if (user.status !== 'active') return refuse(403, 'inactive');",
   "  if (!user) return refuse(403, 'unknown');"),
 'M7': ('grants',
   "SET is_active = true, assigned_by = EXCLUDED.assigned_by, assigned_at = now()",
   "SET is_active = true, assigned_at = now()"),
 # The whole-or-nothing rule of an import, which #64 needed a mutant for once
 # the four vacuous counts in 11b and 14b were taken out: what is left had to
 # be shown to be the thing that carries the claim. Same edit as `keepgood` in
 # mutation/18-program-subjects.py, against the same shared importer - which is
 # the point, since one rollback serves every screen's import.
 # ---- #77: the picker catching up without a reload -------------------------
 # One mutant per site, because the fix landed at two (#125): the answer has to
 # carry the grants, and the client has to announce them. Either one alone is
 # the defect #77 reported, and neither stops the application - which is what
 # makes them mutants rather than outages.
 'M10': ('authorise',
   "      carryGrants(res, req.auth);\n",
   ""),
 'M11': ('client',
   "    if (grants && grants.read_at > announcedAt) {",
   "    if (grants && grants.read_at < announcedAt) {"),
 # Not a site but the rule the listener is narrow by: `acting` comes from the
 # header only once the grant being worn is gone. With this gone the shell moves
 # a person into a role somebody else just granted them, which is why row 8
 # asserts the hat it is wearing and not only the list it offers.
 'M12': ('authcontext',
   "acting: stillHeld ? prev.acting : acting }",
   "acting }"),
 # ---- #193: the giving direction of criterion 2 --------------------------
 # `M4` and `M5` reach the revoking direction only, so
 # `expect(await reachProgramSubjects(grantee)).toBe(200)` - a grant just
 # given takes effect on the next request - had nothing that could fail it
 # for its own reason. Nothing to alter, either: `attachRoles` reads the
 # grants on every request and there is no cache to break, so the mutant
 # inserts, which is the shape `M2` above already uses.
 #
 # It goes in `requireRole` and not in `attachRoles` because of where the
 # row's assertions sit. `requireRole` is what decides the 200, and
 # `/api/me` is mounted above every `requireRole`, so the shell still reads
 # the grants fresh and the acting-role button the row checks before the 200
 # still says what it should. The same staleness in `attachRoles` reaches
 # both and kills the row at that button instead, which would leave the 200
 # exactly as unproved as it was. Measured, not reasoned: the proposed shape
 # ran as a mutant of its own and died at `12a-role-grants.spec.js:193`, the
 # acting-role button, with the 200 one line below it never reached. This
 # one dies at `:194`.
 #
 # The two flanking 403s must stay green: before the grant and after the
 # revoke, the remembered role is the teaching one either way. A mutant that
 # takes all three has stopped the application rather than proved a row.
 #
 # It kills two rows, both at their own 200: `rows 2 and 3` at `:194`, which
 # arrives by a reload, and #77's `row 8` at `:391`, which arrives by a menu
 # press. The picker assertions above the second one pass, the shell reading
 # fresh either way. One mutant over shared code cannot tell the two ways in
 # apart, so what each row adds is that its own way in gets there, and the
 # kill is that proof (#191).
 #
 # `16-subjects.py` has an `M13` of its own. No sheet carries rows from both
 # files, so the two never meet in one table (#185).
 'M13': [('authorise',
   "function requireRole(...roleIds) {\n  const allowed = new Set(roleIds);\n",
   "const actedAs = new Map();\nfunction requireRole(...roleIds) {\n  const allowed = new Set(roleIds);\n"),
  ('authorise',
   "    return allowed.has(req.auth.acting.role_id) ? next() : forbid(res);\n",
   "    if (!actedAs.has(req.auth.userId)) actedAs.set(req.auth.userId, req.auth.acting.role_id);\n"
   "    return allowed.has(actedAs.get(req.auth.userId)) ? next() : forbid(res);\n")],
 'M9': ('importer',
   "      await client.query('ROLLBACK');\n      return { ok: false,",
   "      await client.query('COMMIT');\n      return { ok: false,"),
}

main(FILES, MUTANTS)
