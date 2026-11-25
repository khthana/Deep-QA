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
 *     class string holding all four of its classes, an import of `CARD` not
 *     counting;
 *   - `a return … not inside the card` - added by #309's review, which found
 *     three branches the first three questions passed: `SectionResults`' and
 *     `StudentResults`' loading branch and `RubricCriteria`'s refusal. Each
 *     `return <jsx>` of the function `export default` names, outside any
 *     nested function, has to carry the card on its outermost element (a
 *     fragment's first element); a return that only draws another component
 *     of the same file is asked of that component. At the commit before the
 *     review it named those three and the four marked files, and nothing else.
 *
 * A screen that is not a card - the sign-in page, the shell, the 404 and the
 * placeholder - says so with `// content-title: <why> (#NNN)` anywhere in the
 * file, which needs a reason and a ticket.
 *
 * What it cannot measure: a return written as anything but JSX (a `null`, a
 * variable, a ternary between two drawings), a screen drawn through a
 * component of another file, a card nested inside another card (the panels of
 * `GradingWeights` and the program-level screens sit inside the new card,
 * which is the owner's question and not this census's), which icon a title
 * carries, and whether the words are the screen's - a `ContentTitle` with the
 * wrong title reads clean. Files in `pages/` that are not `.js` are counted as
 * `not read` and named rather than skipped.
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

/** Whether an expression carries the card: `CARD` read, or the four classes written. */
function holdsCard(node) {
  let found = false
  walk(node, inner => {
    if (inner.type === 'Identifier' && inner.name === 'CARD') found = true
    if (inner.type === 'StringLiteral' && isCard(inner.value)) found = true
    if (inner.type === 'TemplateElement' && isCard(inner.value.raw)) found = true
  })
  return found
}

/** The top-level function a name is bound to in this file, or null. */
function bound(program, name) {
  for (const node of program.body) {
    if (node.type === 'FunctionDeclaration' && node.id && node.id.name === name) return node
    if (node.type === 'VariableDeclaration')
      for (const one of node.declarations)
        if (one.id.name === name) return one.init
  }
  return null
}

/** The function `export default` names, or null. */
function screenOf(program) {
  const exported = program.body.find(node => node.type === 'ExportDefaultDeclaration')
  if (!exported) return null
  const { declaration } = exported
  return declaration.type === 'Identifier' ? bound(program, declaration.name) : declaration
}

/**
 * The lines of the screen's own `return <jsx>`s whose outermost element is not
 * the card - #309's review: a file can card its main drawing and leave its
 * loading or refusal branch bare. A fragment is asked of its first element.
 * Returns inside a nested function (a `map`, a handler) are not the screen's. A
 * return that is only another component of the same file - `EditUser` drawing
 * `<Account key={userId} />` - is asked of that component's returns instead.
 */
function bareReturns(program, screen, seen = new Set()) {
  const bare = []
  if (!screen || !screen.body) return bare
  const visit = node => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(visit)
    if (typeof node.type !== 'string') return
    if (/Function/.test(node.type)) return
    if (node.type === 'ReturnStatement' && node.argument) {
      let root = node.argument
      if (root.type === 'JSXFragment')
        root = root.children.find(child => child.type === 'JSXElement') || root
      const name = root.type === 'JSXElement' && root.openingElement.name.name
      const inner = name && /^[A-Z]/.test(name) && !seen.has(name) && bound(program, name)
      if (inner) {
        seen.add(name)
        bare.push(...bareReturns(program, inner, seen))
      } else if (root.type === 'JSXElement') {
        const className = root.openingElement.attributes.find(
          attribute => attribute.type === 'JSXAttribute' && attribute.name.name === 'className'
        )
        if (!className || !holdsCard(className.value)) bare.push(node.loc.start.line)
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key.endsWith('Comments')) continue
      visit(node[key])
    }
  }
  visit(screen.body)
  return bare
}

/** What one file says: its raw h1 lines, whether it titles, cards, or is marked. */
function examine(code) {
  const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] })
  const rawH1 = []
  let titled = false
  walk(ast.program, node => {
    if (node.type === 'JSXOpeningElement' && node.name.type === 'JSXIdentifier') {
      if (node.name.name === 'h1') rawH1.push(node.loc.start.line)
      if (node.name.name === 'ContentTitle') titled = true
    }
  })
  // An import of `CARD` is not a card (#309's review, #174's too-loose rule).
  const carded = holdsCard(
    ast.program.body.filter(node => node.type !== 'ImportDeclaration')
  )
  const bare = bareReturns(ast.program, screenOf(ast.program))
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
  return { rawH1, titled, carded, bare, marker }
}

function main() {
  const everything = fs.readdirSync(PAGES).sort()
  const files = everything.filter(name => name.endsWith('.js'))
  // Said rather than skipped silently (#123, #126): a screen written as `.jsx`
  // or `.tsx` would be routed and never read.
  const notRead = everything.filter(name => !name.endsWith('.js'))
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
    for (const line of found.bare)
      problems.push(
        where + ':' + line + ' a return of the screen that is not inside the card (#309)'
      )
    if (found.titled && found.carded && !found.bare.length) cards += 1
  }

  console.log(
    'content-titles: pages read ' +
      files.length +
      ' · titled cards ' +
      cards +
      ' · marked ' +
      marked.length +
      ' · not read ' +
      notRead.length +
      ' · problems ' +
      problems.length
  )
  for (const name of notRead) console.log('  not read ' + name)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  marked   ' + entry)
  for (const problem of problems) console.log('  ' + problem)
  process.exitCode = problems.length ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine }
