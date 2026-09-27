import { seasonForMonth, isSameDay, dateKey } from "../models.js";
import { watchApproved } from "../announcement-service.js";
import { renderCalendar } from "../calendar.js";
import { showDaySheet } from "../day-sheet.js";

/**
 * Merender kalender publik (read-only) ke dalam `container`.
 * options: { onLoginClick }
 */
export function renderPublicView(container, { onLoginClick } = {}) {
  let focusedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let allAnnouncements = [];
  let unsub = null;

  container.innerHTML = `
    <div class="topbar">
      <h1>Papan Pengumuman SMK YASBAM</h1>
      <button class="wood-btn ghost small" id="login-btn">🔑 Masuk</button>
    </div>
    <div class="dash-body">
      <div class="welcome-banner parchment-panel" id="banner"></div>
      <div id="calendar-slot" class="wood-panel"></div>
      <div style="text-align:center;margin-top:18px;">
        <button class="wood-btn" id="login-btn-2">🔑 Masuk sebagai Guru / Murid / Admin</button>
      </div>
    </div>`;

  container.querySelector("#login-btn").addEventListener("click", () => onLoginClick?.());
  container.querySelector("#login-btn-2").addEventListener("click", () => onLoginClick?.());

  function renderBanner() {
    const season = seasonForMonth(focusedMonth.getMonth());
    container.querySelector("#banner").innerHTML = `
      <h2>${season.emoji} Selamat datang di SMK YASBAM ${season.emoji}</h2>
      <p>Lihat pengumuman resmi sekolah di kalender bawah ini. Guru, murid, dan admin dapat masuk untuk mengelola isi papan.</p>`;
  }

  function draw() {
    renderBanner();
    const slot = container.querySelector("#calendar-slot");
    renderCalendar(slot, {
      focusedMonth,
      announcements: allAnnouncements,
      onMonthChange: (m) => {
        focusedMonth = m;
        draw();
      },
      onDayTap: (date) => {
        const events = allAnnouncements.filter((a) => isSameDay(a.date, date));
        showDaySheet({ date, dayAnnouncements: events, currentUser: null });
      },
    });
  }

  draw();
  unsub = watchApproved((list) => {
    allAnnouncements = list;
    draw();
  });

  // Bersihkan listener Firestore kalau container ini nanti diganti view lain.
  container._cleanup = () => unsub?.();
}
