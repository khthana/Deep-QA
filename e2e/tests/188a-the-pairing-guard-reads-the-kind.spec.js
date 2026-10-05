'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { BACKEND_URL } = require('../support/env');
const { breadcrumb } = require('../support/shell');
const { myClos } = require('../support/behaviors-screen');
const { openCriteria, path: criteriaPath } = require('../support/achievements-screen');
const { activitiesPath, evidenceLink } = require('../support/evidence-screen');

/**
 * #188 -- the crumb never paints one kind's name at the other kind's address.
 *
 * #116 taught the shell to keep a label *with the thing it was asked for* and
 * draw it only where the two agree; #185 took the same guard one segment down,
 * where three kinds share a position and the key is therefore `kind:id` rather
 * than the id alone. `185a` says in its own docstring that the pairing had no
 * row, and `docs/acceptance/10` said so with a date. This is that row.
 *
 * ## What the ticket said and what measuring it found
 *
 * #188 says the situation is already built -- *`185a` row 1 walks that sibling
 * move* -- and that only the **reading** is impossible. Half of that is wrong,
 * and it is the half that matters. `185a` row 1 moves with `page.goto`, which
 * is a document load: the shell comes down, `deepLabel` starts at `null`, and
 * there is no stale answer for a pairing guard to refuse. That move cannot
 * exhibit the defect however it is read.
 *
 * What builds it is #141's sentence, written for the opposite case: *the
 * browser's own history list travels any number of entries in one move*. Three
 * addresses visited inside one document -- this CLO's criteria, the Activities
 * list, one Activity's evidence -- put a cross-kind sibling move one
 * `history.go(-2)` away, with no document commit in it and no race either
 * (#179). The row asserts that distance rather than assuming it, because a
 * single step back would land on the list, which unmounts nothing but does null
 * the label on the way through.
 *
 * ## The frame the guard is about
 *
 * The move renders once with the new address and the previous answer still in
 * state. Both of the shell's effects then run in that one commit: the deeper
 * effect nulls the label, and the crumb effect -- reading the `deepLabel` of the
 * render it was scheduled from, which is the Activity's -- rebuilds the trail
 * for the CLO's address. React batches the two, so what is *painted* is the new
 * address's trail carrying the old answer, for one frame. Paired by `kind:id`
 * the comparison misses and the crumb falls back to the number; keyed by the id
 * alone it matches, and the Activity's name is drawn above the CLO's screen.
 *
 * ## Why it is sampled per frame
 *
 * The fallback in that frame is the number, which is also what the crumb says
 * before any answer has arrived -- so `expect(crumb).not.toHaveText(name)` is a
 * read that cannot fail (#50) and a poll for the number would pass on the
 * defect. The question is #164's: *was it ever on the screen*, which is answered
 * by a sample per frame and not by a longer wait. Throttling the renderer cannot
 * widen this either; it serialises the read behind the pending work (#170).
 *
 * ## What that sampling measured, and why this row is a net
 *
 * The frame is in the DOM and not in any paint, so **nothing at this seam can
 * put the guard at risk** -- #47's sixth way to read a sweep, measured here
 * rather than argued.
 *
 * `keybyidalone` was the mutant: the rejected proposal made to run (#48), the
 * label stored by the id alone and compared by the id alone, two edits because
 * half of it would miss at every address and kill all six of `185a`'s rows
 * instead of one (#97). It **survives** this row. What it does to the screen was
 * then read off the `MutationObserver`'s own records -- which, unlike a callback
 * reading the live DOM, carry every write in order -- and it does exactly what
 * the paragraph above says. Clean, the three crumbs that change are written in
 * document order inside one commit: *courseOutcomes*, then the number over the
 * Activity's name, then this screen's word. Mutated, the middle one is written
 * **last**, after the two around it: that out-of-order pair is the stale commit,
 * and between the two writes the trail held the Activity's name with the CLO's
 * address on either side of it.
 *
 * Both commits land inside one task -- one `MutationObserver` callback holds all
 * of them -- and the six frames sampled across the jump fall outside it. So the
 * paint never holds it, and the paint is the only unit worth reading: inside a
 * commit the DOM is mid-write, and the clean code passes through wrong
 * combinations of crumb and address too. A row that read reconstructed DOM
 * states would be asserting against those.
 *
 * This row therefore **holds no proof** of the `kind:` half of the key. It is a
 * net: it says that today no paint carries the defect, and it goes red on the
 * day a paint falls inside that window -- a framework change that yields between
 * the two commits would do it, and so would any change that makes the correcting
 * render wait for anything. It was measured on React 19.2.8, which
 * `frontend/package.json` pins as `^19.1.0`: the next install can raise that of
 * its own accord, so the thing to re-measure on is the installed number moving
 * at all and not a major one. `docs/acceptance/10-application-shell.md` records the
 * claim as untested with that date and that reason, and not as covered.
 *
 * ## What the sampler cannot see
 *
 * It reads the trail's `<a>` elements once per `requestAnimationFrame`, so what
 * it holds is the DOM each frame was drawn from, and nothing more:
 *
 * * **Appearance.** `textContent` says what the words are, not that a person
 *   could read them -- a crumb mid-transition, clipped by its container or drawn
 *   in the colour of its background reads the same. That stays a hand-walked row
 *   on `docs/acceptance/10`.
 * * **Frames outside the window.** The loop starts after the Activity's name is
 *   on the crumb and stops when the CLO's number is, so a stale paint before the
 *   first tick or after the last is invisible. `arrived < total` is what says the
 *   window opened before the move rather than during it.
 *   `requestAnimationFrame` does not run in a hidden tab; this suite's pages are
 *   foreground, and a sampler that recorded nothing fails `total > 2`.
 * * **A crumb that draws more than the name.** The count matches a crumb's whole
 *   text against the Activity's name, so a stale paint that drew that name
 *   *inside* a longer crumb -- a prefix, a truncation -- reads as no frame at
 *   all. It is the comparison the clean screen's own crumbs make exact today:
 *   each one holds one label and nothing else.
 * * **One jump.** The distance measured is this one -- two entries, both pushed
 *   in-app. A longer jump, or one crossing a document commit, is a different
 *   mechanism and not this row's claim.
 * * **The other guard.** `sectionLabel`'s pairing is the shell's other point of
 *   this kind (the census is on `docs/acceptance/10`) and no frame here is about
 *   it: two Sections of one account are not reachable from one another without
 *   the shell coming down, which is what `Mainpage.js` says at that site.
 */

