'use strict';
/*
 * #169 - an instrument, not a row. It answers *does a box that was closed
 * leave the document in a tab that is being given no frames*, and it exists
 * because **neither test seam can ask that question**.
 *
 * Playwright is what suppresses the condition, not the browser: a page that
 * another tab is in front of still reports `visibilityState: "visible"` and
 * counts 60 frames a second, and `Page.setWebLifecycleState: frozen` is undone
 * at once. Removing `--disable-renderer-backgrounding` and its neighbours from
 * the launch does not change it. So this drives a Chrome of its own over raw
 * CDP, where a background tab is a background tab: `hidden`, 0 frames.
 *
 * Measured with it on 21 October 2569, before the wrapper went in (#169 -
 * `DialogPresence` then, `RetiringPresence` since #227):
 *
 *   - both navbar boxes, closed with the tab backgrounded, were still in the
 *     document at 0.5, 1 and 3 seconds - at `opacity: 1`, `pointer-events:
 *     auto`, every control focusable, 23 (photo) and 35 (password) nodes still
 *     in the accessibility tree;
 *   - on returning to the tab the box was drawn again at full opacity and
 *     faded out over ~190ms;
 *   - the same through a **save** rather than a cancel, which is the way in
 *     that races nothing: both boxes close themselves after an awaited
 *     request;
 *   - CSS could not have been the fix: neither `transitionend` nor
 *     `animationend` fires in a frameless tab (`setTimeout` does, throttled to
 *     about 1Hz).
 *
 * And after it: gone by 0.5 seconds in all three, nothing drawn on any frame
 * after the return, and `visible` unchanged - 12 frames still drawing it, the
 * last at 192ms against 186ms at `HEAD`.
 *
 * The fourth mode, `visible-after-hidden`, is a guard on the fix rather than on
 * the defect, and it was written because the first version of that wrapper
 * failed it: a `visibilitychange` listener that was allowed to run behind an
 * **open** box put its flag up when the tab went away, and the close minutes
 * later - in front of the person, tab in focus - then dropped the node with no
 * fade at all. Measured: **0 frames** drawing it against 13 frames ending at
 * ~195ms once the listener was keyed on the box being on its way out. Anything
 * that changes when a node is retired owes this reading, because it is the one
 * that says the change is invisible to somebody who is looking at the screen.
 *
 * Running it, with this suite's two servers up and its schema seeded (the
 * cheapest way is to let one Playwright run start them, or start them by hand
 * with the environment `playwright.config.js` gives them):
 *
 *     node e2e/probes/169-presence-without-frames.js            # cancel
 *     node e2e/probes/169-presence-without-frames.js save
 *     node e2e/probes/169-presence-without-frames.js visible
 *     node e2e/probes/169-presence-without-frames.js visible-after-hidden
 *     node e2e/probes/169-presence-without-frames.js css
 *     node e2e/probes/169-presence-without-frames.js sites                 # 227
 *     node e2e/probes/169-presence-without-frames.js sites-visible
 *     node e2e/probes/169-presence-without-frames.js sites-visible-after-hidden
 *
 * The last three modes are #227's, which asked the same question of the five
 * places that still mount `AnimatePresence` themselves. They are listed in
 * `SITES` below with the reason each one does or does not have a way in that
 * races nothing, and what they measured on 25 October 2569 - before and after
 * the fix - is in `docs/acceptance/47-profile-photo.md` and
 * `docs/acceptance/50-sign-in-screens.md`. Like the three above them they are
 * instruments and not rows: no seam can build the condition.
 *
 * What it cannot say, found on 25 October 2569 while #227 was being fixed:
 * every reading here is taken of the node carrying `MARK`, so **it cannot tell
 * a node that was removed from one that was replaced**. A remount makes a new
 * node without the attribute, and the report then reads as a clean
 * disappearance with every number agreeing - `stillOpenOnReturn: 0`,
 * `framesStillDrawingIt: 0`, `opacityCameDown: false` - which is what #227's
 * first version printed while it was remounting a whole screen. Both answers
 * are bad there, so it did not decide anything; on a question where only one
 * of the two is a defect, read the code the mark cannot see, or count the
 * unmarked siblings beside the marked one (#164's blind sampler, one species
 * along).
 *
 * It signs in through the real endpoint as a seeded account, changes nothing
 * but that account's own password (to the same value) in the `save` run, and
 * writes its report and screenshots to a directory under the system temp -
 * never into the tree.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { BACKEND_URL, FRONTEND_URL } = require('../support/env');

const PORT = 9333;
// Read rather than written down, because the suite's two ports can be
// overridden per machine and `env.js` is where that is decided - a probe with
// 5100 in it is a probe that stops working on the morning Hyper-V reserves
// that port (#220, and `env.js`'s own comment).
const APP = FRONTEND_URL;
const API = BACKEND_URL;
const EMAIL = 'faculty.admin@kmitl.ac.th';
const PASSWORD = 'deep-core-local';
// Every reading below is of the node this is put on, so a remount reads as a
// removal: see *What it cannot say* above before believing a report of zeroes.
const MARK = 'data-probe169';

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'probe169-out-'));

const CHROME =
  process.env.PROBE_CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** #227's three modes, which sign in later than the rest. */
const FIVE_MODES = ['sites', 'sites-visible', 'sites-visible-after-hidden'];


// ---------------------------------------------------------------- CDP client

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolve(message.result);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`timeout: ${method}`));
        }
      }, 30000);
    });
  }
}

async function devtoolsUrl() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const answer = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const body = await answer.json();
      if (body.webSocketDebuggerUrl) return body.webSocketDebuggerUrl;
    } catch (error) {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('devtools never answered');
}

function openSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(ws));
    ws.addEventListener('error', reject);
  });
}

// ------------------------------------------------------------------ the page

async function evaluate(cdp, session, expression) {
  const result = await cdp.send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    session,
  );
  if (result.exceptionDetails) {
    throw new Error(
      'page threw: ' + JSON.stringify(result.exceptionDetails).slice(0, 400),
    );
  }
  return result.result.value;
}

async function waitFor(cdp, session, expression, what, ms = 20000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (await evaluate(cdp, session, expression)) return true;
    await sleep(100);
  }
  throw new Error('never happened: ' + what);
}

const CLICK_HELPERS = `
  window.__byText = (selector, text) =>
    [...document.querySelectorAll(selector)].find(
      el => (el.textContent || '').trim() === text,
    );
  window.__avatar = () => {
    const bar = document.querySelector('nav') || document.body;
    return [...bar.querySelectorAll('button')].find(
      el => !/\\S/.test(el.textContent || ''),
    );
  };
  true;
`;

