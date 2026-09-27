import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { Announcement, AnnouncementStatus } from "./models.js";

const col = collection(db, "announcements");

/** Kalender PUBLIK: hanya pengumuman yang sudah disetujui. */
export function watchApproved(callback) {
  const q = query(col, where("status", "==", AnnouncementStatus.APPROVED), orderBy("date"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => Announcement.fromDoc(d))));
}

/**
 * Panel "Pengumuman Saya": semua status milik akun yang login, dan — khusus
 * guru — juga milik satu murid yang ia tambahkan. Admin melihat semuanya.
 */
export function watchManageableBy(user, callback) {
  if (user.isAdmin) {
    const q = query(col, orderBy("date"));
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => Announcement.fromDoc(d))));
  }
  if (user.isTeacher) {
    const ids = user.studentId ? [user.uid, user.studentId] : [user.uid];
    const q = query(col, where("authorId", "in", ids));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => Announcement.fromDoc(d));
      list.sort((a, b) => a.date - b.date);
      callback(list);
    });
  }
  // murid
  const q = query(col, where("authorId", "==", user.uid));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => Announcement.fromDoc(d));
    list.sort((a, b) => a.date - b.date);
    callback(list);
  });
}

function canManage(user, a) {
  return user.canManageAuthoredBy(a.authorId, a.authorRole);
}

/**
 * Membuat pengumuman baru. Status otomatis:
 * - Guru/Admin -> langsung 'approved' (mereka sendiri penyetuju).
 * - Murid -> 'pending', menunggu guru/admin.
 */
export async function createAnnouncement({ author, title, content, date, category, target }) {
  const now = new Date();
  const isSelfApproving = author.isAdmin || author.isTeacher;
  await addDoc(col, {
    title,
    content,
    date,
    category,
    target,
    authorId: author.uid,
    authorName: author.name,
    authorRole: author.role,
    status: isSelfApproving ? AnnouncementStatus.APPROVED : AnnouncementStatus.PENDING,
    approvedBy: isSelfApproving ? author.uid : null,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Mengedit pengumuman. Jika yang mengedit MURID, hasilnya kembali
 * berstatus 'pending' (harus disetujui ulang).
 */
export async function updateAnnouncement({ editor, original, title, content, date, category, target }) {
  if (!canManage(editor, original)) throw new Error("Anda tidak berhak mengubah pengumuman ini.");
  const needsReapproval = editor.isStudent;
  await updateDoc(doc(db, "announcements", original.id), {
    title,
    content,
    date,
    category,
    target,
    status: needsReapproval ? AnnouncementStatus.PENDING : AnnouncementStatus.APPROVED,
    approvedBy: needsReapproval ? null : editor.uid,
    updatedAt: new Date(),
  });
}

/**
 * Menghapus pengumuman.
 * - Guru/Admin: hapus langsung (mereka penyetuju).
 * - Murid: TIDAK langsung terhapus, hanya ditandai 'pendingDelete' agar
 *   guru/admin bisa mengonfirmasi.
 */
export async function requestDelete({ requester, target }) {
  if (!canManage(requester, target)) throw new Error("Anda tidak berhak menghapus pengumuman ini.");
  if (requester.isAdmin || requester.isTeacher) {
    await deleteDoc(doc(db, "announcements", target.id));
  } else {
    await updateDoc(doc(db, "announcements", target.id), {
      status: AnnouncementStatus.PENDING_DELETE,
      updatedAt: new Date(),
    });
  }
}

/** Guru/Admin menyetujui pengumuman murid yang berstatus pending. */
export async function approveAnnouncement({ approver, target }) {
  if (!canManage(approver, target)) throw new Error("Anda tidak berhak menyetujui pengumuman ini.");
  await updateDoc(doc(db, "announcements", target.id), {
    status: AnnouncementStatus.APPROVED,
    approvedBy: approver.uid,
    updatedAt: new Date(),
  });
}

/** Guru/Admin menolak pengumuman murid yang berstatus pending. */
export async function rejectAnnouncement({ approver, target }) {
  if (!canManage(approver, target)) throw new Error("Anda tidak berhak menolak pengumuman ini.");
  await updateDoc(doc(db, "announcements", target.id), {
    status: AnnouncementStatus.REJECTED,
    approvedBy: approver.uid,
    updatedAt: new Date(),
  });
}

/** Guru/Admin mengonfirmasi permintaan hapus dari murid -> hapus permanen. */
export async function confirmDelete({ approver, target }) {
  if (!canManage(approver, target)) throw new Error("Anda tidak berhak mengonfirmasi penghapusan ini.");
  await deleteDoc(doc(db, "announcements", target.id));
}

/** Admin: hapus pengumuman siapa pun tanpa syarat tambahan. */
export async function adminForceDelete(target) {
  await deleteDoc(doc(db, "announcements", target.id));
}
