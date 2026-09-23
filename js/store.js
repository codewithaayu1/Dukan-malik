// Core data model + all business rules. No DOM code here (so it can be tested in Node).
// Every change goes through the functions below, which validate first and then save.

import { uid, num, money, dayKey } from './utils.js';

export const CATEGORIES = ['Charger', 'Cable', 'Back Cover / Folder', 'Screen Protector', 'Earphones', 'Adapter', 'Tempered Glass', 'Other'];
export const EXPENSE_CATS = ['Shop Rent', 'Electricity', 'Travel', 'Tea/Food', 'Advertising', 'Packaging', 'Other'];
export const SALE_METHODS = ['Cash', 'UPI', 'Card', 'Other'];
export const EXP_METHODS = ['Cash', 'UPI', 'Card', 'Bank'];
export const PAYOUT_METHODS = ['Cash', 'UPI', 'Bank', 'Card', 'Other'];
export const REASONS_OUT = ['Sold', 'Damaged', 'Lost', 'Manual Adjustment', 'Other'];
export const REASONS_IN = ['New Stock', 'Manual Adjustment', 'Other'];
export const SHOP_IDS = ['s1', 's2'];

const blank = () => ({
  v: 1,
  settings: { shopNames: { s1: 'Shop 1', s2: 'Shop 2' }, autoLockMin: 10, lastBackupAt: 0 },
  products: [],
  parties: [],
  txns: [],
  updatedAt: 0,
});

let S = blank();
let persistFn = null;

export const get = () => S;
export const onPersist = (fn) => (persistFn = fn);

export function load(data) {
  const b = blank();
  S = Object.assign(b, data || {});
  S.settings = Object.assign(blank().settings, S.settings || {});
  S.settings.shopNames = Object.assign({ s1: 'Shop 1', s2: 'Shop 2' }, S.settings.shopNames || {});
  ['products', 'parties', 'txns'].forEach((k) => {
    if (!Array.isArray(S[k])) S[k] = [];
  });
}

export function validateBackupShape(st) {
  return st && typeof st === 'object' && Array.isArray(st.products) && Array.isArray(st.parties) && Array.isArray(st.txns);
}

function commit() {
  S.updatedAt = Date.now();
  if (persistFn) persistFn(S);
}
export const touch = commit;

const must = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const checkShop = (id) => must(SHOP_IDS.includes(id), 'Shop select karo');
const isInt = (n) => Number.isInteger(n);
const phoneOk = (p) => !p || /^[0-9+\-\s]{7,15}$/.test(p);

export const shopName = (id) => (id === 'all' ? 'All Shops' : S.settings.shopNames[id] || id);
export const findProduct = (id) => S.products.find((p) => p.id === id);
export const findParty = (id) => S.parties.find((p) => p.id === id);
export const partyName = (id) => findParty(id)?.name || '';
const inShop = (x, shop) => shop === 'all' || x.shopId === shop;

export function setShopNames(names) {
  SHOP_IDS.forEach((id) => {
    const n = (names[id] || '').trim();
    must(n, 'Shop ka naam khaali nahi ho sakta');
    S.settings.shopNames[id] = n;
  });
  commit();
}

/* ---------------- Products / stock ---------------- */

function logStock(p, delta, o = {}) {
  const before = p.qty;
  p.qty = before + delta;
  S.txns.push({
    id: uid(), type: 'STOCK', shopId: p.shopId, ts: o.ts || Date.now(),
    productId: p.id, name: p.name, delta, before, after: p.qty,
    reason: o.reason || 'Manual Adjustment', note: o.note || '',
    source: p.source, partyId: p.partyId, partyName: partyName(p.partyId),
    value: money(o.value ?? delta * p.buy),
  });
}

function readProductFields(d) {
  const name = (d.name || '').trim();
  must(name, 'Product ka naam likho');
  const buy = num(d.buy), sell = num(d.sell), min = d.min === '' || d.min == null ? 5 : num(d.min);
  must(buy >= 0 && sell >= 0, 'Price negative nahi ho sakta');
  must(isInt(min) && min >= 0, 'Minimum stock poora number ho');
  return {
    name, buy: money(buy), sell: money(sell), min,
    category: CATEGORIES.includes(d.category) ? d.category : 'Other',
    brand: (d.brand || '').trim(), notes: (d.notes || '').trim(),
  };
}

