import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  doc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { AppUser } from "./models.js";

export function watchAllUsers(callback) {
  const q = query(collection(db, "users"), orderBy("createdAt"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => AppUser.fromDoc(d.id, d.data()))));
}

export function watchByRole(role, callback) {
  const q = query(collection(db, "users"), where("role", "==", role), orderBy("createdAt"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => AppUser.fromDoc(d.id, d.data()))));
}

/**
 * Menghapus profil pengguna di Firestore. Dipakai oleh:
 * - Admin: menghapus akun siapa pun (guru/murid/admin lain).
 * - Guru: menghapus murid yang IA SENDIRI tambahkan (izin ditegakkan oleh
 *   firestore.rules — lihat komentar "guruMenghapusMuridSendiri").
 *
 * Efek berantai (cascade):
 * - Menghapus GURU -> murid yang ia tambahkan IKUT TERHAPUS (bukan cuma
 *   diputus relasinya), karena tanpa guru tsb murid itu jadi tidak punya
 *   siapa pun yang mengelolanya.
 * - Menghapus MURID -> slot `studentId` pada dokumen gurunya dikosongkan
 *   lagi (jadi null), supaya guru itu bisa menambah murid baru.
 *
 * Catatan: ini TIDAK menghapus kredensial login Firebase Authentication
 * milik pengguna lain — itu memerlukan Firebase Admin SDK di server
 * (Cloud Functions). Lihat README bagian "Batasan".
 */
export async function deleteUserProfile(user) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", user.uid));

  if (user.isTeacher && user.studentId) {
    // Guru dihapus -> murid yang ia tambahkan ikut dihapus (cascade).
    batch.delete(doc(db, "users", user.studentId));
  }
  if (user.isStudent && user.teacherId) {
    // Murid dihapus -> kosongkan slot guru supaya bisa menambah murid baru lagi.
    batch.update(doc(db, "users", user.teacherId), { studentId: null });
  }
  await batch.commit();
}