async function signIn(cdp, session) {
  await cdp.send('Page.navigate', { url: APP }, session);
  await waitFor(cdp, session, 'document.readyState === "complete"', 'load');
  const status = await evaluate(
    cdp,
    session,
    `fetch('${API}/api/auth/login', {
       method: 'POST',
       headers: { 'content-type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify({ email: '${EMAIL}', password: '${PASSWORD}' }),
     }).then(answer => answer.status)`,
  );
  if (status !== 200) throw new Error('sign-in answered ' + status);
  await cdp.send('Page.navigate', { url: APP }, session);
  await waitFor(cdp, session, 'document.readyState === "complete"', 'reload');
  await evaluate(cdp, session, CLICK_HELPERS);
  await waitFor(cdp, session, '!!window.__avatar()', 'the avatar button');
}

// ----------------------------------------------------------- what a reader has

const SURVEY = mark => `(() => {
  const root = document.querySelector('[${mark}]');
  if (!root) return null;
  const style = getComputedStyle(root);
  const focusables = [...root.querySelectorAll(
    'a[href], button, input, select, textarea, [tabindex]')]
    .filter(el => !el.disabled && el.tabIndex > -1)
    .map(el => {
      el.focus();
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type'),
        text: (el.textContent || '').trim().slice(0, 20),
        focusTook: document.activeElement === el,
      };
    });
  return {
    opacity: style.opacity,
    visibility: style.visibility,
    display: style.display,
    pointerEvents: style.pointerEvents,
    checkVisibility: typeof root.checkVisibility === 'function'
      ? root.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      : null,
    insideAriaHidden: root.closest('[aria-hidden="true"]') !== null,
    insideInert: root.closest('[inert]') !== null,
    focusableCount: focusables.length,
    focusables,
  };
})()`;

async function axUnderTheBox(cdp, session) {
  await cdp.send('DOM.enable', {}, session);
  await cdp.send('Accessibility.enable', {}, session);
  const { root } = await cdp.send('DOM.getDocument', { depth: 1 }, session);
  const { nodeId } = await cdp.send(
    'DOM.querySelector',
    { nodeId: root.nodeId, selector: `[${MARK}]` },
    session,
  );
  if (!nodeId) return { present: false };
  const described = await cdp.send(
    'DOM.describeNode',
    { nodeId, depth: -1, pierce: true },
    session,
  );
  const ids = new Set();
  const collect = node => {
    ids.add(node.backendNodeId);
    (node.children || []).forEach(collect);
  };
  collect(described.node);
  const { nodes } = await cdp.send('Accessibility.getFullAXTree', {}, session);
  const inside = nodes.filter(node => ids.has(node.backendDOMNodeId));
  return {
    present: true,
    domNodesInTheSubtree: ids.size,
    axNodes: inside.length,
    ignored: inside.filter(node => node.ignored).length,
    exposed: inside
      .filter(node => !node.ignored)
      .map(node => ({
        role: node.role && node.role.value,
        name: node.name && String(node.name.value).slice(0, 40),
      })),
  };
}

async function pressTab(cdp, session, times) {
  let landed = 0;
  await evaluate(cdp, session, 'document.body.focus(); true');
  for (let i = 0; i < times; i += 1) {
    await cdp.send(
      'Input.dispatchKeyEvent',
      {
        type: 'rawKeyDown',
        key: 'Tab',
        code: 'Tab',
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
      },
      session,
    );
    await cdp.send(
      'Input.dispatchKeyEvent',
      { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 },
      session,
    );
    const inside = await evaluate(
      cdp,
      session,
      `!!(document.activeElement && document.activeElement.closest('[${MARK}]'))`,
    );
    if (inside) landed += 1;
  }
  return { tabPresses: times, landedInsideTheBox: landed };
}

// -------------------------------------------------------------- the two boxes

const BOXES = {
  photo: { menuItem: 'เปลี่ยนรูปโปรไฟล์', heading: 'รูปโปรไฟล์' },
  password: { menuItem: 'เปลี่ยนรหัสผ่าน', heading: 'เปลี่ยนรหัสผ่าน' },
};

async function measure(cdp, session, name, firstTargetId) {
  const box = BOXES[name];
  const report = { box: name };

  await evaluate(cdp, session, CLICK_HELPERS);
  await evaluate(cdp, session, 'window.__avatar().click(); true');
  await waitFor(
    cdp,
    session,
    `!!window.__byText('button', '${box.menuItem}')`,
    'the menu item ' + box.menuItem,
  );
  await evaluate(
    cdp,
    session,
    `window.__byText('button', '${box.menuItem}').click(); true`,
  );
  await waitFor(
    cdp,
    session,
    `!!window.__byText('h3', '${box.heading}')`,
    'the heading ' + box.heading,
  );
  await evaluate(
    cdp,
    session,
    `window.__byText('h3', '${box.heading}')
       .closest('div.fixed').setAttribute('${MARK}', ''); true`,
  );
  report.markedWhileOpen = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );

  // The condition: another tab in front of this one.
  const other = await cdp.send('Target.createTarget', { url: 'about:blank' });
  await cdp.send('Target.activateTarget', { targetId: other.targetId });
  await sleep(400);
  report.visibility = await evaluate(cdp, session, 'document.visibilityState');
  report.framesInASecondWhileBackgrounded = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       let n = 0;
       const tick = () => { n += 1; requestAnimationFrame(tick); };
       requestAnimationFrame(tick);
       setTimeout(() => resolve(n), 1000);
     })`,
  );

  // Cancel it, from the control a person presses.
  await evaluate(
    cdp,
    session,
    `window.__byText('button', 'ยกเลิก').click(); true`,
  );
  const closedAt = Date.now();
  report.presentAfterClose = {};
  for (const ms of [500, 1000, 3000]) {
    await sleep(Math.max(0, closedAt + ms - Date.now()));
    report.presentAfterClose[ms + 'ms'] = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
  }

  report.whileBackgrounded = await evaluate(cdp, session, SURVEY(MARK));
  report.axWhileBackgrounded = await axUnderTheBox(cdp, session);

  // The person comes back. A sampler installed *before* the tab is activated
  // runs its first callback on the first frame the tab gets, so what it records
  // is what is drawn: a box closed before the switch has not faded at all (no
  // frames, so the tween never started) and is at full opacity when the frames
  // resume. Per frame rather than at a settle point - #164.
  await evaluate(
    cdp,
    session,
    `(() => {
       window.__seen = [];
       const start = performance.now();
       const tick = () => {
         const el = document.querySelector('[${MARK}]');
         window.__seen.push({
           at: Math.round(performance.now() - start),
           there: !!el,
           opacity: el ? getComputedStyle(el).opacity : null,
         });
         if (performance.now() - start < 1000) requestAnimationFrame(tick);
       };
       requestAnimationFrame(tick);
       return true;
     })()`,
  );
  await cdp.send('Target.activateTarget', { targetId: firstTargetId });
  const shot = await cdp.send(
    'Page.captureScreenshot',
    { format: 'png' },
    session,
  );
  fs.writeFileSync(
    path.join(OUT, 'probe169-' + name + '-on-return.png'),
    Buffer.from(shot.data, 'base64'),
  );
  const returnedAt = Date.now();
  let gone = null;
  while (gone === null && Date.now() - returnedAt < 5000) {
    const count = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
    if (count === 0) gone = Date.now() - returnedAt;
    else await sleep(16);
  }
  report.msToVanishAfterReturn = gone;
  await sleep(1200);
  const frames = await evaluate(cdp, session, 'window.__seen');
  report.framesAfterReturn = {
    sampled: frames.length,
    drawnAtFullOpacity: frames.filter(f => f.there && f.opacity === '1').length,
    firstThree: frames.slice(0, 3),
    lastDrawn: frames.filter(f => f.there).slice(-1)[0] || null,
    msOfTheLastFrameDrawingIt:
      (frames.filter(f => f.there).slice(-1)[0] || {}).at ?? null,
  };
  report.visibilityOnReturn = await evaluate(
    cdp,
    session,
    'document.visibilityState',
  );
  report.stillThereAfterReturn = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  if (report.stillThereAfterReturn > 0) {
    report.afterReturn = await evaluate(cdp, session, SURVEY(MARK));
    report.axAfterReturn = await axUnderTheBox(cdp, session);
    report.tabOrder = await pressTab(cdp, session, 30);
  }

  // Reopen: is it the same instance, as the hand-walk found?
  await evaluate(cdp, session, CLICK_HELPERS);
  await evaluate(cdp, session, 'window.__avatar().click(); true');
  await evaluate(
    cdp,
    session,
    `window.__byText('button', '${box.menuItem}').click(); true`,
  );
  await sleep(500);
  report.markedNodeCameBackOnReopen = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  await evaluate(
    cdp,
    session,
    `(() => { const el = window.__byText('button', 'ยกเลิก');
              if (el) el.click(); return true; })()`,
  );
  await sleep(700);
  await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]')
       .forEach(el => el.removeAttribute('${MARK}')); true`,
  );
  await cdp.send('Target.closeTarget', { targetId: other.targetId });
  return report;
}

