'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { EVIDENCE_DIR } = require('./env');

/**
 * The files a run uploads, and what clears them — #138.
 *
 * #35 gave this suite something the others do not have: a spec that writes to
 * a disk. `35a` attaches PDFs through the screen, the backend stores them under
 * `EVIDENCE_DIR`, and `global-setup.js` drops and reseeds the schema on every
 * invocation — so the rows pointing at those files went with the schema and the
 * files did not. Measured on 16 September 2569, on the machine this suite has
 * run on since #35: 323 files, 14 KB, the oldest from 3 September.
 *
 * Small, and it would have stayed small. What makes it worth a module is that
 * the comment beside `EVIDENCE_DIR` promised *a run leaves nothing behind*,
 * which was true of the tree and not of the machine — and an instrument that
 * says something it does not do is the species of defect this suite keeps
 * finding in itself (#123, #132).
 *
 * **At the start of a run, beside the schema drop, and for the same reason.**
 * The files and the rows that name them are one world; cleaning them at
 * different moments is what made this possible in the first place. At the start
 * rather than at the end, so a run that failed leaves its evidence on disk to
 * be looked at — `global-setup.js` gives that reason for the schema and it is
 * the same reason here.
 *
 * **The whole directory goes, rather than being emptied.** `storeFile` in
 * `backend/lib/evidence.js` makes its own `section_…/activity_…` folders with
 * `recursive: true` on every upload, so there is nothing to keep, and a
 * directory removed whole cannot leave the half of a tree a walk missed.
 *
 * ## The guard, which is the reason this is not two lines in `global-setup.js`
 *
 * One path component from the suite's store is `_local/evidence`, which is the
 * product's own default and, on a machine that runs the walk stack, real
 * student work. A delete is not a write that can be put back, so the directory
 * is checked before it is removed rather than trusted from where it was read:
 *
 * - it resolves to somewhere **inside the OS temp directory**, which is what
 *   `_local/evidence`, the tree, and anything reached by climbing out with
 *   `..` all fail; and
 * - its name **starts with the suite's own**, which is what the temp directory
 *   itself and everybody else's files in it fail.
 *
 * Checked on the resolved path, so a `..` in the middle is answered by where
 * the path ends and not by how it is spelled — and on the *real* path when the
 * directory exists, because `path.resolve` is lexical: a junction sitting at
 * the store's own name and pointing at `_local/evidence` satisfies both clauses
 * while being somewhere else entirely. `fs.rm` would unlink the junction rather
 * than follow it, so the files would survive either way, but a guard that is
 * right by a property of the call it makes is a guard nobody can read. The
 * prefix rather than the whole
 * name is deliberate: it lets `uploads.test.js` prove the clearing on a real
 * directory of its own — `deep-core-e2e-evidence-test-<pid>`, the same shape as
 * the schemas the other support tests make — instead of proving it on the
 * suite's store, which is the one directory a test must not be pointed at while
 * a run is using it.
 *
 * What it cannot measure: whether the backend is storing where this is
 * clearing. Both read `EVIDENCE_DIR` from `env.js` — the config hands it to the
 * server, this takes it as a default — and nothing here would notice a server
 * started by hand with the variable set to something else. That is the same
 * shape as the ports, and `env.js` is the one place either is written down.
 */

/** The suite's own store, or one named like it: in the temp directory, under our name. */
function suiteOwns(dir) {
  const resolved = path.resolve(dir);
  const temp = path.resolve(os.tmpdir());
  return (
    resolved.startsWith(temp + path.sep) &&
    path.basename(resolved).startsWith(path.basename(EVIDENCE_DIR))
  );
}

/** Removes the store, having refused any directory that is not one of ours. */
async function clearUploads(dir = EVIDENCE_DIR) {
  // Where the directory really is, when it is there at all: a junction is a
  // path that answers one question and points at another. A store that does not
  // exist yet — the first run on a machine — is judged as it is spelled, which
  // is all there is to judge, and there is nothing behind it to remove.
  let real = dir;
  try {
    real = await fs.realpath(dir);
  } catch {
    real = dir;
  }
  if (!suiteOwns(real)) {
    const where = path.resolve(real) === path.resolve(dir) ? '' : `, which is really ${real}`;
    throw new Error(
      `refusing to clear ${dir}${where}: this clears the e2e upload store, which lives in ` +
        `the OS temp directory under ${path.basename(EVIDENCE_DIR)}. A directory elsewhere — ` +
        `_local/evidence above all — holds files nobody here put there.`,
    );
  }
  await fs.rm(dir, { recursive: true, force: true });
}

module.exports = { clearUploads, suiteOwns };
