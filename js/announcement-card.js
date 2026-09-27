import {
  categoryColor,
  categoryLabel,
  statusLabel,
  targetLabel,
  AnnouncementStatus,
  escapeHtml,
} from "./models.js";

function statusColor(status) {
  switch (status) {
    case AnnouncementStatus.APPROVED: return "#5c8a3a";
    case AnnouncementStatus.PENDING_DELETE: return "#b3452c";
    case AnnouncementStatus.REJECTED: return "#7a7a7a";
    default: return "#e0a526";
  }
}

/**
 * Membuat & mengembalikan elemen DOM kartu pengumuman.
 * handlers: { canEdit, canApprove, onEdit, onDelete, onApprove, onReject }
 */
export function createAnnouncementCard(a, handlers = {}) {
  const { canEdit = false, canApprove = false, onEdit, onDelete, onApprove, onReject } = handlers;
  const pinColor = categoryColor(a.category);

  const wrap = document.createElement("div");
  wrap.className = "ann-card parchment-panel";
  wrap.innerHTML = `
    <div class="ann-pin" style="background:${pinColor}"></div>
    <div class="badge" style="background:${pinColor}; float:right;">${categoryLabel(a.category)}</div>
    <div class="ann-title">${escapeHtml(a.title)}</div>
    <div class="ann-content">${escapeHtml(a.content)}</div>
    <div class="ann-badges">
      <span class="badge" style="background:var(--wood-mid)">Untuk: ${targetLabel(a.target)}</span>
      <span class="badge" style="background:${statusColor(a.status)}">${statusLabel(a.status)}</span>
      <span class="badge" style="background:var(--ink)">${escapeHtml(a.authorName)}</span>
    </div>
    ${canEdit || canApprove ? `<div class="ann-actions"></div>` : ""}
  `;

  const actions = wrap.querySelector(".ann-actions");
  if (actions) {
    if (canApprove && a.status === AnnouncementStatus.PENDING) {
      actions.appendChild(makeChip("✓ Setujui", "#5c8a3a", onApprove));
      actions.appendChild(makeChip("✕ Tolak", "#b3452c", onReject));
    }
    if (canApprove && a.status === AnnouncementStatus.PENDING_DELETE) {
      actions.appendChild(makeChip("🗑 Konfirmasi Hapus", "#b3452c", onApprove));
    }
    if (canEdit) {
      actions.appendChild(makeChip("✎ Edit", "#3e6e9e", onEdit));
      actions.appendChild(makeChip("🗑 Hapus", "#b3452c", onDelete));
    }
  }

  return wrap;
}

function makeChip(label, color, onClick) {
  const btn = document.createElement("button");
  btn.className = "chip-btn";
  btn.style.background = color;
  btn.textContent = label;
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}
