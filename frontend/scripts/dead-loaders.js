/**
 * The census #208 ran by hand, as an instrument that fails.
 *
 * The family: a screen's loader is rebuilt whenever what it reads changes — a
 * `useCallback` keyed on the page, the filters, the route's ids — and a handler
 * that was created before the screen moved still holds the old one. It calls
 * that one. Two things then happen, and which of them the person meets depends
 * on the guard the old loader is handed: a read of the page that was left, drawn
 * over the page they are on (#140's family, from the other end), or — once each
 * loader asks `is the screen still on me` — a read that refuses itself and
 * leaves the table on its *กำลังโหลด…* row with a success sentence above it,
 * which is #208.
 *
 * The staleness is not the render's. A handler created in JSX closes over the
 * render it was drawn in, which is current the moment it is pressed; what makes
 * its loader old is the **wait** in between — its own `await`, or a child's,
 * as with `ImportPanel`, which awaits the upload before calling `onImported`.
 * So the population here is not *the calls that follow an await*: it is every
 * call to a loader the screen replaces, except the one inside the effect that
 * owns it, and the question is which loader the call reaches for.
 *
 * What makes the live one readable is a ref: `onScreen.current = load` in an
 * effect keyed on `load`. That ref is therefore how this script finds the
 * population — a loader nothing puts in a ref has no live copy to read and is
 * not this family (see the blind spots below, which is where that cuts).
 *
 * What it asks, per call:
 *
 * 1. Is the callee a **loader the screen replaces**? That is a name declared in
 *    this file as a function — directly, or through `useCallback(fn, deps)` —
 *    and assigned into some `<ref>.current` somewhere in the same file. Any
 *    other call is not this family; a ref holding a *value* (`onScreen.current =
 *    program`) holds no loader and puts nothing in the population.
 * 2. Is the call inside the effect that owns that loader? An enclosing
 *    `useEffect`/`useCallback`/`useMemo` whose dependency array names it is torn
 *    down and rebuilt with it, so the loader it closes over is the current one
 *    by construction. That is the mount read, and it is not a site.
 * 3. Otherwise: is the loader read **through the ref**? The callee must be a
 *    name bound in the same function to `<ref>.current`, where `<ref>` is one
 *    the file assigns a loader into — the shape #208 carried to fifty-nine
 *    sites in nineteen page files, and #211 to sixty-two in twenty (all but one
 *    spelling the local `drawing`, and `Offerings.js` spelling one `reader` so a
 *    mutation anchor stays unambiguous — #154):
 *
 *        const drawing = onScreen.current
 *        const reloaded = await drawing(() => onScreen.current === drawing)
 *
 * 4. A call that names the declaration instead is a stale read, and must carry
 *    a marker saying why, with a reason and a ticket number.
 * 5. A fresh read whose **guard** names something else is reported too: a call
 *    `drawing(() => onScreen.current === load)` compares the live loader against
 *    the dead one, which is the mistake a careless re-aim of the fix makes, and
 *    it asks the opposite question of the one it looks like. The guard is read
 *    both ways round, as `superseded-answers.js` reads its own (#141).
 *
 * The marker, in a comment inside the function or directly above it:
 *
 *     // dead-loader: <why this one cannot be stale> (#NNN)
 *
 * ## What it cannot measure, said here rather than found out later
 *
 * - **It finds loaders by the ref.** A screen that guards by the *coordinate*
 *   instead — `onScreen.current = activityId` in `ActivityScores.js` — holds no
 *   loader anywhere, so its calls are invisible here. Whether such a screen has
 *   this defect depends on its loader's dependency list, and #208 read them
 *   rather than leaving the sentence general — **4 call sites, and 3 of them a
 *   real gap**: `Plos.js` called the closed-over `load` at three of them, whose
 *   `useCallback` was keyed `[program, report]` and which raises
 *   `setLoading(true)` before asking but lowers it only `if (isCurrent())`, so a
 *   curriculum filter moved while a write was out left the placeholder up with
 *   nothing to take it down — the very mechanism #208 calls structurally
 *   unreachable *through a ref*, alive there. That was read on 15 October 2569
 *   **from the code, not from a row**, which is a claim with the same standing
 *   as a ticket's (#199), so it went out as one: #211, which fixed it the same
 *   day by moving that ref onto the loader. `Plos.js` is therefore inside this
 *   script's population now, and two of its three sites carry rows
 *   (`211a`); the third, `save`, is structurally unreachable for the second
 *   mechanism, and the reason is the **order** rather than the form: it clears
 *   `editing` and calls the loader in one tick, so there is no moment with the
 *   filter on screen and that loader not yet called. *The form replaces the
 *   table for the whole of the write* is true of the write and false of the
 *   reload — `setEditing(null)` runs before the awaited reload, which is what
 *   `133a`'s row 7 comment measured — and this file said it the wrong way round
 *   until #211's own review caught it on 15 October 2569.
 *   `ActivityScores.js:555` is the one call site left outside: that `load` never
 *   touches `setLoading`, so only the superseded answer is at stake, and there
 *   not drawing the old activity's scores over the new one is the right
 *   behaviour. `superseded-answers.js` is the one that asks whether the drawing
 *   is guarded at all.
 * - **It does not grow a second population for a ref that holds a coordinate,
 *   and that is #211's answer rather than an omission (15 October 2569).** Three
 *   files hold one: `ActivityScores.js` above, and
 *   `components/users/GrantsPanel.js`, whose ref holds the `user.user_id` the
 *   panel is of — which has **no call site at all**, its `add` and `remove`
 *   drawing the write's own answer under that coordinate, and whose three guards
 *   are already a ☐ row of `docs/acceptance/12-role-grants.md` with a date and
 *   #141 on them. So a second population would carry a rule that can only fire
 *   on a screen that does not exist yet, and it would have to answer a different
 *   question to do it — not *which loader does this call reach* but *is the
 *   coordinate this ref holds the loader's dependency set*, which means
 *   re-deriving the `useCallback` deps and comparing. What would re-date this:
 *   a screen whose ref holds a coordinate **and** whose loader raises `loading`
 *   without asking. Until then the two members are measured, and the measurement
 *   is in #211's section of `docs/acceptance/19-programme-learning-outcomes.md`.
 * - **It says nothing about reachability.** Whether anybody can actually move
 *   the screen while a given handler's answer is out is a claim with a date on
 *   it — a pager that #199 disabled, a dialog that traps focus, a filter that
 *   does not. #208 measured those per site and fixed the shape at all of them
 *   for that reason. This counts the shape.
 * - **It cannot see the frames.** Which read the person's eyes met is sampled
 *   per frame (#164), not parsed.
 * - **It does not ask whether the answer is read** (`swallowed-refusals.js`) or
 *   whether the drawing is guarded (`superseded-answers.js`). A site can be
 *   fresh here and wrong there.
 * - **It classifies a loader by reading another part of the file**, which is the
 *   boundary #89's lesson is about: a loader handed in as a parameter or held in
 *   a prop has no local declaration to read and is not in the population.
 * - **A ref it cannot classify is a problem, not a pass.** An assignment
 *   `<ref>.current = <call(...)>` or anything else this script cannot resolve to
 *   a local function or a local value is reported where it sits, so the shape
 *   that arrives next cannot arrive unseen.
 *
 * Run: `npm run census` in `frontend/`. Its own fixtures: `npm run census:test`
 * — and fixtures pass either way until a real site is broken with the
 * instrument (#141), so this one was seen red on the whole corpus with
 * `Departments.confirmRemoval` and `Users.toggle` put back to `load`: 2
 * problems, both named by file and line.
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
    'dead-loaders: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

// Everything after the colon to the end of the comment: the reason is a
// paragraph rather than a line, for the reason `superseded-answers.js` gives.
const MARKER = /dead-loader:([\s\S]+)/
const TICKET = /#\d+/

/** The hooks whose second argument is a dependency array. */
const KEYED = new Set(['useEffect', 'useLayoutEffect', 'useCallback', 'useMemo'])

