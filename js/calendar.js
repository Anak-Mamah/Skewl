import {
  seasonForMonth,
  MONTH_NAMES,
  DAY_SHORT,
  isSameDay,
  dateKey,
  parseDateKey,
  categoryColor,
  AnnouncementStatus,
} from "./models.js";

function groupByDay(announcements) {
  const map = {};
  for (const a of announcements) {
    const key = dateKey(a.date);
    (map[key] ||= []).push(a);
  }
  return map;
}

/**
 * Merender kalender bulanan ke dalam `container`.
 * options: { focusedMonth: Date, announcements: Announcement[], onDayTap(date), onMonthChange(date) }
 */
export function renderCalendar(container, { focusedMonth, announcements, onDayTap, onMonthChange }) {
  const year = focusedMonth.getFullYear();
  const month = focusedMonth.getMonth();
  const season = seasonForMonth(month);
  const grouped = groupByDay(announcements);

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // JS: Minggu=0..Sabtu=6. Kita mulai grid dari Senin -> offset berikut.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const totalCells = leadingBlanks + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const today = new Date();

  let cells = "";
  for (let i = 0; i < rows * 7; i++) {
    const dayNum = i - leadingBlanks + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells += `<div class="cal-cell empty"></div>`;
      continue;
    }
    const date = new Date(year, month, dayNum);
    const key = dateKey(date);
    const dayEvents = grouped[key] || [];
    const isToday = isSameDay(date, today);
    const hasPending = dayEvents.some(
      (e) => e.status === AnnouncementStatus.PENDING || e.status === AnnouncementStatus.PENDING_DELETE
    );
    const dots = dayEvents
      .slice(0, 4)
      .map((e) => `<span class="cal-dot" style="background:${categoryColor(e.category)}"></span>`)
      .join("");

    cells += `
      <div class="cal-cell ${isToday ? "today" : ""}" data-date="${key}">
        ${isToday ? '<span class="cal-star">&#9733;</span>' : ""}
        <span class="cal-daynum">${dayNum}</span>
        <div class="cal-dots">${dots}${hasPending ? '<span class="cal-pending">!</span>' : ""}</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="stardew-calendar">
      <div class="cal-header">
        <button class="cal-arrow" data-dir="-1" aria-label="Bulan sebelumnya">&#10094;</button>
        <div class="cal-title">
          <div class="cal-month">${MONTH_NAMES[month]} ${year}</div>
          <div class="cal-season">${season.emoji} Musim ${season.label}</div>
        </div>
        <button class="cal-arrow" data-dir="1" aria-label="Bulan berikutnya">&#10095;</button>
      </div>
      <div class="cal-weekdays">${DAY_SHORT.map((d) => `<div>${d}</div>`).join("")}</div>
      <div class="cal-grid-wrap">
        <div class="cal-grid">${cells}</div>
      </div>
    </div>`;

  container.querySelectorAll(".cal-arrow").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = parseInt(btn.dataset.dir, 10);
      onMonthChange(new Date(year, month + dir, 1));
    });
  });
  container.querySelectorAll(".cal-cell[data-date]").forEach((cell) => {
    cell.addEventListener("click", () => onDayTap(parseDateKey(cell.dataset.date)));
  });
}
