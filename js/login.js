import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from "./auth.js";

import {
  isAllowedRole,
  loadUserProfile,
  completeLogin,
  ensureFirestoreUser,
  authErrorMessage
} from "./auth-flow.js";

import { initPasswordToggles } from "./password-toggle.js";

const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeCheckbox = document.getElementById("rememberMe");
const googleLoginBtn = document.getElementById("googleLoginBtn");

initPasswordToggles();

async function redirectAfterLogin(userData, action) {
  if (!userData?.isActive) {
    alert("Compte désactivé");
    return;
  }

  if (!isAllowedRole(userData.role)) {
    alert("Accès refusé : rôle non autorisé");
    return;
  }

  await completeLogin(userData.userId || userData.id, userData.role, action);
  window.location.replace("index.html");
}

loginForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const email = emailInput?.value.trim().toLowerCase() || "";
  const password = passwordInput?.value || "";

  if (!email || !password) {
    alert("Remplis tous les champs");
    return;
  }

  try {
    await setPersistence(
      auth,
      rememberMeCheckbox?.checked
        ? browserLocalPersistence
        : browserSessionPersistence
    );

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userData = await loadUserProfile(userCredential.user.uid);

    if (!userData) {
      alert("Utilisateur non configuré dans Firestore");
      return;
    }

    await redirectAfterLogin(userData, "login");
  } catch (err) {
    console.error(err);
    alert(authErrorMessage(err, "Erreur de connexion"));
  }
});

googleLoginBtn?.addEventListener("click", async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);

    const result = await signInWithPopup(auth, googleProvider);
    let userData = await loadUserProfile(result.user.uid);

    if (!userData) {
      userData = await ensureFirestoreUser(result.user, { isActive: true });
    }

    await redirectAfterLogin(userData, "google_login");
  } catch (err) {
    console.error(err);
    alert(authErrorMessage(err, "Erreur connexion Google"));
  }
});
