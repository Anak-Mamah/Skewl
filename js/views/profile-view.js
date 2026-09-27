import { roleLabel, escapeHtml } from "../models.js";
import { logout } from "../auth-service.js";

export function renderProfileTab(container, user) {
  container.innerHTML = `
    <div class="profile-box">
      <div class="parchment-panel" style="max-width:360px;margin:0 auto;">
        <div class="avatar-circle">${escapeHtml((user.name?.[0] || "?").toUpperCase())}</div>
        <div style="font-size:24px;font-weight:bold;">${escapeHtml(user.name)}</div>
        <div style="font-size:16px;">${escapeHtml(user.email)}</div>
        <div class="role-pill">${roleLabel(user.role)}</div>
      </div>
      <div style="margin-top:24px;">
        <button class="wood-btn danger" id="logout-btn">🚪 Keluar</button>
      </div>
    </div>`;
  container.querySelector("#logout-btn").addEventListener("click", () => logout());
}
