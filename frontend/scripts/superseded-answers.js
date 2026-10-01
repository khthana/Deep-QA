/**
 * The census #133, #140 and #141 ran by hand, as an instrument that fails.
 *
 * The family: a screen asks for something, the answer comes back, and what is
 * drawn is the answer to a request the screen is no longer showing. #68 found
 * sixteen of them by grepping `set…(await …)`; #133 found twenty-two by walking
 * every `await` instead, because the sites that name the answer first are
 * invisible to that grep; #141 re-measured the list and found two more that
 * **carried no flag at all** - `GrantsPanel.add` and `.remove` - which the
 * earlier census could not see, because its population was *the functions that
 * already carry a flag*. A census of what carries the flag cannot find the site
 * that carries none. That is what this file is for: the population here is
 * every `await` in the tree, and the question is asked of the code rather than
 * of a list somebody keeps.
 *
 * What it asks, per `await`:
 *
 * 1. Does the answer reach the screen? Either the `await` is itself the
 *    argument of a `set…` call, or it is bound to a name that a `set…` call in
 *    the same function reads. Anything else is not this family: an answer
 *    handed to `window.open` through `showPdf` gets its own tab, and an answer
 *    nobody draws cannot be drawn late.
 * 2. If it does, is the drawing guarded? Two shapes count, because both are in
 *    the tree: a predicate the function is handed and calls (`isCurrent()`,
 *    the shape #133 and #140 settled on), and a `useRef` the function compares
 *    its own ticket against. The comparison is read **both ways round** -
 *    `ticket !== latest.current` and `latest.current !== ticket` are the same
 *    guard, and the first pass at this census matched only one of them and
 *    reported two guarded screens as bare (#141).
 * 3. If it is neither, the site must carry a marker saying why, with a reason
 *    and a ticket number. A marker is a claim like any other, so every one of
 *    them is counted and printed, and the script says nothing is wrong only
 *    when each unguarded drawing site has one.
 *
 * The marker, in a comment inside the function or directly above it:
 *
 *     // superseded-answer: <why this one cannot be drawn late> (#NNN)
 *
 * It is deliberately not a list in this file. A tool that skips things by name
 * lies the day a file is added (#126), and the whole point of the population
 * being *every await* is that a new site cannot arrive unseen. For the same
 * reason the script fails on a file extension it cannot parse rather than
 * walking past it, and prints what it read.
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
    'superseded-answers: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

// Everything after the colon, to the end of the comment: the reason is a
// paragraph rather than a line, and reading only its first line is how the first
// pass at this rejected all six of its own markers for naming no ticket.
const MARKER = /superseded-answer:([\s\S]+)/
const TICKET = /#\d+/

const FUNCTIONS = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
])

function filesUnder(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) filesUnder(full, out)
    else out.push(full)
  }
  return out
}

/** Every node, with the chain of nodes above it. */
function walk(node, visit, parents = []) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, parents)
    return
  }
  if (typeof node.type !== 'string') return
  visit(node, parents)
  const next = parents.concat(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
    if (key === 'innerComments') continue
    walk(node[key], visit, next)
  }
}

/** The names a binding pattern introduces, destructuring included. */
function boundNames(pattern, out = []) {
  if (!pattern) return out
  switch (pattern.type) {
    case 'Identifier':
      out.push(pattern.name)
      break
    case 'ObjectPattern':
      for (const property of pattern.properties)
        boundNames(property.value || property.argument, out)
      break
    case 'ArrayPattern':
      for (const element of pattern.elements) boundNames(element, out)
      break
    case 'AssignmentPattern':
      boundNames(pattern.left, out)
      break
    case 'RestElement':
      boundNames(pattern.argument, out)
      break
    default:
      break
  }
  return out
}

const isSetter = node =>
  node.type === 'CallExpression' &&
  node.callee.type === 'Identifier' &&
  /^set[A-Z]/.test(node.callee.name)

function identifiersIn(node) {
  const names = new Set()
  walk(node, inner => {
    if (inner.type === 'Identifier') names.add(inner.name)
  })
  return names
}

/**
 * Does this `await`'s answer reach a state setter?
 *
 * `set…(await f())` is the shape #68 grepped for. The other is a name: the
 * answer is bound, and a setter in the same function reads that name - which is
 * how the six sites #133 found beyond the grep are written, and the reason this
 * asks about names rather than about expressions.
 */
function drawsTheAnswer(awaitNode, parents, fn) {
  const parent = parents[parents.length - 1]
  if (parent && isSetter(parent) && parent.arguments.includes(awaitNode)) return true

  const declarator = [...parents].reverse().find(node => node.type === 'VariableDeclarator')
  const names = declarator ? boundNames(declarator.id) : []
  if (!names.length) return false

  let drawn = false
  walk(fn.body, node => {
    if (drawn || !isSetter(node)) return
    const read = identifiersIn(node.arguments)
    if (names.some(name => read.has(name))) drawn = true
  })
  return drawn
}

/**
 * Is this expression read for an answer rather than called for an effect?
 *
 * True inside the test of an `if` or of a `?:`, or as what a `return` hands
 * back - the places where the value decides. `!`, `&&` and `||` are walked
 * *through* rather than counted: being an operand of `||` is not deciding
 * anything, which is the whole of the difference between `if (isCurrent() && x)`
 * and `cached || onDone()` - the second calls a parameter for its effect and
 * reads as a guard if the operator alone is taken for one.
 */
function decidesSomething(node, parents) {
  let child = node
  for (let index = parents.length - 1; index >= 0; index--) {
    const parent = parents[index]
    if (parent.type === 'LogicalExpression') {
      child = parent
      continue
    }
    if (parent.type === 'UnaryExpression' && parent.operator === '!') {
      child = parent
      continue
    }
    if (
      (parent.type === 'IfStatement' || parent.type === 'ConditionalExpression') &&
      parent.test === child
    )
      return true
    if (parent.type === 'ReturnStatement' && parent.argument === child) return true
    return false
  }
  return false
}

/**
 * Is the drawing guarded? Returns which shape, or null.
 *
 * `flag` - the function is handed a predicate, calls it, and **decides
 * something by the answer**. Two things make it a guard and both are needed:
 * the parameter, because `isCurrent()` only answers *is the screen still where
 * it was* if the caller is the one who decides what it returns; and the
 * condition, because `onError(error)` and `onImported()` are calls to
 * parameters too, and counting those found `GrantsPanel` still guarded after
 * every `isCurrent()` in it had been taken out - a census that would have
 * reported the defect #133 fixed as fixed whatever the code said.
 *
 * `ref` - the function compares something against a `.current`, in either
 * order. Matching one order only is what made the first pass at this census
 * report `SectionResults` and `StudentResults` as bare (#141).
 */
function guardShape(fn) {
  const parameters = new Set(fn.params.flatMap(parameter => boundNames(parameter)))
  let shape = null
  walk(fn.body, (node, parents) => {
    if (shape) return
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      parameters.has(node.callee.name) &&
      decidesSomething(node, parents)
    )
      shape = 'flag'
    if (node.type === 'BinaryExpression' && (node.operator === '!==' || node.operator === '===')) {
      for (const side of [node.left, node.right])
        if (
          side.type === 'MemberExpression' &&
          !side.computed &&
          side.property.type === 'Identifier' &&
          side.property.name === 'current'
        )
          shape = 'ref'
    }
  })
  return shape
}

/**
 * Does this comment sit directly above that statement?
 *
 * Asked of the source rather than of babel's `leadingComments`, because a
 * `const load = useCallback(async () => {…})` carries its JSDoc on the
 * declaration and not on the arrow function inside it - which is how every
 * function in this tree that has a reason written above it is written. True
 * when nothing but whitespace and other comments lies between the two.
 */
function leads(comment, statement, comments, code) {
  if (comment.end > statement.start) return false
  let gap = code.slice(comment.end, statement.start)
  for (const other of comments) {
    if (other === comment || other.start < comment.end || other.end > statement.start) continue
    gap =
      gap.slice(0, other.start - comment.end) +
      ' '.repeat(other.end - other.start) +
      gap.slice(other.end - comment.end)
  }
  return /^\s*$/.test(gap)
}

/**
 * The marker for this function, if it carries one.
 *
 * Inside the function, or in the comments directly above it - a reason written
 * as the JSDoc of the function it is about is where this repository already
 * puts them (`PloMapping.choose`), so both places count. The reason has to say
 * something and has to name a ticket: a marker with neither is the prose that
 * #141 exists because of.
 *
 * A marker written as a run of `//` lines is one marker. Babel hands those over
 * as one node per line, so reading only the node the words start in takes the
 * reason's first line and rejects it for naming no ticket - which is what the
 * ticket number being in the last sentence makes of every such marker.
 */
function markerFor(fn, statement, comments, code) {
  for (const [index, comment] of comments.entries()) {
    const inside = comment.start >= fn.start && comment.end <= fn.end
    if (!inside && !(statement && leads(comment, statement, comments, code))) continue
    const hit = MARKER.exec(comment.value)
    if (!hit) continue
    let text = hit[1]
    if (comment.type === 'CommentLine')
      for (let next = index + 1; next < comments.length; next++) {
        const after = comments[next]
        if (after.type !== 'CommentLine') break
        if (after.loc.start.line !== comments[next - 1].loc.end.line + 1) break
        if (MARKER.test(after.value)) break
        text += '\n' + after.value
      }
    const reason = text
      .replace(/^[ \t]*\*[ \t]?/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
    return { reason, ok: reason.length >= 20 && TICKET.test(reason), line: comment.loc.start.line }
  }
  return null
}

/**
 * One file's answer, so the fixtures in `superseded-answers.test.js` can ask
 * the same question of a snippet that the run asks of the tree. An instrument
 * that has never been seen to fail is the species of assertion #124 is about.
 *
 * Returns one entry per **line** that draws an answer - `await send(await
 * file.text())` is one place where one answer is drawn, and counting it twice
 * would make the instrument's own figures wrong in the direction nobody checks.
 * Throws on a file it cannot parse; the caller decides what that is worth.
 */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  const lines = new Set()
  const sites = []
  let awaits = 0

  walk(ast.program, (node, parents) => {
    if (node.type !== 'AwaitExpression') return
    awaits++
    lines.add(node.loc.start.line)
    const fn = [...parents].reverse().find(parent => FUNCTIONS.has(parent.type))
    if (!fn) return
    if (!drawsTheAnswer(node, parents, fn)) return
    const line = node.loc.start.line
    if (sites.some(site => site.line === line)) return

    const guard = guardShape(fn)
    if (guard) {
      sites.push({ line, guard })
      return
    }
    const statement = [...parents]
      .reverse()
      .find(
        parent =>
          /(Statement|Declaration)$/.test(parent.type) &&
          parent.start <= fn.start &&
          parent.end >= fn.end
      )
    sites.push({ line, marker: markerFor(fn, statement, comments, code) })
  })

  return { awaits, awaitLines: lines.size, sites }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  let awaits = 0
  let awaitLines = 0
  let drawing = 0
  const guarded = []
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
    awaits += found.awaits
    awaitLines += found.awaitLines
    drawing += found.sites.length

    for (const site of found.sites) {
      const at = where + ':' + site.line
      if (site.guard) {
        guarded.push(at + ' (' + site.guard + ')')
      } else if (!site.marker) {
        problems.push({
          where,
          line: site.line,
          why:
            'draws its answer with no guard and no marker. Either guard it, or ' +
            'write `// superseded-answer: <why> (#NNN)` in the function',
        })
      } else if (!site.marker.ok) {
        problems.push({
          where,
          line: site.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      } else {
        marked.push(at + ' — ' + site.marker.reason)
      }
    }
  }

  for (const file of unreadable)
    problems.push({
      where: shown(file),
      line: 0,
      why: 'is code this script is not set up to parse, so it was not read',
    })

  // What it did not look at, said out loud **by name**: a tool that cannot say
  // that is the same species as the hand-kept numbers it replaces (#123), and a
  // bare count is not saying it - `CODE` is a list of extensions, so the day a
  // `.vue` or a `.svelte` arrives it lands here and the run stays green. A
  // `.jsx` makes the run red on its own; this line is for the extension the list
  // has never heard of, printed so that a new one shows up as a new word and not
  // as a number nobody was watching.
  const ignored = everything.filter(
    file => !CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
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
    'awaits ' +
      awaits +
      ' on ' +
      awaitLines +
      ' lines · drawing the answer ' +
      drawing +
      ' · guarded ' +
      guarded.length +
      ' · marked ' +
      marked.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--guarded')) for (const entry of guarded) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
