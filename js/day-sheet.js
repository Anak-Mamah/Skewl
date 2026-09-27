import { formatFullDate, AnnouncementStatus } from "./models.js";
import { createAnnouncementCard } from "./announcement-card.js";
import { openAnnouncementForm } from "./announcement-form.js";
import { requestDelete, approveAnnouncement, rejectAnnouncement, confirmDelete } from "./announcement-service.js";

/**
 * Menampilkan seluruh pengumuman pada `date` dalam bottom sheet.
 * `currentUser` null berarti pengunjung publik (read-only).
 * options: { date, dayAnnouncements, currentUser, onChanged }
 */
export function showDaySheet({ date, dayAnnouncements, currentUser, onChanged }) {
  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";
  overlay.innerHTML = `
    <div class="sheet-panel">
      <div class="sheet-handle"></div>
      <div class="sheet-date">${formatFullDate(date)}</div>
      <div class="sheet-list"></div>
      ${currentUser ? `<button class="wood-btn success sheet-add">+ Tambah Pengumuman</button>` : ""}
    </div>`;
  document.body.appendChild(overlay);

  const listEl = overlay.querySelector(".sheet-list");
  if (dayAnnouncements.length === 0) {
    listEl.innerHTML = `<p class="sheet-empty">Belum ada pengumuman di tanggal ini.</p>`;
  }

  function close() {
    overlay.remove();
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  dayAnnouncements.forEach((a) => {
    const canEdit = !!currentUser && currentUser.canManageAuthoredBy(a.authorId, a.authorRole);
    const canApprove = !!currentUser && !currentUser.isStudent && currentUser.canManageAuthoredBy(a.authorId, a.authorRole);

    const card = createAnnouncementCard(a, {
      canEdit,
      canApprove,
      onEdit: () => {
        close();
        openAnnouncementForm({ currentUser, initialDate: date, existing: a, onSaved: onChanged });
      },
      onDelete: async () => {
        await requestDelete({ requester: currentUser, target: a });
        close();
        onChanged?.();
      },
      onApprove: async () => {
        if (a.status === AnnouncementStatus.PENDING_DELETE) {
          await confirmDelete({ approver: currentUser, target: a });
        } else {
          await approveAnnouncement({ approver: currentUser, target: a });
        }
        close();
        onChanged?.();
      },
      onReject: async () => {
        await rejectAnnouncement({ approver: currentUser, target: a });
        close();
        onChanged?.();
      },
    });
    listEl.appendChild(card);
  });

  const addBtn = overlay.querySelector(".sheet-add");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      close();
      openAnnouncementForm({ currentUser, initialDate: date, onSaved: onChanged });
    });
  }
}
