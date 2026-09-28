import { watchAuthState, watchAppUser, logout, syncFirestoreEmailWithAuth } from "./auth-service.js";
import { UserRole } from "./models.js";
import { renderPublicView } from "./views/public-view.js";
import { renderLoginView } from "./views/login-view.js";
import { renderAdminView } from "./views/admin-view.js";
import { renderTeacherView } from "./views/teacher-view.js";
import { renderStudentView } from "./views/student-view.js";

const root = document.getElementById("app");
let unsubUserDoc = null;
let routeGeneration = 0;
let lastAuthError = null;

function cleanupCurrentView() {
  root._cleanup?.();
  root._cleanup = null;
}

function mount(renderFn, ...args) {
  cleanupCurrentView();
  root.innerHTML = "";
  renderFn(root, ...args);
}

function showPublic() {
  lastAuthError = null;
  mount(renderPublicView, {
    onLoginClick: () => mount(renderLoginView, { onBack: showPublic }),
  });
}

function showLogin(message = "") {
  mount(renderLoginView, {
    onBack: showPublic,
    initialError: message,
  });
}

function showLoading(message = "Memeriksa sesi...") {
  cleanupCurrentView();
  root.innerHTML = `
    <div class="login-wrap">
      <div class="login-card wood-panel" style="text-align:center">
        <img src="https://ugc.production.linktr.ee/4btAu48R9qoHS6tpuI0J_D7osonk2FBBtpmoE?io=true&size=avatar-v3_0" alt="Logo SMK YASBAM" style="width:64px;height:64px;object-fit:contain;background:#fff;border-radius:10px" />
        <h2>${message}</h2>
        <p style="color:var(--wood-dark)">Mohon tunggu sebentar...</p>
      </div>
    </div>`;
}

function showAuthError(error) {
  console.error("[AUTH ROUTER]", error);
  const code = error?.code || "unknown";
  let message = "Sesi tidak dapat diperiksa. Silakan coba lagi.";

  if (code === "permission-denied") {
    message = "Akses profil pengguna ditolak Firestore. Periksa Firestore Rules dan dokumen users/{UID}.";
  } else if (code === "failed-precondition") {
    message = "Firestore belum siap atau konfigurasi database belum benar.";
  } else if (code === "unavailable") {
    message = "Firebase sedang tidak dapat dihubungi. Periksa koneksi internet.";
  }

  showLogin(message);
}

function routeAppUser(appUser) {
  if (!appUser) {
    showLogin(
      "Login Firebase berhasil, tetapi profil pengguna tidak ditemukan. Pastikan dokumen Firestore users/{UID} sudah dibuat dengan UID akun yang sama."
    );
    // Tidak memanggil logout di sini. Pesan error tetap terlihat dan akun dapat
    // diperbaiki oleh admin tanpa pengguna terlempar diam-diam ke halaman publik.
    return;
  }

  lastAuthError = null;
  switch (appUser.role) {
    case UserRole.ADMIN:
      mount(renderAdminView, appUser);
      break;
    case UserRole.TEACHER:
      mount(renderTeacherView, appUser);
      break;
    case UserRole.STUDENT:
      mount(renderStudentView, appUser);
      break;
    default:
      showLogin(`Role pengguna tidak valid: ${appUser.role || "kosong"}.`);
  }
}

watchAuthState(
  (firebaseUser) => {
    const generation = ++routeGeneration;

    if (unsubUserDoc) {
      unsubUserDoc();
      unsubUserDoc = null;
    }

    if (!firebaseUser) {
      // Jika signOut terjadi karena loginAs() sedang menampilkan pesan validasi
      // (misalnya role salah / profil belum ada), jangan menimpa form login
      // dengan halaman publik.
      if (root.querySelector("#login-form")) return;
      showPublic();
      return;
    }

    showLoading("Menyiapkan akun...");

    // Setelah pengguna menyelesaikan verifikasi pergantian email, Firebase Auth
    // menjadi sumber email terbaru. Sinkronkan ke profil Firestore saat token
    // sudah membawa email terbaru. Kegagalan sinkronisasi tidak memutus sesi.
    syncFirestoreEmailWithAuth().catch((error) => console.warn("[EMAIL SYNC]", error));

    unsubUserDoc = watchAppUser(
      firebaseUser.uid,
      (appUser) => {
        if (generation !== routeGeneration) return;
        routeAppUser(appUser);
      },
      (error) => {
        if (generation !== routeGeneration) return;
        showAuthError(error);
      }
    );
  },
  (error) => {
    console.error("[AUTH STATE]", error);
    showAuthError(error);
  }
);

// Ekspor kecil untuk debugging dari DevTools tanpa membuka akses baru.
window.__SMK_YASBAM_AUTH_DEBUG__ = {
  logout,
  getRouteGeneration: () => routeGeneration,
  getLastAuthError: () => lastAuthError,
};
