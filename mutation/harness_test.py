# -*- coding: utf-8 -*-
"""
What `harness.py` promises about the tree, asserted - #126.

The harness is the only thing standing behind every ⚙ in `docs/acceptance/`, and
until #126 it was also the only thing in this repository that could rewrite a
file nobody had pointed it at. That defect was invisible for a reason worth
keeping in mind while reading these: **every path through it prints something
reassuring**. `apply` says `applied nobom (1 edit)` whether or not it has just
reverted two unrelated files to August, because the restore it does first is
`quiet=True`. So the assertions below are mostly about what is *on disk*
afterwards, not about what was printed.

Run:

    python mutation/harness_test.py

stdlib `unittest` on purpose - this store has no Python test runner and one
tool's tests are not a reason to acquire one. `ROOT` and `BACKUP` are pointed at
a temporary directory for each test, so nothing here can touch the repository
even when it fails.
"""

import io
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import harness  # noqa: E402


FILES = {"page": "frontend/src/pages/Thing.js", "lib": "backend/lib/thing.js"}
MUTANTS = {
    "onlyone": ("page", "the claim", "not the claim"),
    "bothfiles": [
        ("page", "the claim", "not the claim"),
        ("lib", "the rule", "not the rule"),
    ],
    "gone": ("page", "a string no longer in the file", "anything"),
    "secondmisses": [
        ("page", "the claim", "not the claim"),
        ("lib", "a string no longer in the file", "anything"),
    ],
}


def read(path):
    with io.open(path, encoding="utf-8") as handle:
        return handle.read()


def write(path, text):
    parent = os.path.dirname(path)
    if not os.path.isdir(parent):
        os.makedirs(parent)
    with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


class HarnessCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.root = os.path.join(self.tmp, "tree")
        self.addCleanup(shutil.rmtree, self.tmp, True)

        self.previous = (harness.ROOT, harness.BACKUP)
        harness.ROOT = self.root
        harness.BACKUP = os.path.join(self.tmp, ".backup")
        self.addCleanup(self.restore_module)

        write(self.path("page"), "before the claim after\n")
        write(self.path("lib"), "before the rule after\n")

    def restore_module(self):
        harness.ROOT, harness.BACKUP = self.previous

    def path(self, key):
        return os.path.join(self.root, FILES[key].replace("/", os.sep))

    def contents(self):
        return {key: read(self.path(key)) for key in FILES}

    def refusal(self, verb, **kwargs):
        """Run a verb that is expected to `sys.exit` with a message, and return it."""
        with self.assertRaises(SystemExit) as caught:
            if verb == "restore":
                harness.restore(FILES, **kwargs)
            elif verb == "save":
                harness.save(FILES, **kwargs)
            else:
                harness.apply(FILES, MUTANTS, verb, **kwargs)
        message = caught.exception.code
        self.assertIsInstance(message, str, "expected a message, got exit code %r" % message)
        return message

    # ---------------------------------------------------------- the normal path

    def test_save_then_apply_then_restore(self):
        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")
        self.assertIn("not the claim", read(self.path("page")))
        self.assertIn("the rule", read(self.path("lib")))

        harness.restore(FILES)
        self.assertEqual(self.contents(), {
            "page": "before the claim after\n",
            "lib": "before the rule after\n",
        })

    def test_a_second_apply_replaces_the_first_rather_than_stacking(self):
        # The reason `apply` restores at all. A mutant left on disk by this
        # harness is a state it put there, so it may overwrite it without asking.
        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")
        harness.apply(FILES, MUTANTS, "bothfiles")
        self.assertIn("not the claim", read(self.path("page")))
        self.assertIn("not the rule", read(self.path("lib")))
        self.assertNotIn("not the claim after", read(self.path("page")).replace("not the claim", "x"))

    # ------------------------------------------------------------------- #126

    def test_apply_refuses_when_the_tree_moved_since_save(self):
        # #124's bite, in miniature: a backup taken before an edit, a clean tree
        # holding the edit, and a mutant that has nothing to do with either.
        harness.save(FILES)
        write(self.path("lib"), "before the rule after, and a fix landed since\n")
        before = self.contents()

        message = self.refusal("onlyone")

        self.assertIn(FILES["lib"], message)
        self.assertIn("save", message)
        self.assertEqual(self.contents(), before, "the tree was rewritten by a run that refused")

    def test_restore_refuses_for_the_same_reason(self):
        # The ticket is written about `apply`, because that is where it bit. The
        # hazard is `restore`'s, and a person running it deliberately is no more
        # able to see a three-week-old backup than one running it by accident.
        harness.save(FILES)
        write(self.path("lib"), "before the rule after, and a fix landed since\n")
        before = self.contents()

        message = self.refusal("restore")

        self.assertIn(FILES["lib"], message)
        self.assertEqual(self.contents(), before)

    def test_the_refusal_names_every_file_it_is_about(self):
        harness.save(FILES)
        write(self.path("page"), "before the claim after, edited\n")
        write(self.path("lib"), "before the rule after, edited\n")

        message = self.refusal("onlyone")

        self.assertIn(FILES["page"], message)
        self.assertIn(FILES["lib"], message)

    def test_force_overwrites_anyway(self):
        # An escape hatch that has to be typed. Without one the answer to a
        # refusal is `rm -rf mutation/.backup`, which is worse than the defect.
        harness.save(FILES)
        write(self.path("lib"), "before the rule after, and a fix landed since\n")

        harness.restore(FILES, force=True)

        self.assertEqual(read(self.path("lib")), "before the rule after\n")

    def test_save_makes_the_tree_the_truth_again(self):
        harness.save(FILES)
        write(self.path("lib"), "before the rule after, and a fix landed since\n")
        self.refusal("onlyone")

        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")

        self.assertIn("and a fix landed since", read(self.path("lib")))

    def test_a_mutant_applied_by_another_script_does_not_excuse_a_third_file(self):
        # The state the harness keeps is per path, not a flag saying "a mutant is
        # out there" - otherwise one applied mutant would wave every other file
        # through, which is the defect with an extra step.
        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")
        write(self.path("lib"), "before the rule after, edited by hand\n")
        before = self.contents()

        message = self.refusal("bothfiles")

        self.assertIn(FILES["lib"], message)
        self.assertNotIn(FILES["page"], message)
        self.assertEqual(self.contents(), before)

    def test_restoring_one_script_leaves_another_scripts_mutant_recorded(self):
        # `mutation/.backup/` is one store keyed by path and two scripts share an
        # entry for a shared file - the correction #124 made to the README. The
        # record has to be shared the same way, so restoring one script's files
        # must not make another script's applied mutant look unexplained.
        other = {"lib": FILES["lib"]}
        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")          # mutates page
        harness.restore(other)                            # a different script's FILES

        harness.apply(FILES, MUTANTS, "bothfiles")        # must not refuse over page
        self.assertIn("not the claim", read(self.path("page")))

    # --------------------------------- what /code-review found in the #126 fix

    def test_a_miss_on_the_second_edit_still_says_MISS_and_undoes_the_first(self):
        """The regression the guard introduced, and the worst kind it could.

        `apply` writes its edits in a loop and used to record them all after it.
        So a two-edit mutant whose second edit misses left the first on disk,
        unrecorded - and the restore that MISS does then met a file it could not
        explain, refused, and returned #126's message about a stale backup for a
        mutant that had simply moved. The operator is told the wrong thing and
        the file is left mutated: the defect this ticket is about, produced by
        the fix for it. 25 mutants across four sheets are written as lists.
        """
        harness.save(FILES)
        message = self.refusal("secondmisses")
        self.assertIn("MISS", message)
        self.assertEqual(self.contents(), {
            "page": "before the claim after\n",
            "lib": "before the rule after\n",
        })

    def test_a_record_that_is_not_an_object_is_treated_as_no_record(self):
        # `_applied` caught a file that will not parse but not a file that parses
        # to the wrong shape, and `.get`/`.pop` on a list raises where the whole
        # point of the try is to carry on without a record.
        harness.save(FILES)
        write(os.path.join(harness.BACKUP, "applied.json"), "[]")
        harness.apply(FILES, MUTANTS, "onlyone")
        self.assertIn("not the claim", read(self.path("page")))

    def test_a_file_missing_from_the_tree_is_put_back_rather_than_crashing(self):
        # Before #126 `restore` simply wrote it out again. Digesting the tree
        # copy first turned that into a traceback.
        harness.save(FILES)
        os.remove(self.path("lib"))
        harness.restore(FILES)
        self.assertEqual(read(self.path("lib")), "before the rule after\n")

    def test_save_refuses_to_write_a_live_mutant_into_the_backup(self):
        """The other end of the same defect - #33's, which the README records.

        The guard protects the tree from the backup. Nothing protected the
        backup from the tree: `save` over an applied mutant makes the mutant the
        saved truth, and the next `restore` then makes it permanent. This is how
        a wrong backup gets made in the first place, and after this ticket the
        harness is the one thing that knows a mutant is out there.
        """
        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")

        message = self.refusal("save")

        self.assertIn(FILES["page"], message)
        self.assertIn("restore", message)
        harness.restore(FILES)
        self.assertEqual(read(self.path("page")), "before the claim after\n")

    def test_save_force_still_writes_whatever_is_there(self):
        harness.save(FILES)
        harness.apply(FILES, MUTANTS, "onlyone")
        harness.save(FILES, force=True)
        harness.restore(FILES)
        self.assertIn("not the claim", read(self.path("page")))


    # ------------------------------------------- what was already true, kept true

    def test_a_missing_backup_still_says_run_save_first(self):
        message = self.refusal("restore")
        self.assertIn("save", message)

    def test_a_miss_still_restores_and_says_so(self):
        harness.save(FILES)
        message = self.refusal("gone")
        self.assertIn("MISS", message)
        self.assertEqual(read(self.path("page")), "before the claim after\n")

    def test_an_unknown_mutant_is_refused_before_anything_is_touched(self):
        harness.save(FILES)
        message = self.refusal("nosuchmutant")
        self.assertIn("nosuchmutant", message)


if __name__ == "__main__":
    unittest.main(verbosity=2)
