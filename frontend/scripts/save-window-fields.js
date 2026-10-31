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
 * 3. **Is the button that hands the form back free?** The other half of the
 *    owner's sentence, and the one #249 left in its own prose rather than in
 *    the tracker - *ยกเลิก holds nothing*. Added on 31 ตุลาคม 2569 by #253,
 *    whose first move was to replace the number that deferral carried: *four*
 *    was `202a`'s count, and `202a`'s four had been freed by #242 on
 *    28 ตุลาคม 2569, two days earlier. Asked by the mechanism (#174): a
 *    `<button>` that is not the submit and whose `onClick` hands control to a
 *    **prop** - the prop itself, a local whose body calls one, or an arrow
 *    that calls either - is a way out of the form, and a way out holding any
 *    `disabled` is a problem. Measured that day over this population: 23 ways
 *    out, of which **two** held a flag - `evidence/EvidenceForm.js` on the
 *    page's `busy` and `ProfilePhotoDialog.js` on its own - and neither of
 *    them was one of the four.
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
 * #249 added two more on 30 ตุลาคม 2569, which makes five marked controls in
 * three files and one marker per **mechanism** rather than per file:
 * `components/offerings/SectionsPanel.js`'s rename form takes its own field off
 * the screen at the press, which is `LoginForm.js`'s shape one grain in, and
 * `pages/ActivityScores.js`'s กิจกรรม picker is the screen's **read** control
 * drawn outside the form that sends — whether a read control should close while
 * a write is out is the question #221 put to the owner, not a field of this
 * form.
 *
 * ## It was red, and it is wired in since 30 ตุลาคม 2569
 *
 * It landed unwired on 29 ตุลาคม 2569. Its first run was a red gate over the 57
 * controls in 15 files no ticket had landed the shape on — its own number,
 * `bare 57`, and not the hand counts above, which read fields only and read
 * three of `CloForm.js`'s out of a docblock's prose (#174) — and an instrument
 * wired in while its population is red teaches people to ignore the whole suite
 * of them; #200 settled that shape, so it landed with the ticket for the gap
 * rather than with the gap marked. That ticket was #249, which closed the
 * population on 30 ตุลาคม 2569 — `forms 27 · flagged 127 · always 1 · marked 5
 * · bare 0 · problems 0` — and wired this into `scripts/census.js` with nothing
 * changed in the script, which is what the shape was for. The sentence that
 * stood here until that day is kept above rather than deleted, because the
 * reason it gave is what decided how the instrument landed (#54).
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
 *   Measured on a real site the day this landed (#226): the `<select>` then at
 *   `components/offerings/OfferingForm.js:178` read `flagged` behind a flag
 *   raised in a fetch effect and never in `submit`, so it was down before
 *   anybody could press save, and `bare` was a lower bound. #249 gave that form
 *   a flag of its own on 30 ตุลาคม 2569, which expired the witness and not the
 *   limit: that picker is now `OfferingForm.js:203` and reads
 *   `sending || !draft.program_id || loading`, which this script reports as one
 *   `flagged` and cannot tell from a condition holding the read's flag alone.
 *   Every submit button of the fifteen reads the **page's** `busy`, correctly
 *   and by this rule's own wording, and is reported the same way as one reading
 *   the form's. The line cited is the one this script reports — the opening tag
 *   of the control — and not the line the `disabled` is written on, which is
 *   four below it here.
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
 * - **a way out that is not a `<button>`, or whose handler calls no prop.**
 *   Measured on a real site the day the third question landed (#226):
 *   `components/ProfilePhotoDialog.js:153` is a backdrop `<div onClick={close}>`
 *   and `components/Navbar.js:551` is a ยกเลิก whose `closeChangePassword` sets
 *   the navbar's own state rather than calling a prop, because the box's state
 *   lives in the file that draws it (#167). Both are ways out this question
 *   cannot see; both were already free, which is how they were read at all.
 *   `components/offerings/SectionsPanel.js:180` is the third shape -
 *   `() => setRenaming(null)`, a way out of a form in the same file.
 * - **whether a prop a button hands control to really takes the person out.**
 *   `onRemove` and `onRemoveSection` are props too, and a button that calls one
 *   sends a request rather than closing a form. Today every such button is
 *   free, so none is reported; the day one holds a flag this question will name
 *   it wrongly, and that is what a marker's prose is for.
 * - **two forms in one file.** The marker is read from the file, so a file with
 *   a flagged form and a bare one is green on both — `components/Navbar.js`
 *   holds one form and `components/offerings/SectionsPanel.js` holds two.
 * - **a destructured callback parameter counted as a prop.** `propsIn` walks
 *   every `node.params`, so a name destructured inside a callback - say
 *   `rows.map(({ onPick }) => …)` - joins the set a way out is recognised by,
 *   and an in-row button calling it would read as a way out of the form.
 *   Nothing in `src/` does that today; this is the mirror of the bullet above,
 *   which is too loose about the prop's **meaning** rather than its origin.
 * - **a marker written for a field silences this file's way out too.** The
 *   marker is read from the file and now greens all three questions, so
 *   `components/LoginForm.js`' marker, written for its two fields and its
 *   button, would excuse a held way out in that file without anybody meaning
 *   it. Found by the two-axis review on 31 ตุลาคม 2569; a way-out-specific
 *   marker is cheaper than the next reader's census (#93, #141).
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

/**
 * Every name a function parameter destructures: what a component is handed.
 *
 * Parameters only. A name destructured from a hook's return is a local, and the
 * question below is about control going back to whoever drew this form.
 */
function propsIn(ast) {
  const names = new Set()
  walk(ast, node => {
    if (!Array.isArray(node.params)) return
    for (const param of node.params) {
      if (!param || param.type !== 'ObjectPattern') continue
      for (const property of param.properties || [])
        if (property.type === 'ObjectProperty' && property.key && property.key.name)
          names.add(property.key.name)
    }
  })
  return names
}

/**
 * Locals whose body calls one of those props: a way out written as a helper.
 *
 * One hop. A helper that calls a helper that calls the prop is the limit this
 * cannot read, and it is on the front page with the others.
 */
function handlersIn(ast, props) {
  const bodies = []
  walk(ast, node => {
    if (node.type === 'FunctionDeclaration' && node.id) bodies.push([node.id.name, node.body])
    if (
      node.type === 'VariableDeclarator' &&
      node.id &&
      node.id.type === 'Identifier' &&
      node.init &&
      (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')
    )
      bodies.push([node.id.name, node.init.body])
  })
  const names = new Set()
  for (const [name, body] of bodies) if (callsOneOf(body, props)) names.add(name)
  return names
}

/** Whether anything under `node` calls one of `names` by that bare name. */
function callsOneOf(node, names) {
  let found = false
  walk(node, inner => {
    if (inner.type !== 'CallExpression') return
    if (inner.callee && inner.callee.type === 'Identifier' && names.has(inner.callee.name))
      found = true
  })
  return found
}

/** Whether a button's `onClick` hands control back to whoever drew the form. */
function handsBack(node, names) {
  const attribute = attributeOf(node, 'onClick')
  if (!attribute || !attribute.value) return false
  if (attribute.value.type !== 'JSXExpressionContainer') return false
  const expression = attribute.value.expression
  if (expression.type === 'Identifier') return names.has(expression.name)
  if (expression.type !== 'ArrowFunctionExpression') return false
  return callsOneOf(expression.body, names)
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
  const waysOut = []
  const handedTo = new Set(propsIn(ast))
  for (const name of handlersIn(ast, handedTo)) handedTo.add(name)
  walk(ast, node => {
    if (node.type !== 'JSXOpeningElement') return
    const tag = tagOf(node)
    if (tag === 'button' && typeOf(node) === 'submit') {
      buttons.push({ line: node.loc.start.line, closedBy: disabledIn(node, code) })
      return
    }
    if (tag === 'button') {
      // The third question. A button that is neither the submit nor a way out -
      // a row's pencil, an เพิ่ม inside the form - is neither asked about nor
      // counted: #228's answer is about the fields, the send and the way out.
      if (handsBack(node, handedTo))
        waysOut.push({ line: node.loc.start.line, closedBy: disabledIn(node, code) })
      return
    }
    if (!FIELDS.has(tag)) return
    // A hidden input is not something a person can move, and a file input the
    // dialog has already read is still a field: only the first is skipped, and
    // by what it is rather than by what it is called.
    if (tag === 'input' && typeOf(node) === 'hidden') return
    fields.push({ line: node.loc.start.line, tag, closedBy: disabledIn(node, code) })
  })

  if (buttons.length === 0) return { buttons: [], fields: [], waysOut: [], marker: null }
  return { buttons, fields, waysOut, marker: markerIn(ast.comments || [], code) }
}

/** What one control is, given what else the file holds. */
function classify(control, found) {
  if (control.closedBy === '') return { kind: 'always' }
  if (control.closedBy !== null) return { kind: 'flagged', by: control.closedBy }
  if (found.marker) return { kind: 'marked', marker: found.marker }
  return { kind: 'bare' }
}

/**
 * What one way out is - the third question's rule, which is the inverse of the
 * other two: a control that must hold **nothing**.
 */
function classifyWayOut(control, found) {
  if (control.closedBy === null) return { kind: 'free' }
  if (found.marker) return { kind: 'marked', marker: found.marker }
  // A bare `disabled` is `always` for a field, where it is a control nobody
  // can be in the window of - and the **worst** case here, where it is a way
  // out nobody can ever take. So it stays a problem and says what it is,
  // rather than naming a flag it does not have.
  return { kind: 'held', by: control.closedBy === '' ? null : control.closedBy }
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
  const free = []
  let forms = 0
  let waysOut = 0

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
    waysOut += found.waysOut.length
    for (const control of found.waysOut) {
      const at = where + ':' + control.line
      const verdict = classifyWayOut(control, found)
      if (verdict.kind === 'free') free.push(at)
      else if (verdict.kind === 'marked' && verdict.marker.ok)
        marked.push(at + ' — ' + verdict.marker.reason)
      else if (verdict.kind === 'marked')
        problems.push({
          where,
          line: verdict.marker.line,
          why: 'marker needs a reason of its own and a ticket number',
        })
      else
        problems.push({
          where,
          line: control.line,
          why:
            'the button that hands this form back is ' +
            (verdict.by === null
              ? 'disabled outright, so it can never be taken'
              : 'closed by `' + verdict.by + '`') +
            '. The owner answered that on 26 ตุลาคม 2569 (#228): ยกเลิก holds ' +
            'nothing, whosever flag it is, so a person is never kept in a form ' +
            'by a save of its own (#253). Either free it, or write ' +
            '`// save-window: <why this way out holds a flag> (#NNN)` in this file',
        })
    }
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
      ' · ways out ' +
      waysOut +
      ' · free ' +
      free.length +
      ' · problems ' +
      problems.length
  )
  if (process.argv.includes('--flagged')) for (const entry of flagged) console.log('  ' + entry)
  if (process.argv.includes('--marked')) for (const entry of marked) console.log('  ' + entry)
  if (process.argv.includes('--always')) for (const entry of always) console.log('  ' + entry)
  if (process.argv.includes('--free')) for (const entry of free) console.log('  ' + entry)
  for (const entry of bare) console.log('  ' + entry.where + ':' + entry.line + ' ' + entry.why)
  for (const problem of problems)
    console.log('  ' + problem.where + ':' + problem.line + ' ' + problem.why)

  process.exitCode = bare.length + problems.length > 0 ? 1 : 0
}

if (require.main === module) main()

module.exports = { examine, classify, classifyWayOut }