// Own-shop product (stock from your own shop). Other-shop stock is created through addPurchase.
export function addProduct(d) {
  checkShop(d.shopId);
  const f = readProductFields(d);
  const qty = num(d.qty);
  must(isInt(qty) && qty >= 0, 'Quantity 0 ya usse zyada poora number ho');
  must(
    !S.products.some((p) => p.shopId === d.shopId && p.source === 'OWN' && p.name.toLowerCase() === f.name.toLowerCase()),
    'Ye product is shop me pehle se hai — uski Quantity badhao'
  );
  const ts = d.ts || Date.now();
  const p = { id: uid(), shopId: d.shopId, ...f, qty: 0, source: 'OWN', partyId: null, createdAt: ts };
  S.products.push(p);
  if (qty > 0) logStock(p, qty, { reason: 'Opening Stock', ts, value: qty * p.buy });
  commit();
  return p;
}

export function editProduct(id, d) {
  const p = findProduct(id);
  must(p, 'Product nahi mila');
  const f = readProductFields(d);
  must(
    !S.products.some((x) => x.id !== id && x.shopId === p.shopId && x.source === p.source && x.partyId === p.partyId && x.name.toLowerCase() === f.name.toLowerCase()),
    'Isi naam ka dusra product pehle se hai'
  );
  Object.assign(p, f);
  commit();
  return p;
}

export function deleteProduct(id) {
  must(findProduct(id), 'Product nahi mila');
  S.products = S.products.filter((p) => p.id !== id);
  commit();
}

// delta > 0 adds stock, delta < 0 reduces. Reason "Sold" records a real sale at the selling price.
export function adjustStock(id, delta, reason, note = '', ts = Date.now()) {
  const p = findProduct(id);
  must(p, 'Product nahi mila');
  delta = num(delta);
  must(isInt(delta) && delta !== 0, 'Quantity 1 ya usse zyada ho');
  must(p.qty + delta >= 0, `Stock sirf ${p.qty} hai — ${-delta} kam nahi ho sakte`);
  if (delta < 0 && reason === 'Sold') {
    return addSales([{ productId: id, qty: -delta, price: p.sell }], { method: 'Cash', ts, note: note || 'Quick stock update' });
  }
  if (delta > 0 && reason === 'New Stock') {
    must(p.source === 'OWN', 'Other shop ka stock Purchase se add karo, taaki hisaab (pending) bane');
  }
  const value = delta > 0 && reason === 'New Stock' ? delta * p.buy : delta * p.buy;
  logStock(p, delta, { reason, note, ts, value });
  commit();
  return p;
}

/* ---------------- Parties (other shops) ---------------- */

function readParty(d) {
  const name = (d.name || '').trim();
  must(name, 'Shop ka naam likho');
  const phone = (d.phone || '').trim();
  must(phoneOk(phone), 'Phone number sahi likho');
  return { name, owner: (d.owner || '').trim(), phone, address: (d.address || '').trim(), notes: (d.notes || '').trim() };
}

export function addParty(d) {
  const f = readParty(d);
  must(!S.parties.some((p) => p.name.toLowerCase() === f.name.toLowerCase()), 'Is naam ki shop pehle se hai');
  const p = { id: uid(), ...f, createdAt: Date.now() };
  S.parties.push(p);
  commit();
  return p;
}

export function editParty(id, d) {
  const p = findParty(id);
  must(p, 'Shop nahi mili');
  const f = readParty(d);
  must(!S.parties.some((x) => x.id !== id && x.name.toLowerCase() === f.name.toLowerCase()), 'Is naam ki dusri shop pehle se hai');
  Object.assign(p, f);
  S.txns.forEach((t) => t.partyId === id && (t.partyName = f.name));
  commit();
  return p;
}

export function deleteParty(id) {
  must(findParty(id), 'Shop nahi mili');
  must(!S.txns.some((t) => t.partyId === id && (t.type === 'PURCHASE' || t.type === 'PAYMENT')), 'Is shop ka hisaab (purchase/payment) hai — delete nahi kar sakte');
  must(!S.products.some((p) => p.partyId === id && p.qty > 0), 'Is shop ka stock abhi bacha hai');
  S.products = S.products.filter((p) => p.partyId !== id);
  S.parties = S.parties.filter((p) => p.id !== id);
  commit();
}

