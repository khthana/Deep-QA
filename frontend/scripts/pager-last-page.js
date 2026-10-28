/**
 * The census #239 asked for: which `<Pager>` mount points ask the server
 * whether the page the person is standing on still exists.
 *
 * The rule is the owner's answer to #209 on 19 ตุลาคม 2569 - *let the server say
 * how many pages there are, and if the page the person is on no longer exists,
 * take them to the last page that does*. It went into the `load` of the seven
 * screens that ticket's census could see, and nobody asked the next mount point
 * whether it carried it: `<Pager>` had eleven, four were outside, and one of
 * those four - `Users.js` - could be walked onto a page the list no longer had
 * by one person alone (#222's probe, 25 ตุลาคม 2569; fixed by #239).
 *
 * That is the price of a rule that lives in each caller rather than at one
 * structural point (#198), and this is the instrument that pays it.
 *
 * It is asked **by the mechanism** and not by a spelling (#174), because the
 * first census of this family was run by grepping `Math.ceil` and answered
 * wrongly. Two questions:
 *
 * 1. **Which files mount the pager, and what does each hand `onPage`?** A
 *    `<Pager>` element, and the identifier its `onPage` attribute is given -
 *    that identifier is the screen's own page setter, which is what makes the
 *    correction below *this* pager's.
 * 2. **Does the file hold the correction?** An `if` whose test compares
 *    something's `.page` with `>` against a bound, and whose body calls that
 *    same setter with that same bound. Nothing about `Math.ceil`, `total`,
 *    `lastPage` or `HANDED_ON`: a screen that computes the bound some other way
 *    and hands the person to it is green, and a screen that writes all four
 *    names and moves nobody is not.
 *
 * A mount point with no correction is green only behind a **marker**, in a
 * comment anywhere in the same file:
 *
 *     // pager-last-page: <why this screen cannot be left past the end> (#NNN)
 *
 * Three carry one as of 28 ตุลาคม 2569 - `pages/Students.js`,
 * `components/users/HistoryPanel.js` and `components/groups/GroupHistory.js` -
 * and each says the same thing in its own words: nothing a person can press on
 * that screen makes the list it is drawing shorter. A marker is a claim like any
 * other (#141), so each is printed with its reason, and the day one of those
 * screens gains a write that shortens its own list the marker is an exemption
 * and nothing here will say so (#93).
 *
 * What it cannot measure, written down because a count nobody can read the
 * limits of is the species of hand-kept number these exist to replace (#123):
 *
 * - **whether the screen even has the press.** This finds a guard; it cannot
 *   ask whether anything on that screen can shorten its own list, which is what
 *   decides whether the absence of one matters (#226). That is what the
 *   marker's reason is for, and it is prose a person has to read.
 * - **whether the correction is right.** That the bound is the server's last
 *   page and not something else is what the rows of `209a` and `239a` hold; all
 *   this reads is that the comparison and the move are there and are about the
 *   same setter.
 * - **a name this script cannot read.** Where `onPage` is not a bare identifier
 *   - an inline arrow, a spread, a prop forwarded from a wrapper - the mount is
 *   reported as unclassified and named, not guessed at. Where the *bound* is not
 *   one either, the rule being written inline as `if (answer.page >
 *   Math.ceil(answer.total / size)) setPage(Math.ceil(answer.total / size))`,
 *   the correction is not read and the mount is reported as a problem. That is
 *   this rule's too-loose direction, and it fails the way a census should - a
 *   red asking a person, not a silence; its own fixture says so.
 * - **a pager drawn by another component on the screen's behalf**, or a
 *   correction that lives in a shared hook rather than in the file that mounts
 *   the pager. The population is the file, as #198 left it.
 * - **two mounts in one file.** The marker is read from the file, so a file
 *   with a corrected pager and an uncorrected one is green on both.
 * - **whether a marker's reason is still true**, which is #93's rule and the
 *   reason each reason carries a ticket number.
 *
 * Run: `npm run census` in `frontend/`. Its own fixtures: `npm run census:test`.
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
    'pager-last-page: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The component whose mount points are the population. */
const PAGER = 'Pager'

// Everything after the colon to the end of the comment paragraph, for the
// reason `superseded-answers.js` gives: the reason is a paragraph and not a
// line, and the ticket number is read out of the same paragraph (#233).
const MARKER = /pager-last-page:([\s\S]+)/
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

/** The name of the thing an expression is, where this script can say. */
const nameOf = node => (node && node.type === 'Identifier' ? node.name : null)

/**
 * Every `<Pager>` in a file, with the identifier its `onPage` was given.
 *
 * `onPage` and not `page`, because what a correction has to move is the state
 * the pager's own buttons write - a screen that compared the right numbers and
 * set some other state would be moving nobody.
 */
function mountsIn(ast) {
  const found = []
  walk(ast, node => {
    if (node.type !== 'JSXOpeningElement') return
    if (!node.name || node.name.type !== 'JSXIdentifier' || node.name.name !== PAGER) return
    const attribute = (node.attributes || []).find(
      one => one.type === 'JSXAttribute' && one.name && one.name.name === 'onPage'
    )
    const given =
      attribute && attribute.value && attribute.value.type === 'JSXExpressionContainer'
        ? nameOf(attribute.value.expression)
        : null
    found.push({ line: node.loc.start.line, setter: given })
  })
  return found
}

/**
 * Every place the file reads *the page I asked for is past the end* and moves.
 *
 * The test is `<anything>.page > <bound>` and the body calls `<setter>(<bound>)`
 * - the same bound, so a screen that compares against the server's last page
 * and then hands the person somewhere else is not counted as holding the rule.
 */
function correctionsIn(ast) {
  const found = []
  walk(ast, node => {
    if (node.type !== 'IfStatement') return
    const test = node.test
    if (!test || test.type !== 'BinaryExpression' || test.operator !== '>') return
    if (
      !test.left ||
      test.left.type !== 'MemberExpression' ||
      nameOf(test.left.property) !== 'page'
    ) {
      return
    }
    const bound = nameOf(test.right)
    if (!bound) return
    let moved = null
    walk(node.consequent, inside => {
      if (inside.type !== 'CallExpression') return
      const called = nameOf(inside.callee)
      if (!called || !/^set[A-Z]/.test(called)) return
      if (inside.arguments.length !== 1 || nameOf(inside.arguments[0]) !== bound) return
      moved = called
    })
    if (moved) found.push({ line: node.loc.start.line, setter: moved, against: bound })
  })
  return found
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

function examine(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    attachComment: true,
  })
  const mounts = mountsIn(ast)
  if (mounts.length === 0) return { mounts: [], corrections: [], marker: null }
  return {
    mounts,
    corrections: correctionsIn(ast),
    marker: markerIn(ast.comments || [], code),
  }
}

/** What one mount point is, given what else the file holds. */
function classify(mount, found) {
  if (!mount.setter) return { kind: 'unclassified' }
  const correction = found.corrections.find(one => one.setter === mount.setter)
  if (correction) return { kind: 'corrected', at: correction.line, against: correction.against }
  if (found.marker) return { kind: 'marked', marker: found.marker }
  return { kind: 'bare' }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  const corrected = []
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

    for (const mount of found.mounts) {
      const at = where + ':' + mount.line
      const verdict = classify(mount, found)
      if (verdict.kind === 'corrected') {
        corrected.push(at + ' (' + where + ':' + verdict.at + ' → ' + verdict.against + ')')
      } else if (verdict.kind === 'unclassified') {
        unclassified.push(at + ' onPage is not an identifier this script can follow')
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
          line: mount.line,
          why:
            'mounts <Pager> with nothing asking whether the page it is drawing ' +
            'still exists. The owner answered that on 19 ตุลาคม 2569 (#209): the ' +
            'server says how many pages there are, and a person whose page has ' +
            'gone is handed to the last one that has not. Either read `total` out ' +
            'of the answer and hand ' +
            mount.setter +
            ' the last page that exists, or write `// pager-last-page: <why this ' +
            'screen cannot be left past the end> (#NNN)` in this file',
        })
      }
    }
  }

  for (const file of unreadable)
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
      unreadable.length +
      ' · not code ' +
      ignored.length +
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '')
  )
  console.log(
    'pager mount points: corrected ' +
      corrected.length +
      ' · marked ' +
      marked.length +
      ' · unclassified ' +
      unclassified.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--corrected')) for (const entry of corrected) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  for (const entry of unclassified) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify }
