// PENTING — BACA INI:
// Ini PLACEHOLDER. Ganti nilai di bawah dengan konfigurasi Firebase project
// Anda sendiri: Firebase Console -> Project Settings -> General ->
// "Your apps" -> Web app (ikon </>). Lihat README.md bagian "Setup Firebase".

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY_ANDA",
  authDomain: "GANTI_DENGAN_PROJECT_ID.firebaseapp.com",
  projectId: "GANTI_DENGAN_PROJECT_ID",
  storageBucket: "GANTI_DENGAN_PROJECT_ID.appspot.com",
  messagingSenderId: "GANTI_DENGAN_SENDER_ID",
  appId: "GANTI_DENGAN_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Memberi instance Firebase KEDUA (app bernama "Secondary"), khusus untuk
 * membuat akun baru (createUserWithEmailAndPassword). Ini penting karena
 * memanggil createUserWithEmailAndPassword pada app UTAMA akan otomatis
 * mengganti sesi login yang sedang aktif dengan akun baru tsb — padahal
 * admin/guru yang sedang login harus tetap login saat membuat akun
 * guru/murid baru.
 */
export function getSecondaryAuth() {
  let secondaryApp;
  try {
    secondaryApp = getApp("Secondary");
  } catch (e) {
    secondaryApp = initializeApp(firebaseConfig, "Secondary");
  }
  return getAuth(secondaryApp);
}
