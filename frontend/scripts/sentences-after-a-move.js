/**
 * The census #202 ran by hand, as an instrument that fails.
 *
 * The family: a handler writes something, the answer comes back, and the
 * screen says *saved* over a screen the person has since moved to. #146 asked
 * the question at `save` - *the answer belongs to the screen that sent it, not
 * to the screen it finds* - and #202 found fifteen sentences in handlers that
 * are not `save` saying it anyway, on nine screens.
 *
 * #202 measured that by hand twice and both counters were wrong, in three
 * ways, because both read a window of lines **above** the sentence:
 *
 * 1. `if (reloaded && onScreen.current === sent) setNotice(said)` puts the
 *    guard on the sentence's own line, which a window above cannot see.
 * 2. `if (await reload(said))` puts it *below*.
 * 3. `if (onScreen.current === asked) setData(answer)` directly above a
 *    sentence is a one-line `if` that encloses nothing but itself, so a window
 *    above reads a guard that guards something else - and that is the way that
 *    decided a site's fate, `ActivityScores.save` having been filed under
 *    *asking* for a fortnight on the strength of it.
 *
 * So the question here is asked of the **enclosure** rather than of a window:
 * is this sentence inside something that asks whether the screen is still the
 * one that asked? A census is evidence about the property it counted (#174),
 * and the property that matters is enclosure.
 *
 * What it asks, per sentence:
 *
 * 1. Is it a sentence at all? A `set...` call handed an object with
 *    `error: false`, directly or by a name bound in the same function - the
 *    second shape is how `SubjectStudents.add` and `.remove` are written, and a
 *    census that only read the literal would miss them.
 * 2. Is there an `await` before it in the same function? A sentence said
 *    without waiting for anything cannot be late.
 * 3. Is it enclosed by the question? Four shapes count, because all four are in
 *    the tree or were proposed for it: a `.current` comparison in the test of
 *    an `if` or a `?:` the sentence sits inside, read **both ways round**
 *    (#141); the same comparison bound to a name the test reads, which is how
 *    `Offerings.save` is written; a predicate the function is **handed** and
 *    calls, which is #133's shape; and a preceding `if (...) return` in the
 *    same block.
 *
 *    #152's flag is deliberately **not** one of them. `const reloaded = await
 *    load(() => onScreen.current === load)` reads as a ref comparison to any
 *    instrument that greps, and it is not one: `load` ends its `try` with
 *    `return true` whether or not the predicate held, so the flag means *the
 *    read was not refused* and never *it drew*. That is why a called predicate
 *    counts only when the callee is a **parameter** of the function - then the
 *    caller is the one who decides what it answers.
 * 4. If it is not enclosed, the site must carry a marker saying why, with a
 *    reason and a ticket number. A marker is a claim like any other, so every
 *    one is counted and printed.
 * 5. For a guard that reads a ref: what can that ref tell apart? #226 asked it
 *    after #143, where `showing.current === sent` on `Offerings` was counted
 *    `enclosed (ref)` and is a ref meaning *the last thing that opened on this
 *    screen* (#146) - it cannot tell one Offering's panel from another's,
 *    neither of them having opened anything. The report said `(ref)` and
 *    anybody reading it as *this site knows where the person went* read it
 *    wrongly, which is #208's blind spot one layer along: not *it cannot find
 *    the guard* but *it found one and counted it as enough*.
 *
 *    The label is read off the ref's **writes**, never off a list of ref names
 *    (#126): `opened` when every write is a fresh sentinel - `{}`, `[]`, `null`,
 *    `undefined`, a boolean, `0`, `''`, a zero-argument `Map`, `Set`, `WeakMap`
 *    or `WeakSet`, or a name bound to one of those - because such a value
 *    carries no position and can only answer *has anything opened since*; `position` when a write carries a
 *    value, as `onScreen.current = load` does, a loader being rebuilt on its own
 *    dependencies and so changing the moment the question changes; `mixed` when
 *    both, which nothing in this tree is today; and `unwritten` when nothing in
 *    the file writes it. Where a test reads two refs the strongest answer wins,
 *    because the guard can tell apart whatever any of its refs can.
 *
 * The marker, in a comment inside the function or directly above it:
 *
 *     // sentence-after-a-move: <why this one may speak anyway> (#NNN)
 *
 * Six sites carry one today: the four `save` handlers whose form replaces the
 * table and disables everything while the write is out, so the guard would be a
 * clause no row could reach (#97); and `Offerings.onSection` and
 * `ActivityScores.save`, where the owner's decision is that the sentence is
 * about the write the person made rather than about the panel in front of them.
 *
 * It is deliberately not a list in this file. A tool that skips things by name
 * lies the day a file is added (#126); the population being *every sentence
 * after an await* is what makes a new site arrive seen.
 *
 * What it cannot measure, written down because a tool that cannot say what it
 * did not look at is the species of the hand-kept numbers it replaces (#123,
 * #126, #132):
 *
 * - Whether the screen **has** a move the ref cannot see. It reads the ref's
 *   writes, not the screen's controls. The loader's own dependency list is where
 *   that is read, and on 25 October 2569 it said: of the 19 `opened` sites, 15
 *   are on screens whose loader is keyed on route parameters alone, where a move
 *   away is a route change; 4 are on screens that set a dependency themselves -
 *   `Offerings.js:567` (pager, curriculum, year, semester), `Plos.js:354`
 *   (curriculum) and `Users.js:293` and `:386` (filters, pager).
 * - Whether such a move is **reachable while the write is out**, which is a
 *   question about `disabled` and about what a dialog covers, and only the
 *   browser can answer it. #210 gave six administration pagers the flag; #238
 *   measured that no screen's filter has it.
 * - Whether the sentence **should** be silent after a move. That is the owner's
 *   (`docs/06` §Out of Scope): answered for `Offerings` on 21 October 2569
 *   (#143 - the banner is about the write and says which Offering it is of), and
 *   open for `Users` as #238's first question.
 * - A ref born `React.useRef(...)`, or through an aliased import, which reads as
 *   no birth at all: the label is then `unwritten` while something did write it.
 *   Nothing in the tree is written that way on 25 October 2569.
 * - A ref written with a **non-empty** literal - `showing.current = 'page-2'` -
 *   which reads as a value and so takes `position`. That is the cautious
 *   direction and it may be an overclaim, a constant being the same every time.
 *   Nothing in the tree writes one.
 * - Which **function** a name was bound in. The name-to-value map is read over
 *   the whole file, so a `const ask = {}` in one handler answers for another
 *   handler's `ask`. That direction understates - it can only turn a `position`
 *   into an `opened` - and the shape it would need is two handlers binding one
 *   name to different kinds of thing.
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
    'sentences-after-a-move: @babel/parser could not be required. It arrives ' +
      'with react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

const MARKER = /sentence-after-a-move:([\s\S]+)/
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

/** Does this object literal say `error: false`? */
const saysSuccess = node =>
  node &&
  node.type === 'ObjectExpression' &&
  node.properties.some(
    property =>
      property.type === 'ObjectProperty' &&
      !property.computed &&
      property.key.type === 'Identifier' &&
      property.key.name === 'error' &&
      property.value.type === 'BooleanLiteral' &&
      property.value.value === false
  )