/**
 * The Section this row walks: id 3, which is Section *1* of 2568/1, taught by
 * `teacher.one@` -- `116a`'s fixture. Named for what it is, a `sectionId` in the
 * address (ADR-0004), and not for the year it happens to belong to.
 */
const SECTION_ID = 3;

/** Every crumb the trail draws, in order, as a person reads them. */
const crumbsOn = async page =>
  (await breadcrumb(page).getByRole('link').allTextContents()).map(text => text.trim());

/**
 * A CLO and an Activity of this Section that carry the same id.
 *
 * Read off the server rather than taken from the seed (#129): `subject_clo` and
 * `activities` are separate sequences, so an overlap is a property of today's
 * rows and the row asserts it where it is used. Nothing here depends on *which*
 * pair it is.
 */
async function sharingAnId(page) {
  const clos = await myClos(page, SECTION_ID);
  const answer = await page.request.get(
    `${BACKEND_URL}/api/teaching/sections/${SECTION_ID}/activities`,
  );
  expect(answer.status()).toBe(200);
  const { activities } = await answer.json();

  const byId = new Map(activities.map(one => [String(one.id), one]));
  const clo = clos.find(one => byId.has(String(one.clo_id)));
  return { clo, activity: clo ? byId.get(String(clo.clo_id)) : null };
}

/**
 * Which entry of this document's history list is current.
 *
 * The router keeps it there itself: every push and replace it makes carries
 * `{ usr, key, idx }`. Asked for rather than counted, because the screens in
 * between may `replaceState` for their own state and a count of pushes would
 * then be a guess about that.
 */
const historyIndex = page => page.evaluate(() => window.history.state?.idx);

/** Starts recording the breadcrumb, once per frame -- what it holds and for which address. */
async function sampleEveryFrame(page) {
  await page.evaluate(() => {
    window.__crumbFrames = [];
    const tick = () => {
      const trail = document.querySelector('nav[aria-label="Breadcrumb"]');
      const crumbs = trail ? [...trail.querySelectorAll('a')] : [];
      window.__crumbFrames.push({
        texts: crumbs.map(one => one.textContent.trim()),
        at: crumbs.length ? crumbs[crumbs.length - 1].getAttribute('href') : null,
      });
      window.__crumbFrame = requestAnimationFrame(tick);
    };
    tick();
  });
}

