#!/usr/bin/env node
/**
 * Every table head is the same head - #314.
 *
 * The owner's answer of 27 November 2569 (`docs/ui-consistency.md` rule 5)
 * gave every table the administration screens' head: `bg-gray-50
 * text-gray-600` at the table's own size, the weight the browser gives a
 * `<th>`. #314 put it in one constant, `TABLE_HEAD` in `src/lib/tableHead.js`,
 * and handed it to all twenty-six heads in twenty-five files; nothing
 * structural keeps the next table to it. This does.
 *
 * Its population is **every `<thead>` in every `.js` file under `src/`**,
 * found in the syntax tree rather than by a list of screens (#126), because a
 * table is drawn by panels in `components/` as well as by pages - two of the
 * twenty-five were (`ImportPanel`, `GroupHistory`).
 *
 * Asked by **mechanism**, two questions of each head:
 *
 *   - `head` - its `className` is not the expression `TABLE_HEAD`. A string
 *     holding the same two classes is red too: it is the copy that drifts;
 *   - `cell` - a `<tr>` or `<th>` inside it writes, in a string or a
 *     template's text, a class that re-sets what the head carries: a text
 *     size, a text colour, a font weight, or a background other than
 *     `bg-gray-50` (a sticky cell needs the head's own ground under it,
 *     `PloMapping`'s first column). A `<span>` inside a cell is not asked - a
 *     second, quieter line under a heading is part of what the heading says.
 *
 * A head whose cells differ on purpose says so with
 * `// table-head: <why> (#NNN)` **inside that `<thead>`**, which needs a
 * reason and a ticket and excuses the `cell` question for that head only -
 * #314's review: a marker anywhere in the file would excuse the next table
 * the file grows. Every head is still asked `head`.
 *
 * What it cannot measure: a class handed through a variable or a helper call
 * (a `className={cls}` reads as nothing written), a head drawn by a component
 * that is not `<thead>`, a table built of `div`s, and whether the head looks
 * right - the colours are a hand walk (`docs/acceptance/314-table-heads.md`).
 * Files that are not `.js` are counted as `not read` and named.
 */
const fs = require('fs')
const path = require('path')

let parser
try {
  parser = require('@babel/parser')
} catch {
  console.error(
    'table-heads: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')
const MARKER = /table-head:([\s\S]+)/
const TICKET = /#\d+/
// A size (named or arbitrary), any colour with a shade, black or white, an
// arbitrary text value, a weight (named or arbitrary), or a ground other than the
// head's own. `text-left` and its kind are alignment and are not asked.
const RESETS =
  /^(text-(xs|sm|base|lg|[2-9]?xl)|text-(black|white)|text-[a-z]+-\d+|text-\[.+\]|font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black|\[.+\])|bg-(?!gray-50$)\S+)$/

function walk(node, visit, parents = []) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, parents)
    return
  }
  if (typeof node.type !== 'string') return
  visit(node, parents)
  const inner = parents.concat(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue
    walk(node[key], visit, inner)
  }
}

const nameOf = element =>
  element.openingElement.name.type === 'JSXIdentifier' ? element.openingElement.name.name : null

const classAttribute = element =>
  element.openingElement.attributes.find(
    attribute => attribute.type === 'JSXAttribute' && attribute.name.name === 'className'
  )

/** The classes a `className` writes as text - a string, or a template's own words. */
function written(attribute) {
  const words = []
  if (!attribute || !attribute.value) return words
  walk(attribute.value, node => {
    if (node.type === 'StringLiteral') words.push(...node.value.split(/\s+/))
    if (node.type === 'TemplateElement') words.push(...node.value.raw.split(/\s+/))
  })
  return words.filter(Boolean)
}

/** What one file says: its heads, the ones that are not TABLE_HEAD, cells that re-set it, a marker. */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const heads = []
  const notHead = []
  const cells = []
  walk(ast.program, (node, parents) => {
    if (node.type !== 'JSXElement') return
    const name = nameOf(node)
    if (name === 'thead') {
      heads.push({ start: node.loc.start.line, end: node.loc.end.line })
      const attribute = classAttribute(node)
      const value = attribute && attribute.value
      const ok =
        value &&
        value.type === 'JSXExpressionContainer' &&
        value.expression.type === 'Identifier' &&
        value.expression.name === 'TABLE_HEAD'
      if (!ok) notHead.push(node.loc.start.line)
    }
    if (name === 'tr' || name === 'th') {
      const head = parents.find(parent => parent.type === 'JSXElement' && nameOf(parent) === 'thead')
      if (!head) return
      const resets = written(classAttribute(node)).filter(word => RESETS.test(word))
      if (resets.length)
        cells.push({ line: node.loc.start.line, head: head.loc.start.line, name, resets })
    }
  })
  const markers = []
  for (const [index, comment] of ast.comments.entries()) {
    const found = MARKER.exec(comment.value)
    if (!found) continue
    let text = found[1]
    // A run of `//` lines is one marker, handed over one comment per line (#233).
    let end = comment.loc.end.line
    for (const next of ast.comments.slice(index + 1)) {
      if (comment.type !== 'CommentLine' || next.type !== 'CommentLine') break
      if (next.loc.start.line !== end + 1) break
      text += ' ' + next.value
      end = next.loc.end.line
    }
    const reason = text.replace(/^[\s*]+/gm, ' ').replace(/\s+/g, ' ').trim()
    const line = comment.loc.start.line
    const inside = heads.find(head => head.start <= line && line <= head.end)
    markers.push({
      line,
      head: inside ? inside.start : null,
      reason,
      ok: TICKET.test(reason) && reason.replace(TICKET, '').replace(/[()\s.]/g, '').length > 0,
    })
  }
  return { heads, notHead, cells, markers }
}

function files(directory) {
  const found = { read: [], notRead: [] }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      const inner = files(full)
      found.read.push(...inner.read)
      found.notRead.push(...inner.notRead)
    } else if (entry.name.endsWith('.js')) found.read.push(full)
    else if (/\.(jsx|tsx?|mjs|cjs)$/.test(entry.name)) found.notRead.push(full)
  }
  return found
}

function main() {
  const { read, notRead } = files(SRC)
  read.sort()
  const problems = []
  const marked = []
  let heads = 0
  let tables = 0

  for (const full of read) {
    const where = 'src/' + path.relative(SRC, full).split(path.sep).join('/')
    const code = fs.readFileSync(full, 'utf8')
    if (!code.includes('<thead')) continue
    let found
    try {
      found = examine(code)
    } catch (error) {
      problems.push(where + ':' + (error.loc ? error.loc.line : 0) + ' could not be parsed')
      continue
    }
    if (!found.heads.length) continue
    tables += 1
    heads += found.heads.length
    for (const line of found.notHead)
      problems.push(where + ':' + line + ' head - a <thead> takes `className={TABLE_HEAD}` (#314)')
    const excused = new Set()
    for (const marker of found.markers) {
      if (!marker.ok)
        problems.push(where + ':' + marker.line + ' marker needs a reason of its own and a ticket number')
      else if (marker.head === null)
        problems.push(where + ':' + marker.line + ' marker is outside every <thead> - it excuses the head it sits in')
      else {
        excused.add(marker.head)
        marked.push(where + ':' + marker.head + ' — ' + marker.reason)
      }
    }
    for (const cell of found.cells.filter(one => !excused.has(one.head)))
      problems.push(
        where + ':' + cell.line + ' cell - a <' + cell.name + '> in the head re-sets it with ' +
          cell.resets.join(' ') + ' (#314)'
      )
  }

  console.log(
    'table-heads: files with a head ' +
      tables +
      ' · heads ' +
      heads +
      ' · marked ' +
      marked.length +
      ' · not read ' +
      notRead.length +
      ' · problems ' +
      problems.length
  )
  for (const name of notRead) console.log('  not read ' + path.relative(SRC, name))
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  marked   ' + entry)
  for (const problem of problems) console.log('  ' + problem)
  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
