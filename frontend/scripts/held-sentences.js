/**
 * The census #246 asked for: which screens hold a sentence back until the list
 * it is about is on the screen again.
 *
 * The rule is the owner's answer of 29 ตุลาคม 2569. #238's rule ก binds a
 * success sentence to the read that draws what it is about; the measurement
 * that turned the leftover into a question rather than a preference is that a
 * form on these screens is drawn **in place of** the list — `{editing ? <Form/>
 * : <table/>}` — so a read that lands while one is open has drawn nothing the
 * sentence is true of, and the letter of rule ก said *say it anyway*. #241's
 * fourth arm measured it being said over a just-opened form on 28 ตุลาคม 2569,
 * 216 frames of it. The owner's answer: the person reads it when the form
 * closes, with the list under it.
 *
 * The mechanism is copied and not shared on these nine screens (#83), so the
 * rule lands at each of them and nothing asks whether the next one carries it.
 * That is the price of a rule that lives in each caller (#198), and this is the
 * instrument that pays it — the shape #68 settled, where the screen that
 * *proves* the rule is chosen by the census (`246a` on `pages/Plos.js`) and the
 * rest are held by a reading of the code.
 *
 * It is asked **by the mechanism** and not by a spelling (#174). Two questions:
 *
 * 1. **Which files say a sentence a read was handed?** A call
 *    `setNotice(<ref>.current.said)`. The ref's name is read out of that call,
 *    which is what makes everything below a question about *that* ref rather
 *    than about a name this script knows in advance.
 * 2. **Does the file hold the deferral, all three parts of it?**
 *    - **guarded** — the say sits in the `else` of an `if` whose test is some
 *      other ref's `.current`, and whose `then` writes `held` into the sentence
 *      ref. Nothing about `formShown`: a screen that mirrors the state under
 *      another name is green.
 *    - **kept** — a `<ref>.current = null` under an `if` whose test reads
 *      `held`, which is the `finally` that has stopped throwing a held one away.
 *    - **said later** — a `setNotice(<local>.said)` inside a function that also
 *      clears the ref, which is the effect that says it when the form closes.
 *
 * A say with any part missing is green only behind a **marker**, in a comment
 * anywhere in the same file:
 *
 *     // held-sentence: <why this screen needs no deferral> (#NNN)
 *
 * One carries one as of 29 ตุลาคม 2569 — `pages/SubjectStudents.js`, whose list
 * is drawn under `{data && (` and is never replaced by a form, so every read
 * that lands draws the thing its sentence is about. A marker is a claim like any
 * other (#141), so it is printed with its reason, and the day that screen gains
 * a form in place of its list the marker is an exemption and nothing here will
 * say so (#93).
 *
 * What it cannot measure, written down because a count nobody can read the
 * limits of is the species of hand-kept number these exist to replace (#123):
 *
 * - **whether the screen even draws a form in place of its list.** This finds a
 *   deferral; it cannot ask whether the absence of one matters, which is the
 *   half that decides the price (#226). That is what the marker's reason is
 *   for, and it is prose a person has to read.
 * - **what the guard can tell apart.** It reads that the test is *a* ref's
 *   `.current`, not that the ref is the form's, nor that its mirror is kept up
 *   to date. A ref that is always `false` passes this and defers nothing —
 *   `246a`'s second row is what holds that, and only on one screen (#226).
 * - **whether the deferral is right.** That the sentence is said once, when the
 *   list is back, and not over a list it is not about, is what the rows of
 *   `246a` and `238a` hold. All this reads is that the three parts are there and
 *   are about the same ref.
 * - **a say this script cannot read.** A `setNotice` reached through a variable,
 *   a helper or a shared hook, and a sentence held by anything but a
 *   `<ref>.current`, are reported as unclassified and named, not guessed at. The
 *   population is the file, as #198 left it.
 * - **two say sites in one file.** The marker is read from the file, so a file
 *   with one deferred say and one bare say is green on both.
 * - **a second branch that draws something else in place of the list.** This
 *   asks whether a deferral is there, not how many of the screen's own
 *   list-replacing branches the ref tracks: `pages/Offerings.js` draws
 *   `<SectionsPanel>` instead of the table in a branch of its own, and its ref
 *   is `Boolean(opening)` — the form alone. It is reported `held` and is, for
 *   that branch, not deferred at all. Measured on 29 ตุลาคม 2569 and put to the
 *   owner as [#250](https://github.com/khthana/Deep-QA/issues/250), because the
 *   same screen's `save` already takes the person into that panel with a
 *   list-keyed sentence standing, on purpose (#196). It is the coverage half of
 *   the limit above rather than an absence (#226).
 * - **whether a marker's reason is still true**, which is #93's rule and the
 *   reason each reason carries a ticket number.
 *
 * Run: `npm run census` in `frontend/`. Its own fixtures: `npm run census:test`.
 * Its own fixtures are written from the rule, so they are silent about the two
 * ways a real site breaks it (#141, #124): the first run of this one was read
 * against the nine screens by hand on the day it landed.
 *
 * `@babel/parser` comes in with `react-scripts` and is not a declared
 * dependency. If it ever goes, this script says so and stops rather than
 * reporting a clean tree it never read.
 */
