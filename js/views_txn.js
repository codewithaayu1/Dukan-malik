// Screens: Sales (quick + detailed), Purchase (from other shops + payments), Parties (shop accounts), Expenses.
import * as store from './store.js';
import { esc, inr, num, fmtDate, fmtTime, fmtDay, fmtDayLong, inputDate, dayKey, download, toCSV, PERIODS, uid } from './utils.js';
import {
  A, I, C, ctx, icon, toast, fail, sheet, confirmBox, badge, sourceBadge, empty, chips, chipVal, setChip, methodChips, stepper, field, select,
  dtFields, readDT, shopField, readShop, v, periodBar, rangeOf, SCOPES, txnRow, pickerHTML, PICKERS,
} from './ui.js';
import { putImage, getImage, compressImage } from './storage.js';

const inShop = (x) => ctx.shop === 'all' || x.shopId === ctx.shop;
const TAB = {}; // scope -> tab key
const tabs = (scope, list, cur) =>
  `<div class="tabs">${list.map(([k, l, ic]) => `<button class="tab ${k === cur ? 'on' : ''}" data-act="tab" data-scope="${scope}" data-v="${k}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`;
const seg = (scope, list, cur) =>
  `<div class="seg">${list.map(([k, l, ic]) => `<button class="${k === cur ? 'on' : ''}" data-act="seg" data-scope="${scope}" data-v="${k}">${icon(ic)}<span>${l}</span></button>`).join('')}</div>`;
A.tab = (el) => {
  TAB[el.dataset.scope]?.(el.dataset.v);
  ctx.refresh();
};
A.seg = A.tab;
const closeSheet = (el) => el.closest('.sheet-wrap')?.querySelector('[data-sheet-close]')?.click();
const numOrEmpty = (x) => (x === '' || x == null ? '' : x);

/* =====================================================================
   SALES
   ===================================================================== */
const S = { tab: 'rec', mode: 'quick', cart: [], method: 'Cash', showDT: false, sel: null };
TAB.sales = (k) => (['rec', 'hist'].includes(k) ? (S.tab = k) : (S.mode = k));
const SH = { key: 'today', from: '', to: '', q: '' };
SCOPES.sales = { state: SH, paint: () => ctx.refresh(), paintData: () => paintSalesHist() };

export const openSale = (mode = 'quick') => {
  S.tab = 'rec';
  S.mode = mode;
  ctx.go('#/sales');
};

export function salesView(el) {
  el.innerHTML = `${tabs('sales', [['rec', 'Record Sales', 'cart'], ['hist', 'Sales History', 'history']], S.tab)}
  ${S.tab === 'rec' ? seg('sales', [['quick', 'Quick Sale', 'cart'], ['detail', 'Detailed Sale', 'file']], S.mode) : ''}
  <div id="sales-body"></div>`;
  const body = el.querySelector('#sales-body');
  if (S.tab === 'hist') return salesHistory(body);
  S.mode === 'quick' ? quickSale(body) : detailSale(body);
}

