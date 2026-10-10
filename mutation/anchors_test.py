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

import glob
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

    def test_no_acceptance_directory_is_a_third_answer_as_well(self):
        # The sixth question's own third answer: a tree with no sheets in it
        # has not told anybody that the legends agree. `legends()` reads the
        # directory rather than the spec list, so this is the state that
        # proves the difference (#159).
        self.assertEqual(anchors.legends(), (1, 0, 0, {}))

    def test_no_spec_directory_is_a_third_answer_for_citations_too(self):
        # The same state, and the fifth question has to score it the same way:
        # a walk that resolved nothing has not said the store is clean. The
        # first round of #173 printed `CANNOT ASK` per citation and returned
        # no problem, so the walk exited 0 with nothing asked.
        self.assertEqual(anchors.citations(), (1, 0, 0, 0))


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

    def repo(self, files, **ignores):
        """A real git repository: `files` is {"a/b.md": text}, `ignores` the
        `.gitignore` files, named by their directory (`root=`, `e2e=`).

        A real repository and not a directory of the right name, because what
        is being measured is git's answer: a fixture that only *looks* ignored
        passes whether the code asks anybody or not (#141).
        """
        subprocess.check_output(["git", "init", "-q"], cwd=self.root,
                                stderr=subprocess.STDOUT)
        for where, text in sorted(ignores.items()):
            name = ".gitignore" if where == "root" else where + "/.gitignore"
            self.put(name, text)
        for name, text in sorted(files.items()):
            self.put(name, text)
        return self.root

    def put(self, name, text):
        """One file at a slash-separated path under the root, parents made."""
        path = os.path.join(self.root, *name.split("/"))
        if not os.path.isdir(os.path.dirname(path)):
            os.makedirs(os.path.dirname(path))
        with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
        return path

    def relative(self, paths):
        return sorted(os.path.relpath(path, self.root).replace(os.sep, "/")
                      for path in paths)

    def test_the_tree_the_catalogue_ignores_is_not_in_the_corpus(self):
        # The defect: `test-results/` is in `e2e/.gitignore` and not in
        # `NOT_OURS`, so git cannot see the artefact and the walk can.
        root = self.repo(
            {"docs/06.md": "| a | b |\n|---|---|\n| 1 | 2 |\n",
             "e2e/test-results/116a-row-4-chromium/error-context.md": ARTEFACT},
            e2e="test-results/\n")
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_the_gitignore_that_hides_it_is_the_nested_one(self):
        # The row above writes `e2e/.gitignore`, which is where the real one is
        # (`e2e/.gitignore:2`), and this says that is the shape being measured:
        # a pattern at the root would have been a different claim, and
        # `--exclude-standard` is what reads the nested file at all.
        root = self.repo(
            {"e2e/test-results/x-chromium/error-context.md": ARTEFACT},
            e2e="test-results/\n")
        self.assertIn("e2e/test-results/", anchors.ignored(root)[0])
        self.assertEqual(anchors.markdown(root), [])

    def test_a_tree_whose_name_is_thai_is_pruned_like_any_other(self):
        # Found by the review of #186: git prints a path holding any byte above
        # 127 quoted and octal-escaped unless it is asked otherwise, so without
        # `-z` the answer for this tree is
        # `"\340\271\200..."` and no comparison in the walk can match it.
        # The documents here are written in Thai, so this is the next failure
        # and not a hypothetical one.
        root = self.repo(
            {"docs/06.md": "",
             u"\u0e02\u0e2d\u0e07\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07/x.md": ""},
            root=u"\u0e02\u0e2d\u0e07\u0e40\u0e04\u0e23\u0e37\u0e48\u0e2d\u0e07/\n")
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_the_walk_finds_that_artefact_when_nobody_is_asked(self):
        # Which is what makes the row above a measurement rather than a
        # tautology: the artefact is reachable, and the catalogue is what
        # removes it. Break the real site before trusting the instrument (#141).
        root = self.repo(
            {"docs/06.md": "",
             "e2e/test-results/116a-row-4-chromium/error-context.md": ARTEFACT},
            e2e="test-results/\n")
        walked = []
        for where, directories, names in os.walk(root):
            directories[:] = [name for name in directories if name not in anchors.NOT_OURS]
            walked += [name for name in names if name.endswith(".md")]
        self.assertIn("error-context.md", walked)

    def test_a_document_the_catalogue_ignores_by_name_is_not_in_it_either(self):
        # The species is *what the catalogue says*, not *what a tree is called*,
        # so a single ignored file is the same answer as an ignored tree.
        root = self.repo({"docs/06.md": "", "scratch-notes.md": ""},
                         root="scratch-*.md\n")
        self.assertEqual(self.relative(anchors.markdown(root)), ["docs/06.md"])

    def test_what_the_catalogue_says_about_the_fixture(self):
        root = self.repo(
            {"e2e/test-results/x-chromium/error-context.md": ARTEFACT},
            e2e="test-results/\n")
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
        # What is asserted is that the question can be put here and that the
        # walk obeys the answer - not which trees this machine happens to hold.
        # `frontend/node_modules/` would be red on a clone where nobody has run
        # `npm install`, for a reason that is not the code's.
        theirs, could_not_ask = anchors.ignored()
        self.assertIsNone(could_not_ask)
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
        # The precondition, asserted where it is used (#154): the answer below
        # is only interesting because the text *has* pipes in it, and a fixture
        # that lost them would read the same.
        self.assertGreaterEqual(ARTEFACT.count("|"), 3)
        self.assertEqual(anchors.columns([path]), (0, 0, 0))


