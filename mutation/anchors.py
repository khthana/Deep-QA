# -*- coding: utf-8 -*-
"""
Are the mutants still bound to code that exists?

    python mutation/anchors.py

A mutant is a string to find and a string to put in its place. When the file it
names is refactored the string it was written against goes, and the mutant stops
being a claim about anything: applying it answers MISS, which is neither a kill
nor a survivor. `mutation/README.md` says how the two read differently. What
matters here is that an acceptance sheet goes on citing that mutant by name in a
⚙ row, and nothing about the sheet looks wrong.

This is what #121 found three of and what #123 fixed. Run it before trusting
that the store's mutants are still worth anything.

## Why this is a file and not the one-liner it replaces

The one-liner in `mutation/README.md` read the whole `MUTANTS` dict with
`ast.literal_eval`, which is all-or-nothing: one entry built from a module
constant - `("screen", NEXT_PLAN, "]")` - and the call raises, the dict comes
back empty, and **every mutant in that file is skipped without a word**. It
printed `checked: 426` over a store of 471 and read as though the other 45 were
individually unreadable. Two whole files were missing - all 13 of `41` and all
7 of `43` - because each holds an entry the reader could not take: five of
them in `41` and one in `43`, which is the difference between what is
unreadable and what goes unread because of it.

It also skipped every multi-edit mutant, because those are a *list* of edits
rather than a tuple, and the guard asked for a tuple. That is another 25.

So: read the entries one at a time, resolve the module's own constants, and
count what could not be read out loud. A checker that cannot say how much it
did not look at is the same shape of claim as the numbers it exists to check.
"""

import ast
import glob
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

_UNREADABLE = object()


def _value(node, env):
    """The Python value of an expression, or `_UNREADABLE`.

    Handles what the mutation files actually use: literals, the module-level
    constants a few of them lift out (`NEXT_PLAN`, `ROLL_QUERY`), tuples and
    lists of those, and `+` between strings.
    """
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        return env.get(node.id, _UNREADABLE)
    if isinstance(node, (ast.Tuple, ast.List, ast.Set)):
        items = [_value(item, env) for item in node.elts]
        if any(item is _UNREADABLE for item in items):
            return _UNREADABLE
        if isinstance(node, ast.Tuple):
            return tuple(items)
        return set(items) if isinstance(node, ast.Set) else items
    if isinstance(node, ast.Dict):
        out = {}
        for key, value in zip(node.keys, node.values):
            k, v = _value(key, env), _value(value, env)
            if k is _UNREADABLE or v is _UNREADABLE:
                return _UNREADABLE
            out[k] = v
        return out
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left, right = _value(node.left, env), _value(node.right, env)
        if left is _UNREADABLE or right is _UNREADABLE:
            return _UNREADABLE
        try:
            return left + right
        except TypeError:
            return _UNREADABLE
    return _UNREADABLE


def _module(path):
    """(FILES, MUTANTS-as-AST, SUPERSEDED, env) for one mutation file."""
    tree = ast.parse(io.open(path, encoding="utf-8").read())
    env, files, mutants, superseded = {}, {}, None, set()
    for node in tree.body:
        if not isinstance(node, ast.Assign) or not isinstance(node.targets[0], ast.Name):
            continue
        name = node.targets[0].id
        if name == "MUTANTS":
            mutants = node.value
            continue
        value = _value(node.value, env)
        if value is _UNREADABLE:
            continue
        env[name] = value
        if name == "FILES":
            files = value
        if name == "SUPERSEDED":
            superseded = set(value)
    return files, mutants, superseded, env


def _edits(value):
    """The (key, old, ...) edits of one mutant, or None if it is not shaped like any.

    An edit needs at least a `FILES` key and a string to look for; a shorter
    tuple is not half an edit, it is something this cannot read, and saying so
    is the whole point of the `unreadable` count.
    """
    def whole(edit):
        return isinstance(edit, tuple) and len(edit) >= 2 and isinstance(edit[0], str)

    if whole(value):
        return [value]
    if isinstance(value, list) and value and all(whole(edit) for edit in value):
        return value
    return None


def check():
    total = checked = problems = unreadable = kept = 0
    source = {}
    for path in sorted(glob.glob(os.path.join(HERE, "*.py"))):
        if os.path.basename(path) in ("harness.py", "anchors.py"):
            continue
        short = os.path.relpath(path, ROOT).replace("\\", "/")
        files, mutants, superseded, env = _module(path)
        if mutants is None:
            # Said out loud rather than skipped. A mutation file whose MUTANTS
            # this cannot find holds an unknown number of unchecked claims, and
            # passing over it quietly is the failure this file was written
            # about.
            unreadable += 1
            print("NO READABLE MUTANTS %s" % short)
            continue
        names = set()
        for key_node, value_node in zip(mutants.keys, mutants.values):
            total += 1
            name = _value(key_node, env)
            names.add(name)
            value = _value(value_node, env)
            edits = _edits(value) if value is not _UNREADABLE else None
            if edits is None:
                unreadable += 1
                print("UNREADABLE %s %s" % (short, name))
                continue
            # Kept deliberately as a record of a claim proved against code that
            # has gone. Verified rather than trusted: if the anchor matches
            # again the mutant can be applied, and going on calling it
            # superseded would be quietly dropping a live one.
            record = name in superseded
            applicable = False
            for edit in edits:
                target = files.get(edit[0])
                if not target:
                    unreadable += 1
                    print("NO SUCH FILES KEY %s %s -> %r" % (short, name, edit[0]))
                    continue
                full = os.path.join(ROOT, target.replace("\\", "/"))
                if full not in source:
                    try:
                        source[full] = io.open(full, encoding="utf-8").read()
                    except OSError:
                        source[full] = None
                if source[full] is None:
                    # A source file the mutant names and the tree no longer has
                    # is the same finding as an anchor that moved, and has to
                    # come back as a count rather than as a traceback - a
                    # traceback stops the run and hides every file after it.
                    problems += 1
                    print("NO SUCH FILE %s %s -> %s" % (short, name, target))
                    continue
                found = source[full].count(edit[1])
                if record:
                    if found:
                        applicable = True
                        problems += 1
                        print("SUPERSEDED BUT APPLICABLE %s %s -> %d matches in %s"
                              % (short, name, found, target))
                    continue
                checked += 1
                if found != 1:
                    problems += 1
                    print("ANCHOR %s %s -> %d matches in %s" % (short, name, found, target))
            if record and not applicable:
                kept += 1
        for name in sorted(superseded - names):
            # A marker naming nothing. Harmless on its own, and exactly how a
            # live mutant would come to be skipped after a rename.
            problems += 1
            print("SUPERSEDED NAMES NO MUTANT %s %s" % (short, name))

    # Plain ASCII on purpose: this prints through a Windows console at cp874,
    # where a middle dot is a UnicodeEncodeError and the run dies after the
    # findings and before the count.
    print(
        "mutants %d | anchors checked %d | superseded on purpose %d | "
        "unreadable %d | problems %d" % (total, checked, kept, unreadable, problems)
    )
    # `unreadable` counts against the run for the reason the docstring gives: a
    # mutant this cannot read is one nobody is checking, and the last version of
    # this check reported those as though they did not exist.
    return 1 if (problems or unreadable) else 0


if __name__ == "__main__":
    sys.exit(check())
