/**
 * The census #152 ran by hand, as an instrument that fails.
 *
 * The family: a handler saves something, calls the screen's own loader to draw
 * the list again, and says *saved* — while the loader catches its own failure
 * and reports it itself, so the refusal never reaches the handler's `catch`.
 * The person is then told the save worked and hears nothing about the list in
 * front of them, or hears both at once. The owner settled it on 10 October
 * 2569: **the refusal wins**, and #152 carried that to eighteen sites in ten
 * page files by having each loader return whether it drew and each handler read
 * that answer.
 *
 * #152 found those eighteen by **walking every `await` by hand**, because the
 * two censuses already here cannot see this property: `superseded-answers.js`
 * asks whether a drawing is guarded, and `label-codes.js` asks about a label.
 * This file is that walk, asked of the code.
 *
 * What it asks, per function:
 *
 * 1. Does the function say a **success** sentence? That is a `setNotice` whose
 *    argument is an object with `error: false`, or a name bound in the same
 *    function to such an object — the shape `SubjectStudents` uses, where the
 *    sentence is built as `said` and handed on. A function that says no success
 *    sentence is not in this family; nothing of it is read further.
 * 2. If it does, every `await` in it whose callee is **a function in this file
 *    that catches without rethrowing** is a call to a loader that swallows. The
 *    classification is made from the code: a `catch` with no `throw` in it is a
 *    function that reports its own failure and returns normally.
 * 3. For each such call, is the answer **read**? Either the `await` itself
 *    decides something (`if (await reload(said))`) or it is bound to a name
 *    that decides something (`const reloaded = await load(…)` and then `if
 *    (reloaded)`). Being awaited for its effect and not for its answer is the
 *    defect: the sentence is then said whatever the loader found.
 * 4. If the answer is not read, the site must carry a marker saying why, with a
 *    reason and a ticket number. A marker is a claim like any other, so every
 *    one is counted and printed, and the script says nothing is wrong only when
 *    each unread call has one.
 *
 * The marker, in a comment inside the function or directly above it:
 *
 *     // swallowed-refusal: <why this one may speak without reading> (#NNN)
 *
 * ## What it cannot measure, said here rather than found out later
 *
 * - **It reads one setter's name.** The banner is `setNotice` everywhere in this
 *   tree (196 calls), and a sentence put on the screen any other way — a
 *   message inside a form, `setError` in a component — is invisible to it. A
 *   tool that skips things by name lies the day a name is added (#126), so the
 *   run prints every other `set…` name that looks like a notice and was **not**
 *   read, by name, for a new spelling to show up as a new word.
 * - **It classifies a loader by reading another function.** Asking whether the
 *   callee swallows means leaving the function under examination, which is the
 *   boundary #89's lesson is about. Two consequences: a loader passed in as a
 *   parameter or held in a ref is invisible, because there is no local
 *   declaration to read; and a `catch` inside a *nested* function of the loader
 *   counts as the loader's own, so a handler can be classified as calling a
 *   swallowing loader on the strength of a `try` it does not own.
 * - **A loader that reports by throwing is not this family** and is excluded by
 *   the same reading: the handler's own `catch` sees that refusal.
 * - **It cannot see the order the person meets.** Which sentence wins is settled
 *   in the frames, which #152 had to sample per frame to measure (#164). This
 *   says only that the code does not read the answer.
 * - **A notice shape it cannot classify is a problem, not a pass.** A
 *   `setNotice` whose argument is neither `null`, nor an object with `error`,
 *   nor a name bound to one, is reported where it sits in a function that calls
 *   a swallowing loader — so the shape that arrives next cannot arrive unseen.
 *
 * ## In `CENSUSES` since #203, and what it was waiting for
 *
 * Its first run found twenty live sites of this defect in ten admin page files,
 * on the screens #152 scoped out. `npm run census` is a gate, so wiring it in
 * then would have turned that gate red for everybody, and marking the twenty
 * would have written twenty claims nobody holds. The owner chose on 11 October
 * 2569 to commit it unwired and open **#203** for the twenty. #203 fixed them
 * and this is its last step: the census is in `census.js`'s `CENSUSES` as of
 * 12 October 2569, green at **37 of 37** answers read, and a twenty-first site
 * now turns the gate red the day it is written.
 *
 * The wiring is the whole of what changed here. What this instrument can and
 * cannot see is above and unaltered by it — above all that it cannot see the
 * order the person meets, which is the frames' answer and not the parser's.
 *
 * Its own fixtures: `npm run census:test`, which runs every `.test.js` here —
 * and fixtures pass either way until a real site is broken with the instrument
 * (#141). This one was seen red on the whole corpus at `e15bef9`, the commit
 * before #152: **0 of 37** answers read.
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
    'swallowed-refusals: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The one setter whose argument this script reads. */