export function partyStats(partyId, shop = 'all') {
  let bought = 0, paid = 0;
  for (const t of S.txns) {
    if (t.partyId !== partyId || !inShop(t, shop)) continue;
    if (t.type === 'PURCHASE') bought += t.total;
    else if (t.type === 'PAYMENT') paid += t.amount;
  }
  return { bought: money(bought), paid: money(paid), pending: money(bought - paid) };
}

export function payable(shop = 'all') {
  return money(S.parties.reduce((s, p) => s + Math.max(0, partyStats(p.id, shop).pending), 0));
}

// Ledger rows for one shop account with running balance
export function statement(partyId, shop = 'all') {
  const rows = [];
  let bal = 0;
  S.txns
    .map((t, i) => [t, i])
    .filter(([t]) => t.partyId === partyId && (t.type === 'PURCHASE' || t.type === 'PAYMENT') && inShop(t, shop))
    .sort((a, b) => a[0].ts - b[0].ts || a[1] - b[1]) // same time -> keep entry order
    .forEach(([t]) => {
      const debit = t.type === 'PURCHASE' ? t.total : 0;
      const credit = t.type === 'PAYMENT' ? t.amount : 0;
      bal = money(bal + debit - credit);
      rows.push({
        t, ts: t.ts, debit, credit, balance: bal,
        desc: t.type === 'PURCHASE' ? `${t.name} × ${t.qty} (₹${t.unitCost} each)` : `Payment (${t.method})${t.note ? ' – ' + t.note : ''}`,
      });
    });
  return rows;
}

/* ---------------- Purchases & payments ---------------- */

export function addPurchase(d) {
  checkShop(d.shopId);
  const party = findParty(d.partyId);
  must(party, 'Other shop select karo');
  const qty = num(d.qty), unit = num(d.unitCost);
  must(isInt(qty) && qty > 0, 'Quantity 1 ya usse zyada ho');
  must(unit > 0, 'Purchase price 0 se zyada likho');
  const total = money(qty * unit);
  const status = d.status || 'UNPAID';
  must(['PAID', 'PARTIAL', 'UNPAID'].includes(status), 'Payment status chuno');
  let paid = 0;
  if (status === 'PAID') paid = total;
  if (status === 'PARTIAL') {
    paid = money(num(d.paid));
    must(paid > 0 && paid < total, `Partial amount 0 se zyada aur ${total} se kam ho`);
  }
  const method = d.method || 'Cash';
  if (paid > 0) must(PAYOUT_METHODS.includes(method), 'Payment method chuno');
  const ts = d.ts || Date.now();

  let p = d.productId ? findProduct(d.productId) : null;
  if (p) {
    must(p.shopId === d.shopId, 'Ye product dusri shop ka hai');
    must(p.source === 'OTHER' && p.partyId === party.id, 'Ye product is other shop ka nahi hai');
  } else {
    const name = (d.name || '').trim();
    must(name, 'Product ka naam likho');
    p = S.products.find((x) => x.shopId === d.shopId && x.source === 'OTHER' && x.partyId === party.id && x.name.toLowerCase() === name.toLowerCase());
    if (!p) {
      const sell = num(d.sell);
      must(sell > 0, 'Naye product ka selling price likho');
      const min = d.min === '' || d.min == null ? 5 : num(d.min);
      must(isInt(min) && min >= 0, 'Minimum stock poora number ho');
      p = {
        id: uid(), shopId: d.shopId, name, category: CATEGORIES.includes(d.category) ? d.category : 'Other',
        brand: (d.brand || '').trim(), qty: 0, buy: unit, sell: money(sell), min, source: 'OTHER',
        partyId: party.id, notes: '', createdAt: ts,
      };
      S.products.push(p);
    }
  }
  // weighted-average cost so profit stays honest when buying price changes
  p.buy = p.qty > 0 ? money((p.qty * p.buy + qty * unit) / (p.qty + qty)) : unit;
  p.qty += qty;
  if (num(d.sell) > 0) p.sell = money(num(d.sell));

  const purchase = {
    id: uid(), type: 'PURCHASE', shopId: d.shopId, ts, partyId: party.id, partyName: party.name,
    productId: p.id, name: p.name, qty, unitCost: unit, total, paid, status,
    billNo: (d.billNo || '').trim(), note: (d.note || '').trim(),
  };
  S.txns.push(purchase);
  let payment = null;
  if (paid > 0) {
    payment = {
      id: uid(), type: 'PAYMENT', shopId: d.shopId, ts, partyId: party.id, partyName: party.name,
      amount: paid, method, note: 'Purchase ke time diya', purchaseId: purchase.id, auto: true,
    };
    S.txns.push(payment);
  }
  commit();
  return { purchase, payment, product: p };
}

