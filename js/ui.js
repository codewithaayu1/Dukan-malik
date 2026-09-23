// Shared UI pieces: icons, toast, bottom sheet, confirm dialog, chips, stepper, product picker.
import { esc, inr, fmtTime, inputDate, inputTime, fromInputs, PERIODS, rangeFor } from './utils.js';
import * as store from './store.js';

/* ---------- icons ---------- */
const P = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.6 12.4a1 1 0 001 .8h9.8a1 1 0 001-.8L21 7H6"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14.6c2.8.2 4.5 2 4.5 4.9"/>',
  wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><path d="M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  history: '<path d="M3 12a9 9 0 103-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15L6 16z"/><path d="M10 21h4"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4 17l5-4 4 3 3-2 4 3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  upload: '<path d="M12 16V5"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  alert: '<path d="M12 4l9 16H3L12 4z"/><path d="M12 10v5M12 18v.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9"/><path d="M5 12v8h14v-8"/><path d="M10 20v-4h4v4"/>',
  rupee: '<path d="M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 7"/>',
  share: '<circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  filter: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 01-.6-8.9A6 6 0 0118 10.5 3.8 3.8 0 0117.5 18H7z"/>',
  file: '<path d="M6 3h8l4 4v14H6V3z"/><path d="M14 3v4h4"/>',
  sliders: '<path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2.2"/><circle cx="15" cy="16" r="2.2"/>',
  logout: '<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4"/><path d="M19 12H9"/>',
  wifiOff: '<path d="M3 3l18 18"/><path d="M5 12.5a10 10 0 015-2.6M19 12.5a10 10 0 00-3.5-2.2"/><path d="M8.5 16a5 5 0 016.5-.4"/><circle cx="12" cy="19" r=".8"/>',
};
export const icon = (n, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---------- shared context ---------- */
export const ctx = {
  shop: localStorage.getItem('msm_shop') || 's1',
  refresh: () => {},
  go: (h) => (location.hash === h ? ctx.refresh() : (location.hash = h)),
};
export function setShop(id) {
  ctx.shop = id;
  localStorage.setItem('msm_shop', id);
}

/* ---------- delegated event registries ---------- */
export const A = {}; // click actions:   data-act="name"
export const I = { stepin() {} }; // input handlers:  data-in="name"
export const C = {}; // change handlers: data-ch="name"
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = A[el.dataset.act];
  if (f) f(el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-in]');
  if (el && I[el.dataset.in]) I[el.dataset.in](el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-ch]');
  if (el && C[el.dataset.ch]) C[el.dataset.ch](el, e);
});
document.addEventListener('focusin', (e) => {
  const el = e.target.closest('[data-in="pick"]');
  if (el && I.pick) I.pick(el, e);
});

/* ---------- toast ---------- */
export function toast(msg, kind = 'ok') {
  const box = document.getElementById('toasts');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  t.innerHTML = icon(kind === 'err' ? 'alert' : 'check') + `<span>${esc(msg)}</span>`;
  box.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => {
    t.classList.remove('in');
    setTimeout(() => t.remove(), 250);
  }, kind === 'err' ? 3800 : 2200);
}
export const fail = (e) => toast(e?.message || 'Kuch galat ho gaya', 'err');

