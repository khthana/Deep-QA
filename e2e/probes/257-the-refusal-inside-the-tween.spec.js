'use strict';

/*
 * #257 - does the refusal that lands inside the exit tween of
 * `ProfilePhotoDialog` reach a **paint**, and how long is that window really?
 *
 * A probe and not a row. #257 asks for a **measurement**, and what the
 * measurement feeds is a question that is `docs/06` §Out of Scope and the
 * owner's: the answer of 31 ตุลาคม 2569 on #253 was *ข้อ ก - nothing is said*,
 * and it was given on a reading that could not see this frame. Nothing here may
 * become a claim of any sheet until that answer has been re-asked against these
 * numbers (#228).
 *
 * It is kept rather than deleted because it reads what no row of this ticket
 * reads: the **length** of the window and the **opacity** the sentence was
 * drawn at, which are the numbers that priced the owner's question, and the
 * fifth arm's answer that a reopen inside the tween is unreachable, which is
 * what the fix's boolean rests on. The claim itself did become a row -
 * `e2e/tests/257a-the-refusal-inside-the-tween.spec.js` - because this question
 * is about a tab that **is** getting frames, so unlike #169's the seam can hold
 * it (#141, #169). The defect it dated is reproducible from
 * `mutation/257-the-refusal-inside-the-tween.py saysitwhileitfades` rather than
 * from an argument about what the code used to do (#115, #203).
 *
 * ## How to run it
 *
 *     cp e2e/probes/257-the-refusal-inside-the-tween.spec.js \
 *        e2e/tests/000-probe-257.spec.js
 *     cd e2e && npx playwright test tests/000-probe-257.spec.js --workers=1
 *     rm e2e/tests/000-probe-257.spec.js
 *
 * The runner only sees it inside `tests/`, which is the convention
 * `probes/219-first.spec.js`, `probes/221-the-two-windows.spec.js` and
 * `probes/241-the-removal-sentence-and-the-filter.spec.js` carry. No port is
 * written above: `e2e/README.md` §Ports is the one statement of that rule
 * (#237).
 *
 * ## Why Playwright can ask this, where #169's probe could not
 *
 * #169 needed a Chrome of its own over raw CDP because the condition it was
 * about is a tab **getting no frames**, and a backgrounded Playwright page
 * still reports `visibilityState: "visible"` and counts 60 frames a second.
 * This question is the opposite one: the person is looking at the screen, the
 * tab has frames, and the tween is running. That is the only state Playwright
 * can give, so here it is the right driver and not the thing suppressing the
 * condition.
 *
 * ## The mechanism the arms are built from
 *
 * `ProfilePhotoDialog.close` runs `setFile(null)`, `setError('')`,
 * `setBusy(false)`, clears the input and calls `onClose()`. `Navbar.js` then
 * draws `{showPhotoDialog ? <ProfilePhotoDialog .../> : null}` inside
 * `RetiringPresence`, which is `AnimatePresence`: the child it has been handed
 * `null` for is kept mounted until its exit tween ends. The component is
 * therefore **still mounted** while it fades, so the `catch` of `submit` -
 * which runs after an `await` that was already out when the person pressed
 * ยกเลิก - reaches `setError(err.message)` on a live instance, and a `setState`
 * on a mounted component re-renders it whatever element the parent is handing
 * down.
 *
 * That is the reading the answer of 31 ตุลาคม 2569 did not have in front of it,
 * and it is a claim like any other, so it is measured rather than argued
 * (#66, #188): #188's rule - a mistake the framework corrects inside one task
 * never reaches a paint - does **not** apply here, because this `setError` is
 * not in the same task as the removal. It arrives a round trip later.
 *
 * ## The arms
 *
 * Every arm holds the upload at the route (`e2e/support/gate.js`), presses
 * บันทึกรูปโปรไฟล์, presses ยกเลิก, and differs only in **when** the refusal is
 * handed over, measured from the press:
 *
 * | แขน | ปล่อยคำตอบเมื่อ | ถามอะไร |
 * |---|---|---|
 * | `หน้าต่าง` | หลังอ่านตัววัดแล้ว | ช่วงเวลาจริงที่กล่องยังอยู่ในเอกสารหลัง `onClose` |
 * | `ทันที` | 0 ms | คำปฏิเสธที่ลงต้นหน้าต่างถึง paint ไหม |
 * | `กลางหน้าต่าง` | 90 ms | เท่ากัน ครึ่งทางของ tween |
 * | `ควบคุม` | 400 ms (`GONE_MS` ของ `253a`) | แถวของ #253 อ่านที่ไหน - ต้องได้ 0 เฟรม |
 * | `เปิดซ้ำ` | หลังเปิดกล่องใหม่แล้ว | เปิดกล่องซ้ำ**ในหน้าต่าง**ได้ไหม - ธงของ #257 ต้องเป็นคีย์หรือไม่ |
 *
 * The fifth arm is the one the fix's own shape rests on, and it was added after
 * the owner's answer rather than before it: #257's guard is a **boolean**, which
 * is right only while one instance of this component belongs to exactly one
 * opening. What would break that is this box being reopened inside the tween,
 * so that the instance in front of the person is one whose flag is already up -
 * #254's defect inverted, and the one shape that would need the key #254 wrote
 * for the box next door (#185). It is measured rather than reasoned about,
 * because *unreachable* is a claim like any other (#141): the arm presses
 * ยกเลิก and reopens the box as fast as the driver can, which is faster than
 * the two presses through the avatar menu a person has to make, and then reads
 * whether the live instance is a fresh one.
 *
 * The control arm is what says the other three measured something: a sampler
 * that reads nothing on every arm is a sampler that never ran, and a sampler
 * that reads the sentence on every arm is reading a page that never took it
 * away (#164, #171).
 *
 * ## What it answered — 1 พฤศจิกายน 2569
 *
 * Run on **both sides** of the fix, which is what a probe that dates a defect
 * owes (#207). Two runs before it:
 *
 * | ปล่อยคำตอบเมื่อ | กล่องอยู่ในเอกสารถึง | ประโยคอยู่กี่เฟรม | เฟรมแรก / opacity | element timing |
 * |---|---|---|---|---|
 * | ไม่ปล่อย | 201 / 205 ms | 0 | — | — |
 * | 0 ms | 199 / 211 ms | 9 / 9 | 37 ms ที่ 0.966 · 40 ms ที่ 0.930 | มี `renderTime` |
 * | 90 ms | 208 / 199 ms | 5 / 4 | 127 ms ที่ 0.092 · 128 ms ที่ 0.059 | มี `renderTime` |
 * | 400 ms | 195 / 227 ms | **0** | — | — |
 *
 * So the window on **this** box is 195 to 227ms, which is #169's 190 holding
 * where it was measured on the other one, and the refusal landing at the top of
 * it was drawn at all but full opacity and faded out with the box: 9 frames,
 * about 160ms, with 60 to 62 frames running after the last sighting and the
 * browser's own `renderTime` for the element. The per-frame opacities of one
 * run were 0.966, 0.703, 0.510, 0.317, 0.163, 0.019, 0.003, 0.0001 - the fade
 * itself, not a ghost.
 *
 * With the guard in, every arm reads **0 frames** and the window is unchanged
 * at 196 to 215ms, which is what says the fix took the sentence away and not
 * the window.
 *
 * The fifth arm answered that a reopen inside the tween is **unreachable**:
 * `marks` came back `[1, 2]` - a new heading node, so a fresh mount - at
 * **676ms** from the press, the driver's own two clicks landing at 226 and
 * 664ms. A person's hand through the avatar menu is slower than that, and the
 * window is 215. That is the measurement #257's boolean rests on; the day one
 * press can reopen this box, it is #254's defect inverted and the flag has to
 * say which opening it is about (#54, #185).
 *
 * ## What the sampler reads, and what it cannot
 *
 * Per frame, in one `requestAnimationFrame` loop installed **before** the press
 * (so nothing is in front of the read it is about - #170): whether the box's
 * heading is in the document, its effective opacity, how many `h3` the document
 * holds, whether a `[role="alert"]` carrying the sentence is in the document,
 * that element's effective opacity and its drawn area, and whether
 * `document.body.innerText` holds the sentence. `innerText` rather than a
 * locator, for `frame-sampler.js`' reason: a locator read is executed by the
 * renderer and queues behind the drawing it is trying to catch (#170).
 *
 * The press is timed **inside the page**, by a capture-phase `click` listener
 * armed with the sampler, rather than by a `performance.now()` written from
 * Node just before the click: that would put a round trip in front of the press
 * and date the window from the wrong moment.
 *
 * `role="alert"` and `h3` are read out of `ProfilePhotoDialog.js`, and the
 * sentence out of this file's own constant rather than from memory of the
 * screen (#152, #118) - it is this file that hands the refusal over, so the
 * sentence is not the server's to change.
 *
 * Four things it cannot say:
 *
 * 1. A frame sampled in `requestAnimationFrame` is read **before** that frame's
 *    paint, so what it reports is what the renderer was about to draw. What
 *    makes it a paint is a later frame having run: the report therefore counts
 *    the frames after the last sighting, and an arm whose sighting is on its
 *    final frame says so rather than claiming a paint. `PerformanceObserver`
 *    with `type: 'element'` is asked as well - the sampler puts `elementtiming`
 *    on the alert the moment it appears, through a `MutationObserver` - and
 *    that is the browser's own answer rather than an inference. It is a
 *    **second** instrument and not the first, because `elementtiming` on an
 *    element whose first paint has already happened reports nothing, which
 *    reads exactly like a sentence that never painted.
 * 2. It reads the box by its heading, so like #169's it cannot tell a node that
 *    was removed from one that was replaced (#227). The `h3` count beside it is
 *    what that blindness is answered with.
 * 3. Effective opacity is the product of the computed `opacity` of the element
 *    and its ancestors. It is not a statement that the pixels differ from the
 *    background, and it cannot see a transform, a clip or a `visibility`
 *    somewhere up the tree. For this box, which fades on `opacity` alone
 *    (`exit={{ opacity: 0 }}`), that is the property the question is about.
 * 4. It is one machine's timing, under one load, on a run where the answer is
 *    fulfilled at the route rather than fetched. The window it measures is this
 *    tween's duration, which is `ContentMotionDIV`'s 0.18 second tween plus
 *    whatever React and the scheduler add - not a constant of the product.
 */

