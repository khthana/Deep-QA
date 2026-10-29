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
  'pager-last-page.js',
  // `save-window-fields.js` is deliberately not here. Its first run is a red
  // gate over a population no ticket has landed the shape on yet (`bare 57` on
  // 29 October 2569), and an instrument wired in while its population is red
  // teaches people to ignore the whole suite of them - #200 settled that shape:
  // the instrument lands with the ticket for the gap, which is #249, instead of
  // with the gap marked. It goes in this list the day #249 closes. An exemption
  // with no reason beside it is one nobody after you can read (#141).
]

let worst = 0
for (const name of CENSUSES) {
  const run = spawnSync(process.execPath, [path.join(__dirname, name)], {
    stdio: 'inherit',
  })
  worst = Math.max(worst, run.status === null ? 1 : run.status)
}
process.exitCode = worst
