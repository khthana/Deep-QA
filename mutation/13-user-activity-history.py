# -*- coding: utf-8 -*-
"""
#13 ประวัติการใช้งาน - the activity history, its panel and its page.

Every mutant here was applied on its own and the suite run against it, and each
killed the one assertion it was aimed at - see the mutation section of
docs/acceptance/13-user-activity-history.md
for which assertion, and for what each mutant is about.

    python mutation/13-user-activity-history.py save
    python mutation/13-user-activity-history.py <mutant>
    python mutation/13-user-activity-history.py restore
"""

from harness import main

FILES = {
    'history': 'backend/routes/history.js',
    'users': 'backend/routes/users.js',
    'auth': 'backend/routes/auth.js',
    'panel': 'frontend/src/components/users/HistoryPanel.js',
    'userhistory': 'frontend/src/pages/UserHistory.js',
}

# Each mutant is a list of edits, because one of them (N9) has to undo a change
# that was made in two files at once - the effect in the panel and the `key` at
# the call site are one decision, and reverting either alone is not the shape
# the code used to have.

MUTANTS = {
 # newest-last: the top line is no longer what just happened
 'N1': [('history',
   "ORDER BY time_stamp DESC, id DESC",
   "ORDER BY time_stamp ASC, id ASC")],
 # the line filed under the subject instead of the actor
 'N2': [('users',
   "await recordActivity(pool, req.auth.userId, 'SET_USER_STATUS', onUser(existing.user_id));",
   "await recordActivity(pool, existing.user_id, 'SET_USER_STATUS', onUser(existing.user_id));")],
 # the record named by its id alone, without saying what kind of record it is
 'N3': [('panel',
   "entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : '—'",
   "entry.target_id ? `${entry.target_id}` : '—'")],
 # an activity with no target filled in with something rather than left blank
 # the em-dash placeholder replaced by something always truthy, so a row with
 # no target reads as though it had one. Anchored on the whole expression as
 # of 2026-08-20: the two-space form it was recorded against matches the time
 # column as well, and the harness refuses an ambiguous mutant.
 'N4': [('panel',
   "entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : '—'",
   "entry.target_id ? `${TARGETS[entry.target_kind] ?? entry.target_kind} ${entry.target_id}` : entry.user_id")],
 # the browser's own clock left to decide the hour
 'N5': [('panel',
   "        timeZone: 'Asia/Bangkok',\n",
   "")],
 # the page number left behind when the person underneath changes.
 #
 # Kept as it was written, against the shape the code had then: an effect that
 # reset the page, emptied. It misses on today's tree, which no longer has the
 # effect - N9 is the mutant that covers this row now.
 # SUPERSEDED, kept as a record: the panel used to reset its page number in an
 # effect, and that was replaced by a `key` at the two call sites - which is
 # what N9 is about. This one can no longer be applied.
 'N6': [('panel',
   "  useEffect(() => {\n    setPage(1)\n  }, [user.user_id])",
   "  useEffect(() => {}, [user.user_id])")],
 # signing out not recorded
 'N7': [('auth',
   "      await recordActivity(pool, req.session.userId, 'LOGOUT');\n",
   "")],
 # the accounts list not narrowed to what the acting grant reaches
 'N8': [('users',
   "WHERE ($1::text[] IS NULL OR ${OWN_SCOPE} = ANY($1))",
   "WHERE ($1::text[] IS NULL OR TRUE)")],
 # the page number owned by the panel again rather than by the account: the
 # `key` gone from the call site and the corrective effect back. This is the
 # exact shape the code had before the fix, and the only thing that tells it
 # from the fixed shape is the one wasted read of page two.
 'N9': [('userhistory',
   "<HistoryPanel key={chosen.user_id} user={chosen} onError={report} />",
   "<HistoryPanel user={chosen} onError={report} />"),
   ('panel',
   "  const [loading, setLoading] = useState(true)\n",
   "  const [loading, setLoading] = useState(true)\n\n  useEffect(() => {\n    setPage(1)\n  }, [user.user_id])\n")],
}

main(FILES, MUTANTS)