const FUNCTIONS = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'ObjectMethod',
  'ClassMethod',
])

/** What a ref holds when it holds a value rather than a loader. */
const VALUES = new Set([
  'MemberExpression',
  'ObjectExpression',
  'ArrayExpression',
  'NullLiteral',
  'StringLiteral',
  'NumericLiteral',
  'BooleanLiteral',
  'TemplateLiteral',
  'BinaryExpression',
  'ConditionalExpression',
  'LogicalExpression',
  'UnaryExpression',
  'NewExpression',
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

/** The function a declaration holds, through `useCallback(fn, deps)` as well. */
function functionOf(init) {
  if (!init) return null
  if (FUNCTIONS.has(init.type)) return init
  if (init.type === 'CallExpression')
    for (const argument of init.arguments) if (FUNCTIONS.has(argument.type)) return argument
  return null
}

/** `<ref>.current`, as a member expression read or written. */
function refOf(node) {
  if (!node || node.type !== 'MemberExpression' || node.computed) return null
  if (node.object.type !== 'Identifier') return null
  const property = node.property
  const named = property.type === 'Identifier' ? property.name : property.value
  return named === 'current' ? node.object.name : null
}

/** The names this file declares as a function. */
function functionNames(program) {
  const names = new Set()
  walk(program, node => {
    if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && functionOf(node.init))
      names.add(node.id.name)
    if (node.type === 'FunctionDeclaration' && node.id) names.add(node.id.name)
  })
  return names
}

/**
 * The refs this file puts a loader into, and the loaders they hold.
 *
 * `onScreen.current = load` is the whole mechanism: it is what makes the live
 * loader readable, so it is also what says a loader is one the screen replaces.
 * An assignment whose right-hand side is neither a local function nor a plain
 * local value or literal is handed back as a shape this script could not read,
 * for the caller to report.
 */
function loaderRefs(program, declared) {
  const refs = new Map()
  const loaders = new Set()
  const unreadable = []
  walk(program, node => {
    if (node.type !== 'AssignmentExpression' || node.operator !== '=') return
    const ref = refOf(node.left)
    if (!ref) return
    const value = node.right
    if (value.type === 'Identifier') {
      if (declared.has(value.name)) {
        loaders.add(value.name)
        if (!refs.has(ref)) refs.set(ref, new Set())
        refs.get(ref).add(value.name)
      }
      return
    }
    // A ref holding a value rather than a loader: a coordinate guard, which the
    // docstring's first blind spot is about. `VALUES` is beside `KEYED` and
    // `FUNCTIONS` at module scope, like every sibling census's sets.
    if (VALUES.has(value.type)) return
    if (value.type === 'CallExpression') {
      const callee = value.callee
      const name = callee.type === 'Identifier' ? callee.name : null
      // `String(activityId)`, `readOf(page)`: a value built by a call. A call to
      // a local *function name* would be the loader's own answer, which is not a
      // shape this tree has - so it is reported rather than assumed either way.
      if (name && !declared.has(name)) return
      if (!name) return
    }
    unreadable.push({ line: node.loc.start.line, shape: value.type })
  })
  return { refs, loaders, unreadable }
}

/** Is this call inside a hook whose dependency array names `loader`? */
function insideItsOwnEffect(parents, loader) {
  for (const parent of parents) {
    if (parent.type !== 'CallExpression') continue
    const callee = parent.callee
    const named =
      callee.type === 'Identifier'
        ? callee.name
        : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
          ? callee.property.name
          : null
    if (!named || !KEYED.has(named)) continue
    const deps = parent.arguments[1]
    if (!deps || deps.type !== 'ArrayExpression') continue
    if (deps.elements.some(element => element && element.type === 'Identifier' && element.name === loader))
      return true
  }
  return false
}

/** The enclosing function of a node, innermost first. */
function enclosing(parents) {
  return [...parents].reverse().find(parent => FUNCTIONS.has(parent.type)) || null
}

/**
 * The names bound in this function to `<ref>.current`, by ref.
 *
 * `const drawing = onScreen.current` is the read the fix makes; the name is what
 * the call and its guard both have to agree on.
 */
function freshNames(fn) {
  const bound = new Map()
  walk(fn, node => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier') return
    const ref = refOf(node.init)
    if (ref) bound.set(node.id.name, ref)
  })
  return bound
}

/**
 * What a call's first argument compares `<ref>.current` against.
 *
 * `() => onScreen.current === drawing` and `() => drawing === onScreen.current`
 * are the same guard; a guard that compares against anything but an identifier,
 * or no guard at all, is handed back as `null` and says nothing either way.
 */
function guardNames(call) {
  const argument = call.arguments[0]
  if (!argument || !FUNCTIONS.has(argument.type)) return null
  let against = null
  walk(argument, node => {
    if (against) return
    if (node.type !== 'BinaryExpression') return
    if (node.operator !== '===' && node.operator !== '!==') return
    const left = refOf(node.left)
    const right = refOf(node.right)
    if (left && node.right.type === 'Identifier') against = { ref: left, name: node.right.name }
    else if (right && node.left.type === 'Identifier') against = { ref: right, name: node.left.name }
  })
  return against
}

/**
 * Does this statement sit directly above that one?
 *
 * Asked of the source rather than of babel's `leadingComments`, for the reason
 * `superseded-answers.js` gives.
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
 * Returns one entry per call of a loader the screen replaces, outside the effect
 * that owns it, plus the ref shapes it could not classify.
 */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  const declared = functionNames(ast.program)
  const { refs, loaders, unreadable } = loaderRefs(ast.program, declared)

  const sites = []
  const mounts = []

  walk(ast.program, (node, parents) => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier') return
    const called = node.callee.name
    const fn = enclosing(parents)
    if (!fn) return
    const line = node.loc.start.line

    if (loaders.has(called)) {
      if (insideItsOwnEffect(parents, called)) {
        mounts.push({ line, loader: called })
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
        loader: called,
        read: 'from the closure',
        marker: markerFor(fn, statement, comments, code),
      })
      return
    }

    const fresh = freshNames(fn)
    const ref = fresh.get(called)
    if (!ref || !refs.has(ref)) return
    const guard = guardNames(node)
    sites.push({
      line,
      loader: called,
      read: 'through ' + ref,
      guard: guard ? guard.name : null,
      mismatch: Boolean(guard && (guard.ref !== ref || guard.name !== called)),
    })
  })

  return { sites, mounts, unreadable, loaders: loaders.size, refs: refs.size }
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

  let loaders = 0
  let mounts = 0
  const fresh = []
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
    loaders += found.loaders
    mounts += found.mounts.length

    for (const site of found.sites) {
      const at = where + ':' + site.line
      if (site.read === 'from the closure') {
        if (!site.marker)
          problems.push({
            where,
            line: site.line,
            why:
              'calls `' +
              site.loader +
              '` from its own closure, which the screen may have replaced while ' +
              'this function was waiting. Read the live one off the ref it is ' +
              'kept in, or write `// dead-loader: <why> (#NNN)` in the function',
          })
        else if (!site.marker.ok)
          problems.push({
            where,
            line: site.marker.line,
            why: 'marker needs a reason of its own and a ticket number',
          })
        else marked.push(at + ' — ' + site.marker.reason)
      } else if (site.mismatch)
        problems.push({
          where,
          line: site.line,
          why:
            'reads the live loader as `' +
            site.loader +
            '` and then guards it against `' +
            site.guard +
            '`, so the two halves of the read are about different loaders',
        })
      else fresh.push(at + ' (' + site.loader + ', ' + site.read + ')')
    }

    for (const shape of found.unreadable)
      problems.push({
        where,
        line: shape.line,
        why:
          'assigns a `' +
          shape.shape +
          '` into a ref, which this script cannot classify as a loader or as a ' +
          'value. Teach it the shape rather than leaving it unread',
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
      (extensions.length ? ' (' + extensions.join(' ') + ')' : '')
  )
  console.log(
    'loaders a screen replaces ' +
      loaders +
      ' · read inside their own effect ' +
      mounts +
      ' · read live off the ref ' +
      fresh.length +
      ' · marked ' +
      marked.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--fresh')) for (const entry of fresh) console.log('  ' + entry)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
