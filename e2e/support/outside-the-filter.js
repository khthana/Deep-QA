'use strict';

/**
 * The sentence the seven filtered screens add when a save falls outside the
 * filter their own table is on — #247, the owner's answer ข้อ จ of 29 ตุลาคม
 * 2569.
 *
 * Copied rather than imported, for `grants-panel.js`'s reason:
 * `frontend/src/lib/outsideTheFilter.js` is an ES module inside the CRA build
 * and this suite is CommonJS. What the copy risks is drifting from the screen,
 * and a drifted sentence fails the rows that use it rather than passing
 * quietly, because this is the string their assertions look for.
 *
 * It is one constant on each side rather than a sentence typed into each spec:
 * a pinned string built by hand in several files is one a grep for the words
 * cannot find (#111, #124), and the claim each row makes is its own *use* of
 * this, not the text itself (#104).
 */
const OUTSIDE_THE_FILTER = 'แถวนี้อยู่นอกรายการที่กรองอยู่';

/**
 * The sentence the four screens that mount `ImportPanel` add when a file writes
 * rows outside the filter their table is on — #252, the owner's answer of
 * 30 ตุลาคม 2569 (ข้อ ง: the parent screen says it, through `onImported`).
 *
 * A second constant and not the one above, because that one says *แถวนี้* and a
 * file of N rows cannot carry it.
 */
const SOME_IMPORTED_OUTSIDE = 'บางแถวที่นำเข้าอยู่นอกรายการที่กรองอยู่';

module.exports = { OUTSIDE_THE_FILTER, SOME_IMPORTED_OUTSIDE };