const NOTICE = 'setNotice'
/** Setter names that would put a sentence on a screen, for the run to name. */
const SOUNDS_LIKE_A_NOTICE = /^set(Notice|Banner|Message|Alert|Error|Warning|Status|Toast)/

const MARKER = /swallowed-refusal:([\s\S]+)/
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

/**
 * Is this expression read for an answer rather than called for an effect?
 *
 * The same question `superseded-answers.js` asks of a guard, asked here of a
 * loader's answer: true inside the test of an `if` or of a `?:`, or as what a
 * `return` hands back. `!`, `&&` and `||` are walked *through*, so
 * `if (drew && mine)` reads the answer and `drew || setNotice(said)` — which
 * calls for an effect — does not count as reading it twice.
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

/** The function a declaration holds, through `useCallback(fn, deps)` as well. */
function functionOf(init) {
  if (!init) return null
  if (FUNCTIONS.has(init.type)) return init
  if (init.type === 'CallExpression')
    for (const argument of init.arguments) if (FUNCTIONS.has(argument.type)) return argument
  return null
}

/**
 * Does this function catch a failure and keep it to itself?
 *
 * A `catch` with no `throw` anywhere in it: the failure is reported by the
 * function — `setNotice`, `failed(error)` — and the caller is handed a normal
 * return. That is the whole mechanism #152 is about, and it is the one thing
 * here that is read from outside the function under examination.
 */
function swallows(fn) {
  let yes = false
  walk(fn.body, node => {
    if (yes || node.type !== 'CatchClause') return
    let rethrows = false
    walk(node.body, inner => {
      if (inner.type === 'ThrowStatement') rethrows = true
    })
    if (!rethrows) yes = true
  })
  return yes
}

/** The names in this file bound to a function that swallows. */
function swallowingNames(program) {
  const names = new Set()
  walk(program, node => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
      const fn = functionOf(node.init)
      if (fn && swallows(fn)) names.add(node.id.name)
    }
    if (node.type === 'FunctionDeclaration' && node.id && swallows(node)) names.add(node.id.name)
  })
  return names
}

/** What an object literal says about `error`: false, true, or unsaid. */
function errorFlag(object) {
  for (const property of object.properties) {
    if (property.type !== 'ObjectProperty' || property.computed) continue
    const key = property.key
    const named = key.type === 'Identifier' ? key.name : key.value
    if (named !== 'error') continue
    if (property.value.type === 'BooleanLiteral') return property.value.value ? 'true' : 'false'
    return 'computed'
  }
  return 'unsaid'
}

/**
 * The success sentences this function says, and the shapes it could not read.
 *
 * An object with `error: false` is one. So is a name bound in the same function
 * to such an object: `SubjectStudents` builds `said` and hands it to the loader
 * as well as to `setNotice`, and a census that read only object literals would
 * call that function silent — it is the site the hand walk found last.
 */
function successSentences(fn) {
  const bound = new Map()
  walk(fn.body, node => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') return
    if (node.init && node.init.type === 'ObjectExpression') bound.set(node.id.name, node.init)
  })

  const says = []
  const unreadable = []
  walk(fn.body, node => {
    if (node.type !== 'CallExpression') return
    if (node.callee.type !== 'Identifier' || node.callee.name !== NOTICE) return
    const argument = node.arguments[0]
    const line = node.loc.start.line
    if (!argument) return
    if (argument.type === 'NullLiteral') return
    const object =
      argument.type === 'ObjectExpression'
        ? argument
        : argument.type === 'Identifier'
          ? bound.get(argument.name)
          : null
    if (!object) {
      unreadable.push(line)
      return
    }
    const flag = errorFlag(object)
    if (flag === 'false') says.push(line)
    else if (flag !== 'true') unreadable.push(line)
  })
  return { says, unreadable }
}