/**
 * The way in a person has without a race against their own click: a save.
 * Both boxes close themselves *after* an awaited request (`onSaved` for the
 * photo, `closeChangePassword` for the password), so the close can land in a
 * tab that already has no frames - press save, switch away while the request
 * is out, and nothing was racing the person's own hand.
 */
async function measureSaveWhileHidden(cdp, session, firstTargetId) {
  const report = { box: 'password', wayIn: 'save, then switch away' };

  await evaluate(cdp, session, CLICK_HELPERS);
  await evaluate(cdp, session, 'window.__avatar().click(); true');
  await waitFor(
    cdp,
    session,
    `!!window.__byText('button', 'เปลี่ยนรหัสผ่าน')`,
    'the menu item',
  );
  await evaluate(
    cdp,
    session,
    `window.__byText('button', 'เปลี่ยนรหัสผ่าน').click(); true`,
  );
  await waitFor(
    cdp,
    session,
    `!!window.__byText('h3', 'เปลี่ยนรหัสผ่าน')`,
    'the heading',
  );
  await evaluate(
    cdp,
    session,
    `window.__byText('h3', 'เปลี่ยนรหัสผ่าน')
       .closest('div.fixed').setAttribute('${MARK}', ''); true`,
  );
  // A controlled input is filled the way the browser fills it, or React keeps
  // the old value: the native setter, then an `input` event that bubbles.
  await evaluate(
    cdp,
    session,
    `(() => {
       const set = (el, value) => {
         Object.getOwnPropertyDescriptor(
           window.HTMLInputElement.prototype, 'value').set.call(el, value);
         el.dispatchEvent(new Event('input', { bubbles: true }));
       };
       const fields = [...document.querySelectorAll(
         '[${MARK}] input[type="password"]')];
       set(fields[0], '${PASSWORD}');
       set(fields[1], '${PASSWORD}');
       set(fields[2], '${PASSWORD}');
       return fields.length;
     })()`,
  );

  const other = await cdp.send('Target.createTarget', { url: 'about:blank' });
  // Press save with the tab in front, as a person does, and switch away while
  // the request is still out. The server's bcrypt is what makes that window
  // wide enough to be a thing somebody does rather than a thing they hit.
  await evaluate(
    cdp,
    session,
    `document.querySelector('[${MARK}] button[type="submit"]').click(); true`,
  );
  await sleep(15);
  await cdp.send('Target.activateTarget', { targetId: other.targetId });
  await sleep(400);
  report.visibility = await evaluate(cdp, session, 'document.visibilityState');
  report.framesInASecondWhileBackgrounded = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       let n = 0;
       const tick = () => { n += 1; requestAnimationFrame(tick); };
       requestAnimationFrame(tick);
       setTimeout(() => resolve(n), 1000);
     })`,
  );
  report.theSaveAnswered = await evaluate(
    cdp,
    session,
    `!!document.querySelector('[${MARK}] input[type="password"]') === false ||
     !document.querySelector('[${MARK}] form')`,
  );
  report.presentAfterTheSave = {};
  for (const ms of [1000, 3000]) {
    await sleep(ms === 1000 ? 600 : 2000);
    report.presentAfterTheSave[ms + 'ms'] = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
  }
  report.whileBackgrounded = await evaluate(cdp, session, SURVEY(MARK));

  await evaluate(
    cdp,
    session,
    `(() => {
       window.__seen = [];
       const start = performance.now();
       const tick = () => {
         const el = document.querySelector('[${MARK}]');
         window.__seen.push({
           at: Math.round(performance.now() - start),
           there: !!el,
           opacity: el ? getComputedStyle(el).opacity : null,
         });
         if (performance.now() - start < 1000) requestAnimationFrame(tick);
       };
       requestAnimationFrame(tick);
       return true;
     })()`,
  );
  await cdp.send('Target.activateTarget', { targetId: firstTargetId });
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' }, session);
  fs.writeFileSync(
    path.join(OUT, 'probe169-password-save-on-return.png'),
    Buffer.from(shot.data, 'base64'),
  );
  await sleep(1400);
  const frames = await evaluate(cdp, session, 'window.__seen');
  report.framesAfterReturn = {
    sampled: frames.length,
    firstThree: frames.slice(0, 3),
    lastDrawn: frames.filter(f => f.there).slice(-1)[0] || null,
  };
  report.stillThereAfterReturn = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  await cdp.send('Target.closeTarget', { targetId: other.targetId });
  return report;
}

/**
 * Does a **CSS** transition finish in a tab with no frames? framer-motion's
 * tween is driven by `requestAnimationFrame`, which is why it does not. A CSS
 * transition is driven by the compositor's clock, and if `transitionend` still
 * arrives in a hidden tab then there is an option nobody listed: keep the fade
 * and let the browser's own timeline retire the node.
 */
async function measureCssInAHiddenTab(cdp, session, firstTargetId) {
  const report = { question: 'does a CSS transition end in a frameless tab' };
  const other = await cdp.send('Target.createTarget', { url: 'about:blank' });
  await cdp.send('Target.activateTarget', { targetId: other.targetId });
  await sleep(400);
  report.visibility = await evaluate(cdp, session, 'document.visibilityState');
  report.framesInASecond = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       let n = 0;
       const tick = () => { n += 1; requestAnimationFrame(tick); };
       requestAnimationFrame(tick);
       setTimeout(() => resolve(n), 1000);
     })`,
  );
  report.cssTransition = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       const el = document.createElement('div');
       el.style.cssText =
         'position:fixed;left:0;top:0;width:10px;height:10px;opacity:1;' +
         'transition:opacity 180ms linear';
       document.body.appendChild(el);
       let ended = null;
       const started = performance.now();
       el.addEventListener('transitionend', () => {
         ended = Math.round(performance.now() - started);
       });
       requestAnimationFrame(() => {});
       setTimeout(() => { el.style.opacity = '0'; }, 20);
       setTimeout(() => {
         resolve({
           transitionendFiredAfterMs: ended,
           opacityNow: getComputedStyle(el).opacity,
         });
         el.remove();
       }, 900);
     })`,
  );
  report.cssAnimation = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       const el = document.createElement('div');
       el.style.cssText =
         'position:fixed;left:0;top:0;width:10px;height:10px;' +
         'animation:probeFade 180ms linear forwards';
       const style = document.createElement('style');
       style.textContent =
         '@keyframes probeFade { from { opacity: 1 } to { opacity: 0 } }';
       document.head.appendChild(style);
       let ended = null;
       const started = performance.now();
       el.addEventListener('animationend', () => {
         ended = Math.round(performance.now() - started);
       });
       document.body.appendChild(el);
       setTimeout(() => {
         resolve({
           animationendFiredAfterMs: ended,
           opacityNow: getComputedStyle(el).opacity,
         });
         el.remove();
         style.remove();
       }, 900);
     })`,
  );
  report.setTimeoutStillRuns = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       const started = performance.now();
       setTimeout(() => resolve(Math.round(performance.now() - started)), 200);
     })`,
  );
  await cdp.send('Target.activateTarget', { targetId: firstTargetId });
  await cdp.send('Target.closeTarget', { targetId: other.targetId });
  return report;
}

/**
 * The other side of the fix: with the tab in front, nothing changes. The box
 * is held for the fade, the opacity comes down, and the node goes when the
 * tween ends - which is what a person watching the screen sees today.
 *
 * With `backgroundFirst`, the tab is sent away and brought back **while the
 * box is open**, and only then is the box closed, in front of the person. That
 * sequence is the one a listener on `visibilitychange` gets wrong if it is
 * allowed to run behind an open box: the flag goes up when the tab goes away
 * and is still up minutes later, so the close drops the node with no fade. The
 * fade has to read the same as it does without the detour.
 */
async function measureWhileWatching(
  cdp,
  session,
  name,
  backgroundFirst = false,
  firstTargetId = null,
) {
  const box = BOXES[name];
  const report = {
    box: name,
    tab: backgroundFirst
      ? 'sent away and brought back while the box was open, closed in front'
      : 'in front the whole time',
  };

  await evaluate(cdp, session, CLICK_HELPERS);
  await evaluate(cdp, session, 'window.__avatar().click(); true');
  await waitFor(
    cdp,
    session,
    `!!window.__byText('button', '${box.menuItem}')`,
    'the menu item',
  );
  await evaluate(
    cdp,
    session,
    `window.__byText('button', '${box.menuItem}').click(); true`,
  );
  await waitFor(
    cdp,
    session,
    `!!window.__byText('h3', '${box.heading}')`,
    'the heading',
  );
  await evaluate(
    cdp,
    session,
    `window.__byText('h3', '${box.heading}')
       .closest('div.fixed').setAttribute('${MARK}', ''); true`,
  );

  if (backgroundFirst) {
    const other = await cdp.send('Target.createTarget', { url: 'about:blank' });
    await cdp.send('Target.activateTarget', { targetId: other.targetId });
    await sleep(700);
    report.visibilityWhileOpen = await evaluate(
      cdp,
      session,
      'document.visibilityState',
    );
    await cdp.send('Target.activateTarget', { targetId: firstTargetId });
    await sleep(400);
    report.visibilityOnReturn = await evaluate(
      cdp,
      session,
      'document.visibilityState',
    );
    report.stillOpenOnReturn = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
  }

  const frames = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       const seen = [];
       const start = performance.now();
       const tick = () => {
         const el = document.querySelector('[${MARK}]');
         seen.push({
           at: Math.round(performance.now() - start),
           there: !!el,
           opacity: el ? getComputedStyle(el).opacity : null,
         });
         if (performance.now() - start < 700) requestAnimationFrame(tick);
         else resolve(seen);
       };
       window.__byText('button', 'ยกเลิก').click();
       requestAnimationFrame(tick);
     })`,
  );
  const drawn = frames.filter(f => f.there);
  report.framesSampled = frames.length;
  report.framesStillDrawingIt = drawn.length;
  report.msOfTheLastFrameDrawingIt = drawn.length ? drawn[drawn.length - 1].at : null;
  report.opacityCameDown =
    drawn.length > 1 &&
    Number(drawn[drawn.length - 1].opacity) < Number(drawn[0].opacity);
  report.opacityTrace = drawn
    .filter((_, i) => i % 3 === 0)
    .map(f => f.at + 'ms:' + f.opacity);
  report.goneAtTheEnd = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  return report;
}

