import {
  db,
  doc,
  getDoc,
  writeBatch,
  Timestamp,
  writeLog
} from "./firebase.js";
import { getAuth, signOut } from "./auth.js";

const MAX_USERS = 5;
const auth = getAuth();

export function isAllowedRole(role) {
  return role === "admin" || role === "seller";
}

export function storeSession(uid, role) {
  localStorage.setItem("userId", uid);
  localStorage.setItem("userRole", role);
}

export async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...snap.data() };
}

export async function completeLogin(uid, role, action) {
  storeSession(uid, role);
  await writeLog({
    userId: uid,
    action,
    role
  });
}

export async function ensureFirestoreUser(user, options = {}) {
  const isActive = options.isActive !== false;
  const uid = user.uid;

  const existing = await loadUserProfile(uid);
  if (existing) {
    return existing;
  }

  const metaRef = doc(db, "system", "meta");
  const metaSnap = await getDoc(metaRef);

  if (!metaSnap.exists()) {
    await signOut(auth);
    throw new Error("meta_missing");
  }

  const usersCount = Number(metaSnap.data().usersCount) || 0;
  const maxUsers = Number(metaSnap.data().maxUsers) || MAX_USERS;

  if (usersCount >= maxUsers) {
    await signOut(auth);
    throw new Error("user_limit");
  }

  const batch = writeBatch(db);

  batch.set(doc(db, "users", uid), {
    userId: uid,
    name: user.displayName || user.email?.split("@")[0] || "Utilisateur",
    email: (user.email || "").toLowerCase(),
    role: "seller",
    isActive,
    createdAt: Timestamp.now()
  });

  batch.update(metaRef, {
    usersCount: usersCount + 1
  });

  await batch.commit();

  return loadUserProfile(uid);
}

export function authErrorMessage(err, fallback = "Erreur") {
  const message = err?.message || "";

  if (message === "meta_missing") {
    return "Configuration system/meta manquante.";
  }

  if (message === "user_limit") {
    return `Limite atteinte : ${MAX_USERS} utilisateurs maximum.`;
  }

  const code = err?.code || "";

  if (code === "auth/invalid-email") return "Email invalide";
  if (code === "auth/invalid-credential") return "Email ou mot de passe incorrect";
  if (code === "auth/user-disabled") return "Compte désactivé";
  if (code === "auth/email-already-in-use") return "Email déjà utilisé";
  if (code === "auth/weak-password") return "Mot de passe trop faible (6 caractères min.)";
  if (code === "auth/network-request-failed") return "Pas de connexion internet";
  if (code === "auth/too-many-requests") return "Trop de tentatives. Réessayez plus tard";
  if (code === "auth/popup-closed-by-user") return "Connexion Google annulée";
  if (code === "auth/popup-blocked") return "Popup bloquée par le navigateur";
  if (code === "auth/cancelled-popup-request") return "Connexion Google annulée";
  if (code === "permission-denied") return "Accès refusé. Vérifiez les règles Firestore.";
  if (code === "meta_missing") return "Configuration system/meta manquante.";
  if (code === "user_limit") return `Limite atteinte : ${MAX_USERS} utilisateurs maximum.`;

  return fallback;
}
