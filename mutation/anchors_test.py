# -*- coding: utf-8 -*-
"""What `anchors.py` promises about the documented run commands - #158.

`check()` has no tests: it reads the real store and prints what it finds, and a
test of it would be a copy of the store. `commands()` is different - it takes
the spec list and the files to read as arguments precisely so this file can hand
it a world it made up, which is the only way to assert that a colliding argument
is *found* rather than that today's store happens to be clean.

Run:

    python mutation/anchors_test.py

stdlib `unittest`, for the reason `harness_test.py` gives.
"""

import io
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import anchors  # noqa: E402


SPECS = [
    "tests/21a-rubrics.spec.js",
    "tests/121a-grants-notice-in-view.spec.js",
    "tests/23a-offerings.spec.js",
    "tests/23b-offerings-refusals.spec.js",
]


class Arguments(unittest.TestCase):
    """What counts as a file filter on a documented command line."""

    def test_the_argument_of_a_plain_command(self):
        self.assertEqual(
            anchors.arguments("    cd e2e && npx playwright test 21a-rubrics"),
            ["21a-rubrics"],
        )

    def test_a_comment_after_the_command_is_not_an_argument(self):
        # Every sheet that says what to expect writes it here, and the first
        # census of this counted `expect`, `exactly` and `the` as spec filters.
        self.assertEqual(
            anchors.arguments("    npx playwright test 21a-rubrics   # expect one failure"),
            ["21a-rubrics"],
        )

    def test_what_follows_the_command_stops_at_a_shell_separator(self):
        self.assertEqual(
            anchors.arguments("npx playwright test 23a-offerings && python x.py restore"),
            ["23a-offerings"],
        )

    def test_several_arguments_are_all_of_them(self):
        self.assertEqual(
            anchors.arguments("npx playwright test 23a-offerings 23b-offerings-refusals"),
            ["23a-offerings", "23b-offerings-refusals"],
        )

    def test_a_flag_and_its_attached_value_are_not_arguments(self):
        self.assertEqual(
            anchors.arguments("npx playwright test 21a-rubrics --reporter=line"),
            ["21a-rubrics"],
        )

    def test_a_quoted_flag_value_is_not_an_argument(self):
        # `--grep "Departments.js"` - the value is not a file filter, and
        # reading it as one would report a file that does not exist.
        self.assertEqual(
            anchors.arguments('npx playwright test 142a --grep "Departments.js"'),
            ["142a"],
        )

    def test_a_placeholder_standing_for_an_argument_is_not_one(self):
        # `133-superseded-on-screen.py` documents the shape of the command it
        # ran per sheet rather than one command: `tests/<sheet>` names no file
        # and is not a sheet that forgot to.
        self.assertEqual(anchors.arguments("npx playwright test tests/<sheet>"), [])

    def test_an_environment_variable_in_front_is_not_an_argument(self):
        self.assertEqual(
            anchors.arguments("cd e2e && E2E_FRONTEND_PORT=5300 npx playwright test 21a-rubrics"),
            ["21a-rubrics"],
        )

    def test_a_line_with_no_command_has_no_arguments(self):
        self.assertEqual(anchors.arguments("`21a` runs eleven rows"), [])


class Resolution(unittest.TestCase):
    """What one argument runs, matched the way Playwright matches it."""

    def test_an_argument_naming_one_file(self):
        self.assertEqual(anchors.runs("23b-offerings", SPECS), ["tests/23b-offerings-refusals.spec.js"])

    def test_the_defect_this_check_exists_for(self):
        # `21a` is a substring of `121a`, so the shorter argument runs both.
        self.assertEqual(
            anchors.runs("21a", SPECS),
            ["tests/121a-grants-notice-in-view.spec.js", "tests/21a-rubrics.spec.js"],
        )

    def test_the_prefix_that_is_still_not_enough(self):
        # `21a-` looks like it names the file and does not: the colliding name
        # carries the hyphen too. Only `21a-rubrics` separates them.
        self.assertEqual(len(anchors.runs("21a-", SPECS)), 2)
        self.assertEqual(anchors.runs("21a-rubrics", SPECS), ["tests/21a-rubrics.spec.js"])

    def test_an_argument_naming_nothing(self):
        self.assertEqual(anchors.runs("77a-nothing", SPECS), [])

    def test_an_argument_that_is_not_a_regular_expression(self):
        self.assertIsNone(anchors.runs("21a(", SPECS))


class Census(unittest.TestCase):
    """The check over a store this test made up."""

    def setUp(self):
        self.root = tempfile.mkdtemp()
        # What a run writes outside the repository outlives the rows that name
        # it unless the row clears it in the same breath (#138).
        self.addCleanup(shutil.rmtree, self.root, True)

    def write(self, name, text):
        path = os.path.join(self.root, name)
        with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        return path

    def test_a_clean_store_has_no_problems(self):
        path = self.write("21-rubrics.py", "    cd e2e && npx playwright test 21a-rubrics\n")
        self.assertEqual(anchors.commands(SPECS, [path])[0], 0)

    def test_the_colliding_argument_is_a_problem(self):
        path = self.write("21-rubrics.py", "    cd e2e && npx playwright test 21a\n")
        problems, arguments, _ = anchors.commands(SPECS, [path])
        self.assertEqual(problems, 1)
        self.assertEqual(arguments, 1)

    def test_an_argument_naming_no_file_is_a_problem_too(self):
        # A spec renamed out from under a sheet reads the same way round as a
        # spec added beside it: the command no longer runs what it says.
        path = self.write("21-rubrics.py", "    cd e2e && npx playwright test 21b-gone\n")
        self.assertEqual(anchors.commands(SPECS, [path])[0], 1)

    def test_the_store_it_reads_leaves_out_the_files_that_quote_commands(self):
        # This file documents `21a` deliberately, two classes up, and
        # `anchors.py` quotes it in its docstring and holds the pattern that
        # finds it. Reading either would report its own fixtures for ever.
        _, files = anchors._store()
        self.assertTrue(files)
        self.assertFalse([path for path in files if path.endswith("_test.py")])
        self.assertFalse([path for path in files if os.path.basename(path) == "anchors.py"])

    def test_what_was_skipped_is_counted_rather_than_passed_over(self):
        path = self.write("x.py", 'npx playwright test 21a-rubrics --grep "Departments.js"\n')
        problems, arguments, skipped = anchors.commands(SPECS, [path])
        self.assertEqual((problems, arguments, skipped), (0, 1, 2))


class Store(unittest.TestCase):
    """What the store is, when the tree is not the tree this repository has."""

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.root, True)
        self.was = anchors.ROOT
        self.addCleanup(setattr, anchors, "ROOT", self.was)
        anchors.ROOT = self.root

    def tests(self, *names):
        os.makedirs(os.path.join(self.root, "e2e", "tests"))
        for name in names:
            io.open(os.path.join(self.root, "e2e", "tests", name), "w").close()

    def test_a_file_that_is_not_a_spec_is_not_one(self):
        # A helper beside the specs would otherwise make a correct argument
        # look like it runs two files.
        self.tests("21a-rubrics.spec.js", "helpers.js")
        specs, _ = anchors._store()
        self.assertEqual(specs, ["tests/21a-rubrics.spec.js"])

    def test_no_spec_directory_is_a_third_answer_and_not_a_clean_run(self):
        # level, behind, and *could not ask* - folding the third into either of
        # the others is the mistake #159 is about.
        specs, _ = anchors._store()
        self.assertIsNone(specs)
        self.assertEqual(anchors.commands(), (1, 0, 0))


if __name__ == "__main__":
    unittest.main(verbosity=2)
