# -*- coding: utf-8 -*-
"""
#11 ผู้ใช้งานระบบ and #12 สิทธิ์การใช้งาน - the account and grant routes.

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
   "        if (userId === req.auth.userId) {\n          return res.status(403).json({ message: REFUSALS.forbidden });\n        }\n",
   ""),
 'M7': ('grants',
   "SET is_active = true, assigned_by = EXCLUDED.assigned_by, assigned_at = now()",
   "SET is_active = true, assigned_at = now()"),
}

main(FILES, MUTANTS)
