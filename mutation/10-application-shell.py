# -*- coding: utf-8 -*-
"""
#10 เปลือกหน้าจอ - the shell, the acting grant and the session that ends.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/10-application-shell.md
for which assertion, and for what each mutant is about.

    python mutation/10-application-shell.py save
    python mutation/10-application-shell.py <mutant>
    python mutation/10-application-shell.py restore
"""

from harness import main

FILES = {
    "authorise": "backend/auth/authorise.js",
    "me": "backend/routes/me.js",
    "progsub": "backend/routes/programSubjects.js",
    "client": "frontend/src/api/client.js",
    "navbar": "frontend/src/components/Navbar.js",
    "dropdown": "frontend/src/components/RoleDropdown.js",
    "admin": "backend/auth/administration.js",
    "session": "backend/auth/session.js",
    "authctx": "frontend/src/context/AuthContext.js",
}

MUTANTS = {
    # row 3a: the default grant is the senior one, not merely one of them
    "senior": ("authorise", "  ) ?? roles[0];", "  ) ?? roles[roles.length - 1];"),
    # row 3b: the switch is the server's answer, not the client's request
    "echoacting": ("me",
                   "...shellState(await currentUser(req), { ...req.auth, acting: held }),",
                   "...shellState(await currentUser(req), req.auth),"),
    # row 7a: the change answered 200 but never reached the stored credential
    "nowrite": ("me",
                "      await pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, [",
                "      if (false) await pool.query(`UPDATE users SET password = $2 WHERE user_id = $1`, ["),
    # row 7b: any refusal read as an expiry - the inherited modal's own defect
    "ejectonrefusal": ("navbar", "      if (err.expired) {", "      if (true) {"),
    # row 4: TEACHER is not a maintainer of program subjects. The anchor was
    # rewritten at #79, which took `FACULTY_ADMIN` out of that list.
    "maintainer": ("progsub",
                   "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN'];",
                   "const MAINTAINERS = ['PROG_MANAGER', 'DEPT_ADMIN', 'TEACHER'];"),
    # row 6a: a 401 anywhere raises the dialog
    "silent401": ("client",
                  "if (response.status === 401 && !anonymous) sessionExpiredListener?.()",
                  "if (response.status === 401 && false) sessionExpiredListener?.()"),
    # row 6c: a 403 is not a 401 - the inherited client's own defect
    "lump403": ("client",
                "if (response.status === 401 && !anonymous) sessionExpiredListener?.()",
                "if ((response.status === 401 || response.status === 403) && !anonymous) sessionExpiredListener?.()"),
    # row 3b: the trigger reads the grant being worn, not the senior one held
    "stalelabel": ("dropdown", "{label(acting)}", "{label(roles[0])}"),
    # row 8: a teacher is not an administrator of accounts
    "adminteacher": ("admin",
                     "const ADMIN_ROLES = ['FULL_ADMIN', 'FACULTY_ADMIN', 'DEPT_ADMIN'];",
                     "const ADMIN_ROLES = ['FULL_ADMIN', 'FACULTY_ADMIN', 'DEPT_ADMIN', 'TEACHER'];"),
    # row 6 reload: the cookie dies with the token, so no window exists
    "shortcookie": ("session",
                    "const COOKIE_LIFETIME_SECONDS = LIFETIME_SECONDS * 2;",
                    "const COOKIE_LIFETIME_SECONDS = LIFETIME_SECONDS;"),
    # row 6 reload: an expired first call is read as nobody having signed in
    "silentexpiry": ("authctx",
                     "if (error.reason === 'expired') setExpired(true)",
                     "if (false) setExpired(true)"),
    # row 7b: a wrong current password answered as an expiry
    "wrongas401": ("me",
                   "if (!matches) return res.status(403).json({ message: REFUSALS.wrongPassword });",
                   "if (!matches) return res.status(401).json({ message: REFUSALS.wrongPassword });"),
}

main(FILES, MUTANTS)
