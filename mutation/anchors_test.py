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
import subprocess
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


class TempStore(unittest.TestCase):
    """A store on disk this file made up, for the classes that need one."""

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


class Census(TempStore):
    """The check over a store this test made up."""

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


SHEET = (
    "| # | เกณฑ์ | ทำอะไร | "
    "ต้องเห็นอะไร | ✓ |\n"
    "|---|---|---|---|---|\n"
    "| 1 | a | b | c | ☑ |\n"
)


class Columns(TempStore):
    """Does a row render the cells it was written with? - #172."""

    def test_a_sheet_whose_rows_match_its_header(self):
        self.assertEqual(anchors.columns([self.write("16.md", SHEET)]), (0, 1, 1))

    def test_the_row_with_one_pipe_too_many_is_a_problem(self):
        # The disease itself: six cells in a five-column table, where Markdown
        # draws the blank and the mark lands in a cell nobody renders.
        sheet = SHEET.replace("| c | ☑ |", "| c || ☑ |")
        problems, tables, rows = anchors.columns([self.write("16.md", sheet)])
        self.assertEqual((problems, tables, rows), (1, 1, 1))

    def test_a_row_with_one_pipe_too_few_is_a_problem_as_well(self):
        # The same illness read from the other side: a mark that swallowed its
        # own column renders in the cell before it.
        sheet = SHEET.replace("| c | ☑ |", "| c ☑ |")
        self.assertEqual(anchors.columns([self.write("16.md", sheet)])[0], 1)

    def test_an_escaped_pipe_is_a_character_and_not_a_cell(self):
        # What the renderer does, which is what this has to do: `\|` is drawn
        # inside the cell rather than ending it.
        sheet = SHEET.replace("| b |", "| a \\| b |")
        self.assertEqual(anchors.columns([self.write("16.md", sheet)])[0], 0)

    def test_a_row_quoted_inside_a_fence_is_skipped(self):
        # A sheet that quotes a broken row on purpose is explaining the defect,
        # not carrying it. #172's own ticket does exactly this.
        sheet = SHEET + "\n```\n| 1 | a | b | c || ☑ |\n```\n"
        self.assertEqual(anchors.columns([self.write("16.md", sheet)])[0], 0)

    def test_a_table_with_no_rule_under_its_header_is_not_a_table(self):
        # Two lines that merely hold pipes are prose, and counting them as a
        # table would report every sentence with a `|` in it.
        prose = "a | b | c\nd | e\n"
        self.assertEqual(anchors.columns([self.write("16.md", prose)]), (0, 0, 0))

    def test_two_tables_in_one_file_are_counted_apart(self):
        # The width is the header's own, not the file's: a four-column table
        # under a five-column one is not four rows of the first.
        other = "| a | b | c | d |\n|---|---|---|---|\n| 1 | 2 | 3 | 4 |\n"
        problems, tables, rows = anchors.columns([self.write("16.md", SHEET + "\n" + other)])
        self.assertEqual((problems, tables, rows), (0, 2, 2))


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


SHEET_SOURCE = (
    "FILES = {'a': 'x.js'}\n"
    "MUTANTS = {'one': ('a', 'p', 'q'), 'two': ('a', 'r', 's')}\n"
)

TABLE = (
    "| ไฟล์ | ตั๋ว | จำนวน |\n"
    "|---|---|---:|\n"
    "| `21-rubrics.py` | #21 x | 2 |\n"
    "\n"
    "รวม **2 ตัว** (วันนี้)\n"
)


class Catalogue(TempStore):
    """Does the document know about every file there is? - #176."""

    def store(self, table=TABLE, source=SHEET_SOURCE, name="21-rubrics.py"):
        sheet = self.write(name, source)
        return [sheet], self.write("README.md", table)

    def test_a_document_that_knows_the_whole_catalogue(self):
        sheets, readme = self.store()
        self.assertEqual(anchors.catalogue(sheets, readme), (0, 1, 1))

    def test_a_file_the_table_does_not_know_about(self):
        # The disease itself. Six files were in this state for weeks, and the
        # sum over the table agreed with the total the whole time.
        sheets, readme = self.store()
        sheets.append(self.write("22-rubric-criteria.py", SHEET_SOURCE))
        problems, files, rows = anchors.catalogue(sheets, readme)
        self.assertEqual((problems, files, rows), (1, 2, 1))

    def test_a_row_naming_a_file_that_is_gone(self):
        # The same illness from the other side: a sheet deleted or renamed
        # leaves a row that reads like a claim about something.
        sheets, readme = self.store()
        self.assertEqual(anchors.catalogue([], readme)[0], 1)

    def test_a_row_whose_count_disagrees_with_the_file(self):
        # This is what makes the total a number a machine checks rather than
        # one somebody remembered to change.
        # The total moves with the row, so the one thing left disagreeing is
        # the row and the file. A fixture that left the total behind would
        # report two problems and prove neither of them on its own.
        sheets, readme = self.store(table=TABLE.replace("| 2 |", "| 3 |").replace("**2 ", "**3 "))
        self.assertEqual(anchors.catalogue(sheets, readme)[0], 1)

    def test_a_total_that_disagrees_with_the_rows(self):
        sheets, readme = self.store(table=TABLE.replace("**2 ", "**9 "))
        self.assertEqual(anchors.catalogue(sheets, readme)[0], 1)

    def test_no_total_at_all_is_could_not_ask_rather_than_clean(self):
        # level, behind, and *could not ask* - the third answer again (#159).
        sheets, readme = self.store(table=TABLE.split("\n\n")[0] + "\n")
        self.assertEqual(anchors.catalogue(sheets, readme)[0], 1)

    def test_a_row_quoted_inside_a_fence_is_not_a_row(self):
        # A README that shows what a row looks like is explaining the table,
        # not extending it.
        fenced = TABLE + "\n```\n| `99-invented.py` | #99 x | 7 |\n```\n"
        sheets, readme = self.store(table=fenced)
        self.assertEqual(anchors.catalogue(sheets, readme), (0, 1, 1))

    def test_a_sheet_whose_mutants_cannot_be_read_is_said_out_loud(self):
        # Counting it as zero would make the table's number look wrong for a
        # reason that is not the table's fault.
        sheets, readme = self.store(source="MUTANTS = {}\n")
        self.assertEqual(anchors.catalogue(sheets, readme)[0], 1)

    def test_the_tooling_beside_the_sheets_is_not_a_sheet(self):
        # `anchors.py`, `harness.py` and the two test files hold no mutants and
        # belong in no row; a list of names to skip would lie the day somebody
        # adds one (#126), so the catalogue asks the same pattern `check()` does.
        sheets = anchors.sheets()
        self.assertTrue(sheets)
        names = [os.path.basename(path) for path in sheets]
        self.assertNotIn("anchors.py", names)
        self.assertNotIn("harness.py", names)
        self.assertFalse([name for name in names if name.endswith("_test.py")])


