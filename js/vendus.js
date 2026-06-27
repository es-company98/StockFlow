import {
  db,
  doc,
  collection,
  getDoc,
  getDocs,
  query,
  where,
  orderBy
} from "./firebase.js";

import { auth, onAuthStateChanged } from "./auth.js";

const $ = id => document.getElementById(id);

const state = {
  sales: [],
  saleItems: [],
  products: [],
  users: [],
  debts: [],
  rows: [],
  currency: "$"
};

let currentUser = null;

function n(v) {
  return Number(v) || 0;
}

function getDate(v) {
  if (!v) return null;

  if (typeof v?.toDate === "function") {
    return v.toDate();
  }

  if (v?.seconds) {
    return new Date(v.seconds * 1000);
  }

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function getFilterValues() {
  return {
    search: ($("searchInput")?.value || "").trim().toLowerCase(),
    productId: $("productFilter")?.value || "",
    sellerId: $("sellerFilter")?.value || "",
    payment: $("paymentFilter")?.value || "",
    status: $("statusFilter")?.value || "",
    dateFrom: $("dateFrom")?.value || "",
    dateTo: $("dateTo")?.value || ""
  };
}

function buildSalesQuery() {
  const { dateFrom, dateTo } = getFilterValues();
  const constraints = [];

  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    constraints.push(where("createdAt", ">=", from));
  }

  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    constraints.push(where("createdAt", "<=", to));
  }

  constraints.push(orderBy("createdAt", "desc"));

  return query(collection(db, "sales"), ...constraints);
}

function bindDateLimits() {
  const dateFrom = $("dateFrom");
  const dateTo = $("dateTo");
  if (!dateFrom || !dateTo) return;

  const today = new Date().toISOString().split("T")[0];
  dateFrom.max = today;
  dateTo.max = today;

  const sync = () => {
    if (dateFrom.value) {
      dateTo.min = dateFrom.value;
    } else {
      dateTo.removeAttribute("min");
    }

    if (
      dateFrom.value &&
      dateTo.value &&
      dateTo.value < dateFrom.value
    ) {
      dateTo.value = dateFrom.value;
    }
  };

  dateFrom.addEventListener("change", sync);
  dateTo.addEventListener("change", sync);
  sync();
}

async function checkAccess(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    location.replace("404.html");
    return;
  }

  currentUser = { id: userSnap.id, ...userSnap.data() };

  if (
    currentUser.role !== "admin" &&
    currentUser.role !== "seller"
  ) {
    location.replace("404.html");
    return;
  }

  bindDateLimits();
  bindEvents();
  await loadData();
}

async function loadData() {
  const [
    salesSnap,
    saleItemsSnap,
    productsSnap,
    usersSnap,
    debtsSnap
  ] = await Promise.all([
    getDocs(buildSalesQuery()),
    getDocs(collection(db, "sale_items")),
    getDocs(collection(db, "products")),
    getDocs(collection(db, "users")),
    getDocs(collection(db, "debts"))
  ]);

  state.sales = salesSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  state.saleItems = saleItemsSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  state.products = productsSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  state.users = usersSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  state.debts = debtsSnap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  buildRows();
  populateFilters();
  render();
}

function buildRows() {
  state.rows = [];

  const saleIds = new Set(state.sales.map(s => s.id));

  state.saleItems.forEach(item => {
    if (!saleIds.has(item.saleId)) {
      return;
    }

    const sale = state.sales.find(s => s.id === item.saleId);
    if (!sale) return;

    const product = state.products.find(p => p.id === item.productId);

    const seller = state.users.find(
      u =>
        u.userId === sale.sellerId ||
        u.uid === sale.sellerId ||
        u.id === sale.sellerId
    );

    const debt = state.debts.find(e => e.relatedSaleId === sale.id);

    state.rows.push({
      saleId: sale.id,
      productId: item.productId,
      productName: product?.name || "Produit",
      sellerId: sale.sellerId || "",
      sellerName: seller?.name || "Vendeur",
      quantity: n(item.quantity),
      price: n(item.price),
      total: n(item.quantity) * n(item.price),
      clientName: debt?.name || "",
      paymentStatus: sale.payment_status || "paid",
      saleStatus: sale.status || "active",
      amountRemaining: n(debt?.amount_remaining),
      createdAt: getDate(sale.createdAt)
    });
  });
}

function populateFilters() {
  const filters = getFilterValues();

  const productFilter = $("productFilter");
  if (productFilter) {
    productFilter.replaceChildren();

    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Tous les produits";
    productFilter.appendChild(first);

    state.products
      .slice()
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      .forEach(product => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.name || "Produit";
        productFilter.appendChild(option);
      });

    productFilter.value = filters.productId;
  }

  const sellerFilter = $("sellerFilter");
  if (sellerFilter) {
    sellerFilter.replaceChildren();

    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Tous les vendeurs";
    sellerFilter.appendChild(first);

    state.users.forEach(user => {
      const option = document.createElement("option");
      option.value = user.userId || user.uid || user.id;
      option.textContent = user.name || "Vendeur";
      sellerFilter.appendChild(option);
    });

    if (currentUser?.role === "seller") {
      const ownId =
        currentUser.userId ||
        currentUser.uid ||
        currentUser.id;
      sellerFilter.value = ownId;
      sellerFilter.disabled = true;
    } else if (filters.sellerId) {
      sellerFilter.value = filters.sellerId;
    }
  }

  if ($("paymentFilter")) {
    $("paymentFilter").value = filters.payment;
  }

  if ($("statusFilter")) {
    $("statusFilter").value = filters.status;
  }
}

function getFilteredRows() {
  let rows = [...state.rows];
  const {
    search,
    productId,
    sellerId,
    payment,
    status,
    dateFrom,
    dateTo
  } = getFilterValues();

  if (currentUser?.role === "seller") {
    const ownId =
      currentUser.userId ||
      currentUser.uid ||
      currentUser.id;
    rows = rows.filter(row => row.sellerId === ownId);
  } else if (sellerId) {
    rows = rows.filter(row => row.sellerId === sellerId);
  }

  if (search) {
    rows = rows.filter(row =>
      row.productName.toLowerCase().includes(search) ||
      row.clientName.toLowerCase().includes(search) ||
      row.sellerName.toLowerCase().includes(search) ||
      row.saleId.toLowerCase().includes(search)
    );
  }

  if (productId) {
    rows = rows.filter(row => row.productId === productId);
  }

  if (payment) {
    rows = rows.filter(row => row.paymentStatus === payment);
  }

  if (status) {
    rows = rows.filter(row => row.saleStatus === status);
  }

  if (dateFrom) {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    rows = rows.filter(row => row.createdAt && row.createdAt >= from);
  }

  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    rows = rows.filter(row => row.createdAt && row.createdAt <= to);
  }

  rows.sort((a, b) => {
    const ta = a.createdAt?.getTime() || 0;
    const tb = b.createdAt?.getTime() || 0;
    return tb - ta;
  });

  return rows;
}

function renderKpis(rows) {
  const soldCount = rows.reduce(
    (sum, row) => sum + row.quantity,
    0
  );

  const salesTotal = rows.reduce(
    (sum, row) => sum + row.total,
    0
  );

  const clients = new Set(
    rows.map(r => r.clientName).filter(Boolean)
  );

  const debtBySale = new Map();
  rows.forEach(row => {
    if (row.paymentStatus === "partial" && row.amountRemaining > 0) {
      debtBySale.set(row.saleId, row.amountRemaining);
    }
  });

  const debtTotal = [...debtBySale.values()].reduce(
    (sum, amount) => sum + amount,
    0
  );

  const currency = state.currency || "$";

  $("soldCount").textContent = String(soldCount);
  $("salesTotal").textContent = `${salesTotal.toLocaleString()} ${currency}`;
  $("clientsCount").textContent = String(clients.size);
  $("debtTotal").textContent = `${debtTotal.toLocaleString()} ${currency}`;
  $("resultCount").textContent = String(rows.length);
}

function createSaleCard(row) {
  const card = document.createElement("div");
  card.className = "sale-card";

  if (row.saleStatus === "cancelled") {
    card.classList.add("sale-cancelled");
  }

  const top = document.createElement("div");
  top.className = "sale-top";

  const product = document.createElement("div");
  product.className = "sale-product";
  product.textContent = row.productName;

  const price = document.createElement("div");
  price.className = "sale-price";
  price.textContent = `${row.total.toLocaleString()} ${state.currency}`;

  top.appendChild(product);
  top.appendChild(price);

  const clientMeta = document.createElement("div");
  clientMeta.className = "sale-meta";
  clientMeta.textContent = `Client : ${row.clientName || "-"}`;

  const sellerMeta = document.createElement("div");
  sellerMeta.className = "sale-meta";
  sellerMeta.textContent = `Vendeur : ${row.sellerName}`;

  const qtyMeta = document.createElement("div");
  qtyMeta.className = "sale-meta";
  qtyMeta.textContent = `Qté : ${row.quantity} × ${row.price.toLocaleString()}`;

  const dateMeta = document.createElement("div");
  dateMeta.className = "sale-meta";
  const dateStr = row.createdAt
    ? row.createdAt.toLocaleDateString("fr-FR")
    : "-";
  dateMeta.textContent = `Date : ${dateStr}`;

  const badge = document.createElement("span");
  badge.className = "badge";

  if (row.saleStatus === "cancelled") {
    badge.classList.add("badge-cancelled");
    badge.textContent = "Annulée";
  } else if (row.paymentStatus === "partial") {
    badge.classList.add("badge-partial");
    badge.textContent = `Dette • ${row.amountRemaining.toLocaleString()} FC`;
  } else {
    badge.classList.add("badge-paid");
    badge.textContent = "Payé";
  }

  card.appendChild(top);
  card.appendChild(clientMeta);
  card.appendChild(sellerMeta);
  card.appendChild(qtyMeta);
  card.appendChild(dateMeta);
  card.appendChild(badge);

  return card;
}

function renderRows() {
  const rows = getFilteredRows();

  renderKpis(rows);

  const container = $("salesList");
  if (!container) return;

  container.replaceChildren();

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Aucune vente trouvée pour ces filtres";
    container.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.forEach(row => {
    fragment.appendChild(createSaleCard(row));
  });

  container.appendChild(fragment);
}

function render() {
  renderRows();
}

function resetFilters() {
  $("searchInput").value = "";
  $("productFilter").value = "";
  $("paymentFilter").value = "";
  $("statusFilter").value = "";
  $("dateFrom").value = "";
  $("dateTo").value = "";

  if (currentUser?.role !== "seller" && $("sellerFilter")) {
    $("sellerFilter").value = "";
  }

  loadData();
}

function bindEvents() {
  [
    "searchInput",
    "productFilter",
    "sellerFilter",
    "paymentFilter",
    "statusFilter"
  ].forEach(id => {
    const element = $(id);
    if (!element) return;
    element.addEventListener("input", renderRows);
    element.addEventListener("change", renderRows);
  });

  ["dateFrom", "dateTo"].forEach(id => {
    const element = $(id);
    if (!element) return;
    element.addEventListener("change", loadData);
  });

  $("searchBtn")?.addEventListener("click", loadData);
  $("resetBtn")?.addEventListener("click", resetFilters);
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async user => {
    if (!user) {
      location.replace("404.html");
      return;
    }

    try {
      await checkAccess(user.uid);
    } catch (error) {
      console.error(error);
      location.replace("404.html");
    }
  });
});
