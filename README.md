# Mobile Shop Manager
### Stock • Sales • Purchase • Accounts

Ek complete mobile-first app aapki do mobile-accessories shops chalane ke liye —
stock, roz ki sales, doosri shop se liya udhaar maal, un shopo ka hisaab, expenses
aur reports, sab ek jagah.

---

## 1. Ye kaise chalayein (abhi, bina kisi setup ke)

Ye ek **static web app / PWA** hai — koi build step nahi, koi npm install nahi. Bas
files kisi bhi web server se serve karni hain (browser seedhe `file://` se `.js`
modules load nahi karne deta, isliye ek chhota sa server chahiye):

**Sabse aasaan (computer par test karne ke liye):**
```bash
cd mobile-shop-manager
python3 -m http.server 8080
```
Phir browser me kholo: `http://localhost:8080`

**Phone par daalne ke liye**, in files ko kisi bhi free static hosting par upload
kar do — sabse aasaan hai:
- **Netlify Drop** — https://app.netlify.com/drop — folder ko seedhe khींch ke
  daal do, turant ek link mil jayega (e.g. `your-shop.netlify.app`).
- **GitHub Pages**, **Vercel**, **Firebase Hosting** — ye bhi free hain agar aap
  thoda tech-comfortable ho.
- Ya apne existing hosting/cPanel me `public_html` folder me ye files daal do.

Jo bhi link mile, use apne Android phone ke Chrome me kholo — neeche "Home
Screen par kaise add karein" dekho.

---

## 2. Folder structure

```
mobile-shop-manager/
├── index.html              → App ka entry point
├── manifest.json           → PWA settings (naam, icon, colors)
├── sw.js                   → Service worker (offline support)
├── css/
│   └── style.css           → Poori app ki styling
├── icons/                  → App icons (192px, 512px, maskable)
└── js/
    ├── app.js              → Router + app shell (bottom nav, FAB, shop switch)
    ├── store.js            → Saara business logic (stock, sales, purchase, hisaab)
    ├── ui.js                → Reusable UI pieces (sheets, chips, toast, picker)
    ├── utils.js             → Helper functions (₹ formatting, dates, CSV)
    ├── auth.js               → PIN lock screen
    ├── storage.js            → IndexedDB persistence + image storage
    ├── views_main.js         → Home, Stock, History, Reports, Search screens
    ├── views_txn.js          → Sales, Purchase, Parties, Expenses screens
    ├── views_settings.js     → Settings, Backup, Cloud sync screens
    ├── config.js              → 🔴 FIREBASE CONFIG YAHAN PASTE KARNI HAI
    └── cloud.js                → Firebase sync logic (optional)
```

Koi missing file nahi hai — jaise hai waise hi chalega, kisi cheez ko build/compile
karne ki zaroorat nahi.

---

## 3. Pehli baar app kholne par

1. App khulte hi **PIN banane** ko kahega (4-6 ank). Ye PIN har baar app kholne par
   lagega — apne parivar ke alawa koi aur aapka data na dekh paaye.
2. Home screen khulega — **"Welcome!"** ke saath.
3. Settings → **"Load Demo Data"** dabao to app turant sample data se bhar jayegi
   (2 shops, kuch products, sales, purchases) — isse aap dekh sakte ho app kaise
   kaam karti hai. Jab samajh aa jaye, Settings → **"Remove Demo Data"** dabake
   sirf demo entries hat jayengi, aapka असली data safe rahega.
4. Settings → **"Manage Business & Stores"** me jaake apni dono shops ke asli naam
   daal do (default "Shop 1" / "Shop 2" hai).

---

## 4. Data kahan save hota hai (IMPORTANT)

Abhi ye app **poora data aapke phone/browser ke andar hi** (IndexedDB) save karti
hai:
- Refresh karne se data nahi jata.
- Browser band karne se data nahi jata.
- Internet na ho tab bhi poori tarah kaam karti hai.

**Lekin** — agar aap browser ka data/cache clear karte ho, ya doosre phone/browser
se kholte ho, to wahan data nahi dikhega (kyunki wo alag jagah hai). Isiliye:

- **Roz ka backup lena zaroori hai** — neeche section 6 dekho.
- Agar chahte ho ki data cloud me bhi save ho (dono phone se access ho, kabhi
  bhula na ho), to neeche section 5 me Firebase setup karo — 10 minute ka kaam
  hai, aur bilkul free hai.

---

## 5. Firebase setup (Cloud Backup/Sync) — Optional, baad me bhi kar sakte ho

Jab tak aap ye setup nahi karte, app **poori tarah phone me hi** chalegi — koi
dikkat nahi. Jab ready ho:

### Step A — Firebase project banao
1. https://console.firebase.google.com par jao, Google account se login karo.
2. **"Add project"** → koi bhi naam do (e.g. "Mera Mobile Shop") → Continue.
3. Google Analytics ka option aaye to "Not now" kar sakte ho.

### Step B — Web app add karo
1. Project ke andar, **"</>"** (Web) icon par click karo.
2. App ka nickname do (e.g. "shop-app") → **"Register app"**.
3. Ek code dikhega jisme `firebaseConfig = { apiKey: "...", ... }` hoga — ye
   values copy kar lo (agle step me chahiye).

### Step C — Authentication ON karo
1. Left menu me **Build → Authentication → Get started**.
2. **"Email/Password"** provider चुनो → Enable karo → Save.

