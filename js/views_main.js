// Screens: Home (dashboard), Stock, History, Reports, Search + shared sheets (product form, stock adjust, txn detail).
import * as store from './store.js';
import { esc, inr, fmtTime, fmtDate, fmtDayLong, fmtDateTime, inputDate, download, toCSV, periodLabel, PERIODS, dayKey, num, MONTHS } from './utils.js';
import {
  A, I, ctx, icon, toast, fail, sheet, confirmBox, badge, sourceBadge, empty, chips, chipVal, stepper, field, select,
  dtFields, readDT, shopField, readShop, v, periodBar, rangeOf, SCOPES, txnRow, describe, methodChips,
} from './ui.js';
import { getImage, delImage } from './storage.js';

const inShop = (x) => ctx.shop === 'all' || x.shopId === ctx.shop;
const hidden = () => localStorage.getItem('msm_hide') === '1';
const money = (n) => (hidden() ? '₹ ••••' : inr(n));

/* =====================================================================
   HOME
   ===================================================================== */
const H = { key: 'today', from: '', to: '' };
SCOPES.home = { state: H, paint: () => ctx.refresh() };

export function home(el) {
  const shop = ctx.shop;
  const [f, t] = rangeOf(H);
  const s = store.summary(shop, f, t);
  const st = store.stockStats(shop);
  const payShops = store
    .get()
    .parties.map((p) => ({ p, ...store.partyStats(p.id, shop) }))
    .filter((x) => x.pending > 0)
    .sort((a, b) => b.pending - a.pending);
  const lbl = periodLabel(H.key, H);
  const acts = store.get().txns.filter(inShop).sort((a, b) => b.ts - a.ts).slice(0, 8);

  el.innerHTML = `
  <header class="home-h">
    <button class="icon-btn round" data-act="menu" aria-label="Menu">${icon('menu')}</button>
    <h1>Welcome!</h1>
    <button class="icon-btn round bellbtn" data-act="goLow" aria-label="Low stock alerts">${icon('bell')}${st.low.length ? `<i class="dot">${st.low.length > 9 ? '9+' : st.low.length}</i>` : ''}</button>
    <button class="icon-btn round av" data-act="go" data-h="#/settings" aria-label="Settings">${icon('user')}</button>
  </header>
  <div class="row between wrap-row sub-h">
    <button class="shopchip" data-act="shopSwitch">${icon('store')}<span>${esc(store.shopName(shop))}</span>${icon('chevD')}</button>
    <span class="muted sm">Stock • Sales • Purchase • Accounts</span>
  </div>

  <h2 class="sec">Quick Actions</h2>
  <div class="hscroll qa-row">
    <button class="qa green" data-act="qa" data-v="stock">${icon('box')}<span>Add Stock</span></button>
    <button class="qa blue" data-act="qa" data-v="sale">${icon('cart')}<span>New Sale</span></button>
    <button class="qa amber" data-act="qa" data-v="purchase">${icon('store')}<span>Other Shop Purchase</span></button>
    <button class="qa red" data-act="qa" data-v="expense">${icon('rupee')}<span>Add Expense</span></button>
  </div>

  ${periodBar('home', H)}

  <div class="hscroll snap cards" id="car">
    <div class="kcard c-green"><div class="k-top">${icon('chart')}<button class="eye" data-act="eye" aria-label="Amount chhupao/dikhao">${icon(hidden() ? 'eyeOff' : 'eye')}</button><span>${esc(lbl)}</span></div>
      <div class="k-lbl">TOTAL SALES</div><div class="k-val">${money(s.sales)}</div>
      <div class="k-foot"><div><small>Own Shop</small>${money(s.ownSales)}</div><div><small>Other Shop Items</small>${money(s.otherSales)}</div></div></div>
    <div class="kcard c-blue"><div class="k-top">${icon('bag')}<span>${esc(lbl)}</span></div>
      <div class="k-lbl">TOTAL PURCHASE</div><div class="k-val">${money(s.totalPurchases)}</div>
      <div class="k-foot"><div><small>Other Shops</small>${money(s.otherPurchases)}</div><div><small>Own Stock Added</small>${money(s.ownStockValue)}</div></div></div>
    <div class="kcard c-red"><div class="k-top">${icon('rupee')}<span>${esc(lbl)}</span></div>
      <div class="k-lbl">TOTAL EXPENSE</div><div class="k-val">${money(s.expenses)}</div>
      <div class="k-foot"><div><small>Stock purchase alag hai</small>Rent, chai, travel...</div></div></div>
    <div class="kcard c-purple"><div class="k-top">${icon('chart')}<span>${esc(lbl)}</span></div>
      <div class="k-lbl">ESTIMATED PROFIT</div><div class="k-val">${money(s.profit)}</div>
      <div class="k-foot"><div><small>Sale − Cost</small>${money(s.sales)} − ${money(s.cogs)}</div></div></div>
  </div>
  <div class="dots" id="dots"><i class="on"></i><i></i><i></i><i></i></div>
  ${s.zeroCost ? `<p class="note warn">${icon('alert')}<span>${s.zeroCost} sale me buying price ₹0 hai, isliye profit zyada dikh sakta hai.</span></p>` : ''}

  <div class="grid2">
    <button class="scard tone-mint" data-act="go" data-h="#/sales"><small>Sales · ${esc(lbl)}</small><b>${money(s.sales)}</b>${icon('cart')}</button>
    <button class="scard tone-sky" data-act="go" data-h="#/purchase"><small>Purchase · ${esc(lbl)}</small><b>${money(s.totalPurchases)}</b>${icon('bag')}</button>
    <button class="scard tone-rose" data-act="go" data-h="#/expenses"><small>Expenses · ${esc(lbl)}</small><b>${money(s.expenses)}</b>${icon('rupee')}</button>
    <button class="scard tone-lilac" data-act="go" data-h="#/stock"><small>Current Stock Value</small><b>${money(st.value)}</b>${icon('box')}</button>
    <button class="scard tone-peach" data-act="go" data-h="#/parties"><small>Other Shop Payable</small><b>${money(s.pending)}</b>${icon('store')}</button>
    <button class="scard tone-amber" data-act="goLow"><small>Low Stock Items</small><b>${st.low.length}</b>${icon('alert')}</button>
  </div>

  ${payShops.length ? `<div class="sec-row"><h2 class="sec">Dene Baaki (Payable)</h2><button class="link" data-act="go" data-h="#/parties">Sab dekho</button></div>
    <div class="card list">${payShops.slice(0, 3).map((x) => `<button class="li" data-act="openParty" data-id="${x.p.id}"><span class="ico tone-amber">${icon('store')}</span><span class="grow"><b>${esc(x.p.name)}</b><span class="muted sm">Total ${inr(x.bought)} · Paid ${inr(x.paid)}</span></span><b class="neg">${inr(x.pending)}</b></button>`).join('')}</div>` : ''}

  <div class="sec-row"><h2 class="sec">Low Stock</h2>${st.low.length > 4 ? `<button class="link" data-act="goLow">Sab dekho (${st.low.length})</button>` : ''}</div>
  ${
    st.low.length
      ? `<div class="card list">${st.low
          .slice(0, 4)
          .map(
            (p) => `<div class="li static"><span class="ico tone-amber">${icon('alert')}</span><span class="grow"><b>${esc(p.name)}</b><span class="muted sm">${p.qty === 0 ? 'Out of stock' : `Only ${p.qty} left`}${ctx.shop === 'all' ? ' · ' + esc(store.shopName(p.shopId)) : ''}</span></span><button class="btn sm primary" data-act="stkIn" data-id="${p.id}">Update Stock</button></div>`
          )
          .join('')}</div>`
      : `<div class="card soft-empty">${icon('check')}<span>Sab items ka stock theek hai</span></div>`
  }

  <div class="sec-row"><h2 class="sec">Recent Activity</h2>${acts.length ? `<button class="link" data-act="go" data-h="#/history">History</button>` : ''}</div>
  ${
    acts.length
      ? `<div class="card list">${acts.map((t) => txnRow(t, { showDate: true, shopTag: ctx.shop === 'all' })).join('')}</div>`
      : empty('history', 'Abhi koi activity nahi', 'Pehla sale, stock ya purchase add karke shuru karo.', `<button class="btn primary" data-act="qa" data-v="stock">${icon('plus')} Add Stock</button>`)
  }
  <div class="spacer"></div>`;

  const car = el.querySelector('#car');
  const dots = el.querySelectorAll('#dots i');
  car.addEventListener('scroll', () => {
    const i = Math.round(car.scrollLeft / (car.firstElementChild.offsetWidth + 12));
    dots.forEach((d, k) => d.classList.toggle('on', k === i));
  });
}
A.eye = () => {
  localStorage.setItem('msm_hide', hidden() ? '0' : '1');
  ctx.refresh();
};
A.goLow = () => {
  K.f = 'low';
  ctx.go('#/stock');
};