const { test, expect } = require('@playwright/test');

const { ACCOUNTS } = require('../support/accounts');
const { signIn } = require('../support/auth');
const { gate, isWrite } = require('../support/gate');
const { avatarButton, openProfilePhoto, photoInput } = require('../support/shell');

/** Worded so no screen of the product could say it by itself (#93). */
const REFUSED = 'ไม่อนุญาตให้บันทึกรูปนี้ (ตัววัดของ #257)';

/** The heading `ProfilePhotoDialog.js` draws, which is how the box is found. */
const HEADING = 'รูปโปรไฟล์';

/** PNG's magic number; these bytes are the whole of what the server reads. */
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 7),
]);

const PHOTO_ROUTE = /^\/api\/me\/photo$/;

/** `253a`'s own settle point, which the control arm is built at. */
const GONE_MS = 400;

/** How long each arm samples after the press. */
const WATCH_MS = 1200;

const button = (page, name) => page.getByRole('button', { name, exact: true });

/**
 * Opens the box, chooses a photo, presses บันทึกรูปโปรไฟล์ and leaves the
 * upload held at the route — `253a`'s `chooseAndHold`, which is an instrument
 * and carries no claim of its own (#171).
 */
async function chooseAndHold(page) {
  await openProfilePhoto(page);
  await photoInput(page).setInputFiles({
    name: 'หน้าของฉัน-257.png',
    mimeType: 'image/png',
    buffer: PNG_BYTES,
  });
  const upload = await gate(page, PHOTO_ROUTE, isWrite, { refusal: REFUSED });
  await button(page, 'บันทึกรูปโปรไฟล์').click();
  await upload.sent;
  return upload;
}

/** Installs the per-frame sampler. Nothing is pressed after this but ยกเลิก. */
async function sampleEveryFrame(page, said, heading) {
  await page.evaluate(
    ([sentence, headingText]) => {
      const state = {
        frames: 0,
        pressAt: null,
        clicks: [],
        marksSeen: [],
        rows: [],
        elementTiming: [],
        observerError: null,
      };
      window.__p257 = state;

      document.addEventListener(
        'click',
        () => {
          if (state.pressAt == null) state.pressAt = performance.now();
          state.clicks.push(performance.now());
        },
        true,
      );

      const headingNode = () =>
        Array.from(document.querySelectorAll('h3')).find(
          node => node.textContent === headingText,
        ) ?? null;

      const alertNode = () =>
        Array.from(document.querySelectorAll('[role="alert"]')).find(node =>
          node.textContent.includes(sentence),
        ) ?? null;

      const effectiveOpacity = node => {
        let product = 1;
        for (let at = node; at instanceof Element; at = at.parentElement) {
          const value = parseFloat(getComputedStyle(at).opacity);
          if (!Number.isNaN(value)) product *= value;
        }
        return Number(product.toFixed(4));
      };

      // The browser's own answer, asked as a second instrument: `elementtiming`
      // is put on the alert the moment it enters the document, which is a
      // `MutationObserver` callback and so before that frame's paint.
      try {
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (entry.identifier !== 'p257-alert') continue;
            state.elementTiming.push({
              renderTime: entry.renderTime,
              loadTime: entry.loadTime,
              startTime: entry.startTime,
            });
          }
        }).observe({ type: 'element', buffered: true });
        new MutationObserver(() => {
          const alert = alertNode();
          if (alert && !alert.hasAttribute('elementtiming')) {
            alert.setAttribute('elementtiming', 'p257-alert');
          }
        }).observe(document.body, { childList: true, subtree: true });
      } catch (error) {
        state.observerError = String(error);
      }

      // Which heading node this is, for the fifth arm. A node that framer-motion
      // reused keeps the mark it was given before the press; a fresh mount
      // arrives without one and is given the next number. This is #227's blind
      // mark used on purpose, as the one reading that can tell a node that was
      // replaced from one that was kept.
      let marks = 0;
      const markOf = node => {
        if (node == null) return null;
        if (!node.hasAttribute('data-p257')) {
          marks += 1;
          node.setAttribute('data-p257', String(marks));
        }
        return Number(node.getAttribute('data-p257'));
      };

      const tick = () => {
        state.frames += 1;
        const box = headingNode();
        state.marksSeen.push(markOf(box));
        const alert = alertNode();
        const rect = alert ? alert.getBoundingClientRect() : null;
        state.rows.push({
          t: performance.now(),
          box: box != null,
          boxOpacity: box ? effectiveOpacity(box) : null,
          headings: document.querySelectorAll('h3').length,
          said: alert != null,
          saidOpacity: alert ? effectiveOpacity(alert) : null,
          saidArea: rect ? Math.round(rect.width * rect.height) : 0,
          inText: document.body.innerText.includes(sentence),
        });
        window.__p257tick = requestAnimationFrame(tick);
      };
      window.__p257tick = requestAnimationFrame(tick);
    },
    [said, heading],
  );

  return {
    read: () =>
      page.evaluate(() => {
        cancelAnimationFrame(window.__p257tick);
        return window.__p257;
      }),
  };
}

/** Turns the frames into the four numbers the ticket asks for. */
function summarise(seen) {
  const press = seen.pressAt;
  const since = row => (press == null ? null : Math.round(row.t - press));
  const after = seen.rows.filter(row => press != null && row.t >= press);

  const boxFrames = after.filter(row => row.box);
  const saidFrames = after.filter(row => row.said);
  const drawn = saidFrames.filter(row => row.saidOpacity > 0 && row.saidArea > 0);
  const last = saidFrames[saidFrames.length - 1];

  return {
    frames: seen.frames,
    framesAfterThePress: after.length,
    pressSeen: press != null,

    boxInTheDocument: boxFrames.length,
    boxGoneAt: boxFrames.length ? since(boxFrames[boxFrames.length - 1]) : null,
    boxOpacityCameDown: boxFrames.some(row => row.boxOpacity < 1),
    boxLastOpacity: boxFrames.length
      ? boxFrames[boxFrames.length - 1].boxOpacity
      : null,
    headingsWhileItWent: Array.from(new Set(after.map(row => row.headings))).sort(),

    saidOnFrames: saidFrames.length,
    saidAndDrawn: drawn.length,
    saidFirstAt: saidFrames.length ? since(saidFrames[0]) : null,
    saidLastAt: last ? since(last) : null,
    framesAfterTheLastSighting: last
      ? after.length - after.indexOf(last) - 1
      : null,
    saidOpacities: Array.from(new Set(drawn.map(row => row.saidOpacity))).sort(
      (a, b) => a - b,
    ),
    inTextOnFrames: after.filter(row => row.inText).length,

    // The fifth arm's reading. `marks` is every heading node the sampler saw,
    // in the order it first saw them: `[1]` is one node throughout, `[1, 2]` a
    // node replaced by another — a fresh mount, which is what makes #257's
    // boolean enough. `reopenedAt` is when the second node first appeared,
    // measured from the press, and `pressToPressMs` is what the driver's two
    // presses cost, which is the floor under what a person's hand could do.
    marks: Array.from(new Set(seen.marksSeen.filter(mark => mark != null))),
    reopenedAt: (() => {
      const row = after.find(
        (candidate, index) =>
          seen.marksSeen[seen.rows.indexOf(candidate)] > 1 && index >= 0,
      );
      return row ? since(row) : null;
    })(),
    clicksSincePress:
      press == null
        ? []
        : seen.clicks.filter(at => at >= press).map(at => Math.round(at - press)),

    elementTiming: seen.elementTiming,
    observerError: seen.observerError,
  };
}

