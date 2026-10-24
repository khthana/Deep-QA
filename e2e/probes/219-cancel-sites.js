/*
 * #219 - the population half of the census, beside the runtime half in
 * `219-cancel-presses.js`. It answers *which sites under `e2e/` name a control
 * called exactly `ยกเลิก`*, and the other one answers *what each press of one
 * landed on*. Neither is a row and neither is wired into a gate: they are the
 * instruments the ticket's first closing criterion asks for, kept because
 * nothing else can read either answer again (#169).
 *
 * It parses rather than greps, because a grep for the word is evidence about
 * the pattern typed and not about the claim wanted (#83, #133). Three shapes a
 * grep for `name: 'ยกเลิก'` cannot classify, all of them real here:
 *
 *   - `name: confirm ? 'ลบ' : 'ยกเลิก'`      `support/weights-screen.js:96`
 *   - `name: CANCEL` with the word in a const elsewhere in the file
 *   - `attributionOf(page, ACTIVITIES[0].name)` - a `.name` that is not the
 *     option, which the first version of this census counted as a site
 *
 * Run it as `node e2e/probes/219-cancel-sites.js`. It prints one JSON line per
 * site - the site, the locator's scope, the call it is made through, and the
 * enclosing `test`/`describe` titles, which is what joins its rows to the
 * runtime probe's presses - then the totals, then the callers of the shared
 * `dismiss`.
 *
 * What it cannot say:
 *
 * - it reports **sites**, not presses: a site inside a loop over seven screens
 *   is one line here and seven there, and which control each one lands on is
 *   not in the text at all - 37 of the 45 sites it found build their locator on
 *   `page` with nothing to say whether a form or the confirm box is on the
 *   screen at that moment. That is the whole reason the runtime probe exists;
 * - `title` is the source text of a title written as a template, so a site
 *   inside `` test(`a read that ${screen.remove} took...`) `` joins to the
 *   runtime rows by the literal halves of that template and not by equality;
 * - it reads `@babel/parser` out of `frontend/node_modules`, which is where
 *   react-scripts brings it and where the six censuses in `frontend/scripts/`
 *   read it from too. It is not a declared dependency of either tree, so this
 *   exits 2 with a sentence rather than a stack when it is not installed.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const PARSER = path.join(REPO, 'frontend', 'node_modules', '@babel', 'parser');

let parser;
try {
  parser = require(PARSER);
} catch {
  console.error(
    'cannot read ' +
      PARSER +
      '\n@babel/parser arrives with react-scripts and is not a declared dependency of either tree.' +
      '\nRun `npm install` in frontend/ and try again.'
  );
  process.exit(2);
}

const CANCEL = 'ยกเลิก';
const ROOT = path.join(REPO, 'e2e');
const SKIP = new Set(['node_modules', 'test-results', 'playwright-report']);
/** Callees whose first argument is a title and never a locator. */
const TITLES = new Set(['test', 'describe', 'it', 'step']);

function filesUnder(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name) && entry.name[0] !== '.') filesUnder(full, out);
    } else if (full.endsWith('.js')) {
      // This file is left out of its own population by identity, and not by a
      // list of names that a new file would make lie (#126). Its two matches
      // are the `CANCEL` comparisons it classifies sites *with* - an
      // instrument that reads its own documentation counts its own examples
      // (#173) - and nothing in it presses anything.
      if (full !== __filename) out.push(full);
    }
  }
  return out;
}

function walk(node, visit, parents = []) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, parents);
    return;
  }
  if (!node.type) return;
  visit(node, parents);
  const next = parents.concat([node]);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key.endsWith('Comments')) continue;
    walk(node[key], visit, next);
  }
}

/** The titles of the `test`/`describe` calls a node sits inside, outermost first. */
function titleOf(parents, text) {
  const titles = [];
  for (const parent of parents) {
    if (parent.type !== 'CallExpression') continue;
    const callee =
      parent.callee.type === 'Identifier'
        ? parent.callee.name
        : parent.callee.type === 'MemberExpression' && parent.callee.object.type === 'Identifier'
          ? parent.callee.object.name
          : '';
    if (callee !== 'test' && callee !== 'describe') continue;
    const first = parent.arguments[0];
    if (!first) continue;
    if (first.type === 'StringLiteral') titles.push(first.value);
    else titles.push(text.slice(first.start, first.end).replace(/\s+/g, ' '));
  }
  return titles.join(' > ');
}

