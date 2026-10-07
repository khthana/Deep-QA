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

## The third question: does every row have as many cells as its own header?

A row with one `|` too many is **six cells in a five-column table**. Markdown
draws the first five, so the mark column draws the blank that was pushed into it
and the mark itself lands in a sixth cell nobody renders. Seven rows were doing
this when #79 counted them, and the walk queue is counted off that column: **a
mark that is written is not a mark that is read**. All seven hid a ☑, so the
queue was never wrong - but nothing stops the next one hiding a ◐, and that is
what this exists for (#172).

`columns()` counts the cells of every row against the header of its own table,
the way the renderer splits them: on every `|` that is not escaped, inside code
spans as well, because that is what GitHub does with a row before it looks at
anything else. It read the same store as `commands()` until #175, which is a
census of the wrong property - the store is *where a command is written down* and
the species here is *what renders a table* - and that boundary hid nine rows in
`docs/03` and `docs/05`. It reads `markdown()` now.

**What it does not look at**: a table written in HTML rather than in pipes; a row
wrapped onto a second line, which it reads as two rows and neither matches; the
*contents* of a cell, so a mark in the wrong column of a table whose width is
right is still invisible to it; and the trees `markdown()` leaves out - the five
names and whatever git ignores - which the run prints rather than keeps to itself. Lines inside a fenced block are skipped and
counted out loud, because a fence is where a sheet quotes a broken row on purpose.

## The fourth question: does the document know about every file there is?

The three questions above all walk a list of files and ask something of each.
None of them asks whether `mutation/README.md` knows that list. On 29 September
2569 its file table summed to exactly the 801 it claimed - nothing inside the
document disagreed with anything else in it - while this file counted 822. Six
sheets had never been added to the table at all, twenty-one mutants between
them, and **what is missing from a table is invisible to a sum over it**: the
standing rule was *count the table rather than trusting the figure*, and
counting the table gives a confident wrong answer in exactly this case (#58).

`catalogue()` compares the directory with the document rather than the document
with itself, and answers four things apart: a sheet the table does not name, a
row naming a sheet that is gone, a row whose count is not the number of entries
in that sheet's `MUTANTS`, and the stated total against the sum of the rows.
The third is what makes the fourth mean anything - with every row checked
against its own file, the total stops being a number somebody remembered to
change. It calls `sheets()`, the same list `check()` walks, so a file added
tomorrow is in both or in neither (#126).

**What it does not look at**: whether a row's *description* still describes its
sheet, which is prose and is nobody's to count; a second table of files, if one
is ever written, since it finds rows by their shape and would read both as one;
and a sheet whose `MUTANTS` it cannot read, where it says so rather than
comparing the row against a zero that is the sheet's fault and not the table's.
The total it reads is the first bold integer after the last row, so a bold
number written into a paragraph between the two would be taken for the total -
the table is the anchor there, and moving the figure away from it is the one
edit that can fool this question.

## The fifth question: does a citation still name something that is there?

A mutation row says which assertion died, and for most of the store it says so
with a **line number** into a spec file that grows every ticket. #81 edited one
row of `e2e/tests/10a-shell.spec.js`; `docs/acceptance/10-application-shell.md`
cited eight numbers into that file and not one of them landed on the assertion
it named. The distances were unequal - the file had grown above them and in the
middle - so there was no offset that fixed the table, and the numbers had to be
measured one at a time. The same table's citation into `11a` was still correct,
which is why this answers three things and not two: folding *moved* into
*cannot be checked* sends somebody hunting a number that is not wrong (#159,
#173).

`citations()` reads one shape, and it is the store's own idiom for a place in a
file with the one difference that matters - a string to find where the number
used to be:

    `10a:the second window, before the session ends`
    `11a-users-refusals.spec.js:expect(response.status()).toBe(403)`

The token before the colon resolves against `e2e/tests` as a **substring**,
the way Playwright matches a command's argument and the way `runs()` already
does it one question above - a glob anchored at the start of the basename says
one file where the real rule says two, and `22a` is a token this store cites
today for which the two answers differ. Exactly one file is the only clean
answer. Everything after it is searched for in that file: found is clean,
absent is a problem, and a token that names no file or two is a problem. A
citation whose needle is **all digits** is counted and never checked, because a
line number cannot be checked for the thing anybody wants to know - that the
line exists is not the question, and answering the easy half would be the same
mistake the sheets made.

**What it does not look at**, and the counts it prints instead: a citation by
number in any of the three spellings the sheets write one in, which it counts
and splits by what the number points into, because the summed figure is the
tool's and not the sheets' - a path into `e2e/tests` is this question's own
species left unconverted, a path into source is `57-pager.md`'s register of
guard sites and points at code rather than at an assertion, and a bare number
is one that nothing in its cell resolves. A name written in prose or in italics
rather than in this shape: the sheets italicise a UI word, an emphasis and an
assertion's name alike, and a rule that read all three as citations answered
*gone* for four prose phrases out of six findings when it was tried. Whether
the string it found is in an assertion at all rather than in a comment above
one. And whether that assertion is the one the mutant kills, which no static
reading can say and only a sweep can - this question is that a citation still
points somewhere, not that it points at the right thing.
"""

import ast
import glob
import io
import os
import re
import subprocess
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
    with io.open(path, encoding="utf-8") as handle:
        tree = ast.parse(handle.read())
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


def sheets():
    """Every mutation sheet in the store, asked of the directory.

    A sheet is named for its ticket - `124-users-template-sample.py`. The
    tooling beside them is not, and `harness_test.py` holds a `MUTANTS` fixture
    that a list of names to skip would have counted as three real mutants the
    first time somebody forgot to extend it (#126). Both questions that need
    this list call it rather than writing the pattern twice (#97).
    """
    return [path for path in sorted(glob.glob(os.path.join(HERE, "*.py")))
            if SHEET.match(os.path.basename(path))]


def check():
    total = checked = problems = unreadable = kept = 0
    source = {}
    for path in sheets():
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


# The edge between two cells: a `|` the row did not escape, because `\|` is a
# character the renderer draws inside the cell rather than the end of one.
EDGE = re.compile(r"(?<!\\)\|")
# A rule is a line made of nothing but pipes, colons, hyphens and space.
RULE = re.compile(r"[\s:|-]+")


def _cells(line):
    """The cells one table row renders as, split the way the renderer splits it."""
    body = line.strip()
    if body.startswith("|"):
        body = body[1:]
    if body.endswith("|"):
        body = body[:-1]
    return EDGE.split(body)


def _is_rule(line):
    """Is this the `|---|---|` under a header?"""
    return bool(RULE.fullmatch(line)) and "-" in line


NOT_OURS = ("node_modules", ".git", "_local", "DEEP-QA-BACKEND", "DEEP-QA-FRONTEND")

# What is on disk and not in the repository, asked of git rather than listed
# here. `--others --ignored` is the pair that means *ignored and untracked*, and
# `--directory` collapses an ignored tree to its own line instead of printing
# every file under it.
#
# `-z` is here for Thai rather than for newlines in filenames: without it git
# prints any path holding a byte above 127 quoted and octal-escaped, which no
# comparison below could ever match, and this repository's documents are
# written in Thai. Measured in a throwaway repository on 4 October 2569, after
# the review of #186 asked - the fix was latent only because all fifteen
# ignored paths here are ASCII today, which is #126's shape one layer down.
#
# `check-ignore`, which #186 proposed, is a different answer and not only a
# different spelling: it would also prune a document that is tracked *and*
# ignored, which is a document somebody added on purpose and whose rows are
# ours to fix. It is also one call per path rather than one call.
CATALOGUE = ("git", "ls-files", "--others", "--ignored", "--exclude-standard",
             "--directory", "-z")


def ignored(root=None):
    """`(paths, could_not_ask)` - what the catalogue says is not this repository's.

    The paths are relative to `root`, slashes forward, and an ignored tree ends
    in one, which is how git prints them under `-z` - raw bytes, no quoting. `could_not_ask` is the third answer
    (#159): on the day there is no git to ask, this says so in a sentence
    instead of handing back an empty set that reads like *nothing is ignored*.
    """
    root = ROOT if root is None else root
    try:
        answer = subprocess.run(CATALOGUE, cwd=root, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=30)
    except subprocess.TimeoutExpired:
        # Its own answer and not an `OSError`: a git that hangs would otherwise
        # hang the closing-time run with nothing printed.
        return frozenset(), "git did not answer within 30s"
    except OSError as refusal:
        return frozenset(), "git could not be run (%s)" % refusal
    if answer.returncode != 0:
        said = answer.stderr.decode("utf-8", "replace").strip().split("\n")
        return frozenset(), "git refused (%s)" % (said[0] or "exit %d" % answer.returncode)
    printed = answer.stdout.decode("utf-8", "replace").split("\0")
    return frozenset(line for line in printed if line), None


def markdown(root=None, theirs=None):
    """Every markdown file this repository owns, asked of the tree.

    The question below is about *rendering*, which has nothing to do with where
    a command is written down, and while it shared `_store()` it could not see
    nine broken rows in `docs/03` and `docs/05` - a legend of Mermaid symbols
    among them, each one a `|` inside a code span, and so the one table that
    could not show the symbols it exists to explain (#175).

    `NOT_OURS` is the five names whose rows nobody here may fix: two are somebody
    else's package, `_local` is not in the repository at all, and the `DEEP-QA-*`
    pair is the student implementation as delivered - read-only reference, deleted
    when the rebuild completes. A check that reported those could only be silenced
    by ignoring the check.

    The five names were the whole answer until #186, which is the shape #126
    warns about: `e2e/test-results/` is ignored in `e2e/.gitignore` and named
    nowhere here, so playwright's `error-context.md` - one file per row that
    died - walked straight in, and the corpus moved 115 -> 114 on 3 October
    while nobody added or deleted a document. It bites at the worst moment,
    because this file is run at closing time, which is just after a sweep, which
    is when `test-results/` is fullest. So the names are the floor and
    `ignored()` is the rest: anything git ignores and happens to be on disk is
    pruned too, which answers for the `dist/` and the `.venv/` the docstring
    here used to predict as *a failing test and not a silence*, and for the one
    nobody has thought of yet.

    The names are kept rather than replaced because they are cheaper - a tree
    pruned by name is never walked - and because the catalogue cannot answer for
    all of them: `.git` is never listed by `ls-files`, and the two `DEEP-QA-*`
    trees are tracked, so only `node_modules` and `_local` are things git would
    have said anyway. They are also the answer on the day there is no git to
    ask. The walk is kept instead of `git ls-files`
    for the reason it always was: git cannot see a document that has not been
    added yet, which is the document most likely to have a row nobody has looked
    at. Measured on 4 October 2569, with a real artefact on disk this time, it
    is still exactly `git ls-files '*.md'` minus the four `DEEP-QA-*` files:
    118 - 4 + 0 = 114, where the nought is the unadded documents, of which
    there are none today. #186's own table said 117 and 1; both were true when
    it was written and the pair expired together, in one commit, which is why
    this line carries the arithmetic and not only the total.

    `theirs` is the catalogue's answer when a caller already has it, which is
    how `columns()` makes its summary describe the walk that happened rather
    than a second question asked afterwards. A caller that leaves it out gets
    its own call, and a caller that cannot ask gets the names only and is not
    told - that part is `columns()`'s to say, because it is the one that prints.

    What the catalogue is *not* is a report: measured on the same day, every one
    of the 112 pipes in a real `error-context.md` sits inside a fence, so
    `columns()` reads no table in it and #186's second half - that the render
    check reports somebody else's rows - did not reproduce. What was wrong is
    the corpus, and a count nobody can stand behind is enough.
    """
    root = ROOT if root is None else root
    theirs = ignored(root)[0] if theirs is None else theirs
    found = []
    for where, directories, names in os.walk(root):
        inside = os.path.relpath(where, root).replace("\\", "/")
        prefix = "" if inside == "." else inside + "/"
        directories[:] = [name for name in directories
                          if name not in NOT_OURS and prefix + name + "/" not in theirs]
        found += [os.path.join(where, name) for name in names
                  if name.endswith(".md") and prefix + name not in theirs]
    return sorted(found)


def columns(files=None):
    """(problems, tables read, rows read) over the repository's markdown tables.

    Takes its files as an argument for the same reason `commands()` does: the
    only way to assert that a six-cell row is *found* is to hand it one, and
    today's corpus is clean by construction the moment this lands.
    """
    named = files is not None
    could_not_ask = None
    if not named:
        # Asked once and handed to the walk, so the summary below is about the
        # files that were read and not about a second question (#186).
        theirs, could_not_ask = ignored()
        files = markdown(theirs=theirs)
    problems = tables = rows = fenced_lines = 0
    for path in files:
        short = os.path.relpath(path, ROOT).replace("\\", "/")
        with io.open(path, encoding="utf-8") as handle:
            lines = handle.read().split("\n")
        width = None
        fenced = False
        for number, line in enumerate(lines, 1):
            if line.strip().startswith("```"):
                fenced = not fenced
                width = None
                continue
            if fenced:
                fenced_lines += 1
                continue
            if "|" not in line:
                width = None
                continue
            if width is None:
                # A header is a line with a `|---|` under it, and nothing else is.
                if number < len(lines) and _is_rule(lines[number]):
                    width = len(_cells(line))
                    tables += 1
                continue
            if _is_rule(line):
                continue
            rows += 1
            got = len(_cells(line))
            if got != width:
                problems += 1
                print("CELLS %s:%d -> %d cells in a %d-column table" % (short, number, got, width))
    if not named:
        # What it leaves out goes in the summary rather than only in the README,
        # because a tool that cannot say what it did not look at is the same
        # species as the hand-kept numbers it checks (#123).
        if could_not_ask:
            problems += 1
            print("CANNOT ASK -> %s; pruned by the %d names only, so a tree nobody "
                  "has named is counted as ours" % (could_not_ask, len(NOT_OURS)))
            print("columns: reading %d markdown files of the whole repository, "
                  "outside %s and nothing else"
                  % (len(files), ", ".join(NOT_OURS)))
        else:
            print("columns: reading %d markdown files of the whole repository, "
                  "outside %s and the %d paths git ignores"
                  % (len(files), ", ".join(NOT_OURS), len(theirs)))
        print("columns: tables %d | rows %d | lines skipped inside fences %d | problems %d"
              % (tables, rows, fenced_lines, problems))
    return problems, tables, rows


# A row of the file table: a code span naming a `.py` in the first cell and an
# integer in the last. Nothing else in the store is shaped like that, so the
# table is found by what its rows are rather than by where it sits in the file.
TABLE_ROW = re.compile(r"^\|\s*`([^`]+\.py)`\s*\|.*\|\s*(\d+)\s*\|\s*$")
# The stated total, which is the first bold integer after the last row. Matched
# on the bold and the digits rather than on the Thai around it: a pattern that
# holds a retyped sentence expires the day somebody rewords it.
TOTAL = re.compile(r"\*\*(\d+)")


def _held(path):
    """How many mutants one sheet holds, or None when its MUTANTS cannot be read."""
    mutants = _module(path)[1]
    if not isinstance(mutants, ast.Dict) or not mutants.keys:
        return None
    return len(mutants.keys)


def _rows(readme):
    """[(line, name, count)] of the file table, and the total it claims.

    Lines inside a fence are skipped for the reason `columns()` skips them: a
    document that shows what a row looks like is explaining the table rather
    than extending it.
    """
    with io.open(readme, encoding="utf-8") as handle:
        lines = handle.read().split("\n")
    found, fenced, last = [], False, 0
    for number, line in enumerate(lines, 1):
        if line.strip().startswith("```"):
            fenced = not fenced
            continue
        if fenced:
            continue
        hit = TABLE_ROW.match(line.strip())
        if hit:
            found.append((number, hit.group(1), int(hit.group(2))))
            last = number
    claimed = None
    for number, line in enumerate(lines[last:], last + 1):
        hit = TOTAL.search(line)
        if hit:
            claimed = (number, int(hit.group(1)))
            break
    return found, claimed


def catalogue(paths=None, readme=None):
    """(problems, sheets found, rows read) over the store against its own table.

    The three questions above all read the list of files this walks and ask
    something of each. None of them asks whether the *document* knows that list,
    and what is missing from a table is invisible to a sum over it: the table
    said 801, summed to 801, and the store held 822 (#176).

    Takes its world as arguments for the reason `columns()` does - the only way
    to assert that a missing row is *found* is to hand it a store missing one.
    """
    named = paths is not None and readme is not None
    if not named:
        # Both or neither, like `commands()`: half a world would walk a
        # caller's sheets against the real README and call the mismatch a
        # problem of theirs.
        paths = sheets()
        readme = os.path.join(HERE, "README.md")
    short = os.path.relpath(readme, ROOT).replace("\\", "/")
    held = {os.path.basename(path): _held(path) for path in paths}
    rows, claimed = _rows(readme)
    listed = {name: (number, count) for number, name, count in rows}
    problems = 0

    for name in sorted(set(held) - set(listed)):
        problems += 1
        count = held[name]
        print("NOT IN THE TABLE %s -> %s holds %s"
              % (short, name,
                 "an unreadable number of mutants" if count is None
                 else "%d mutant%s" % (count, "" if count == 1 else "s")))
    for name in sorted(set(listed) - set(held)):
        problems += 1
        print("TABLE ROW NAMES NO FILE %s:%d -> %s" % (short, listed[name][0], name))
    for name in sorted(set(listed) & set(held)):
        number, count = listed[name]
        if held[name] is None:
            # Said out loud rather than compared against zero, which would
            # report the table for a fault that is the sheet's.
            problems += 1
            print("CANNOT COUNT %s:%d -> %s holds no readable MUTANTS" % (short, number, name))
        elif held[name] != count:
            problems += 1
            print("COUNT %s:%d -> %s says %d, the file holds %d"
                  % (short, number, name, count, held[name]))

    summed = sum(count for _, _, count in rows)
    if claimed is None:
        # level, behind, and *could not ask* - the third answer (#159). A
        # document with no total is not a document whose total agrees.
        problems += 1
        print("CANNOT ASK %s -> no stated total after the table" % short)
    elif claimed[1] != summed:
        problems += 1
        print("TOTAL %s:%d -> says %d, the table sums to %d" % (short, claimed[0], claimed[1], summed))

    if not named:
        print("catalogue: reading %d sheets against %s" % (len(paths), short))
        print("catalogue: rows %d | mutants in the table %d | problems %d"
              % (len(rows), summed, problems))
    return problems, len(paths), len(rows)


# A citation: the spec a sheet names and the thing inside it that a mutant
# breaks, in one code span - `10a:the second window, before the session ends`.
# The shape is the store's own idiom for a place in a file, `Navbar.js:58`,
# with one difference that is the whole of #173: what follows the colon is a
# string to find rather than a line to count.
CITATION = re.compile(r"`(\d+[a-z](?:[\w-]*\.spec\.js)?):([^`\n]+)`")

# A citation by number, in the three spellings the sheets write one in, and
# split by what the number points into rather than summed - because the summed
# figure is the one #173 says is the tool's and not the sheets'. A path into
# `e2e/tests` is this question's own species, unconverted; a path into source
# is `57-pager.md`'s register of guard sites, which is a pointer to code and
# not to an assertion; and a bare number is one nothing in its cell resolves.
NO_FILE = re.compile(u"บรรทัด(?:ที่)?\\s*\\d+"
                     r"|`:\d+`")
A_FILE = re.compile(r"([\w./-]+\.(?:js|py|csv|json|md)):\d+")


def _needle(token, specs):
    """Every spec a citation's token names, matched as Playwright matches one.

    A glob anchored at the start of the basename is the wrong rule and the
    file next door says so: `runs()` searches the pattern against the path
    because `21a-` also names `121a-grants-notice-in-view` (#154, #158). Of
    the tokens this store cites, `22a` is already two files under the right
    rule and one under the wrong one - so the glob answered *resolved* about
    an ambiguous citation, which is the one answer this question must not
    give. The token is escaped: it is a name here, not a pattern.
    """
    found = [path for path in specs if re.search(re.escape(token), path)]
    return sorted(found)


def citations(files=None, specs=None):
    """(problems, citations checked, citations by number counted, fenced).

    Takes its world as an argument for the reason `commands()` does: the only
    way to assert that a rotten citation is *found* is to hand it one.
    """
    named = files is not None
    if specs is None:
        # A made-up sheet still resolves against the real `e2e/tests`: that
        # half of the question cannot be faked, and a fixture suite would
        # prove the regex while saying nothing about this repository.
        store_specs, store_files = _store()
        specs = store_specs
        if not named:
            files = store_files
            print("citations: reading %d files of mutation/, docs/acceptance/ "
                  "and e2e/README.md" % len(files))
    if specs is None:
        # Asked once and scored as a problem, which is what the three
        # questions above this one do with the same state: *could not ask* is
        # not clean, and folding it into clean is the mistake #159 is about,
        # read from the other side. (#173's review round)
        print("CANNOT ASK: no e2e/tests directory, so no citation was resolved")
        return 1, 0, 0, 0
    checked = gone = unreadable = skipped = 0
    # The three the summed figure hides, counted apart.
    bare = into_spec = elsewhere = 0
    problems = 0
    for path in files:
        short = os.path.relpath(path, ROOT).replace("\\", "/")
        try:
            with io.open(path, encoding="utf-8") as handle:
                text = handle.read()
        except (IOError, OSError, UnicodeDecodeError) as refusal:
            unreadable += 1
            problems += 1
            print("UNREADABLE %s -> %s" % (short, refusal))
            continue
        fenced = False
        for number, line in enumerate(text.split("\n"), 1):
            if line.strip().startswith("```"):
                fenced = not fenced
                continue
            if fenced:
                # A fence is where a document writes an example of a citation,
                # or quotes a broken one on purpose - this file's own README
                # does both. Counted out loud rather than read, which is the
                # rule `columns()` follows for the same reason.
                skipped += len(CITATION.findall(line)) + len(NO_FILE.findall(line))
                continue
            rest = []
            end = 0
            for found in CITATION.finditer(line):
                rest.append(line[end:found.start()])
                end = found.end()
                token, thing = found.group(1), found.group(2).strip()
                where = _needle(token, specs)
                if len(where) != 1:
                    problems += 1
                    print("SPEC %s:%d -> `%s` names %d files%s"
                          % (short, number, token, len(where),
                             " (" + ", ".join(where) + ")" if where else ""))
                    continue
                spec = os.path.join(ROOT, "e2e", where[0])
                if thing.isdigit():
                    # The third answer, and the one this question exists to
                    # stop anybody giving by hand: a line number says which
                    # line, and which line is not which assertion. Counted.
                    into_spec += 1
                    continue
                checked += 1
                with io.open(spec, encoding="utf-8") as handle:
                    inside = handle.read()
                if thing not in inside:
                    gone += 1
                    problems += 1
                    print("GONE %s:%d -> %r is nowhere in %s"
                          % (short, number, thing[:70], os.path.basename(spec)))
            rest.append(line[end:])
            # What is left of the line after the citations above are cut out,
            # so a citation in the checkable shape is never also counted as
            # one of the old kind - `10a-shell.spec.js:row 3` holds a path and
            # a colon, which is the third old spelling exactly.
            remains = "".join(rest)
            bare += len(NO_FILE.findall(remains))
            for named_file in A_FILE.findall(remains):
                if named_file.endswith(".spec.js"):
                    into_spec += 1
                else:
                    elsewhere += 1

    numbered = bare + into_spec + elsewhere
    if not named:
        print("citations: by name %d | of those gone %d | inside a fence, counted and not "
              "read %d | unreadable %d | problems %d"
              % (checked, gone, skipped, unreadable, problems))
        print("citations: by number %d - %d into a spec, %d into something that is not "
              "a spec, %d with no file beside the number" % (numbered, into_spec, elsewhere, bare))
    # `skipped` is returned and not only printed, so a row can assert that
    # what a fence holds was counted out loud rather than quietly ignored -
    # the two are the same green otherwise (#126, #173's review).
    return problems, checked, numbered, skipped


if __name__ == "__main__":
    misanchored = check()
    undocumented = commands()[0]
    miscounted = columns()[0]
    unlisted = catalogue()[0]
    uncited = citations()[0]
    sys.exit(1 if (misanchored or undocumented or miscounted or unlisted or uncited) else 0)
