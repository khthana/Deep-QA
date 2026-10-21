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
 * Measured with it on 21 October 2569, before `DialogPresence` (#169):
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
 * the defect, and it was written because the first version of `DialogPresence`
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

const PORT = 9333;
const APP = 'http://localhost:5100';
const API = 'http://localhost:3100';
const EMAIL = 'faculty.admin@kmitl.ac.th';
const PASSWORD = 'deep-core-local';
const MARK = 'data-probe169';

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'probe169-out-'));

const CHROME =
  process.env.PROBE_CHROME ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = ms => new Promise(r => setTimeout(r, ms));


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

    await signIn(cdp, sessionId);
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