// ------------------------------------------- #227's other five mount points

const SITE_HELPERS = `
  window.__roleTrigger = () =>
    [...document.querySelectorAll('button[type="button"]')].find(
      el => el.querySelector('svg[class*="ms-3"]'));
  window.__submenu = () => document.querySelector('ul[class*="ml-9"]');
  window.__submenuLink = () => {
    const list = window.__submenu();
    return list ? list.parentElement.querySelector('a') : null;
  };
  window.__fill = (selector, value) => {
    const el = document.querySelector(selector);
    // Thrown rather than answered false, because a filler that answers is a
    // filler whose answer nobody reads: the two runs this cost were a page
    // that had been replaced under the helpers, where both fields silently
    // took nothing and the press was refused for being empty.
    if (!el) throw new Error('nothing at ' + selector);
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };
  window.__watchForHidden = () => {
    window.__race = { pressedAt: null, hiddenAt: null };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && window.__race.hiddenAt === null) {
        window.__race.hiddenAt = performance.now();
      }
    });
    return true;
  };
  window.__watchAnswers = () => {
    window.__answers = [];
    const real = window.fetch;
    window.fetch = (...args) =>
      real(...args).then(answer => {
        window.__answers.push({
          url: String(args[0]).slice(-30),
          status: answer.status,
          at: Math.round(performance.now()),
        });
        return answer;
      });
    return true;
  };
  true;
`;

