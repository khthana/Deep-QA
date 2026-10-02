#!/usr/bin/env node
/**
 * Both censuses, every time.
 *
 * `a && b` runs b only when a came out clean, so a red first census hid
 * whatever the second had to say - a tool that cannot say what it did not look
 * at (#123, #126), which is the thing both of these exist to prevent. Each one
 * runs, both answers are printed, and the exit code is the worse of the two.
 */
const { spawnSync } = require('child_process')
const path = require('path')

const CENSUSES = ['superseded-answers.js', 'label-codes.js']

let worst = 0
for (const name of CENSUSES) {
  const run = spawnSync(process.execPath, [path.join(__dirname, name)], {
    stdio: 'inherit',
  })
  worst = Math.max(worst, run.status === null ? 1 : run.status)
}
process.exitCode = worst