/* =====================================================================
   STOCK
   ===================================================================== */
const K = { q: '', f: 'all', cat: 'all' };

export function stockView(el) {
  const st = store.stockStats(ctx.shop);
  const cats = ['all', ...store.CATEGORIES];
  el.innerHTML = `
  <div class="card stat-strip"><div><small>Items</small><b>${st.items}</b></div><div><small>Total pcs</small><b>${st.units}</b></div><div><small>Stock Value</small><b>${inr(st.value)}</b></div><div><small>Low</small><b class="${st.low.length ? 'neg' : ''}">${st.low.length}</b></div></div>
  <div class="row gap"><label class="search grow">${icon('search')}<input id="stk-q" data-in="stkQ" placeholder="Product, brand ya shop search..." value="${esc(K.q)}" autocomplete="off"></label>
  <button class="btn primary sq" data-act="prodAdd" aria-label="Add stock">${icon('plus')}</button></div>
  <div class="hscroll">${chips('stkf', [['all', 'All'], ['low', 'Low Stock'], ['own', 'Own Stock'], ['other', 'Other Shop Stock']], K.f)}</div>
  <div class="hscroll">${chips('stkc', cats.map((c) => [c, c === 'all' ? 'All categories' : c]), K.cat, { cls: 'small' })}</div>
  <div id="stk-list"></div><div class="spacer"></div>`;
  el.querySelector('[data-chips=stkf]').addEventListener('chipchange', (e) => ((K.f = e.detail), paintStock()));
  el.querySelector('[data-chips=stkc]').addEventListener('chipchange', (e) => ((K.cat = e.detail), paintStock()));
  paintStock();
}
I.stkQ = (el) => {
  K.q = el.value;
  paintStock();
};

