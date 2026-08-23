'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { currentTerm } = require('../term');

/**
 * The six dates the rule turns on, and one that is not a boundary at all.
 *
 * Built from local components rather than from ISO strings on purpose:
 * `new Date('2026-06-01')` is UTC midnight, which is 31 May on any runner west
 * of Greenwich, and a boundary test that reads the wrong side of its own
 * boundary passes for the wrong reason.
 *
 * The last three are the ones that earn their keep. 1 พ.ย., 31 ธ.ค. and
 * 1 ม.ค. are one term, spelled across two calendar years, and any rule that
 * took the academic year from the calendar year would split them.
 */
const at = (year, month, day) => new Date(year, month - 1, day);

for (const [what, when, expected] of [
  ['31 พ.ค. is the last day of semester 2, in the year before', at(2026, 5, 31), { academicYear: '2568', semester: 2 }],
  ['1 มิ.ย. opens semester 1, and the academic year with it', at(2026, 6, 1), { academicYear: '2569', semester: 1 }],
  ['31 ต.ค. is the last day of semester 1', at(2026, 10, 31), { academicYear: '2569', semester: 1 }],
  ['1 พ.ย. opens semester 2, in the same academic year', at(2026, 11, 1), { academicYear: '2569', semester: 2 }],
  ['31 ธ.ค. is still that same semester 2', at(2026, 12, 31), { academicYear: '2569', semester: 2 }],
  ['1 ม.ค. is still that same semester 2, a calendar year later', at(2027, 1, 1), { academicYear: '2569', semester: 2 }],
  ['a day in the middle of semester 1 is unremarkable', at(2026, 8, 23), { academicYear: '2569', semester: 1 }],
]) {
  test(what, () => {
    assert.deepEqual(currentTerm(when), expected);
  });
}

test('there is no semester 3, whatever day it is asked about', () => {
  for (let month = 1; month <= 12; month += 1) {
    for (const day of [1, 15, 28]) {
      const { semester } = currentTerm(at(2026, month, day));
      assert.ok(semester === 1 || semester === 2, `${day}/${month} answered semester ${semester}`);
    }
  }
});

test('the time of day does not move the boundary', () => {
  // A term that changed at some hour of the day would be a dashboard that
  // showed one thing in the morning and another in the evening.
  assert.deepEqual(currentTerm(new Date(2026, 5, 1, 0, 0, 0)), currentTerm(new Date(2026, 5, 1, 23, 59, 59)));
  assert.deepEqual(currentTerm(new Date(2026, 4, 31, 0, 0, 0)), currentTerm(new Date(2026, 4, 31, 23, 59, 59)));
});

test('called with no date it reads the clock, and reads it each time', async () => {
  // The default is evaluated per call and not captured at require time. Seeding
  // runs in a process that can outlive a boundary, and a term frozen at load
  // would be wrong from that moment until the process restarted.
  const now = currentTerm();
  assert.deepEqual(now, currentTerm(new Date()));
  assert.match(now.academicYear, /^25[0-9]{2}$/);
});