/**
 * One arm: hold the upload, press ยกเลิก, hand the refusal over `openAfterMs`
 * later (or after the reading, given `null`), and sample every frame.
 */
async function arm(page, name, openAfterMs, { reopen = false } = {}) {
  await signIn(page, ACCOUNTS.teacherOne);
  const upload = await chooseAndHold(page);

  const watch = await sampleEveryFrame(page, REFUSED, HEADING);
  await button(page, 'ยกเลิก').click();

  if (reopen) {
    // As fast as the driver can, and by the two presses the menu really takes -
    // `openProfilePhoto` is not used because its own assertion waits for a
    // heading, which the box on its way out is still drawing. Nothing is
    // waited for in between, so `clicksSincePress` is the floor under what a
    // person's hand could do, not an estimate of it.
    await avatarButton(page).click();
    await page.getByRole('button', { name: 'เปลี่ยนรูปโปรไฟล์' }).click();
  }

  if (openAfterMs !== null) {
    if (openAfterMs > 0) await page.waitForTimeout(openAfterMs);
    upload.open();
    await upload.answered;
  }

  await page.waitForTimeout(WATCH_MS);
  const seen = summarise(await watch.read());

  if (openAfterMs === null) {
    // Opened only now, because a request nobody answers is left at the route
    // until the run times out (`gate.js`): this arm is about the window and not
    // about the sentence, so the answer lands outside everything it measured.
    upload.open();
    await upload.answered;
  }

  console.log(`\n#257 ${name} (ปล่อยคำตอบเมื่อ ${openAfterMs}) ${JSON.stringify(seen, null, 2)}`);

  // A probe asserts that it ran, never what it found: the finding is the
  // report, and whether it is a defect is the owner's (#228).
  expect(seen.pressSeen, 'the press the window is measured from').toBe(true);
  expect(seen.framesAfterThePress, 'frames sampled after the press').toBeGreaterThan(10);
  return seen;
}

test.describe('#257 — คำปฏิเสธที่ลงในเฟรมของ tween ขาออก', () => {
  test('หน้าต่าง: ช่วงเวลาจริงที่กล่องยังอยู่ในเอกสารหลัง onClose', async ({ page }) => {
    await arm(page, 'หน้าต่าง', null);
  });

  test('ทันที: คำปฏิเสธที่ลงต้นหน้าต่าง', async ({ page }) => {
    await arm(page, 'ทันที', 0);
  });

  test('กลางหน้าต่าง: คำปฏิเสธที่ลงราว 90 ms หลังการกด', async ({ page }) => {
    await arm(page, 'กลางหน้าต่าง', 90);
  });

  test('ควบคุม: คำปฏิเสธที่ลงหลังหน้าต่าง ที่ GONE_MS ของ 253a', async ({ page }) => {
    await arm(page, 'ควบคุม', GONE_MS);
  });

  test('เปิดซ้ำ: กล่องที่เปิดใหม่ในหน้าต่าง — โน้ดเก่าหรือโน้ดใหม่', async ({ page }) => {
    await arm(page, 'เปิดซ้ำ', 0, { reopen: true });
  });
});
