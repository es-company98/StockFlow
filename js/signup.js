import {
  db,
  doc,
  getDoc,
  Timestamp,
  writeBatch,
  writeLog
} from "./firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence
} from "./auth.js";

import {
  ensureFirestoreUser,
  completeLogin,
  isAllowedRole,
  authErrorMessage
} from "./auth-flow.js";

import { initPasswordToggles } from "./password-toggle.js";

const auth = getAuth();
const signupForm = document.getElementById("signupForm");
const googleSignupBtn = document.getElementById("googleSignupBtn");
const googleProvider = new GoogleAuthProvider();
const MAX_USERS = 5;

initPasswordToggles();

async function checkUserLimit() {
  const metaRef = doc(db, "system", "meta");
  const metaSnap = await getDoc(metaRef);

  if (!metaSnap.exists()) {
    throw new Error("meta_missing");
  }

  const usersCount = Number(metaSnap.data().usersCount) || 0;
  const maxUsers = Number(metaSnap.data().maxUsers) || MAX_USERS;

  if (usersCount >= maxUsers) {
    throw new Error("user_limit");
  }

  return { metaRef, usersCount };
}

signupForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const fullName = document.getElementById("fullName")?.value.trim();
  const email = document.getElementById("email")?.value.trim().toLowerCase();
  const password = document.getElementById("password")?.value;
  const isActive = document.getElementById("isActive")?.checked ?? true;

  if (!fullName || !email || !password) {
    alert("Remplis tous les champs");
    return;
  }

  if (password.length < 6) {
    alert("Mot de passe trop court (6 caractères minimum)");
    return;
  }

  try {
    const { metaRef, usersCount } = await checkUserLimit();

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const batch = writeBatch(db);

    batch.set(doc(db, "users", uid), {
      userId: uid,
      name: fullName,
      email,
      role: "seller",
      isActive,
      createdAt: Timestamp.now()
    });

    batch.update(metaRef, {
      usersCount: usersCount + 1
    });

    await batch.commit();

    await writeLog({
      userId: uid,
      action: "signup",
      details: { email, role: "seller" }
    });

    alert("Compte créé ! Connectez-vous.");
    window.location.replace("login.html");
  } catch (err) {
    console.error(err);
    alert(authErrorMessage(err, "Erreur création compte"));
  }
});

googleSignupBtn?.addEventListener("click", async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await checkUserLimit();

    const result = await signInWithPopup(auth, googleProvider);
    const isActive = document.getElementById("isActive")?.checked ?? true;
    const userData = await ensureFirestoreUser(result.user, { isActive });

    if (!userData?.isActive) {
      alert("Compte désactivé");
      return;
    }

    if (!isAllowedRole(userData.role)) {
      alert("Accès refusé : rôle non autorisé");
      return;
    }

    await completeLogin(userData.userId || userData.id, userData.role, "google_signup");
    window.location.replace("index.html");
  } catch (err) {
    console.error(err);
    alert(authErrorMessage(err, "Erreur inscription Google"));
  }
});