class Citations(TempStore):
    """Does a citation still name something that is there? - #173.

    These resolve their spec tokens against the real `e2e/tests`, which is the
    half of the question that cannot be faked: a fixture suite would prove the
    regex and say nothing about whether a sheet in this repository still
    points at an assertion. The sheets are made up; the specs are not.
    """

    def sheet(self, text):
        return [self.write("10-made-up.md", text)]

    def test_a_name_that_is_still_in_the_spec(self):
        files = self.sheet("| x | `10a:the second window, before the session ends` |\n")
        self.assertEqual(anchors.citations(files), (0, 1, 0, 0))

    def test_a_name_that_is_gone(self):
        # The disease. A row names an assertion, the assertion is renamed or
        # deleted by another ticket, and nothing about the row looks wrong.
        files = self.sheet("| x | `10a:where the box used to be` |\n")
        self.assertEqual(anchors.citations(files), (1, 1, 0, 0))

    def test_a_token_naming_no_spec_at_all(self):
        files = self.sheet("| x | `99z:anything` |\n")
        self.assertEqual(anchors.citations(files)[0], 1)

    def test_a_token_naming_two_specs(self):
        # The other half of that branch, and it is not hypothetical: a token
        # is matched as a substring because that is what Playwright does
        # (#154, #158), so `22a` names `22a-rubric-criteria` and
        # `122a-weight-total-in-words` both. A glob anchored at the start of
        # the basename answered *one file* here, which is this question
        # giving a clean answer about an ambiguous citation - the one answer
        # it must not give. The store had such a citation when this was
        # written and the fix was to name the file.
        self.assertEqual(len(anchors._needle("22a", anchors._store()[0])), 2)
        files = self.sheet("| x | `22a:106` |\n")
        self.assertEqual(anchors.citations(files)[0], 1)

    def test_a_number_in_the_checkable_shape_is_counted_and_not_checked(self):
        # The third answer, and the reason this question exists. The line is
        # there - it is line 194 of a file with more than 194 lines - and that
        # is not the question anybody asked (#159, #173).
        files = self.sheet("| x | `10a:194` |\n")
        self.assertEqual(anchors.citations(files), (0, 0, 1, 0))

    def test_the_old_spellings_are_counted_where_they_stand(self):
        # Thai with no file beside the number, a bare `:N`, and a path with one
        # on the end: three spellings, three citations, nothing checked.
        files = self.sheet("| x | \u0e1a\u0e23\u0e23\u0e17\u0e31\u0e14 96 \u00b7 `:58` "
                           "\u00b7 `Navbar.js:58` |\n")
        self.assertEqual(anchors.citations(files), (0, 0, 3, 0))

    def test_a_citation_in_the_new_shape_is_not_also_counted_as_an_old_one(self):
        # `10a-shell.spec.js:row 3` holds a path and a colon, which is the
        # third old spelling exactly. Counting it twice would make the figure
        # for what is left to convert grow every time something is converted.
        files = self.sheet("| x | `10a-shell.spec.js:row 3: two grants` |\n")
        self.assertEqual(anchors.citations(files), (0, 1, 0, 0))

    def test_a_citation_inside_a_fence_is_counted_out_loud_and_not_read(self):
        # `mutation/README.md` writes two of these as examples of the shape,
        # and counting them made the store's own figure for how much is
        # converted move when nothing was converted. The rule `columns()`
        # follows for a quoted broken row, for the same reason - and the
        # count comes back rather than only being printed, because *skipped
        # quietly* and *counted out loud* are the same green otherwise
        # (#126).
        files = self.sheet("```\n`10a:where the box used to be`\n\u0e1a\u0e23\u0e23\u0e17"
                           "\u0e31\u0e14 96\n```\n")
        self.assertEqual(anchors.citations(files), (0, 0, 0, 2))

    def test_what_it_cannot_tell_is_that_the_string_is_in_a_comment(self):
        # Written down rather than fixed: `The price #94 pays` is a comment in
        # `10a` and not an assertion, and nothing here can tell the two apart.
        # A citation that lands in a comment reads as clean.
        files = self.sheet("| x | `10a:The price #94 pays` |\n")
        self.assertEqual(anchors.citations(files), (0, 1, 0, 0))

    def test_a_token_that_names_nothing_in_an_empty_suite_is_still_a_problem(self):
        # Handed a spec list rather than asked for one: an empty list is a
        # suite with no files in it, which is *this citation resolves to
        # nothing* and not *there was nobody to ask*. The second is in
        # `Store`, where the tree has no `e2e/tests` at all.
        self.assertEqual(anchors.citations(self.sheet("| x | `10a:anything` |\n"), [])[0], 1)

    def test_the_real_store_has_no_rotten_citation_by_name(self):
        # The count is asserted beside the problems: a `CITATION` that matched
        # nothing would pass on problems alone, which is an assertion that
        # cannot fail.
        problems, checked, numbered, _ = anchors.citations()
        self.assertEqual(problems, 0)
        self.assertGreaterEqual(checked, 14)
        self.assertGreater(numbered, 0)


