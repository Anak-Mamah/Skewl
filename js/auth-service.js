import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { auth, db, getSecondaryAuth } from "./firebase-config.js";
import { AppUser, UserRole, roleLabel } from "./models.js";

export function watchAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function getAppUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return AppUser.fromDoc(uid, snap.data());
}

export function watchAppUser(uid, callback) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    callback(snap.exists() ? AppUser.fromDoc(uid, snap.data()) : null);
  });
}

/**
 * Login dan memastikan role akun sesuai tab yang dipilih (Admin/Guru/Murid)
 * di halaman login. Kalau tidak cocok, sesi langsung di-sign-out lagi.
 */
export async function loginAs(email, password, expectedRole) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;
  const appUser = await getAppUser(uid);
  if (!appUser) {
    await signOut(auth);
    throw new Error("Akun ditemukan tapi profil pengguna tidak ada di database.");
  }
  if (appUser.role !== expectedRole) {
    await signOut(auth);
    throw new Error(
      `Akun ini terdaftar sebagai ${roleLabel(appUser.role)}, bukan ${roleLabel(expectedRole)}. ` +
        `Pilih tab login yang sesuai.`
    );
  }
  return appUser;
}

export function logout() {
  return signOut(auth);
}

/**
 * Membuat akun Firebase Auth baru TANPA mengganti sesi login pengguna yang
 * sedang aktif (admin/guru), memakai instance Firebase kedua.
 */
async function createAuthAccountKeepingSession(email, password) {
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
  await signOut(secondaryAuth);
  return cred;
}

/** ADMIN membuat akun GURU baru. */
export async function adminCreateTeacher({ name, email, password, adminUid }) {
  const cred = await createAuthAccountKeepingSession(email, password);
  const uid = cred.user.uid;
  const teacher = new AppUser({
    uid,
    name,
    email: email.trim(),
    role: UserRole.TEACHER,
    studentId: null,
    createdBy: adminUid,
    createdAt: new Date(),
  });
  await setDoc(doc(db, "users", uid), teacher.toMap());
}

/**
 * GURU (atau admin) menambahkan SATU murid. Ditegakkan dua lapis: dicek di
 * klien (studentId harus null) DAN oleh Firestore transaction + Security
 * Rules di server (lihat firestore.rules) — sehingga tahan race condition.
 */
export async function addStudent({ name, email, password, teacher }) {
  if (!teacher.canAddStudent) {
    throw new Error(
      "Guru ini sudah memiliki 1 murid terdaftar. Setiap akun guru maksimal hanya boleh menambahkan 1 murid."
    );
  }
  const cred = await createAuthAccountKeepingSession(email, password);
  const uid = cred.user.uid;
  const student = new AppUser({
    uid,
    name,
    email: email.trim(),
    role: UserRole.STUDENT,
    teacherId: teacher.uid,
    createdBy: teacher.uid,
    createdAt: new Date(),
  });

  const teacherRef = doc(db, "users", teacher.uid);
  const studentRef = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const freshTeacherDoc = await tx.get(teacherRef);
    const freshStudentId = freshTeacherDoc.data()?.studentId;
    if (freshStudentId) {
      throw new Error(
        "Guru ini sudah memiliki 1 murid terdaftar (dibuat baru saja). Setiap guru maksimal 1 murid."
      );
    }
    tx.set(studentRef, student.toMap());
    tx.update(teacherRef, { studentId: uid });
  });
}
