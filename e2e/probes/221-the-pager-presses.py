# -*- coding: utf-8 -*-
"""#221 criterion 4 - which ROWS press a pager while on Students.js or Users.js.

    python e2e/probes/221-the-pager-presses.py

An instrument and not a gate: nothing in the repository runs it, it asserts
nothing, and it prints a population for a person to read (#169, #219). Python
rather than `@babel/parser`, which `probes/219-cancel-sites.js` uses, because
what is being counted here is a call shape and not a tree: that choice is what
the blind spots at the bottom are the price of.

Counts the PRESS, not the claim (#199, #217): a row that presses the pager to
arrange something is as much a re-aim of that row as a row whose claim is
about the control.

Population: every `test(` block under e2e/tests, read with the setup of every
`test.describe` enclosing it and of the file's own top-level `beforeAll` /
`beforeEach` (those open the screen for rows that never name it).

A press is `step(`, `toLastPage(`, or `.click()` on `next(page)` /
`previous(page)` -- `pager.js:23` makes `next` and `previous` locators, so
`expect(next(page)).toBeDisabled()` is a READ of the control and not a press,
which is the difference #199's census turns on. A press that goes through
`live()` first (#209) is counted too, by that call. A call to a helper the file
declares, whose own body presses, counts as a press; so does one that opens
one of the two screens. Helper bodies are found by brace-matching the
declaration, never by a window of characters.

What it cannot say (#123):
  - it reads text, so a press reached through a helper imported from another
    module is invisible unless that module is `pager.js`;
  - a count of matches is not a count of presses at runtime: a press inside a
    loop counts once, and a row skipped by a guard counts anyway;
  - which of two controls carrying one name a row actually presses is a
    property of the run and not of the text (#219). This names the population;
    the run is what would say which page each press lands on;
  - **it cannot say which of those presses `busy={busy}` would stop.** A press
    is only re-aimed if it happens while the flag is up, which is a property of
    the row's sequence: each of the eleven it finds was read by hand on
    25 ตุลาคม 2569 and three of them are in a window. That reading is on
    `docs/acceptance/57-pager.md`, with the mutants that measured the same
    three from the other side (`140:usersbusypager`, `140:studentsbusypager`).
"""
import io
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TESTS = os.path.join(REPO, 'e2e', 'tests')

PRESS = re.compile(
    r"\bstep\s*\(|\btoLastPage\s*\(|"
    r"\b(?:next|previous)\s*\(\s*\w+\s*\)\s*\.click\s*\(|"
    # `140a`'s own press reads the control once before pressing it, to keep a
    # retrying wait from moving the press instead of failing the row (#209).
    r"\blive\s*\(\s*(?:next|previous)\s*\(")
OPENS = {
    'Users.js': re.compile(r"\b(?:users\.)?openUsers\s*\(|\bopenUsersScreen\s*\("),
    'Students.js': re.compile(r"\b(?:students\.)?openRegister\s*\(|\bopenStudentsScreen\s*\("),
}
MARK = re.compile(r"^([ \t]*)test(\.describe|\.only|\.skip|\.fixme)?\(", re.M)
# Top level only: an indented `beforeEach` belongs to its own `describe`, and
# is already inside that block's text. Taking them all gave every row of a
# file the screens one describe's setup opens.
SETUP = re.compile(r"^test\.(?:beforeAll|beforeEach)\(", re.M)
TITLE = re.compile(r"^\s*test(?:\.\w+)?\(\s*[`'\"]([^`'\"]*)")
DECL = re.compile(
    r"^(?:async\s+function\s+(\w+)|function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?\()",
    re.M)


def matched(text, start, opener='{'):
    """The balanced block beginning at the first `opener` at or after start.

    A `test(` block is matched from its own `(`, not from its first `{`: the
    first brace in `test('...', async ({ page }) => {` closes after `page`,
    which made every block two words long and every press invisible.
    """
    closer = {'{': '}', '(': ')'}[opener]
    i = text.find(opener, start)
    if i < 0:
        return ''
    depth, j = 0, i
    while j < len(text):
        if text[j] == opener:
            depth += 1
        elif text[j] == closer:
            depth -= 1
            if depth == 0:
                return text[i:j + 1]
        j += 1
    return text[i:]


def body_after(text, start):
    """A declaration's own body: brace-matched, so its header is left out."""
    head = matched(text, start, '(')
    return matched(text, text.find(head, start) + len(head), '{') if head else ''


def declarations(text):
    """name -> its own brace-matched body, for the helpers the file declares.

    A declaration reads exactly like a call to itself, which is why the body
    starts at the `{` and the header is left out: taking the text whole
    attributed every row of a file to every screen one of its helpers opens.
    """
    return {(m.group(1) or m.group(2) or m.group(3)): body_after(text, m.start())
            for m in DECL.finditer(text)}


def closure(decls, seed):
    """The helpers that press / open, following calls between them."""
    found = {n for n, body in decls.items() if seed.search(body)}
    while True:
        more = {n for n, body in decls.items()
                if n not in found
                and any(re.search(r"\b%s\s*\(" % re.escape(h), body) for h in found)}
        if not more:
            return found
        found |= more


def units(text):
    """(describes, title, own body, body + enclosing setup) per test block."""
    setup = ''.join(matched(text, m.start(), '(') for m in SETUP.finditer(text))
    marks = list(MARK.finditer(text))
    stack = []
    for m in marks:
        indent = len(m.group(1))
        block = matched(text, m.start(), '(')
        title = TITLE.search(text[m.start():m.start() + 400])
        title = title.group(1) if title else '?'
        while stack and stack[-1][0] >= indent:
            stack.pop()
        if m.group(2) == '.describe':
            stack.append((indent, title, block))
            continue
        enclosing = ''.join(s[2] for s in stack) + setup
        yield [s[1] for s in stack], title, block, block + enclosing


rows = []
for fname in sorted(os.listdir(TESTS)):
    if not fname.endswith('.spec.js'):
        continue
    text = io.open(os.path.join(TESTS, fname), encoding='utf-8').read()
    decls = declarations(text)
    pressers = closure(decls, PRESS)
    openers = {screen: closure(decls, pattern) for screen, pattern in OPENS.items()}
    for describes, title, block, reading in units(text):
        presses = len(PRESS.findall(block)) + sum(
            len(re.findall(r"\b%s\s*\(" % re.escape(h), block)) for h in pressers)
        if not presses:
            continue
        screens = sorted(
            screen for screen, pattern in OPENS.items()
            if pattern.search(reading)
            or any(re.search(r"\b%s\s*\(" % re.escape(h), reading) for h in openers[screen]))
        rows.append((fname, ' > '.join(describes), title, screens, presses))

ours = [r for r in rows if r[3]]
print('test blocks under e2e/tests pressing a pager: %d' % len(rows))
print('  of which reach Users.js or Students.js:     %d' % len(ours))
for label, want in (('Users.js only', ['Users.js']), ('Students.js only', ['Students.js'])):
    print('    %-17s %d' % (label, len([r for r in ours if r[3] == want])))
print('    %-17s %d' % ('both', len([r for r in ours if len(r[3]) == 2])))
print('')
for fname, describes, title, screens, n in ours:
    print('%s  [%s] presses=%d' % (fname, ','.join(screens), n))
    print('    %s | %s' % (describes[:60], title[:90]))
print('')
print('--- the other %d, for the record ---' % (len(rows) - len(ours)))
for fname, describes, title, screens, n in rows:
    if not screens:
        print('%-46s presses=%d  %s | %s' % (fname[:46], n, describes[:34], title[:50]))