### Step D — Firestore Database banao
1. Left menu me **Build → Firestore Database → Create database**.
2. **"Start in production mode"** चुनो, apne najdeek ka region चुनो → Enable.
3. **"Rules"** tab me jaake ye paste karo (sirf logged-in user apna hi data
   padh/likh sake):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   → **Publish**.

### Step E — Config file me paste karo
`js/config.js` file kholo, aur Step B me mila hua config in values me paste
karo:

```js
export const FIREBASE_CONFIG = {
  apiKey: "yahan_paste_karo",
  authDomain: "yahan_paste_karo",
  projectId: "yahan_paste_karo",
  storageBucket: "yahan_paste_karo",
  messagingSenderId: "yahan_paste_karo",
  appId: "yahan_paste_karo",
};
```

Save karo, file upload/deploy karo. Ab app me **Settings → Data Sync & Cloud
Backup** me login/account-banane ka option aa jayega. Login karke **"Is phone ka
data cloud par bhejo"** dabao — bas, ab backup cloud me bhi hai.

> Cloud sync **manual** hai (auto nahi) — jab chaho "cloud par bhejo" ya "cloud se
> laao" dabao. Isse galti se doosre phone ka data ऊपर se overwrite nahi hota.

---

## 6. Backup / Restore (bina Firebase ke bhi)

**Settings → Backup / Export:**
- **"Export Full Backup (JSON)"** — poori app (stock, sales, purchase, parties,
  expenses) ek file me. Isi file se wapas restore bhi ho sakta hai.
- Alag-alag CSV bhi download kar sakte ho (Transactions / Stock / Parties) — Excel
  me kholne ke liye.

**Settings → Restore from File:**
- Purani JSON backup file चुनो → current data replace ho jayega (pehle confirm
  माँगेगा).

**Salah:** Har hafte ek baar JSON backup lekar WhatsApp/Email/Google Drive me apne
aap ko bhej do. 2 minute ka kaam hai, aur data kabhi nahi khoyega.

---

## 7. Android Home Screen par install kaise karein

1. Apna app-link Chrome (Android) me kholo.
2. Upar-right **⋮ (three dots) menu** → **"Add to Home screen"** / **"Install
   app"** दबाओ.
3. Confirm karo — ab app ka icon home screen par aa jayega, bilkul ek normal app
   ki tarah (apni window me khulega, Chrome ki address bar nahi dikhegi).
4. iPhone (Safari) par: Share icon → "Add to Home Screen".

Install karne ke baad bhi data wahi rahega jo pehle Chrome tab me tha (same
browser engine use hota hai).

---

## 8. Roz ka istemal — quick tips

- **Shaam ko jaldi entry karni ho:** Sales tab → **Quick Sale** → product search
  karo → quantity +/- karo → **Save Sale**. 3 taps me ek sale ho jaati hai.
- **Stock turant update karna ho:** Stock tab me kisi bhi product par **"Add"** ya
  **"Kam"** button — ek number daalo, reason चुनो (Damaged/Lost/Sold/etc), done.
- **Dusri shop se maal liya:** Purchase tab → Add Purchase → shop चुनो → product
  ka naam likho (naya ho to details bhi bharo) → quantity, price, payment status
  → Save. Stock aur us shop ka pending dono apne aap update ho jate hain.
- **Kisi shop ko payment ki:** Purchase tab → Make Payment → shop चुनो → amount
  (ya "Poora pending" button) → Save.
- **Floating हरा + button** (neeche-right) se kahin se bhi Sale/Stock/Purchase/
  Expense turant khol sakte ho.
- **PIN bhool jao to:** filhaal koi "forgot PIN" recovery nahi hai (security ke
  liye) — Settings me sirf "Erase All Data" hi option hai jisse app reset hoti
  hai (isliye regular backup lena zaroori hai — section 6 dekho).

---

## 9. Kya-kya banaya gaya hai (sab functional hai, koi demo/fake button nahi)

✅ Dashboard — quick actions, date filters, sales/purchase/expense/profit cards,
   low-stock alerts, recent activity, own-vs-other-shop split
✅ Stock — add/edit/delete, +/- quantity with reasons, search, filters (category/
   low-stock/own/other), full item history
✅ Sales — Quick Sale (multi-item cart) aur Detailed Sale (customer/discount/note
   ke saath), Sales History with search & date filters
✅ Purchase — dusri shop se maal, naya-ya-purana product auto-detect, weighted-
   average cost tracking, Paid/Partial/Unpaid, linked payment on partial/paid
✅ Parties — pending summary, full Account Statement (date/description/amount/
   running balance) jaisa aapne manga tha, CSV export, share
✅ Expenses — categories, payment method, bill photo (compressed, phone me hi
   save)
✅ History — universal search across sab transactions
✅ Reports — weekly/monthly summary, sales/purchase/expense/own-vs-other charts,
   shop-wise breakup, honest gross-profit calculation, CSV export
✅ Two shops — poora data shop-wise separate, "All Shops" combined view bhi
✅ PIN lock, offline support (service worker), JSON/CSV backup & restore,
   optional Firebase cloud sync

**Jaan-boojh kar nahi banaya** (jaisa aapne kaha tha): repair management, IMEI
tracking, payroll, GST complexity, delivery/CRM features.

---

Koi sawaal ho ya kuch aur chahiye ho, bata dena — badhaao easy hai. 🙂
