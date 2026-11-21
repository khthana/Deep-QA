/**
 * The fifteenth census: a programme or department name drawn as if it could
 * not be empty - #298.
 *
 * `program_name_th` and `department_name_th` may be null
 * (`db/migrations/0001`), and the owner answered twice that the columns stay
 * that way: on 20 November 2569 (#297) that a unit with no Thai name reads by
 * its kind word and its code, and on 21 November 2569 (#298) that the same
 * holds for the eleven programme pickers, with the removal question leaving the
 * missing name out. At the commit before #298 this census reads eighteen bare
 * reads: sixteen that #298 fixed - an option with no words on it, a question
 * reading `05 null` - and the two administration tables' name columns, which it
 * marked; its ticket had found nine by a grep for `<option` (#111, #223). This file is why the
 * seventeenth is found the day it is written rather than by somebody's data.
 *
 * **The population is a name column read where it is drawn** - a JSX child or a
 * template holding Thai, `org-codes.js`'s two places (#294), asked of the code
 * and not of a list of screens (#126, #174). A read is safe in two shapes,
 * counted apart so they are on the page rather than hidden in a green:
 *
 *     {entry.program_name_th || entry.program_id}      the left of `??` or `||`
 *     {name ? ` ${removing.program_name_th}` : ''}     a `?:` whose test reads
 *                                                      the same column
 *
 * and a read handed to a call - `programNamed(entry)` - is not drawn here at
 * all, which is the helper's job.
 *
 * A site that draws the name bare on purpose carries
 *
 *     // unit-name: <why this one may be empty> (#NNN)
 *
 * within six lines above it, as a JSX comment among JSX children (#93). On
 * 21 November 2569 the two marked sites are the name columns of the two
 * administration tables, whose code column beside them says which record a
 * blank cell is (#294 rule 2).
 *
 * What it cannot see (#123, #126):
 *
 * - a name drawn through a helper, a `return` or a variable - `nameOf` on three
 *   screens returns the name with a code fallback, and the census does not
 *   follow it;
 * - a name in an attribute - `title=`, `aria-label=`, a prop such as
 *   `SectionsPanel`'s `programName` - which is drawn somewhere this file does
 *   not look;
 * - a test that reads the column through another name, or a `&&` - the guard is
 *   recognised only as a read of the same property in the `?:`'s test, and
 *   only by the property's name: `a.program_name_th ? b.program_name_th : ''`
 *   counts as tested although it tests another record;
 * - what a fallback falls back to - `x.program_name_th || ''` counts as a
 *   fallback and draws nothing, the shape a review of #298 named;
 * - a bare read inside a `&&` - `{shown && x.program_name_th}` is not followed,
 *   so it reads green;
 * - `faculty_name_th`, which is `NOT NULL`, and the `_en` columns - the two
 *   administration tables draw them, behind a `??` or a test, on 21 November
 *   2569, and a bare one would not be seen; and anything the server writes into
 *   a sentence of its own.
 *
 * Run: `npm run census` in `frontend/` runs this beside the others. Its own
 * fixtures: `npm run census:test`.
 */
const fs = require('fs')
const path = require('path')

let parser
try {
  parser = require('@babel/parser')
} catch {
  console.error(
    'nameless-units: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The name columns the schema lets be null. */
const COLUMNS = new Set(['program_name_th', 'department_name_th'])

const MARKER = /unit-name:([\s\S]+)/
const TICKET = /#\d+/
/** How far above a hit a marker may be written. */
const REACH = 6
/** A template holding any Thai letter is a sentence for a person. */
const THAI = /[฀-๿]/

/** Every node below `node`. */
function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit)
    return
  }
  if (typeof node.type !== 'string') return
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments') continue
    if (key === 'innerComments') continue
    walk(node[key], visit)
  }
}

/** The column this expression reads, if it reads one by name. */
const column = node => {
  if (!node) return null
  if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') return null
  if (node.computed || node.property.type !== 'Identifier') return null
  return node.property.name
}

/**
 * Each name column a drawn expression puts on the screen, and how it is
 * protected: `bare`, `fallback` (the left of `??` or `||`), or `tested` (inside
 * a `?:` whose test reads the same column).
 *
 * Only the shapes a drawn value is written in are followed - a bare read, the
 * branches of a `?:`, the sides of a `??` or `||`, a template's expressions -
 * and not a call, whose argument is handed to the callee rather than drawn.
 */
function drawnNames(node, tested = new Set(), out = []) {
  if (!node) return out
  const name = column(node)
  if (name && COLUMNS.has(name)) {
    out.push({
      column: name,
      shape: tested.has(name) ? 'tested' : 'bare',
      line: node.loc.start.line,
      start: node.start,
    })
    return out
  }
  if (node.type === 'ConditionalExpression') {
    const asked = column(node.test)
    const inside = asked && COLUMNS.has(asked) ? new Set([...tested, asked]) : tested
    drawnNames(node.consequent, inside, out)
    drawnNames(node.alternate, tested, out)
  } else if (
    node.type === 'LogicalExpression' &&
    (node.operator === '??' || node.operator === '||')
  ) {
    const left = column(node.left)
    if (left && COLUMNS.has(left))
      out.push({ column: left, shape: 'fallback', line: node.left.loc.start.line, start: node.left.start })
    else drawnNames(node.left, tested, out)
    drawnNames(node.right, tested, out)
  } else if (node.type === 'TemplateLiteral') {
    for (const expression of node.expressions) drawnNames(expression, tested, out)
  }
  return out
}

function hits(ast) {
  const found = []
  walk(ast.program, node => {
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      for (const child of node.children)
        if (child.type === 'JSXExpressionContainer') drawnNames(child.expression, new Set(), found)
      return
    }
    if (node.type === 'TemplateLiteral') {
      if (!node.quasis.some(quasi => THAI.test(quasi.value.raw))) return
      for (const expression of node.expressions) drawnNames(expression, new Set(), found)
    }
  })
  // A template inside a drawn expression is reached twice, so each read once.
  const seen = new Set()
  return found.filter(hit => {
    if (seen.has(hit.start)) return false
    seen.add(hit.start)
    return true
  })
}

/** The marker for a hit, a run of `//` lines being one marker (#233). */
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

/** One file's answer, so the fixtures can ask of a snippet what the run asks of the tree. */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  return hits(ast).map(hit => ({
    ...hit,
    marker: hit.shape === 'bare' ? markerFor(hit.line, comments) : null,
  }))
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

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  const marked = []
  const safe = { fallback: [], tested: [] }
  const problems = []
  let bare = 0

  for (const file of sources) {
    const where = shown(file)
    let found
    try {
      found = examine(fs.readFileSync(file, 'utf8'))
    } catch (error) {
      problems.push({ where, line: error.loc ? error.loc.line : 0, why: 'could not be parsed' })
      continue
    }
    for (const hit of found) {
      const at = where + ':' + hit.line
      if (hit.shape !== 'bare') {
        safe[hit.shape].push(at + ' — ' + hit.column)
        continue
      }
      bare += 1
      if (!hit.marker)
        problems.push({
          where,
          line: hit.line,
          why:
            'draws ' +
            hit.column +
            ' as if it could not be empty. Give it a fallback - `programNamed` or `departmentNamed` (#298); if an empty one is right here, write `// unit-name: <why> (#NNN)` above it',
        })
      else if (!hit.marker.ok)
        problems.push({
          where,
          line: hit.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      else marked.push(at + ' — ' + hit.marker.reason)
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
      ' · names drawn bare ' +
      bare +
      ' · marked ' +
      marked.length +
      ' · with a fallback ' +
      safe.fallback.length +
      ' · behind a test ' +
      safe.tested.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) {
    for (const entry of marked) console.log('  marked   ' + entry)
    for (const entry of safe.fallback) console.log('  fallback ' + entry)
    for (const entry of safe.tested) console.log('  tested   ' + entry)
  }
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