export function addPayment(d) {
  checkShop(d.shopId);
  const party = findParty(d.partyId);
  must(party, 'Other shop select karo');
  const amount = money(num(d.amount));
  must(amount > 0, 'Amount 0 se zyada likho');
  const pending = partyStats(party.id, d.shopId).pending;
  must(pending > 0, 'Is shop ka koi pending nahi hai');
  must(amount <= pending + 0.001, `Pending sirf ${pending} hai — usse zyada payment nahi ho sakti`);
  const method = d.method || 'Cash';
  must(PAYOUT_METHODS.includes(method), 'Payment method chuno');
  const t = {
    id: uid(), type: 'PAYMENT', shopId: d.shopId, ts: d.ts || Date.now(), partyId: party.id, partyName: party.name,
    amount, method, note: (d.note || '').trim(),
  };
  S.txns.push(t);
  commit();
  return t;
}

/* ---------------- Sales ---------------- */

export function addSales(lines, meta = {}) {
  must(lines && lines.length, 'Koi item nahi chuna');
  const method = meta.method || 'Cash';
  must(SALE_METHODS.includes(method), 'Payment method chuno');
  const phone = (meta.phone || '').trim();
  must(phoneOk(phone), 'Customer phone sahi likho');
  const ts = meta.ts || Date.now();
  const need = {};
  const prepared = lines.map((l) => {
    const p = findProduct(l.productId);
    must(p, 'Product nahi mila');
    const qty = num(l.qty), price = num(l.price), disc = num(l.discount);
    must(isInt(qty) && qty > 0, `${p.name}: quantity 1 ya usse zyada ho`);
    must(price >= 0, `${p.name}: selling price sahi likho`);
    must(disc >= 0 && disc <= qty * price, 'Discount total se zyada nahi ho sakta');
    need[p.id] = (need[p.id] || 0) + qty;
    must(need[p.id] <= p.qty, `${p.name}: stock me sirf ${p.qty} bache hain`);
    return { p, qty, price, disc };
  });
  const batch = uid();
  const out = [];
  prepared.forEach(({ p, qty, price, disc }) => {
    p.qty -= qty;
    const subtotal = money(qty * price);
    const t = {
      id: uid(), type: 'SALE', batch, shopId: p.shopId, ts, productId: p.id, name: p.name,
      qty, price, subtotal, discount: money(disc), total: money(subtotal - disc),
      cost: p.buy, source: p.source, partyId: p.partyId, partyName: partyName(p.partyId),
      method, customer: (meta.customer || '').trim(), phone, note: (meta.note || '').trim(),
    };
    S.txns.push(t);
    out.push(t);
  });
  commit();
  return out;
}

/* ---------------- Expenses ---------------- */

export function addExpense(d) {
  checkShop(d.shopId);
  must(EXPENSE_CATS.includes(d.category), 'Expense category chuno');
  const amount = money(num(d.amount));
  must(amount > 0, 'Amount 0 se zyada likho');
  must(EXP_METHODS.includes(d.method), 'Payment method chuno');
  const t = {
    id: uid(), type: 'EXPENSE', shopId: d.shopId, ts: d.ts || Date.now(), category: d.category,
    amount, method: d.method, note: (d.note || '').trim(), imageId: d.imageId || null,
  };
  S.txns.push(t);
  commit();
  return t;
}

/* ---------------- Delete a transaction (with stock reversal) ---------------- */