/* ---------- bottom sheet ---------- */
const openSheets = [];
export function sheet({ title, body, onMount, full = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="scrim"></div><div class="sheet ${full ? 'full' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="grab"></div>
    <div class="sheet-h"><h3>${esc(title)}</h3><button class="icon-btn" data-sheet-close aria-label="Band karo">${icon('x')}</button></div>
    <div class="sheet-b">${body}</div></div>`;
  document.body.appendChild(wrap);
  const close = () => {
    const i = openSheets.indexOf(api);
    if (i >= 0) openSheets.splice(i, 1);
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 220);
  };
  wrap.querySelector('.scrim').onclick = close;
  wrap.querySelector('[data-sheet-close]').onclick = close;
  requestAnimationFrame(() => wrap.classList.add('open'));
  const root = wrap.querySelector('.sheet-b');
  const api = { close, root, el: wrap };
  openSheets.push(api);
  if (onMount) onMount(root, close);
  return api;
}
export const closeTopSheet = () => {
  const s = openSheets[openSheets.length - 1];
  if (s) s.close();
  return !!s;
};
export const closeAllSheets = () => [...openSheets].forEach((s) => s.close());
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeTopSheet());

export function confirmBox({ title = 'Pakka?', message = '', ok = 'Haan', danger = false, cancel = 'Nahi' }) {
  return new Promise((res) => {
    const w = document.createElement('div');
    w.className = 'dialog-wrap';
    w.innerHTML = `<div class="scrim"></div><div class="dialog" role="alertdialog" aria-modal="true">
      <h3>${esc(title)}</h3><p>${esc(message)}</p>
      <div class="row gap"><button class="btn ghost grow" data-x="0">${esc(cancel)}</button>
      <button class="btn ${danger ? 'danger' : 'primary'} grow" data-x="1">${esc(ok)}</button></div></div>`;
    document.body.appendChild(w);
    requestAnimationFrame(() => w.classList.add('open'));
    const done = (v) => {
      w.classList.remove('open');
      setTimeout(() => w.remove(), 180);
      res(v);
    };
    w.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => done(b.dataset.x === '1')));
    w.querySelector('.scrim').onclick = () => done(false);
  });
}

/* ---------- small components ---------- */
export const badge = (txt, cls = '') => `<span class="badge ${cls}">${esc(txt)}</span>`;

export function sourceBadge(source, partyName) {
  return source === 'OTHER' ? badge('Other: ' + (partyName || 'Shop'), 'amber') : badge('Own Shop', 'green');
}

export function empty(ic, title, sub = '', btn = '') {
  return `<div class="empty"><div class="empty-ic">${icon(ic)}</div><b>${esc(title)}</b><p>${esc(sub)}</p>${btn}</div>`;
}

export function chips(name, options, selected, { cls = '' } = {}) {
  return `<div class="chips ${cls}" data-chips="${name}">${options
    .map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<button type="button" class="chip ${v === selected ? 'on' : ''}" data-act="chip" data-v="${esc(v)}">${esc(l)}</button>`;
    })
    .join('')}</div>`;
}
A.chip = (el) => {
  const g = el.closest('[data-chips]');
  g.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === el));
  g.dispatchEvent(new CustomEvent('chipchange', { bubbles: true, detail: el.dataset.v }));
};
export const chipVal = (root, name) => root.querySelector(`[data-chips="${name}"] .chip.on`)?.dataset.v || '';
export const setChip = (root, name, v) =>
  root.querySelectorAll(`[data-chips="${name}"] .chip`).forEach((c) => c.classList.toggle('on', c.dataset.v === v));

// Payment method chips with icons (like the reference screens)
export function methodChips(name, list, selected) {
  const ic = { Cash: 'rupee', UPI: 'wallet', Card: 'file', Bank: 'store', Other: 'sliders' };
  return `<div class="chips methods" data-chips="${name}">${list
    .map((m) => `<button type="button" class="chip ${m === selected ? 'on' : ''}" data-act="chip" data-v="${m}">${icon(ic[m] || 'wallet')}<span>${m}</span></button>`)
    .join('')}</div>`;
}

export function stepper(name, value = 1, min = 1, extra = 'data-in="stepin"') {
  return `<div class="stepper"><button type="button" data-act="step" data-d="-1" aria-label="Kam karo">${icon('minus')}</button>
    <input name="${name}" type="number" inputmode="numeric" min="${min}" step="1" value="${value}" data-min="${min}" ${extra}>
    <button type="button" data-act="step" data-d="1" aria-label="Badhao">${icon('plus')}</button></div>`;
}
A.step = (el) => {
  const inp = el.parentElement.querySelector('input');
  const min = Number(inp.dataset.min ?? 1);
  const max = inp.max !== '' ? Number(inp.max) : Infinity;
  let v = Math.round(Number(inp.value) || 0) + Number(el.dataset.d);
  if (v < min) v = min;
  if (v > max) {
    v = max;
    toast(`Stock me sirf ${max} hain`, 'err');
  }
  inp.value = v;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
};

