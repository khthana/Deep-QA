/**
 * The sixth census: a caller that leaves out a prop the component says it has
 * to have - #182.
 *
 * #179 gave `ImportPanel` a prop, `target`, saying what the report in the panel
 * is about, and wrote that the prop deliberately has no default: a default of
 * *nothing has changed* is #133's mistake one level further out. What it could
 * not do was make a caller pass it. `isCurrent` is an argument of a call, so
 * forgetting it throws; a prop is not, so an eleventh caller that forgets
 * `target` gets `undefined` on both sides of every comparison in the panel -
 * which is the silent behaviour from before #179, and nothing went red.
 *
 * There was no instrument in the tree that could say so. `frontend/` has no
 * component test harness (no file under `src` is named `*.test.js`) and
 * `prop-types` is not a dependency, so a throw on a missing prop could not be
 * proved by anything; and the five censuses beside this one read a screen's
 * `await`s, its labels and its refs, and none of them had ever read a prop that
 * JSX passes to a component. The gap was written into `ImportPanel`'s own
 * docstring and into `docs/acceptance/34-activity-marks.md` rather than hidden
 * (#123), and #182 was its queue. The owner's answer, 22 ตุลาคม 2569, was this
 * file.
 *
 * ## The rule, and why it is not a list of component names
 *
 * **A component declares what it must be given, and the declaration is code:**
 *
 *     export const REQUIRED_PROPS = ['target']
 *
 * beside its default export. The population of this census is every file that
 * writes one, which today is `components/ImportPanel.js` and tomorrow is
 * whatever the next ticket writes. The alternative - this script holding the
 * name `ImportPanel` - is a rule about one component wearing the clothes of a
 * general instrument, and `mutation/README.md` has a word for that shape: a
 * list, not a catalogue (#126). A declaration is also readable by the component
 * itself, which is what keeps it honest: a name in it that the component does
 * not destructure is reported here as a problem rather than quietly proving
 * nothing.
 *
 * `REQUIRED_PROPS` names the file's **default export**, because that is what a
 * `<Component>` in another file resolves to. A file exporting several
 * components cannot declare for them this way, which is in the list below.
 *
 * ## What a caller may do instead
 *
 * Nineteen sites in this tree draw a label with a code in it on purpose, and
 * `label-codes.js` lets them say so in a comment; the same escape is here, for
 * the same reason - a rule with no way to say *this one is deliberate* is a
 * rule people route around by deleting it:
 *
 *     // required-prop: <why this call site is the exception> (#NNN)
 *
 * within six lines above the element. Nothing in the tree uses it today; it
 * exists for the spread below, which is the shape that will need it first.
 *
 * ## What it cannot see, which is the part a count never says
 *
 * - **A spread.** `<ImportPanel {...props} />` may be passing `target` and may
 *   not, and no instrument reading one file can tell: what the object holds was
 *   decided somewhere else. So a spread on an element of a declaring component
 *   is reported - not as a missing prop, but as a call this census cannot read,
 *   which is a question for whoever writes the first one. There are **no**
 *   spreads anywhere in `frontend/src` as this is written, which is why that
 *   decision costs nothing today and is worth making now rather than then.
 * - **A prop whose value is `undefined`.** `target={undefined}` and
 *   `target={maybe?.id}` are both present as far as this is concerned. The rule
 *   is about the caller having been told, not about the value arriving - which
 *   is the same boundary `isCurrent` has.
 * - **A component reached through a wrapper**, or through a binding this script
 *   cannot follow: a named import, `const Panel = ImportPanel`, a component
 *   held in an array of configuration, a re-export. Default imports are what the
 *   ten callers write and all this follows.
 * - **A declaration written in any other syntax.** `export const REQUIRED_PROPS`
 *   is the one spelling read: `export { REQUIRED_PROPS }` below a plain `const`,
 *   a re-export of another file's declaration, and a value computed from
 *   anything rather than written as a literal array of strings are all invisible
 *   or reported as declaring nothing. And where one file writes the declaration
 *   twice, the last one silently wins.
 * - **Anything outside `frontend/src`**, and any code file this script is not
 *   set up to parse, which it counts and names rather than skipping (#123).
 *
 * Run: `npm run census` in `frontend/`. Its own fixtures: `npm run census:test`.
 */
const fs = require('fs')
const path = require('path')

let parser
try {
  parser = require('@babel/parser')
} catch {
  console.error(
    'required-props: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The declaration a component writes about itself. */
const DECLARES = 'REQUIRED_PROPS'

const MARKER = /required-prop:([\s\S]+)/
const TICKET = /#\d+/
/** How far above a call site a marker may be written. */
const REACH = 6

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

const parse = code => parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })

/** `['a', 'b']` → `['a', 'b']`, and nothing for any other shape. */
function literalNames(node) {
  if (!node || node.type !== 'ArrayExpression') return null
  const names = []
  for (const element of node.elements) {
    if (!element || element.type !== 'StringLiteral') return null
    names.push(element.value)
  }
  return names
}

/**
 * The props a function's parameter list destructures, or null where it takes
 * them as one object and this script cannot see the names.
 */
function destructured(fn) {
  if (!fn || !fn.params || fn.params.length === 0) return []
  const first = fn.params[0]
  if (first.type !== 'ObjectPattern') return null
  const names = []
  for (const property of first.properties) {
    if (property.type === 'RestElement') return null
    if (property.key && property.key.type === 'Identifier') names.push(property.key.name)
  }
  return names
}

/** The function a file's `export default` is, where it is one. */
function defaultExport(ast) {
  let found = null
  walk(ast.program, node => {
    if (node.type !== 'ExportDefaultDeclaration') return
    const declaration = node.declaration
    if (declaration.type === 'FunctionDeclaration') found = declaration
    else if (
      declaration.type === 'ArrowFunctionExpression' ||
      declaration.type === 'FunctionExpression'
    )
      found = declaration
    else if (declaration.type === 'Identifier') found = { named: declaration.name }
  })
  if (found && found.named) {
    const name = found.named
    let fn = null
    walk(ast.program, node => {
      if (node.type === 'FunctionDeclaration' && node.id && node.id.name === name) fn = node
      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.id.name === name)
        if (
          node.init &&
          (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
        )
          fn = node.init
    })
    return fn
  }
  return found
}

/**
 * What one file declares about its own default export.
 *
 * `props` is what it says it must be given. `destructures` is what its default
 * export actually takes apart, or null where the names are not in the source -
 * the caller decides what that is worth, because a declaration nothing can be
 * checked against is a different problem from a declaration that is wrong.
 *
 * `sound` is what callers are measured against, and `unsound` the names left
 * out of it: a name the component itself never takes apart is a mistake in the
 * declaration, and ten screens told to pass `taget` is one mistake reported
 * eleven times, ten of those reports naming the wrong fix. The first run of
 * this census did exactly that (#182, found by breaking a real site - #141).
 * Where `destructures` is null nothing can be subtracted, so `sound` is the
 * declaration whole and `unsound` is empty - that file's problem is reported
 * against the declaration itself.
 */
function declaration(code) {
  const ast = parse(code)
  let found = null
  walk(ast.program, node => {
    if (node.type !== 'ExportNamedDeclaration' || !node.declaration) return
    if (node.declaration.type !== 'VariableDeclaration') return
    for (const entry of node.declaration.declarations) {
      if (entry.id.type !== 'Identifier' || entry.id.name !== DECLARES) continue
      found = { props: literalNames(entry.init), line: entry.loc.start.line }
    }
  })
  if (!found) return null
  const destructures = destructured(defaultExport(ast))
  const sound =
    found.props === null || destructures === null
      ? found.props
      : found.props.filter(name => destructures.includes(name))
  const unsound =
    found.props === null || destructures === null
      ? []
      : found.props.filter(name => !destructures.includes(name))
  return { ...found, destructures, sound, unsound }
}

/**
 * One file's call sites of components that declare required props.
 *
 * `lookup` is asked about the module a local name was imported from by default
 * and answers the props that module declares, or null. Keeping resolution
 * outside this function is what lets the fixtures ask of a snippet what the run
 * asks of the tree.
 */
function examine(code, lookup) {
  const ast = parse(code)
  const comments = ast.comments || []

  /** Local name → the specifier it was default-imported from. */
  const imported = new Map()
  walk(ast.program, node => {
    if (node.type !== 'ImportDeclaration') return
    for (const specifier of node.specifiers)
      if (specifier.type === 'ImportDefaultSpecifier')
        imported.set(specifier.local.name, node.source.value)
  })

  const sites = []
  walk(ast.program, node => {
    if (node.type !== 'JSXOpeningElement') return
    if (node.name.type !== 'JSXIdentifier') return
    const from = imported.get(node.name.name)
    if (from === undefined) return
    const required = lookup(from)
    if (!required || required.length === 0) return

    const passed = new Set()
    let spread = false
    for (const attribute of node.attributes) {
      if (attribute.type === 'JSXSpreadAttribute') spread = true
      else if (attribute.name && attribute.name.type === 'JSXIdentifier')
        passed.add(attribute.name.name)
    }

    sites.push({
      component: node.name.name,
      from,
      required,
      line: node.loc.start.line,
      missing: required.filter(name => !passed.has(name)),
      spread,
      marker: markerFor(node.loc.start.line, comments),
    })
  })

  return sites
}

