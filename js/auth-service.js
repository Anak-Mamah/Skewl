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

export function watchAuthState(callback, onError) {
  return onAuthStateChanged(auth, callback, onError);
}

export async function getAppUser(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return AppUser.fromDoc(uid, snap.data());
}

/**
 * Memantau profil aplikasi yang harus memiliki document ID sama persis dengan
 * Firebase Auth UID. Error Firestore diteruskan agar router tidak salah
 * menganggapnya sebagai profil yang hilang.
 */
export function watchAppUser(uid, callback, onError) {
  if (!uid) {
    onError?.(new Error("UID Firebase kosong."));
    return () => {};
  }

  return onSnapshot(
    doc(db, "users", uid),
    (snap) => {
      callback(snap.exists() ? AppUser.fromDoc(uid, snap.data()) : null);
    },
    (error) => {
      console.error(`[FIRESTORE users/${uid}]`, error);
      onError?.(error);
    }
  );
}

/**
 * Login dan memastikan role akun sesuai tab yang dipilih.
 * Validasi profil dilakukan sebelum fungsi ini mengembalikan hasil.
 */
export async function loginAs(email, password, expectedRole) {
  const normalizedEmail = String(email ?? "").trim();
  const normalizedPassword = String(password ?? "");

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error("Email dan kata sandi wajib diisi.");
  }

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
    // Jangan meninggalkan sesi setengah-login ketika validasi profil/role gagal.
    await signOut(auth).catch(() => {});
    throw error;
  }
}

export function logout() {
  return signOut(auth);
}

/**
 * Membuat akun Firebase Auth baru TANPA mengganti sesi login pengguna yang
 * sedang aktif (admin/guru), memakai instance Firebase kedua.
 */
async function createAuthAccountKeepingSession(email, password) {
  const normalizedEmail = String(email ?? "").trim();
  const secondaryAuth = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
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
 * GURU (atau admin) menambahkan SATU murid.
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

  try {
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
  } catch (error) {
    // Akun Auth sudah dibuat di instance kedua. Kita sengaja tidak mencoba
    // menghapus kredensial dari client karena Firebase client SDK tidak punya
    // hak untuk menghapus akun Auth milik pengguna lain.
    throw error;
  }
}
