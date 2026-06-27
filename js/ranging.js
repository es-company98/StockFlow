// js/ranging.js vraie côte pro 

import {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  limit
} from "./firebase.js";

import {
  getAuth,
  onAuthStateChanged
} from "./auth.js"; // Auth

/* =========================
   DOM
========================= */

const topContainer = document.getElementById("topProducts");
const lowContainer = document.getElementById("lowProducts");

/* =========================
   AUTH
========================= */

const auth = getAuth();

/* =========================
   SECURITY
========================= */

async function checkUser(uid) {

  if (!uid) throw new Error("UID invalide");

  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    throw new Error("Utilisateur introuvable");
  }

  const userData = userSnap.data();

  if (!userData?.isActive) {
    throw new Error("Compte désactivé");
  }

  if (userData.role !== "admin") {
  throw new Error("Accès refusé");
    }

  return userData;
}

/* =========================
   HELPERS
========================= */

function sanitizeText(value, max = 80) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function clearContainer(container) {
  if (container) container.replaceChildren();
}

function showEmpty(container, text) {
  if (!container) return;

  container.replaceChildren();

  const div = document.createElement("div");
  div.className = "empty";
  div.textContent = text;

  container.appendChild(div);
}

function createProgressBar(percent, type) {
  const progress = document.createElement("div");
  progress.className = "progress";

  const fill = document.createElement("div");
  fill.className = `progress-fill ${type}`;
  fill.style.width = `${Math.min(Number(percent) || 0, 100)}%`;

  progress.appendChild(fill);
  return progress;
}

/* =========================
   CARD
========================= */

function createCard(item, type = "gold", position = 1) {

  const card = document.createElement("div");
  card.className = `rank-card ${type === "gold" ? "gold" : "low"}`;

  const top = document.createElement("div");
  top.className = "card-top";

  const name = document.createElement("div");
  name.className = "product-name";
  name.textContent = sanitizeText(item.name);

  const badge = document.createElement("div");
  badge.className = `rank-badge ${type === "gold" ? "best" : "low"}`;
  badge.textContent = `#${position}`;

  top.append(name, badge);

  const stats = document.createElement("div");
  stats.className = "card-stats";

  const lines = [
    ["Ventes", item.quantity],
    ["Part des ventes", `${item.percent}%`],
    ["Cote", `${item.score}/10`]
  ];

  lines.forEach(([label, value]) => {
    const line = document.createElement("div");
    line.className = "stat-line";

    const l = document.createElement("span");
    l.textContent = label;

    const v = document.createElement("strong");
    v.textContent = value;

    line.append(l, v);
    stats.appendChild(line);
  });

  const progress = createProgressBar(item.percent, type);

  card.append(top, stats, progress);

  return card;
}

/* =========================
   LOAD RANKING
========================= */

async function loadRanking() {

  clearContainer(topContainer);
  clearContainer(lowContainer);

  const saleItemsSnap = await getDocs(
    query(collection(db, "sale_items"), limit(500))
  );

  if (saleItemsSnap.empty) {
    showEmpty(topContainer, "Aucune vente enregistrée");
    showEmpty(lowContainer, "Aucune donnée disponible");
    return;
  }

  const map = new Map();
  let totalSold = 0;

  saleItemsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const productId = data?.productId;
    const quantity = Number(data?.quantity || 0);

    if (!productId) return;

    totalSold += quantity;

    if (!map.has(productId)) {
      map.set(productId, 0);
    }

    map.set(productId, map.get(productId) + quantity);
  });

  const productsSnap = await getDocs(collection(db, "products"));
  const productsMap = new Map();

  productsSnap.forEach(docSnap => {
    productsMap.set(docSnap.id, docSnap.data());
  });

  const ranking = Array.from(map.entries())
    .map(([productId, quantity]) => {

      const product = productsMap.get(productId) || {};

      const percent = totalSold
  ? (quantity / totalSold) * 100
  : 0;

// comparaison produit vs meilleur produit
const maxQuantity = Math.max(...map.values());

const ratio = maxQuantity > 0
  ? quantity / maxQuantity
  : 0;

let score = Math.pow(ratio, 2.2) * 9.8;

// minimum visuel
if (score > 0 && score < 1) {
  score = 1;
}

      return {
        productId,
        name: sanitizeText(product.name || "Produit inconnu"),
        quantity,
        percent: Number(percent.toFixed(1)),
        score: Number(
  Math.min(score, 9.8).toFixed(1)
)
      };
    })
    .sort((a, b) => b.quantity - a.quantity);

  const topCount = Math.min(
  5,
  Math.ceil(ranking.length / 2)
);

const lowCount = Math.min(
  5,
  Math.floor(ranking.length / 2)
);

const topFive = ranking.slice(0, topCount);

const lowFive = ranking
  .slice(-lowCount)
  .reverse()
  .filter(item =>
    !topFive.some(top =>
      top.productId === item.productId
    )
  );

  if (!topFive.length) {
    showEmpty(topContainer, "Top indisponible");
  } else {
    topContainer.replaceChildren(
      ...topFive.map((item, i) =>
        createCard(item, "gold", i + 1)
      )
    );
  }

  if (!lowFive.length) {
    showEmpty(lowContainer, "Classement faible indisponible");
  } else {
    lowContainer.replaceChildren(
      ...lowFive.map((item, i) =>
        createCard(item, "red", i + 1)
      )
    );
  }
}

/* =========================
   INIT
========================= */

onAuthStateChanged(auth, async user => {

  if (!user) {
    alert("Connexion requise");
    window.location.replace("login.html");
    return;
  }

  try {
    await checkUser(user.uid);
    await loadRanking();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Erreur");
  }
});
