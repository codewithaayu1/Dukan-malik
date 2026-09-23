// ============================================================
//  FIREBASE CONFIGURATION  —  YAHAN PASTE KARNA HAI (only place)
// ============================================================
// Firebase console -> Project settings -> Your apps -> Web app -> "Config"
// Neeche ki values replace kar do. Jab tak "PASTE_" likha hai, app
// sirf phone ke andar (offline, IndexedDB) chalega — bilkul theek.
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDMl15gDilutoM_slSGIV1mACE2ahozMrM',
  authDomain: 'dukan-malik.firebaseapp.com',
  projectId: 'dukan-malik',
  storageBucket: 'dukan-malik.firebasestorage.app',
  messagingSenderId: '1005760548552',
  appId: '1:1005760548552:web:e98981e5df582af1295ffd',
};

export const CLOUD_ENABLED = !String(FIREBASE_CONFIG.apiKey).startsWith('PASTE');
export const FIREBASE_SDK_VERSION = '10.12.2';
