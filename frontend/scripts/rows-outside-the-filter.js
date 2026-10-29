/**
 * The census #247 asked for: which screens tell a person that the row they just
 * saved is not in the list they are looking at.
 *
 * The rule is the owner's answer ข้อ จ of 29 ตุลาคม 2569. A screen whose table is
 * filtered and whose form can write outside that filter says one shared
 * sentence - `lib/outsideTheFilter.js`'s `OUTSIDE_THE_FILTER` - after its own.
 * Until that day the save said *บันทึกข้อมูลเรียบร้อยแล้ว* over a list that did not
 * hold the row, and nothing on the screen said where it had gone.
 *
 * #247 was written about one screen. The population was measured by the
 * mechanism and came back seven (#174, #223), and the rule landed on all seven
 * in one ticket because a constraint binds every path (#166). Two of them -
 * `Plos` and `Users` - have rows, in `247a` and `247b`. **This holds the other
 * five**, which is what a census is for (#68).
 *
 * Asked by the mechanism and not by a spelling, in three questions:
 *
 * 1. **Does the file read a filtered list?** A call to a `listSomething(...)`
 *    with an object argument that hands it a value the file holds in `useState`
 *    - the filter the table is on. `page` and `per_page` are left out by name:
 *    a row on another page of the same filter is a different question and a
 *    different ticket (#209, #239). A spread of a state object counts, which is
 *    how `Users.js` passes its three.
 * 2. **Does the file say a success sentence?** An object with `error: false` in
 *    it, which is the one shape these screens hand to `setNotice`. A screen with
 *    a filtered list and nothing to say after a write - a picker, a report - is
 *    not in the population at all.
 * 3. **Does it add the shared sentence?** A call to `alsoOutside`. Not a search
 *    for the words: the sentence lives in one constant and a screen that typed
 *    it again would be a string a grep for the words cannot find (#111, #124).
 *
 * A file in the population that calls `alsoOutside` nowhere is green only behind
 * a **marker**, in a comment anywhere in the same file:
 *
 *     // outside-the-filter: <why this screen's form cannot write outside its
 *     // own filter> (#NNN)
 *
 * None carries one as of 29 ตุลาคม 2569, because all seven say the sentence. A
 * marker is a claim like any other (#141), so each would be printed with its
 * reason and the day that screen's picker opens the marker is an exemption with
 * nothing to say so (#93).
 *
 * What it cannot measure, written down because a count nobody can read the
 * limits of is the species of hand-kept number these exist to replace (#123):
 *
 * - **whether the form can write outside the filter at all.** This finds a
 *   filtered read and a sentence; it cannot ask whether the field that writes
 *   that key is reachable - `PloForm` opens its หลักสูตร on an add and locks it
 *   on an edit, `SubjectForm` leaves its ภาควิชา open on both, and `Students`
 *   has no edit to ask about. That is what the marker's reason would be for, and
 *   it is prose a person has to read (#226).
 * - **which sentence.** The question is asked of the file, not of each
 *   `error: false` object, so a screen that wraps one success sentence and
 *   leaves another bare is green. A removal's sentence is deliberately not this
 *   rule's - a row that was deleted is outside every list - and separating the
 *   two by mechanism would need the species of each write, which this does not
 *   read. `pager-last-page.js` has the same limit one layer along.
 * - **whether the comparison is right.** That `outsideFilter` compares the
 *   filter with the value the save wrote, as text, is what `247a`'s two rows,
 *   `247b`'s five and `247c`'s two hold. All this reads is that the call is
 *   there.
 * - **a filter this script cannot follow.** Where the value handed to the list
 *   read is not a bare identifier or a spread of one - a member expression, a
 *   call, a literal - the read is reported as unclassified and named, not
 *   guessed at.
 * - **which read is the table's.** A form's own parent pool, read with a choice
 *   the file also holds in state, counts as a filtered read too -
 *   `Plos.js`'s `listPlos({ program_id: formProgram })` is one, which is why
 *   that screen is reported *by program_id, program_id*.
 *   It changes no verdict, the question being asked of the file; it would
 *   matter the day a screen's only filtered read were a pool.
 * - **a read, or a sentence, in another module.** The population is the page
 *   file, as #198 left the landing rule: a loader extracted into a hook would
 *   be invisible here, and so is a success sentence a shared child says for
 *   itself. `ImportPanel` is the real one - *นำเข้าสำเร็จ N รายการ* is said
 *   inside the panel, and it is mounted on four of these seven screens
 *   (`ProgramSubjects`, `Students`, `Subjects`, `Users`), over rows a CSV can
 *   put outside the parent's filter, with no filter handed to the panel to
 *   compare. Whether a child's sentence is in this species at all is the
 *   owner's, and it is #252.
 * - **whether a marker's reason is still true**, which is #93's rule and the
 *   reason a marker carries a ticket number.
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
    'rows-outside-the-filter: @babel/parser could not be required. It arrives ' +
      'with react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The keys a pager owns. A row on another page is #209's question, not this one. */
const PAGINATION = new Set(['page', 'per_page'])

/** The one spelling of the join, which is what makes this question answerable. */
const ADDS = 'alsoOutside'

/**
 * The shapes a filter could be hiding in that this script will not walk into.
 *
 * A literal or a name the file does not hold in state is simply not a filter -
 * the read is the same read every time - so neither is reported. These two are
 * the ones where the answer depends on something elsewhere, and a census that
 * guessed at them would be evidence for the guess (#174).
 */
const FOLLOWED = new Set(['MemberExpression', 'CallExpression'])

// Everything after the colon to the end of the comment paragraph, for the
// reason `superseded-answers.js` gives: the reason is a paragraph and not a
// line, and the ticket number is read out of the same paragraph (#233).
const MARKER = /outside-the-filter:([\s\S]+)/
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