function paintStock() {
  const box = document.getElementById('stk-list');
  if (!box) return;
  const q = K.q.trim().toLowerCase();
  const all = store.get().products.filter(inShop);
  const list = all
    .filter((p) => (K.f === 'low' ? p.qty <= p.min : K.f === 'own' ? p.source === 'OWN' : K.f === 'other' ? p.source === 'OTHER' : true))
    .filter((p) => K.cat === 'all' || p.category === K.cat)
    .filter((p) => !q || `${p.name} ${p.brand} ${p.category} ${p.notes} ${store.partyName(p.partyId)}`.toLowerCase().includes(q))
    .sort((a, b) => (a.qty <= a.min) !== (b.qty <= b.min) ? (a.qty <= a.min ? -1 : 1) : a.name.localeCompare(b.name));
  if (!list.length) {
    box.innerHTML = all.length
      ? empty('search', 'Koi product nahi mila', 'Filter ya search badal ke dekho.')
      : empty('box', 'Stock khaali hai', 'Apna pehla product add karo — naam, quantity aur price.', `<button class="btn primary" data-act="prodAdd">${icon('plus')} Add Stock</button>`);
    return;
  }
  box.innerHTML = list
    .map((p) => {
      const low = p.qty <= p.min;
      return `<article class="card pcard ${low ? 'is-low' : ''}">
      <div class="row between top"><div class="grow"><b class="pname">${esc(p.name)}</b><div class="muted sm">${esc(p.category)}${p.brand ? ' · ' + esc(p.brand) : ''}</div></div>
        <div class="qty ${low ? 'low' : ''}"><b>${p.qty}</b><small>pcs</small></div></div>
      <div class="row wrap-row gap6 meta"><span>Buy <b>${inr(p.buy)}</b></span><span>Sell <b>${inr(p.sell)}</b></span>${sourceBadge(p.source, store.partyName(p.partyId))}${ctx.shop === 'all' ? badge(store.shopName(p.shopId)) : ''}${low ? badge(p.qty === 0 ? 'Out of stock' : 'Low stock', 'red') : ''}</div>
      <div class="pact"><button class="ab" data-act="stkOut" data-id="${p.id}" aria-label="Quantity kam karo">${icon('minus')}<span>Kam</span></button>
        <button class="ab primary" data-act="stkIn" data-id="${p.id}" aria-label="Quantity badhao">${icon('plus')}<span>Add</span></button>
        <button class="ab" data-act="prodEdit" data-id="${p.id}" aria-label="Edit">${icon('edit')}<span>Edit</span></button>
        <button class="ab" data-act="prodHist" data-id="${p.id}" aria-label="History">${icon('history')}<span>History</span></button>
        <button class="ab del" data-act="prodDel" data-id="${p.id}" aria-label="Delete">${icon('trash')}</button></div>
    </article>`;
    })
    .join('');
}

