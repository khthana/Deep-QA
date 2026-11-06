/**
 * The census #269 asked for: which of the #140 family's guards nothing breaks.
 *
 * The family's rule is *the list a handler reloads is drawn only if it is still
 * the list the screen is on* — a handler nothing tears down asks whether the
 * loader it was sent with is still the screen's:
 *
 *     const drawing = onScreen.current
 *     await drawing(() => onScreen.current === drawing)
 *
 * A guard is a claim, and a claim no mutant can put at risk is unproved however
 * right it looks (#111). Twice now this population has been counted by an
 * instrument that could not see part of it: #266's read **`await <f>(<arrow>)`**
 * and so missed every unawaited pair, which is how `StudentGroups.js` and
 * `GradingWeights.js` reached #268 with no mutant of their own; #269 asked the
 * same question without that clause and found eleven unawaited sites. Both
 * measurements were made in `_local/`, which `.gitignore` covers, so **neither
 * could be run again** — *ask where a rule's own input is kept before trusting a
 * run that cites it* (#255). This is where it is kept.
 *
 * It is asked **by the mechanism** and not by a spelling (#174). Two questions:
 *
 * 1. **Which calls are a guard of this family?** A call with exactly one
 *    argument, that argument a function whose body compares something's
 *    `.current` with a plain identifier using `===`. Awaited or not: the clause
 *    that blinded the first two instruments is deliberately absent, and its
 *    absence is the point of this file.
 * 2. **Does anything break that guard?** Some script in `mutation/` that names
 *    this source file in its own `FILES` and holds the guard's **own line** in
 *    its text. That is the line a mutant's FROM text has to quote to edit the
 *    pair, read out of the catalogue rather than out of a sheet (#90).
 *
 * A guard nothing breaks is green only behind a **marker**, in a comment
 * anywhere in the same file:
 *
 *     // guard-no-mutant: <why nothing need break this guard> (#NNN)
 *
 * None carries one as of 6 พฤศจิกายน 2569, which is the figure to read first: on
 * that day the tree held **56 guards in 21 files and no bare one**, both
 * figures printed by the report rather than kept here by hand (#119) — every
 * site, the eleven unawaited ones included, is edited by a mutant of its own
 * file's catalogue, and each of the nine #269 was opened for is ⚙ on its
 * screen's own sheet with the row named beside the mutant. The ticket's *nine
 * sites with no row, no dated reason and no tracker* was false the day it was
 * written, and what refutes it is this question asked of the catalogue
 * (#66, #55).
 *
 * **22 of those 56 are answered per site and 34 per line**, and the report says
 * which: six screens write the family's line identically, so where a file holds
 * two guards whose lines read the same, one answer covers both - the limit under
 * *the other direction, which is silent* below, counted rather than only
 * described. All eleven unawaited sites are in the 22.
 *
 * What it cannot measure, written down because a count nobody can read the
 * limits of is the species of hand-kept number these exist to replace (#123):
 *
 * - **whether the mutant proves the guard's claim.** This reads that some
 *   mutant edits the guard's line. Whether a row dies on *its own* assertion
 *   when it does is what a sweep says and what the ⚙ on the screen's sheet
 *   stands for (#119). A mutant that was written and never run reads here
 *   exactly like one that killed a row (#208's count is the tell, one layer
 *   out).
 * - **a FROM text this script cannot find.** The catalogue is read as text, so
 *   a FROM built by `%`-formatting or by concatenating parts that split the
 *   guard's line is not found and the site is reported bare. That is the
 *   too-loose direction turned the safe way round: a red asking a person.
 * - **the other direction, which is silent.** The guard's line standing in a
 *   script's **TO** text, or inside a comment in it, counts as covered. So does
 *   a line a script quotes for a mutant about its neighbour - which still edits
 *   the pair when applied, and so is what this question asks, but is not a
 *   mutant written *for* this guard.
 * - **a guard whose comparison is not `.current === <identifier>`.**
 *   `onRows.current.of === readOf(page)` and `latest.current !== asked` are
 *   outside the population by construction: the first compares a property of a
 *   ref's value, the second is a refusal rather than this family's guard. Both
 *   are real guards somebody else's rows hold.
 * - **a mutant in another file.** Where the guard is in shared code the mutant
 *   may be keyed to the file that calls it; the population is the file the
 *   guard is written in, as #268 left it.
 * - **whether the screen's way in exists.** This finds a guard and asks what
 *   breaks it; whether a person can reach the state the guard is about is the
 *   row's question, and the marker's prose is where a *no* goes (#226, #250).
 *
 * Run: `npm run census` in `frontend/`. Its own fixtures: `npm run census:test`.
 * `--guards` lists every site and what breaks it.
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
    'guards-with-no-mutant: @babel/parser could not be required. It arrives ' +
      'with react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const FRONTEND = path.join(__dirname, '..')
const SRC = path.join(FRONTEND, 'src')
const MUTATION = path.join(FRONTEND, '..', 'mutation')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

// Everything after the colon to the end of the comment paragraph, for the
// reason `superseded-answers.js` gives: the reason is a paragraph and not a
// line, and the ticket number is read out of the same paragraph (#233).
const MARKER = /guard-no-mutant:([\s\S]+)/
const TICKET = /#\d+/

// Identifiers the parser hands back that are not a value this ref is *of*.
const SENTINELS = new Set(['undefined', 'NaN', 'Infinity'])

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

/**
 * The name a guard arrow compares a `.current` with, where there is one.
 *
 * `=== <name>` or `<name> ===`, one side a member expression ending in
 * `.current` and the other a plain identifier. A property of the ref's value
 * (`onRows.current.of`) is not it, because `.current` has to be the whole of
 * what is read.
 *
 * `undefined`, `NaN` and `Infinity` are identifiers to the parser, so they were
 * counted until the review of 6 พฤศจิกายน 2569 asked the too-loose direction
 * (#141): `onScreen.current === undefined` asks whether the ref has been
 * written, which is not *what is this value of* and belongs to nobody's row
 * here. No site writes one today - the exclusion is a claim about the question,
 * not a count.
 */