/**
 * Stops the recording and answers what the frames held.
 *
 * A frame is counted as the CLO's once the trail it draws *belongs* to that
 * address, which is the last crumb's `href` and not the window's location: the
 * address changes a render before the trail is rebuilt, so the first paint after
 * the move still carries the Activity's whole trail -- the right answer for the
 * address it was built for, and a frame this row is not about.
 */
async function framesOf(page, { at, name, idInAddress }) {
  return page.evaluate(
    asked => {
      cancelAnimationFrame(window.__crumbFrame);
      const all = window.__crumbFrames;
      const arrived = all.filter(frame => frame.at === asked.at);
      return {
        total: all.length,
        arrived: arrived.length,
        holding: arrived.filter(frame => frame.texts.includes(asked.name)).length,
        bare: arrived.filter(frame => frame.texts.includes(asked.idInAddress)).length,
      };
    },
    { at, name, idInAddress },
  );
}

test('row 1: a jump back to the CLO that shares an Activity id never paints the Activity name', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);

  const { clo, activity } = await sharingAnId(page);

  // The preconditions this row is built on, asserted where they are used. The
  // ids must coincide, or a key of `id` alone would miss as well and the mutant
  // for it would survive at every value the fixture could take (#154); and the
  // Activity's name must differ from *both* of the things a correct frame can
  // draw in that crumb -- the CLO's number, which is the answer, and the id,
  // which is what #116's fallback draws before the answer arrives -- or
  // `holding` and `bare` would be counting the same frames.
  expect(clo, 'a CLO and an Activity of this Section sharing an id').toBeTruthy();
  expect(String(clo.clo_id)).toBe(String(activity.id));
  expect(activity.activity_name).toBeTruthy();
  expect(activity.activity_name).not.toBe(clo.clo_number);
  expect(activity.activity_name).not.toBe(String(clo.clo_id));

  const criteria = criteriaPath(SECTION_ID, clo.clo_id);
  const opened = await openCriteria(page, SECTION_ID, clo.clo_id);
  expect(opened.status()).toBe(200);
  await expect.poll(() => crumbsOn(page)).toContain(clo.clo_number);
  const from = await historyIndex(page);

  // Two in-app pushes, so that all three addresses live in this one document
  // and the jump below commits nothing. Both links are located by the address
  // they lead to rather than by their words: the address is what the move is
  // about, and what the side menu *says* is its own claim, proved on
  // `docs/acceptance/30`.
  const toActivities = page.locator(`a[href="${activitiesPath(SECTION_ID)}"]`);
  await expect(toActivities, 'the side menu entry for the Activities list').toHaveCount(1);
  await toActivities.click();
  await evidenceLink(page, activity.activity_name).click();
  await expect.poll(() => crumbsOn(page)).toContain(activity.activity_name);
  const to = await historyIndex(page);

  // The distance, measured rather than assumed: more than one entry, which is
  // what makes the move a sibling one. A single step back lands on the list,
  // whose address carries no deeper id and nulls the label on the way through.
  expect(to - from, 'entries travelled in the one move').toBeGreaterThan(1);

  await sampleEveryFrame(page);
  await page.evaluate(delta => window.history.go(delta), from - to);

  await expect.poll(() => crumbsOn(page)).toContain(clo.clo_number);
  expect(new URL(page.url()).pathname, 'the address the jump landed on').toBe(criteria);

  const frames = await framesOf(page, {
    at: criteria,
    name: activity.activity_name,
    idInAddress: String(clo.clo_id),
  });

  // Four preconditions before the claim, because a sampler that recorded
  // nothing would pass it: frames were taken, some of them drew the CLO
  // address's trail, some came before it -- which says the window opened before
  // the move -- and at least one of the CLO's frames was drawn before its answer
  // arrived. That last one is the frame the guard is about, and without it
  // `holding` would be a claim about frames the question cannot live in.
  expect(frames.total, 'frames sampled across the jump').toBeGreaterThan(2);
  expect(frames.arrived, "frames drawing the CLO address's trail").toBeGreaterThan(0);
  expect(frames.arrived, 'frames taken before the jump landed').toBeLessThan(frames.total);
  expect(frames.bare, "frames drawing the CLO's trail before its name arrived").toBeGreaterThan(0);

  // The claim, which is a net rather than a proof: with the key by the id alone
  // this still passes, because the stale commit and the one that corrects it are
  // in one task and no paint falls between them. The docstring has the numbers.
  expect(frames.holding, "frames painting the Activity's name at the CLO's address").toBe(0);
});