/**
 * Does this statement sit directly above that one?
 *
 * Asked of the source rather than of babel's `leadingComments`, for the reason
 * `superseded-answers.js` gives: a `const save = useCallback(async () => {…})`
 * carries its reason on the declaration, not on the arrow function inside it.
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

/** The marker for this function, if it carries one. */
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
 * One file's answer, so the fixtures can ask of a snippet what the run asks of
 * the tree. Throws on a file it cannot parse; the caller decides what that is
 * worth.
 *
 * Returns one entry per `await` of a swallowing loader inside a function that
 * says a success sentence, plus the notice shapes it could not classify in
 * those same functions.
 */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  const swallowing = swallowingNames(ast.program)

  const sites = []
  const unreadable = []
  const speaking = new Set()

  walk(ast.program, (node, parents) => {
    if (node.type !== 'AwaitExpression') return
    const fn = [...parents].reverse().find(parent => FUNCTIONS.has(parent.type))
    if (!fn) return
    const call = node.argument
    if (!call || call.type !== 'CallExpression' || call.callee.type !== 'Identifier') return
    if (!swallowing.has(call.callee.name)) return

    const { says, unreadable: shapes } = successSentences(fn)
    if (!says.length) return
    speaking.add(fn.start)
    for (const line of shapes) if (!unreadable.includes(line)) unreadable.push(line)

    const line = node.loc.start.line
    if (sites.some(site => site.line === line)) return

    if (decidesSomething(node, parents)) {
      sites.push({ line, read: 'directly', loader: call.callee.name })
      return
    }
    const declarator = [...parents].reverse().find(parent => parent.type === 'VariableDeclarator')
    const names = declarator ? boundNames(declarator.id) : []
    let reads = false
    if (names.length)
      walk(fn.body, (inner, above) => {
        if (reads) return
        if (inner.type === 'Identifier' && names.includes(inner.name) && decidesSomething(inner, above))
          reads = true
      })
    if (reads) {
      sites.push({ line, read: 'by name', loader: call.callee.name })
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
    sites.push({
      line,
      loader: call.callee.name,
      marker: markerFor(fn, statement, comments, code),
    })
  })

  return { sites, unreadable, speaking: speaking.size, swallowing: swallowing.size }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadableCode = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)
  const notCode = everything.filter(file => !CODE.has(path.extname(file)))
  const extensions = [...new Set(notCode.map(file => path.extname(file) || '(none)'))].sort()

  let speaking = 0
  let calls = 0
  const read = []
  const marked = []
  const problems = []
  const otherSetters = new Set()

  for (const file of sources) {
    const where = shown(file)
    const code = fs.readFileSync(file, 'utf8')
    for (const hit of code.matchAll(/\bset[A-Z][A-Za-z]*\b/g))
      if (hit[0] !== NOTICE && SOUNDS_LIKE_A_NOTICE.test(hit[0])) otherSetters.add(hit[0])

    let found
    try {
      found = examine(code)
    } catch (error) {
      problems.push({ where, line: error.loc ? error.loc.line : 0, why: 'could not be parsed' })
      continue
    }
    speaking += found.speaking
    calls += found.sites.length

    for (const site of found.sites) {
      const at = where + ':' + site.line
      if (site.read) read.push(at + ' (' + site.loader + ', ' + site.read + ')')
      else if (!site.marker)
        problems.push({
          where,
          line: site.line,
          why:
            'says a success sentence around `' +
            site.loader +
            '` without reading its answer. Either read it, or write ' +
            '`// swallowed-refusal: <why> (#NNN)` in the function',
        })
      else if (!site.marker.ok)
        problems.push({
          where,
          line: site.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      else marked.push(at + ' — ' + site.marker.reason)
    }
    for (const line of found.unreadable)
      problems.push({
        where,
        line,
        why:
          'sets a notice this script cannot classify, in a function that calls a ' +
          'swallowing loader. Give it `error: true` or `error: false`, or teach ' +
          'this script the shape',
      })
  }

  for (const file of unreadableCode)
    problems.push({
      where: shown(file),
      line: 0,
      why: 'is code this script is not set up to parse, so it was not read',
    })

  console.log(
    'files read ' +
      sources.length +
      ' (' +
      PARSED +
      ') · code files not read ' +
      unreadableCode.length +
      ' · not code ' +
      notCode.length +
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '') +
      ' · notice setters read 1 (' +
      NOTICE +
      ')' +
      (otherSetters.size ? ' · not read ' + [...otherSetters].sort().join(' ') : '')
  )
  console.log(
    'functions saying a success sentence ' +
      speaking +
      ' · awaiting a swallowing loader ' +
      calls +
      ' · answer read ' +
      read.length +
      ' · marked ' +
      marked.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--read')) for (const entry of read) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
