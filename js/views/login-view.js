import { UserRole } from "../models.js";
import { loginAs } from "../auth-service.js";

const ROLES = [UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT];
const ROLE_TAB_LABEL = { [UserRole.ADMIN]: "Admin", [UserRole.TEACHER]: "Guru", [UserRole.STUDENT]: "Murid" };

/**
 * Merender halaman login ke dalam `container`.
 * options: { onBack }
 */
export function renderLoginView(container, { onBack } = {}) {
  let selectedRoleIndex = 0;

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
              <input type="email" name="email" required />
            </div>
            <div class="field">
              <label>Kata Sandi</label>
              <input type="password" name="password" required />
            </div>
            <div class="login-error" style="display:none"></div>
          </form>
        </div>
        <div style="text-align:center;margin-top:16px;">
          <button class="wood-btn" id="submit-login">🔑 Masuk</button>
        </div>
        <div class="login-back" id="back-link">Kembali ke Kalender Publik</div>
      </div>
    </div>`;

  const tabs = container.querySelectorAll(".role-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedRoleIndex = parseInt(tab.dataset.idx, 10);
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
    });
  });

  const form = container.querySelector("#login-form");
  const errorBox = container.querySelector(".login-error");
  const submitBtn = container.querySelector("#submit-login");

  async function submit() {
    errorBox.style.display = "none";
    const fd = new FormData(form);
    const email = fd.get("email");
    const password = fd.get("password");
    submitBtn.disabled = true;
    submitBtn.textContent = "Memproses...";
    try {
      await loginAs(email, password, ROLES[selectedRoleIndex]);
      // Navigasi otomatis ditangani listener auth state di app.js.
    } catch (err) {
      errorBox.textContent = err.message || String(err);
      errorBox.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "🔑 Masuk";
    }
  }

  submitBtn.addEventListener("click", submit);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });

  container.querySelector("#back-link").addEventListener("click", () => onBack?.());
}
