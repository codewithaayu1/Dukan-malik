// PIN setup + lock screen. Renders full-screen over #app until unlocked.
import { esc } from './utils.js';
import { icon, toast } from './ui.js';
import { getAuth, setAuth } from './storage.js';
import { sha256 } from './utils.js';

let resolveUnlock = null;
let stage = 'checking'; // setup1 | setup2 | lock
let first = '';
let attempts = 0;

export function ensureUnlocked() {
  return new Promise(async (res) => {
    resolveUnlock = res;
    const auth = await getAuth();
    stage = auth?.pinHash ? 'lock' : 'setup1';
    paint();
  });
}

function root() {
  let r = document.getElementById('lock-screen');
  if (!r) {
    r = document.createElement('div');
    r.id = 'lock-screen';
    document.body.appendChild(r);
  }
  return r;
}

function paint(err = '') {
  const r = root();
  r.hidden = false;
  const titles = { setup1: 'PIN Banao', setup2: 'PIN Dobara Likho', lock: 'App Locked' };
  const subs = { setup1: 'Apni shop ka data surakshit rakhne ke liye 4-6 ank ka PIN chuno', setup2: 'Wahi PIN dobara type karo, confirm karne ke liye', lock: 'Jaari rakhne ke liye apna PIN daalo' };
  r.innerHTML = `<div class="lock-wrap">
    <div class="lock-logo">${icon('lock')}</div>
    <h1>${titles[stage]}</h1>
    <p class="muted">${subs[stage]}</p>
    <div class="dotsrow" id="ld"></div>
    <div class="keypad" id="kp">
      ${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
      <button data-k="back" aria-label="Backspace">${icon('chevL')}</button>
      <button data-k="0">0</button>
      <button data-k="clear" aria-label="Clear">${icon('x')}</button>
    </div>
    ${err ? `<p class="lock-err">${esc(err)}</p>` : ''}
    ${stage === 'lock' ? '<p class="muted sm forgot">PIN bhool gaye? Settings me Erase Data hi option hai — file me hint rakho.</p>' : ''}
  </div>`;
  let val = '';
  const dots = () => (r.querySelector('#ld').innerHTML = Array.from({ length: 6 }, (_, i) => `<i class="${i < val.length ? 'on' : ''}"></i>`).join(''));
  dots();
  r.querySelector('#kp').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'back') val = val.slice(0, -1);
    else if (k === 'clear') val = '';
    else if (val.length < 6) val += k;
    dots();
    if (val.length >= 4 && (val.length === 6 || document.activeElement === b)) {
      // auto-submit on 6, or allow shorter PIN via a small delay
    }
    if (val.length === 6) submit(val), (val = '');
    else if (val.length >= 4) {
      clearTimeout(root()._t);
      root()._t = setTimeout(() => {
        if (val.length >= 4) submit(val), (val = ''), dots();
      }, 700);
    }
  });
  async function submit(pin) {
    if (stage === 'setup1') {
      first = pin;
      stage = 'setup2';
      return paint();
    }
    if (stage === 'setup2') {
      if (pin !== first) {
        first = '';
        stage = 'setup1';
        return paint('PIN match nahi hua — dobara try karo');
      }
      await setAuth({ pinHash: await sha256(pin), createdAt: Date.now() });
      toast('PIN set ho gaya');
      unlock();
      return;
    }
    if (stage === 'lock') {
      const auth = await getAuth();
      if (auth?.pinHash === (await sha256(pin))) {
        attempts = 0;
        unlock();
      } else {
        attempts++;
        paint(`Galat PIN${attempts > 2 ? ' — dhyan se daalo' : ''}`);
      }
    }
  }
}
function unlock() {
  const r = document.getElementById('lock-screen');
  if (r) r.hidden = true;
  resolveUnlock?.();
}
export function relock() {
  stage = 'lock';
  paint();
}