const FRAMES_IN_A_SECOND = `new Promise(resolve => {
  let n = 0;
  const tick = () => { n += 1; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  setTimeout(() => resolve(n), 1000);
})`;

/** A sample per frame of what is marked, for `ms` after it is installed. */
const SAMPLER = ms => `(() => {
  window.__seen = [];
  const start = performance.now();
  const tick = () => {
    const el = document.querySelector('[${MARK}]');
    window.__seen.push({
      at: Math.round(performance.now() - start),
      there: !!el,
      opacity: el ? getComputedStyle(el).opacity : null,
    });
    if (performance.now() - start < ${ms}) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return true;
})()`;

const framesReport = frames => {
  const drawn = frames.filter(frame => frame.there);
  return {
    sampled: frames.length,
    framesStillDrawingIt: drawn.length,
    drawnAtFullOpacity: drawn.filter(frame => frame.opacity === '1').length,
    firstThree: frames.slice(0, 3),
    msOfTheLastFrameDrawingIt: drawn.length ? drawn[drawn.length - 1].at : null,
    opacityCameDown:
      drawn.length > 1 &&
      Number(drawn[drawn.length - 1].opacity) < Number(drawn[0].opacity),
    opacityTrace: drawn
      .filter((_, index) => index % 3 === 0)
      .map(frame => frame.at + 'ms:' + frame.opacity),
  };
};

async function helpers(cdp, session) {
  await evaluate(cdp, session, CLICK_HELPERS);
  await evaluate(cdp, session, SITE_HELPERS);
}

/**
 * A document load, so that each arm starts from the same screen.
 *
 * The wait is on a **stamp** left in the document being left, and not on
 * `readyState`: `complete` is what the old document answers while the
 * navigation is still on its way, so a wait on it alone returns at once and
 * the helpers are installed on a document that is about to be thrown away.
 * `signIn` above gets away with it because it reloads a page it has just
 * loaded; this reloads one with requests in flight, and the symptom was a
 * press refused for empty fields in a form nobody had filled (#168 - a flag
 * paired with a later event is not identity; ask for the thing itself).
 */
async function freshPage(cdp, session) {
  await evaluate(cdp, session, 'window.__leaving = true; true');
  await cdp.send('Page.navigate', { url: APP }, session);
  await waitFor(
    cdp,
    session,
    'document.readyState === "complete" && window.__leaving === undefined',
    'a document that is not the one we left',
  );
  await waitFor(
    cdp,
    session,
    `!!document.querySelector('#root > *')`,
    'the application drawn',
  );
  await helpers(cdp, session);
}

/**
 * What the screen has decided, for a wait that never happened - #160's rule
 * read one layer along: a probe that throws `never happened: the spinner` has
 * said where it waited and nothing about what it was looking at, and on this
 * screen the answer is usually a refusal it drew instead.
 */
const SCREEN_NOW = `(() => ({
  fields: [...document.querySelectorAll('form input')]
    .map(el => el.id + '=' + el.value.length),
  refusal:
    (document.getElementById('sign-in-refusal') || {}).textContent || null,
  spinner: !!window.__byText('p', 'กำลังเข้าสู่ระบบ...'),
  answers: window.__answers || null,
  text: (document.body.innerText || '').replace(/\\s+/g, ' ').slice(0, 300),
}))()`;

/**
 * The two fields, filled and **read back**.
 *
 * A controlled input holds what the component's state holds, so a field that
 * is empty again a tick later is a component that re-rendered over the typing
 * - which is what the first version of this measured: `/api/me` answers while
 * the page is settling, the fields went back to empty, and `handleSubmit`
 * refused the press for being empty at 68ms. That reading has no spinner in
 * it and looks exactly like a swap that does not happen.
 */
async function fillSignIn(cdp, session) {
  await waitFor(cdp, session, `!!document.getElementById('username')`, 'the form');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await evaluate(cdp, session, `window.__fill('#username', '${EMAIL}')`);
    await evaluate(cdp, session, `window.__fill('#password', 'not-the-password')`);
    const held = await evaluate(
      cdp,
      session,
      `document.getElementById('username').value.length > 0 &&
       document.getElementById('password').value.length > 0`,
    );
    if (held) return;
    await sleep(150);
  }
  throw new Error('the fields would not hold what was typed');
}

/**
 * The press, which asserts the form is still filled: an empty one is refused
 * by `handleSubmit` before the spinner, and a probe that cannot tell that
 * refusal from the one it came for is measuring nothing.
 */
const PRESS_SIGN_IN = `(() => {
  if (!document.getElementById('username').value) {
    throw new Error('the form was empty at the press');
  }
  document.querySelector('form button[type="submit"]').click();
  return true;
})()`;

/** A refused sign-in, which is what puts the refusal box on the screen. */
async function signInWrongly(cdp, session) {
  await fillSignIn(cdp, session);
  await evaluate(cdp, session, PRESS_SIGN_IN);
  await waitFor(
    cdp,
    session,
    `!!document.getElementById('sign-in-refusal')`,
    'the refusal box',
  );
}

/**
 * The enter tween finished, read off the thing itself.
 *
 * Without this each arm pressed close inside the 180ms the thing was still
 * fading **in**, which is #212's rule in an instrument: the exit then starts
 * from whatever the enter had reached, reaches zero in one frame, and the
 * frozen opacity a frameless tab leaves behind is the enter's resting value
 * and not 1. The first run of these arms read 0.14 and 0.51 where the
 * measurement is about a node that is fully drawn, and two sites reported a
 * fade of one frame where they have the same 180ms as the rest.
 */
async function waitForOpaque(cdp, session) {
  await waitFor(
    cdp,
    session,
    `(() => {
       const el = document.querySelector('[${MARK}]');
       return !!el && getComputedStyle(el).opacity === '1';
     })()`,
    'the thing drawn at full opacity',
    5000,
  );
}

