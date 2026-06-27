// firebase.js offline 
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,

  collection,
  addDoc,
  getDocs,
  setDoc,
  updateDoc,
  orderBy,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
  increment,
  arrayUnion,
  limit,
  onSnapshot

} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwY95NM8QKiRxNHvfxiGrjvhKG16Lpl5E",
  authDomain: "test-stockflow-offline.firebaseapp.com",
  projectId: "test-stockflow-offline",
  storageBucket: "test-stockflow-offline.firebasestorage.app",
  messagingSenderId: "721689942624",
  appId: "1:721689942624:web:a29d362e5fccd7e2ce4105",
  measurementId: "G-67C96ZB39P"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const enableIndexedDbPersistence = async () => true;

async function writeLog(entry = {}) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, "logs"), {
      createdAt: Timestamp.now(),
      ...entry
    });
    return docRef.id;
  } catch (err) {
    console.warn("writeLog:", err);
    return null;
  }
}

export {
  app,
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  runTransaction,
  limit,
  orderBy,
  onSnapshot,
  writeBatch,
  increment,
  arrayUnion,
  enableIndexedDbPersistence,
  writeLog
};