/* ----- Quick sale: search -> +/- -> one tap save ----- */
function quickSale(body) {
  S.cart = S.cart.filter((l) => store.findProduct(l.id));
  body.innerHTML = `
  <div class="card form">
    <div class="row between"><div><b>Quick Sale</b><div class="muted sm">Product search karo, quantity chuno, Save dabao</div></div><span class="ico big tone-mint">${icon('cart')}</span></div>
    ${pickerHTML('qs', 'Product search — jaise "type c"')}
    <div id="qs-cart"></div>
  </div>
  <div class="card form">
    <span class="lbl">Payment Method</span>${methodChips('qmethod', store.SALE_METHODS, S.method)}
    <button class="link left" data-act="qsDT">${icon('calendar')} ${S.showDT ? 'Abhi ka time use karo' : 'Date / time badlo (default: abhi)'}</button>
    ${S.showDT ? dtFields('qs') : ''}
  </div>
  <div class="savebar"><div><small>Total</small><b id="qs-total">₹0</b></div><button class="btn primary lg grow" data-act="qsSave">Save Sale</button></div>`;
  PICKERS.qs = {
    filter: (p) => p.qty > 0,
    onPick: (p) => {
      const l = S.cart.find((x) => x.id === p.id);
      if (l) {
        if (l.qty < p.qty) l.qty++;
        else toast(`${p.name}: sirf ${p.qty} bache hain`, 'err');
      } else S.cart.push({ id: p.id, qty: 1, price: p.sell });
      paintCart();
    },
  };
  body.querySelector('[data-chips=qmethod]').addEventListener('chipchange', (e) => (S.method = e.detail));
  paintCart();
}
function paintCart() {
  const box = document.getElementById('qs-cart');
  if (!box) return;
  box.innerHTML = S.cart.length
    ? S.cart
        .map((l) => {
          const p = store.findProduct(l.id);
          return `<div class="cline"><div class="cline-top"><div class="grow"><b>${esc(p.name)}</b><div class="muted sm">${sourceBadge(p.source, store.partyName(p.partyId))} <span>${p.qty} left</span></div></div>
          <button class="icon-btn" data-act="qsRemove" data-id="${l.id}" aria-label="Hatao">${icon('x')}</button></div>
          <div class="cl-r">${stepper('q', l.qty, 1, `data-in="qsQty" data-id="${l.id}" max="${p.qty}"`)}
          <div class="pr"><span>₹</span><input type="number" inputmode="decimal" min="0" step="any" value="${l.price}" data-in="qsPrice" data-id="${l.id}" aria-label="Selling price"></div></div></div>`;
        })
        .join('')
    : `<div class="soft-empty">${icon('cart')}<span>Abhi koi item nahi chuna</span></div>`;
  qsTotal();
}
const qsTotal = () => {
  const t = S.cart.reduce((s, l) => s + num(l.qty) * num(l.price), 0);
  const n = document.getElementById('qs-total');
  if (n) n.textContent = inr(t);
  const b = document.querySelector('[data-act=qsSave]');
  if (b) b.textContent = S.cart.length ? `Save Sale (${S.cart.reduce((s, l) => s + num(l.qty), 0)} pcs)` : 'Save Sale';
};
I.qsQty = (el) => {
  const l = S.cart.find((x) => x.id === el.dataset.id);
  if (!l) return;
  l.qty = Math.round(num(el.value));
  qsTotal();
};
I.qsPrice = (el) => {
  const l = S.cart.find((x) => x.id === el.dataset.id);
  if (l) l.price = el.value;
  qsTotal();
};
A.qsRemove = (el) => {
  S.cart = S.cart.filter((l) => l.id !== el.dataset.id);
  paintCart();
};
A.qsDT = () => {
  S.showDT = !S.showDT;
  ctx.refresh();
};
A.qsSave = (el) => {
  const root = document.getElementById('sales-body');
  try {
    const ts = S.showDT ? readDT(root, 'qs') : Date.now();
    const out = store.addSales(S.cart.map((l) => ({ productId: l.id, qty: l.qty, price: l.price })), { method: S.method, ts });
    const total = out.reduce((s, t) => s + t.total, 0);
    S.cart = [];
    S.showDT = false;
    toast(`Sale save ho gayi · ${inr(total)}`);
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};

/* ----- Detailed sale ----- */
let dMethod = 'Cash';
function detailSale(body) {
  const p = store.findProduct(S.sel);
  if (!p) S.sel = null;
  body.innerHTML = `
  <div class="card form" id="ds-form">
    <div class="row between"><div><b>New Sale</b><div class="muted sm">Details bharo, total apne aap banega</div></div><span class="ico big tone-mint">${icon('cart')}</span></div>
    ${pickerHTML('ds', 'Product search karo...')}
    <div id="ds-sel"></div>
    <div class="two">${field('Quantity', stepper('qty', 1, 1, 'data-in="dsCalc"'))}${field('Selling Price ₹', `<input name="price" type="number" inputmode="decimal" min="0" step="any" data-in="dsCalc" placeholder="0">`)}</div>
    ${field('Discount ₹ (optional)', `<input name="discount" type="number" inputmode="decimal" min="0" step="any" data-in="dsCalc" placeholder="0">`)}
    <div class="totals"><div><span>Subtotal</span><b id="ds-sub">₹0</b></div><div><span>Discount</span><b id="ds-disc">₹0</b></div><div class="grand"><span>Total</span><b id="ds-total">₹0</b></div></div>
    <span class="lbl">Payment Method</span>${methodChips('dmethod', store.SALE_METHODS, dMethod)}
    <div class="two">${field('Customer name (optional)', '<input name="customer" placeholder="Naam" autocomplete="off">')}${field('Phone (optional)', '<input name="phone" type="tel" inputmode="tel" placeholder="Mobile number">')}</div>
    ${field('Note (optional)', '<input name="note" placeholder="Koi note">')}
    ${dtFields('ds')}
  </div>
  <div class="savebar"><div><small>Total</small><b id="ds-total2">₹0</b></div><button class="btn primary lg grow" data-act="dsSave">Save Sale</button></div>`;
  PICKERS.ds = { filter: (x) => x.qty > 0, onPick: (x) => selectProduct(x) };
  body.querySelector('[data-chips=dmethod]').addEventListener('chipchange', (e) => (dMethod = e.detail));
  if (S.sel) selectProduct(store.findProduct(S.sel), true);
  else showSel(null);
}
function showSel(p) {
  const box = document.getElementById('ds-sel');
  if (!box) return;
  box.innerHTML = p
    ? `<div class="selected"><div class="grow"><b>${esc(p.name)}</b><div class="muted sm">${sourceBadge(p.source, store.partyName(p.partyId))} · ${p.qty} pcs stock · Source apne aap detect hua</div></div><button class="icon-btn" data-act="dsClear" aria-label="Hatao">${icon('x')}</button></div>`
    : `<div class="soft-empty">${icon('search')}<span>Upar se product chuno</span></div>`;
}
function selectProduct(p, keep = false) {
  S.sel = p.id;
  showSel(p);
  const root = document.getElementById('ds-form');
  const qty = root.querySelector('[name=qty]');
  qty.max = p.qty;
  if (!keep) {
    qty.value = 1;
    root.querySelector('[name=price]').value = p.sell;
  }
  calcSale();
}
A.dsClear = () => {
  S.sel = null;
  showSel(null);
  const q = document.querySelector('#ds-form [name=qty]');
  if (q) q.removeAttribute('max');
  calcSale();
};
function calcSale() {
  const r = document.getElementById('ds-form');
  if (!r) return;
  const sub = num(v(r, 'qty')) * num(v(r, 'price'));
  const disc = Math.min(num(v(r, 'discount')), sub);
  r.querySelector('#ds-sub').textContent = inr(sub);
  r.querySelector('#ds-disc').textContent = inr(disc);
  r.querySelector('#ds-total').textContent = inr(sub - disc);
  const t2 = document.getElementById('ds-total2');
  if (t2) t2.textContent = inr(sub - disc);
}
I.dsCalc = calcSale;
A.dsSave = () => {
  const r = document.getElementById('ds-form');
  try {
    if (!S.sel) throw new Error('Pehle product chuno');
    const out = store.addSales([{ productId: S.sel, qty: v(r, 'qty'), price: v(r, 'price'), discount: v(r, 'discount') }], {
      method: dMethod, customer: v(r, 'customer'), phone: v(r, 'phone'), note: v(r, 'note'), ts: readDT(r, 'ds'),
    })[0];
    S.sel = null;
    toast(`${out.name} × ${out.qty} = ${inr(out.total)} · sale save ho gayi`);
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};

/* ----- Sales history ----- */
function salesHistory(body) {
  body.innerHTML = `<label class="search">${icon('search')}<input data-in="salesQ" placeholder="Product, customer, phone..." value="${esc(SH.q)}" autocomplete="off"></label>
  ${periodBar('sales', SH, [...PERIODS.slice(0, 4), ['all', 'All Time'], PERIODS[4]])}
  <div id="sales-hist"></div><div class="spacer"></div>`;
  paintSalesHist();
}
I.salesQ = (el) => {
  SH.q = el.value;
  paintSalesHist();
};
function paintSalesHist() {
  const box = document.getElementById('sales-hist');
  if (!box) return;
  const [f, t] = rangeOf(SH);
  const q = SH.q.trim().toLowerCase();
  const list = store
    .get()
    .txns.filter((x) => x.type === 'SALE' && inShop(x) && x.ts >= f && x.ts <= t)
    .filter((x) => !q || `${x.name} ${x.customer} ${x.phone} ${x.note} ${x.method} ${x.partyName}`.toLowerCase().includes(q))
    .sort((a, b) => b.ts - a.ts);
  if (!list.length) {
    box.innerHTML = empty('cart', 'Is period me koi sale nahi', 'Record Sales me jaakar sale add karo.');
    return;
  }
  const tot = list.reduce((s, x) => s + x.total, 0);
  const own = list.filter((x) => x.source !== 'OTHER').reduce((s, x) => s + x.total, 0);
  const groups = new Map();
  list.forEach((x) => {
    const k = dayKey(x.ts);
    groups.set(k, [...(groups.get(k) || []), x]);
  });
  box.innerHTML = `<div class="card stat-strip"><div><small>Total Sales</small><b class="pos">${inr(tot)}</b></div><div><small>Own</small><b>${inr(own)}</b></div><div><small>Other shop items</small><b>${inr(tot - own)}</b></div><div><small>Entries</small><b>${list.length}</b></div></div>` +
    [...groups.values()].map((arr) => `<div class="day-h"><b>${fmtDayLong(arr[0].ts)}</b><span class="pos sm">${inr(arr.reduce((s, x) => s + x.total, 0))}</span></div><div class="card list">${arr.map((x) => txnRow(x, { shopTag: ctx.shop === 'all' })).join('')}</div>`).join('');
}

/* =====================================================================
   PURCHASE (from other shops) + PAYMENTS
   ===================================================================== */
const PU = { tab: 'rec', mode: 'add', status: 'UNPAID', method: 'Cash', payMethod: 'Cash', partyId: '', shopId: '', prefill: null };
TAB.purchase = (k) => (['rec', 'hist'].includes(k) ? (PU.tab = k) : (PU.mode = k));
const PH = { key: 'month', from: '', to: '', party: 'all', q: '' };
SCOPES.purch = { state: PH, paint: () => ctx.refresh(), paintData: () => paintPurchHist() };

export function openPurchase(o = {}) {
  PU.tab = 'rec';
  PU.mode = o.mode || 'add';
  PU.prefill = o;
  if (o.partyId) PU.partyId = o.partyId;
  ctx.go('#/purchase');
}
document.addEventListener('msm:open-purchase', (e) => openPurchase(e.detail || {}));

const partyOptions = (withPending = false, shop = ctx.shop) =>
  store.get().parties.map((p) => [p.id, withPending ? `${p.name} — pending ${inr(store.partyStats(p.id, shop).pending)}` : p.name]);

export function purchaseView(el) {
  el.innerHTML = `${tabs('purchase', [['rec', 'Purchase', 'cart'], ['hist', 'Purchase History', 'history']], PU.tab)}
  ${PU.tab === 'rec' ? seg('purchase', [['add', 'Add Purchase', 'plus'], ['pay', 'Make Payment', 'wallet']], PU.mode) : ''}
  <div id="pu-body"></div>`;
  const body = el.querySelector('#pu-body');
  if (PU.tab === 'hist') return purchHistory(body);
  PU.mode === 'add' ? addPurchaseForm(body) : payForm(body);
}

function addPurchaseForm(body) {
  const parties = store.get().parties;
  const pre = PU.prefill || {};
  PU.prefill = null;
  if (!parties.some((p) => p.id === PU.partyId)) PU.partyId = parties[0]?.id || '';
  const preProduct = pre.productId ? store.findProduct(pre.productId) : null;
  body.innerHTML = !parties.length
    ? `<div class="card">${empty('store', 'Pehle dusri shop add karo', 'Jis shop se maal lete ho uska naam daalo, phir purchase likh sakte ho.', `<button class="btn primary" data-act="partyNew">${icon('plus')} Add Other Shop</button>`)}</div>`
    : `<div class="card form" id="pu-form">
    <div class="row between"><div><b>Add Purchase</b><div class="muted sm">Dusri shop se liya maal — stock aur pending dono badhenge</div></div><span class="ico big tone-amber">${icon('bag')}</span></div>
    ${shopField(pre.shopId)}
    <div class="field"><span class="lbl">Other Shop *</span><div class="row gap">${select('party', partyOptions(), PU.partyId, 'data-ch="puParty" class="grow"')}<button type="button" class="btn ghost sq" data-act="partyNew" aria-label="Nayi shop add karo">${icon('plus')}</button></div></div>
    ${field('Product *', `<input name="pname" list="pu-dl" data-in="puName" placeholder="Naam likho ya list se chuno" autocomplete="off" value="${esc(preProduct?.name || '')}"><datalist id="pu-dl"></datalist>`)}
    <p class="hint-line" id="pu-match"></p>
    <div id="pu-new" class="two-wrap">
      <div class="two">${field('Category', select('category', store.CATEGORIES, 'Charger'))}${field('Brand (optional)', '<input name="brand" placeholder="e.g. Mi">')}</div>
      ${field('Minimum stock', '<input name="min" type="number" inputmode="numeric" min="0" step="1" value="5">', 'Low stock alert ke liye')}
    </div>
    <div class="two">${field('Quantity *', stepper('qty', 1, 1, 'data-in="puCalc"'))}${field('Purchase Price ₹ (each) *', '<input name="unit" type="number" inputmode="decimal" min="0" step="any" data-in="puCalc" placeholder="0">')}</div>
    ${field('Selling Price ₹ *', '<input name="sell" type="number" inputmode="decimal" min="0" step="any" placeholder="Customer ko kitne me bechoge">')}
    <div class="totals"><div class="grand"><span>Total Amount</span><b id="pu-total">₹0</b></div></div>
    <div class="field"><span class="lbl">Payment Status</span>${chips('status', [['PAID', 'Paid'], ['PARTIAL', 'Partial'], ['UNPAID', 'Unpaid']], PU.status, { cls: 'status' })}</div>
    <div id="pu-partial" hidden>${field('Abhi kitna diya ₹', '<input name="paid" type="number" inputmode="decimal" min="0" step="any" placeholder="0">')}</div>
    <div id="pu-method" hidden><span class="lbl">Kis se diya?</span>${methodChips('pmethod', store.PAYOUT_METHODS, PU.method)}</div>
    ${dtFields('pu')}
    <div class="two">${field('Bill no. (optional)', '<input name="bill" placeholder="Bill number">')}${field('Note (optional)', '<input name="note" placeholder="Koi note">')}</div>
  </div>
  <div class="savebar two-btn"><button class="btn ghost" data-act="puSave" data-again="1">Save & Add Another</button><button class="btn primary lg grow" data-act="puSave">Save Purchase</button></div>`;
  if (!parties.length) return;
  const root = document.getElementById('pu-form');
  if (pre.shopId && root.querySelector('select[name=shop]')) root.querySelector('select[name=shop]').value = pre.shopId;
  root.querySelector('[data-chips=status]').addEventListener('chipchange', (e) => ((PU.status = e.detail), puStatusUI()));
  root.querySelector('[data-chips=pmethod]').addEventListener('chipchange', (e) => (PU.method = e.detail));
  root.querySelector('select[name=shop]')?.setAttribute('data-ch', 'puParty');
  puMatch();
  puStatusUI();
  puCalc();
  if (preProduct) root.querySelector('[name=qty]').focus();
}
function puStatusUI() {
  const r = document.getElementById('pu-form');
  if (!r) return;
  r.querySelector('#pu-partial').hidden = PU.status !== 'PARTIAL';
  r.querySelector('#pu-method').hidden = PU.status === 'UNPAID';
}
function puCalc() {
  const r = document.getElementById('pu-form');
  if (!r) return;
  r.querySelector('#pu-total').textContent = inr(num(v(r, 'qty')) * num(v(r, 'unit')));
}
I.puCalc = puCalc;
function puMatch() {
  const r = document.getElementById('pu-form');
  if (!r) return;
  PU.partyId = v(r, 'party') || PU.partyId;
  const shop = readShop(r);
  const list = store.get().products.filter((p) => p.shopId === shop && p.source === 'OTHER' && p.partyId === PU.partyId);
  r.querySelector('#pu-dl').innerHTML = list.map((p) => `<option value="${esc(p.name)}"></option>`).join('');
  const name = v(r, 'pname').trim().toLowerCase();
  const hit = name ? list.find((p) => p.name.toLowerCase() === name) : null;
  r.querySelector('#pu-new').hidden = !!hit;
  const hint = r.querySelector('#pu-match');
  const sell = r.querySelector('[name=sell]');
  if (hit) {
    hint.textContent = `Pehle se stock me hai: ${hit.qty} pcs · avg cost ${inr(hit.buy)} · quantity is me judegi.`;
    if (!sell.value || sell.dataset.auto) {
      sell.value = hit.sell;
      sell.dataset.auto = '1';
    }
  } else {
    hint.textContent = name ? 'Naya product — category, selling price bharo.' : '';
    if (sell.dataset.auto) {
      sell.value = '';
      delete sell.dataset.auto;
    }
  }
}
I.puName = puMatch;
C.puParty = puMatch;
A.puSave = (el) => {
  const r = document.getElementById('pu-form');
  try {
    const shopId = readShop(r);
    const name = v(r, 'pname').trim();
    const list = store.get().products.filter((p) => p.shopId === shopId && p.source === 'OTHER' && p.partyId === v(r, 'party'));
    const hit = list.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const res = store.addPurchase({
      shopId, partyId: v(r, 'party'), productId: hit?.id, name, category: v(r, 'category'), brand: v(r, 'brand'), min: v(r, 'min'),
      qty: v(r, 'qty'), unitCost: v(r, 'unit'), sell: v(r, 'sell'), status: PU.status, paid: v(r, 'paid'), method: PU.method,
      ts: readDT(r, 'pu'), billNo: v(r, 'bill'), note: v(r, 'note'),
    });
    const st = store.partyStats(res.purchase.partyId, shopId);
    toast(`${res.purchase.name} × ${res.purchase.qty} = ${inr(res.purchase.total)} · ${res.purchase.partyName} ka pending ${inr(st.pending)}`);
    if (el.dataset.again) {
      PU.prefill = { shopId };
      ctx.refresh();
    } else {
      PU.status = 'UNPAID';
      ctx.go('#/party/' + res.purchase.partyId);
    }
  } catch (e) {
    fail(e);
  }
};

/* ----- Make payment ----- */
function payForm(body) {
  const parties = store.get().parties;
  const pre = PU.prefill || {};
  PU.prefill = null;
  if (!parties.length) {
    body.innerHTML = `<div class="card">${empty('store', 'Koi other shop nahi', 'Pehle shop add karo, phir payment record kar sakte ho.', `<button class="btn primary" data-act="partyNew">${icon('plus')} Add Other Shop</button>`)}</div>`;
    return;
  }
  if (!parties.some((p) => p.id === PU.partyId)) PU.partyId = parties[0].id;
  body.innerHTML = `<div class="card form" id="pay-form">
    <div class="row between"><div><b>Make Payment</b><div class="muted sm">Shop ko diya hua paisa — pending apne aap kam hoga</div></div><span class="ico big tone-green">${icon('wallet')}</span></div>
    ${shopField(pre.shopId)}
    ${field('Other Shop *', select('party', partyOptions(false), PU.partyId, 'data-ch="payParty"'))}
    <div id="pay-info"></div>
    <div class="field"><span class="lbl">Amount ₹ *</span><div class="row gap"><input class="grow" name="amount" type="number" inputmode="decimal" min="0" step="any" placeholder="0"><button type="button" class="btn ghost" data-act="payFull">Poora pending</button></div></div>
    <span class="lbl">Payment Method</span>${methodChips('paymethod', store.PAYOUT_METHODS, PU.payMethod)}
    ${dtFields('pay')}
    ${field('Note (optional)', '<input name="note" placeholder="Koi note">')}
  </div>
  <div class="savebar"><button class="btn primary lg grow" data-act="paySave">Save Payment</button></div>`;
  const r = document.getElementById('pay-form');
  r.querySelector('[data-chips=paymethod]').addEventListener('chipchange', (e) => (PU.payMethod = e.detail));
  r.querySelector('select[name=shop]')?.setAttribute('data-ch', 'payParty');
  payInfo();
}
function payInfo() {
  const r = document.getElementById('pay-form');
  if (!r) return;
  PU.partyId = v(r, 'party');
  const st = store.partyStats(PU.partyId, readShop(r));
  r.querySelector('#pay-info').innerHTML = `<div class="mini3"><div><small>Total</small><b>${inr(st.bought)}</b></div><div><small>Paid</small><b class="pos">${inr(st.paid)}</b></div><div><small>Pending</small><b class="${st.pending > 0 ? 'neg' : ''}">${inr(st.pending)}</b></div></div>`;
}
C.payParty = payInfo;
A.payFull = () => {
  const r = document.getElementById('pay-form');
  const p = store.partyStats(v(r, 'party'), readShop(r)).pending;
  if (p <= 0) return toast('Is shop ka koi pending nahi hai', 'err');
  r.querySelector('[name=amount]').value = p;
};
A.paySave = () => {
  const r = document.getElementById('pay-form');
  try {
    const shopId = readShop(r);
    const t = store.addPayment({ shopId, partyId: v(r, 'party'), amount: v(r, 'amount'), method: PU.payMethod, ts: readDT(r, 'pay'), note: v(r, 'note') });
    const st = store.partyStats(t.partyId, shopId);
    toast(`${inr(t.amount)} payment save · ${t.partyName} ka pending ${inr(st.pending)}`);
    ctx.go('#/party/' + t.partyId);
  } catch (e) {
    fail(e);
  }
};

/* ----- Purchase history (purchases + payments) ----- */
function purchHistory(body) {
  body.innerHTML = `<label class="search">${icon('search')}<input data-in="purQ" placeholder="Shop, product, bill no..." value="${esc(PH.q)}" autocomplete="off"></label>
  ${field('Shop', select('phParty', [['all', 'Sabhi shops'], ...partyOptions()], PH.party, 'data-ch="phParty"'))}
  ${periodBar('purch', PH, [...PERIODS.slice(0, 4), ['all', 'All Time'], PERIODS[4]])}
  <div id="pur-hist"></div><div class="spacer"></div>`;
  paintPurchHist();
}
I.purQ = (el) => {
  PH.q = el.value;
  paintPurchHist();
};
C.phParty = (el) => {
  PH.party = el.value;
  paintPurchHist();
};
function paintPurchHist() {
  const box = document.getElementById('pur-hist');
  if (!box) return;
  const [f, t] = rangeOf(PH);
  const q = PH.q.trim().toLowerCase();
  const list = store
    .get()
    .txns.filter((x) => (x.type === 'PURCHASE' || x.type === 'PAYMENT') && inShop(x) && x.ts >= f && x.ts <= t && (PH.party === 'all' || x.partyId === PH.party))
    .filter((x) => !q || `${x.name} ${x.partyName} ${x.billNo} ${x.note} ${x.method}`.toLowerCase().includes(q))
    .sort((a, b) => b.ts - a.ts);
  if (!list.length) {
    box.innerHTML = empty('bag', 'Koi purchase/payment nahi', 'Is filter me abhi kuch nahi hai.');
    return;
  }
  const bought = list.filter((x) => x.type === 'PURCHASE').reduce((s, x) => s + x.total, 0);
  const paid = list.filter((x) => x.type === 'PAYMENT').reduce((s, x) => s + x.amount, 0);
  box.innerHTML = `<div class="card stat-strip"><div><small>Purchased</small><b>${inr(bought)}</b></div><div><small>Paid</small><b class="pos">${inr(paid)}</b></div><div><small>Difference</small><b class="neg">${inr(bought - paid)}</b></div></div><div class="card list">${list.map((x) => txnRow(x, { showDate: true, shopTag: ctx.shop === 'all' })).join('')}</div>`;
}

/* =====================================================================
   PARTIES (other shops) + ACCOUNT STATEMENT
   ===================================================================== */
const P = { q: '', sort: 'pending', hideSettled: false };
const PALETTE = ['#c2185b', '#6a4bc4', '#0f6b3f', '#e07b00', '#1f6fd6', '#b3261e', '#00796b'];
const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const colorFor = (id) => PALETTE[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % PALETTE.length];

export function partiesView(el) {
  const list = store.get().parties;
  const all = list.map((p) => ({ p, ...store.partyStats(p.id, ctx.shop) }));
  const owe = all.reduce((s, x) => s + Math.max(0, x.pending), 0);
  el.innerHTML = `<div class="tabs"><button class="tab on">${icon('store')}<span>Other Shops</span></button></div>
  <div class="row gap"><label class="search grow">${icon('search')}<input data-in="partyQ" placeholder="Shop, owner ya phone se search..." value="${esc(P.q)}" autocomplete="off"></label>
  <button class="btn ghost sq" data-act="partyFilter" aria-label="Filter">${icon('filter')}</button></div>
  <div class="card sumcard"><div class="row between"><span class="sm-ic">${icon('rupee')}<b>You will Pay (Dene hain)</b></span><b class="big neg">${inr(owe)}</b></div>
    <div class="row between muted sm"><span>Shops: ${list.length}</span><button class="btn sm primary" data-act="partyNew">${icon('plus')} Add Shop</button></div></div>
  <div id="party-list"></div><div class="spacer"></div>`;
  paintParties();
}
I.partyQ = (el) => {
  P.q = el.value;
  paintParties();
};
function paintParties() {
  const box = document.getElementById('party-list');
  if (!box) return;
  const q = P.q.trim().toLowerCase();
  let rows = store.get().parties.map((p) => ({ p, ...store.partyStats(p.id, ctx.shop) }));
  rows = rows.filter((x) => !q || `${x.p.name} ${x.p.owner} ${x.p.phone}`.toLowerCase().includes(q)).filter((x) => !P.hideSettled || x.pending > 0);
  rows.sort((a, b) => (P.sort === 'name' ? a.p.name.localeCompare(b.p.name) : b.pending - a.pending));
  if (!rows.length) {
    box.innerHTML = store.get().parties.length
      ? empty('search', 'Koi shop nahi mili', 'Search ya filter badal ke dekho.')
      : empty('store', 'Abhi koi other shop nahi', 'Jin shops se maal lete ho unhe add karo — sab hisaab yahin milega.', `<button class="btn primary" data-act="partyNew">${icon('plus')} Add Other Shop</button>`);
    return;
  }
  box.innerHTML = rows
    .map(
      (x) => `<button class="card pty" data-act="openParty" data-id="${x.p.id}"><span class="avatar" style="background:${colorFor(x.p.id)}">${esc(initials(x.p.name))}</span>
      <span class="grow"><b>${esc(x.p.name)}</b>${x.p.phone ? `<span class="muted sm">${icon('phone')} ${esc(x.p.phone)}</span>` : ''}<span class="muted sm">Total ${inr(x.bought)} · Paid ${inr(x.paid)}</span></span>
      <span class="right">${x.pending > 0 ? '<span class="tag red">PENDING</span>' : '<span class="tag green">SETTLED</span>'}<b class="${x.pending > 0 ? 'neg' : 'pos'}">${inr(x.pending)}</b></span></button>`
    )
    .join('');
}
A.partyFilter = () =>
  sheet({
    title: 'Filter / Sort',
    body: `<div class="form"><div class="field"><span class="lbl">Sort by</span>${chips('psort', [['pending', 'Sabse zyada pending'], ['name', 'Naam (A-Z)']], P.sort)}</div>
    <label class="switch-row"><span>Sirf pending wali shops</span><input type="checkbox" name="hs" ${P.hideSettled ? 'checked' : ''}></label>
    <button class="btn primary block lg" data-act="partyFilterApply">Apply</button></div>`,
  });
A.partyFilterApply = (el) => {
  const r = el.closest('.sheet-b');
  P.sort = chipVal(r, 'psort');
  P.hideSettled = r.querySelector('[name=hs]').checked;
  closeSheet(el);
  paintParties();
};
A.openParty = (el) => {
  document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
  ctx.go('#/party/' + el.dataset.id);
};

export function partyForm(p = null) {
  sheet({
    title: p ? 'Shop Edit' : 'Add Other Shop',
    body: `<div class="form">
      ${field('Shop Name *', `<input name="name" value="${esc(p?.name || '')}" placeholder="e.g. Raj Mobile Shop" autocomplete="off">`)}
      ${field('Owner Name', `<input name="owner" value="${esc(p?.owner || '')}" placeholder="Malik ka naam">`)}
      ${field('Phone', `<input name="phone" type="tel" inputmode="tel" value="${esc(p?.phone || '')}" placeholder="Mobile number">`)}
      ${field('Address (optional)', `<input name="address" value="${esc(p?.address || '')}" placeholder="Area / gali">`)}
      ${field('Notes', `<input name="notes" value="${esc(p?.notes || '')}" placeholder="Koi note">`)}
      <button class="btn primary block lg" data-act="partySave" ${p ? `data-id="${p.id}"` : ''}>${p ? 'Save Changes' : 'Add Shop'}</button></div>`,
  });
}
A.partyNew = () => partyForm();
A.partySave = (el) => {
  const r = el.closest('.sheet-b');
  const d = { name: v(r, 'name'), owner: v(r, 'owner'), phone: v(r, 'phone'), address: v(r, 'address'), notes: v(r, 'notes') };
  try {
    let p;
    if (el.dataset.id) p = store.editParty(el.dataset.id, d);
    else {
      p = store.addParty(d);
      PU.partyId = p.id;
    }
    toast(el.dataset.id ? 'Shop update ho gayi' : `${p.name} add ho gayi`);
    closeSheet(el);
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};

/* ----- Party detail: account statement ----- */
const PD = { key: 'all', from: '', to: '', q: '', id: '' };
SCOPES.pd = { state: PD, paint: () => ctx.refresh(), paintData: () => paintStatement() };

export function partyDetail(el, id) {
  const p = store.findParty(id);
  if (!p) {
    el.innerHTML = empty('store', 'Shop nahi mili', 'Ho sakta hai delete ho gayi ho.', `<button class="btn primary" data-act="go" data-h="#/parties">Parties par jao</button>`);
    return;
  }
  if (PD.id !== id) Object.assign(PD, { id, key: 'all', from: '', to: '', q: '' });
  const st = store.partyStats(id, ctx.shop);
  el.innerHTML = `
  <div class="card party-h"><div class="row gap"><span class="avatar lg" style="background:${colorFor(p.id)}">${esc(initials(p.name))}</span>
    <div class="grow"><b class="h">${esc(p.name)}</b><div class="muted sm">${esc(p.owner)}${p.address ? ' · ' + esc(p.address) : ''}</div>${p.phone ? `<a class="tel" href="tel:${esc(p.phone)}">${icon('phone')} ${esc(p.phone)}</a>` : ''}</div>
    <button class="icon-btn" data-act="partyEdit" data-id="${p.id}" aria-label="Shop edit karo">${icon('edit')}</button></div>
    <div class="mini3"><div><small>Total Purchased</small><b>${inr(st.bought)}</b></div><div><small>Paid</small><b class="pos">${inr(st.paid)}</b></div><div><small>Pending</small><b class="${st.pending > 0 ? 'neg' : 'pos'}">${inr(st.pending)}</b></div></div>
    <div class="row gap"><button class="btn primary grow" data-act="pdPay" data-id="${p.id}">${icon('wallet')} Payment</button><button class="btn ghost grow" data-act="pdBuy" data-id="${p.id}">${icon('bag')} Purchase</button></div></div>
  <div class="sec-row"><h2 class="sec">Account Statement</h2><span class="row gap6"><button class="icon-btn" data-act="pdShare" aria-label="Statement share karo">${icon('share')}</button><button class="icon-btn" data-act="pdCsv" aria-label="CSV download">${icon('download')}</button></span></div>
  <label class="search">${icon('search')}<input data-in="pdQ" placeholder="Statement me search..." value="${esc(PD.q)}" autocomplete="off"></label>
  ${periodBar('pd', PD, [['all', 'Full History'], ['month', 'This Month'], ['lastmonth', 'Last Month'], ['custom', 'Custom']])}
  <div class="card stmt" id="stmt"></div>
  <button class="btn danger-soft block" data-act="partyDel" data-id="${p.id}">${icon('trash')} Ye shop delete karo</button><div class="spacer"></div>`;
  paintStatement();
}
I.pdQ = (el) => {
  PD.q = el.value;
  paintStatement();
};
function stmtData() {
  const rows = store.statement(PD.id, ctx.shop);
  const [f, t] = rangeOf(PD);
  const q = PD.q.trim().toLowerCase();
  const vis = rows.filter((r) => r.ts >= f && r.ts <= t && (!q || r.desc.toLowerCase().includes(q)));
  const idx = rows.indexOf(vis[0]);
  const opening = PD.key !== 'all' && idx > 0 ? rows[idx - 1].balance : 0;
  return { rows, vis, opening };
}
function paintStatement() {
  const box = document.getElementById('stmt');
  if (!box) return;
  const { vis, opening } = stmtData();
  if (!vis.length) {
    box.innerHTML = empty('file', 'Koi entry nahi', 'Is filter me is shop ki koi purchase/payment nahi hai.');
    return;
  }
  const totalDebit = vis.reduce((s, r) => s + r.debit, 0);
  const totalCredit = vis.reduce((s, r) => s + r.credit, 0);
  box.innerHTML = `<div class="st-head"><span>Date</span><span class="grow">Description</span><span>Amount</span></div>
  ${opening ? `<div class="st-open"><span>Pehle ka balance</span><b>${inr(opening)}</b></div>` : ''}
  ${vis
    .map(
      (r) => `<button class="st-row2" data-act="txnOpen" data-id="${r.t.id}">
      <div class="st-when"><b>${fmtDay(r.ts)}</b><small>${fmtTime(r.ts)}</small></div>
      <div class="grow st-desc">${esc(r.desc)}</div>
      <div class="st-amt"><b class="${r.debit ? 'neg' : 'pos'}">${r.debit ? '−' : '+'}${inr(r.debit || r.credit)}</b><small>Bal ${inr(r.balance)}</small></div>
      </button>`
    )
    .join('')}
  <div class="st-foot"><span>Total</span><span class="neg">${inr(totalDebit)}</span><span class="pos">${inr(totalCredit)}</span></div>`;
}
A.partyEdit = (el) => partyForm(store.findParty(el.dataset.id));
A.pdPay = (el) => openPurchase({ mode: 'pay', partyId: el.dataset.id, shopId: ctx.shop === 'all' ? undefined : ctx.shop });
A.pdBuy = (el) => openPurchase({ mode: 'add', partyId: el.dataset.id, shopId: ctx.shop === 'all' ? undefined : ctx.shop });
A.partyDel = async (el) => {
  const p = store.findParty(el.dataset.id);
  const ok = await confirmBox({ title: `"${p.name}" delete karein?`, message: 'Jis shop ka hisaab (purchase/payment) ho use delete nahi kar sakte.', ok: 'Delete', danger: true });
  if (!ok) return;
  try {
    store.deleteParty(p.id);
    toast('Shop delete ho gayi');
    ctx.go('#/parties');
  } catch (e) {
    fail(e);
  }
};
A.pdCsv = () => {
  const p = store.findParty(PD.id);
  const { vis } = stmtData();
  download(`${p.name.replace(/\W+/g, '-')}-statement.csv`, toCSV([['Date', 'Time', 'Description', 'Debit', 'Credit', 'Balance'], ...vis.map((r) => [fmtDate(r.ts), fmtTime(r.ts), r.desc, r.debit || '', r.credit || '', r.balance])]), 'text/csv');
};
A.pdShare = async () => {
  const p = store.findParty(PD.id);
  const { vis } = stmtData();
  const st = store.partyStats(PD.id, ctx.shop);
  const text = `${p.name} — Account Statement\n` + vis.map((r) => `${fmtDate(r.ts)} ${r.desc}: ${r.debit ? 'Dr ' + inr(r.debit) : 'Cr ' + inr(r.credit)} (Bal ${inr(r.balance)})`).join('\n') + `\n\nTotal ${inr(st.bought)} | Paid ${inr(st.paid)} | Pending ${inr(st.pending)}`;
  try {
    if (navigator.share) await navigator.share({ title: `${p.name} statement`, text });
    else {
      await navigator.clipboard.writeText(text);
      toast('Statement copy ho gaya');
    }
  } catch (e) {
    if (e?.name !== 'AbortError') toast('Share nahi ho paya', 'err');
  }
};

/* =====================================================================
   EXPENSES
   ===================================================================== */
const E = { tab: 'rec', cat: 'Shop Rent', method: 'Cash', img: null };
TAB.exp = (k) => (E.tab = k);
const EH = { key: 'month', from: '', to: '', cat: 'all' };
SCOPES.exp = { state: EH, paint: () => ctx.refresh(), paintData: () => paintExpHist() };

export const openExpense = () => {
  E.tab = 'rec';
  ctx.go('#/expenses');
};

export function expensesView(el) {
  el.innerHTML = `${tabs('exp', [['rec', 'Record Expense', 'edit'], ['hist', 'Expense History', 'history']], E.tab)}<div id="exp-body"></div>`;
  const body = el.querySelector('#exp-body');
  if (E.tab === 'hist') {
    body.innerHTML = `${field('Category', select('ecat', [['all', 'Sabhi categories'], ...store.EXPENSE_CATS], EH.cat, 'data-ch="ecat"'))}${periodBar('exp', EH, [...PERIODS.slice(0, 4), ['all', 'All Time'], PERIODS[4]])}<div id="exp-hist"></div><div class="spacer"></div>`;
    return paintExpHist();
  }
  body.innerHTML = `<div class="card form" id="exp-form">
    <div class="row between"><div><b>Business Expense</b><div class="muted sm">Rent, bijli, chai... (stock purchase yahan nahi)</div></div><span class="ico big tone-rose">${icon('rupee')}</span></div>
    ${shopField()}
    ${field('Expense Category', select('category', store.EXPENSE_CATS, E.cat, 'data-ch="ecatSel"'))}
    ${field('Amount ₹ *', '<input name="amount" type="number" inputmode="decimal" min="0" step="any" placeholder="0">')}
    <span class="lbl">Payment Method</span>${methodChips('emethod', store.EXP_METHODS, E.method)}
    ${dtFields('ex')}
    ${field('Note (optional)', '<input name="note" placeholder="Koi note">')}
    <span class="lbl">Bill Image (optional)</span>
    <div class="two"><label class="btn ghost">${icon('image')} Gallery<input type="file" accept="image/*" hidden data-ch="expImg"></label><label class="btn ghost">${icon('camera')} Camera<input type="file" accept="image/*" capture="environment" hidden data-ch="expImg"></label></div>
    <div id="exp-prev"></div>
  </div>
  <div class="savebar"><button class="btn primary lg grow" data-act="expSave">Save Expense</button></div>`;
  body.querySelector('[data-chips=emethod]').addEventListener('chipchange', (e) => (E.method = e.detail));
  paintPrev();
}
C.ecatSel = (el) => (E.cat = el.value);
C.ecat = (el) => {
  EH.cat = el.value;
  paintExpHist();
};
function paintPrev() {
  const b = document.getElementById('exp-prev');
  if (b) b.innerHTML = E.img ? `<div class="thumb"><img src="${E.img}" alt="Bill preview"><button class="icon-btn" data-act="expImgRm" aria-label="Image hatao">${icon('x')}</button></div>` : '';
}
C.expImg = async (el) => {
  const f = el.files?.[0];
  el.value = '';
  if (!f) return;
  try {
    E.img = await compressImage(f);
    paintPrev();
  } catch (e) {
    fail(e);
  }
};
A.expImgRm = () => {
  E.img = null;
  paintPrev();
};
A.expSave = async () => {
  const r = document.getElementById('exp-form');
  try {
    let imageId = null;
    const t = store.addExpense({ shopId: readShop(r), category: v(r, 'category'), amount: v(r, 'amount'), method: E.method, ts: readDT(r, 'ex'), note: v(r, 'note'), imageId: null });
    if (E.img) {
      imageId = 'b' + uid();
      await putImage(imageId, E.img);
      t.imageId = imageId;
      store.touch();
    }
    E.img = null;
    toast(`${t.category}: ${inr(t.amount)} expense save ho gaya`);
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};
function paintExpHist() {
  const box = document.getElementById('exp-hist');
  if (!box) return;
  const [f, t] = rangeOf(EH);
  const list = store
    .get()
    .txns.filter((x) => x.type === 'EXPENSE' && inShop(x) && x.ts >= f && x.ts <= t && (EH.cat === 'all' || x.category === EH.cat))
    .sort((a, b) => b.ts - a.ts);
  if (!list.length) {
    box.innerHTML = empty('rupee', 'Koi expense nahi', 'Record Expense me jaakar kharcha add karo.');
    return;
  }
  const tot = list.reduce((s, x) => s + x.amount, 0);
  const by = {};
  list.forEach((x) => (by[x.category] = (by[x.category] || 0) + x.amount));
  box.innerHTML = `<div class="card sumcard"><div class="row between"><b>Total Expense</b><b class="big neg">${inr(tot)}</b></div>
    <div class="cats">${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, val]) => `<span>${esc(k)} <b>${inr(val)}</b></span>`).join('')}</div></div>
    <div class="card list">${list.map((x) => txnRow(x, { showDate: true, shopTag: ctx.shop === 'all' })).join('')}</div>`;
}
