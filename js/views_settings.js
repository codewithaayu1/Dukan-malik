// Settings / Backup / Cloud sync / PIN change / Shop names / Demo data.
import * as store from './store.js';
import { esc, inr, fmtDateTime, download, toCSV, uid } from './utils.js';
import { A, C, I, ctx, icon, toast, fail, sheet, confirmBox, field, v, empty } from './ui.js';
import { getAuth, setAuth, kvGet, saveState, flush, askPersistent } from './storage.js';
import * as cloud from './cloud.js';
import { sha256 } from './utils.js';

export function settingsView(el) {
  const names = store.get().settings.shopNames;
  el.innerHTML = `
  <div class="card list settings-list">
    <button class="li" data-act="setShops"><span class="ico tone-purple">${icon('store')}</span><span class="grow"><b>Manage Business & Stores</b><span class="muted sm">${esc(names.s1)} · ${esc(names.s2)}</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setPin"><span class="ico tone-blue">${icon('lock')}</span><span class="grow"><b>Change PIN</b><span class="muted sm">App lock ka PIN badlo</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setCloud"><span class="ico tone-mint">${icon('cloud')}</span><span class="grow"><b>Data Sync & Cloud Backup</b><span class="muted sm" id="cloud-sub">Loading...</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setBackup"><span class="ico tone-amber">${icon('download')}</span><span class="grow"><b>Backup / Export</b><span class="muted sm">Export as JSON ya CSV</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setRestore"><span class="ico tone-amber">${icon('upload')}</span><span class="grow"><b>Restore from File</b><span class="muted sm">Purana JSON backup wapas load karo</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setDemo"><span class="ico tone-lilac">${icon('box')}</span><span class="grow"><b>${store.hasDemo() ? 'Remove Demo Data' : 'Load Demo Data'}</b><span class="muted sm">${store.hasDemo() ? 'App se demo entries hatao' : 'Dekhne ke liye sample data daalo'}</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setErase"><span class="ico tone-red">${icon('trash')}</span><span class="grow"><b>Erase All Data</b><span class="muted sm">Sab kuch mita do (backup lena mat bhoolo)</span></span>${icon('chevR')}</button>
    <button class="li" data-act="setLock"><span class="ico tone-red">${icon('logout')}</span><span class="grow"><b>Lock App</b><span class="muted sm">Turant PIN screen par jao</span></span>${icon('chevR')}</button>
  </div>
  <p class="muted sm center">Mobile Shop Manager · Stock • Sales • Purchase • Accounts</p>
  <div class="spacer"></div>`;
  refreshCloudSub();
}
async function refreshCloudSub() {
  const n = document.getElementById('cloud-sub');
  if (!n) return;
  if (!cloud.cloudEnabled) {
    n.textContent = 'Abhi off hai — phone me hi save ho raha hai';
    return;
  }
  try {
    const u = await cloud.currentUser();
    n.textContent = u ? `${u.email} se sync ho raha hai` : 'Login karke cloud backup ON karo';
  } catch (_) {
    n.textContent = 'Cloud se connect nahi ho paya';
  }
}

/* ----- Shop names ----- */
A.setShops = () => {
  const names = store.get().settings.shopNames;
  sheet({
    title: 'Manage Business & Stores',
    body: `<div class="form">${field('Shop 1 ka naam', `<input name="s1" value="${esc(names.s1)}">`)}${field('Shop 2 ka naam', `<input name="s2" value="${esc(names.s2)}">`)}
    <button class="btn primary block lg" data-act="setShopsSave">Save</button></div>`,
  });
};
A.setShopsSave = (el) => {
  const r = el.closest('.sheet-b');
  try {
    store.setShopNames({ s1: v(r, 's1'), s2: v(r, 's2') });
    toast('Shop names update ho gaye');
    el.closest('.sheet-wrap').querySelector('[data-sheet-close]').click();
    ctx.refresh();
  } catch (e) {
    fail(e);
  }
};

/* ----- PIN change ----- */
A.setPin = () => {
  sheet({
    title: 'Change PIN',
    body: `<div class="form">
      ${field('Current PIN', '<input name="cur" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">')}
      ${field('New PIN (4-6 digit)', '<input name="new1" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">')}
      ${field('New PIN dobara', '<input name="new2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off">')}
      <button class="btn primary block lg" data-act="pinChange">Save New PIN</button></div>`,
  });
};
A.pinChange = async (el) => {
  const r = el.closest('.sheet-b');
  const cur = v(r, 'cur'), n1 = v(r, 'new1'), n2 = v(r, 'new2');
  try {
    const auth = await getAuth();
    if (auth?.pinHash && auth.pinHash !== (await sha256(cur))) throw new Error('Current PIN galat hai');
    if (!/^\d{4,6}$/.test(n1)) throw new Error('Naya PIN 4-6 ank ka ho');
    if (n1 !== n2) throw new Error('Dono naye PIN match nahi kar rahe');
    await setAuth({ ...(auth || {}), pinHash: await sha256(n1) });
    toast('PIN badal gaya');
    el.closest('.sheet-wrap').querySelector('[data-sheet-close]').click();
  } catch (e) {
    fail(e);
  }
};

