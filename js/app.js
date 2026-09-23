import * as store from './store.js';
import { kvGet, saveState, flush, getLastError, askPersistent } from './storage.js';
import { ensureUnlocked, relock } from './auth.js';
import { A, ctx, icon, toast, fail, sheet, setShop, closeAllSheets } from './ui.js';
import { home } from './views_main.js';
import * as M from './views_main.js';
import * as T from './views_txn.js';
import * as ST from './views_settings.js';

const app = document.getElementById('app');
const ROUTES = {
  '': { view: M.home, tab: 'home', title: 'Home' },
  '#/': { view: M.home, tab: 'home', title: 'Home' },
  '#/stock': { view: M.stockView, tab: 'stock', title: 'Stock' },
  '#/sales': { view: T.salesView, tab: 'sales', title: 'Sales' },
  '#/purchase': { view: T.purchaseView, tab: 'purchase', title: 'Purchase' },
  '#/parties': { view: T.partiesView, tab: 'parties', title: 'Parties' },
  '#/expenses': { view: T.expensesView, tab: '', title: 'Expenses' },
  '#/history': { view: M.historyView, tab: '', title: 'History' },
  '#/reports': { view: M.reportsView, tab: '', title: 'Reports' },
  '#/search': { view: M.searchView, tab: '', title: 'Search' },
  '#/settings': { view: ST.settingsView, tab: '', title: 'Settings' },
};

const NAV = [
  ['#/', 'home', 'Home'],
  ['#/stock', 'box', 'Stock'],
  ['#/sales', 'cart', 'Sales'],
  ['#/purchase', 'bag', 'Purchase'],
  ['#/parties', 'users', 'Parties'],
];

function currentRoute() {
  const h = location.hash || '#/';
  if (h.startsWith('#/party/')) return { view: (el) => T.partyDetail(el, h.slice(8)), tab: 'parties', title: 'Shop Account', back: '#/parties' };
  return ROUTES[h] || ROUTES['#/'];
}

