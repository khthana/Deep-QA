'use strict';

const os = require('node:os');
const path = require('node:path');

/**
 * Where this suite's servers live, and which schema they sit on.
 *
 * Deliberately not 3000/5000 and not `deep_core`. The import tests write real
 * students, and a suite that could land on the ports and schema a person is
 * developing against would eventually write them into that person's database.
 *
 * The two ports may be overridden by the environment — `E2E_BACKEND_PORT` and
 * `E2E_FRONTEND_PORT` — and the reason is Windows rather than preference:
 * Hyper-V reserves blocks of ephemeral ports and re-randomises them on every
 * boot, so a machine can wake up with one of these inside an excluded range.
 * The defaults themselves do not move: a suite whose ports drifted per machine
 * would make every "it works here" less informative.
 *
 * **The two symptoms this has, and how to tell the quiet one from a crash, are
 * in `e2e/README.md` §Ports.** This comment held a second copy of them until
 * 26 October 2569 (#237), and two places holding one opinion is a claim
 * neither of them can be shown to hold (#97) — and #237 made the README's
 * copy the one every `mutation/` run block points at, so this side is a
 * pointer and not a summary. What stays here is the mechanism a reader of
 * *this* function needs: the override exists, and it is read below.
 */

/** A port from the environment, or the suite's own. */
const port = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const E2E_SCHEMA = 'deep_core_e2e';
/**
 * Where #35's uploads land during a run.
 *
 * Named here beside the schema because it is the same decision: this suite
 * writes real rows and now real files, and both belong somewhere nobody is
 * working in. Under the OS temp directory rather than in the tree, so a run
 * leaves nothing behind to gitignore or to mistake for source.
 *
 * Out of the tree is not the same as cleaned up, which this comment said for
 * thirteen days and 323 files: `global-setup.js` clears the directory at the
 * start of every run, beside the schema drop, and `uploads.js` says how it
 * decides that a directory is this one (#138).
 */
const EVIDENCE_DIR = path.join(os.tmpdir(), 'deep-core-e2e-evidence');
const BACKEND_PORT = port('E2E_BACKEND_PORT', 3100);
const FRONTEND_PORT = port('E2E_FRONTEND_PORT', 5100);

module.exports = {
  E2E_SCHEMA,
  EVIDENCE_DIR,
  BACKEND_PORT,
  FRONTEND_PORT,
  BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
  FRONTEND_URL: `http://localhost:${FRONTEND_PORT}`,
};
