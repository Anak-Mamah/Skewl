import { roleLabel, escapeHtml } from "../models.js";
import { auth } from "../firebase-config.js";
import { logout, requestEmailChange, changePassword, deleteOwnAccount, syncFirestoreEmailWithAuth, resendVerificationEmail } from "../auth-service.js";

export function renderProfileTab(container, user) {
  const firebaseEmail = auth.currentUser?.email || user.email;
  const verified = !!auth.currentUser?.emailVerified;
  container.innerHTML = `
    <div class="profile-box">
      <div class="parchment-panel profile-card">
        <img src="https://ugc.production.linktr.ee/4btAu48R9qoHS6tpuI0J_D7osonk2FBBtpmoE?io=true&size=avatar-v3_0" alt="Logo SMK YASBAM" class="profile-logo"/>
        <div class="avatar-circle">${escapeHtml((user.name?.[0] || "?").toUpperCase())}</div>
        <div class="profile-name">${escapeHtml(user.name)}</div>
        <div class="profile-email">${escapeHtml(firebaseEmail)}</div>
        <div class="role-pill">${roleLabel(user.role)}</div>
        <div class="verify-status ${verified ? "verified" : "unverified"}">${verified ? "✓ Email terverifikasi" : "⚠ Email belum terverifikasi"}</div>
      </div>
      <div class="profile-actions">
        ${!verified ? `<button class="wood-btn" id="resend-verification">✉ Kirim Verifikasi</button>` : `
        <button class="wood-btn" id="change-email">✉ Ganti Email</button>
        <button class="wood-btn" id="change-password">🔒 Ganti Kata Sandi</button>`}
        <button class="wood-btn danger" id="delete-account">🗑 Hapus Akun Saya</button>
        <button class="wood-btn ghost" id="logout-btn">🚪 Keluar</button>
      </div>
    </div>`;

  container.querySelector("#logout-btn").addEventListener("click", () => logout());
  container.querySelector("#change-email").addEventListener("click", openChangeEmail);
  container.querySelector("#change-password").addEventListener("click", openChangePassword);
  container.querySelector("#delete-account").addEventListener("click", async () => {
    const ok = confirm("Akun Anda akan dihapus dari Firebase Authentication dan profil Firestore. Tindakan ini tidak dapat dibatalkan. Lanjutkan?");
    if (!ok) return;
    try {
      await deleteOwnAccount(user);
      alert("Akun berhasil dihapus.");
    } catch (err) {
      alert(err?.message || "Akun belum dapat dihapus.");
    }
  });
  container.querySelector("#resend-verification")?.addEventListener("click", async () => {
    try { await resendVerificationEmail(); alert("Email verifikasi dikirim ulang."); }
    catch (err) { alert(err?.message || "Gagal mengirim verifikasi."); }
  });

  async function openChangeEmail() {
    if (!auth.currentUser?.emailVerified) {
      alert("Verifikasi email terlebih dahulu sebelum mengganti email.");
      return;
    }
    const overlay = makeModal("Ganti Email", `<form id="email-form"><div class="form-group"><label>Email baru</label><input type="email" name="email" required /></div><div class="form-group"><label>Kata sandi saat ini</label><input type="password" name="password" required /></div><div class="form-error" style="display:none"></div><div class="modal-actions"><button type="button" class="wood-btn ghost" data-close>Batal</button><button type="submit" class="wood-btn success">Kirim Verifikasi</button></div></form>`);
    const form = overlay.querySelector("#email-form");
    const error = overlay.querySelector(".form-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); error.style.display = "none";
      try {
        const fd = new FormData(form);
        await requestEmailChange(fd.get("email"), fd.get("password"));
        alert("Link verifikasi telah dikirim ke email baru. Klik link tersebut untuk menyelesaikan pergantian email, lalu login kembali.");
        overlay.remove();
      } catch (err) { error.textContent = err?.message || "Gagal mengganti email."; error.style.display = "block"; }
    });
  }

  async function openChangePassword() {
    if (!auth.currentUser?.emailVerified) {
      alert("Verifikasi email terlebih dahulu sebelum mengganti kata sandi.");
      return;
    }
    const overlay = makeModal("Ganti Kata Sandi", `<form id="password-form"><div class="form-group"><label>Kata sandi saat ini</label><input type="password" name="current" required /></div><div class="form-group"><label>Kata sandi baru</label><input type="password" name="next" minlength="6" required /></div><div class="form-error" style="display:none"></div><div class="modal-actions"><button type="button" class="wood-btn ghost" data-close>Batal</button><button type="submit" class="wood-btn success">Simpan</button></div></form>`);
    const form = overlay.querySelector("#password-form"); const error = overlay.querySelector(".form-error");
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); error.style.display = "none";
      try { const fd = new FormData(form); await changePassword(fd.get("current"), fd.get("next")); alert("Kata sandi berhasil diubah."); overlay.remove(); }
      catch (err) { error.textContent = err?.message || "Gagal mengubah kata sandi."; error.style.display = "block"; }
    });
  }

  function makeModal(title, body) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal-card"><h3>${title}</h3>${body}</div>`;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector("[data-close]")?.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    return overlay;
  }
}
