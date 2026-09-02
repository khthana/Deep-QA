# -*- coding: utf-8 -*-
"""
#26 กลุ่มงานนักศึกษา - dividing a class, and keeping the division valid.

Fourteen mutants. The ticket is two business rules and a log, so most of these
break one of the three: the ceiling stops counting, the one-group-per-student
guard stops guarding, a move is written into the history as an addition, or the
history comes back in the order nobody reads it in.

Two of them are about the screen rather than the routes, and each is there
because it is a failure a person cannot see: a cancel wired to the deletion
still draws the card for the length of a round trip, so the row that proves the
cancel has to watch the requests rather than the card.

The `noaddmember` mutant kills four rows and supports one. That is expected
rather than sloppy - putting somebody in a group is the act five of the eleven
rows begin with - and the acceptance document records which row it is evidence
for and which three are collateral.

    python mutation/26-work-groups.py save
    python mutation/26-work-groups.py <mutant>
    python mutation/26-work-groups.py restore

Killing them:

    cd e2e && npx playwright test 26a
"""

from harness import main

FILES = {
    "route": "backend/routes/workGroups.js",
    "screen": "frontend/src/pages/StudentGroups.js",
    "history": "frontend/src/components/groups/GroupHistory.js",
}

MUTANTS = {
    # The list stops being this ตอนเรียน's: every group in the database is
    # drawn, and the ones from the Section next door arrive holding nobody,
    # because the member query is still scoped. This is `offeringgrain` of #25
    # one table over - the failure where a screen quietly shows a colleague's
    # class. Kills row 1.
    "anysectiongroups": ("route",
                         "            WHERE section_id = $1 ORDER BY group_name, group_id`,",
                         "            WHERE $1 = $1 ORDER BY group_name, group_id`,"),
    # The name collision is refused with the wrong sentence, so a person told
    # their group could not be made is told to check the name's *shape*.
    # Kills row 2 at the sentence rather than at the status. Bound past the
    # `throw` to the CREATE_GROUP line, because the rename route's catch is
    # written identically.
    "duplicatesentence": ("route",
                          "            return refusedWith(409, REFUSALS.duplicateGroupName);\n"
                          "          }\n"
                          "          throw error;\n"
                          "        }\n"
                          "\n"
                          "        await record(client, { section, group, by: req.session.userId }, {\n"
                          "          action_type: 'CREATE_GROUP',",
                          "            return refusedWith(409, REFUSALS.invalidGroup);\n"
                          "          }\n"
                          "          throw error;\n"
                          "        }\n"
                          "\n"
                          "        await record(client, { section, group, by: req.session.userId }, {\n"
                          "          action_type: 'CREATE_GROUP',"),
    # The addition answers 201 and writes nobody: the group stays empty, the
    # log line still says somebody joined, and the screen draws a card that
    # cannot be told from one nobody has used yet. Kills row 3.
    "noaddmember": ("route",
                    "        }\n"
                    "\n"
                    "        await client.query(\n"
                    "          'INSERT INTO student_group_member (group_id, student_id) VALUES ($1, $2)',\n"
                    "          [group.group_id, studentId],\n"
                    "        );",
                    "        }\n"
                    "\n"
                    "        // mutant: the membership row is never written"),
    # BR-07 stops being enforced on the add: a student already in a group is
    # put into a second one, and the two cards then both claim them. Kills
    # row 4 at the refusal that answers 201.
    "noothergroupguard": ("route",
                          "        if (standing.group) {\n"
                          "          const message =",
                          "        if (false && standing.group) {\n"
                          "          const message ="),
    # BR-06's ceiling is off by one, which is the version of this failure
    # nobody notices: groups of eleven are legal and nothing else changes.
    # Kills row 5 at the eleventh student the screen expects to be refused.
    "ceilingoffbyone": ("route",
                        "const MAX_MEMBERS = 10;",
                        "const MAX_MEMBERS = 11;"),
    # A move is written into the history as an addition, with no origin. The
    # membership table ends up right and the history has lost the one fact the
    # ticket's fifth criterion is about. Kills row 6 at the newest line.
    "moveloggedasadd": ("route",
                        "          action_type: 'MOVE_STUDENT',\n"
                        "          old_group_id: standing.group.group_id,",
                        "          action_type: 'ADD_STUDENT',\n"
                        "          old_group_id: null,"),
    # Taking somebody out removes nobody: the route answers ไม่พบ and the
    # member stays on the card. Kills row 7.
    "removeremovesnobody": ("route",
                            "          [group.group_id, req.params.studentId],",
                            "          [group.group_id, 'ไม่มีรหัสนี้'],"),
    # The confirmation's ยกเลิก is wired to the deletion, which is the failure
    # a row asserting "the card is still there" cannot see: the card is still
    # there, and the group is gone. Kills row 8 at the DELETEs that must be
    # none.
    "cancelisdelete": ("screen",
                       "        onConfirm={disband}\n"
                       "        onCancel={() => setRemovingGroup(null)}",
                       "        onConfirm={disband}\n"
                       "        onCancel={disband}"),
    # A deleted group takes its members' exits with it silently: the group is
    # gone and the log says only that it went, so the people it held have no
    # line saying they left. Kills row 8's history half.
    "deletewritesnoexits": ("route",
                            "        for (const member of rows) {\n"
                            "          await record(client, ledger, {",
                            "        for (const member of []) {\n"
                            "          await record(client, ledger, {"),
    # The history comes back oldest first, so the page a person opens shows
    # the day the groups were seeded and never what just happened. Kills row 9.
    "historyoldestfirst": ("route",
                           "            ORDER BY l.created_at DESC, l.log_id DESC",
                           "            ORDER BY l.created_at ASC, l.log_id ASC"),
    # The history forgets who acted, and falls back to the account id. Every
    # line still reads as an act; none of them answers the question the panel
    # exists for. Kills row 9's second half.
    "historynoactor": ("route",
                       "                  trim(both ' ' from concat_ws(' ', u.title_th, u.first_name_th, u.last_name_th))\n"
                       "                    AS performed_by_name,",
                       "                  NULL AS performed_by_name,"),
    # The template loses the column that makes it this screen's, so a person
    # downloads a file they cannot fill in and the import answers every row of
    # it with the wrong-template sentence. Kills row 10 at the header.
    "templatemissescolumn": ("route",
                             "const IMPORT_COLUMNS = ['group_name', 'student_id'];",
                             "const IMPORT_COLUMNS = ['student_id'];"),
    # The per-row report names the wrong reason: a code the class list does not
    # hold is reported as a code of the wrong shape, which sends the reader to
    # check eight digits that are already right. Kills row 10's report.
    "importwrongreason": ("route",
                          "            if (!standing) return 'studentNotEnrolled';",
                          "            if (!standing) return 'invalidEnrolment';"),
    # The history panel stops rereading, so a change made while it is open
    # leaves it showing the class as it stood before that change. Every other
    # row opens the panel after the act it asks about and cannot see this.
    # Kills row 12.
    "historystaleafterwrite": ("screen",
                               "            <GroupHistory\n"
                               "              key={writes}\n",
                               "            <GroupHistory\n"),
    # A ตอนเรียน that is not this account's answers with an empty screen rather
    # than a refusal, so the address bar becomes a way of learning which ids
    # exist. Bound to the list route's own use of the shared refusal, because
    # `notThisSection` itself lives in `enrolment.js` now and mutating it there
    # would be mutating #25. Kills row 11.
    "foreignsectionallowed": ("route",
                              "        if (!section) return notThisSection(res);\n"
                              "\n"
                              "        const groups = await pool.query(",
                              "        if (!section)\n"
                              "          return res\n"
                              "            .status(200)\n"
                              "            .json({ groups: [], students: [], max_group_size: 10, section: {} });\n"
                              "\n"
                              "        const groups = await pool.query("),
}

if __name__ == "__main__":
    main(FILES, MUTANTS)
