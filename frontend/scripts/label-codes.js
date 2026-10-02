/**
 * The second census: a label that reads its record's code to the person - #93.
 *
 * #93 took the code out of every label naming a หลักสูตร, a ภาควิชา or a
 * รายวิชา: the reader wants the name, and the code was sitting in the most
 * conspicuous place on the line. Twenty-seven sites were changed, in fourteen
 * files, and eleven of them did not exist when the ticket was written - the
 * screens built after it copied the pattern, which is what the ticket predicted
 * and the reason it asked to be taken late.
 *
 * That is why this file exists rather than a line in a handoff. The first
 * criterion of #93 is *every place that draws one, including screens built
 * after this ticket was opened*, and nothing in a suite of e2e rows can hold a
 * claim about a screen nobody has written yet. Eight assertions in six files
 * hold the six screens that had a row on their label; this census is what holds
 * the rest of the twenty-seven, and the twenty-eighth screen.
 *
 * The population is syntactic and the question is asked of the code, not of a
 * list kept here (#126): **an `X_id` drawn immediately before that same `X`'s
 * `X_name_th` or `X_name_en`**, in any of the three spellings the tree can
 * write it in -
 *
 *     {program.program_id} {program.program_name_th}        JSX children
 *     `${program.program_id} ${program.program_name_th}`    a template
 *     program.program_id + ' ' + program.program_name_th    a concatenation
 *
 * The *same prefix* is what makes the rule exactly #93's three entities and
 * nothing else: `student_id` is drawn beside `full_name_th`, whose prefix is
 * not `student`, and `rubric_name_th` is drawn beside `rubric_code`, which is
 * not an `_id`. Both of those are deliberate - `37-individual-student-results`
 * says in its own words why two students called กมลชนก need their codes - and
 * neither is this family. A rule written to catch them would have to be told
 * which screens to skip, which is the shape #123 and #126 are about.
 *
 * What it cannot see, written down because that is the part a count never says:
 *
 * - a label assembled somewhere else and handed over as a string, which is a
 *   `join`, a helper, or a value off the server;
 * - the code drawn *after* the name, or with anything but whitespace between;
 * - a code read from a column that is not `X_id` (`rubric_code`, `outcome_code`)
 *   or a name in a column that is neither `X_name_th` nor `X_name_en`. The
 *   English name is in the rule because it was left out of the first one, and
 *   seven eyebrow lines reading `subject_name_en` came back clean until review
 *   asked by hand - exactly the thing this file is here to make unnecessary;
 * - a name read through a fallback, `${a.x_id} ${b?.x_name_th ?? ''}`, where the
 *   second half is a logical expression and not a column at all - there are two,
 *   and #93 read both: `StudentForm`'s derived ภาควิชา field, which it changed
 *   by hand, and the key `ProgramSubjectForm` puts in its disabled รายวิชา box,
 *   which keeps its code for the reason below;
 * - and anything at all outside `frontend/src`: a sheet, or the backend's words.
 *
 * Nineteen sites in the tree draw the pair on purpose, and each one carries
 *
 *     // label-code: <why this one is not a label to choose from> (#NNN)
 *
 * in a comment within six lines above it. Among JSX children that comment has
 * to be a JSX comment and not `//`, which between two tags is text the browser
 * draws and the parser sees no comment in at all - the first run of this census
 * reported three sites as bare for that reason, and `label-codes.test.js` has
 * the row.
 *
 * The nineteen are five kinds, and the kinds are the reason #93 is not *delete
 * the code everywhere*: the sentence in a confirmation dialog, which names the
 * record about to be destroyed and where 0501 and 0503 sharing a name is the
 * whole point; the notice that says what just happened, after which the person
 * goes looking for the thing by its code; the heading of a report, which is the
 * document's identity and goes into the PDF beside it; a row or a cell of such a
 * report, read away from the screen that drew it; and the small line above a
 * screen's own heading - seven of them, one per teacher screen - which is the one
 * place on that screen saying which section is being read. The twentieth, the key
 * of the record an edit form is holding (`18a` row 2 pins it by assertion), is
 * the one above that this census cannot see.
 *
 * Run: `npm run census` in `frontend/` runs this beside the superseded-answer
 * census. Its own fixtures: `npm run census:test`.
 */
const fs = require('fs')
const path = require('path')

let parser
try {
  parser = require('@babel/parser')
} catch {
  console.error(
    'label-codes: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

const MARKER = /label-code:([\s\S]+)/
const TICKET = /#\d+/
/** How far above a hit a marker may be written. */
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

/**
 * The column this expression reads, if it reads one by name.
 *
 * `a.program_id` and `a?.program_id` both answer `program_id`; a computed
 * `a[key]` answers nothing, because what it reads is not in the source.
 */
const column = node => {
  if (!node) return null
  if (node.type === 'TSNonNullExpression') return column(node.expression)
  if (node.type !== 'MemberExpression' && node.type !== 'OptionalMemberExpression') return null
  if (node.computed || node.property.type !== 'Identifier') return null
  return node.property.name
}

/** `program_id` → `program`, and nothing for any other shape. */
const idOf = name => {
  const hit = /^([a-z][a-z0-9]*)_id$/.exec(name || '')
  return hit ? hit[1] : null
}
/**
 * `program_name_th` → `program`, and `subject_name_en` too: the eyebrow line
 * above seven screen headings names its รายวิชา in English, and a census that
 * read only `_name_th` reported every one of them clean (#93, found in review).
 */
const nameOf = name => {
  const hit = /^([a-z][a-z0-9]*)_name_(th|en)$/.exec(name || '')
  return hit ? hit[1] : null
}

/** Is this the pair, in this order, for one entity? */
const pair = (first, second) => {
  const entity = idOf(column(first))
  return entity && entity === nameOf(column(second)) ? entity : null
}

/** Nothing but spaces between the two halves. */
const blank = text => /^[ \t]*$/.test(text)

/**
 * The adjacency, in the three spellings.
 *
 * JSX children arrive as `[container, text, container]` with the text holding
 * the space; a template holds the space in the quasi between its expressions;
 * and a concatenation nests to the left, so `a + ' ' + b` is `(a + ' ') + b`
 * and the space is the right half of the left operand.
 */
function hits(ast) {
  const found = []
  const add = (entity, node) => found.push({ entity, line: node.loc.start.line })

  walk(ast.program, node => {
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
      const children = node.children
      for (let index = 0; index + 2 < children.length; index++) {
        const [left, gap, right] = children.slice(index, index + 3)
        if (left.type !== 'JSXExpressionContainer' || right.type !== 'JSXExpressionContainer')
          continue
        if (gap.type !== 'JSXText' || !blank(gap.value)) continue
        const entity = pair(left.expression, right.expression)
        if (entity) add(entity, left)
      }
      return
    }
    if (node.type === 'TemplateLiteral') {
      for (let index = 0; index + 1 < node.expressions.length; index++) {
        const between = node.quasis[index + 1]
        if (!between || !blank(between.value.raw)) continue
        const entity = pair(node.expressions[index], node.expressions[index + 1])
        if (entity) add(entity, node.expressions[index])
      }
      return
    }
    if (node.type === 'BinaryExpression' && node.operator === '+') {
      const left = node.left
      if (left.type !== 'BinaryExpression' || left.operator !== '+') return
      if (left.right.type !== 'StringLiteral' || !blank(left.right.value)) return
      const entity = pair(left.left, node.right)
      if (entity) add(entity, left.left)
    }
  })

  return found
}

/**
 * The marker for a hit, if one is written above it.
 *
 * Measured by line rather than by the statement the hit sits in, because the
 * statement is usually the one `return` the whole screen is drawn by: a marker
 * anywhere inside it would cover every label on the screen, which is the
 * looseness that makes a census answer *fine* whatever the code says (#141).
 *
 * A run of `//` lines is one marker. Babel hands those over one node per line,
 * and the ticket number is usually in the last sentence.
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

/**
 * One file's answer, so the fixtures can ask of a snippet what the run asks of
 * the tree. Throws on a file it cannot parse; the caller decides what that is
 * worth.
 */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const comments = ast.comments || []
  return hits(ast).map(hit => ({ ...hit, marker: markerFor(hit.line, comments) }))
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
  const problems = []
  let drawn = 0

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
    drawn += found.length
    for (const hit of found) {
      const at = where + ':' + hit.line
      if (!hit.marker)
        problems.push({
          where,
          line: hit.line,
          why:
            'draws ' +
            hit.entity +
            "_id in front of its own name. A label names the record; if this one is not a label, write `// label-code: <why> (#NNN)` above it",
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
      ' · code before name ' +
      drawn +
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

module.exports = { examine }