/** The name a property's key is written with, quoted or not. */
const keyOf = property => {
  if (!property.key) return null
  if (property.key.type === 'Identifier') return property.key.name
  if (property.key.type === 'StringLiteral') return property.key.value
  return null
}

/** Everything the file holds in `useState`, by the name the value is bound to. */
function stateIn(ast) {
  const names = new Set()
  walk(ast, node => {
    if (node.type !== 'VariableDeclarator') return
    if (!node.init || node.init.type !== 'CallExpression') return
    if (nameOf(node.init.callee) !== 'useState') return
    if (!node.id || node.id.type !== 'ArrayPattern') return
    const first = node.id.elements[0]
    if (first && first.type === 'Identifier') names.add(first.name)
  })
  return names
}

/**
 * Every read of a filtered list, with the state it is filtered by.
 *
 * `listSomething({ ... })` and nothing narrower: what makes a read *the table's*
 * is that it is handed the state a filter control writes, not which module it
 * came from or what the screen is about.
 */
function filteredReadsIn(ast, state) {
  const found = []
  walk(ast, node => {
    if (node.type !== 'CallExpression') return
    const called = nameOf(node.callee)
    if (!called || !/^list[A-Z]/.test(called)) return
    const options = node.arguments.find(one => one && one.type === 'ObjectExpression')
    if (!options) return

    const by = []
    let unreadable = null
    for (const property of options.properties) {
      if (property.type === 'SpreadElement') {
        const spread = nameOf(property.argument)
        if (spread && state.has(spread)) by.push('...' + spread)
        else if (!spread) unreadable = 'a spread this script cannot follow'
        continue
      }
      if (property.type !== 'ObjectProperty') continue
      const key = keyOf(property)
      if (!key || PAGINATION.has(key)) continue
      const value = nameOf(property.value)
      if (value && state.has(value)) by.push(key)
      // A name the file does not hold in state, or a constant, is not a filter:
      // a read keyed on either is the same read every time. What this cannot
      // say is whether something it has to walk into - a member expression, a
      // call - is one, so those are named rather than guessed at.
      else if (!value && FOLLOWED.has(property.value && property.value.type)) {
        unreadable = 'a filter written as ' + property.value.type + ', which this script cannot follow'
      }
    }
    if (by.length) found.push({ line: node.loc.start.line, called, by })
    else if (unreadable) found.push({ line: node.loc.start.line, called, by: [], unreadable })
  })
  return found
}

/** Does the file say a success sentence at all? The shape all seven use. */
function saysSuccess(ast) {
  let found = false
  walk(ast, node => {
    if (node.type !== 'ObjectExpression') return
    for (const property of node.properties) {
      if (property.type !== 'ObjectProperty') continue
      if (keyOf(property) !== 'error') continue
      if (property.value && property.value.type === 'BooleanLiteral' && !property.value.value) {
        found = true
      }
    }
  })
  return found
}

/** Where the file hands a sentence through the shared join. */
function addsSentenceIn(ast) {
  const found = []
  walk(ast, node => {
    if (node.type !== 'CallExpression') return
    if (nameOf(node.callee) !== ADDS) return
    found.push(node.loc.start.line)
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
  const reads = filteredReadsIn(ast, stateIn(ast))
  if (reads.length === 0) return { reads: [], says: false, adds: [], marker: null }
  return {
    reads,
    says: saysSuccess(ast),
    adds: addsSentenceIn(ast),
    marker: markerIn(ast.comments || [], code),
  }
}

/** What one file is, given everything it holds. */
function classify(found) {
  const readable = found.reads.filter(one => one.by.length)
  if (readable.length === 0) {
    return found.reads.length ? { kind: 'unclassified' } : { kind: 'outside' }
  }
  if (!found.says) return { kind: 'outside' }
  if (found.adds.length) return { kind: 'saying', at: found.adds }
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

  const saying = []
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

    const verdict = classify(found)
    const first = found.reads[0]
    if (verdict.kind === 'outside') continue
    if (verdict.kind === 'saying') {
      saying.push(
        where +
          ':' +
          first.line +
          ' (by ' +
          found.reads
            .filter(one => one.by.length)
            .flatMap(one => one.by)
            .join(', ') +
          ' → ' +
          where +
          ':' +
          verdict.at.join(', :') +
          ')'
      )
    } else if (verdict.kind === 'unclassified') {
      unclassified.push(
        where + ':' + first.line + ' ' + (first.unreadable || 'a filter this script cannot follow')
      )
    } else if (verdict.kind === 'marked' && verdict.marker.ok) {
      marked.push(where + ':' + verdict.marker.line + ' — ' + verdict.marker.reason)
    } else if (verdict.kind === 'marked') {
      problems.push({
        where,
        line: verdict.marker.line,
        why: 'marker needs a reason of its own and a ticket number',
      })
    } else {
      problems.push({
        where,
        line: first.line,
        why:
          'reads a list filtered by ' +
          found.reads
            .filter(one => one.by.length)
            .flatMap(one => one.by)
            .join(', ') +
          ' and says a success sentence over it with nothing telling the person ' +
          'when the row they saved is not in that list. The owner answered that ' +
          'on 29 ตุลาคม 2569 (#247): the screen says its own sentence and then the ' +
          'shared one. Either hand the message through `alsoOutside` from ' +
          '`lib/outsideTheFilter.js`, or write `// outside-the-filter: <why this ' +
          "screen's form cannot write outside its own filter> (#NNN)` in this file",
      })
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
    'filtered screens that save: saying ' +
      saying.length +
      ' · marked ' +
      marked.length +
      ' · unclassified ' +
      unclassified.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--saying')) for (const entry of saying) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  for (const entry of unclassified) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify }
