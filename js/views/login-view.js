import { UserRole } from "../models.js";
import { loginAs } from "../auth-service.js";

const ROLES = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT];
const ROLE_TAB_LABEL = { [UserRole.ADMIN]: "Admin", [UserRole.TEACHER]: "Guru", [UserRole.STUDENT]: "Murid" };

/**
 * Merender halaman login.
 * options: { onBack, initialError }
 */
export function renderLoginView(container, { onBack, initialError = "" } = {}) {
  let selectedRoleIndex = 0;
  let submitting = false;

  container.innerHTML = `
    <div class="topbar">
      <h1>📜 SMK YASBAM</h1>
    </div>
    <div class="login-wrap">
      <div class="login-card wood-panel">
        <h2>Papan Masuk Internal</h2>
        <div class="role-tabs">
          ${ROLES.map(
            (r, i) => `<button type="button" class="role-tab ${i === 0 ? "active" : ""}" data-idx="${i}">${ROLE_TAB_LABEL[r]}</button>`
          ).join("")}
        </div>
        <div class="parchment-panel">
          <form id="login-form">
            <div class="field">
              <label>Email</label>
              <input type="email" name="email" autocomplete="username" required />
            </div>
            <div class="field">
              <label>Kata Sandi</label>
              <input type="password" name="password" autocomplete="current-password" required />
            </div>
            <div class="login-error" style="display:${initialError ? "block" : "none"}">${escapeHtml(initialError)}</div>
            <button type="submit" class="wood-btn" id="submit-login">🔑 Masuk</button>
          </form>
        </div>
        <div class="login-back" id="back-link">Kembali ke Kalender Publik</div>
      </div>
    </div>`;

  const tabs = container.querySelectorAll(".role-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      if (submitting) return;
      selectedRoleIndex = Number.parseInt(tab.dataset.idx, 10);
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
    });
  });

  const form = container.querySelector("#login-form");
  const errorBox = container.querySelector(".login-error");
  const submitBtn = container.querySelector("#submit-login");

  async function submit(event) {
    event?.preventDefault();
    if (submitting) return;

    errorBox.textContent = "";
    errorBox.style.display = "none";

    const fd = new FormData(form);
    const email = fd.get("email");
    const password = fd.get("password");

    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";

    try {
      await loginAs(email, password, ROLES[selectedRoleIndex]);
      // Router app.js akan berpindah setelah Auth + profil Firestore tervalidasi.
    } catch (err) {
      console.error("[LOGIN]", err);
      errorBox.textContent = friendlyAuthError(err);
      errorBox.style.display = "block";
    } finally {
      submitting = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "🔑 Masuk";
    }
  }

  // Hanya gunakan submit event. Sebelumnya click + submit membuat satu klik
  // berpotensi menjalankan loginAs() dua kali secara bersamaan.
  form.addEventListener("submit", submit);
  container.querySelector("#back-link").addEventListener("click", () => onBack?.());
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email atau kata sandi salah.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi.";
    case "auth/network-request-failed":
      return "Tidak dapat terhubung ke Firebase. Periksa koneksi internet.";
    case "auth/user-disabled":
      return "Akun ini dinonaktifkan.";
    default:
      return err?.message || "Login gagal. Silakan coba lagi.";
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