/**
 * The marker for a call site, if one is written above it.
 *
 * Measured by line rather than by the statement the element sits in, for
 * `label-codes.js`'s reason: that statement is usually the one `return` the
 * whole screen is drawn by, and a marker anywhere inside it would cover every
 * element on the screen (#141).
 */
function markerFor(line, comments) {
  for (const [index, comment] of comments.entries()) {
    const ends = comment.loc.end.line
    if (ends >= line || line - ends > REACH) continue
    const head = MARKER.exec(comment.value)
    if (!head) continue
    let text = head[1]
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

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function filesUnder(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) filesUnder(full, out)
    else out.push(full)
  }
  return out
}

/**
 * Where a specifier written in `from` resolves to, by the two spellings this
 * tree writes: a file, and a directory's `index.js`.
 */
function resolve(from, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(from), specifier)
  for (const candidate of [base, base + PARSED, path.join(base, 'index' + PARSED)])
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  return null
}

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)
  const notCode = everything.filter(file => !CODE.has(path.extname(file)))
  const extensions = [...new Set(notCode.map(file => path.extname(file) || '(none)'))].sort()

  const problems = []
  const marked = []

  // What each file declares about itself, read before any call site is asked
  // about: the population is the declarations, so it has to exist first.
  const declares = new Map()
  const parsed = new Map()
  const unparsed = new Set()
  for (const file of sources) {
    const code = fs.readFileSync(file, 'utf8')
    parsed.set(file, code)
    let found
    try {
      found = declaration(code)
    } catch (error) {
      unparsed.add(file)
      problems.push({
        where: shown(file),
        line: error.loc ? error.loc.line : 0,
        why: 'could not be parsed',
      })
      continue
    }
    if (!found) continue
    if (found.props === null) {
      problems.push({
        where: shown(file),
        line: found.line,
        why:
          'exports ' +
          DECLARES +
          ' as something other than a literal array of strings, so no caller of it is checked',
      })
      continue
    }
    if (found.destructures === null)
      problems.push({
        where: shown(file),
        line: found.line,
        why:
          'declares ' +
          DECLARES +
          ' but its default export does not destructure its props by name, so the declaration cannot be checked against it',
      })
    for (const name of found.unsound)
      problems.push({
        where: shown(file),
        line: found.line,
        why:
          'declares `' +
          name +
          '` required, and its default export never takes it apart — a name no caller can be measured against',
      })
    declares.set(file, found.sound)
  }

  let calls = 0
  for (const file of sources) {
    if (unparsed.has(file)) continue
    const where = shown(file)
    const lookup = specifier => {
      const target = resolve(file, specifier)
      return target ? declares.get(target) || null : null
    }
    let sites
    try {
      sites = examine(parsed.get(file), lookup)
    } catch (error) {
      problems.push({
        where,
        line: error.loc ? error.loc.line : 0,
        why: 'could not be read for call sites',
      })
      continue
    }
    calls += sites.length
    for (const site of sites) {
      const at = where + ':' + site.line
      // The spread is asked about first. A spread removes the attribute, so
      // asking *what is missing* first would report a site this script cannot
      // read as a site it had read - a sentence claiming to know what the
      // object holds, which is the one thing it cannot know.
      const trouble = site.spread
        ? '<' +
          site.component +
          '> is spread into, so whether it is given `' +
          site.required.join('`, `') +
          '` cannot be read here'
        : site.missing.length > 0
          ? '<' +
            site.component +
            '> is given no `' +
            site.missing.join('`, no `') +
            '`, which it declares it must have'
          : null
      if (!trouble) continue
      if (!site.marker)
        problems.push({
          where,
          line: site.line,
          why: trouble + '. If that is deliberate, write `// required-prop: <why> (#NNN)` above it',
        })
      else if (!site.marker.ok)
        problems.push({
          where,
          line: site.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      else marked.push(at + ' — ' + site.marker.reason)
    }
  }

  for (const file of unreadable)
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
      unreadable.length +
      ' · not code ' +
      notCode.length +
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '') +
      ' · components declaring required props ' +
      declares.size +
      ' · call sites measured ' +
      calls +
      ' · marked ' +
      marked.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)

  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { declaration, examine }
