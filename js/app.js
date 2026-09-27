import { watchAuthState, watchAppUser, logout } from "./auth-service.js";
import { UserRole } from "./models.js";
import { renderPublicView } from "./views/public-view.js";
import { renderLoginView } from "./views/login-view.js";
import { renderAdminView } from "./views/admin-view.js";
import { renderTeacherView } from "./views/teacher-view.js";
import { renderStudentView } from "./views/student-view.js";

const root = document.getElementById("app");
let unsubUserDoc = null;

function mount(renderFn, ...args) {
  // Hentikan listener Firestore milik tampilan sebelumnya sebelum mengganti isi #app.
  root._cleanup?.();
  root.innerHTML = "";
  renderFn(root, ...args);
}

function showPublic() {
  mount(renderPublicView, {
    onLoginClick: () => mount(renderLoginView, { onBack: showPublic }),
  });
}

watchAuthState((firebaseUser) => {
  if (unsubUserDoc) {
    unsubUserDoc();
    unsubUserDoc = null;
  }

  if (!firebaseUser) {
    showPublic();
    return;
  }

  unsubUserDoc = watchAppUser(firebaseUser.uid, (appUser) => {
    if (!appUser) {
      // Profil belum/tidak ada di Firestore -> keluarkan paksa.
      logout();
      return;
    }
    switch (appUser.role) {
      case UserRole.ADMIN:
        mount(renderAdminView, appUser);
        break;
      case UserRole.TEACHER:
        mount(renderTeacherView, appUser);
        break;
      case UserRole.STUDENT:
        mount(renderStudentView, appUser);
        break;
      default:
        showPublic();
    }
  });
});