/**
 * The five places in `frontend/src/` that still mount `AnimatePresence`
 * themselves, and what takes away the thing each of them draws.
 *
 * #227's first half is one question asked of each: can the removal land in a
 * tab that is already getting no frames **without racing the person's own
 * hand**? #169's two boxes could, both of them closing themselves after an
 * awaited request. Where the answer is no, `noRacelessWayIn` holds the reason,
 * read off every writer of the state the presence is keyed on rather than off
 * the control a ticket happened to press (#139) - and what is left to measure
 * is the price, which is the fade's own window and what `measureHandWindow`
 * presses into.
 *
 * `close` is an expression and not a function so that the press and the stamp
 * that dates it are one evaluation; a round trip between them would be added
 * to every window reported here.
 *
 * The sign-in screen is two of the five and nobody signed in can see it, so
 * the order of these keys is load-bearing: the runner signs in where it
 * reaches the first site that needs it, and not before.
 */
const SITES = {
  'login-swap': {
    what: 'pages/Login.js - the form/spinner swap (mode="wait")',
    needsSignIn: false,
    racelessWayIn:
      '`handleSubmit` puts the spinner up on the press and takes it down in ' +
      '`finally`, after `post` and `reload` - so the swap back lands whenever ' +
      'the answer does, and the person has the whole request to switch away ' +
      'in. The shape of the two boxes of #169, and the only one of the five.',
  },
  'login-refusal': {
    what: 'pages/Login.js - the refusal box (role="alert")',
    needsSignIn: false,
    open: signInWrongly,
    mark: `document.getElementById('sign-in-refusal')`,
    close: `window.__fill('#username', 'a');`,
    noRacelessWayIn:
      'the writers of `errorMessage` are `clearRefusalAndSet`, which is a ' +
      "field's own change event, and the next submit - both of them somebody " +
      'at the keyboard with the tab in front',
  },
  'navbar-menu': {
    what: 'components/Navbar.js - the user menu',
    needsSignIn: true,
    open: async (cdp, session) => {
      // The shell draws before `/api/me` has answered, so a press timed off
      // the document being complete finds no avatar at all.
      await waitFor(cdp, session, '!!window.__avatar()', 'the avatar button');
      await evaluate(cdp, session, 'window.__avatar().click(); true');
      await waitFor(
        cdp,
        session,
        `!!window.__byText('span', 'เปลี่ยนรหัสผ่าน')`,
        'the user menu',
      );
    },
    mark: `window.__byText('span', 'เปลี่ยนรหัสผ่าน')
             .closest('div[class*="origin-top-right"]')`,
    close: `window.__avatar().click();`,
    noRacelessWayIn:
      'every writer of `isOpen` is a press: the avatar toggle, the two ' +
      'entries (which open a box in the same handler) and the `mousedown` ' +
      'listener for a click outside the menu',
  },
  'role-dropdown': {
    what: 'components/RoleDropdown.js - the role picker',
    needsSignIn: true,
    open: async (cdp, session) => {
      await waitFor(cdp, session, '!!window.__roleTrigger()', 'the picker');
      await evaluate(cdp, session, 'window.__roleTrigger().click(); true');
      await waitFor(
        cdp,
        session,
        `!!document.querySelector('div[class*="divide-y"][class*="absolute"] li button')`,
        'the role list',
      );
    },
    mark: `document.querySelector('div[class*="divide-y"][class*="absolute"]')`,
    close: `window.__roleTrigger().click();`,
    noRacelessWayIn:
      '`choose` runs `setOpen(false)` **before** its `await`, so the close ' +
      'has already landed by the time the request leaves; the other two ' +
      'writers are the trigger press and the `mousedown` outside',
  },
  'sidebar-submenu': {
    what: 'components/SidebarItem.js - a submenu',
    needsSignIn: true,
    open: async (cdp, session) => {
      await waitFor(
        cdp,
        session,
        '!!window.__submenu()',
        'a submenu, which is open on arrival for every role but the teacher',
      );
    },
    mark: `window.__submenu()`,
    close: `window.__submenuLink().click();`,
    noRacelessWayIn:
      'the writers of `openMenu` are the heading press, the collapse press ' +
      'and the effect keyed on `location.pathname` - and that effect cannot ' +
      'leave a held node behind: the one route change that closes a submenu, ' +
      "a Section leaving a teacher's address, takes the item holding the " +
      '`AnimatePresence` out of `menuForRole` in the same render, so the ' +
      'presence unmounts rather than keeping the list',
  },
};

/**
 * The price at a site with no raceless way in: press the control a person
 * presses, with the tab in front, and take the tab away behind it.
 *
 * What this reports and the earlier modes do not is
 * `theTabWentAwayMsAfterThePress` - the width of the window it actually
 * landed in. The claim #169 closed with was that a press needs a tab in
 * front, so these four sites have only the fade to lose, and *only the fade*
 * is a number: a reading that does not say how far inside the window the tab
 * went away says nothing about what a person can reach.
 */
async function measureHandWindow(cdp, session, key, firstTargetId) {
  const site = SITES[key];
  const report = {
    site: key,
    what: site.what,
    wayIn: 'pressed with the tab in front, and the tab taken away behind it',
    noRacelessWayIn: site.noRacelessWayIn,
  };
  await freshPage(cdp, session);
  await site.open(cdp, session);
  await evaluate(
    cdp,
    session,
    `(${site.mark}).setAttribute('${MARK}', ''); true`,
  );
  report.markedWhileOpen = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  await waitForOpaque(cdp, session);

  // `background: true`, which is what this whole arm rests on: a target
  // created without it takes the foreground, so the press below would land in
  // a tab that already had no frames. That reading is a different one - the
  // form never leaves at all, and at the swap the spinner never arrives - and
  // it is not a sequence anybody can perform.
  const other = await cdp.send('Target.createTarget', {
    url: 'about:blank',
    background: true,
  });
  await evaluate(cdp, session, 'window.__watchForHidden()');
  await evaluate(
    cdp,
    session,
    `window.__race.pressedAt = performance.now(); ${site.close} true`,
  );
  await cdp.send('Target.activateTarget', { targetId: other.targetId });
  const closedAt = Date.now();
  await sleep(400);
  const race = await evaluate(cdp, session, 'window.__race');
  report.theTabWentAwayMsAfterThePress =
    race && race.hiddenAt !== null
      ? Math.round(race.hiddenAt - race.pressedAt)
      : null;
  report.visibility = await evaluate(cdp, session, 'document.visibilityState');
  report.framesInASecondWhileBackgrounded = await evaluate(
    cdp,
    session,
    FRAMES_IN_A_SECOND,
  );
  report.presentAfterClose = {};
  for (const ms of [500, 1000, 3000]) {
    await sleep(Math.max(0, closedAt + ms - Date.now()));
    report.presentAfterClose[ms + 'ms'] = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
  }
  report.whileBackgrounded = await evaluate(cdp, session, SURVEY(MARK));
  report.axWhileBackgrounded = await axUnderTheBox(cdp, session);

  await evaluate(cdp, session, SAMPLER(1000));
  await cdp.send('Target.activateTarget', { targetId: firstTargetId });
  const returnedAt = Date.now();
  let gone = null;
  while (gone === null && Date.now() - returnedAt < 5000) {
    const count = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
    if (count === 0) gone = Date.now() - returnedAt;
    else await sleep(16);
  }
  report.msToVanishAfterReturn = gone;
  await sleep(1200);
  report.framesAfterReturn = framesReport(
    await evaluate(cdp, session, 'window.__seen'),
  );
  report.stillThereAfterReturn = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  await cdp.send('Target.closeTarget', { targetId: other.targetId });
  return report;
}

