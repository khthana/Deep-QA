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
 * #252 then added the fourth question below, on 30 ตุลาคม 2569: the owner
 * answered (ข้อ ง) that the **parent screen** says the same thing about a file
 * an import wrote, out of the answer `ImportPanel` now hands back through the
 * `onImported` it already called. That is the limit *a sentence in another
 * module* below, answered rather than only written down - and it is answered on
 * the parent's side of the seam, which is why this script can ask it at all.
 *
 * Asked by the mechanism and not by a spelling, in four questions:
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
 * 4. **Does it say the import sentence?** For a file in the population that
 *    mounts `ImportPanel` and hands it `onImported`, whether that attribute's
 *    own body names `SOME_IMPORTED_OUTSIDE` - #252. Asked of the sentence and
 *    not of any helper: three of the four ask their filter question with
 *    `someImportedOutside` and `Users` with a predicate of its own, its filter
 *    being three questions of which one cannot be asked of an import's answer
 *    at all (#256). The sentence is the one thing all four have in common.
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
 *   compare. Whether a child's sentence is in this species at all was the
 *   owner's, and it was #252: **answered on 30 ตุลาคม 2569** - the parent says
 *   it, which is question 4 above. What is still true of this limit is the
 *   general sentence: a loader or a success sentence a shared child says for
 *   itself is invisible here, and the one that is read now is read on the
 *   parent's side.
 * - **which mount, and which of a file's imports.** Question 4 is asked once per
 *   `ImportPanel` whose attribute is named `onImported`, so a mount that hands
 *   the callback through a variable, a spread or a wrapper is not seen, and a
 *   panel mounted with no `onImported` at all is not in the question - the six
 *   other screens that mount it are outside the species for the earlier reason,
 *   their lists not being filtered by state. That the handler asks the *right*
 *   filter question of the *right* key is what `252a`'s rows hold; all this
 *   reads is that the sentence is named inside it.
 * - **one marker for two questions.** A file carrying `// outside-the-filter:`
 *   is excused question 3 *and* question 4, because the mount loop reads the
 *   same verdict - so a marker written about a form's own save silences the
 *   import question with it, and nothing says so. Nothing in `src/` carries one
 *   as of 30 ตุลาคม 2569, so no site is excused today; the day one is written,
 *   its reason has to answer both or the second question needs a keyword of its
 *   own (#141 - a marker outlives the gap it documented).
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

// The fourth question, #252's - the shared panel whose own sentence this script
// cannot see. Asked by **mechanism**: which files mount that panel and hand it
// the callback it reports a finished import through, and whether that callback's
// own body says the sentence. Not by the name of any helper: three screens ask
// their filter question with `someImportedOutside` and `Users` with a predicate
// of its own, because its filter is three questions (#83's copied mechanism
// again). What makes a mount green is the **sentence**, which is the one thing
// all four have in common.
const PANEL = 'ImportPanel'
const HANDED = 'onImported'
const SAYS_IMPORTED = 'SOME_IMPORTED_OUTSIDE'

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

/**
 * Every mount of the shared import panel that is handed a finished-import
 * callback, and whether that callback's body says the import sentence - #252.
 *
 * The attribute is found rather than the component's props read, because the
 * panel is a module away and a census that followed the import would be
 * answering a different question. What it cannot see is in this file's docblock.
 */
function importsIn(ast) {
  const found = []
  walk(ast, node => {
    if (node.type !== 'JSXElement') return
    // `nameOf` answers for an `Identifier` and a component's tag is a
    // `JSXIdentifier`, so this reads the tag itself rather than going through it.
    const tag = node.openingElement.name
    if (!tag || tag.type !== 'JSXIdentifier' || tag.name !== PANEL) return
    for (const attribute of node.openingElement.attributes) {
      // A spread is a `JSXSpreadAttribute` and is gone by the line above, so
      // every attribute that reaches here has a name. The earlier
      // `attribute.name && …` read as defensive and was the opposite: it let a
      // nameless attribute fall through and be *counted*.
      if (attribute.type !== 'JSXAttribute') continue
      if (attribute.name.name !== HANDED) continue
      let says = false
      walk(attribute, inside => {
        if (inside.type === 'Identifier' && inside.name === SAYS_IMPORTED) says = true
      })
      found.push({ line: node.loc.start.line, says })
    }
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
  if (reads.length === 0) {
    return { reads: [], says: false, adds: [], imports: [], marker: null }
  }
  return {
    reads,
    says: saysSuccess(ast),
    adds: addsSentenceIn(ast),
    imports: importsIn(ast),
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
  const importing = []
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

    // #252's question, asked of the files this one's population holds: a screen
    // whose table is filtered and that mounts the shared import panel says the
    // import sentence out of the panel's own callback, or carries the marker.
    // One entry per mount and not per file, which is #247's own limit read on a
    // real site the day it landed (#226): a screen with two of these would be
    // green on the second.
    for (const mount of found.imports || []) {
      if (mount.says) {
        importing.push(where + ':' + mount.line)
        continue
      }
      if (verdict.kind === 'marked' && verdict.marker.ok) continue
      problems.push({
        where,
        line: mount.line,
        why:
          'mounts <' +
          PANEL +
          '> on a list filtered by ' +
          found.reads
            .filter(one => one.by.length)
            .flatMap(one => one.by)
            .join(', ') +
          ', and the ' +
          HANDED +
          ' it hands over says nothing when the file wrote rows outside that ' +
          'list. The owner answered that on 30 ตุลาคม 2569 (#252, ข้อ ง): the ' +
          'parent screen says it, out of the answer the panel hands back. Ask ' +
          'this screen\'s own filter question of `result` and say ' +
          '`' +
          SAYS_IMPORTED +
          '` from `lib/outsideTheFilter.js`, or write ' +
          '`// outside-the-filter: <why an import on this screen cannot write ' +
          "outside its own filter> (#NNN)` in this file",
      })
    }
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
      ' · importing ' +
      importing.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--saying')) for (const entry of saying) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--importing'))
    for (const entry of importing) console.log('  ' + entry)
  for (const entry of unclassified) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify }
