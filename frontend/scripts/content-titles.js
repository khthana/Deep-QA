#!/usr/bin/env node
/**
 * Every screen draws its title and its card the delivered way - #309.
 *
 * The owner's answer of 25 November 2569 gave back the delivered system's card
 * on every screen: a white `rounded-xl bg-white p-6 shadow` with the title at
 * the top left, drawn by `components/ContentTitle.js`. The rule is copied into
 * each screen rather than enforced by the shell (a page decides where its
 * title stands - beside the history button on the users screen, under the
 * subject code on a teacher's), so nothing structural keeps the next screen to
 * it. This does.
 *
 * Its population is **every file in `src/pages/`**, because that is where
 * `routes/AppRoutes.js` imports every screen from - measured on 25 November
 * 2569, its three other imports being the router, a spinner and the menus. A
 * screen routed from anywhere else is invisible here.
 *
 * Asked by **mechanism**, three questions of each file's syntax tree:
 *
 *   - `raw h1` - a JSX `<h1>` written by hand: the title is `ContentTitle`'s,
 *     and an `h1` beside it is a second size nobody chose;
 *   - `no title` - no JSX `<ContentTitle>` at all;
 *   - `no card` - neither the `CARD` constant `ContentTitle.js` exports nor a
 *     class string holding all four of its classes.
 *
 * A screen that is not a card - the sign-in page, the shell, the 404 and the
 * placeholder - says so with `// content-title: <why> (#NNN)` anywhere in the
 * file, which needs a reason and a ticket.
 *
 * What it cannot measure: whether the card is the screen's **outermost**
 * element, whether every return of a screen is inside one (`RubricCriteria`'s
 * refusal draws its own smaller card, and `Offerings`' one-offering view was
 * given the card by hand), which icon a title carries, and whether the words
 * are the screen's - a `ContentTitle` with the wrong title reads clean.
 */
const fs = require('fs')
const path = require('path')

let parser
try {
  parser = require('@babel/parser')
} catch {
  console.error(
    'content-titles: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const PAGES = path.join(__dirname, '..', 'src', 'pages')
const CARD_CLASSES = ['rounded-xl', 'bg-white', 'p-6', 'shadow']
const MARKER = /content-title:([\s\S]+)/
const TICKET = /#\d+/

function walk(node, visit) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit)
    return
  }
  if (typeof node.type !== 'string') return
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue
    walk(node[key], visit)
  }
}

const isCard = text => {
  const classes = new Set(text.split(/\s+/))
  return CARD_CLASSES.every(one => classes.has(one))
}

/** What one file says: its raw h1 lines, whether it titles, cards, or is marked. */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const rawH1 = []
  let titled = false
  let carded = false
  walk(ast.program, node => {
    if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier') {
      if (node.name.name === 'h1') rawH1.push(node.loc.start.line)
      if (node.name.name === 'ContentTitle') titled = true
    }
    if (node.type === 'Identifier' && node.name === 'CARD') carded = true
    if (node.type === 'StringLiteral' && isCard(node.value)) carded = true
    if (node.type === 'TemplateElement' && isCard(node.value.raw)) carded = true
  })
  let marker = null
  for (const [index, comment] of ast.comments.entries()) {
    const found = MARKER.exec(comment.value)
    if (!found) continue
    let text = found[1]
    // A run of `//` lines is one marker, which the parser hands over as one
    // comment per line (#233).
    let end = comment.loc.end.line
    for (const next of ast.comments.slice(index + 1)) {
      if (comment.type !== 'CommentLine' || next.type !== 'CommentLine') break
      if (next.loc.start.line !== end + 1) break
      text += ' ' + next.value
      end = next.loc.end.line
    }
    const reason = text.replace(/^[\s*]+/gm, ' ').replace(/\s+/g, ' ').trim()
    marker = {
      line: comment.loc.start.line,
      reason,
      ok: TICKET.test(reason) && reason.replace(TICKET, '').replace(/[()\s.]/g, '').length > 0,
    }
    break
  }
  return { rawH1, titled, carded, marker }
}

function main() {
  const files = fs
    .readdirSync(PAGES)
    .filter(name => name.endsWith('.js'))
    .sort()
  const problems = []
  const marked = []
  let cards = 0

  for (const name of files) {
    const where = 'src/pages/' + name
    let found
    try {
      found = examine(fs.readFileSync(path.join(PAGES, name), 'utf8'))
    } catch (error) {
      problems.push(where + ':' + (error.loc ? error.loc.line : 0) + ' could not be parsed')
      continue
    }
    if (found.marker) {
      if (found.marker.ok) marked.push(where + ' — ' + found.marker.reason)
      else problems.push(where + ':' + found.marker.line + ' marker needs a reason of its own and a ticket number')
      continue
    }
    for (const line of found.rawH1)
      problems.push(
        where + ':' + line + ' raw h1 - draw the title with `ContentTitle` (#309)'
      )
    if (!found.titled)
      problems.push(where + ':0 no title - a screen draws `<ContentTitle>` (#309)')
    if (!found.carded)
      problems.push(
        where + ':0 no card - wrap the screen in `CARD` from `components/ContentTitle` (#309)'
      )
    if (found.titled && found.carded) cards += 1
  }

  console.log(
    'content-titles: pages read ' +
      files.length +
      ' · titled cards ' +
      cards +
      ' · marked ' +
      marked.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  marked   ' + entry)
  for (const problem of problems) console.log('  ' + problem)
  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