/** The object literals bound to a name inside this function. */
function literalsByName(fn) {
  const found = new Map()
  walk(fn.body, node => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') return
    if (node.init && node.init.type === 'ObjectExpression') found.set(node.id.name, node.init)
  })
  return found
}

/** Is this `.current` in a `===`/`!==`, either way round? */
const comparesARef = node => {
  let yes = false
  walk(node, inner => {
    if (yes) return
    if (inner.type !== 'BinaryExpression') return
    if (inner.operator !== '===' && inner.operator !== '!==') return
    for (const side of [inner.left, inner.right])
      if (
        side.type === 'MemberExpression' &&
        !side.computed &&
        side.property.type === 'Identifier' &&
        side.property.name === 'current'
      )
        yes = true
  })
  return yes
}

/**
 * The names bound in this function to a `.current` comparison.
 *
 * `const mine = showing.current === sent` then `if (mine)` is one guard written
 * in two lines, and it is how `Offerings.save` is written - a census that only
 * read the test would report that screen bare.
 */
function namesHoldingTheQuestion(fn) {
  const names = new Map()
  walk(fn.body, node => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') return
    if (node.init && node.init.type !== 'AwaitExpression' && comparesARef(node.init))
      names.set(node.id.name, node.init)
  })
  return names
}

