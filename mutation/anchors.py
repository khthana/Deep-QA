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

## The second question: does the documented command run the sheet's own spec?

Playwright matches a positional argument as a **regular expression against the
file's path**, so `21a` is `121a` as well. Not one of the sheets that had this
was written wrong; each was made wrong afterwards, by a `1xx` ticket adding a
spec whose number begins with an older sheet's, and none of those tickets
touched the sheet it broke. A documented command is a claim with an expiry date
and what expires it is a file somewhere else - which is why it needs counting
rather than remembering (#154, #158).

`commands()` reads every `playwright test` line in `mutation/*.py`,
`mutation/README.md`, `docs/acceptance/*.md` and `e2e/README.md` - the one file
outside those that writes a command down for somebody to run - and asks what
each argument runs today. Exactly one file is the only clean answer: two means a sweep read
off that command counts two sheets' rows as one, and none means the spec has
been renamed out from under the sheet.

**What it does not look at**, so that nobody reads a clean run as more than it
is: a command wrapped onto a second line, of which it sees the first line only -
so write one on one line; a spec named in prose (*row 3 of `21a`*) is a name rather than a command, and
there are hundreds of those; `docs/lessons.md` and `docs/handoff/` are narrative,
where a command written the wrong way is sometimes quoted on purpose - the #154
story quotes `npx playwright test 51a` as the defect it is about. The count of
tokens it skipped as flags and their values is printed beside the findings.
"""

import ast
import glob
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHEET = re.compile(r"^\d+-[\w-]+\.py$")

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
    # A literal that is added to afterwards is read short by exactly what was
    # added, and says nothing - the empty literal's blind spot with a non-zero
    # count in front of it (#149). Anything but reading MUTANTS makes the sheet
    # unreadable rather than counted.
    assigned = 0
    for node in ast.walk(tree):
        if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
            targets = node.targets if isinstance(node, ast.Assign) else [node.target]
            for target in targets:
                if isinstance(target, ast.Name) and target.id == "MUTANTS":
                    assigned += 1
                if (isinstance(target, ast.Subscript) and isinstance(target.value, ast.Name)
                        and target.value.id == "MUTANTS"):
                    assigned += 2
        if (isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name)
                and node.value.id == "MUTANTS"):
            assigned += 2
    if assigned > 1:
        mutants = None
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
        # A sheet is named for its ticket - `124-users-template-sample.py`. The
        # tooling beside them is not, and `harness_test.py` holds a `MUTANTS`
        # fixture that a list of names to skip would have counted as three real
        # mutants the first time somebody forgot to extend it (#126).
        if not SHEET.match(os.path.basename(path)):
            continue
        short = os.path.relpath(path, ROOT).replace("\\", "/")
        files, mutants, superseded, env = _module(path)
        # An empty literal is the same finding as a missing one: a sheet that
        # writes `MUTANTS = {}` and fills it in a loop read as zero mutants and
        # zero problems, and the total simply did not move (#149).
        if not isinstance(mutants, ast.Dict) or not mutants.keys:
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


COMMAND = re.compile(r"playwright test\b(.*)")
# Everything after the arguments on a documented line: a comment saying what to
# expect, the next command, the end of a markdown span. The first census of this
# had no such stop and read `expect`, `exactly` and `the` as spec filters.
UNTIL = re.compile(r"#|&&|\|\||;|`|\)")


def _tokens(line):
    """Everything one documented `playwright test` line passes to Playwright."""
    found = COMMAND.search(line)
    if not found:
        return []
    return UNTIL.split(found.group(1), 1)[0].split()


def arguments(line):
    """The positional file filters of one documented `playwright test` line.

    Flags, their attached values (`--reporter=line`), their quoted ones
    (`--grep "Departments.js"`) and a placeholder standing for an argument
    (`tests/<sheet>`) are not file filters and are not returned; `commands()`
    counts them, because a checker that passes over things silently is the
    failure this file was written about. `commands()` calls this rather than
    holding a second copy of it - two places holding one opinion is a claim
    neither of them can be shown to hold (#97).
    """
    return [token for token in _tokens(line) if _positional(token)]


def _positional(token):
    if token.startswith("-") or "=" in token or token[:1] in ("'", '"'):
        return False
    return "<" not in token and ">" not in token


def runs(argument, specs):
    """The spec paths one argument runs, or None if it is not a regex.

    Playwright compiles the argument and searches it against the file's path,
    so this does the same rather than comparing prefixes: `21a-` looks like it
    names `21a-rubrics` and matches `121a-grants-notice-in-view` as well.
    """
    try:
        pattern = re.compile(argument)
    except re.error:
        return None
    return sorted(path for path in specs if pattern.search(path))


def _store():
    """(spec paths, documented files) of this repository, or (None, files).

    Everything in `mutation/` and `docs/acceptance/`, plus `e2e/README.md`,
    which is the one file outside them that writes a command down for somebody
    to run. Two kinds are left out because they write one down in order to talk
    about it: a `*_test.py`, where a colliding argument is the fixture (`21a`
    is asserted on purpose two files away), and this one, which quotes the
    defect in its own docstring and holds the pattern that finds it. Both are
    counted out loud, because a tool that skips by name lies the day somebody
    adds a file (#126).

    The spec list is `None` when there is no `e2e/tests` to compare against -
    which is neither clean nor dirty but *could not ask*, and folding that into
    either of the other two is the mistake #159 is about.
    """
    tests = os.path.join(ROOT, "e2e", "tests")
    specs = None
    if os.path.isdir(tests):
        specs = ["tests/" + name for name in sorted(os.listdir(tests))
                 if name.endswith(".spec.js") or name.endswith(".test.js")]
    found = sorted(glob.glob(os.path.join(HERE, "*.py")) + glob.glob(os.path.join(HERE, "*.md")))
    found += sorted(glob.glob(os.path.join(ROOT, "docs", "acceptance", "*.md")))
    found += [os.path.join(ROOT, "e2e", "README.md")]
    return specs, [path for path in found
                   if os.path.exists(path)
                   and not path.endswith("_test.py") and not _is_this_file(path)]


def _is_this_file(path):
    return os.path.abspath(path) == os.path.abspath(__file__)


def commands(specs=None, files=None):
    """(problems, arguments checked, tokens skipped) over the documented commands."""
    if specs is None or files is None:
        specs, files = _store()
        print("commands: reading %d files of mutation/, docs/acceptance/ and e2e/README.md, "
              "excluding %d test file(s) and this one"
              % (len(files), len(glob.glob(os.path.join(HERE, "*_test.py")))))
        if specs is None:
            print("CANNOT ASK: no e2e/tests directory, so no command was resolved")
            return 1, 0, 0
    problems = checked = skipped = 0
    for path in files:
        short = os.path.relpath(path, ROOT).replace("\\", "/")
        with io.open(path, encoding="utf-8") as handle:
            text = handle.read()
        for number, line in enumerate(text.split("\n"), 1):
            wanted = arguments(line)
            skipped += len(_tokens(line)) - len(wanted)
            for token in wanted:
                checked += 1
                hit = runs(token, specs)
                if hit is None:
                    problems += 1
                    print("NOT A REGEX %s:%d -> %r" % (short, number, token))
                elif not hit:
                    problems += 1
                    print("RUNS NOTHING %s:%d -> %r" % (short, number, token))
                elif len(hit) > 1:
                    problems += 1
                    print("RUNS %d FILES %s:%d -> %r -> %s"
                          % (len(hit), short, number, token, " ".join(hit)))
    print("commands: arguments %d | flags, values and placeholders skipped %d | problems %d"
          % (checked, skipped, problems))
    return problems, checked, skipped


if __name__ == "__main__":
    misanchored = check()
    undocumented = commands()[0]
    sys.exit(1 if (misanchored or undocumented) else 0)