/* ----- Backup / export ----- */
A.setBackup = () => {
  sheet({
    title: 'Backup / Export',
    body: `<div class="form">
      <button class="btn primary block lg" data-act="expJson">${icon('download')} Export Full Backup (JSON)</button>
      <p class="muted sm">Isse poori app — stock, sales, purchase, parties, expenses — ek file me save ho jayegi. Isi file se restore bhi kar sakte ho.</p>
      <hr class="hr">
      <button class="btn ghost block" data-act="expCsv" data-w="txns">${icon('download')} All Transactions (CSV)</button>
      <button class="btn ghost block" data-act="expCsv" data-w="products">${icon('download')} Stock List (CSV)</button>
      <button class="btn ghost block" data-act="expCsv" data-w="parties">${icon('download')} Parties Summary (CSV)</button></div>`,
  });
};
A.expJson = () => {
  const data = { ...store.get(), exportedAt: Date.now(), app: 'Mobile Shop Manager' };
  download(`mobile-shop-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  toast('Backup file download ho gayi');
};
A.expCsv = (el) => {
  const s = store.get();
  const w = el.dataset.w;
  let rows;
  if (w === 'txns') rows = [['Date', 'Type', 'Shop', 'Name/Category', 'Qty', 'Amount', 'Method/Reason', 'Party', 'Note'], ...s.txns.map((t) => [
    fmtDateTime(t.ts), t.type, store.shopName(t.shopId), t.name || t.category || '', t.qty || '', t.total ?? t.amount ?? '', t.method || t.reason || '', t.partyName || '', t.note || '',
  ])];
  else if (w === 'products') rows = [['Name', 'Category', 'Shop', 'Source', 'Qty', 'Buy Price', 'Sell Price', 'Min Stock', 'Stock Value'], ...s.products.map((p) => [
    p.name, p.category, store.shopName(p.shopId), p.source, p.qty, p.buy, p.sell, p.min, (p.qty * p.buy).toFixed(2),
  ])];
  else rows = [['Shop', 'Owner', 'Phone', 'Total', 'Paid', 'Pending'], ...s.parties.map((p) => {
    const st = store.partyStats(p.id, 'all');
    return [p.name, p.owner, p.phone, st.bought, st.paid, st.pending];
  })];
  download(`${w}-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows), 'text/csv');
  toast('CSV download ho gayi');
};

/* ----- Restore ----- */
A.setRestore = () => {
  sheet({
    title: 'Restore from File',
    body: `<div class="form">
      <p class="note warn">${icon('alert')}<span>Ye aapke phone ka current data replace kar dega. Pehle current data ka bhi backup le lena behtar hai.</span></p>
      <label class="btn ghost block lg">${icon('upload')} JSON file chuno<input type="file" accept=".json,application/json" hidden data-ch="restoreFile"></label></div>`,
  });
};
C.restoreFile = async (el) => {
  const f = el.files?.[0];
  el.value = '';
  if (!f) return;
  try {
    const text = await f.text();
    const data = JSON.parse(text);
    const ok = await confirmBox({ title: 'Restore karein?', message: `"${f.name}" se data load hoga aur current data replace ho jayega.`, ok: 'Restore', danger: true });
    if (!ok) return;
    store.replaceAll(data);
    toast('Data restore ho gaya');
    document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
    ctx.refresh();
  } catch (e) {
    fail(new Error(e.message?.includes('JSON') ? 'Ye valid backup file nahi hai' : e.message));
  }
};

/* ----- Demo data ----- */
A.setDemo = async () => {
  if (store.hasDemo()) {
    const ok = await confirmBox({ title: 'Demo data hatayein?', message: 'Sirf demo se bani entries hategi, aapka real data safe rahega.', ok: 'Hatao' });
    if (!ok) return;
    store.removeDemo();
    toast('Demo data hat gaya');
  } else {
    try {
      store.loadDemo();
      toast('Demo data load ho gaya — dekh ke samjho app kaise kaam karti hai');
    } catch (e) {
      fail(e);
    }
  }
  ctx.refresh();
};

/* ----- Erase all ----- */
A.setErase = async () => {
  const ok1 = await confirmBox({ title: 'Sab data mitayein?', message: 'Stock, sales, purchases, parties, expenses — sab kuch hamesha ke liye mit jayega.', ok: 'Aage badho', danger: true });
  if (!ok1) return;
  const ok2 = await confirmBox({ title: 'Pakka pakka?', message: 'Ye wapas nahi ho sakta. Backup le liya hai?', ok: 'Haan, mitao', danger: true, cancel: 'Nahi, backup pehle lu' });
  if (!ok2) return;
  store.eraseAll();
  toast('Sab data mit gaya');
  ctx.refresh();
};

