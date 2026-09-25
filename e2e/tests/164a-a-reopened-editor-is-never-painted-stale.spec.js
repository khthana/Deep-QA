'use strict';

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const improvement = require('../support/improvement-screen');

/**
 * #164 — a reopened editor is never painted holding what was thrown away.
 *
 * `150a` row 2 asks whether the box a second เขียน opens is empty, and reads it
 * once. That row went red twice in six runs, which read like a flaky row and was
 * not one: the flash it catches is there **every single time**. Sampling the box
 * every animation frame across the reopening, 8 rounds out of 8 held the
 * abandoned text for exactly one frame. What varies is only whether a one-shot
 * read is served inside that frame — six of those eight.
 *
 * So the defect is the screen's, and the criterion is #150's own: *ช่องว่าง
 * ไม่ใช่สิ่งที่พิมพ์ทิ้งไว้รอบก่อน*. A person reopening the box sees, for a
 * frame, the text they cancelled.
 *
 * ## Why this row and not a retry on `150a`
 *
 * `expect(locator).toHaveValue('')` would retry until the effect had run and go
 * green on the defect — the shape `CLAUDE.md` warns about twice, a retrying
 * assertion that cannot fail. It would have made the red go away without making
 * the flash go away. This row asks the question a retry cannot: **was it ever on
 * the screen**, by reading every frame rather than one moment.
 *
 * `150a` row 2 keeps its one-shot read on purpose. It is a weak sentinel for the
 * same defect and costs nothing; this row is the one that holds the claim.
 *
 * ## Why frames and not a stopwatch
 *
 * What is sampled is the DOM property each frame is drawn from, once per
 * `requestAnimationFrame`. A controlled input's value is a property and not an
 * attribute, so nothing observes it and it has to be read. Nothing here decides
 * anything by timing: a frame either held the text or it did not.
 *
 * The measurement that was tried first — slowing the renderer, which is what the
 * ticket proposed — made the red **rarer**, 1 in 5 unthrottled against 0 in 5 at
 * x4, x10 and x20. Throttling serialises the read behind React's pending work,
 * so it hides this race rather than widening it.
 */

const { LABELS } = improvement;

/**
 * The section this row types in and abandons — the same one `150a` row 2 uses,
 * and for its reason: it must hold nothing whichever order the files run in,
 * and `150a` writes only in `SUMMARY`.
 */
const ABANDONED_IN = 'REFLECTION';

/** Worded so no record and no other row holds it. */
const ABANDONED = 'ข้อความที่พิมพ์ทิ้งไว้แล้วกดยกเลิกของ #164';

const button = (scope, name) => scope.getByRole('button', { name, exact: true });
const region = (page, type) => improvement.formSection(page, type);
const editor = (page, type) => region(page, type).getByLabel(LABELS[type], { exact: true });
const start = (page, type) => button(region(page, type), `เขียน${LABELS[type]}`);

/**
 * Starts recording one section's textarea, once per frame — whether it is there,
 * and what it holds.
 *
 * Scoped to the section the row is about rather than to the page, because every
 * other section has a box of its own to open and the precondition below would
 * then be a claim about all four of them. The section is found the way the
 * locators above find it: `EntrySection` renders a `<section aria-label>`.
 *
 * The count is recorded rather than inferred from the text, because the fix this
 * row is about makes the box open empty: *no box* and *an empty box* read the
 * same when only values are sampled, and the precondition below then fails on a
 * screen that is behaving. That was measured, not foreseen.
 */
async function sampleEveryFrame(page, label) {
  await page.evaluate(name => {
    window.__paintedFrames = [];
    const tick = () => {
      const section = document.querySelector(`section[aria-label="${name}"]`);
      const boxes = section ? [...section.querySelectorAll('textarea')] : [];
      window.__paintedFrames.push({
        boxes: boxes.length,
        held: boxes.map(one => one.value).join('\u0000'),
      });
      window.__paintedFrame = requestAnimationFrame(tick);
    };
    tick();
  }, label);
}

/** Stops the recording and answers what the frames held. */
async function framesOf(page, phrase) {
  return page.evaluate(one => {
    cancelAnimationFrame(window.__paintedFrame);
    const all = window.__paintedFrames;
    return {
      total: all.length,
      holding: all.filter(frame => frame.held.includes(one)).length,
      opened: all.filter(frame => frame.boxes > 0).length,
    };
  }, phrase);
}

test('a box reopened on a section that holds nothing is never painted holding the abandoned text', async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.teacherOne);
  const [sectionId] = await improvement.mySectionIds(page);
  await improvement.openPlan(page, sectionId);

  // The shape the row needs, read off the screen rather than assumed of the
  // seed (#129): a section with nothing written in it.
  await expect(start(page, ABANDONED_IN), 'a section nothing is written in yet').toBeVisible();

  await start(page, ABANDONED_IN).click();
  await editor(page, ABANDONED_IN).fill(ABANDONED);
  await expect(
    editor(page, ABANDONED_IN),
    'the text this row is about, in the box before it is thrown away',
  ).toHaveValue(ABANDONED);

  await button(region(page, ABANDONED_IN), 'ยกเลิก').click();
  await expect(start(page, ABANDONED_IN), 'the section after the editor was abandoned').toBeVisible();

  await sampleEveryFrame(page, LABELS[ABANDONED_IN]);
  await start(page, ABANDONED_IN).click();
  await expect(editor(page, ABANDONED_IN)).toBeVisible();
  await expect(editor(page, ABANDONED_IN)).toHaveValue('');
  const frames = await framesOf(page, ABANDONED);

  // Three preconditions before the claim, because a sampler that recorded
  // nothing would pass it: frames were taken, some of them had the box on the
  // screen, and some of them came before it was — which is what says the
  // sampler watched the reopening rather than starting after it.
  expect(frames.total, 'frames sampled across the reopening').toBeGreaterThan(2);
  expect(frames.opened, 'frames with the box on the screen').toBeGreaterThan(0);
  expect(frames.opened, 'frames taken before the box was on the screen').toBeLessThan(frames.total);

  expect(frames.holding, 'frames painted holding the abandoned text').toBe(0);
});
