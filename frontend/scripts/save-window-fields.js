/**
 * The census #243 left undecided: which form controls are still live while
 * their own form's save is out.
 *
 * The rule is the owner's answer to #228 on 26 ตุลาคม 2569 — *while a save is
 * out, the form that sent it closes its fields*, with a flag the form owns
 * rather than the page's, and *ยกเลิก* holding nothing. It landed on three
 * screens; #242 gave four more the same shape on 28 ตุลาคม 2569; and the
 * population the reason was silent about was counted by hand twice, at
 * `bdab15a` and again on 29 ตุลาคม 2569, with different answers — 61 fields in
 * 15 files and then 66 in 17. A hand-run regex over a tree that grows every
 * ticket is a number that is already wrong (#130), which is what this replaces.
 *
 * Two questions over one population, asked **by the mechanism** and not by a
 * spelling (#174). The population is every file holding a `type="submit"`
 * button: a form that sends something.
 *
 * 1. **Does the button that sends it close while the save is out?** This is the
 *    question that decided #243's priority, and it is not the one that ticket's
 *    table counted. #228 bounded its own defect with the sentence *บันทึก is
 *    `disabled={busy}` already, so moving a field in between does not cause a
 *    second send* — a claim about each screen (#133). Measured over this
 *    population on 29 ตุลาคม 2569 it was true of twenty-five buttons and false
 *    of two, and on the one where the dialog stays open after a refusal
 *    (`components/Navbar.js`) a second press sent a second request:
 *    `243a`'s `savelive` reads 2 where the row expects 1. A bare button is
 *    therefore reported as a problem.
 * 2. **Does each field close?** Every `<input>`, `<select>` and `<textarea>` in
 *    that file. A field with no `disabled` at all is what #228's defect is
 *    about: what the person sees and what is being saved part company, and on
 *    a refused save the form stays open holding a value nobody sent.
 *
 * Either answer is green behind a **marker**, in a comment anywhere in the same
 * file:
 *
 *     // save-window: <why this form needs no flag> (#NNN)
 *
 * `components/LoginForm.js` carries one as of 29 ตุลาคม 2569, and it is the
 * reason markers exist rather than exemptions: that form holds no flag and
 * never needed one, because `pages/Login.js` takes the whole form off the
 * screen while the sign-in is out, so there is no field to type into and no
 * button to press again (#203's ninth reading). A marker is a claim like any
 * other (#141) and is printed with its reason; the day that screen stops
 * replacing itself the marker is an exemption and nothing here will say so
 * (#93).
 *
 * ## It is red today, and committed unwired for that reason
 *
 * `npm run census` does not run this. Its first run is a red gate over the 57
 * controls in 15 files that no ticket has yet landed the shape on — its own
 * number, `bare 57` on 29 ตุลาคม 2569, and not the hand counts above, which
 * read fields only and read three of `CloForm.js`'s out of a docblock's prose
 * (#174) — and an
 * instrument wired in while its population is red teaches people to ignore the
 * whole suite of them; #200 settled that shape — the instrument lands with a
 * ticket for the gap rather than with the gap marked. The ticket is the one
 * #243 handed the rest of its population to, and the day it closes this goes
 * into `scripts/census.js` with nothing to change here.
 *
 * Run it by name: `node scripts/save-window-fields.js` in `frontend/`, with
 * `--flagged` or `--marked` to list what it found rather than only what it did
 * not. Its own fixtures: `npm run census:test`.
 *
 * What it cannot measure, written down because a count nobody can read the
 * limits of is the species of hand-kept number these exist to replace (#123):
 *
 * - **whose flag it is.** A `disabled` is read as present, not as right. That
 *   the flag is the form's own and not the page's is #228's answer and #242's
 *   whole subject, and what holds it is the fourth claim of each row of `228a`,
 *   `242a` and `243a` — a page-wide flag closes a form that sent nothing.
 *   Measured on a real site the day this landed (#226): the `<select>` at
 *   `components/offerings/OfferingForm.js:178` reads `flagged` behind the flag
 *   written on its line 182, which is raised in a fetch effect and never in
 *   `submit`, so it is down before anybody can press save. `bare` is a lower
 *   bound. The line cited is the one this script reports — the opening tag of
 *   the control — and not the line the `disabled` is written on, which is four
 *   below it here; the comment with the same measurement on it in
 *   `save-window-fields.test.js` says 178 for that reason.
 * - **whether the save can be refused at all, and whether the parent closes
 *   the form on success.** Together they decide how long the window lasts, and
 *   neither is in this file: both are in the parent screen's handler, and the
 *   census that tried to read them from the component was the one that gave two
 *   different answers. That is what a marker's prose is for.
 * - **a field wrapped in a component of its own**, or one whose `disabled`
 *   arrives through a spread. The population is the tag this script can read,
 *   which is #182's shape one family along; such a field is invisible here and
 *   this count is silent about it rather than wrong.
 * - **a panel that saves without a `<form>`.** `components/ImportPanel.js`,
 *   `components/offerings/CopyTermPanel.js` and
 *   `components/offerings/TeacherPicker.js` write and are not counted, because
 *   the population is the submit button. Whether they belong in it is a
 *   question this instrument cannot ask.
 * - **two forms in one file.** The marker is read from the file, so a file with
 *   a flagged form and a bare one is green on both — `components/Navbar.js`
 *   holds one form and `components/offerings/SectionsPanel.js` holds two.
 * - **whether a marker's reason is still true**, which is #93's rule and why
 *   each reason carries a ticket number.
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
    'save-window-fields: @babel/parser could not be required. It arrives with ' +
      'react-scripts; run `npm install` in frontend/ before trusting any count.'
  )
  process.exit(2)
}

const SRC = path.join(__dirname, '..', 'src')

/** Extensions that can hold code this script would have to read. */
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'])
/** The one it is set up to parse. */
const PARSED = '.js'

