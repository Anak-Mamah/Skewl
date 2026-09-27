import { AnnouncementCategory, TargetAudience, categoryLabel, targetLabel, dateKey, parseDateKey, escapeHtml } from "./models.js";
import { createAnnouncement, updateAnnouncement } from "./announcement-service.js";

/**
 * Membuka modal form tambah/edit pengumuman.
 * options: { currentUser, initialDate, existing?, onSaved? }
 */
export function openAnnouncementForm({ currentUser, initialDate, existing = null, onSaved }) {
  const isEditing = !!existing;
  let selectedCategory = existing?.category || AnnouncementCategory.UMUM;
  let selectedTarget = existing?.target || TargetAudience.SEMUA;
  const initialDateValue = existing?.date || initialDate;

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <h3>${isEditing ? "Ubah Pengumuman" : "Pengumuman Baru"}</h3>
      <form>
        <div class="form-group">
          <label>Judul</label>
          <input type="text" name="title" value="${existing ? escapeHtml(existing.title) : ""}" required />
        </div>
        <div class="form-group">
          <label>Isi Pengumuman</label>
          <textarea name="content" required>${existing ? escapeHtml(existing.content) : ""}</textarea>
        </div>
        <div class="form-group">
          <label>Tanggal</label>
          <input type="date" name="date" value="${dateKey(initialDateValue)}" required />
        </div>
        <div class="form-group">
          <label>Kategori</label>
          <div class="choice-row cat-row">
            ${Object.values(AnnouncementCategory)
              .map(
                (c) =>
                  `<button type="button" class="choice-chip ${c === selectedCategory ? "selected" : ""}" data-cat="${c}">${categoryLabel(c)}</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="form-group">
          <label>Ditujukan untuk</label>
          <div class="choice-row target-row">
            ${Object.values(TargetAudience)
              .map(
                (t) =>
                  `<button type="button" class="choice-chip ${t === selectedTarget ? "selected" : ""}" data-target="${t}">${targetLabel(t)}</button>`
              )
              .join("")}
          </div>
        </div>
        ${
          currentUser.isStudent
            ? `<div class="hint-box">Karena Anda login sebagai Murid, pengumuman ini akan berstatus
               "Menunggu Persetujuan" sampai disetujui oleh guru/admin.</div>`
            : ""
        }
        <div class="form-error" style="display:none"></div>
        <div class="modal-actions">
          <button type="button" class="wood-btn ghost" data-close>Batal</button>
          <button type="submit" class="wood-btn success">Simpan</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  const form = overlay.querySelector("form");
  const errorBox = overlay.querySelector(".form-error");

  overlay.querySelectorAll(".cat-row .choice-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedCategory = btn.dataset.cat;
      overlay.querySelectorAll(".cat-row .choice-chip").forEach((b) => b.classList.toggle("selected", b === btn));
    });
  });
  overlay.querySelectorAll(".target-row .choice-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedTarget = btn.dataset.target;
      overlay.querySelectorAll(".target-row .choice-chip").forEach((b) => b.classList.toggle("selected", b === btn));
    });
  });

  function close() {
    overlay.remove();
  }
  overlay.querySelector("[data-close]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Menyimpan...";
    try {
      const fd = new FormData(form);
      const payload = {
        title: fd.get("title").trim(),
        content: fd.get("content").trim(),
        date: parseDateKey(fd.get("date")),
        category: selectedCategory,
        target: selectedTarget,
      };
      if (isEditing) {
        await updateAnnouncement({ editor: currentUser, original: existing, ...payload });
      } else {
        await createAnnouncement({ author: currentUser, ...payload });
      }
      close();
      onSaved?.();
    } catch (err) {
      errorBox.textContent = err.message || String(err);
      errorBox.style.display = "block";
      submitBtn.disabled = false;
      submitBtn.textContent = "Simpan";
    }
  });
}
