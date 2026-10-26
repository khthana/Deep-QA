/**
 * The census #233 asked for: the pair to #230's, for the family #232 found.
 *
 * The family: a form holds what a person has typed, and an effect writes that
 * state again with a value in its dependency list that is **computed from an
 * answer by identity** - `const onlyOne = usable.length === 1 ? usable[0] : null`
 * over a list the screen read from the server. The answer is a new array every
 * time, so the element is a new object every time, so the effect runs again on
 * every re-read and puts the form back to what the answer says. #232 fixed one
 * such form, #233 the next four, and two more are exempt for a reason written
 * beside them. Nothing asked the code whether there was a seventh.
 *
 * It is asked **by the mechanism** and not by what the screen draws (#174), in
 * three questions:
 *
 * 1. Which state does a person type into? Not a list of names: a `useState`
 *    whose value is read by a controlled input's `value=` or `checked=`
 *    anywhere in the same file. That is what makes it form state - the screen
 *    hands it to a field and the field hands back what was typed.
 * 2. Which effects write it? A `useEffect` with a non-empty dependency list
 *    whose body calls that state's own setter.
 * 3. What is in that effect's dependency list? Each identifier declared in the
 *    same file is classified from its initialiser: `primitive` (compared by
 *    value, so a re-read of equal content does not re-run the effect) or
 *    `reference` (a fresh object or array each time, so it does). A dependency
 *    that is a prop, a hook's return or any other outer binding is
 *    `unclassified` - this script cannot see where it comes from, and says so
 *    rather than guessing.
 *
 * A `reference` dependency is only a defect if the effect can throw away what
 * was typed, so two things make it green:
 *
 * - **a guard**: the setter is called with a functional updater that has a
 *   branch returning `current` - the state it was handed - unchanged. That is
 *   #232's shape, and it is what lets the effect run again harmlessly.
 * - **a marker**, in a comment inside the effect or directly above it:
 *
 *       // form-identity: <why this form cannot lose what was typed> (#NNN)
 *
 *   `students/StudentForm.js` and `offerings/OfferingForm.js` carry one: every
 *   line in them fills a field only when it is empty, so no re-read can reach
 *   what anybody typed. A marker is a claim like any other (#141), so each one
 *   is counted and printed with its reason, and a marker outlives the gap it
 *   documented - the day one of those lines drops its `||` the marker is an
 *   exemption and nothing here will say so (#93).
 *
 * What it cannot measure, written down because a count nobody can read the
 * limits of is the species of hand-kept number these exist to replace (#123):
 *
 * - **an `unclassified` dependency.** A prop, a hook's return or a value from
 *   another module may be a fresh reference every render; this script reports
 *   how many there are and names them, and is not red for them. `value` in
 *   these forms is one, and an effect keyed on it is meant to run again. A
 *   `useMemo` is one too - `ActivityScores.js`'s `recorded` is rebuilt whenever
 *   its own dependencies move, which is this family's mechanism wearing a hook,
 *   and nothing here can say whether it reaches a field.
 * - **the guarded reading, which no site in the tree takes.** A fix that keeps
 *   the identity dependency and guards the write is green here, and a fix that
 *   takes the dependency out is `by value`; all five of #232's and #233's forms
 *   took the second, so as of 26 October 2569 that branch is held by this
 *   script's own fixtures and by nothing in `src/`.
 * - **a non-computed member** (`deeper.id`): `unclassified` for the same
 *   reason, where `usable[0]` and `.find(…)` are `reference`.
 * - **state a person types into through anything but `value=`/`checked=`** - a
 *   field written as a custom component that takes the value under another
 *   prop name is invisible here, and so is state written by a handler only.
 * - **whether the guard is right.** A functional updater that hands the state
 *   back whole - on its own, as a `return`, as an arm of a `?:`, or on the left
 *   of `||` or `??` - is this script's whole reading of it; whether that branch
 *   is the one a person's typing takes is what the rows of `233a` are for.
 *   `current && x` and `x || current` are read as no guard, because neither
 *   hands back what was typed, and nothing in `src/` takes that branch either
 *   way: it is held by this script's own fixtures (#141).
 * - **a setter called through anything but its own name** - handed to another
 *   function, or read off an object.
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
    'forms-cleared-by-identity: @babel/parser could not be required. It arrives ' +
      'with react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

// Everything after the colon to the end of the comment, for the reason that
// `superseded-answers.js` gives: the reason is a paragraph and not a line.
const MARKER = /form-identity:([\s\S]+)/
const TICKET = /#\d+/

/** The attributes a controlled field hands its value to. */
const CONTROLLED = new Set(['value', 'checked'])