/** The tags this script reads as fields. */
const FIELDS = new Set(['input', 'select', 'textarea'])

// Everything after the colon to the end of the comment paragraph, for the
// reason `superseded-answers.js` gives: the reason is a paragraph and not a
// line, and the ticket number is read out of the same paragraph (#233).
const MARKER = /save-window:([\s\S]+)/
const TICKET = /#\d+/

function filesUnder(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) filesUnder(full, out)
    else out.push(full)
  }
  return out
}

/** Every node of the tree. */
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

/** The name of a JSX element, where this script can say. */
const tagOf = node =>
  node.name && node.name.type === 'JSXIdentifier' ? node.name.name : null

const attributeOf = (node, named) =>
  (node.attributes || []).find(
    one => one.type === 'JSXAttribute' && one.name && one.name.name === named
  )

/** What a `type=` attribute says, where it is a plain string. */
function typeOf(node) {
  const attribute = attributeOf(node, 'type')
  if (!attribute || !attribute.value) return null
  if (attribute.value.type === 'StringLiteral') return attribute.value.value
  return null
}

/**
 * What a control's `disabled` holds: `null` where it has none.
 *
 * `''` is `disabled` written bare, which is a control disabled for ever and not
 * a window; anything else is the source of the expression, printed so a person
 * reading the report can see what the file thinks closes the control.
 */
function disabledIn(node, code) {
  const attribute = attributeOf(node, 'disabled')
  if (!attribute) return null
  if (!attribute.value) return ''
  if (attribute.value.type !== 'JSXExpressionContainer')
    return code.slice(attribute.value.start, attribute.value.end)
  return code.slice(attribute.value.expression.start, attribute.value.expression.end)
}

/** Runs of adjacent comments, merged: a `//` paragraph is one comment per line. */
function paragraphs(comments, code) {
  const runs = []
  for (const comment of [...comments].sort((a, b) => a.start - b.start)) {
    const last = runs[runs.length - 1]
    if (last && code.slice(last.end, comment.start).trim() === '') {
      last.end = comment.end
      last.value += '\n' + comment.value
      continue
    }
    runs.push({ line: comment.loc.start.line, end: comment.end, value: comment.value })
  }
  return runs
}

