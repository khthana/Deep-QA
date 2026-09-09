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

That restore-first is also how this tool used to destroy work — #126. It writes
every file in `FILES`, and until that ticket nothing asked whether the backup it
was writing was a copy of the tree. `mutation/.backup/` is one store for the
whole repository, keyed by path, so an entry can be weeks old and left by a
script this session never ran; a mutant run without `save` reverted two files the
mutant does not touch and printed `applied` over it. The refusal is now the
tool's rather than the README's, and it turns on one question: **is what is on
disk either the backup or a mutant this harness put there?** If it is neither,
nothing is written and the files are named. `save` when the tree is what you want
to keep, or `--force` when it truly is not.

A mutant that answers MISS is not a failure of the code. It means the string it
was written against is no longer there: the file was refactored after the claim
was proved. Rewrite the mutant against what the code says now, and re-run it
before trusting the row it backs.
"""

import hashlib
import io
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BACKUP = os.path.join(HERE, ".backup")


def _path(files, key):
    return os.path.join(ROOT, files[key].replace("\\", "/"))


def _flat(files, key):
    """The name a path is known by in the shared stores - the path, slashes forward.

    Both stores in `mutation/.backup/` are keyed off this: the copies, and the
    record of what `apply` last wrote. They have to agree, so they read it here.
    """
    return files[key].replace("\\", "/")


def _backup(files, key):
    # Named for the path, not for the key. Two of these files use `page` and
    # `form` for different screens and `client` for the same one, and a backup
    # keyed by the short name would let one script's restore write another
    # script's file.
    return os.path.join(BACKUP, _flat(files, key).replace("/", "__") + ".bak")


def _digest(path):
    with io.open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def _applied():
    """What this harness has left on disk: {path: digest of the mutated file}.

    Kept beside the backups because it answers a question about them, and shared
    across scripts for the same reason the backups are - two scripts naming one
    path are talking about one file.
    """
    try:
        with io.open(os.path.join(BACKUP, "applied.json"), encoding="utf-8") as handle:
            record = json.loads(handle.read())
    except (IOError, OSError, ValueError):
        return {}
    # Parsing is not the only way a file can be the wrong thing. `[]` reads
    # perfectly and then raises on `.get`, in a function whose whole purpose is
    # to carry on when there is no usable record.
    return record if isinstance(record, dict) else {}


def _remember(applied):
    os.makedirs(BACKUP, exist_ok=True)
    path = os.path.join(BACKUP, "applied.json")
    with io.open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(applied, indent=2, sort_keys=True))


def _forget(files):
    """Drop the record for these paths only - another script's mutant is not ours."""
    applied = _applied()
    for key in files:
        applied.pop(_flat(files, key), None)
    _remember(applied)


def _unexplained(files):
    """The files on disk that are neither the backup nor a mutant this tool applied.

    Those are the two states `restore` may overwrite without asking. Anything
    else is somebody's work, and this tool has no way to tell whose - a stale
    backup and a fresh edit look identical from here, which is why the answer is
    to stop rather than to guess.
    """
    applied = _applied()
    out = []
    for key in files:
        backup, here = _backup(files, key), _path(files, key)
        if not os.path.exists(backup) or not os.path.exists(here):
            # A missing backup is `restore`'s to report, with its own advice. A
            # file missing from the tree is what `restore` is *for*: before this
            # ticket it simply wrote it out again, and digesting it first would
            # turn that into a traceback.
            continue
        digest = _digest(here)
        if digest == _digest(backup):
            continue
        if applied.get(_flat(files, key)) == digest:
            continue
        out.append(files[key])
    return out


def _mutated(files):
    """The files this harness has a mutant recorded against, still on disk."""
    applied = _applied()
    return [
        files[key]
        for key in files
        if os.path.exists(_path(files, key))
        and applied.get(_flat(files, key)) == _digest(_path(files, key))
    ]


def save(files, force=False):
    # The other end of #126, and #33's round: the guard below protects the tree
    # from the backup, and nothing protected the backup from the tree. `save`
    # over an applied mutant makes the mutant the saved truth, and the next
    # `restore` makes it permanent - which is how a wrong backup gets made in
    # the first place. After this ticket the harness is the one thing that knows
    # a mutant is out there, so it is the one thing that can say so.
    live = [] if force else _mutated(files)
    if live:
        sys.exit(
            "refusing to save %d file%s that still hold%s a mutant:\n"
            "  %s\n"
            "Saving now would make the mutant the copy everything is restored\n"
            "from. Run `restore` first, or `--force` if the mutation really is\n"
            "what you mean to keep. #126."
            % (len(live), "" if len(live) == 1 else "s", "s" if len(live) == 1 else "",
               "\n  ".join(live))
        )

    os.makedirs(BACKUP, exist_ok=True)
    for key in files:
        shutil.copyfile(_path(files, key), _backup(files, key))
    # The tree is the truth again, so nothing on disk is a mutant of ours.
    _forget(files)
    print("saved %d files" % len(files))


def restore(files, quiet=False, force=False):
    missing = [key for key in files if not os.path.exists(_backup(files, key))]
    if missing:
        sys.exit("no backup for %s - run `save` first" % ", ".join(missing))

    stale = [] if force else _unexplained(files)
    if stale:
        sys.exit(
            "refusing to overwrite %d file%s the backup is not a copy of:\n"
            "  %s\n"
            "What is on disk is neither the saved file nor a mutant this harness\n"
            "applied, so restoring would throw away work nothing here can name.\n"
            "Either the tree has moved since the last `save`, or a run was\n"
            "interrupted and a mutant was undone by hand.\n"
            "Run `save` if the tree is what you want to keep, or re-run with\n"
            "`--force` to overwrite it. #126."
            % (len(stale), "" if len(stale) == 1 else "s", "\n  ".join(stale))
        )

    for key in files:
        shutil.copyfile(_backup(files, key), _path(files, key))
    _forget(files)
    if not quiet:
        print("restored")


def apply(files, mutants, name, force=False):
    if name not in mutants:
        sys.exit("no mutant named %r; known: %s" % (name, ", ".join(sorted(mutants))))
    # Always from the untouched files, so two mutants cannot stack. This is the
    # line #126 is about: it runs quietly, on every apply, whether or not the
    # backup it reads has anything to do with the tree it is writing over.
    restore(files, quiet=True, force=force)

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
            # Undoing the edits already made, which is why each was recorded as
            # it was written rather than all of them at the end: an unrecorded
            # mutant here would meet the guard below, and the operator would be
            # told a stale-backup story about a mutant that had merely moved -
            # with the file left mutated. 25 mutants are written as lists.
            restore(files, quiet=True)
            sys.exit(
                "MISS %s in %s - the string it was written against appears %d times.\n"
                "The file has been refactored since this mutant was proved; rewrite it."
                % (name, files[key], text.count(old))
            )
        io.open(path, "w", encoding="utf-8", newline="\n").write(text.replace(old, new, 1))

        # Written down so the next `restore` can tell this from somebody's work.
        applied = _applied()
        applied[_flat(files, key)] = _digest(path)
        _remember(applied)

    print("applied %s (%d edit%s)" % (name, len(edits), "" if len(edits) == 1 else "s"))


def main(files, mutants):
    argv = [arg for arg in sys.argv[1:] if arg != "--force"]
    force = "--force" in sys.argv[1:]
    if len(argv) != 1:
        sys.exit(
            "usage: %s save | restore | list | <mutant> [--force]\nknown: %s"
            % (os.path.basename(sys.argv[0]), ", ".join(sorted(mutants)))
        )
    verb = argv[0]
    if verb == "save":
        save(files, force=force)
    elif verb == "restore":
        restore(files, force=force)
    elif verb == "list":
        for name in sorted(mutants):
            print(name)
    else:
        apply(files, mutants, verb, force=force)
