// ---------- PERAN PENGGUNA ----------
// Tiga jenis akun internal. TIDAK ADA pendaftaran publik: admin dibuat
// manual sekali di awal, guru hanya dibuat admin, murid hanya dibuat guru
// (maks 1/akun) atau admin.
export const UserRole = { ADMIN: "admin", TEACHER: "teacher", STUDENT: "student" };

export function roleLabel(role) {
  switch (role) {
    case UserRole.ADMIN: return "Admin";
    case UserRole.TEACHER: return "Guru";
    case UserRole.STUDENT: return "Murid";
    default: return role;
  }
}

// ---------- KATEGORI & TARGET PENGUMUMAN ----------
export const AnnouncementCategory = { AKADEMIK: "akademik", KEGIATAN: "kegiatan", PENTING: "penting", UMUM: "umum" };

export function categoryLabel(c) {
  switch (c) {
    case AnnouncementCategory.AKADEMIK: return "Akademik";
    case AnnouncementCategory.KEGIATAN: return "Kegiatan";
    case AnnouncementCategory.PENTING: return "Penting";
    default: return "Umum";
  }
}

export function categoryColor(c) {
  switch (c) {
    case AnnouncementCategory.AKADEMIK: return "#3E6E9E";
    case AnnouncementCategory.KEGIATAN: return "#5C8A3A";
    case AnnouncementCategory.PENTING: return "#B3452C";
    default: return "#8B5A2B";
  }
}

export const TargetAudience = { SEMUA: "semua", GURU: "guru", MURID: "murid" };

export function targetLabel(t) {
  switch (t) {
    case TargetAudience.GURU: return "Guru";
    case TargetAudience.MURID: return "Murid";
    default: return "Semua";
  }
}

// ---------- STATUS PERSETUJUAN ----------
// pending       : baru dibuat/diedit MURID, menunggu guru/admin.
// approved      : tayang di kalender publik.
// pendingDelete : murid minta hapus, menunggu konfirmasi guru/admin.
// rejected      : ditolak guru/admin.
export const AnnouncementStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  PENDING_DELETE: "pendingDelete",
  REJECTED: "rejected",
};

export function statusLabel(s) {
  switch (s) {
    case AnnouncementStatus.APPROVED: return "Disetujui";
    case AnnouncementStatus.PENDING_DELETE: return "Menunggu Konfirmasi Hapus";
    case AnnouncementStatus.REJECTED: return "Ditolak";
    default: return "Menunggu Persetujuan";
  }
}

// ---------- MODEL PENGGUNA ----------
export class AppUser {
  constructor({ uid, name, email, role, teacherId = null, studentId = null, createdBy, createdAt }) {
    this.uid = uid;
    this.name = name;
    this.email = email;
    this.role = role;
    this.teacherId = teacherId; // hanya untuk murid: uid guru yang menambahkannya
    this.studentId = studentId; // hanya untuk guru: uid satu-satunya murid (maks 1)
    this.createdBy = createdBy;
    this.createdAt = createdAt;
  }

  get isAdmin() { return this.role === UserRole.ADMIN; }
  get isTeacher() { return this.role === UserRole.TEACHER; }
  get isStudent() { return this.role === UserRole.STUDENT; }
  get canAddStudent() { return this.isTeacher && this.studentId == null; }

  /** Apakah user ini berwenang mengelola pengumuman ber-authorId tertentu. */
  canManageAuthoredBy(authorId /*, authorRole */) {
    if (this.isAdmin) return true;
    if (this.isTeacher) return authorId === this.uid || (this.studentId != null && authorId === this.studentId);
    if (this.isStudent) return authorId === this.uid;
    return false;
  }

  static fromDoc(uid, data) {
    const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v instanceof Date ? v : new Date());
    return new AppUser({
      uid,
      name: data.name || "",
      email: data.email || "",
      role: data.role || UserRole.STUDENT,
      teacherId: data.teacherId ?? null,
      studentId: data.studentId ?? null,
      createdBy: data.createdBy || "",
      createdAt: toDate(data.createdAt),
    });
  }

  toMap() {
    return {
      name: this.name,
      email: this.email,
      role: this.role,
      teacherId: this.teacherId,
      studentId: this.studentId,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
    };
  }
}

// ---------- MODEL PENGUMUMAN ----------
export class Announcement {
  constructor({ id, title, content, date, category, target, authorId, authorName, authorRole, status, approvedBy = null, createdAt, updatedAt }) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.date = date;
    this.category = category;
    this.target = target;
    this.authorId = authorId;
    this.authorName = authorName;
    this.authorRole = authorRole;
    this.status = status;
    this.approvedBy = approvedBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromDoc(docSnap) {
    const data = docSnap.data();
    const toDate = (v) => (v && typeof v.toDate === "function" ? v.toDate() : v instanceof Date ? v : new Date());
    return new Announcement({
      id: docSnap.id,
      title: data.title || "",
      content: data.content || "",
      date: toDate(data.date),
      category: data.category || AnnouncementCategory.UMUM,
      target: data.target || TargetAudience.SEMUA,
      authorId: data.authorId || "",
      authorName: data.authorName || "",
      authorRole: data.authorRole || UserRole.STUDENT,
      status: data.status || AnnouncementStatus.PENDING,
      approvedBy: data.approvedBy ?? null,
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    });
  }
}

// ---------- UTIL MUSIM (kosmetik, terinspirasi Stardew Valley) ----------
export const SEASONS = [
  { label: "Dingin", emoji: "❄️", primary: "#64B5F6" },
  { label: "Semi", emoji: "🌸", primary: "#7CB342" },
  { label: "Panas", emoji: "🌻", primary: "#4CAF50" },
  { label: "Gugur", emoji: "🍂", primary: "#EF8F00" },
];

/** month: 0-11 (JS Date.getMonth()) */
export function seasonForMonth(month) {
  if (month >= 2 && month <= 4) return SEASONS[1]; // Mar-Mei
  if (month >= 5 && month <= 7) return SEASONS[2]; // Jun-Agu
  if (month >= 8 && month <= 10) return SEASONS[3]; // Sep-Nov
  return SEASONS[0]; // Des, Jan, Feb
}

export const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const DAY_SHORT = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatFullDate(d) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return `${days[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(d) {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Escape teks agar aman disisipkan ke dalam innerHTML, baik sebagai teks
 * maupun sebagai nilai atribut (mis. value="..."). Ini penting karena judul
 * & isi pengumuman berasal dari input pengguna (termasuk murid) dan
 * dirender lewat innerHTML di beberapa tempat (kartu pengumuman, form edit).
 */
export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