class Markdown(TempStore):
    """The corpus `columns()` walks, once it stopped sharing one with `commands()`."""

    def tree(self, *names):
        """A repository-shaped directory holding each of `names`, empty."""
        for name in names:
            path = os.path.join(self.root, *name.split("/"))
            if not os.path.isdir(os.path.dirname(path)):
                os.makedirs(os.path.dirname(path))
            with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write("")
        return self.root

    def relative(self, paths):
        return sorted(os.path.relpath(path, self.root).replace(os.sep, "/")
                      for path in paths)

    def test_every_markdown_file_the_repository_owns(self):
        root = self.tree("README.md", "docs/03-er-diagram.md",
                         "docs/adr/0001-keys.md", "docs/handoff/2026-09-29-x.md",
                         "mutation/README.md")
        self.assertEqual(self.relative(anchors.markdown(root)),
                         ["README.md", "docs/03-er-diagram.md", "docs/adr/0001-keys.md",
                          "docs/handoff/2026-09-29-x.md", "mutation/README.md"])

    def test_what_is_not_markdown_is_not_in_it(self):
        root = self.tree("docs/06.md", "mutation/58-log.py", "e2e/tests/58a.spec.js")
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_the_trees_that_are_not_the_repositorys_to_render(self):
        # `node_modules` is somebody else's markdown, and the two `DEEP-QA-*`
        # directories are the student implementation as delivered - read-only
        # reference, deleted when the rebuild completes. A row broken in either
        # is not a row anybody may fix, so a check that reports it can only be
        # silenced by ignoring the check.
        root = self.tree("docs/06.md",
                         "node_modules/pkg/README.md",
                         "frontend/node_modules/pkg/README.md",
                         "DEEP-QA-BACKEND/README.md",
                         "DEEP-QA-FRONTEND/README.md",
                         "_local/notes.md")
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_the_real_corpus_holds_the_documents_the_store_could_not_see(self):
        # The store is `mutation/` + `docs/acceptance/` + one file, because that
        # is where a *command* is documented. Rendering is not about the store,
        # and the boundary hid nine broken rows until #175 (#123).
        found = [os.path.relpath(path, anchors.ROOT).replace(os.sep, "/")
                 for path in anchors.markdown()]
        self.assertIn("docs/03-er-diagram.md", found)
        self.assertIn("docs/05-screen-api-mapping.md", found)
        self.assertIn("docs/lessons.md", found)
        self.assertIn("CLAUDE.md", found)
        self.assertFalse([path for path in found if "node_modules" in path])
        self.assertFalse([path for path in found if path.startswith("DEEP-QA-")])

    def test_the_repository_renders_every_row_in_the_width_its_header_has(self):
        # The measurement #175 exists for, and the one that expires the day
        # somebody writes a bare `|` inside a code span again.
        self.assertEqual(anchors.columns(anchors.markdown())[0], 0)


# The head of the `error-context.md` playwright wrote on 4 October 2569, when
# row 4 of `116a` was broken on purpose to prove its own assertion could fail.
# Cut to the two fences that carry its pipes, which is where every one of the
# hundred and twelve in the real file was: a page snapshot and a source listing.
ARTEFACT = """# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.

# Test info

- Name: 116a-a-breadcrumb-that-reads-the-section.spec.js >> row 4
- Location: tests\\116a-a-breadcrumb-that-reads-the-section.spec.js:113:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 404
```

# Page snapshot

```yaml
- generic [ref=f1e4]:
  - navigation [ref=f1e6]:
    - link [ref=f1e9] [cursor=pointer]
```

# Test source

```
  26 |   // The label is stored with the id it was asked for, and the crumb
  27 |   // draws it only where the two agree.
  28 |   expect(await crumbsOn(page)).toEqual([DASHBOARD, String(NOT_THEIRS)]);
```
"""


