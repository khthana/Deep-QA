/**
 * The seventh census: a landing screen that does not read the generation it is
 * drawn at - #230.
 *
 * #155's defect was a screen left showing another scope's rows under a picker
 * that had already changed hat. It was closed with a key on the `<Outlet />` in
 * `Mainpage.js`: one structural point, and every screen under it covered by
 * construction. #198 asked what a remount took with it, measured the answer -
 * the page, the filter, and a form typed and not saved - and the owner chose,
 * 23 October 2569, the re-read without the remount. So the rule moved out of
 * the outlet and into the dependency list of each landing's own `load`.
 *
 * That is the price the owner accepted, written with its date in
 * `docs/acceptance/10-application-shell.md`'s fourth criterion: the rule is no
 * longer held up by anything structural. A seventh landing, or an existing
 * landing that `landingPath` comes to point somewhere else, reads once and goes
 * on drawing the old grant's rows, and nothing in the tree goes red. Two
 * mutants stand over the rule and both stand on one screen (`155:noscreendep`
 * on `Rubrics.js`, `198:frozenvalue` on the shell), which is #68's shape: one
 * place holding the opinion for six.
 *
 * ## Two questions, not one
 *
 * **1. Does each landing read the generation in its own reads?** The population
 * is derived rather than listed (#123): `components/SidebarItem/menus.js` says
 * which menu each role gets and `landingPath` says a role lands on the first
 * entry of it, so the landings are a property of the menus and move when they
 * do. From the path, `routes/AppRoutes.js` names the component, and the
 * component's own import says which file it is. Nothing here holds the name
 * `Users.js`.
 *
 * **2. Does a landing's second read ask too?** A remount re-read everything the
 * screen asked for on mount; a dependency list re-reads one thing. `Rubrics`
 * and `Programs` each ask for two different lists - their own rows, and the
 * curricula or departments this grant reaches - and the second of each was
 * written *fetched once*, which was true while a new grant meant a new mount.
 * #198 gave both a second dependency; `e2e/tests/198a-a-re-read-that-keeps-the-screen.spec.js`
 * row 3 and `198:nopickerdep` hold them. The same read also lives one hop away
 * from a landing, in a component the landing draws, where question 1 cannot see
 * it: `components/users/useGrantable.js` (#215) and
 * `components/results/CohortPickers.js`.
 *
 * So question 2 reads the modules a landing *reaches* by import, and asks only
 * about the calls an api module has declared grant-scoped:
 *
 *     export const GRANT_SCOPED = ['listGrantable']
 *
 * which is #182's shape - a declaration the subject makes in code, checked
 * against what the module exports, rather than a list of names in this script.
 * What makes a read one of those is measurable and not a feeling: it takes **no
 * argument** saying which rows it means, so there is no prop a landing could
 * hand down to move it, where a list of rows the screen filters (`listUsers`,
 * `listPrograms`) takes `params` and moves with the landing's own dependency
 * list. All eleven declared today are nullary; every row list in `api/` is not.
 *
 * **Question 1 is deliberately loose, which is the other half of that choice.**
 * It asks about *every* api read in a landing's own file and not only the
 * grant-scoped ones, because a landing's `load` is what the number is for and
 * the screens are six. A read in a landing that is legitimately keyed on
 * something else says so with the marker below, which is what `loadDrill` pays
 * for; outside the landings, where the files are a hundred and forty, a rule
 * that wide would be the one too loose.
 *
 * Question 2 is narrow on purpose. *Every api read in every component a landing
 * reaches* would be the rule that is too loose (#141): a panel's read is
 * usually keyed on a prop the landing hands it, and the landing's own
 * dependency list is what moves that prop. What has no prop to move is a list
 * the **server** scopes to the acting grant, which is what `GRANT_SCOPED`
 * names.
 *
 * Why only landings: the generation is raised by `onStayedPut` in
 * `Mainpage.js`, which `RoleDropdown` fires when the switch lands where the
 * router already is. A switch that moves carries the open screen away and the
 * next one mounts, so a screen that is nobody's landing can never see the
 * number move - `context/ScreenGeneration.js` says so too.
 *
 * ## What a caller may do instead
 *
 * The same escape `label-codes.js` and `required-props.js` carry, because a
 * rule with no way to say *this one is deliberate* is a rule people route
 * around by deleting it:
 *
 *     // screen-generation: <why this read is the exception> (#NNN)
 *
 * within six lines above the `useCallback` or `useEffect`. One read in the tree
 * uses it: `loadDrill` in `pages/ProgramLevelByIntake.js`, whose reason is
 * already written in the code it sits beside - the read above it closes the
 * drill-down on every read, so a panel can only be open for the generation
 * that is drawn.
 *
 * ## What it cannot see, which is the part a count never says
 *
 * - **A read written as anything but `useCallback` or `useEffect`.** A read in
 *   an event handler, in a `useMemo`, in a hook of this tree's own, or at the
 *   top of a component body is invisible here. The rule is about what the
 *   screen keeps drawn, and in this tree that is written one of those two ways;
 *   a handler's read is a press and has no generation to name.
 * - **A dependency forwarded through a prop or through a hook's return.** A
 *   landing that passes `generation` down to a child and lets the child key its
 *   own read on it satisfies the rule and is reported as a landing read that
 *   names nothing. So is a landing whose `load` depends on a value that depends
 *   on the generation.
 * - **An api function reached by any binding this script cannot follow**: a
 *   renamed import (`import { listGrantable as roles }` is read, but
 *   `const roles = listGrantable` is not), a namespace import, a call through
 *   an object, a re-export, or a function passed by reference and called
 *   somewhere else (#133's rule, which a grep for the call misses too).
 * - **A landing resolved by any other shape.** `firstEntry`'s rule -
 *   `menu[0].sub ? menu[0].sub[0] : menu[0]` - is restated here, and a
 *   restatement is a second place the rule can be wrong (#96). What holds the
 *   real rule is `66a` rows 1-2, which read the landing off the sidebar. A menu
 *   whose first entry is computed rather than written as a literal, a role in
 *   `MENUS` whose module this script cannot resolve, and a route whose
 *   `element` is not a default-imported component are each reported rather than
 *   skipped.
 * - **A declaration written in any other syntax.** `export const GRANT_SCOPED`
 *   is the one spelling read; a computed value, a re-export, or
 *   `export { GRANT_SCOPED }` below a plain `const` is invisible or reported as
 *   declaring nothing.
 * - **An api module that declares nothing at all.** Question 2's whole
 *   population is the declarations, so a grant-scoped read in a module that has
 *   never written one is silent green, and the only tell is the count of
 *   declared functions in the summary line. That is the price of a rule about a
 *   declaration rather than about a list of names (#182), and it is why the
 *   count is printed rather than the problems alone (#126).
 * - **Whether the number is what the read should have been keyed on at all.**
 *   This is a question about dependency lists. That a landing's read is the
 *   *right* read, and that raising the generation makes the screen show the new
 *   grant's rows, is `e2e/tests/198a-a-re-read-that-keeps-the-screen.spec.js`
 *   and the two mutants' business.
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
    'landing-generations: @babel/parser could not be required. It arrives ' +
      'with react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** Where the menus, the routes and the number itself live. */
const MENUS = path.join(SRC, 'components', 'SidebarItem', 'menus.js')
const ROUTES = path.join(SRC, 'routes', 'AppRoutes.js')
const API = path.join(SRC, 'api')

/** The hook that hands the number down. */
const READS_GENERATION = 'useScreenGeneration'
/** The two shapes a kept read is written in here. */
const HOOKS = new Set(['useCallback', 'useEffect'])
/** The declaration an api module writes about itself. */
const DECLARES = 'GRANT_SCOPED'

const MARKER = /screen-generation:([\s\S]+)/
const TICKET = /#\d+/
/** How far above a read a marker may be written. */
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

/** Local name → the specifier it was default-imported from. */
function defaultImports(ast) {
  const imported = new Map()
  walk(ast.program, node => {
    if (node.type !== 'ImportDeclaration') return
    for (const specifier of node.specifiers)
      if (specifier.type === 'ImportDefaultSpecifier')
        imported.set(specifier.local.name, node.source.value)
  })
  return imported
}

/** Local name → `{ specifier, exported }` for every named import. */
function namedImports(ast) {
  const imported = new Map()
  walk(ast.program, node => {
    if (node.type !== 'ImportDeclaration') return
    for (const specifier of node.specifiers)
      if (specifier.type === 'ImportSpecifier')
        imported.set(specifier.local.name, {
          specifier: node.source.value,
          exported: specifier.imported.name || specifier.imported.value,
        })
  })
  return imported
}