/** The marker this file carries, if it carries one. */
function markerIn(comments, code) {
  for (const block of paragraphs(comments, code)) {
    const found = MARKER.exec(block.value)
    if (!found) continue
    const reason = found[1].replace(/\s+/g, ' ').trim()
    return {
      line: block.line,
      reason,
      // A reason of its own **and** a ticket number: a number on its own is a
      // pointer and not a reason, which is the rule `forms-cleared-by-identity`
      // settled for this family of markers.
      ok: TICKET.test(reason) && reason.replace(TICKET, '').trim().length > 0,
    }
  }
  return null
}

/**
 * The submit buttons and the fields of one file, each with what closes it.
 *
 * A file with no submit button is out of the population and comes back empty,
 * which is how the report stays a report about forms that send something.
 */
function examine(code) {
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
    attachComment: true,
  })

  const buttons = []
  const fields = []
  walk(ast, node => {
    if (node.type !== 'JSXOpeningElement') return
    const tag = tagOf(node)
    if (tag === 'button' && typeOf(node) === 'submit') {
      buttons.push({ line: node.loc.start.line, closedBy: disabledIn(node, code) })
      return
    }
    if (!FIELDS.has(tag)) return
    // A hidden input is not something a person can move, and a file input the
    // dialog has already read is still a field: only the first is skipped, and
    // by what it is rather than by what it is called.
    if (tag === 'input' && typeOf(node) === 'hidden') return
    fields.push({ line: node.loc.start.line, tag, closedBy: disabledIn(node, code) })
  })

  if (buttons.length === 0) return { buttons: [], fields: [], marker: null }
  return { buttons, fields, marker: markerIn(ast.comments || [], code) }
}

/** What one control is, given what else the file holds. */
function classify(control, found) {
  if (control.closedBy === '') return { kind: 'always' }
  if (control.closedBy !== null) return { kind: 'flagged', by: control.closedBy }
  if (found.marker) return { kind: 'marked', marker: found.marker }
  return { kind: 'bare' }
}

/** The one spelling of a path this report uses. */
const shown = file => path.relative(SRC, file).replace(/\\/g, '/')

function main() {
  const everything = filesUnder(SRC)
  const unreadable = everything.filter(
    file => CODE.has(path.extname(file)) && path.extname(file) !== PARSED
  )
  const sources = everything.filter(file => path.extname(file) === PARSED)

  const flagged = []
  const always = []
  const marked = []
  const bare = []
  const problems = []
  let forms = 0

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
    if (found.buttons.length === 0) continue
    forms += found.buttons.length

    const controls = [
      ...found.buttons.map(one => ({ ...one, what: 'the button that sends this form' })),
      ...found.fields.map(one => ({ ...one, what: 'this <' + one.tag + '>' })),
    ]
    for (const control of controls) {
      const at = where + ':' + control.line
      const verdict = classify(control, found)
      if (verdict.kind === 'flagged') flagged.push(at + ' ← ' + verdict.by)
      else if (verdict.kind === 'always') always.push(at)
      else if (verdict.kind === 'marked' && verdict.marker.ok)
        marked.push(at + ' — ' + verdict.marker.reason)
      else if (verdict.kind === 'marked')
        problems.push({
          where,
          line: verdict.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      else
        bare.push({
          where,
          line: control.line,
          why:
            control.what +
            ' is live while the save it sends is out. The owner answered that ' +
            'on 26 ตุลาคม 2569 (#228): the form that sent a save closes its own ' +
            'fields with a flag of its own while the save is out, and ยกเลิก ' +
            'holds nothing. Either close it, or write `// save-window: <why ' +
            'this form needs no flag> (#NNN)` in this file',
        })
    }
  }

  for (const file of unreadable)
    problems.push({
      where: shown(file),
      line: 0,
      why: 'is code this script is not set up to parse, so it was not read',
    })

  // What it did not look at, by name rather than as a number (#123, #126).
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
    'forms that send something ' +
      forms +
      ' · controls: flagged ' +
      flagged.length +
      ' · always ' +
      always.length +
      ' · marked ' +
      marked.length +
      ' · bare ' +
      bare.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--flagged')) for (const entry of flagged) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--always')) for (const entry of always) console.log('  ' + entry)
  for (const entry of bare) console.log('  ' + entry.where + ':' + entry.line + ' ' + entry.why)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = bare.length + problems.length > 0 ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify }
