/*
 * #219 - the join, which is the third of the three instruments and the one
 * that produces the figure the ticket's answers rest on: **which of the 45
 * sites that name `ยกเลิก` is the confirm box's, and which is a form's**.
 *
 * `219-cancel-sites.js` holds the population and cannot say what a press
 * landed on; `219-cancel-presses.js` says what each press landed on and
 * reports presses rather than sites. Neither answers per site, so without this
 * the site table would be a hand pairing - a reading, which is the thing the
 * ticket's first closing criterion refuses. This makes it re-runnable.
 *
 * Run it against a press log written by a full measuring run:
 *
 *     node e2e/probes/219-join.js <presses.jsonl>
 *
 * It runs the census itself for the population, so there is one argument and
 * nothing to keep in step.
 *
 * It joins a site to the presses it made by four readers in order, and prints
 * which one answered, because they are not equally strong:
 *
 *   frame    the press's innermost `e2e/` frame is the site itself. The
 *            strongest, and available only where the caller is synchronous.
 *   test     the site's enclosing `test`/`describe` title is a string and
 *            equals the title the runner reported.
 *   pattern  that title is written as a template, so the literal halves of it
 *            have to appear in the reported title in order. The weakest, and
 *            on 24 ตุลาคม 2569 it answered for one site (`142a:302`).
 *   file     nothing above answered, and every press from that file agrees on
 *            one kind.
 *
 * A site whose presses disagree is printed `AMBIGUOUS` with the counts, and a
 * site with no press at all is printed `?`. Both are findings and not
 * roundings: the first means a site presses both controls, which is the thing
 * shape three's answer says does not happen today; the second means a site the
 * suite did not reach, which is as likely to be a run that stopped early
 * (#208) as a row that is skipped.
 *
 * **A press log is dated against the tree it was taken from.** The frame reader
 * keys on `file:line`, so a site whose line moved after the log was written
 * reads `?` - a citation by line number ages the day anything above it grows
 * (#173), and here the instrument saying so is the right answer rather than a
 * failure. Run against #219's own log, taken before `118a` was moved onto the
 * shared `dismiss`, this prints `dialog 19 · form 25 · ? 1`, the one being
 * `support/confirm-dialog.js:77`, which the log names at `:74` because the fix
 * grew three lines of docblock above it. That site is `dismiss` itself, so it
 * is the box's by construction. The next measuring run on this tree attributes
 * all 45.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const log = process.argv[2];
if (!log) {
  console.error('usage: node e2e/probes/219-join.js <presses.jsonl>');
  process.exit(2);
}

/** The population, asked of the census rather than kept beside it. */
const census = execFileSync(process.execPath, [path.join(__dirname, '219-cancel-sites.js')], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const sites = census
  .split('\n')
  .filter(line => line.startsWith('{'))
  .map(line => JSON.parse(line));

const presses = fs
  .readFileSync(log, 'utf8')
  .split('\n')
  .filter(line => line.startsWith('{'))
  .map(line => JSON.parse(line));

/** The innermost title the runner reported, which is the row's own. */
const leafOf = title => title.split(' > ').pop().split(' › ').pop().trim();

/** The literal halves of a title written as a template, in order. */
const piecesOf = source =>
  source
    .replace(/^`|`$/g, '')
    .split(/\$\{[^}]*\}/)
    .filter(piece => piece.trim());

const bump = (map, key, kind) => {
  if (!map.has(key)) map.set(key, new Map());
  const kinds = map.get(key);
  kinds.set(kind, (kinds.get(kind) || 0) + 1);
};

const byFrame = new Map();
const byLeaf = new Map();
const byFile = new Map();
/** file -> [{leaf, kind}], for the template reader. */
const leavesOf = new Map();

for (const press of presses) {
  if (press.frames && press.frames.length) {
    const parts = press.frames[0].split(':');
    bump(byFrame, parts[0] + ':' + parts[1], press.kind);
  }
  const file = press.row ? press.row.file : '(no row)';
  const leaf = press.row ? leafOf(press.row.title) : '';
  bump(byFile, file, press.kind);
  bump(byLeaf, file + '\u0000' + leaf, press.kind);
  if (!leavesOf.has(file)) leavesOf.set(file, []);
  leavesOf.get(file).push({ leaf, kind: press.kind });
}

const matching = (file, source) => {
  const want = piecesOf(source);
  const kinds = new Map();
  for (const { leaf, kind } of leavesOf.get(file) || []) {
    let at = 0;
    let ok = true;
    for (const piece of want) {
      const found = leaf.indexOf(piece, at);
      if (found < 0) {
        ok = false;
        break;
      }
      at = found + piece.length;
    }
    if (ok) kinds.set(kind, (kinds.get(kind) || 0) + 1);
  }
  return kinds.size ? kinds : null;
};

const totals = new Map();
for (const site of sites) {
  const under = site.site.replace(/^e2e\//, '');
  const file = path.basename(site.site).replace(/:\d+$/, '');
  let kinds = byFrame.get(under) || null;
  let how = 'frame';
  if (!kinds && site.title) {
    const leaf = leafOf(site.title);
    kinds = byLeaf.get(file + '\u0000' + leaf) || null;
    how = 'test';
    if (!kinds && leaf.indexOf('${') >= 0) {
      kinds = matching(file, leaf);
      how = 'pattern';
    }
  }
  if (!kinds) {
    kinds = byFile.get(file) || null;
    how = 'file';
  }
  let label = '?';
  if (kinds && kinds.size === 1) label = [...kinds.keys()][0];
  else if (kinds) label = 'AMBIGUOUS ' + JSON.stringify(Object.fromEntries(kinds));
  if (!kinds) how = '-';
  totals.set(label.split(' ')[0], (totals.get(label.split(' ')[0]) || 0) + 1);
  console.log(
    under.padEnd(62) +
      ' ' +
      label.padEnd(26) +
      ' ' +
      how.padEnd(8) +
      ' ' +
      (site.title || '-').slice(0, 70)
  );
}

console.log('presses read: ' + presses.length + '  sites: ' + sites.length);
console.log('by kind: ' + JSON.stringify(Object.fromEntries(totals)));