export const field = (label, inner, hint = '') =>
  `<label class="field"><span class="lbl">${esc(label)}</span>${inner}${hint ? `<small class="hint">${esc(hint)}</small>` : ''}</label>`;

export const select = (name, list, selected, attrs = '') =>
  `<select name="${name}" ${attrs}>${list
    .map((o) => {
      const [v, l] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(l)}</option>`;
    })
    .join('')}</select>`;

// Date + time inputs (defaults to "now"; user can back-date)
export function dtFields(prefix = 'dt', ts = Date.now()) {
  return `<div class="two">${field('Date', `<input type="date" name="${prefix}_d" value="${inputDate(ts)}" max="${inputDate(Date.now() + 86400000)}">`)}
  ${field('Time', `<input type="time" name="${prefix}_t" value="${inputTime(ts)}">`)}</div>`;
}
export const readDT = (root, prefix = 'dt') =>
  fromInputs(root.querySelector(`[name=${prefix}_d]`)?.value, root.querySelector(`[name=${prefix}_t]`)?.value);

// Shop picker used inside forms when "All Shops" is the active view
export function shopField(selected) {
  if (ctx.shop !== 'all') return `<input type="hidden" name="shop" value="${ctx.shop}">`;
  const sel = selected && selected !== 'all' ? selected : 's1';
  return field('Kaunsi shop?', select('shop', store.SHOP_IDS.map((id) => [id, store.shopName(id)]), sel));
}
export const readShop = (root) => root.querySelector('[name=shop]')?.value || (ctx.shop === 'all' ? 's1' : ctx.shop);
export const v = (root, name) => root.querySelector(`[name="${name}"]`)?.value ?? '';

/* ---------- period chips (Today / Yesterday / This Week ...) ---------- */
export const SCOPES = {}; // scope -> { state:{key,from,to}, paint:()=>void }
export function periodBar(scope, st, list = PERIODS) {
  return `<div class="hscroll chips period" data-scope="${scope}">${list
    .map(([k, l]) => `<button class="chip ${st.key === k ? 'on' : ''}" data-act="period" data-scope="${scope}" data-v="${k}">${l}</button>`)
    .join('')}</div>${
    st.key === 'custom'
      ? `<div class="two custom-range"><label class="field"><span class="lbl">From</span><input type="date" data-in="pdate" data-scope="${scope}" data-k="from" value="${st.from || ''}"></label>
         <label class="field"><span class="lbl">To</span><input type="date" data-in="pdate" data-scope="${scope}" data-k="to" value="${st.to || ''}"></label></div>`
      : ''
  }`;
}
A.period = (el) => {
  const s = SCOPES[el.dataset.scope];
  if (!s) return;
  s.state.key = el.dataset.v;
  if (s.state.key === 'custom' && !s.state.from) {
    s.state.from = inputDate(Date.now() - 6 * 86400000);
    s.state.to = inputDate();
  }
  s.paint();
};
I.pdate = (el) => {
  const s = SCOPES[el.dataset.scope];
  if (!s) return;
  s.state[el.dataset.k] = el.value;
  s.paintData ? s.paintData() : s.paint();
};
export const rangeOf = (st) => rangeFor(st.key, st);

/* ---------- product picker (fast search) ---------- */
export const PICKERS = {}; // id -> { filter(p), onPick(p), max }
export function pickerHTML(id, placeholder = 'Product ka naam likho...') {
  return `<div class="picker" data-picker="${id}"><label class="search">${icon('search')}<input data-in="pick" data-pk="${id}" placeholder="${esc(placeholder)}" autocomplete="off" enterkeyhint="search"></label><div class="pick-list"></div></div>`;
}
I.pick = (el) => {
  const cfg = PICKERS[el.dataset.pk];
  const box = el.closest('.picker')?.querySelector('.pick-list');
  if (!cfg || !box) return;
  const q = el.value.trim().toLowerCase();
  const list = store
    .get()
    .products.filter((p) => (ctx.shop === 'all' || p.shopId === ctx.shop) && cfg.filter(p))
    .filter((p) => !q || `${p.name} ${p.brand} ${p.category} ${store.partyName(p.partyId)}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 8);
  if (!list.length) {
    box.innerHTML = `<div class="pick-empty">${q ? 'Koi product nahi mila' : 'Stock me koi product nahi'}</div>`;
    return;
  }
  box.innerHTML = list
    .map(
      (p) => `<button type="button" class="pitem" data-act="pickItem" data-pk="${el.dataset.pk}" data-id="${p.id}">
      <div class="grow"><b>${esc(p.name)}</b><div class="muted sm">${sourceBadge(p.source, store.partyName(p.partyId))} ${ctx.shop === 'all' ? badge(store.shopName(p.shopId)) : ''}</div></div>
      <div class="right"><b class="${p.qty <= p.min ? 'neg' : ''}">${p.qty} left</b><div class="muted sm">${inr(p.sell)}</div></div></button>`
    )
    .join('');
};
A.pickItem = (el) => {
  const cfg = PICKERS[el.dataset.pk];
  const p = store.findProduct(el.dataset.id);
  const picker = el.closest('.picker');
  picker.querySelector('.pick-list').innerHTML = '';
  picker.querySelector('input').value = '';
  if (cfg && p) cfg.onPick(p);
};
document.addEventListener('click', (e) => {
  if (!e.target.closest('.picker')) document.querySelectorAll('.pick-list').forEach((b) => (b.innerHTML = ''));
});