/* ----- Add / edit product sheet ----- */
export function productForm(p = null) {
  const edit = !!p;
  sheet({
    title: edit ? 'Product Edit' : 'Add Stock',
    full: true,
    body: `<form class="form" novalidate>
      ${edit ? '' : shopField()}
      ${edit ? '' : `<div class="field"><span class="lbl">Stock kahan se aaya?</span>${chips('src', [['OWN', 'Own Shop'], ['OTHER', 'Other Shop']], 'OWN')}</div>`}
      <div class="info-box" data-other hidden>${icon('store')}<div><b>Dusri shop se liya hua maal</b><p>Iska hisaab (kitna dena hai) Purchase se banta hai. Purchase form me shop, item, price aur payment status daal do — stock apne aap badh jayega.</p><button type="button" class="btn primary sm" data-act="prodToPurchase">Purchase form kholo</button></div></div>
      <div data-own>
      ${field('Product Name *', `<input name="name" value="${esc(p?.name || '')}" placeholder="e.g. Type-C Cable" autocomplete="off" required>`)}
      <div class="two">${field('Category', select('category', store.CATEGORIES, p?.category || 'Charger'))}${field('Brand (optional)', `<input name="brand" value="${esc(p?.brand || '')}" placeholder="e.g. Mi">`)}</div>
      ${edit ? '' : field('Quantity', stepper('qty', 1, 0))}
      <div class="two">${field('Purchase Price ₹', `<input name="buy" type="number" inputmode="decimal" min="0" step="any" value="${p?.buy ?? ''}" placeholder="0">`)}${field('Selling Price ₹', `<input name="sell" type="number" inputmode="decimal" min="0" step="any" value="${p?.sell ?? ''}" placeholder="0">`)}</div>
      ${field('Minimum Stock Level', `<input name="min" type="number" inputmode="numeric" min="0" step="1" value="${p?.min ?? 5}">`, 'Isse kam hone par Low Stock alert dikhega')}
      ${edit ? '' : dtFields('dt')}
      ${field('Notes (optional)', `<input name="notes" value="${esc(p?.notes || '')}" placeholder="Koi note">`)}
      ${edit && p.source === 'OTHER' ? `<p class="note">${icon('store')}<span>Source: Other Shop — ${esc(store.partyName(p.partyId))}. Quantity badhane ke liye Purchase use karo.</span></p>` : ''}
      <button class="btn primary block lg" data-act="prodSave" ${edit ? `data-id="${p.id}"` : ''} type="button">${edit ? 'Save Changes' : 'Add Stock'}</button>
      </div></form>`,
    onMount: (root) => {
      root.querySelector('[data-chips=src]')?.addEventListener('chipchange', (e) => {
        root.querySelector('[data-other]').hidden = e.detail !== 'OTHER';
        root.querySelector('[data-own]').hidden = e.detail === 'OTHER';
      });
    },
  });
}
A.prodAdd = () => productForm();
A.prodToPurchase = (el) => {
  el.closest('.sheet-wrap').querySelector('[data-sheet-close]').click();
  document.dispatchEvent(new CustomEvent('msm:open-purchase'));
};
A.prodEdit = (el) => productForm(store.findProduct(el.dataset.id));
A.prodSave = (el) => {
  const root = el.closest('.sheet-b');
  const d = {
    shopId: readShop(root), name: v(root, 'name'), category: v(root, 'category'), brand: v(root, 'brand'),
    qty: v(root, 'qty') || 0, buy: v(root, 'buy'), sell: v(root, 'sell'), min: v(root, 'min'), notes: v(root, 'notes'),
    ts: root.querySelector('[name=dt_d]') ? readDT(root, 'dt') : undefined,
  };
  try {
    if (el.dataset.id) store.editProduct(el.dataset.id, d);
    else store.addProduct(d);
    toast(el.dataset.id ? 'Product update ho gaya' : `${d.name} add ho gaya`);
    el.closest('.sheet-wrap').querySelector('[data-sheet-close]').click();
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};

/* ----- +/- quantity sheet ----- */
function adjustSheet(p, dir) {
  const reasons = dir < 0 ? store.REASONS_OUT : p.source === 'OTHER' ? ['Manual Adjustment', 'Other'] : store.REASONS_IN;
  sheet({
    title: `${dir < 0 ? 'Quantity Kam Karo' : 'Quantity Badhao'}`,
    body: `<div class="form">
      <div class="card flat"><b>${esc(p.name)}</b><div class="muted sm">Abhi stock: <b>${p.qty}</b> pcs · ${sourceBadge(p.source, store.partyName(p.partyId))}</div></div>
      <div class="field"><span class="lbl">Kitne pcs?</span><div class="center">${stepper('qty', 1, 1)}</div></div>
      <div class="field"><span class="lbl">Reason</span>${chips('reason', reasons, reasons[0])}</div>
      <p class="hint-line" id="adj-hint"></p>
      ${field('Note (optional)', '<input name="note" placeholder="Koi note">')}
      <button class="btn ${dir < 0 ? 'danger-soft' : 'primary'} block lg" data-act="adjSave" data-id="${p.id}" data-dir="${dir}">${dir < 0 ? 'Stock Kam Karo' : 'Stock Badhao'}</button></div>`,
    onMount: (root) => {
      const qty = root.querySelector('[name=qty]');
      if (dir < 0) qty.max = p.qty;
      const hint = root.querySelector('#adj-hint');
      const upd = () => {
        const r = chipVal(root, 'reason');
        hint.textContent = dir < 0 && r === 'Sold' ? `"Sold" chunne par sale ki entry banegi (${inr(p.sell)} each) — Sales me dikhega.` : '';
      };
      root.querySelector('[data-chips=reason]').addEventListener('chipchange', upd);
      upd();
    },
  });
}
A.stkOut = (el) => {
  const p = store.findProduct(el.dataset.id);
  if (!p) return;
  if (p.qty === 0) return toast('Stock pehle se 0 hai', 'err');
  adjustSheet(p, -1);
};
A.stkIn = (el) => {
  const p = store.findProduct(el.dataset.id);
  if (!p) return;
  if (p.source === 'OTHER') {
    // other-shop stock must be added through Purchase so the payable stays correct
    document.dispatchEvent(new CustomEvent('msm:open-purchase', { detail: { partyId: p.partyId, productId: p.id, shopId: p.shopId } }));
    return;
  }
  adjustSheet(p, 1);
};
A.adjSave = (el) => {
  const root = el.closest('.sheet-b');
  const dir = Number(el.dataset.dir);
  const n = Math.round(num(v(root, 'qty')));
  try {
    store.adjustStock(el.dataset.id, dir * n, chipVal(root, 'reason'), v(root, 'note'));
    toast('Stock update ho gaya');
    el.closest('.sheet-wrap').querySelector('[data-sheet-close]').click();
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};
A.prodDel = async (el) => {
  const p = store.findProduct(el.dataset.id);
  if (!p) return;
  const ok = await confirmBox({
    title: `"${p.name}" delete karein?`,
    message: `${p.qty ? `Abhi ${p.qty} pcs stock hai jo hat jayega. ` : ''}Purani sales/purchase history bani rahegi.`,
    ok: 'Delete', danger: true,
  });
  if (!ok) return;
  store.deleteProduct(p.id);
  toast('Product delete ho gaya');
  ctx.refresh();
};
A.prodHist = (el) => {
  const p = store.findProduct(el.dataset.id);
  const list = store.get().txns.filter((t) => t.productId === el.dataset.id).sort((a, b) => b.ts - a.ts);
  sheet({
    title: `${p?.name || 'Product'} — History`,
    full: true,
    body: list.length ? `<div class="list">${list.map((t) => txnRow(t, { showDate: true })).join('')}</div>` : empty('history', 'Koi history nahi', 'Is product ki abhi koi entry nahi hai.'),
  });
};

/* =====================================================================
   TRANSACTION DETAIL (History / Recent Activity / anywhere)
   ===================================================================== */
A.txnOpen = (el) => txnDetail(el.dataset.id);

export async function txnDetail(id) {
  const t = store.get().txns.find((x) => x.id === id);
  if (!t) return;
  const d = describe(t);
  const rows = [
    ['Type', d.label], ['Date', fmtDate(t.ts)], ['Time', fmtTime(t.ts)], ['Shop', store.shopName(t.shopId)],
  ];
  if (t.type === 'SALE') rows.push(['Product', t.name], ['Quantity', t.qty], ['Selling price', inr(t.price)], ['Subtotal', inr(t.subtotal)], ['Discount', inr(t.discount)], ['Total', inr(t.total)], ['Buying cost (each)', inr(t.cost)], ['Source', t.source === 'OTHER' ? `Other Shop — ${t.partyName}` : 'Own Shop'], ['Payment', t.method], ['Customer', t.customer || '—'], ['Phone', t.phone || '—'], ['Note', t.note || '—']);
  if (t.type === 'PURCHASE') rows.push(['Other Shop', t.partyName], ['Product', t.name], ['Quantity', t.qty], ['Price (each)', inr(t.unitCost)], ['Total', inr(t.total)], ['Paid', inr(t.paid)], ['Payment Status', t.status], ['Bill no.', t.billNo || '—'], ['Note', t.note || '—']);
  if (t.type === 'PAYMENT') rows.push(['Other Shop', t.partyName], ['Amount', inr(t.amount)], ['Method', t.method], ['Note', t.note || '—']);
  if (t.type === 'EXPENSE') rows.push(['Category', t.category], ['Amount', inr(t.amount)], ['Method', t.method], ['Note', t.note || '—']);
  if (t.type === 'STOCK') rows.push(['Product', t.name], ['Change', (t.delta > 0 ? '+' : '') + t.delta], ['Stock', `${t.before} → ${t.after}`], ['Reason', t.reason], ['Source', t.source === 'OTHER' ? `Other Shop — ${t.partyName}` : 'Own Shop'], ['Note', t.note || '—']);
  const img = t.imageId ? await getImage(t.imageId) : null;
  sheet({
    title: 'Transaction Detail',
    body: `<div class="detail"><div class="row between"><span class="ico big tone-${d.tone}">${icon(d.ic)}</span><b class="amt ${d.cls}">${d.sign}${d.amt}</b></div>
      <dl>${rows.map(([k, val]) => `<div><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('')}</dl>
      ${img ? `<img class="bill" src="${img}" alt="Bill image">` : ''}
      ${t.type === 'STOCK' ? '<p class="note">Stock entry delete nahi hoti. Galti ho to ulta adjustment karo.</p>' : `<button class="btn danger-soft block" data-act="txnDel" data-id="${t.id}">${icon('trash')} Delete this entry</button>`}</div>`,
  });
}
A.txnDel = async (el) => {
  const t = store.get().txns.find((x) => x.id === el.dataset.id);
  if (!t) return;
  const extra = { SALE: `${t.qty} pcs stock wapas judega.`, PURCHASE: `${t.qty} pcs stock kam hoga aur shop ka pending badlega.`, PAYMENT: 'Shop ka pending wapas badhega.', EXPENSE: '' }[t.type] || '';
  const ok = await confirmBox({ title: 'Ye entry delete karein?', message: `${describe(t).title}. ${extra}`, ok: 'Delete', danger: true });
  if (!ok) return;
  try {
    store.deleteTxn(t.id);
    if (t.imageId) delImage(t.imageId);
    toast('Entry delete ho gayi');
    document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};

/* =====================================================================
   HISTORY
   ===================================================================== */
const HS = { key: 'today', from: '', to: '', type: 'all', q: '' };
SCOPES.hist = { state: HS, paint: () => ctx.refresh(), paintData: () => paintHistory() };

export function historyView(el) {
  el.innerHTML = `
  <label class="search">${icon('search')}<input data-in="histQ" placeholder="Product, shop, customer, phone..." value="${esc(HS.q)}" autocomplete="off"></label>
  <div class="hscroll">${chips('htype', [['all', 'All'], ['SALE', 'Sale'], ['PURCHASE', 'Purchase'], ['PAYMENT', 'Payment'], ['EXPENSE', 'Expense'], ['STOCK', 'Stock Update']], HS.type)}</div>
  ${periodBar('hist', HS, [...PERIODS.slice(0, 4), ['all', 'All Time'], PERIODS[4]])}
  <div id="hist-list"></div><div class="spacer"></div>`;
  el.querySelector('[data-chips=htype]').addEventListener('chipchange', (e) => ((HS.type = e.detail), paintHistory()));
  paintHistory();
}
I.histQ = (el) => {
  HS.q = el.value;
  paintHistory();
};
function paintHistory() {
  const box = document.getElementById('hist-list');
  if (!box) return;
  const [f, t] = rangeOf(HS);
  const q = HS.q.trim().toLowerCase();
  const list = store
    .get()
    .txns.filter(inShop)
    .filter((x) => x.ts >= f && x.ts <= t && (HS.type === 'all' || x.type === HS.type))
    .filter((x) => !q || `${x.name} ${x.partyName} ${x.customer} ${x.phone} ${x.note} ${x.category} ${x.method} ${x.reason} ${x.type}`.toLowerCase().includes(q))
    .sort((a, b) => b.ts - a.ts);
  if (!list.length) {
    box.innerHTML = empty('history', 'Is filter me koi entry nahi', 'Date ya type badal ke dekho.');
    return;
  }
  const groups = new Map();
  list.forEach((x) => {
    const k = dayKey(x.ts);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  });
  box.innerHTML = `<p class="muted sm count">${list.length} entries</p>` + [...groups.entries()].map(([, arr]) => {
    const sales = arr.filter((x) => x.type === 'SALE').reduce((s, x) => s + x.total, 0);
    return `<div class="day-h"><b>${fmtDayLong(arr[0].ts)}</b>${sales ? `<span class="pos sm">Sales ${inr(sales)}</span>` : ''}</div>
      <div class="card list">${arr.map((x) => txnRow(x, { shopTag: ctx.shop === 'all' })).join('')}</div>`;
  }).join('');
}

/* =====================================================================
   REPORTS
   ===================================================================== */
const R = { key: 'week', from: '', to: '' };
SCOPES.rep = { state: R, paint: () => ctx.refresh() };
const short = (n) => (n >= 100000 ? (n / 100000).toFixed(1).replace('.0', '') + 'L' : n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(Math.round(n)));
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function bucket(days) {
  if (days.length <= 31) return days.map((d) => ({ ...d, label: days.length <= 7 ? WD[new Date(d.ts).getDay()] : String(new Date(d.ts).getDate()) }));
  const out = [];
  for (let i = 0; i < days.length; i += 7) {
    const c = days.slice(i, i + 7);
    const b = { ts: c[0].ts, sales: 0, own: 0, other: 0, purchase: 0, expense: 0 };
    c.forEach((d) => ['sales', 'own', 'other', 'purchase', 'expense'].forEach((k) => (b[k] += d[k])));
    b.label = `${new Date(b.ts).getDate()} ${MONTHS[new Date(b.ts).getMonth()]}`;
    out.push(b);
  }
  return out;
}

function chartSVG(days, keys, colors) {
  const W = 320, Hh = 140, top = 16, bot = 20, n = days.length;
  const tot = (d) => keys.reduce((s, k) => s + d[k], 0);
  const max = Math.max(1, ...days.map(tot));
  const bw = (W - 8) / n;
  const bar = Math.max(3, Math.min(30, bw * 0.62));
  const step = Math.ceil(n / 8);
  const ch = Hh - top - bot;
  let g = `<line x1="0" x2="${W}" y1="${Hh - bot}" y2="${Hh - bot}" class="axis"/>`;
  days.forEach((d, i) => {
    const x = 4 + i * bw + (bw - bar) / 2;
    let y = Hh - bot;
    keys.forEach((k, ki) => {
      const h = (d[k] / max) * ch;
      if (h > 0) g += `<rect x="${x.toFixed(1)}" y="${(y - h).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${colors[ki]}"/>`;
      y -= h;
    });
    if (n <= 8 && tot(d) > 0) g += `<text x="${(x + bar / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" class="val">${short(tot(d))}</text>`;
    if (i % step === 0) g += `<text x="${(x + bar / 2).toFixed(1)}" y="${Hh - 6}" class="lab">${esc(d.label)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart" role="img" aria-label="Chart">${g}</svg>`;
}

export function reportsView(el) {
  const [f, t] = rangeOf(R);
  const shop = ctx.shop;
  const s = store.summary(shop, f, t);
  const days = bucket(store.dailySeries(shop, f, t));
  const rows = [
    ['Total Sales', s.sales, 'pos'], ['Own Shop Sales', s.ownSales], ['Other Shop Item Sales', s.otherSales],
    ['Total Purchases', s.totalPurchases], ['Other Shop Purchases', s.otherPurchases], ['Own Stock Added (cost)', s.ownStockValue],
    ['Expenses', s.expenses, 'neg'], ['Payments Made (to shops)', s.paid], ['Pending Payments (abhi tak)', s.pending, 'neg'],
  ];
  el.innerHTML = `
  ${periodBar('rep', R, [['week', 'This Week'], ['month', 'This Month'], ['lastmonth', 'Last Month'], ['custom', 'Custom']])}
  <p class="muted sm">${fmtDate(f)} – ${fmtDate(Math.min(t, Date.now() + 86400000 * 366))} · ${esc(store.shopName(shop))}</p>
  <div class="card list report">
    ${rows.map(([k, val, c]) => `<div class="li static"><span class="grow">${esc(k)}</span><b class="${c || ''}">${inr(val)}</b></div>`).join('')}
    <div class="li static"><span class="grow">Stock Added</span><b>${s.stockAdded} pcs</b></div>
    <div class="li static"><span class="grow">Stock Sold</span><b>${s.stockSold} pcs</b></div>
  </div>
  <div class="card profit">
    <div class="row between"><b>Estimated Gross Profit</b><b class="${s.profit >= 0 ? 'pos' : 'neg'}">${inr(s.profit)}</b></div>
    <p class="muted sm">= Sales ${inr(s.sales)} − recorded cost of goods sold ${inr(s.cogs)}. Kharche (expenses) isme shamil nahi hain.</p>
    ${s.zeroCost ? `<p class="note warn">${icon('alert')}<span>${s.zeroCost} sale me buying price ₹0 tha — profit asli se zyada dikh sakta hai. Product ka purchase price bhar do.</span></p>` : ''}
    <div class="row between sm"><span class="muted">Expenses ke baad (approx.)</span><b class="${s.profit - s.expenses >= 0 ? 'pos' : 'neg'}">${inr(s.profit - s.expenses)}</b></div>
  </div>
  <div class="card"><b>Sales trend</b>${chartSVG(days, ['sales'], ['#12915d'])}</div>
  <div class="card"><b>Purchase trend</b>${chartSVG(days, ['purchase'], ['#3b82f6'])}</div>
  <div class="card"><b>Expense trend</b>${chartSVG(days, ['expense'], ['#e5484d'])}</div>
  <div class="card"><b>Own vs Other shop sales</b>${chartSVG(days, ['own', 'other'], ['#12915d', '#f5a524'])}
    <div class="legend"><span><i style="background:#12915d"></i>Own ${inr(s.ownSales)}</span><span><i style="background:#f5a524"></i>Other shop items ${inr(s.otherSales)}</span></div></div>
  ${shop === 'all' ? `<div class="card"><b>Shop-wise</b><div class="tbl"><div class="tr th"><span></span>${store.SHOP_IDS.map((id) => `<span>${esc(store.shopName(id))}</span>`).join('')}</div>
    ${(() => {
      const a = store.summary('s1', f, t), b = store.summary('s2', f, t);
      return [['Sales', 'sales'], ['Purchases', 'totalPurchases'], ['Expenses', 'expenses'], ['Profit', 'profit']].map(([l, k]) => `<div class="tr"><span>${l}</span><span>${inr(a[k])}</span><span>${inr(b[k])}</span></div>`).join('');
    })()}</div></div>` : ''}
  <button class="btn ghost block" data-act="repCsv">${icon('download')} Report CSV download</button><div class="spacer"></div>`;
}
A.repCsv = () => {
  const [f, t] = rangeOf(R);
  const s = store.summary(ctx.shop, f, t);
  const rows = [['Report', `${fmtDate(f)} to ${fmtDate(t)}`, store.shopName(ctx.shop)], ['Metric', 'Value'],
    ['Total Sales', s.sales], ['Own Shop Sales', s.ownSales], ['Other Shop Item Sales', s.otherSales], ['Total Purchases', s.totalPurchases],
    ['Other Shop Purchases', s.otherPurchases], ['Expenses', s.expenses], ['Payments Made', s.paid], ['Pending Payments', s.pending],
    ['Stock Added (pcs)', s.stockAdded], ['Stock Sold (pcs)', s.stockSold], ['Cost of goods sold', s.cogs], ['Estimated Gross Profit', s.profit]];
  download(`report-${inputDate()}.csv`, toCSV(rows), 'text/csv');
};

/* =====================================================================
   GLOBAL SEARCH
   ===================================================================== */
const SQ = { q: '' };
export function searchView(el) {
  el.innerHTML = `<label class="search big">${icon('search')}<input id="gq" data-in="gsearch" placeholder="Product, shop, phone, transaction..." value="${esc(SQ.q)}" autocomplete="off"></label><div id="g-res"></div>`;
  paintSearch();
  setTimeout(() => document.getElementById('gq')?.focus(), 60);
}
I.gsearch = (el) => {
  SQ.q = el.value;
  paintSearch();
};
function paintSearch() {
  const box = document.getElementById('g-res');
  if (!box) return;
  if (!SQ.q.trim()) {
    box.innerHTML = empty('search', 'Kuch bhi search karo', 'Product ka naam, shop ka naam, phone number, customer ya note.');
    return;
  }
  const r = store.searchAll(SQ.q, ctx.shop);
  if (!r.products.length && !r.parties.length && !r.txns.length) {
    box.innerHTML = empty('search', 'Kuch nahi mila', `"${SQ.q}" se match karti koi entry nahi.`);
    return;
  }
  box.innerHTML =
    (r.products.length ? `<h2 class="sec">Products</h2><div class="card list">${r.products.slice(0, 8).map((p) => `<button class="li" data-act="searchProd" data-id="${p.id}"><span class="ico tone-purple">${icon('box')}</span><span class="grow"><b>${esc(p.name)}</b><span class="muted sm">${sourceBadge(p.source, store.partyName(p.partyId))}</span></span><span class="right"><b>${p.qty} pcs</b><span class="muted sm">${inr(p.sell)}</span></span></button>`).join('')}</div>` : '') +
    (r.parties.length ? `<h2 class="sec">Other Shops</h2><div class="card list">${r.parties.map((p) => `<button class="li" data-act="openParty" data-id="${p.id}"><span class="ico tone-amber">${icon('store')}</span><span class="grow"><b>${esc(p.name)}</b><span class="muted sm">${esc(p.owner)} ${esc(p.phone)}</span></span><b class="neg">${inr(Math.max(0, store.partyStats(p.id, ctx.shop).pending))}</b></button>`).join('')}</div>` : '') +
    (r.txns.length ? `<h2 class="sec">Transactions</h2><div class="card list">${r.txns.map((t) => txnRow(t, { showDate: true, shopTag: ctx.shop === 'all' })).join('')}</div>` : '');
}
A.searchProd = (el) => {
  const p = store.findProduct(el.dataset.id);
  K.q = p?.name || '';
  K.f = 'all';
  K.cat = 'all';
  ctx.go('#/stock');
};
