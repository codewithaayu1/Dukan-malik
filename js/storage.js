// Persistent storage: IndexedDB (with localStorage fallback). Data survives refresh / closing the browser.
const DB = 'mobile-shop-manager';
const STORE = 'kv';
let dbp = null;

function open() {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (!dbp) {
    dbp = new Promise((res) => {
      try {
        const rq = indexedDB.open(DB, 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore(STORE);
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
      } catch (_) {
        res(null);
      }
    });
  }
  return dbp;
}

export async function kvGet(key) {
  const db = await open();
  if (!db) {
    try { return JSON.parse(localStorage.getItem('msm:' + key)); } catch (_) { return null; }
  }
  return new Promise((res) => {
    const rq = db.transaction(STORE).objectStore(STORE).get(key);
    rq.onsuccess = () => res(rq.result ?? null);
    rq.onerror = () => res(null);
  });
}

export async function kvSet(key, val) {
  const db = await open();
  if (!db) {
    localStorage.setItem('msm:' + key, JSON.stringify(val));
    return true;
  }
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

export async function kvDel(key) {
  const db = await open();
  if (!db) return localStorage.removeItem('msm:' + key);
  return new Promise((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => res(false);
  });
}

export async function kvKeys(prefix) {
  const db = await open();
  if (!db) return Object.keys(localStorage).filter((k) => k.startsWith('msm:' + prefix)).map((k) => k.slice(4));
  return new Promise((res) => {
    const rq = db.transaction(STORE).objectStore(STORE).getAllKeys();
    rq.onsuccess = () => res(rq.result.filter((k) => String(k).startsWith(prefix)));
    rq.onerror = () => res([]);
  });
}

export async function askPersistent() {
  try { return (await navigator.storage?.persist?.()) || false; } catch (_) { return false; }
}

// ----- state saving (debounced, flushed when the app is hidden/closed) -----
let timer = null, pending = null, lastError = null;
export const saveState = (state) => {
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(flush, 250);
};
export async function flush() {
  clearTimeout(timer);
  if (!pending) return;
  const s = pending;
  pending = null;
  try {
    await kvSet('state', JSON.parse(JSON.stringify(s)));
    lastError = null;
  } catch (e) {
    lastError = e;
    window.dispatchEvent(new CustomEvent('msm:save-error', { detail: e }));
  }
  window.dispatchEvent(new CustomEvent('msm:saved'));
}
export const getLastError = () => lastError;
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());

// ----- bill images (kept out of the main state so it stays small) -----
export const putImage = (id, dataUrl) => kvSet('img:' + id, dataUrl);
export const getImage = (id) => kvGet('img:' + id);
export const delImage = (id) => kvDel('img:' + id);

export function compressImage(file, max = 1000, quality = 0.72) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image padh nahi paye')); };
    img.src = url;
  });
}

// ----- PIN / session -----
export const getAuth = () => kvGet('auth');
export const setAuth = (a) => kvSet('auth', a);