/* ---------- describing a transaction (for lists) ---------- */
export function describe(t) {
  const srcLbl = t.source === 'OTHER' ? `Other: ${t.partyName || ''}` : 'Own';
  switch (t.type) {
    case 'SALE':
      return { ic: 'cart', tone: 'blue', title: `Sold ${t.qty} × ${t.name}`, sub: `${t.method} · ${srcLbl}${t.customer ? ' · ' + t.customer : ''}`, amt: inr(t.total), sign: '+', cls: 'pos', label: 'SALE' };
    case 'PURCHASE':
      return { ic: 'bag', tone: 'amber', title: `Purchased ${t.qty} × ${t.name}`, sub: `From ${t.partyName} · ${t.status}`, amt: inr(t.total), sign: '', cls: 'amb', label: 'PURCHASE' };
    case 'PAYMENT':
      return { ic: 'wallet', tone: 'green', title: `Paid ${inr(t.amount)} to ${t.partyName}`, sub: `${t.method}${t.note ? ' · ' + t.note : ''}`, amt: inr(t.amount), sign: '-', cls: 'neg', label: 'PAYMENT' };
    case 'EXPENSE':
      return { ic: 'rupee', tone: 'red', title: t.category, sub: `${t.method}${t.note ? ' · ' + t.note : ''}`, amt: inr(t.amount), sign: '-', cls: 'neg', label: 'EXPENSE' };
    default:
      return { ic: 'box', tone: 'purple', title: `${t.delta > 0 ? 'Added' : 'Removed'} ${Math.abs(t.delta)} × ${t.name}`, sub: `${t.reason} · ${t.before} → ${t.after}`, amt: (t.delta > 0 ? '+' : '') + t.delta + ' pcs', sign: '', cls: '', label: 'STOCK UPDATE' };
  }
}

export function txnRow(t, { showDate = false, shopTag = false, act = 'txnOpen' } = {}) {
  const d = describe(t);
  return `<button class="li" data-act="${act}" data-id="${t.id}">
    <span class="ico tone-${d.tone}">${icon(d.ic)}</span>
    <span class="grow"><b class="ell">${esc(d.title)}</b><span class="muted sm ell">${showDate ? esc(new Date(t.ts).toLocaleDateString('en-GB') + ' · ') : ''}${fmtTime(t.ts)} · ${esc(d.sub)}${shopTag ? ' · ' + esc(store.shopName(t.shopId)) : ''}</span></span>
    <span class="right"><b class="${d.cls}">${d.sign}${d.amt}</b></span></button>`;
}
