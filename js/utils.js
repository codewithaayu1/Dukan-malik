// Small helpers: ids, escaping, ₹ formatting, DD/MM/YYYY dates, period ranges.

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function inr(n) {
  n = Number(n) || 0;
  const a = Math.abs(n);
  const s = a.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(a) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return (n < 0 ? '-' : '') + '₹' + s;
}

const p2 = (n) => String(n).padStart(2, '0');
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const fmtDay = (ts) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
export const fmtDayLong = (ts) => {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
// Follows the device's 12/24 hour setting
export const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (ts) => `${fmtDate(ts)}, ${fmtTime(ts)}`;

export const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
export const inputDate = (ts = Date.now()) => dayKey(ts);
export const inputTime = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
export function fromInputs(dateStr, timeStr) {
  const d = dateStr || inputDate();
  const t = timeStr || inputTime();
  const ts = new Date(`${d}T${t}:00`).getTime();
  return Number.isFinite(ts) ? ts : Date.now();
}

const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const eod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

export const PERIODS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'This Week'],
  ['month', 'This Month'],
  ['custom', 'Custom'],
];

export function rangeFor(key, custom = {}) {
  const now = new Date();
  switch (key) {
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return [sod(y), eod(y)];
    }
    case 'week': {
      const s = new Date(now);
      s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      return [sod(s), eod(e)];
    }
    case 'month':
      return [new Date(now.getFullYear(), now.getMonth(), 1).getTime(), eod(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
    case 'lastmonth':
      return [new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(), eod(new Date(now.getFullYear(), now.getMonth(), 0))];
    case 'all':
      return [0, Number.MAX_SAFE_INTEGER];
    case 'custom': {
      const f = custom.from ? new Date(custom.from + 'T00:00:00').getTime() : sod(now);
      const t = custom.to ? new Date(custom.to + 'T23:59:59.999').getTime() : eod(now);
      return [Math.min(f, t), Math.max(f, t)];
    }
    default:
      return [sod(now), eod(now)];
  }
}

export function periodLabel(key, custom = {}) {
  const [f, t] = rangeFor(key, custom);
  const names = { today: 'Today', yesterday: 'Kal', week: 'Is hafte', month: 'Is mahine', lastmonth: 'Pichhle mahine', all: 'Sabhi' };
  if (key === 'custom') return `${fmtDate(f)} – ${fmtDate(t)}`;
  return names[key] || '';
}

export const debounce = (fn, ms = 200) => {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

export function download(filename, content, mime = 'application/octet-stream') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function toCSV(rows) {
  const q = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '\ufeff' + rows.map((r) => r.map(q).join(',')).join('\r\n');
}

export async function sha256(text) {
  try {
    if (crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) {}
  // Fallback (non-secure context): simple 53-bit hash
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'f' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}