/** Calls whose answer is compared by value. */
const PRIMITIVE_CALLS = new Set(['Boolean', 'String', 'Number', 'parseInt', 'parseFloat'])
const PRIMITIVE_METHODS = new Set([
  'join',
  'includes',
  'indexOf',
  'lastIndexOf',
  'findIndex',
  'some',
  'every',
  'toString',
  'trim',
  'toUpperCase',
  'toLowerCase',
  'localeCompare',
  'startsWith',
  'endsWith',
  'charAt',
  'padStart',
  'padEnd',
  'test',
])
/** Calls that build or select a reference. */
const REFERENCE_METHODS = new Set([
  'map',
  'filter',
  'slice',
  'concat',
  'find',
  'sort',
  'reverse',
  'flat',
  'flatMap',
  'split',
  'entries',
  'keys',
  'values',
  'from',
  'fromEntries',
  'assign',
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
    if (key === 'loc' || key.endsWith('Comments')) continue
    walk(node[key], visit, next)
  }
}

/**
 * What an initialiser's value is compared by.
 *
 * `reference` wins over `unclassified` wherever a conditional or a `||` can
 * produce either, because one branch that hands back a fresh object is enough
 * to re-run the effect - which is the whole mechanism this census is about.
 */
function classify(node) {
  if (!node) return 'unclassified'
  switch (node.type) {
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'BigIntLiteral':
    case 'TemplateLiteral':
      return 'primitive'
    case 'Identifier':
      return node.name === 'undefined' ? 'primitive' : 'unclassified'
    case 'UnaryExpression':
      // Every unary operator yields a primitive: `!`, `-`, `+` and `~` a value,
      // `typeof` a string, `void` `undefined`. `delete` yields a boolean.
      return 'primitive'
    case 'BinaryExpression':
      // Every operator but `in` and `instanceof` yields a primitive, and those
      // two yield a boolean, so the whole family does.
      return 'primitive'
    case 'LogicalExpression':
      return combine(classify(node.left), classify(node.right))
    case 'ConditionalExpression':
      return combine(classify(node.consequent), classify(node.alternate))
    case 'ArrayExpression':
    case 'ObjectExpression':
    case 'NewExpression':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return 'reference'
    case 'MemberExpression':
    case 'OptionalMemberExpression':
      // An index or a key held in a variable reads an element of a list, which
      // is a fresh object wherever the list is a fresh answer. A name after a
      // dot could be anything, so it is not classified.
      return node.computed ? 'reference' : 'unclassified'
    case 'SequenceExpression':
      return classify(node.expressions[node.expressions.length - 1])
    case 'ParenthesizedExpression':
    case 'TSAsExpression':
      return classify(node.expression)
    case 'CallExpression':
    case 'OptionalCallExpression': {
      const callee = node.callee
      if (callee.type === 'Identifier' && PRIMITIVE_CALLS.has(callee.name)) return 'primitive'
      if (
        (callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression') &&
        !callee.computed &&
        callee.property.type === 'Identifier'
      ) {
        if (PRIMITIVE_METHODS.has(callee.property.name)) return 'primitive'
        if (REFERENCE_METHODS.has(callee.property.name)) return 'reference'
      }
      return 'unclassified'
    }
    default:
      return 'unclassified'
  }
}

function combine(left, right) {
  if (left === 'reference' || right === 'reference') return 'reference'
  if (left === 'unclassified' || right === 'unclassified') return 'unclassified'
  return 'primitive'
}

const isSetterCall = (node, name) =>
  (node.type === 'CallExpression' || node.type === 'OptionalCallExpression') &&
  node.callee.type === 'Identifier' &&
  node.callee.name === name

/**
 * The `useState` pairs in a file, as `{ value, setter }`.
 *
 * Only the destructured pair is read. A `useState` whose two halves are pulled
 * out of an array by index later is one of the spellings this cannot see, and
 * the docblock says so.
 */
function statePairs(ast) {
  const pairs = []
  walk(ast.program, node => {
    if (node.type !== 'VariableDeclarator') return
    if (!node.init) return
    const init = node.init
    if (
      init.type !== 'CallExpression' ||
      init.callee.type !== 'Identifier' ||
      init.callee.name !== 'useState'
    )
      return
    if (node.id.type !== 'ArrayPattern') return
    const [value, setter] = node.id.elements
    if (!value || value.type !== 'Identifier') return
    if (!setter || setter.type !== 'Identifier') return
    pairs.push({ value: value.name, setter: setter.name })
  })
  return pairs
}

/** The names a controlled field is handed, anywhere in the file. */
function typedInto(ast) {
  const names = new Set()
  walk(ast.program, node => {
    if (node.type !== 'JSXAttribute') return
    if (node.name.type !== 'JSXIdentifier' || !CONTROLLED.has(node.name.name)) return
    if (!node.value || node.value.type !== 'JSXExpressionContainer') return
    walk(node.value.expression, inner => {
      if (inner.type === 'Identifier') names.add(inner.name)
    })
  })
  return names
}

/** Every `const x = …` in the file, by name. */
function declarations(ast) {
  const inits = new Map()
  walk(ast.program, node => {
    if (node.type !== 'VariableDeclarator') return
    if (node.id.type !== 'Identifier' || !node.init) return
    if (!inits.has(node.id.name)) inits.set(node.id.name, node.init)
  })
  return inits
}

/**
 * Is this effect's write of the form state guarded?
 *
 * #232's shape: the setter is handed an arrow function, and somewhere in that
 * function the parameter it was given is returned as it stands. That is the
 * branch that leaves what was typed alone.
 */
function guarded(body, setter) {
  let found = false
  walk(body, node => {
    if (found) return
    if (!isSetterCall(node, setter)) return
    const [argument] = node.arguments
    if (!argument) return
    if (argument.type !== 'ArrowFunctionExpression' && argument.type !== 'FunctionExpression') return
    const [parameter] = argument.params
    if (!parameter || parameter.type !== 'Identifier') return
    walk(argument.body, inner => {
      if (found) return
      if (inner.type === 'Identifier' && inner.name === parameter.name) {
        // The parameter handed back whole, rather than spread into a new
        // object: `current` on its own is the branch that keeps what was typed,
        // and `{ ...current, x: y }` is the branch that replaces it.
        if (inner === argument.body || isReturnedWhole(inner, argument)) found = true
      }
    })
  })
  return found
}

/** Is this identifier the whole of a returned expression? */
function isReturnedWhole(identifier, fn) {
  let whole = false
  walk(fn, (node, parents) => {
    if (node !== identifier) return
    const above = parents[parents.length - 1]
    if (!above) return
    if (above.type === 'ReturnStatement' && above.argument === identifier) whole = true
    if (above.type === 'ConditionalExpression' && above.consequent === identifier) whole = true
    if (above.type === 'ConditionalExpression' && above.alternate === identifier) whole = true
    if (above.type === 'ArrowFunctionExpression' && above.body === identifier) whole = true
    // `current || x` and `current ?? x` hand the state back whole where it is
    // not empty; `current && x` never hands it back at all, and `x || current`
    // hands it back only where `x` is empty, which is not the branch a person's
    // typing takes. So the side matters as much as the operator.
    if (
      above.type === 'LogicalExpression' &&
      above.left === identifier &&
      (above.operator === '||' || above.operator === '??')
    )
      whole = true
  })
  return whole
}

/**
 * Is everything between these two offsets whitespace and comments?
 *
 * The block above one of these effects is a paragraph of `//` lines, and asking
 * only whether the text between a comment and the effect is blank would accept
 * the last of those lines and reject every line above it - so a marker written
 * at the top of its own paragraph would be invisible.
 */
function onlyCommentsBetween(code, start, end, comments) {
  let text = code.slice(start, end)
  for (const comment of comments) {
    if (comment.start < start || comment.end > end) continue
    text =
      text.slice(0, comment.start - start) +
      ' '.repeat(comment.end - comment.start) +
      text.slice(comment.end - start)
  }
  return text.trim() === ''
}

/**
 * Consecutive `//` lines, joined into one comment.
 *
 * Babel hands back a comment per line, so a reason written as a paragraph of
 * `//` lines reads as a first line with no ticket number in it - which is how
 * the first version of this rejected both of the markers it was written for.
 * A run is broken by anything but whitespace between two comments.
 */
function paragraphs(comments, code) {
  const blocks = []
  for (const comment of comments) {
    const last = blocks[blocks.length - 1]
    if (last && code.slice(last.end, comment.start).trim() === '') {
      last.end = comment.end
      last.value += '\n' + comment.value
      continue
    }
    blocks.push({ start: comment.start, end: comment.end, value: comment.value, loc: comment.loc })
  }
  return blocks
}

/** The marker for one effect, read from the comments around it. */
function markerFor(effect, statement, comments, code) {
  const from = statement ? statement.start : effect.start
  const blocks = paragraphs(comments, code)
  const inside = blocks.filter(block => block.start >= effect.start && block.end <= effect.end)
  const above = blocks.filter(
    block => block.end <= from && onlyCommentsBetween(code, block.end, from, comments)
  )
  for (const block of inside.concat(above)) {
    const found = MARKER.exec(block.value)
    if (!found) continue
    const reason = found[1].replace(/\s+/g, ' ').trim()
    return {
      line: block.loc.start.line,
      reason,
      ok: TICKET.test(reason) && reason.replace(TICKET, '').trim().length > 0,
    }
  }
  return null
}

/**
 * One file's sites. Exported so the fixtures can ask it about a snippet.
 */
function examine(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    attachComment: true,
  })
  const comments = ast.comments || []
  const pairs = statePairs(ast)
  const fields = typedInto(ast)
  const form = pairs.filter(pair => fields.has(pair.value))
  const inits = declarations(ast)
  const sites = []

  walk(ast.program, (node, parents) => {
    if (
      node.type !== 'CallExpression' ||
      node.callee.type !== 'Identifier' ||
      node.callee.name !== 'useEffect'
    )
      return
    const [body, list] = node.arguments
    if (!body) return
    if (!list || list.type !== 'ArrayExpression' || list.elements.length === 0) return

    for (const pair of form) {
      let writes = false
      walk(body, inner => {
        if (isSetterCall(inner, pair.setter)) writes = true
      })
      if (!writes) continue

      const kinds = { reference: [], unclassified: [], primitive: [] }
      for (const element of list.elements) {
        if (!element || element.type !== 'Identifier') continue
        const init = inits.get(element.name)
        const kind = init ? classify(init) : 'unclassified'
        kinds[kind].push(element.name)
      }
      if (!kinds.reference.length) {
        sites.push({
          line: node.loc.start.line,
          state: pair.value,
          kind: 'by value',
          unclassified: kinds.unclassified,
        })
        continue
      }
      if (guarded(body, pair.setter)) {
        sites.push({
          line: node.loc.start.line,
          state: pair.value,
          kind: 'guarded',
          identity: kinds.reference,
        })
        continue
      }
      const statement = [...parents]
        .reverse()
        .find(
          parent =>
            /(Statement|Declaration)$/.test(parent.type) &&
            parent.start <= node.start &&
            parent.end >= node.end
        )
      sites.push({
        line: node.loc.start.line,
        state: pair.value,
        kind: 'bare',
        identity: kinds.reference,
        marker: markerFor(node, statement, comments, code),
      })
    }
  })

  return { form: form.map(pair => pair.value), sites }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  let forms = 0
  let byValue = 0
  const guardedSites = []
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
    forms += found.form.length

    for (const site of found.sites) {
      const at = where + ':' + site.line
      if (site.kind === 'by value') {
        byValue++
        for (const name of site.unclassified) unclassified.push(at + ' ' + name)
        continue
      }
      if (site.kind === 'guarded') {
        guardedSites.push(at + ' (' + site.identity.join(' ') + ' → ' + site.state + ')')
        continue
      }
      if (!site.marker) {
        problems.push({
          where,
          line: site.line,
          why:
            'writes ' +
            site.state +
            ', which a person types into, with ' +
            site.identity.join(' ') +
            ' in its dependency list — computed from an answer by identity, so ' +
            'the effect runs again on every re-read. Either hand the setter an ' +
            'updater with a branch that returns what it was given, or write ' +
            '`// form-identity: <why> (#NNN)` in the effect',
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

  // What it did not look at, by name rather than as a number (#123, #126).
  // `PARSED` is in `CODE`, so this one question answers both: anything that is
  // not code is not the file it parses either.
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
    'typed-into states ' +
      forms +
      ' · effects writing one: by value ' +
      byValue +
      ' · by identity, guarded ' +
      guardedSites.length +
      ' · by identity, marked ' +
      marked.length +
      ' · unclassified dependencies ' +
      unclassified.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--guarded')) for (const entry of guardedSites) console.log('  ' + entry)
  if (process.argv.includes('--unclassified'))
    for (const entry of unclassified) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify }
