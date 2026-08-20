# -*- coding: utf-8 -*-
"""
The mutation harness — save the files a set of mutants touches, break one of
them on purpose, run the suite, put everything back.

`docs/06-implementation-plan.md` says a row of an acceptance checklist may be
marked ⚙ — covered by the browser seam — only after a mutation test shows the
new assertion, that one and not an earlier one, failing when the code it is
about is broken. Without that step a green suite proves that the tests ran, not
that they would notice anything. These files are how that step was done, kept so
it can be done again rather than believed.

Usage, from anywhere:

    python mutation/18-program-subjects.py save
    python mutation/18-program-subjects.py nolimit
    cd e2e && npx playwright test 18b            # expect exactly one failure
    python mutation/18-program-subjects.py restore

`save` copies the untouched files into `mutation/.backup/` (gitignored). Every
`apply` restores first, so mutants never stack. `restore` puts everything back;
run it before committing, and check `git status` is clean of source files —
that is the only proof the tree is the tree again.

A mutant that answers MISS is not a failure of the code. It means the string it
was written against is no longer there: the file was refactored after the claim
was proved. Rewrite the mutant against what the code says now, and re-run it
before trusting the row it backs.
"""

import io
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BACKUP = os.path.join(HERE, ".backup")


def _path(files, key):
    return os.path.join(ROOT, files[key].replace("\\", "/"))


def _backup(files, key):
    # Named for the path, not for the key. Two of these files use `page` and
    # `form` for different screens and `client` for the same one, and a backup
    # keyed by the short name would let one script's restore write another
    # script's file.
    flat = files[key].replace("\\", "/").replace("/", "__")
    return os.path.join(BACKUP, flat + ".bak")


def save(files):
    os.makedirs(BACKUP, exist_ok=True)
    for key in files:
        shutil.copyfile(_path(files, key), _backup(files, key))
    print("saved %d files" % len(files))


def restore(files, quiet=False):
    missing = [key for key in files if not os.path.exists(_backup(files, key))]
    if missing:
        sys.exit("no backup for %s - run `save` first" % ", ".join(missing))
    for key in files:
        shutil.copyfile(_backup(files, key), _path(files, key))
    if not quiet:
        print("restored")


def apply(files, mutants, name):
    if name not in mutants:
        sys.exit("no mutant named %r; known: %s" % (name, ", ".join(sorted(mutants))))
    # Always from the untouched files, so two mutants cannot stack.
    restore(files, quiet=True)

    edits = mutants[name]
    # One mutant is usually one edit, but some are two: a change made in two
    # files at once is one decision, and reverting either half alone is not the
    # shape the code used to have.
    if isinstance(edits, tuple):
        edits = [edits]

    for key, old, new in edits:
        path = _path(files, key)
        text = io.open(path, encoding="utf-8").read()
        if text.count(old) != 1:
            restore(files, quiet=True)
            sys.exit(
                "MISS %s in %s - the string it was written against appears %d times.\n"
                "The file has been refactored since this mutant was proved; rewrite it."
                % (name, files[key], text.count(old))
            )
        io.open(path, "w", encoding="utf-8", newline="\n").write(text.replace(old, new, 1))
    print("applied %s (%d edit%s)" % (name, len(edits), "" if len(edits) == 1 else "s"))


def main(files, mutants):
    if len(sys.argv) != 2:
        sys.exit(
            "usage: %s save | restore | list | <mutant>\nknown: %s"
            % (os.path.basename(sys.argv[0]), ", ".join(sorted(mutants)))
        )
    verb = sys.argv[1]
    if verb == "save":
        save(files)
    elif verb == "restore":
        restore(files)
    elif verb == "list":
        for name in sorted(mutants):
            print(name)
    else:
        apply(files, mutants, verb)
