#!/usr/bin/env node
/**
 * Every census, every time.
 *
 * `a && b` runs b only when a came out clean, so a red first census hid
 * whatever the next had to say - a tool that cannot say what it did not look
 * at (#123, #126), which is the thing all of these exist to prevent. Each one
 * runs, every answer is printed, and the exit code is the worst of them. The
 * count is not written down here on purpose: this list has grown twice and a
 * hand-kept number in a file that grows is already wrong.
 */
const { spawnSync } = require('child_process')
const path = require('path')

const CENSUSES = [
  'superseded-answers.js',
  'label-codes.js',
  'sentences-after-a-move.js',
  'swallowed-refusals.js',
  'dead-loaders.js',
  'required-props.js',
  'landing-generations.js',
  'forms-cleared-by-identity.js',
]

let worst = 0
for (const name of CENSUSES) {
  const run = spawnSync(process.execPath, [path.join(__dirname, name)], {
    stdio: 'inherit',
  })
  worst = Math.max(worst, run.status === null ? 1 : run.status)
}
process.exitCode = worst