/* ----- Lock ----- */
A.setLock = () => document.dispatchEvent(new CustomEvent('msm:lock'));

/* ===================================================================
   CLOUD SYNC SHEET
   =================================================================== */
A.setCloud = async () => {
  if (!cloud.cloudEnabled) {
    sheet({
      title: 'Data Sync & Backup',
      body: `<div class="form">${empty('cloud', 'Cloud abhi setup nahi hai', 'js/config.js file me apni Firebase config paste karo, phir yahan se login karke sync ON kar sakte ho. Tab tak data surakshit hai — sirf isi phone/browser me.')}</div>`,
    });
    return;
  }
  let user;
  try {
    user = await cloud.currentUser();
  } catch (e) {
    return fail(e);
  }
  if (!user) return cloudLoginSheet();
  cloudSheet(user);
};
function cloudLoginSheet() {
  sheet({
    title: 'Cloud Login',
    body: `<div class="form" id="cl-form">
      <div class="seg" style="margin-bottom:4px">${'<button class="on" data-act=\"clTab\" data-v=\"in\">Login</button><button data-act=\"clTab\" data-v=\"up\">New Account</button>'}</div>
      ${field('Email', '<input name="email" type="email" inputmode="email" autocomplete="email">')}
      ${field('Password', '<input name="pass" type="password" autocomplete="current-password">')}
      <button class="btn primary block lg" data-act="clGo" data-mode="in">Login</button>
      <p class="muted sm center">Ye sirf iss phone ke alawa aur phone/computer se bhi apna data dekhne ke liye hai.</p></div>`,
    onMount: (root) => {
      root.querySelectorAll('[data-act=clTab]').forEach((b) =>
        b.addEventListener('click', () => {
          root.querySelectorAll('[data-act=clTab]').forEach((x) => x.classList.toggle('on', x === b));
          const go = root.querySelector('[data-act=clGo]');
          go.dataset.mode = b.dataset.v;
          go.textContent = b.dataset.v === 'in' ? 'Login' : 'Account Banao';
        })
      );
    },
  });
}
A.clGo = async (el) => {
  const r = el.closest('.sheet-b');
  const email = v(r, 'email'), pass = v(r, 'pass');
  el.disabled = true;
  el.textContent = 'Ruko...';
  try {
    const user = el.dataset.mode === 'in' ? await cloud.signIn(email, pass) : await cloud.signUp(email, pass);
    toast(`${user.email} se login ho gaye`);
    document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
    setTimeout(() => cloudSheet(user), 250);
  } catch (e) {
    fail(e);
    el.disabled = false;
    el.textContent = el.dataset.mode === 'in' ? 'Login' : 'Account Banao';
  }
};
async function cloudSheet(user) {
  sheet({
    title: 'Data Sync & Backup',
    body: `<div class="form">
      <div class="card flat"><b>${esc(user.email)}</b><div class="muted sm">Cloud se connected</div></div>
      <div id="cl-meta" class="muted sm">Checking...</div>
      <button class="btn primary block lg" data-act="clUpload">${icon('upload')} Is phone ka data cloud par bhejo</button>
      <button class="btn ghost block" data-act="clDownload">${icon('download')} Cloud se wapas laao (replace)</button>
      <button class="btn ghost block" data-act="clLogout">${icon('logout')} Cloud se logout karo</button></div>`,
    onMount: async (root) => {
      try {
        const meta = await cloud.remoteMeta();
        root.querySelector('#cl-meta').textContent = meta ? `Aakhri cloud backup: ${fmtDateTime(meta.savedAt)}` : 'Abhi tak cloud par kuch save nahi hua';
      } catch (e) {
        root.querySelector('#cl-meta').textContent = e.message;
      }
    },
  });
}
A.clUpload = async (el) => {
  el.disabled = true;
  el.textContent = 'Bhej rahe hain...';
  try {
    await cloud.upload(store.get());
    toast('Cloud par backup ho gaya');
    document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
  } catch (e) {
    fail(e);
  } finally {
    el.disabled = false;
    el.innerHTML = icon('upload') + ' Is phone ka data cloud par bhejo';
  }
};
A.clDownload = async (el) => {
  const ok = await confirmBox({ title: 'Cloud se data laayein?', message: 'Ye iss phone ka current data replace kar dega.', ok: 'Haan, laao', danger: true });
  if (!ok) return;
  el.disabled = true;
  el.textContent = 'Laa rahe hain...';
  try {
    const data = await cloud.download();
    store.replaceAll(data);
    toast('Cloud se data aa gaya');
    document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
    ctx.refresh();
  } catch (e) {
    fail(e);
  } finally {
    el.disabled = false;
    el.innerHTML = icon('download') + ' Cloud se wapas laao (replace)';
  }
};
A.clLogout = async () => {
  await cloud.signOut();
  toast('Cloud se logout ho gaye');
  document.querySelectorAll('.sheet-wrap [data-sheet-close]').forEach((b) => b.click());
};
