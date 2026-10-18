'use strict';

const { test, expect } = require('@playwright/test');

const { DEPARTMENTS } = require('../../db/seed');
const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { panel, messageOf, saidBy } = require('../support/confirm-dialog');
const departments = require('../support/departments-screen');

/**
 * #204 - the question announces itself, and still lets the keyboard out.
 *
 * `ConfirmDialog` drew a `fixed inset-0 bg-black/50` cover and was, to anything
 * reading the page, a `div`: no `role="dialog"`, no `aria-modal`, no accessible
 * name or description, no focus moved into it and no way to close it with the
 * keyboard. A mouse cannot reach the table underneath, because the cover takes
 * the click; a keyboard can, because nothing stops it.
 *
 * ## The owner's decision, and why this file holds only half of it
 *
 * The ticket offered three ways and the measurement of 18 ตุลาคม 2569 made a
 * fourth one visible, which is the one taken: the two halves of its option 1
 * have very different prices and are separable.
 *
 * - **The announcing half** - `role="dialog"`, `aria-modal="true"`, a name, a
 *   description, focus moved into the box, Escape as a way out - costs **no
 *   row**. Every row that reaches a control under the cover does it with
 *   `focus()` or `fill()`, which move focus from wherever it was, so moving it
 *   into the box on open leaves all of them standing. Rows 1-5 below are that
 *   half.
 * - **The containment half** - a focus trap, `inert` or `aria-hidden` on the
 *   rest of the screen - is the one that removes reach, and it costs **10 rows
 *   in 5 files**: `202a` (3), `206a` (2), `207a` (3), `208a` (1), `211a` (1),
 *   plus a sweep of the 22 mutants those files hold. That is a change to what a
 *   person can do with the screen, so it is the owner's (`docs/06` §Out of
 *   Scope) and it is deferred to #217 rather than to prose
 *   (#119, #125). Row 6 is its net.
 *
 * The ten are a measurement and not a census, and the difference is the whole
 * value of running the mutant: a census by mechanism - `focus()` or `fill()` on
 * a control under the cover, closed over this file's own helpers - said
 * **eleven**, and the three rows it was wrong about are two kinds of wrong.
 * `208a`'s accounts row reaches its search box with `fill()`, whose own comment
 * says the way in is this ticket's; a trap does not close it, because `fill()`
 * sets the value and does not need focus to stay where it put it. `206a`'s
 * second row and `211a`'s second row press nothing under the cover at all - one
 * shares a helper with a row that does, the other shares only the file - which
 * is #174 from the losing side: a census is evidence about the property it
 * counted, and reachability through a helper is not the property.
 *
 * Three wrong out of eleven leaves eight, not ten, and the missing two are the
 * other half of the same finding: a census that counts the rows reaching a
 * mechanism *through a named helper* also fails to count the rows that reach it
 * inline. Eight of the census's eleven are red, and the measurement found ten,
 * so two of the ten were never named - one row of `206a` and one of `211a`, by
 * its own per-file counts (`206a` 2 named, 1 of them red; `211a` 1 named, green).
 *
 * `aria-modal="true"` is worth saying precisely: it tells a screen reader to
 * read nothing outside this box, so for somebody who is listening the way in is
 * already closed. For a sighted keyboard user the tab order is untouched. The
 * two halves above are therefore not *announcement* and *containment* for every
 * person - they are *containment for one kind of reader* and *containment for
 * the other*, and the second is the deferred one.
 *
 * ## Why this screen, and why the box is found by its class
 *
 * All 20 call sites render this one component, so one screen proves it and the
 * census picks which (#171, #68): ภาควิชา, because `202a`, `206a`, `207a` and
 * `208a` already build their situations here. The other 19 sites inherit the
 * component's behaviour and inherit nothing from these rows.
 *
 * The box is located by `panel()` - `.max-w-sm` - and not by
 * `getByRole('dialog')`, deliberately. A locator built on the attribute is the
 * premise of every row that shares it, and an attribute used in the locator
 * stops being provable by mutation (#85, #111). The role, the modality, the
 * name and the description are the claims here, so the element is found some
 * other way and they are read off it.
 *
 * ## What this file writes
 *
 * Nothing. Four of the six rows only open the question and read it; row 5
 * presses Escape, which is the cancel; row 6 opens the question about the other
 * seeded department and leaves it open. No confirmation is ever pressed, so no
 * `DELETE` is ever sent, and there is nothing to put back.
 */

const DEPARTMENT = DEPARTMENTS[0].id;
const OTHER = DEPARTMENTS[1];

/** The `h2` the box draws its title into - the title is not glued (#118). */
const titleOf = page => panel(page).getByRole('heading');

/** One row's own ลบ, which is both a way to open the question and a control under it. */
const removeOn = (page, departmentId) =>
  departments.departmentRow(page, departmentId).getByRole('button', { name: 'ลบ' });

/**
 * Opens the question on one row.
 *
 * Nothing is held at the route and nothing is pressed inside the box, so the
 * screen is in the state a person is in while they are reading the question.
 */
async function askAbout(page, departmentId) {
  await removeOn(page, departmentId).click();
  await expect(panel(page), 'the question, open and read by the rows below').toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await signIn(page, ACCOUNTS.facultyAdmin);
  await departments.openDepartments(page);
  await askAbout(page, DEPARTMENT);
});

test('the question is a dialog, and says it is modal', async ({ page }) => {
  await expect(panel(page), 'the box a person reads the question in').toHaveRole('dialog');
  await expect(
    panel(page),
    'and tells a screen reader to read nothing outside it',
  ).toHaveAttribute('aria-modal', 'true');
});

test('the question is named by the title drawn in it', async ({ page }) => {
  const drawn = await titleOf(page).textContent();
  expect(drawn, 'the title is on the screen, which is what the name is read against').toBeTruthy();
  // The expected value is read off the screen rather than written down: the
  // claim is that what a screen reader is told the box *is* is the heading the
  // person can see, and a constant here would be a claim about this one call
  // site's wording instead (#96 - the name of the assertion is the claim).
  await expect(panel(page)).toHaveAccessibleName(drawn);
});

test('the question is described by the sentence drawn in it', async ({ page }) => {
  // `textContent` and not `saidBy`, because the joiners #118 glues the message
  // with are in the DOM and therefore in the description too: both sides of
  // this comparison carry them, and stripping one side would make the row a
  // claim about U+2060 rather than about the description.
  const drawn = await messageOf(page).textContent();
  expect(drawn, 'the sentence is on the screen').toContain(DEPARTMENT);
  await expect(panel(page)).toHaveAccessibleDescription(drawn);
});

test('focus is inside the question when it opens', async ({ page }) => {
  // The box itself and not its ยกเลิก: focus on the container is what makes a
  // screen reader read the name and the description above, where focus on a
  // button reads only the word on the button.
  await expect(panel(page), 'the box has taken the focus the ลบ was holding').toBeFocused();
});

test('Escape closes the question, and answers nothing', async ({ page }) => {
  const writes = [];
  page.on('request', request => {
    if (request.method() === 'DELETE') writes.push(request.url());
  });

  await page.keyboard.press('Escape');

  // A retrying negative against an element that removes itself cannot fail
  // (#50) - unless the code under test is the only thing that removes it
  // (#214), which is the case here: nothing else in this row closes the
  // question, and the mutant that takes the Escape handler out leaves the box
  // in the document for ever.
  await expect(panel(page), 'the question is gone').toHaveCount(0);
  await expect(
    departments.departmentRow(page, DEPARTMENT),
    'and the department it was about is still there',
  ).toHaveCount(1);
  expect(writes, 'Escape is the cancel, not the answer').toEqual([]);
});

test('the list underneath can still take the focus out of the question', async ({ page }) => {
  // The net for the half that was **not** built, which is the only thing that
  // turns *we deferred the trap* into a claim the suite holds (#48). Its mutant
  // is the deferred proposal made to run: a trap that puts focus back, which
  // fails this row - and the 10 rows of `202a` `206a` `207a` `208a` `211a` that
  // come in the same way, which is the price written on this file's docblock
  // and on the sheet.
  //
  // Measured 18 ตุลาคม 2569. The condition that would re-date it is the
  // containment ticket landing; until then this is what the screen does.
  const asked = await saidBy(page);
  const other = removeOn(page, OTHER.id);

  await other.focus();
  await expect(other, 'a control the cover is over has the focus').toBeFocused();

  await other.press('Enter');
  await expect
    .poll(() => saidBy(page), {
      message: 'the control under the cover answered the keyboard',
    })
    .toContain(OTHER.th);
  expect(asked, 'and it was a different question before the press').not.toContain(OTHER.th);
});