/**
 * Which module each role's menu comes from.
 *
 * `MENUS` is written as shorthand properties over six default-free imports, so
 * the role code is the property and the import says where the array is.
 */
function landingSpecifiers(code) {
  const ast = parse(code)
  const imported = namedImports(ast)
  const roles = new Map()
  walk(ast.program, node => {
    if (node.type !== 'VariableDeclarator') return
    if (node.id.type !== 'Identifier' || node.id.name !== 'MENUS') return
    if (!node.init || node.init.type !== 'ObjectExpression') return
    for (const property of node.init.properties) {
      if (property.type !== 'ObjectProperty') continue
      if (property.key.type !== 'Identifier') continue
      const value = property.value
      const local = value.type === 'Identifier' ? value.name : null
      const from = local ? imported.get(local) : null
      roles.set(property.key.name, {
        local,
        specifier: from ? from.specifier : null,
        exported: from ? from.exported : null,
        line: property.loc.start.line,
      })
    }
  })
  return roles
}

/**
 * Where one menu points first: `firstEntry`'s rule restated.
 *
 * `menu[0].sub ? menu[0].sub[0] : menu[0]`, then that entry's `path`. Null
 * where any step of it is not written as a literal, which the caller reports
 * rather than passing over.
 */
function firstPath(code, name) {
  const ast = parse(code)
  let array = null
  walk(ast.program, node => {
    if (node.type !== 'VariableDeclarator') return
    if (node.id.type !== 'Identifier' || node.id.name !== name) return
    if (node.init && node.init.type === 'ArrayExpression') array = node.init
  })
  if (!array || array.elements.length === 0) return null
  let entry = array.elements[0]
  if (!entry || entry.type !== 'ObjectExpression') return null
  const property = key =>
    entry.properties.find(
      candidate =>
        candidate.type === 'ObjectProperty' &&
        candidate.key.type === 'Identifier' &&
        candidate.key.name === key
    )
  const sub = property('sub')
  if (sub) {
    if (sub.value.type !== 'ArrayExpression' || sub.value.elements.length === 0) return null
    entry = sub.value.elements[0]
    if (!entry || entry.type !== 'ObjectExpression') return null
  }
  const found = property('path')
  if (!found || found.value.type !== 'StringLiteral') return null
  return found.value.value
}

/** `/main/` + `users` and the `/*` a layout route ends with, as one address. */
function address(segments) {
  const parts = []
  for (const segment of segments)
    for (const part of segment.replace(/\/\*$/, '').split('/'))
      if (part && part !== '*') parts.push(part)
  return '/' + parts.join('/')
}

/** One attribute of a `<Route>`, where it is written as a string. */
function stringAttribute(element, name) {
  for (const attribute of element.attributes || []) {
    if (attribute.type !== 'JSXAttribute') continue
    if (!attribute.name || attribute.name.name !== name) continue
    if (attribute.value && attribute.value.type === 'StringLiteral') return attribute.value.value
    return null
  }
  return null
}

/** Whether a `<Route>` carries the `index` attribute. */
function isIndex(element) {
  return (element.attributes || []).some(
    attribute =>
      attribute.type === 'JSXAttribute' && attribute.name && attribute.name.name === 'index'
  )
}

/** The component one `element={<X />}` names, where it names one. */
function elementComponent(element) {
  for (const attribute of element.attributes || []) {
    if (attribute.type !== 'JSXAttribute') continue
    if (!attribute.name || attribute.name.name !== 'element') continue
    const value = attribute.value
    if (!value || value.type !== 'JSXExpressionContainer') return null
    const expression = value.expression
    if (expression.type !== 'JSXElement') return null
    const name = expression.openingElement.name
    return name.type === 'JSXIdentifier' ? name.name : null
  }
  return null
}

/**
 * Every address the router draws a component at.
 *
 * A route with routes inside it is a layout and is passed over: its own
 * `element` is the shell, and what lands at that address is the `index` child.
 */
function routeComponents(code) {
  const ast = parse(code)
  const imported = defaultImports(ast)
  const drawn = new Map()
  walk(ast.program, (node, parents) => {
    if (node.type !== 'JSXElement') return
    const opening = node.openingElement
    if (opening.name.type !== 'JSXIdentifier' || opening.name.name !== 'Route') return

    let nested = false
    walk(node.children, child => {
      if (
        child.type === 'JSXElement' &&
        child.openingElement.name.type === 'JSXIdentifier' &&
        child.openingElement.name.name === 'Route'
      )
        nested = true
    })
    if (nested) return

    const chain = parents.filter(
      parent =>
        parent.type === 'JSXElement' &&
        parent.openingElement.name.type === 'JSXIdentifier' &&
        parent.openingElement.name.name === 'Route'
    )
    const segments = []
    for (const parent of chain) {
      const own = stringAttribute(parent.openingElement, 'path')
      if (own) segments.push(own)
    }
    const own = stringAttribute(opening, 'path')
    if (own) segments.push(own)
    else if (!isIndex(opening)) return

    const component = elementComponent(opening)
    drawn.set(address(segments), {
      component,
      specifier: component ? imported.get(component) || null : null,
      line: opening.loc.start.line,
    })
  })
  return drawn
}

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
 * What one api module declares about itself.
 *
 * `names` is what it says is scoped to the acting grant, `exports` what it
 * actually exports, and `unsound` the declared names it does not: a name the
 * module never exports is a mistake in the declaration, and reporting it at
 * every call site would name the wrong fix once per caller (#182).
 */
function grantScoped(code) {
  const ast = parse(code)
  let found = null
  const exported = new Set()
  walk(ast.program, node => {
    if (node.type !== 'ExportNamedDeclaration' || !node.declaration) return
    if (node.declaration.type !== 'VariableDeclaration') return
    for (const entry of node.declaration.declarations) {
      if (entry.id.type !== 'Identifier') continue
      if (entry.id.name === DECLARES) found = { names: literalNames(entry.init), line: entry.loc.start.line }
      else exported.add(entry.id.name)
    }
  })
  if (!found) return null
  const unsound = found.names === null ? [] : found.names.filter(name => !exported.has(name))
  const sound = found.names === null ? null : found.names.filter(name => exported.has(name))
  return { ...found, exports: [...exported], sound, unsound }
}

/**
 * One file's reads, and where the generation is in them.
 *
 * `api` is asked whether a specifier is an api module and `scoped` whether one
 * of its exports is grant-scoped. Keeping resolution outside this function is
 * what lets the fixtures ask of a snippet what the run asks of the tree.
 */
function examine(code, { api, scoped }) {
  const ast = parse(code)
  const comments = ast.comments || []
  const imported = namedImports(ast)

  let generation = null
  walk(ast.program, node => {
    if (node.type !== 'VariableDeclarator') return
    if (!node.init || node.init.type !== 'CallExpression') return
    if (node.init.callee.type !== 'Identifier' || node.init.callee.name !== READS_GENERATION) return
    if (node.id.type !== 'Identifier') return
    generation = { name: node.id.name, line: node.id.loc.start.line }
  })

  const sites = []
  walk(ast.program, (node, parents) => {
    if (node.type !== 'CallExpression') return
    if (node.callee.type !== 'Identifier' || !HOOKS.has(node.callee.name)) return
    if (parents.some(parent => parent.type === 'CallExpression' && HOOKS.has(parent.callee.name)))
      return

    const body = node.arguments[0]
    const last = node.arguments[node.arguments.length - 1]
    const deps =
      node.arguments.length > 1 && last.type === 'ArrayExpression'
        ? last.elements
            .filter(element => element && element.type === 'Identifier')
            .map(element => element.name)
        : null

    const calls = []
    walk(body, inner => {
      if (inner.type !== 'CallExpression') return
      if (inner.callee.type !== 'Identifier') return
      const from = imported.get(inner.callee.name)
      if (!from) return
      if (!api(from.specifier)) return
      calls.push({ name: inner.callee.name, specifier: from.specifier, exported: from.exported })
    })
    if (calls.length === 0) return

    sites.push({
      hook: node.callee.name,
      line: node.loc.start.line,
      calls: calls.map(call => call.name),
      grant: calls
        .filter(call => scoped(call.specifier, call.exported))
        .map(call => call.name),
      deps,
      marker: markerFor(node.loc.start.line, comments),
    })
  })

  return { generation, sites }
}

/**
 * The marker for a read, if one is written above it.
 *
 * Measured by line rather than by the statement the read sits in, for
 * `label-codes.js`'s reason: a marker anywhere inside the component would
 * cover every read in it (#141).
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

const underApi = file => file === API || file.startsWith(API + path.sep)

/**
 * Every module a landing reaches by import, the api modules apart.
 *
 * The api modules are left out because they are what is read, not what reads:
 * a `get` in `api/users.js` is one line with no screen around it and no
 * generation to name.
 */
function reachedFrom(starts, source) {
  const seen = new Set()
  const queue = [...starts]
  while (queue.length > 0) {
    const file = queue.shift()
    if (seen.has(file)) continue
    seen.add(file)
    const code = source(file)
    if (code === null) continue
    let ast
    try {
      ast = parse(code)
    } catch {
      continue
    }
    walk(ast.program, node => {
      if (node.type !== 'ImportDeclaration') return
      const target = resolve(file, node.source.value)
      if (!target || underApi(target) || path.extname(target) !== PARSED) return
      if (!seen.has(target)) queue.push(target)
    })
  }
  return seen
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

  const parsed = new Map()
  const unparsed = new Set()
  for (const file of sources) {
    const code = fs.readFileSync(file, 'utf8')
    parsed.set(file, code)
    try {
      parse(code)
    } catch (error) {
      unparsed.add(file)
      problems.push({
        where: shown(file),
        line: error.loc ? error.loc.line : 0,
        why: 'could not be parsed',
      })
    }
  }
  const source = file => (parsed.has(file) && !unparsed.has(file) ? parsed.get(file) : null)

  // What each api module declares about itself, read before any call site is
  // asked about: the population of question 2 is the declarations, so they
  // have to exist first.
  const declares = new Map()
  for (const file of sources) {
    if (!underApi(file) || unparsed.has(file)) continue
    const found = grantScoped(parsed.get(file))
    if (!found) continue
    if (found.names === null) {
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
    for (const name of found.unsound)
      problems.push({
        where: shown(file),
        line: found.line,
        why:
          'declares `' +
          name +
          '` grant-scoped and does not export it — a name no caller can be measured against',
      })
    declares.set(file, new Set(found.sound))
  }
  const scopedCount = [...declares.values()].reduce((total, names) => total + names.size, 0)

  // Question 1's population: where each role lands, derived from the menus and
  // the routes rather than written here (#123).
  const landings = new Map()
  if (unparsed.has(MENUS) || !parsed.has(MENUS)) {
    problems.push({ where: shown(MENUS), line: 0, why: 'could not be read for the menus' })
  } else {
    const roles = landingSpecifiers(parsed.get(MENUS))
    if (roles.size === 0)
      problems.push({
        where: shown(MENUS),
        line: 0,
        why: 'exports no MENUS this script can read, so no landing was measured',
      })
    const drawn =
      unparsed.has(ROUTES) || !parsed.has(ROUTES) ? null : routeComponents(parsed.get(ROUTES))
    if (!drawn)
      problems.push({ where: shown(ROUTES), line: 0, why: 'could not be read for the routes' })
    for (const [role, menu] of roles) {
      const target = menu.specifier ? resolve(MENUS, menu.specifier) : null
      const code = target ? source(target) : null
      const found = code && menu.exported ? firstPath(code, menu.exported) : null
      if (!found) {
        problems.push({
          where: shown(MENUS),
          line: menu.line,
          why:
            "the landing of " +
            role +
            ' is not a literal path this script can read, so that screen was not measured',
        })
        continue
      }
      if (!drawn) continue
      const route = drawn.get(found)
      if (!route || !route.specifier) {
        problems.push({
          where: shown(ROUTES),
          line: route ? route.line : 0,
          why:
            'draws no default-imported component at `' +
            found +
            '`, where ' +
            role +
            ' lands, so that screen was not measured',
        })
        continue
      }
      const file = resolve(ROUTES, route.specifier)
      if (!file || !parsed.has(file) || unparsed.has(file)) {
        problems.push({
          where: shown(ROUTES),
          line: route.line,
          why: '`' + route.component + '` resolves to no file this script read',
        })
        continue
      }
      if (!landings.has(file)) landings.set(file, [])
      landings.get(file).push(role)
    }
  }

  const isApi = (file, specifier) => {
    const target = resolve(file, specifier)
    return target !== null && underApi(target)
  }
  const isScoped = (file, specifier, exported) => {
    const target = resolve(file, specifier)
    if (!target) return false
    const names = declares.get(target)
    return names !== undefined && names.has(exported)
  }
  const ask = file =>
    examine(parsed.get(file), {
      api: specifier => isApi(file, specifier),
      scoped: (specifier, exported) => isScoped(file, specifier, exported),
    })

  const trouble = (file, site, why) => {
    if (!site.marker)
      problems.push({
        where: shown(file),
        line: site.line,
        why: why + '. If that is deliberate, write `// screen-generation: <why> (#NNN)` above it',
      })
    else if (!site.marker.ok)
      problems.push({
        where: shown(file),
        line: site.marker.line,
        why: 'marker needs a reason of its own and a ticket number',
      })
    else marked.push(shown(file) + ':' + site.line + ' — ' + site.marker.reason)
  }

  // Question 1.
  let reads = 0
  for (const [file, roles] of landings) {
    const where = shown(file)
    let found
    try {
      found = ask(file)
    } catch (error) {
      problems.push({ where, line: error.loc ? error.loc.line : 0, why: 'could not be read' })
      continue
    }
    if (!found.generation) {
      problems.push({
        where,
        line: 0,
        why:
          'is where ' +
          roles.join(' and ') +
          ' lands and never calls ' +
          READS_GENERATION +
          '(), so a grant switched in place leaves the previous scope rows drawn (#230)',
      })
      continue
    }
    for (const site of found.sites) {
      reads += 1
      if (site.deps !== null && site.deps.includes(found.generation.name)) continue
      trouble(
        file,
        site,
        'reads `' +
          site.calls.join('`, `') +
          '` in a ' +
          site.hook +
          ' that does not name `' +
          found.generation.name +
          '` in its ' +
          (site.deps === null ? 'dependencies, which are not written as an array' : 'dependency list')
      )
    }
  }

  // Question 2: the modules those landings reach, which is where a second read
  // of the grant's own scope lives.
  let scopedSites = 0
  for (const file of reachedFrom([...landings.keys()], source)) {
    if (landings.has(file) || !parsed.has(file) || unparsed.has(file)) continue
    const where = shown(file)
    let found
    try {
      found = ask(file)
    } catch (error) {
      problems.push({ where, line: error.loc ? error.loc.line : 0, why: 'could not be read' })
      continue
    }
    for (const site of found.sites) {
      if (site.grant.length === 0) continue
      scopedSites += 1
      if (found.generation && site.deps !== null && site.deps.includes(found.generation.name))
        continue
      trouble(
        file,
        site,
        'is drawn by a landing and reads `' +
          site.grant.join('`, `') +
          '`, which the server scopes to the acting grant, in a ' +
          site.hook +
          ' that names no screen generation'
      )
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
      ' · landings ' +
      landings.size +
      ' · reads measured ' +
      reads +
      ' · grant-scoped functions declared ' +
      scopedCount +
      ' · grant-scoped reads one hop out ' +
      scopedSites +
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

module.exports = { landingSpecifiers, firstPath, routeComponents, grantScoped, examine }