const sites = [];
const dismissals = [];

for (const file of filesUnder(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(text, { sourceType: 'module', plugins: ['jsx'] });
  } catch (e) {
    console.error('PARSE FAILED ' + file + ' ' + e.message);
    continue;
  }

  // The word can be written at the site, or held in a const or an object
  // property the site names instead.
  const consts = new Map();
  walk(ast, node => {
    if (
      node.type === 'VariableDeclarator' &&
      node.id.type === 'Identifier' &&
      node.init &&
      node.init.type === 'StringLiteral'
    ) {
      consts.set(node.id.name, node.init.value);
    }
    if (node.type === 'ObjectProperty' && node.key && node.key.name && node.value && node.value.type === 'StringLiteral') {
      consts.set('OBJ.' + node.key.name, node.value.value);
    }
  });
  const named = new Set();
  for (const [name, value] of consts) if (value === CANCEL) named.add(name);

  /**
   * Whether a name *expression* can be the word. The whole expression is
   * walked, because a name written as a choice between two literals is one
   * site and reading only the top node misses it.
   */
  const isCancel = node => {
    let found = false;
    walk(node, inner => {
      if (inner.type === 'StringLiteral' && inner.value === CANCEL) found = true;
      if (inner.type === 'Identifier' && named.has(inner.name)) found = true;
    });
    return found;
  };

  walk(ast, (node, parents) => {
    if (node.type !== 'CallExpression') return;
    const calleeSrc = text.slice(node.callee.start, node.callee.end);
    if (node.callee.type === 'Identifier' && TITLES.has(node.callee.name)) return;
    if (
      node.callee.type === 'MemberExpression' &&
      node.callee.property.name &&
      TITLES.has(node.callee.property.name)
    ) {
      return;
    }
    const line = text.slice(0, node.start).split('\n').length;
    if (calleeSrc === 'dismiss' || calleeSrc.endsWith('.dismiss')) {
      dismissals.push({ file: path.relative(REPO, file), line });
    }
    let hit = false;
    for (const arg of node.arguments) {
      if (arg.type === 'ObjectExpression') {
        for (const prop of arg.properties) {
          if (prop.key && prop.key.name === 'name' && isCancel(prop.value)) hit = true;
        }
      } else if (isCancel(arg)) {
        hit = true;
      }
    }
    if (!hit) return;
    let scope = 'page';
    if (node.callee.type === 'MemberExpression') {
      scope = text.slice(node.callee.object.start, node.callee.object.end);
    } else if (node.arguments.length && node.arguments[0].type !== 'StringLiteral') {
      scope = text.slice(node.arguments[0].start, node.arguments[0].end);
    }
    sites.push({
      site: path.relative(REPO, file).split(path.sep).join('/') + ':' + line,
      scope: scope.replace(/\s+/g, ' '),
      via: calleeSrc.replace(/\s+/g, ' '),
      title: titleOf(parents, text),
    });
  });
}

sites.sort((a, b) => a.site.localeCompare(b.site));
console.log('=== sites naming a control called exactly ' + CANCEL + ' ===');
for (const site of sites) console.log(JSON.stringify(site));
console.log(
  'sites: ' + sites.length + '  files: ' + new Set(sites.map(s => s.site.split(':')[0])).size
);

const byFile = new Map();
for (const call of dismissals) {
  const key = path.relative(REPO, path.join(REPO, call.file)).split(path.sep).join('/');
  byFile.set(key, (byFile.get(key) || 0) + 1);
}
console.log('=== calls to the shared dismiss ===');
for (const [file, count] of [...byFile].sort()) console.log('  ' + file + '  x' + count);
console.log('dismiss calls: ' + dismissals.length + '  files: ' + byFile.size);