const fs = require('fs')
const path = require('path')

let parser
try {
  parser = require('@babel/parser')
} catch {
  console.error(
    'held-sentences: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The call that puts a sentence on the screen. */
const SAYS = 'setNotice'
/** The property a sentence is read out of, and the one that marks a held one. */
const SAID = 'said'
const HELD = 'held'

// Everything after the colon to the end of the comment paragraph, for the
// reason `superseded-answers.js` gives: the reason is a paragraph and not a
// line, and the ticket number is read out of the same paragraph (#233).
const MARKER = /held-sentence:([\s\S]+)/
const TICKET = /#\d+/

function filesUnder(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) filesUnder(full, out)
    else out.push(full)
  }
  return out
}

/** Every node of the tree. */
function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit)
    return
  }
  if (typeof node.type !== 'string') return
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue
    walk(node[key], visit)
  }
}

/** True where any node of the subtree answers the question. */
function holds(node, asks) {
  let found = false
  walk(node, one => {
    if (asks(one)) found = true
  })
  return found
}

const nameOf = node => (node && node.type === 'Identifier' ? node.name : null)

const member = node =>
  node && (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')

/** The ref name of a `<ref>.current` read, where this script can say. */
function refOf(node) {
  if (!member(node)) return null
  if (nameOf(node.property) !== 'current') return null
  return nameOf(node.object)
}

/** A `setNotice(<x>.said)`, with what the sentence was read out of. */
function sayIn(node) {
  if (node.type !== 'CallExpression') return null
  if (nameOf(node.callee) !== SAYS) return null
  if (node.arguments.length !== 1) return null
  const argument = node.arguments[0]
  if (!member(argument) || nameOf(argument.property) !== SAID) return null
  return { line: node.loc.start.line, from: argument.object }
}

/** Every say of a sentence a read was handed, by the ref that holds it. */
function saysIn(ast) {
  const found = []
  walk(ast, node => {
    const say = sayIn(node)
    if (!say) return
    const ref = refOf(say.from)
    if (ref) found.push({ line: say.line, ref })
  })
  return found
}

/** An assignment to `<ref>.current`. */
function writeTo(node, ref) {
  return node.type === 'AssignmentExpression' && refOf(node.left) === ref
}

/**
 * Is this say in the `else` of a guard whose `then` holds the sentence back?
 *
 * The test has to be some *other* ref's `.current` — the sentence's own ref is
 * what the say reads, so an `if (waiting.current)` around it is the key check
 * every one of these screens already had and is not a deferral.
 */
function guardOf(ast, say) {
  let guard = null
  walk(ast, node => {
    if (node.type !== 'IfStatement' || !node.alternate) return
    const test = refOf(node.test)
    if (!test || test === say.ref) return
    const here = one => {
      const found = sayIn(one)
      return Boolean(found) && found.line === say.line
    }
    if (!holds(node.alternate, here)) return
    const heldWrite = one =>
      writeTo(one, say.ref) &&
      one.right &&
      one.right.type === 'ObjectExpression' &&
      (one.right.properties || []).some(
        property => property.key && property.key.name === HELD
      )
    if (!holds(node.consequent, heldWrite)) return
    guard = { line: node.loc.start.line, by: test }
  })
  return guard
}

/** A clearing of the sentence ref: the test both parts below are built on. */
const clearsRef = ref => one =>
  writeTo(one, ref) && one.right && one.right.type === 'NullLiteral'

/** Is a held sentence kept — a clearing of the ref under a test that reads it? */
function keptIn(ast, ref) {
  let kept = null
  walk(ast, node => {
    if (node.type !== 'IfStatement') return
    if (!holds(node.test, one => member(one) && nameOf(one.property) === HELD)) return
    const cleared = clearsRef(ref)
    if (holds(node.consequent, cleared) || (node.alternate && holds(node.alternate, cleared))) {
      kept = { line: node.loc.start.line }
    }
  })
  return kept
}

/**
 * Is it said later — a say out of a local, in a function that clears the ref?
 *
 * The clearing in the same function is what makes it the effect that owns a
 * held sentence rather than any other reader of one: it says it and takes it
 * away in one turn, which is what stops the next read saying it again (#137).
 */
function saidLaterIn(ast, ref) {
  let later = null
  walk(ast, node => {
    if (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') return
    const fromLocal = one => {
      const say = sayIn(one)
      return Boolean(say) && nameOf(say.from) !== null
    }
    if (!holds(node.body, fromLocal)) return
    if (!holds(node.body, clearsRef(ref))) return
    later = { line: node.loc.start.line }
  })
  return later
}

/** Runs of adjacent comments, merged: a `//` paragraph is one comment per line. */
function paragraphs(comments, code) {
  const runs = []
  for (const comment of [...comments].sort((a, b) => a.start - b.start)) {
    const last = runs[runs.length - 1]
    if (last && code.slice(last.end, comment.start).trim() === '') {
      last.end = comment.end
      last.value += '\n' + comment.value
      continue
    }
    runs.push({ line: comment.loc.start.line, end: comment.end, value: comment.value })
  }
  return runs
}

/** The marker this file carries, if it carries one. */
function markerIn(comments, code) {
  for (const block of paragraphs(comments, code)) {
    const found = MARKER.exec(block.value)
    if (!found) continue
    const reason = found[1].replace(/\s+/g, ' ').trim()
    return {
      line: block.line,
      reason,
      // A reason of its own **and** a ticket number: a number on its own is a
      // pointer and not a reason, which is the rule `forms-cleared-by-identity`
      // settled for this family of markers.
      ok: TICKET.test(reason) && reason.replace(TICKET, '').trim().length > 0,
    }
  }
  return null
}

/** Every say this script could not read the sentence's holder out of. */
function unreadableSaysIn(ast) {
  const found = []
  walk(ast, node => {
    const say = sayIn(node)
    if (!say) return
    if (refOf(say.from) || nameOf(say.from)) return
    found.push({ line: say.line })
  })
  return found
}

function examine(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    attachComment: true,
  })
  const says = saysIn(ast)
  const unreadable = unreadableSaysIn(ast)
  if (says.length === 0 && unreadable.length === 0) {
    return { says: [], unreadable: [], marker: null }
  }
  return {
    says: says.map(say => ({
      ...say,
      guard: guardOf(ast, say),
      kept: keptIn(ast, say.ref),
      later: saidLaterIn(ast, say.ref),
    })),
    unreadable,
    marker: markerIn(ast.comments || [], code),
  }
}

/** What one say is, given what else the file holds. */
function classify(say, found) {
  if (say.guard && say.kept && say.later) {
    return {
      kind: 'held',
      by: say.guard.by,
      at: say.guard.line,
      kept: say.kept.line,
      later: say.later.line,
    }
  }
  if (found.marker) return { kind: 'marked', marker: found.marker }
  const missing = []
  if (!say.guard) missing.push('no guard asking whether a form is drawn in place of the list')
  if (!say.kept) missing.push('nothing keeping a held sentence when the read lands')
  if (!say.later) missing.push('nothing saying a held sentence when the form closes')
  return { kind: 'bare', missing }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unparsed = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  const held = []
  const marked = []
  const unclassified = []
  const problems = []

  for (const file of sources) {
    const where = shown(file)
    const code = fs.readFileSync(file, 'utf8')
    let found
    try {
      found = examine(code)
    } catch (error) {
      problems.push({ where, line: error.loc ? error.loc.line : 0, why: 'could not be parsed' })
      continue
    }

    for (const say of found.unreadable) {
      unclassified.push(
        where + ':' + say.line + ' says a sentence this script cannot read the holder of'
      )
    }

    for (const say of found.says) {
      const at = where + ':' + say.line
      const verdict = classify(say, found)
      if (verdict.kind === 'held') {
        held.push(
          at +
            ' (' +
            say.ref +
            ', behind ' +
            verdict.by +
            ' at ' +
            where +
            ':' +
            verdict.at +
            ', kept at :' +
            verdict.kept +
            ', said at :' +
            verdict.later +
            ')'
        )
      } else if (verdict.kind === 'marked' && verdict.marker.ok) {
        marked.push(at + ' — ' + verdict.marker.reason)
      } else if (verdict.kind === 'marked') {
        problems.push({
          where,
          line: verdict.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      } else {
        problems.push({
          where,
          line: say.line,
          why:
            'says a sentence a read was handed with ' +
            verdict.missing.join(', and ') +
            '. The owner answered that on 29 ตุลาคม 2569 (#246): a form on these ' +
            'screens is drawn in place of the list, so a read that lands while ' +
            'one is open has drawn nothing the sentence is about and the person ' +
            'reads it when the form closes. Either hold it — `' +
            say.ref +
            '.current = { ...' +
            say.ref +
            '.current, held: true }` behind a ref that says a form is drawn, ' +
            'kept by the `finally` and said by an effect when the form closes — ' +
            'or write `// held-sentence: <why this screen needs no deferral> ' +
            '(#NNN)` in this file',
        })
      }
    }
  }

  for (const file of unparsed)
    problems.push({
      where: shown(file),
      line: 0,
      why: 'is code this script is not set up to parse, so it was not read',
    })

  // What it did not look at, by name rather than as a number (#123, #126).
  const ignored = everything.filter(file => !CODE.has(path.extname(file)))
  const extensions = [...new Set(ignored.map(file => path.extname(file) || '(none)'))].sort()
  console.log(
    'files read ' +
      sources.length +
      ' (' +
      PARSED +
      ') · code files not read ' +
      unparsed.length +
      ' · not code ' +
      ignored.length +
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '')
  )
  console.log(
    'sentences handed to a read: held ' +
      held.length +
      ' · marked ' +
      marked.length +
      ' · unclassified ' +
      unclassified.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--held')) for (const entry of held) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  for (const entry of unclassified) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify }
