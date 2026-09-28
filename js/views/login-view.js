import { UserRole } from "../models.js";
import { loginAs, requestPasswordReset } from "../auth-service.js";
import { auth } from "../firebase-config.js";

const ROLES = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT];
const ROLE_TAB_LABEL = { [UserRole.ADMIN]: "Admin", [UserRole.TEACHER]: "Guru", [UserRole.STUDENT]: "Murid" };

export function renderLoginView(container, { onBack, initialError = "" } = {}) {
  let selectedRoleIndex = 0;
  let submitting = false;

  container.innerHTML = `
    <div class="topbar brand-bar">
      <div class="brand-lockup"><img src="https://ugc.production.linktr.ee/4btAu48R9qoHS6tpuI0J_D7osonk2FBBtpmoE?io=true&size=avatar-v3_0" alt="Logo SMK YASBAM" class="school-logo"/><h1>SMK YASBAM</h1></div>
    </div>
    <div class="login-wrap">
      <div class="login-card wood-panel">
        <h2>Papan Masuk Internal</h2>
        <div class="role-tabs">${ROLES.map((r, i) => `<button type="button" class="role-tab ${i === 0 ? "active" : ""}" data-idx="${i}">${ROLE_TAB_LABEL[r]}</button>`).join("")}</div>
        <div class="parchment-panel">
          <form id="login-form">
            <div class="field"><label>Email</label><input type="email" name="email" autocomplete="username" required /></div>
            <div class="field"><label>Kata Sandi</label><input type="password" name="password" autocomplete="current-password" required /></div>
            <div class="login-error" style="display:${initialError ? "block" : "none"}">${escapeHtml(initialError)}</div>
            <button type="submit" class="wood-btn" id="submit-login">🔑 Masuk</button>
          </form>
          <div class="auth-links">
            <button type="button" class="text-btn" id="forgot-password">Lupa kata sandi?</button>
          </div>
        </div>
        <div class="login-back" id="back-link">Kembali ke Beranda</div>
      </div>
    </div>`;

  const tabs = container.querySelectorAll(".role-tab");
  tabs.forEach((tab) => tab.addEventListener("click", () => {
    if (submitting) return;
    selectedRoleIndex = Number.parseInt(tab.dataset.idx, 10);
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
  }));

  const form = container.querySelector("#login-form");
  const errorBox = container.querySelector(".login-error");
  const submitBtn = container.querySelector("#submit-login");

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    errorBox.textContent = "";
    errorBox.style.display = "none";
    const fd = new FormData(form);
    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
    try {
      await loginAs(fd.get("email"), fd.get("password"), ROLES[selectedRoleIndex]);
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

  form.addEventListener("submit", submit);
  container.querySelector("#back-link").addEventListener("click", () => onBack?.());
  container.querySelector("#forgot-password").addEventListener("click", () => openResetDialog());
  function openResetDialog() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal-card"><h3>Reset Kata Sandi</h3><form id="reset-form"><div class="form-group"><label>Email akun</label><input type="email" name="email" required /></div><div class="form-error" style="display:none"></div><div class="modal-actions"><button type="button" class="wood-btn ghost" data-close>Batal</button><button type="submit" class="wood-btn success">Kirim Email Reset</button></div></form></div>`;
    document.body.appendChild(overlay);
    const form = overlay.querySelector("#reset-form");
    const error = overlay.querySelector(".form-error");
    const close = () => overlay.remove();
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.style.display = "none";
      try {
        await requestPasswordReset(new FormData(form).get("email"));
        alert("Email reset kata sandi telah dikirim. Periksa inbox dan folder spam.");
        close();
      } catch (err) {
        error.textContent = friendlyAuthError(err);
        error.style.display = "block";
      }
    });
  }
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  switch (code) {
    case "auth/email-not-verified": return "Email belum terverifikasi. Buka email verifikasi dari Firebase, lalu login kembali.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found": return "Email atau kata sandi salah.";
    case "auth/invalid-email": return "Format email tidak valid.";
    case "auth/too-many-requests": return "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.";
    case "auth/network-request-failed": return "Tidak dapat terhubung ke Firebase. Periksa koneksi internet.";
    case "auth/user-disabled": return "Akun ini dinonaktifkan.";
    case "auth/requires-recent-login": return "Silakan login ulang lalu coba lagi.";
    default: return err?.message || "Permintaan gagal. Silakan coba lagi.";
  }
}

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
