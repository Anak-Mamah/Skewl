import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail,
  deleteUser,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  runTransaction,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { auth, db, getSecondaryAuth } from "./firebase-config.js";
import { AppUser, UserRole, roleLabel } from "./models.js";

export function watchAuthState(callback, onError) {
  return onAuthStateChanged(auth, callback, onError);
}

export async function getAppUser(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return AppUser.fromDoc(uid, snap.data());
}

export function watchAppUser(uid, callback, onError) {
  if (!uid) {
    onError?.(new Error("UID Firebase kosong."));
    return () => {};
  }
  return onSnapshot(
    doc(db, "users", uid),
    (snap) => callback(snap.exists() ? AppUser.fromDoc(uid, snap.data()) : null),
    (error) => {
      console.error(`[FIRESTORE users/${uid}]`, error);
      onError?.(error);
    }
  );
}

export async function loginAs(email, password, expectedRole) {
  const normalizedEmail = String(email ?? "").trim();
  const normalizedPassword = String(password ?? "");
  if (!normalizedEmail || !normalizedPassword) throw new Error("Email dan kata sandi wajib diisi.");

  const cred = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
  const uid = cred.user.uid;

  try {
    const appUser = await getAppUser(uid);
    if (!appUser) {
      throw new Error(
        `Login Firebase berhasil, tetapi profil users/${uid} belum ada di Firestore. ` +
        `Buat dokumen pengguna dengan Document ID yang sama persis dengan UID tersebut.`
      );
    }
    if (appUser.role !== expectedRole) {
      throw new Error(
        `Akun ini terdaftar sebagai ${roleLabel(appUser.role)}, bukan ${roleLabel(expectedRole)}. ` +
        `Pilih tab login yang sesuai.`
      );
    }
    return appUser;
  } catch (error) {
    await signOut(auth).catch(() => {});
    throw error;
  }
}

export function logout() {
  return signOut(auth);
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error("Anda belum login.");
  await sendEmailVerification(auth.currentUser);
}

export async function resendVerificationForCredentials(email, password) {
  const normalizedEmail = String(email ?? "").trim();
  const normalizedPassword = String(password ?? "");
  if (!normalizedEmail || !normalizedPassword) throw new Error("Isi email dan kata sandi terlebih dahulu.");
  const cred = await signInWithEmailAndPassword(auth, normalizedEmail, normalizedPassword);
  try {
    if (cred.user.emailVerified) throw new Error("Email akun ini sudah terverifikasi. Anda dapat langsung login.");
    await sendEmailVerification(cred.user);
  } finally {
    await signOut(auth).catch(() => {});
  }
}

export async function requestPasswordReset(email) {
  const normalizedEmail = String(email ?? "").trim();
  if (!normalizedEmail) throw new Error("Masukkan email terlebih dahulu.");
  await sendPasswordResetEmail(auth, normalizedEmail);
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sesi login tidak ditemukan.");
  if (!newPassword || newPassword.length < 6) throw new Error("Kata sandi baru minimal 6 karakter.");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export async function requestEmailChange(newEmail, currentPassword) {
  const user = auth.currentUser;
  if (!user?.email) throw new Error("Sesi login tidak ditemukan.");
  const normalized = String(newEmail ?? "").trim().toLowerCase();
  if (!normalized) throw new Error("Email baru wajib diisi.");
  if (normalized === user.email.toLowerCase()) throw new Error("Email baru sama dengan email saat ini.");

  if (currentPassword) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  }
  await verifyBeforeUpdateEmail(user, normalized);
}

export async function syncFirestoreEmailWithAuth() {
  const user = auth.currentUser;
  if (!user?.uid || !user.emailVerified || !user.email) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const current = snap.data()?.email || "";
  if (current !== user.email) await updateDoc(ref, { email: user.email });
}

async function createAuthAccountKeepingSession(email, password) {
  const normalizedEmail = String(email ?? "").trim();
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
  await sendEmailVerification(cred.user);
  await signOut(secondaryAuth);
  return cred;
}

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

export async function addStudent({ name, email, password, teacher }) {
  if (!teacher.canAddStudent) {
    throw new Error("Guru ini sudah memiliki 1 murid terdaftar. Setiap akun guru maksimal hanya boleh menambahkan 1 murid.");
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
    if (freshStudentId) throw new Error("Guru ini sudah memiliki 1 murid terdaftar. Setiap guru maksimal 1 murid.");
    tx.set(studentRef, student.toMap());
    tx.update(teacherRef, { studentId: uid });
  });
}

export async function deleteOwnAccount(currentUser) {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== currentUser.uid) throw new Error("Sesi akun tidak cocok.");

  // Re-authenticate sebelum operasi destruktif agar Firebase menganggap sesi cukup baru.
  const password = prompt("Untuk menghapus akun, masukkan kata sandi akun Anda:");
  if (!password) throw new Error("Penghapusan akun dibatalkan.");
  await reauthenticateWithCredential(firebaseUser, EmailAuthProvider.credential(firebaseUser.email, password));

  // Profil Firestore dihapus oleh pengguna sendiri; setelah itu kredensial Auth dihapus.
  await deleteDoc(doc(db, "users", firebaseUser.uid));
  await deleteUser(firebaseUser);
}
