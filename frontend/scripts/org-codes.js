/**
 * The fourteenth census: an organisation unit drawn by its code - #294.
 *
 * The owner answered on 20 November 2569 that a faculty, a department and a
 * programme are read by their names everywhere except the two screens that
 * manage those records (`main/programs`, `main/departments`), and that a code
 * stays only where the name cannot be found (#294 rules 1-6). `label-codes.js`
 * (#93) could not hold that: it asks about one shape only - an `X_id` drawn
 * immediately in front of the same `X`'s name - and a code drawn alone, or in
 * brackets after the name, was outside its question. #294 found four of those
 * by hand, which is the reason this file exists rather than a line in a sheet:
 * nothing in a suite of e2e rows can hold a claim about a screen nobody has
 * written yet.
 *
 * **The population is a column read where it is drawn**, asked of the code
 * rather than of a list of screens (#126, #174). The columns are the four that
 * hold an organisation unit's code - `program_id`, `department_id`,
 * `faculty_id`, and `scope_id`, which holds one of the three or the sentinel -
 * and *drawn* is one of two places:
 *
 *     <td>{program.program_id}</td>                    a JSX child
 *     `ลบหลักสูตร ${program.program_id} ใช่หรือไม่`       a template holding Thai
 *
 * A template counts only where its own text holds Thai, because that is what
 * makes it a sentence for a person: the same column in a React `key`, an API
 * query or the PDF's file name (`plo-mapping-${program.program_id}.pdf`, which
 * the owner answered keeps its code) sits in a template holding no Thai.
 *
 * **A code read as the fallback of a name is not a hit** - the right-hand side
 * of `??` or `||` - because that is #294's own rule: where the name cannot be
 * found the code is the only true thing left to say. Those are counted apart,
 * so the number is on the page rather than hidden in a green.
 *
 * Each site that draws a code on purpose carries
 *
 *     // org-code: <why this one is the code and not a label> (#NNN)
 *
 * within six lines above it, a JSX comment among JSX children for the reason
 * `label-codes.js` gives (#93): `//` between two tags is text the browser
 * draws. On 20 November 2569 the four marked sites are the two administration
 * screens' table column and delete confirmation, which rule 2 keeps.
 *
 * What it cannot see, written down because a count never says it (#123, #126):
 *
 * - a code drawn through a helper, a `return` or a variable - `scopeNamed`'s
 *   bare-code fallback and `RoleDropdown`'s are both of that kind, and both are
 *   the fallback above;
 * - a code in an attribute - `title=`, `aria-label=`, a `label=` prop, an
 *   `<input value=>` - which is drawn or read aloud without being a JSX child;
 * - a concatenation with `+`, and a template whose words are all English;
 * - `target_id` and every other column whose value is an organisation unit's
 *   code only *some* of the time: `user_log.target_id` holds an account's id
 *   as often as a programme's, and an account's id stays (#294 rule 1). The
 *   history screen's one such site was read by hand on 20 November 2569;
 * - a code the server writes into a sentence of its own, and anything else
 *   outside `frontend/src`.
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
    'org-codes: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The columns that hold an organisation unit's code. */
const COLUMNS = new Set(['program_id', 'department_id', 'faculty_id', 'scope_id'])

const MARKER = /org-code:([\s\S]+)/
const TICKET = /#\d+/
/** How far above a hit a marker may be written. */
const REACH = 6
/** A template holding any Thai letter is a sentence for a person. */
const THAI = /[฀-๿]/

/** Every node, with the chain of nodes above it. */
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
 * What a drawn expression puts on the screen: each column it draws, and
 * whether it draws it as a name's fallback.
 *
 * Only the shapes a drawn value is written in are followed - a bare read, the
 * two branches of a `?:`, the two sides of a `??` or `||` - and not a call,
 * whose argument is something the callee is handed rather than something drawn
 * (`nameOf(plo.program_id)`).
 */
function drawnColumns(node, fallback = false, out = []) {
  if (!node) return out
  const name = column(node)
  if (name && COLUMNS.has(name)) {
    out.push({ column: name, fallback, line: node.loc.start.line, start: node.start })
    return out
  }
  if (node.type === 'ConditionalExpression') {
    drawnColumns(node.consequent, fallback, out)
    drawnColumns(node.alternate, fallback, out)
  } else if (
    node.type === 'LogicalExpression' &&
    (node.operator === '??' || node.operator === '||')
  ) {
    drawnColumns(node.left, fallback, out)
    drawnColumns(node.right, true, out)
  } else if (node.type === 'TemplateLiteral') {
    // A template in a drawn place is drawn whatever language its text is in -
    // ` ${offering.program_id}` as a name's fallback is the shape #294 wrote.
    for (const expression of node.expressions) drawnColumns(expression, fallback, out)
  }
  return out
}

function hits(ast) {
  const found = []
  walk(ast.program, node => {
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      for (const child of node.children)
        if (child.type === 'JSXExpressionContainer') drawnColumns(child.expression, false, found)
      return
    }
    if (node.type === 'TemplateLiteral') {
      if (!node.quasis.some(quasi => THAI.test(quasi.value.raw))) return
      for (const expression of node.expressions) drawnColumns(expression, false, found)
    }
  })
  // A Thai template inside a drawn expression is reached twice - as a template
  // and through the expression it sits in - so each read is counted once.
  const seen = new Set()
  return found.filter(hit => {
    const key = hit.start
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The marker for a hit, if one is written above it - `label-codes.js`'s rule,
 * a run of `//` lines being one marker (#233).
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

/** One file's answer, so the fixtures can ask of a snippet what the run asks of the tree. */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  return hits(ast).map(hit => ({
    ...hit,
    marker: hit.fallback ? null : markerFor(hit.line, comments),
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
  const fallbacks = []
  const problems = []
  let drawn = 0

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
      if (hit.fallback) {
        fallbacks.push(at + ' — ' + hit.column)
        continue
      }
      drawn += 1
      if (!hit.marker)
        problems.push({
          where,
          line: hit.line,
          why:
            'draws ' +
            hit.column +
            ', an organisation unit by its code. Draw its name (#294); if this one is the code on purpose, write `// org-code: <why> (#NNN)` above it',
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
      ' · code drawn ' +
      drawn +
      ' · marked ' +
      marked.length +
      ' · as a fallback ' +
      fallbacks.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) {
    for (const entry of marked) console.log('  marked   ' + entry)
    for (const entry of fallbacks) console.log('  fallback ' + entry)
  }
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
