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
  'held-sentences.js',
  'rows-outside-the-filter.js',
  // Wired in on 30 October 2569, the day #249 closed the population it was a
  // red gate over: `bare 57` on 29 October 2569, `bare 0` once the shape had
  // landed on all fifteen files. It was committed unwired for #200's reason -
  // an instrument wired in while its population is red teaches people to
  // ignore the whole suite of them - and that reason expired with the ticket
  // the instrument landed with rather than with an argument (#141, #200).
  'save-window-fields.js',
]

let worst = 0
for (const name of CENSUSES) {
  const run = spawnSync(process.execPath, [path.join(__dirname, name)], {
    stdio: 'inherit',
  })
  worst = Math.max(worst, run.status === null ? 1 : run.status)
}
process.exitCode = worst