let scrollMemo = {};
function render() {
  const h = location.hash || '#/';
  const r = currentRoute();
  document.getElementById('page-title').textContent = r.title;
  document.getElementById('back-btn').hidden = !r.back && !['#/history', '#/reports', '#/search', '#/settings'].includes(h) && !h.startsWith('#/party/');
  document.getElementById('back-btn').dataset.to = r.back || (h.startsWith('#/party/') ? '#/parties' : '#/');
  document.querySelectorAll('.navitem').forEach((b) => b.classList.toggle('on', b.dataset.tab === r.tab));
  app.scrollTop = 0;
  try {
    r.view(app);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="card">${icon('alert')}<b>Kuch galat ho gaya</b><p class="muted sm">${e.message}</p><button class="btn primary" data-act="go" data-h="#/">Home par jao</button></div>`;
  }
  document.getElementById('sync-dot').classList.toggle('warn', !!getLastError());
}
ctx.refresh = render;
window.addEventListener('hashchange', render);
document.getElementById('back-btn').innerHTML = icon('chevL');
document.getElementById('search-btn').innerHTML = icon('search');

A.go = (el) => {
  closeAllSheets();
  ctx.go(el.dataset.h);
};
A.qa = (el) => {
  const v = el.dataset.v;
  if (v === 'stock') {
    ctx.go('#/stock');
    setTimeout(() => document.querySelector('[data-act=prodAdd]')?.click(), 30);
  } else if (v === 'sale') T.openSale('quick');
  else if (v === 'purchase') T.openPurchase({ mode: 'add' });
  else if (v === 'expense') T.openExpense();
};
document.getElementById('back-btn').addEventListener('click', (e) => (location.hash = e.currentTarget.dataset.to));

/* ---------- shop switcher ---------- */
A.shopSwitch = () => {
  const names = store.get().settings.shopNames;
  sheet({
    title: 'Shop Chuno',
    body: `<div class="form shoppick">
      <button class="li" data-act="shopPick" data-v="s1">${icon('store')}<span class="grow">${names.s1}</span>${ctx.shop === 's1' ? icon('check') : ''}</button>
      <button class="li" data-act="shopPick" data-v="s2">${icon('store')}<span class="grow">${names.s2}</span>${ctx.shop === 's2' ? icon('check') : ''}</button>
      <button class="li" data-act="shopPick" data-v="all">${icon('chart')}<span class="grow">All Shops (Combined)</span>${ctx.shop === 'all' ? icon('check') : ''}</button>
    </div>`,
  });
};
A.shopPick = (el) => {
  setShop(el.dataset.v);
  document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
  render();
};

/* ---------- hamburger menu ---------- */
A.menu = () => {
  sheet({
    title: 'Menu',
    body: `<div class="form menu-list">
      <button class="li" data-act="go" data-h="#/history">${icon('history')}<span class="grow">History</span></button>
      <button class="li" data-act="go" data-h="#/reports">${icon('chart')}<span class="grow">Reports</span></button>
      <button class="li" data-act="go" data-h="#/expenses">${icon('rupee')}<span class="grow">Expenses</span></button>
      <button class="li" data-act="go" data-h="#/settings">${icon('settings')}<span class="grow">Settings / Backup</span></button>
      <button class="li" data-act="lockNow">${icon('lock')}<span class="grow">Lock App</span></button>
    </div>`,
  });
};
A.lockNow = () => {
  document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
  document.dispatchEvent(new CustomEvent('msm:lock'));
};
document.addEventListener('msm:lock', () => {
  flush();
  relock();
});

/* ---------- floating bubble button ---------- */
const fab = document.getElementById('fab');
const fabMenu = document.getElementById('fab-menu');
let fabOpen = false;
function setFab(open) {
  fabOpen = open;
  fab.classList.toggle('open', open);
  fabMenu.classList.toggle('open', open);
  fabMenu.hidden = !open;
  fab.setAttribute('aria-expanded', String(open));
}
fab.addEventListener('click', () => setFab(!fabOpen));
fabMenu.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  setFab(false);
  if (b.dataset.v === 'stock') {
    ctx.go('#/stock');
    setTimeout(() => document.querySelector('[data-act=prodAdd]')?.click(), 30);
  } else if (b.dataset.v === 'sale') {
    T.openSale('quick');
  } else if (b.dataset.v === 'purchase') {
    T.openPurchase({ mode: 'add' });
  } else if (b.dataset.v === 'expense') {
    T.openExpense();
  }
});
document.addEventListener('click', (e) => {
  if (fabOpen && !e.target.closest('#fab') && !e.target.closest('#fab-menu')) setFab(false);
});

/* ---------- nav bar (built once) ---------- */
document.getElementById('bottom-nav').innerHTML = NAV.map(
  ([h, ic, l]) => `<button class="navitem" data-act="go" data-h="${h}" data-tab="${h === '#/' ? 'home' : h.slice(2)}">${icon(ic)}<span>${l}</span></button>`
).join('');

/* ---------- online/offline banner ---------- */
function syncOffline() {
  document.getElementById('offline-banner').hidden = navigator.onLine;
}
window.addEventListener('online', syncOffline);
window.addEventListener('offline', syncOffline);

/* ---------- persistence wiring ---------- */
store.onPersist((s) => saveState(s));
window.addEventListener('msm:save-error', () => toast('Save nahi ho paya — storage bhara ho sakta hai', 'err'));
window.addEventListener('msm:saved', () => document.getElementById('sync-dot').classList.remove('warn'));

/* ---------- service worker (offline support) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

/* ---------- boot ---------- */
async function boot() {
  const saved = await kvGet('state');
  if (saved) store.load(saved);
  document.getElementById('boot-splash')?.remove();
  await ensureUnlocked();
  await askPersistent();
  syncOffline();
  render();
}
boot();