class Ignored(TempStore):
    """What the catalogue says is on disk and is not this repository's - #186."""

    def repo(self, ignore, **files):
        """A real git repository, holding a `.gitignore` and each named file.

        A real one and not a directory of the right name, because what is being
        measured is git's answer: a fixture that only *looks* ignored passes
        whether the code asks anybody or not (#141).
        """
        subprocess.check_output(["git", "init", "-q"], cwd=self.root,
                                stderr=subprocess.STDOUT)
        self.write(".gitignore", ignore)
        for name, text in sorted(files.items()):
            path = os.path.join(self.root, *name.split("__"))
            if not os.path.isdir(os.path.dirname(path)):
                os.makedirs(os.path.dirname(path))
            with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(text)
        return self.root

    def relative(self, paths):
        return sorted(os.path.relpath(path, self.root).replace(os.sep, "/")
                      for path in paths)

    def test_the_tree_the_catalogue_ignores_is_not_in_the_corpus(self):
        # The defect: `test-results/` is in `e2e/.gitignore` and not in
        # `NOT_OURS`, so git cannot see the artefact and the walk can.
        root = self.repo(
            "test-results/\n",
            **{"docs__06.md": "| a | b |\n|---|---|\n| 1 | 2 |\n",
               "e2e__test-results__116a-row-4-chromium__error-context.md": ARTEFACT})
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_the_walk_finds_that_artefact_when_nobody_is_asked(self):
        # Which is what makes the row above a measurement rather than a
        # tautology: the artefact is reachable, and the catalogue is what
        # removes it. Break the real site before trusting the instrument (#141).
        root = self.repo(
            "test-results/\n",
            **{"docs__06.md": "",
               "e2e__test-results__116a-row-4-chromium__error-context.md": ARTEFACT})
        walked = []
        for where, directories, names in os.walk(root):
            directories[:] = [name for name in directories if name not in anchors.NOT_OURS]
            walked += [name for name in names if name.endswith(".md")]
        self.assertIn("error-context.md", walked)

    def test_a_document_the_catalogue_ignores_by_name_is_not_in_it_either(self):
        # The species is *what the catalogue says*, not *what a tree is called*,
        # so a single ignored file is the same answer as an ignored tree.
        root = self.repo("scratch-*.md\n",
                         **{"docs__06.md": "", "scratch-notes.md": ""})
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_what_the_catalogue_says_about_the_fixture(self):
        root = self.repo("test-results/\n",
                         **{"e2e__test-results__x-chromium__error-context.md": ARTEFACT})
        theirs, could_not_ask = anchors.ignored(root)
        self.assertIsNone(could_not_ask)
        self.assertIn("e2e/test-results/", theirs)

    def test_when_there_is_no_catalogue_to_ask_it_says_which_of_three(self):
        # level, behind, and *could not ask* (#159). A tree with no git in it is
        # not a tree with nothing ignored, and the run says so rather than
        # reporting a number it cannot stand behind.
        root = self.root
        os.makedirs(os.path.join(root, "docs"))
        self.write(os.path.join("docs", "06.md"), "")
        theirs, could_not_ask = anchors.ignored(root)
        self.assertEqual(theirs, frozenset())
        self.assertTrue(could_not_ask)
        # And the five names still answer, so the fallback is the walk it was.
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_the_real_repository_can_be_asked(self):
        theirs, could_not_ask = anchors.ignored()
        self.assertIsNone(could_not_ask)
        self.assertIn("frontend/node_modules/", theirs)
        here = [os.path.relpath(path, anchors.ROOT).replace(os.sep, "/")
                for path in anchors.markdown()]
        for path in here:
            for mine in theirs:
                self.assertFalse(path.startswith(mine), "%s is under %s" % (path, mine))

    def test_the_run_says_so_when_the_catalogue_cannot_be_asked(self):
        # `columns()` reads `ROOT` by construction - the point of the summary is
        # that it is about the real corpus - so the only way to put the third
        # answer in front of it is to answer for git. The row is about the
        # branch being wired, not about git's mechanics, which the rows above
        # measure against a real repository.
        def refuse(root=None):
            return frozenset(), "git could not be run (made up by this row)"

        was = anchors.ignored
        anchors.ignored = refuse
        self.addCleanup(setattr, anchors, "ignored", was)
        problems = anchors.columns()[0]
        # One problem and not a number of them: the corpus itself is clean, and
        # the name-only walk reads every tree the catalogue would have pruned,
        # so this also says those trees hold no broken row today.
        self.assertEqual(problems, 1)

    def test_the_artefact_is_invisible_to_the_render_check_itself(self):
        # Measured on 4 October 2569, and it refutes half of #186's own
        # diagnosis: every pipe in a real `error-context.md` is inside a fence,
        # so question three reports nothing. What this ticket fixes is the
        # corpus - the file count, which moved 115 -> 114 while nobody added a
        # document - and not a false report about somebody else's table.
        path = self.write("error-context.md", ARTEFACT)
        self.assertEqual(anchors.columns([path]), (0, 0, 0))


if __name__ == "__main__":
    unittest.main(verbosity=2)