# The four marks, written here as escapes rather than as glyphs: this file is
# read in a console that cannot print them, and a fixture whose text cannot be
# shown is a fixture nobody proofreads.
WALKED = u"\u2611"      # the row is walked
HALF = u"\u25d0"        # walked half way - the mark this question is about
NOT_WALKED = u"\u2610"  # not walked
GEAR = u"\u2699"        # covered by the browser seam
TICK_HEAD = u"\u2713"   # one of the two headers a sheet gives the mark column
THAI_HEAD = u"\u0e1c\u0e25"
DOT = u"\u00b7"        # what the inline register puts between two entries


def legend(*entries):
    """A legend block in the bullet register the sheets use."""
    return u"\n".join(u"- **%s** %s" % pair for pair in entries)


def table(*marks, **kwargs):
    """A table with a mark column, by default the last one."""
    head = kwargs.get("head", TICK_HEAD)
    first = kwargs.get("first", False)
    if first:
        rows = [u"| %s | x |" % mark for mark in marks]
        return u"\n".join([u"| %s | what |" % head, u"|---|---|"] + rows)
    rows = [u"| x | %s |" % mark for mark in marks]
    return u"\n".join([u"| what | %s |" % head, u"|---|---|"] + rows)


class Legends(TempStore):
    """Does every sheet define the marks it uses, in one spelling? - #157.

    The sheets are made up, for the reason `Census` gives: the only way to
    assert that a second spelling of the half mark is *found* is to write one,
    and the real store is one spelling by construction the moment this lands.
    """

    def sheets(self, *texts):
        return [self.write("%d-made-up.md" % (10 + number), text)
                for number, text in enumerate(texts)]

    def test_a_sheet_whose_legend_defines_every_mark_it_uses(self):
        files = self.sheets(legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n"
                            + table(WALKED, HALF))
        problems, read, marks, spellings = anchors.legends(files)
        self.assertEqual((problems, read, marks, spellings),
                         (0, 1, 2, {WALKED: 1, HALF: 1}))

    def test_a_mark_the_table_carries_and_the_legend_does_not_define(self):
        # The defect this question exists for: sheet 12 of the real store said
        # its last column had three values while a row of it carried a fourth.
        files = self.sheets(legend((WALKED, u"walked"), (NOT_WALKED, u"not walked"))
                            + u"\n\n" + table(WALKED, HALF))
        self.assertEqual(anchors.legends(files)[0], 1)

    def test_a_mark_the_legend_defines_and_the_table_never_uses_is_not_one(self):
        # A legend may teach the whole vocabulary; what it may not do is leave
        # out a value its own rows carry. The claim is one way round on purpose.
        files = self.sheets(legend((WALKED, u"walked"), (HALF, u"half way"),
                                   (NOT_WALKED, u"not walked"), (GEAR, u"seam"))
                            + u"\n\n" + table(WALKED))
        self.assertEqual(anchors.legends(files)[0], 0)

    def test_two_sheets_spelling_the_half_mark_differently(self):
        files = self.sheets(legend((WALKED, u"walked"), (HALF, u"half way"))
                            + u"\n\n" + table(HALF),
                            legend((WALKED, u"walked"), (HALF, u"the server half passed"))
                            + u"\n\n" + table(HALF))
        problems, read, marks, spellings = anchors.legends(files)
        self.assertEqual((read, marks, spellings), (2, 2, {WALKED: 1, HALF: 2}))
        # One problem per sheet outside the biggest group, which is the number
        # of sheets left to edit rather than the number of spellings.
        self.assertEqual(problems, 1)

    def test_the_count_is_sheets_to_edit_and_not_spellings_to_choose_between(self):
        # Two sheets each, so the two readings of the count disagree for the
        # first time: *one per sheet outside the biggest group* is 2 and *one
        # per group after the first* is 1. The row above cannot tell them
        # apart - both give 1 when every group holds one sheet - which is why
        # the arithmetic needs a group with two sheets in it to be at risk at
        # all.
        files = self.sheets(
            legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n" + table(HALF),
            legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n" + table(HALF),
            legend((WALKED, u"walked"), (HALF, u"the server half passed"))
            + u"\n\n" + table(HALF),
            legend((WALKED, u"walked"), (HALF, u"the server half passed"))
            + u"\n\n" + table(HALF))
        problems, read, _, spellings = anchors.legends(files)
        self.assertEqual((read, spellings), (4, {WALKED: 1, HALF: 2}))
        self.assertEqual(problems, 2)

    def test_the_same_sentence_wrapped_differently_is_one_spelling(self):
        # The claim is that the sheets say the same sentence, not that they wrap
        # it in the same places: a sheet that rewraps a paragraph has not
        # redefined the mark, and an instrument that said so would go red for
        # every reflow.
        files = self.sheets(u"- **%s** walked\n- **%s** half way, and the row says which half\n"
                            % (WALKED, HALF) + u"\n" + table(HALF),
                            u"- **%s** walked\n- **%s** half way, and the row says\n  which half\n"
                            % (WALKED, HALF) + u"\n" + table(HALF))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (0, {WALKED: 1, HALF: 1}))

    def test_a_run_of_spaces_inside_one_line_is_the_same_spelling_too(self):
        # The row above rewraps the sentence across lines, which the joining of
        # stripped lines already handles on its own - so it leaves the
        # whitespace collapsing unproved, and a question that collapses nothing
        # passes it. The run has to be *inside* one line to be at risk: a
        # double space survives the strip, and a tab is whitespace a person
        # cannot see in the diff at all.
        files = self.sheets(
            legend((WALKED, u"walked"), (HALF, u"half way, and the row says which half"))
            + u"\n\n" + table(HALF),
            legend((WALKED, u"walked"),
                   (HALF, u"half  way, and the row\tsays which half"))
            + u"\n\n" + table(HALF))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (0, {WALKED: 1, HALF: 1}))

    def test_the_inline_register_is_a_legend_too(self):
        # Four sheets write the legend as one running sentence rather than as
        # four bullets, and the entry then ends at the next mark instead of at
        # the end of the line.
        files = self.sheets(u"the last column has four values - **%s** walked %s **%s** half way "
                            u"%s **%s** not walked\n\n"
                            % (WALKED, DOT, HALF, DOT, NOT_WALKED) + table(HALF),
                            legend((WALKED, u"walked"), (HALF, u"half way"))
                            + u"\n\n" + table(HALF))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings),
                         (0, {WALKED: 1, HALF: 1, NOT_WALKED: 1}))

    def test_a_block_that_defines_one_mark_and_no_other_is_not_a_legend(self):
        # The rule that tells the two apart, asserted from the failing side:
        # a legend lists the vocabulary, so one entry alone is a sentence. No
        # sheet in the store writes a one-entry legend, and the row below is
        # the reason the rule has to be this way round.
        files = self.sheets(u"- **%s** half way\n\n" % HALF + table(HALF))
        self.assertEqual(anchors.legends(files), (1, 1, 1, {}))

    def test_a_bold_mark_in_a_sentence_of_prose_is_not_a_legend_entry(self):
        # `11-user-accounts.md` writes `was **half** for a long time` forty
        # lines below its legend. A region that defines one mark and no other
        # is prose; a legend is where the vocabulary is listed.
        files = self.sheets(legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n"
                            + u"that row was **%s** for a long time and the reason was\n" % HALF
                            + u"the browser rather than the rule\n\n"
                            + table(WALKED, HALF))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (0, {WALKED: 1, HALF: 1}))

    def test_a_legend_quoted_inside_a_fence_is_not_a_legend(self):
        files = self.sheets(u"```\n" + legend((WALKED, u"walked"), (HALF, u"half way"))
                            + u"\n```\n\n" + table(HALF))
        # No legend at all, so the mark the table carries is undefined - and
        # the sheet is counted as one with no legend rather than passed over.
        problems, read, marks, _ = anchors.legends(files)
        self.assertEqual((problems, read, marks), (1, 1, 1))

    def test_a_mark_inside_a_fence_is_not_a_mark(self):
        files = self.sheets(legend((WALKED, u"walked")) + u"\n\n"
                            + u"```\n" + table(HALF) + u"\n```\n")
        self.assertEqual(anchors.legends(files), (0, 1, 0, {}))

    def test_the_mark_column_is_found_from_the_header_and_not_assumed_last(self):
        # A sheet heads the column with a tick or with the Thai for *result*,
        # and can put it anywhere in the row (#141).
        files = self.sheets(legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n"
                            + table(HALF, head=THAI_HEAD, first=True))
        self.assertEqual(anchors.legends(files), (0, 1, 1, {WALKED: 1, HALF: 1}))

    def test_a_table_with_no_mark_column_holds_no_marks(self):
        # A mutation table and a sweep table are tables in an acceptance sheet
        # and are not acceptance tables; counting their cells as marks is
        # counting by the wrong property (#174).
        files = self.sheets(legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n"
                            + u"| mutant | kills |\n|---|---|\n| a | %s |\n" % HALF)
        self.assertEqual(anchors.legends(files), (0, 1, 0, {WALKED: 1, HALF: 1}))

    def test_a_sheet_with_no_legend_and_no_mark_is_still_counted(self):
        # What it did not look at is part of the answer (#123): a sheet with
        # nothing to say about the marks is read and counted, not skipped.
        files = self.sheets(u"# a sheet with prose and nothing else\n")
        self.assertEqual(anchors.legends(files), (0, 1, 0, {}))

    def test_a_one_mark_block_at_the_end_of_a_file_is_prose_and_not_a_legend(self):
        # The same rule as the bullet above, at the one place it is written
        # twice: a block that runs to the end of the file is tested after the
        # loop rather than inside it, and nothing reached that copy, so a
        # sheet whose last line mentions a mark in passing could have been
        # read as defining it. The sheet is left with no legend at all, which
        # is what makes the row carrying the mark a problem.
        files = self.sheets(table(HALF) + u"\nthe row was **%s** for a long time" % HALF)
        problems, read, marks, spellings = anchors.legends(files)
        self.assertEqual((problems, read, marks, spellings), (1, 1, 1, {}))

    def test_the_walked_mark_is_held_too(self):
        # #157 held one mark of four and said so in its own docstring, which is
        # where this ticket's deferral lived until it reached the tracker
        # (#119). The three rows here are the same fixture as the half mark's,
        # one per mark, because a loop over one mark answers *clean* to all
        # three and no fixture of #157's could tell the difference.
        files = self.sheets(
            legend((WALKED, u"walked"), (HALF, u"half way")) + u"\n\n" + table(WALKED),
            legend((WALKED, u"walked by hand"), (HALF, u"half way"))
            + u"\n\n" + table(WALKED))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (1, {WALKED: 2, HALF: 1}))

    def test_the_gear_mark_is_held_too(self):
        files = self.sheets(
            legend((WALKED, u"walked"), (GEAR, u"the browser seam covers it"))
            + u"\n\n" + table(GEAR),
            legend((WALKED, u"walked"), (GEAR, u"the browser seam covers it, "
                                              u"and the drawing is still a walk"))
            + u"\n\n" + table(GEAR))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (1, {WALKED: 1, GEAR: 2}))

    def test_the_not_walked_mark_is_held_too(self):
        files = self.sheets(
            legend((WALKED, u"walked"), (NOT_WALKED, u"not walked"))
            + u"\n\n" + table(NOT_WALKED),
            legend((WALKED, u"walked"), (NOT_WALKED, u"not walked - the browser "
                                                     u"decides it and no request is made"))
            + u"\n\n" + table(NOT_WALKED))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (1, {WALKED: 1, NOT_WALKED: 2}))

    def test_one_sheet_outside_the_biggest_group_in_two_marks_is_two_problems(self):
        # The arithmetic the four marks make reachable for the first time: the
        # count is one problem per sheet *per mark*, so a sheet that words two
        # entries its own way is two sheets to edit and not one. Summing the
        # marks' counts and counting the sheets that differ at all disagree
        # here, and this is the only row where they do.
        agreed = legend((WALKED, u"walked"), (GEAR, u"the browser seam covers it"))
        files = self.sheets(agreed + u"\n\n" + table(WALKED, GEAR),
                            agreed + u"\n\n" + table(WALKED, GEAR),
                            legend((WALKED, u"walked by hand"),
                                   (GEAR, u"the browser seam covers it, and the "
                                          u"drawing is still a walk"))
                            + u"\n\n" + table(WALKED, GEAR))
        problems, _, _, spellings = anchors.legends(files)
        self.assertEqual((problems, spellings), (2, {WALKED: 2, GEAR: 2}))

    def test_the_real_sheets_define_every_mark_in_one_spelling(self):
        # The counts are asserted beside the problems: a question that found no
        # legend at all would pass on problems alone, which is an assertion
        # that cannot fail (#50).
        problems, read, marks, spellings = anchors.legends()
        self.assertEqual(problems, 0)
        self.assertGreaterEqual(read, 39)
        # Every sheet carries more than one mark, so this says the tables were
        # read and not merely the legends. The figure itself - 1,263 on 8
        # October 2569, which is the walk record's own total - is printed and
        # deliberately not pinned here: pinning it would make a hand-kept
        # number in a file that grows every ticket, and the floor it was
        # written as first was 23, which is the count of *one* of the four
        # marks and so a floor borrowed from another population (#174).
        self.assertGreater(marks, read)
        self.assertEqual(spellings, {WALKED: 1, HALF: 1, NOT_WALKED: 1, GEAR: 1})

    def test_the_walked_definition_says_the_http_seam_counts(self):
        # The one clause this question pins by its text, because its absence is
        # the defect #194 is about: twenty-eight sheets wrote a sentence that
        # was silent on what decides whether a row has left the walk queue, so
        # a walker reading only their own sheet could not tell whether its
        # marks meant a person had looked or `supertest` had. It is pinned here
        # and the gear mark's appearance half is not, for a reason that is
        # about this file and not about the claim: this one is writable in
        # ASCII and the other is Thai, and a fixture whose text the console
        # cannot print is a fixture nobody proofreads. The other half is held
        # by the sheets' own text, by #194 and by `docs/lessons.md`.
        sheets = sorted(glob.glob(os.path.join(
            anchors.ROOT, "docs", "acceptance", "*.md")))
        self.assertGreaterEqual(len(sheets), 39)
        for path in sheets:
            with io.open(path, encoding="utf-8") as handle:
                block = anchors._legend(handle.read().split("\n"))
            said = anchors._entry(block or [], WALKED)
            self.assertIsNotNone(said, os.path.basename(path))
            self.assertIn("seam HTTP", said, os.path.basename(path))


if __name__ == "__main__":
    unittest.main(verbosity=2)
