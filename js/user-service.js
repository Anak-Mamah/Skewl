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
 * Menghapus profil pengguna di Firestore (khusus admin). Catatan: ini TIDAK
 * menghapus kredensial login Firebase Authentication milik pengguna lain —
 * itu memerlukan Firebase Admin SDK di server (Cloud Functions). Lihat
 * README bagian "Batasan".
 */
export async function deleteUserProfile(user) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", user.uid));

  if (user.isTeacher && user.studentId) {
    batch.update(doc(db, "users", user.studentId), { teacherId: null });
  }
  if (user.isStudent && user.teacherId) {
    batch.update(doc(db, "users", user.teacherId), { studentId: null });
  }
  await batch.commit();
}