/**
 * How wide the window at the sign-in swap really is, with nothing emulated:
 * from the press to the last frame the spinner is drawn on. The arm below
 * widens it on purpose so that the instrument is not racing anything either,
 * and this is the reading that says what a person has without any help.
 */
async function measureTheRealWindow(cdp, session) {
  await freshPage(cdp, session);
  await fillSignIn(cdp, session);
  const frames = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       const seen = [];
       const start = performance.now();
       const tick = () => {
         seen.push({
           at: Math.round(performance.now() - start),
           spinning: !!window.__byText('p', 'กำลังเข้าสู่ระบบ...'),
           refused: !!document.getElementById('sign-in-refusal'),
         });
         if (performance.now() - start < 4000) requestAnimationFrame(tick);
         else resolve(seen);
       };
       ${PRESS_SIGN_IN};
       requestAnimationFrame(tick);
     })`,
  );
  const spinning = frames.filter(frame => frame.spinning);
  const refused = frames.find(frame => frame.refused);
  return {
    question: 'the window a person has at the swap, with nothing emulated',
    sampled: frames.length,
    spinnerFirstDrawnAtMs: spinning.length ? spinning[0].at : null,
    spinnerLastDrawnAtMs: spinning.length
      ? spinning[spinning.length - 1].at
      : null,
    refusalFirstDrawnAtMs: refused ? refused.at : null,
  };
}

/**
 * The swap, measured three ways. `hidden` is the defect reading: press, switch
 * away while the request is out, and ask whether the spinner is still in the
 * document after the answer has landed. `watching` and `watching-after-hidden`
 * are the two guards #169 earned - what somebody looking at the screen sees,
 * and what they see when the tab has been away and come back *before* the
 * swap.
 *
 * The latency is emulated so that the instrument is not racing the request
 * either: the window a person has is measured separately, by
 * `measureTheRealWindow`, and the fade this reads is the same fade whatever
 * the answer took to arrive.
 */
async function measureTheLoginSwap(cdp, session, firstTargetId, how) {
  const LATENCY = 2000;
  const report = {
    site: 'login-swap',
    what: SITES['login-swap'].what,
    wayIn: SITES['login-swap'].racelessWayIn,
    how,
    emulatedLatencyMs: LATENCY,
  };
  await freshPage(cdp, session);
  await fillSignIn(cdp, session);
  await evaluate(cdp, session, 'window.__watchAnswers()');
  await cdp.send('Network.enable', {}, session);
  await cdp.send(
    'Network.emulateNetworkConditions',
    {
      offline: false,
      latency: LATENCY,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
    session,
  );

  const other =
    how === 'watching'
      ? null
      : await cdp.send('Target.createTarget', {
          url: 'about:blank',
          background: true,
        });
  await evaluate(cdp, session, 'window.__watchForHidden()');
  await evaluate(
    cdp,
    session,
    `window.__race.pressedAt = performance.now(); ${PRESS_SIGN_IN}`,
  );
  try {
    await waitFor(
      cdp,
      session,
      `!!window.__byText('p', 'กำลังเข้าสู่ระบบ...')`,
      'the spinner',
      6000,
    );
  } catch (error) {
    report.theSpinnerNeverAppeared = await evaluate(cdp, session, SCREEN_NOW);
    if (other) {
      await cdp.send('Target.closeTarget', { targetId: other.targetId });
    }
    return report;
  }
  await evaluate(
    cdp,
    session,
    `window.__byText('p', 'กำลังเข้าสู่ระบบ...')
       .closest('div[class*="h-64"]').setAttribute('${MARK}', ''); true`,
  );
  report.markedWhileSpinning = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  await waitForOpaque(cdp, session);

  if (how === 'hidden') {
    await cdp.send('Target.activateTarget', { targetId: other.targetId });
    await sleep(400);
    const race = await evaluate(cdp, session, 'window.__race');
    report.theTabWentAwayMsAfterThePress =
      race && race.hiddenAt !== null
        ? Math.round(race.hiddenAt - race.pressedAt)
        : null;
    report.visibility = await evaluate(cdp, session, 'document.visibilityState');
    report.framesInASecondWhileBackgrounded = await evaluate(
      cdp,
      session,
      FRAMES_IN_A_SECOND,
    );
    await sleep(2000);
    report.theAnswerLandedWhileBackgrounded = await evaluate(
      cdp,
      session,
      'window.__answers',
    );
    report.presentAfterTheAnswer = {};
    for (const ms of [500, 2500]) {
      await sleep(ms === 500 ? 500 : 2000);
      report.presentAfterTheAnswer[ms + 'ms after it landed'] = await evaluate(
        cdp,
        session,
        `document.querySelectorAll('[${MARK}]').length`,
      );
    }
    report.theFormIsInTheDocument = await evaluate(
      cdp,
      session,
      `!!document.getElementById('username')`,
    );
    report.theRefusalIsInTheDocument = await evaluate(
      cdp,
      session,
      `!!document.getElementById('sign-in-refusal')`,
    );
    report.whileBackgrounded = await evaluate(cdp, session, SURVEY(MARK));
    report.axWhileBackgrounded = await axUnderTheBox(cdp, session);

    await evaluate(cdp, session, SAMPLER(1000));
    await cdp.send('Target.activateTarget', { targetId: firstTargetId });
    const shot = await cdp.send(
      'Page.captureScreenshot',
      { format: 'png' },
      session,
    );
    fs.writeFileSync(
      path.join(OUT, 'probe227-login-swap-on-return.png'),
      Buffer.from(shot.data, 'base64'),
    );
    await sleep(1400);
    report.framesAfterReturn = framesReport(
      await evaluate(cdp, session, 'window.__seen'),
    );
    report.stillThereAfterReturn = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
    report.theRefusalAfterReturn = await evaluate(
      cdp,
      session,
      `(document.getElementById('sign-in-refusal') || {}).textContent || null`,
    );
  } else {
    if (how === 'watching-after-hidden') {
      await cdp.send('Target.activateTarget', { targetId: other.targetId });
      await sleep(700);
      report.visibilityWhileSpinning = await evaluate(
        cdp,
        session,
        'document.visibilityState',
      );
      await cdp.send('Target.activateTarget', { targetId: firstTargetId });
      await sleep(300);
      report.visibilityOnReturn = await evaluate(
        cdp,
        session,
        'document.visibilityState',
      );
      report.stillSpinningOnReturn = await evaluate(
        cdp,
        session,
        `document.querySelectorAll('[${MARK}]').length`,
      );
    }
    await evaluate(cdp, session, SAMPLER(2600));
    await sleep(3000);
    report.framesWhileWatching = framesReport(
      await evaluate(cdp, session, 'window.__seen'),
    );
    report.goneAtTheEnd = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
    report.theRefusalIsInTheDocument = await evaluate(
      cdp,
      session,
      `!!document.getElementById('sign-in-refusal')`,
    );
  }

  if (other) await cdp.send('Target.closeTarget', { targetId: other.targetId });
  await cdp.send(
    'Network.emulateNetworkConditions',
    {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
    session,
  );
  return report;
}

/**
 * The other side of a fix at these four, and the reading that says a change
 * is invisible to somebody who is looking: the fade has to read the same as
 * it does today, with and without a detour to the background while the thing
 * is open (#169's fourth mode, which its first version failed).
 */
async function measureSiteWhileWatching(
  cdp,
  session,
  key,
  firstTargetId,
  backgroundFirst,
) {
  const site = SITES[key];
  const report = {
    site: key,
    what: site.what,
    tab: backgroundFirst
      ? 'sent away and brought back while it was open, closed in front'
      : 'in front the whole time',
  };
  await freshPage(cdp, session);
  await site.open(cdp, session);
  await evaluate(
    cdp,
    session,
    `(${site.mark}).setAttribute('${MARK}', ''); true`,
  );
  await waitForOpaque(cdp, session);

  if (backgroundFirst) {
    const other = await cdp.send('Target.createTarget', {
      url: 'about:blank',
      background: true,
    });
    await cdp.send('Target.activateTarget', { targetId: other.targetId });
    await sleep(700);
    report.visibilityWhileOpen = await evaluate(
      cdp,
      session,
      'document.visibilityState',
    );
    await cdp.send('Target.activateTarget', { targetId: firstTargetId });
    await sleep(400);
    report.visibilityOnReturn = await evaluate(
      cdp,
      session,
      'document.visibilityState',
    );
    report.stillOpenOnReturn = await evaluate(
      cdp,
      session,
      `document.querySelectorAll('[${MARK}]').length`,
    );
    await cdp.send('Target.closeTarget', { targetId: other.targetId });
  }

  const frames = await evaluate(
    cdp,
    session,
    `new Promise(resolve => {
       const seen = [];
       const start = performance.now();
       const tick = () => {
         const el = document.querySelector('[${MARK}]');
         seen.push({
           at: Math.round(performance.now() - start),
           there: !!el,
           opacity: el ? getComputedStyle(el).opacity : null,
         });
         if (performance.now() - start < 700) requestAnimationFrame(tick);
         else resolve(seen);
       };
       ${site.close}
       requestAnimationFrame(tick);
     })`,
  );
  Object.assign(report, framesReport(frames));
  report.goneAtTheEnd = await evaluate(
    cdp,
    session,
    `document.querySelectorAll('[${MARK}]').length`,
  );
  return report;
}

/**
 * All five, in the order that lets the two sign-in sites run signed out.
 *
 * Each site is caught on its own: five readings taken one after another in one
 * browser are five measurements, and a run that throws the other four away
 * over the fifth's selector is a run that has to be done again for nothing.
 * What a failed site reports is its error, in its own row.
 */
async function measureTheFive(cdp, session, firstTargetId, how) {
  const out = {};
  let signedIn = false;
  for (const key of Object.keys(SITES)) {
    try {
      if (SITES[key].needsSignIn && !signedIn) {
        await signIn(cdp, session);
        signedIn = true;
      }
      if (key === 'login-swap') {
        out[key] = await measureTheLoginSwap(cdp, session, firstTargetId, how);
        if (how === 'hidden') {
          out[key].theWindowWithNothingEmulated = await measureTheRealWindow(
            cdp,
            session,
          );
        }
      } else if (how === 'hidden') {
        out[key] = await measureHandWindow(cdp, session, key, firstTargetId);
      } else {
        out[key] = await measureSiteWhileWatching(
          cdp,
          session,
          key,
          firstTargetId,
          how === 'watching-after-hidden',
        );
      }
    } catch (error) {
      out[key] = { site: key, error: error.message };
    }
  }
  return out;
}

// ---------------------------------------------------------------------- main

(async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'probe169-'));
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,900',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let out = {};
  try {
    const ws = await openSocket(await devtoolsUrl());
    const cdp = new Cdp(ws);
    const created = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId: created.targetId,
      flatten: true,
    });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Target.activateTarget', { targetId: created.targetId });

    // Two of #227's five are on the sign-in screen, which nobody signed in
    // can see, so those modes sign in when they reach a site that needs it.
    if (!FIVE_MODES.includes(process.argv[2])) await signIn(cdp, sessionId);
    if (process.argv[2] === 'visible') {
      out.photo = await measureWhileWatching(cdp, sessionId, 'photo');
      out.password = await measureWhileWatching(cdp, sessionId, 'password');
    } else if (process.argv[2] === 'visible-after-hidden') {
      out.photo = await measureWhileWatching(
        cdp,
        sessionId,
        'photo',
        true,
        created.targetId,
      );
      out.password = await measureWhileWatching(
        cdp,
        sessionId,
        'password',
        true,
        created.targetId,
      );
    } else if (FIVE_MODES.includes(process.argv[2])) {
      out.five = await measureTheFive(
        cdp,
        sessionId,
        created.targetId,
        process.argv[2] === 'sites'
          ? 'hidden'
          : process.argv[2] === 'sites-visible'
            ? 'watching'
            : 'watching-after-hidden',
      );
    } else if (process.argv[2] === 'css') {
      out.css = await measureCssInAHiddenTab(cdp, sessionId, created.targetId);
    } else if (process.argv[2] === 'save') {
      out.saveWhileHidden = await measureSaveWhileHidden(
        cdp,
        sessionId,
        created.targetId,
      );
    } else {
      out.photo = await measure(cdp, sessionId, 'photo', created.targetId);
      out.password = await measure(cdp, sessionId, 'password', created.targetId);
    }
  } catch (error) {
    out.error = error.message;
  } finally {
    const text = 'PROBE169 ' + JSON.stringify(out, null, 2);
    fs.writeFileSync(path.join(OUT, 'probe169' + (process.argv[2] ? '-' + process.argv[2] : '') + '.out.json'), text, 'utf8');
    console.log(text);
    console.log('written to ' + OUT);
    chrome.kill();
    setTimeout(() => process.exit(0), 500);
  }
})();