/**
 * The `x` of every `x.current` in this node - the refs a guard is asking.
 *
 * A name bound to the comparison is followed into its own expression, because
 * `const mine = showing.current === sent` is the same question about the same
 * ref, written in two lines.
 */
function refsRead(node, named) {
  const refs = new Set()
  const collect = where =>
    walk(where, inner => {
      if (
        inner.type === 'MemberExpression' &&
        !inner.computed &&
        inner.property.type === 'Identifier' &&
        inner.property.name === 'current' &&
        inner.object.type === 'Identifier'
      )
        refs.add(inner.object.name)
      if (inner.type === 'Identifier' && named.has(inner.name)) collect(named.get(inner.name))
    })
  collect(node)
  return [...refs]
}

const identifiersIn = node => {
  const names = new Set()
  walk(node, inner => {
    if (inner.type === 'Identifier') names.add(inner.name)
  })
  return names
}

/**
 * Does this test ask whether the screen is still the one that asked?
 *
 * `parameters` are the function's own, because a called predicate is only that
 * question when the caller decides what it answers (#133). A local `await`'s
 * answer is not: #152's flag reads exactly like one and means *not refused*.
 */
function asksTheQuestion(test, fn, parameters, named) {
  if (!test) return null
  if (comparesARef(test)) return 'ref'
  const read = identifiersIn(test)
  for (const name of named.keys()) if (read.has(name)) return 'ref by name'
  let flag = null
  walk(test, node => {
    if (flag) return
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      parameters.has(node.callee.name)
    )
      flag = 'flag'
  })
  return flag
}

/** Statements that leave the function. */
const leaves = node => {
  let yes = false
  walk(node, inner => {
    if (inner.type === 'ReturnStatement' || inner.type === 'ThrowStatement') yes = true
  })
  return yes
}

/**
 * Is the sentence enclosed by the question? Returns which shape, or null.
 *
 * Enclosure, not proximity. Walking up from the sentence to its function, a
 * guard counts when the sentence is inside the branch the test chose - which is
 * what tells `if (ref.current === sent) { say() }` from the one-line
 * `if (ref.current === asked) setData(answer)` written directly above a
 * sentence that is not inside it (#202's third misreading).
 *
 * The other shape is a `if (ref.current !== sent) return` earlier in a block the
 * sentence is in: the question asked by leaving rather than by enclosing.
 */
function enclosure(sentence, parents, fn) {
  const parameters = new Set(fn.params.flatMap(parameter => boundNames(parameter)))
  const named = namesHoldingTheQuestion(fn)
  const found = (shape, test) => ({ shape, refs: refsRead(test, named) })
  let child = sentence
  for (let index = parents.length - 1; index >= 0; index--) {
    const parent = parents[index]
    if (parent === fn) break
    if (parent.type === 'IfStatement' && parent.consequent === child) {
      const shape = asksTheQuestion(parent.test, fn, parameters, named)
      if (shape) return found(shape, parent.test)
    }
    if (
      parent.type === 'ConditionalExpression' &&
      (parent.consequent === child || parent.alternate === child)
    ) {
      const shape = asksTheQuestion(parent.test, fn, parameters, named)
      if (shape) return found(shape, parent.test)
    }
    if (parent.type === 'BlockStatement' || parent.type === 'Program') {
      for (const statement of parent.body) {
        if (statement.start >= child.start) break
        if (statement.type !== 'IfStatement' || statement.alternate) continue
        if (!leaves(statement.consequent)) continue
        const shape = asksTheQuestion(statement.test, fn, parameters, named)
        if (shape)
          return found(shape === 'flag' ? 'flag by leaving' : shape + ' by leaving', statement.test)
      }
    }
    child = parent
  }
  return null
}

/** Whose zero-argument constructor is a fresh, position-free box. */
const EMPTY_BOXES = new Set(['Map', 'Set', 'WeakMap', 'WeakSet'])

/**
 * Does this expression carry no position at all - a fresh sentinel?
 *
 * Both reviews of #226 found this listing `{}`, `[]` and `null` only, which made
 * `useRef()`, `useRef(false)`, `useRef(0)` and `useRef('')` read as values -
 * `position` where nothing else writes the ref, and `mixed` where something
 * does, both of them stronger than the truth. This instrument's own species of
 * mistake, reversed. Nothing in the tree is written any of those ways today, so
 * the figures did not move; what says the repair is there is the fixtures (#141)
 * and the measurement in `docs/acceptance/23-offerings.md` §#226, not the
 * report.
 *
 * `useRef()` passes nothing, so an absent node arrives here. It is the one
 * caller that can, every other passing a node it already has, and `undefined`
 * carries no position - hence `true` rather than the old `false`.
 */
function isSentinel(node, bound) {
  if (!node) return true
  if (node.type === 'ObjectExpression') return node.properties.length === 0
  if (node.type === 'ArrayExpression') return node.elements.length === 0
  if (node.type === 'NullLiteral') return true
  if (node.type === 'BooleanLiteral') return true
  if (node.type === 'NumericLiteral') return node.value === 0
  if (node.type === 'StringLiteral') return node.value === ''
  if (node.type === 'TemplateLiteral')
    return !node.expressions.length && node.quasis.every(part => !part.value.cooked)
  if (node.type === 'Identifier' && node.name === 'undefined') return true
  if (node.type === 'NewExpression')
    return (
      node.callee.type === 'Identifier' &&
      EMPTY_BOXES.has(node.callee.name) &&
      !node.arguments.length
    )
  // One hop: a name bound to a sentinel is one. The empty `Map` stops the walk
  // there, a chain of names being a shape nothing in this tree has.
  if (node.type === 'Identifier' && bound.has(node.name))
    return isSentinel(bound.get(node.name), new Map())
  return false
}

/**
 * Every write to a ref in this file, by ref name.
 *
 * `useRef(x)` counts as one: a ref handed a value at birth and never reassigned
 * is written, and reading only the assignments would call it `unwritten`.
 */
function refWrites(program) {
  const bound = new Map()
  walk(program, node => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || !node.init) return
    bound.set(node.id.name, node.init)
  })

  const writes = new Map()
  const note = (name, value) => {
    if (!writes.has(name)) writes.set(name, [])
    writes.get(name).push(isSentinel(value, bound) ? 'sentinel' : 'value')
  }
  walk(program, node => {
    if (
      node.type === 'AssignmentExpression' &&
      node.operator === '=' &&
      node.left.type === 'MemberExpression' &&
      !node.left.computed &&
      node.left.property.type === 'Identifier' &&
      node.left.property.name === 'current' &&
      node.left.object.type === 'Identifier'
    )
      note(node.left.object.name, node.right)
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      node.init &&
      node.init.type === 'CallExpression' &&
      node.init.callee.type === 'Identifier' &&
      node.init.callee.name === 'useRef'
    )
      note(node.id.name, node.init.arguments[0])
  })
  return writes
}

/**
 * How much a ref can tell apart, weakest first.
 *
 * A guard can tell apart whatever any of its refs can, so where a test reads
 * two refs the strongest label wins - which is this order read as a ladder
 * rather than as prose.
 */
const STRENGTH = ['unwritten', 'opened', 'mixed', 'position']

/** What one ref's writes say it can tell apart. */
function labelFor(kinds) {
  if (!kinds || !kinds.length) return 'unwritten'
  const sentinels = kinds.filter(kind => kind === 'sentinel').length
  if (sentinels === kinds.length) return 'opened'
  return sentinels ? 'mixed' : 'position'
}

/** What the refs this guard reads can tell apart. */
function tellsApart(refs, writes) {
  let seen = null
  for (const name of refs) {
    const label = labelFor(writes.get(name))
    if (seen === null || STRENGTH.indexOf(label) > STRENGTH.indexOf(seen)) seen = label
  }
  return seen
}

/**
 * Does this comment sit directly above that statement?
 *
 * Asked of the source rather than of babel's `leadingComments`, because a
 * `const save = async draft => {...}` carries its reason on the declaration and
 * not on the arrow function inside it, which is how every reason in this tree is
 * written. True when nothing but whitespace and other comments lies between.
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
 * A marker written as a run of `//` lines is one marker: babel hands those over
 * one node per line, and the ticket number is usually in the last sentence.
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
 * One file's answer, so the fixtures can ask the same question of a snippet
 * that the run asks of the tree. An instrument that has never been seen to fail
 * is the species of assertion #124 is about.
 *
 * Returns one entry per sentence that follows an `await`. Throws on a file it
 * cannot parse; the caller decides what that is worth.
 */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  const writes = refWrites(ast.program)
  const sites = []
  let sentences = 0

  walk(ast.program, (node, parents) => {
    if (!isSetter(node)) return
    const fn = [...parents].reverse().find(parent => FUNCTIONS.has(parent.type))
    if (!fn) return
    const argument = node.arguments[0]
    if (!argument) return
    let said = null
    if (saysSuccess(argument)) said = argument
    else if (argument.type === 'Identifier') {
      const literal = literalsByName(fn).get(argument.name)
      if (saysSuccess(literal)) said = literal
    }
    if (!said) return
    sentences++

    let waited = false
    walk(fn.body, inner => {
      if (inner.type === 'AwaitExpression' && inner.end <= node.start) waited = true
    })
    if (!waited) return

    const line = node.loc.start.line
    if (sites.some(site => site.line === line)) return
    const guard = enclosure(node, parents, fn)
    if (guard) {
      const site = { line, guard: guard.shape }
      if (guard.refs.length) {
        site.refs = guard.refs
        site.tells = tellsApart(guard.refs, writes)
      }
      sites.push(site)
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

  return { sentences, sites }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  let sentences = 0
  let after = 0
  const guarded = []
  const tells = new Map()
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
    sentences += found.sentences
    after += found.sites.length

    for (const site of found.sites) {
      const at = where + ':' + site.line
      if (site.guard) {
        const label = site.tells || 'no ref'
        tells.set(label, (tells.get(label) || 0) + 1)
        guarded.push(
          at + ' (' + site.guard + (site.refs ? ', ' + label + ': ' + site.refs.join(' ') : '') + ')'
        )
      } else if (!site.marker) {
        problems.push({
          where,
          line: site.line,
          why:
            'says a sentence after an await with nothing asking whether the ' +
            'screen is still the one that asked. Either enclose it, or write ' +
            '`// sentence-after-a-move: <why> (#NNN)` in the function',
        })
      } else if (!site.marker.ok) {
        problems.push({
          where,
          line: site.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      } else {
        marked.push(at + ' ... ' + site.marker.reason)
      }
    }
  }

  for (const file of unreadable)
    problems.push({
      where: shown(file),
      line: 0,
      why: 'is code this script is not set up to parse, so it was not read',
    })

  // What it did not look at, by name (#123): `CODE` is a list of extensions, so
  // a `.vue` arriving one day would land here rather than in the count nobody
  // was watching.
  const ignored = everything.filter(
    file => !CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const extensions = [...new Set(ignored.map(file => path.extname(file) || '(none)'))].sort()
  console.log(
    'files read ' +
      sources.length +
      ' (' +
      PARSED +
      ') .. code files not read ' +
      unreadable.length +
      ' .. not code ' +
      ignored.length +
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '')
  )
  console.log(
    'success sentences ' +
      sentences +
      ' .. after an await ' +
      after +
      ' .. enclosed ' +
      guarded.length +
      ' (' +
      [...tells.entries()]
        .sort()
        .map(([label, count]) => label + ' ' + count)
        .join(' .. ') +
      ') .. marked ' +
      marked.length +
      ' .. problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--enclosed')) for (const entry of guarded) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
