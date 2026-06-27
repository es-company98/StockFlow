import { db, collection, getDocs } from "./firebase.js";
import { getAuth, onAuthStateChanged } from "./auth.js";
import { COLLECTIONS } from "./finance/collections.js";
import {
  mountNotificationPermissionBanner,
  initFinanceActivityNotifications,
  getNotificationPermission
} from "./finance/notifications.js";
import { debug, summarizeDebts } from "./finance/shared.js";

const auth = getAuth();

function renderDebtHubAlert(debts) {
  const box = document.getElementById("debtHubAlert");
  if (!box) return;

  box.replaceChildren();
  const summary = summarizeDebts(debts);

  if (!summary.overdue && !summary.today && !summary.soon && !summary.stale) {
    return;
  }

  const link = document.createElement("a");
  link.href = "debts.html";
  link.className = "debt-hub-alert";

  const title = document.createElement("strong");
  title.textContent = "Dettes à traiter";

  const detail = document.createElement("p");
  detail.style.margin = "6px 0 0";
  detail.style.fontSize = "13px";

  const parts = [];
  if (summary.overdue) parts.push(`${summary.overdue} en retard`);
  if (summary.today) parts.push(`${summary.today} échéance aujourd'hui`);
  if (summary.soon) parts.push(`${summary.soon} échéance proche`);
  if (summary.stale) parts.push(`${summary.stale} sans suivi`);

  detail.textContent = `${parts.join(" • ")} — ${summary.amountRemaining.toLocaleString()} FC`;

  link.append(title, detail);
  box.appendChild(link);
}

async function loadDebtAlerts() {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.debts));
    const debts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderDebtHubAlert(debts);
  } catch (err) {
    console.error(err);
  }
}

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  mountNotificationPermissionBanner("notificationBanner");

  if (getNotificationPermission() === "granted") {
    initFinanceActivityNotifications();
  }

  await loadDebtAlerts();
  debug("Hub Finances prêt");
});
