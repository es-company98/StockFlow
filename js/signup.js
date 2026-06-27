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
  signOut,
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

async function readMetaForSignup() {
  console.log("[signup] getDoc system/meta (auth uid:", auth.currentUser?.uid, ")");
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
    console.log("[signup] createUserWithEmailAndPassword", { email });
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    console.log("[signup] Auth OK, uid:", uid);

    const { metaRef, usersCount } = await readMetaForSignup();

    const batch = writeBatch(db);

    console.log("[signup] batch.set users/", uid);
    batch.set(doc(db, "users", uid), {
      userId: uid,
      name: fullName,
      email,
      role: "seller",
      isActive,
      createdAt: Timestamp.now()
    });

    console.log("[signup] batch.update system/meta usersCount:", usersCount + 1);
    batch.update(metaRef, {
      usersCount: usersCount + 1
    });

    await batch.commit();
    console.log("[signup] batch.commit OK");

    await writeLog({
      userId: uid,
      action: "signup",
      details: { email, role: "seller" }
    });

    await signOut(auth);
    alert("Compte créé ! Connectez-vous.");
    window.location.replace("login.html");
  } catch (err) {
    console.error("[signup] erreur:", err?.code || err?.message, err);
    alert(authErrorMessage(err, "Erreur création compte"));
  }
});

googleSignupBtn?.addEventListener("click", async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);

    console.log("[signup] signInWithPopup Google");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("[signup] Google OK, uid:", result.user.uid);

    const isActive = document.getElementById("isActive")?.checked ?? true;
    const userData = await ensureFirestoreUser(result.user, { isActive });

    if (!userData?.isActive) {
      await signOut(auth);
      alert("Compte désactivé");
      return;
    }

    if (!isAllowedRole(userData.role)) {
      await signOut(auth);
      alert("Accès refusé : rôle non autorisé");
      return;
    }

    await completeLogin(userData.userId || userData.id, userData.role, "google_signup");
    window.location.replace("index.html");
  } catch (err) {
    console.error("[signup] Google erreur:", err?.code || err?.message, err);
    alert(authErrorMessage(err, "Erreur inscription Google"));
  }
});