export function deleteTxn(id) {
  const t = S.txns.find((x) => x.id === id);
  must(t, 'Record nahi mila');
  const removed = [id];
  if (t.type === 'SALE') {
    const p = findProduct(t.productId);
    if (p) p.qty += t.qty;
  } else if (t.type === 'PURCHASE') {
    const p = findProduct(t.productId);
    if (p) {
      must(p.qty >= t.qty, `Is item ka stock ab ${p.qty} hai (purchase ${t.qty} tha) — pehle related sale delete karo ya stock theek karo`);
      p.qty -= t.qty;
    }
    S.txns.filter((x) => x.type === 'PAYMENT' && x.purchaseId === id).forEach((x) => removed.push(x.id));
  } else if (t.type === 'PAYMENT') {
    must(!t.purchaseId, 'Ye payment purchase ke saath bani thi — purchase delete karo');
  } else if (t.type === 'STOCK') {
    must(false, 'Stock entry delete nahi hoti — ulta adjustment karo');
  }
  S.txns = S.txns.filter((x) => !removed.includes(x.id));
  commit();
  return t;
}

/* ---------------- Calculations ---------------- */

export function stockStats(shop = 'all') {
  const list = S.products.filter((p) => inShop(p, shop));
  const low = list.filter((p) => p.qty <= p.min).sort((a, b) => a.qty - b.qty);
  return {
    items: list.length,
    units: list.reduce((s, p) => s + p.qty, 0),
    value: money(list.reduce((s, p) => s + p.qty * p.buy, 0)),
    low,
  };
}

export function summary(shop, from, to) {
  const r = {
    sales: 0, ownSales: 0, otherSales: 0, otherPurchases: 0, ownStockValue: 0, expenses: 0,
    paid: 0, cogs: 0, stockAdded: 0, stockSold: 0, salesCount: 0, zeroCost: 0, discount: 0,
  };
  for (const t of S.txns) {
    if (t.ts < from || t.ts > to || !inShop(t, shop)) continue;
    if (t.type === 'SALE') {
      r.sales += t.total;
      if (t.source === 'OTHER') r.otherSales += t.total;
      else r.ownSales += t.total;
      r.cogs += t.qty * t.cost;
      r.stockSold += t.qty;
      r.salesCount++;
      r.discount += t.discount;
      if (!t.cost) r.zeroCost++;
    } else if (t.type === 'PURCHASE') {
      r.otherPurchases += t.total;
      r.stockAdded += t.qty;
    } else if (t.type === 'PAYMENT') r.paid += t.amount;
    else if (t.type === 'EXPENSE') r.expenses += t.amount;
    else if (t.type === 'STOCK' && t.delta > 0) {
      r.stockAdded += t.delta;
      if (t.source === 'OWN' && (t.reason === 'New Stock' || t.reason === 'Opening Stock')) r.ownStockValue += t.value;
    }
  }
  Object.keys(r).forEach((k) => (r[k] = money(r[k])));
  r.totalPurchases = money(r.otherPurchases + r.ownStockValue);
  r.profit = money(r.sales - r.cogs);
  r.pending = payable(shop);
  return r;
}

// Per-day buckets for charts (weekly buckets if the range is long)
export function dailySeries(shop, from, to) {
  const days = [];
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  for (let d = new Date(start); d <= end && days.length < 400; d.setDate(d.getDate() + 1)) {
    days.push({ key: dayKey(d.getTime()), ts: d.getTime(), sales: 0, own: 0, other: 0, purchase: 0, expense: 0 });
  }
  const map = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const t of S.txns) {
    if (t.ts < from || t.ts > to || !inShop(t, shop)) continue;
    const b = map[dayKey(t.ts)];
    if (!b) continue;
    if (t.type === 'SALE') {
      b.sales += t.total;
      if (t.source === 'OTHER') b.other += t.total;
      else b.own += t.total;
    } else if (t.type === 'PURCHASE') b.purchase += t.total;
    else if (t.type === 'EXPENSE') b.expense += t.amount;
    else if (t.type === 'STOCK' && t.delta > 0 && t.source === 'OWN' && (t.reason === 'New Stock' || t.reason === 'Opening Stock')) b.purchase += t.value;
  }
  return days;
}

export function searchAll(q, shop = 'all') {
  q = (q || '').trim().toLowerCase();
  if (!q) return { products: [], parties: [], txns: [] };
  const has = (...v) => v.some((x) => String(x || '').toLowerCase().includes(q));
  return {
    products: S.products.filter((p) => inShop(p, shop) && has(p.name, p.brand, p.category, p.notes, partyName(p.partyId))),
    parties: S.parties.filter((p) => has(p.name, p.owner, p.phone, p.address)),
    txns: S.txns
      .filter((t) => inShop(t, shop) && has(t.name, t.partyName, t.customer, t.phone, t.note, t.category, t.method, t.billNo))
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 60),
  };
}

/* ---------------- Backup helpers ---------------- */

export function replaceAll(data) {
  must(validateBackupShape(data), 'Ye valid backup file nahi hai');
  load(data);
  commit();
}

export function eraseAll() {
  S = blank();
  commit();
}

/* ---------------- Demo data (clearly marked, removable) ---------------- */

export function loadDemo() {
  must(!S.products.some((p) => p.demo), 'Demo data pehle se load hai');
  const before = { p: new Set(S.products.map((x) => x.id)), a: new Set(S.parties.map((x) => x.id)), t: new Set(S.txns.map((x) => x.id)) };
  const day = 86400000, now = Date.now();
  const at = (daysAgo, h, m = 0) => {
    const d = new Date(now - daysAgo * day);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const raj = addParty({ name: 'Raj Mobile Shop', owner: 'Raj Kumar', phone: '9876500001', notes: 'Demo' });
  const gupta = addParty({ name: 'Gupta Mobile', owner: 'Anil Gupta', phone: '9876500002', notes: 'Demo' });
  const own = (name, category, qty, buy, sell, min, ts) => addProduct({ shopId: 's1', name, category, qty, buy, sell, min, ts });
  const pTc = own('Type-C Cable', 'Cable', 3, 60, 150, 5, at(9, 11));
  const pCh = own('20W Charger', 'Charger', 12, 250, 450, 4, at(9, 11));
  own('Tempered Glass 9H', 'Tempered Glass', 40, 15, 80, 10, at(9, 11));
  own('Earphones Basic', 'Earphones', 8, 70, 199, 4, at(8, 12));
  addPurchase({ shopId: 's1', partyId: raj.id, name: 'Type-C Cable (Braided)', category: 'Cable', qty: 5, unitCost: 80, sell: 150, status: 'UNPAID', ts: at(5, 19, 30) });
  addPurchase({ shopId: 's1', partyId: raj.id, name: 'Back Cover Silicone', category: 'Back Cover / Folder', qty: 10, unitCost: 45, sell: 120, status: 'PARTIAL', paid: 200, method: 'Cash', ts: at(4, 18) });
  addPurchase({ shopId: 's1', partyId: gupta.id, name: 'Micro USB Cable', category: 'Cable', qty: 6, unitCost: 35, sell: 90, status: 'PAID', method: 'UPI', ts: at(3, 17) });
  addPayment({ shopId: 's1', partyId: raj.id, amount: 200, method: 'UPI', ts: at(2, 20), note: 'Demo payment' });
  const sell = (id, qty, price, daysAgo, h, method = 'Cash') => addSales([{ productId: id, qty, price }], { method, ts: at(daysAgo, h, 10) });
  sell(pTc.id, 1, 150, 6, 20);
  sell(pCh.id, 2, 450, 5, 19, 'UPI');
  const rajCable = S.products.find((p) => p.name.startsWith('Type-C Cable (Braided)'));
  sell(rajCable.id, 2, 150, 4, 20);
  sell(S.products.find((p) => p.name === 'Tempered Glass 9H').id, 6, 80, 3, 18);
  sell(S.products.find((p) => p.name === 'Back Cover Silicone').id, 3, 120, 1, 19, 'UPI');
  addExpense({ shopId: 's1', category: 'Tea/Food', amount: 60, method: 'Cash', ts: at(1, 15), note: 'Demo' });
  addExpense({ shopId: 's1', category: 'Travel', amount: 120, method: 'Cash', ts: at(0, 10), note: 'Demo' });
  S.products.forEach((x) => !before.p.has(x.id) && (x.demo = true));
  S.parties.forEach((x) => !before.a.has(x.id) && (x.demo = true));
  S.txns.forEach((x) => !before.t.has(x.id) && (x.demo = true));
  commit();
}

export function hasDemo() {
  return S.products.some((p) => p.demo) || S.parties.some((p) => p.demo) || S.txns.some((t) => t.demo);
}

export function removeDemo() {
  S.txns = S.txns.filter((t) => !t.demo);
  S.products = S.products.filter((p) => !p.demo);
  S.parties = S.parties.filter((p) => !p.demo);
  commit();
}
