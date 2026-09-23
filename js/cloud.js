// Optional Firebase cloud backup/sync. Does nothing until you paste your config in config.js.
// Data model in Firestore:  users/{uid}/backup/meta  and  users/{uid}/backup/c0, c1, ...  (JSON split in chunks)
import { CLOUD_ENABLED, FIREBASE_CONFIG, FIREBASE_SDK_VERSION as V } from './config.js';

export const cloudEnabled = CLOUD_ENABLED;
const CHUNK = 350000; // characters per document (Firestore limit is ~1 MB)
let lib = null, app = null, auth = null, db = null;

async function init() {
  if (!CLOUD_ENABLED) throw new Error('Firebase config paste nahi hua (js/config.js)');
  if (lib) return lib;
  const base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [a, au, fs] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js'),
  ]);
  app = a.initializeApp(FIREBASE_CONFIG);
  auth = au.getAuth(app);
  db = fs.getFirestore(app);
  lib = { a, au, fs };
  await new Promise((res) => au.onAuthStateChanged(auth, () => res(), () => res()));
  return lib;
}

export async function currentUser() {
  if (!CLOUD_ENABLED) return null;
  await init();
  return auth.currentUser ? { email: auth.currentUser.email, uid: auth.currentUser.uid } : null;
}

export async function signIn(email, password) {
  const { au } = await init();
  try {
    const c = await au.signInWithEmailAndPassword(auth, email, password);
    return { email: c.user.email, uid: c.user.uid };
  } catch (e) {
    throw new Error(friendly(e));
  }
}

export async function signUp(email, password) {
  const { au } = await init();
  try {
    const c = await au.createUserWithEmailAndPassword(auth, email, password);
    return { email: c.user.email, uid: c.user.uid };
  } catch (e) {
    throw new Error(friendly(e));
  }
}

export async function signOut() {
  const { au } = await init();
  await au.signOut(auth);
}

function friendly(e) {
  const c = e?.code || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Email ya password galat hai';
  if (c.includes('email-already-in-use')) return 'Ye email pehle se bana hua hai — Login karo';
  if (c.includes('weak-password')) return 'Password kam se kam 6 characters ka rakho';
  if (c.includes('network')) return 'Internet nahi hai';
  if (c.includes('operation-not-allowed')) return 'Firebase me Email/Password sign-in ON karo';
  return e?.message || 'Cloud error';
}

const docRef = (fs, uid, name) => fs.doc(db, 'users', uid, 'backup', name);

export async function upload(payload) {
  const { fs } = await init();
  const u = auth.currentUser;
  if (!u) throw new Error('Pehle cloud login karo');
  const text = JSON.stringify(payload);
  const parts = [];
  for (let i = 0; i < text.length; i += CHUNK) parts.push(text.slice(i, i + CHUNK));
  try {
    for (let i = 0; i < parts.length; i++) await fs.setDoc(docRef(fs, u.uid, 'c' + i), { data: parts[i] });
    await fs.setDoc(docRef(fs, u.uid, 'meta'), { chunks: parts.length, updatedAt: payload.updatedAt || Date.now(), savedAt: Date.now() });
  } catch (e) {
    throw new Error(e?.code === 'permission-denied' ? 'Firestore rules me permission nahi (README dekho)' : friendly(e));
  }
  return parts.length;
}

export async function remoteMeta() {
  const { fs } = await init();
  const u = auth.currentUser;
  if (!u) return null;
  try {
    const s = await fs.getDoc(docRef(fs, u.uid, 'meta'));
    return s.exists() ? s.data() : null;
  } catch (e) {
    throw new Error(e?.code === 'permission-denied' ? 'Firestore rules me permission nahi (README dekho)' : friendly(e));
  }
}

export async function download() {
  const { fs } = await init();
  const u = auth.currentUser;
  if (!u) throw new Error('Pehle cloud login karo');
  const meta = await remoteMeta();
  if (!meta) throw new Error('Cloud par abhi koi backup nahi hai');
  let text = '';
  for (let i = 0; i < meta.chunks; i++) {
    const s = await fs.getDoc(docRef(fs, u.uid, 'c' + i));
    if (!s.exists()) throw new Error('Cloud backup adhoora hai');
    text += s.data().data;
  }
  return JSON.parse(text);
}
