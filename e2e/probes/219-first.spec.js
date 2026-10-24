/*
 * #219 - the spec that installs `probes/219-cancel-presses.js` for the rest of
 * the run. It is a probe and not a row: it asserts only that the patch went
 * on, because a run whose instrument was never installed reports a clean sheet
 * of nothing (#208's tell - the count, not the exit code).
 *
 * Copied to `tests/000-probe-219.spec.js` for a measuring run and deleted
 * afterwards. See the probe's own docblock.
 */
'use strict';

const { test, expect } = require('@playwright/test');
const probe = require('../probes/219-cancel-presses');

test('the ยกเลิก probe is installed for this worker', async ({ page }) => {
  expect(probe.OUT, 'PROBE219_OUT must name the file the presses are written to').toBeTruthy();
  const went = probe.install(page.locator('html'));
  expect(went, 'the patch went on to Locator.prototype.click').toBe(true);
});