function comparedIn(argument) {
  if (
    !argument ||
    (argument.type !== 'ArrowFunctionExpression' && argument.type !== 'FunctionExpression')
  ) {
    return null
  }
  let found = null
  walk(argument, node => {
    if (found || node.type !== 'BinaryExpression' || node.operator !== '===') return
    const sides = [node.left, node.right]
    const current = sides.find(
      side =>
        side.type === 'MemberExpression' && side.property && side.property.name === 'current'
    )
    const other = sides.find(
      side => side.type === 'Identifier' && !SENTINELS.has(side.name)
    )
    if (current && other) found = { name: other.name, line: node.loc.start.line }
  })
  return found
}

/** Every guard of this family in a file, with the line its comparison is on. */
function guardsIn(ast) {
  const found = []
  walk(ast, node => {
    if (node.type !== 'CallExpression' || node.arguments.length !== 1) return
    const compared = comparedIn(node.arguments[0])
    if (!compared) return
    found.push({
      line: node.loc.start.line,
      compared: compared.name,
      // The line the comparison is written on, which is what a mutant's FROM
      // text has to quote. Not the call's line: the two differ wherever the
      // call is written over several lines.
      at: compared.line,
      callee: node.callee.type === 'Identifier' ? node.callee.name : '<expression>',
    })
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
  const guards = guardsIn(ast)
  if (guards.length === 0) return { guards: [], marker: null }
  return { guards, marker: markerIn(ast.comments || [], code) }
}

/**
 * The catalogue, as the question needs it: for each mutation script, the paths
 * it names and its whole text.
 *
 * Read as text and not as python: what is being asked is whether a script holds
 * a line, which needs no parse, and a reader that parses is a reader that can
 * fail to (two scripts' FROM texts are built with operators `ast.literal_eval`
 * refuses, and a site reported bare for that reason would be a silence).
 */
function catalogue(dir) {
  const scripts = []
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.py')) continue
    const text = fs.readFileSync(path.join(dir, name), 'utf8')
    const paths = new Set()
    for (const found of text.matchAll(/['"]((?:frontend\/)?src\/[\w./-]+\.js)['"]/g)) {
      paths.add(found[1].replace(/^frontend\//, ''))
    }
    scripts.push({ name, text, paths })
  }
  return scripts
}

/**
 * What breaks one guard: the scripts that name its file and hold its line.
 *
 * The line is compared trimmed, so a re-indentation does not blind the question
 * - the direction that matters, a count that silently drops a site being worse
 * than one that asks (#208).
 */
function brokenBy(file, line, scripts) {
  const text = line.trim()
  if (!text) return []
  return scripts
    .filter(script => script.paths.has(file) && script.text.includes(text))
    .map(script => script.name.split('-')[0])
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)
  const scripts = catalogue(MUTATION)

  const broken = []
  const shared = []
  const marked = []
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
    const lines = code.split('\n')

    for (const guard of found.guards) {
      const at = where + ':' + guard.line
      const text = (lines[guard.at - 1] || '').trim()
      const by = brokenBy('src/' + where, text, scripts)
      // How many guards of this file are written on a line of the same text:
      // one answer covers all of them, so a site in a group of more than one is
      // answered per **line** and not per site. Measured rather than only
      // described, because that is this script's own too-loose direction
      // (#247's limit one notch finer, from the file to the line).
      const siblings = found.guards.filter(
        other => (lines[other.at - 1] || '').trim() === text
      ).length
      if (by.length) {
        broken.push(
          at +
            ' ' +
            guard.callee +
            '(… === ' +
            guard.compared +
            ') ← ' +
            by.join(' ') +
            (siblings > 1 ? ' [line shared with ' + (siblings - 1) + ' in this file]' : '')
        )
        if (siblings > 1) shared.push(at)
      } else if (found.marker && found.marker.ok) {
        marked.push(at + ' — ' + found.marker.reason)
      } else if (found.marker) {
        problems.push({
          where,
          line: found.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      } else {
        problems.push({
          where,
          line: guard.at,
          why:
            'asks whether the read it is about is still the screen\'s, and no ' +
            'mutant of this file breaks it, so the claim is unproved (#111). ' +
            'The guards of this family lost their mutants twice by being ' +
            'invisible to the instrument that counted them (#266, #268, #269). ' +
            'Either write the mutant that drops this comparison, with the row ' +
            'it kills, or write `// guard-no-mutant: <why nothing need break ' +
            'this guard> (#NNN)` in this file',
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
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '') +
      ' · mutation scripts ' +
      scripts.length
  )
  console.log(
    '#140-family guards: broken by a mutant ' +
      broken.length +
      ' in ' +
      new Set(broken.map(entry => entry.split(':')[0])).size +
      ' files (of which answered per line, not per site, ' +
      shared.length +
      ') · marked ' +
      marked.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--guards')) for (const entry of broken) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, brokenBy, catalogue }
