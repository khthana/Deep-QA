'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { clearUploads, suiteOwns } = require('./uploads');
const { EVIDENCE_DIR } = require('./env');

/**
 * The guard is the point of these rows — #138.
 *
 * What this module does is delete a directory, and the directory it is pointed
 * at is the whole of the risk: `_local/evidence` is real student work on the
 * machine this suite runs on, one path component away from the suite's own
 * store. So the refusals are tested one reason at a time, and the row that
 * proves the acceptance is the suite's real directory — read from `env.js`,
 * because a test that spelled the path again would pass while the run cleared
 * something else.
 *
 * The rows that touch a disk make a directory of their own, named from that
 * same constant with a suffix, the way the schema tests name theirs for the
 * process. The guard accepts it because it is in the temp directory and carries
 * the suite's name, which is what the prefix in `suiteOwns` is for — and each
 * of those rows puts its directories back in a `finally`, because a row that
 * cleans up only when it passes leaves litter in the temp directory, which is
 * the defect this ticket exists to remove.
 */

const OURS = path.basename(EVIDENCE_DIR);

/** A directory of this test's own, and the file inside it that proves it went. */
async function store(suffix = '') {
  const dir = path.join(os.tmpdir(), `${OURS}-test-${process.pid}${suffix}`);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(path.join(dir, 'section_1', 'activity_1'), { recursive: true });
  await fs.writeFile(path.join(dir, 'section_1', 'activity_1', 'a.pdf'), '%PDF-1.4');
  return dir;
}

const discard = dirs => Promise.all(dirs.map(dir => fs.rm(dir, { recursive: true, force: true })));

const exists = async target => {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
};

test('the directory the suite really uses is one it owns', () => {
  assert.equal(suiteOwns(EVIDENCE_DIR), true);
});

test('the store the product uses is not', () => {
  const real = path.join(__dirname, '..', '..', '_local', 'evidence');
  assert.equal(suiteOwns(real), false);
});

test('somebody else in the temp directory is not', () => {
  assert.equal(suiteOwns(path.join(os.tmpdir(), 'npm-cache')), false);
});

test('the temp directory itself is not', () => {
  assert.equal(suiteOwns(os.tmpdir()), false);
});

test('a path that reads as ours and climbs out of the temp directory is not', () => {
  // Spelled by hand rather than with `path.join`, which collapses the `..`
  // itself: the claim is about a path that still carries one when it arrives,
  // which is the only kind `path.resolve` in the guard is there for. Both of
  // these begin with the temp directory and end in the suite's own name, and
  // both land somewhere else.
  const up = ['', '..', '..'].join(path.sep);
  assert.equal(suiteOwns(EVIDENCE_DIR + up + path.sep + OURS), false);
  assert.equal(suiteOwns(EVIDENCE_DIR + up + path.sep + '_local' + path.sep + 'evidence'), false);
});

test('a directory named like ours somewhere else is not', () => {
  assert.equal(suiteOwns(path.join(__dirname, OURS)), false);
});

test('clearing empties a directory it owns, nested folders and all', async () => {
  const dir = await store();
  try {
    await clearUploads(dir);
    assert.equal(await exists(dir), false);
  } finally {
    await discard([dir]);
  }
});

test('clearing a directory that is not there is not an error', async () => {
  const dir = path.join(os.tmpdir(), `${OURS}-test-${process.pid}-absent`);
  await fs.rm(dir, { recursive: true, force: true });
  await clearUploads(dir);
  assert.equal(await exists(dir), false);
});

test('a directory it does not own is refused, and the sentence names it', async () => {
  const dir = await store();
  const theirs = path.join(dir, '..', 'someone-elses-files');
  try {
    await fs.mkdir(theirs, { recursive: true });
    await fs.writeFile(path.join(theirs, 'keep.pdf'), '%PDF-1.4');

    await assert.rejects(() => clearUploads(theirs), error =>
      error instanceof Error && error.message.includes('someone-elses-files'));

    assert.equal(await exists(path.join(theirs, 'keep.pdf')), true);
  } finally {
    await discard([dir, theirs]);
  }
});

test('clearing one store leaves the one beside it alone', async () => {
  const dir = await store();
  const neighbour = await store('-neighbour');
  try {
    await clearUploads(dir);
    assert.equal(await exists(dir), false);
    assert.equal(await exists(path.join(neighbour, 'section_1', 'activity_1', 'a.pdf')), true);
  } finally {
    await discard([dir, neighbour]);
  }
});

/**
 * The name can be ours and the directory somebody else's.
 *
 * `path.resolve` answers what a path spells, not where it goes, so a junction
 * in the temp directory carrying the suite's own name and pointing at a store
 * outside it passes both of the guard's clauses. Written as a junction rather
 * than a symbolic link because that is the kind Windows makes without asking
 * for elevation; a machine that refuses even that skips the row rather than
 * reporting a guard it did not test.
 */
test('a junction wearing our name and pointing elsewhere is refused', async t => {
  const outside = path.join(__dirname, '..', 'test-results', `uploads-${process.pid}`);
  const link = path.join(os.tmpdir(), `${OURS}-test-${process.pid}-link`);
  await fs.mkdir(outside, { recursive: true });
  await fs.writeFile(path.join(outside, 'keep.pdf'), '%PDF-1.4');
  try {
    await fs.rm(link, { recursive: true, force: true });
    await fs.symlink(outside, link, 'junction');
  } catch (error) {
    await discard([outside]);
    return t.skip(`this machine will not make a junction: ${error.code}`);
  }
  try {
    await assert.rejects(() => clearUploads(link), error => error instanceof Error);
    assert.equal(await exists(path.join(outside, 'keep.pdf')), true);
  } finally {
    await fs.rm(link, { recursive: true, force: true });
    await discard([outside]);
  }
});

/**
 * The run is where this module earns its place, and the run is a text file.
 *
 * Every row above proves the guard; none of them proves that anything calls it,
 * and deleting the call from `global-setup.js` left all of them green. What can
 * be asserted cheaply is the source: the setup asks for the clearing, and asks
 * before it drops the schema, which is the order the reasoning depends on — the
 * files and the rows naming them are cleared in the same breath, and a run that
 * failed keeps both.
 *
 * What it cannot say: that Playwright calls `global-setup` at all, that the
 * call is awaited, or that the server is storing where this is clearing. The
 * first two are Playwright's own contract and the third is `env.js`; a scan
 * that reads a file's text stops at that file's boundary (#89).
 */
test('the run clears the store, and does it before the schema goes', async () => {
  const setup = await fs.readFile(path.join(__dirname, 'global-setup.js'), 'utf8');
  assert.match(setup, /await clearUploads\(\)/);
  assert.ok(
    setup.indexOf('await clearUploads()') < setup.indexOf('await dropSchema('),
    'global-setup.js drops the schema before it clears the uploads',
  );
});
