import {
  state,
  $,
  n,
  formatMoney,
  clearNode,
  getDate,
  loadPreviousPeriodData
} from "./stats.js";
import { getExpiringAlerts } from "./expiration.js";

export async function render(chartApi) {
  const sales = state.sales;
  const expenses = state.expenses;
  const losses = state.losses;

  state.chartReady = true;

  window.statsData = {
    sales,
    expenses,
    debts: state.debts,
    losses,
    products: state.products,
    stockMovements: state.stockMovements,
    currency: state.currency
  };

  let previousPeriod = {
    sales: [],
    expenses: [],
    losses: []
  };

  try {
    previousPeriod = await loadPreviousPeriodData();
  } catch (error) {
    console.error("loadPreviousPeriodData:", error);
  }

  renderKPIs(
    sales,
    expenses,
    losses,
    previousPeriod.sales,
    previousPeriod.expenses,
    previousPeriod.losses
  );

  renderFinancialHealth(sales, expenses, losses);
  renderStockHealth();
  renderDebts();
  renderPurchases();
  renderProducts();
  renderSellers(sales, state.saleItems);
  renderAlerts();
  renderActivity();

  if (state.chartReady && chartApi?.renderChart) {
    chartApi.renderChart();
  }
}

function renderFinancialHealth(sales, expenses, losses) {
  const expensesTotal =
    expenses.reduce((s, e) => s + n(e.amount), 0);

  const lossesTotal =
    losses
      .filter(e => e.isSystemCorrection !== true && e.status !== "cancelled")
      .reduce((s, e) => s + n(e.amount), 0);

  const debtsTotal =
    state.debts
      .filter(e => e.status !== "paid" && e.status !== "cancelled")
      .reduce((s, e) => s + n(e.amount_remaining), 0);

  const cashReceived =
    sales.reduce((s, v) => s + n(v.amount_paid), 0);

  const purchaseTotal =
    state.purchases.reduce((s, p) => s + n(p.total_cost), 0);

  const grossProfit =
    state.saleItems.reduce((s, i) => s + n(i.profit), 0);

  const netResult =
    grossProfit
    - expensesTotal
    - lossesTotal;

  $("expensesValue")?.textContent = formatMoney(expensesTotal);
  $("lossesValue")?.textContent = formatMoney(lossesTotal);
  $("debtsValue")?.textContent = formatMoney(debtsTotal);
  $("cashReceivedValue")?.textContent = formatMoney(cashReceived);
  $("purchaseValue")?.textContent = formatMoney(purchaseTotal);
  $("netResultValue")?.textContent = formatMoney(netResult);
}

function renderStockHealth() {
  const stockValue =
    state.products.reduce((s, p) => {
      const price = n(p.price_buy || p.purchase_price);
      return s + (n(p.stock_current) * price);
    }, 0);

  const blockedStock =
    state.products.filter(p =>
      p.offlineBlocked === true ||
      n(p.stock_current) <= n(p.minOfflineStock || 0)
    ).length;

  const stockOut =
    state.products.filter(p =>
      n(p.stock_current) <= 0
    ).length;

  const soldQty =
    state.saleItems.reduce((s, i) => s + n(i.quantity), 0);

  const stockQty =
    state.products.reduce((s, p) => s + n(p.stock_current), 0);

  const rotation =
    stockQty > 0 ? (soldQty / stockQty).toFixed(2) : "0";

  $("stockValue")?.textContent = formatMoney(stockValue);
  $("stockRotation")?.textContent = rotation;
  $("blockedStock")?.textContent = String(blockedStock);
  $("stockOutCount")?.textContent = String(stockOut);
}

function renderDebts() {
  clearNode("topDebtorsList");

  const box = $("topDebtorsList");

  if (!box) {
    return;
  }

  const debts =
    (state.debts || [])
      .filter(debt => debt && debt.status !== "cancelled")
      .sort(
        (a, b) =>
          n(b.amount_remaining) -
          n(a.amount_remaining)
      )
      .slice(0, 10);

  debts.forEach(debt => {
    const item = document.createElement("div");
    item.className = "list-item";

    const left = document.createElement("div");
    left.className = "list-left";

    const title = document.createElement("div");
    title.className = "list-title";
    title.textContent =
      debt.name ||
      debt.customerName ||
      "Client";

    const sub = document.createElement("div");
    sub.className = "list-sub";

    const paid = n(debt.amount_paid);
    const total = n(debt.amount_total);

    sub.textContent =
      `${paid.toLocaleString()} / ${total.toLocaleString()} payé`;

    const value = document.createElement("div");
    value.className = "list-value";
    value.textContent =
      formatMoney(debt.amount_remaining || 0);

    left.appendChild(title);
    left.appendChild(sub);

    item.appendChild(left);
    item.appendChild(value);

    box.appendChild(item);
  });

  if (debts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Aucune dette client";
    box.appendChild(empty);
  }
}

function renderPurchases() {
  clearNode("purchaseList");

  const box = $("purchaseList");
  if (!box) return;

  const list =
    [...state.purchases]
      .sort((a, b) =>
        getDate(b.createdAt) - getDate(a.createdAt)
      )
      .slice(0, 10);

  list.forEach(p => {
    const item = document.createElement("div");
    item.className = "activity-item";

    const left = document.createElement("div");
    left.className = "activity-left";

    const title = document.createElement("div");
    title.className = "activity-title";
    title.textContent = p.supplier || "Fournisseur";

    const meta = document.createElement("div");
    meta.className = "activity-meta";
    meta.textContent =
      getDate(p.createdAt)?.toLocaleString() || "";

    const value = document.createElement("div");
    value.className = "activity-price";
    value.textContent = formatMoney(p.total_cost);

    left.appendChild(title);
    left.appendChild(meta);

    item.appendChild(left);
    item.appendChild(value);

    box.appendChild(item);
  });
}

function renderKPIs(
  sales,
  expenses,
  losses,
  previousSales = [],
  previousExpenses = [],
  previousLosses = []
) {
  const saleIds = new Set(sales.map(s => s.id));

  const filteredItems =
    state.saleItems.filter(i => saleIds.has(i.saleId));

  const totalSales =
    filteredItems.reduce(
      (s, i) =>
        s + (n(i.price) * n(i.quantity)),
      0
    );

  const grossProfit =
    filteredItems.reduce(
      (s, i) => s + n(i.profit),
      0
    );

  const totalExpenses =
    expenses.reduce((sum, e) =>
      sum + n(e.amount), 0
    );

  const totalLossesPeriod =
    losses
      .filter(e => e.isSystemCorrection !== true && e.status !== "cancelled")
      .reduce((sum, e) => sum + n(e.amount), 0);

  const realProfit = grossProfit - totalExpenses - totalLossesPeriod;

  const basket =
    sales.length
      ? totalSales / sales.length
      : 0;

  const marginRate =
    totalSales > 0
      ? (grossProfit / totalSales) * 100
      : 0;

  const prevSalesTotal =
    previousSales.reduce(
      (sum, s) => sum + n(s.total_amount),
      0
    );

  const previousSaleIds =
    new Set(previousSales.map(s => s.id));

  const previousItems =
    state.saleItems.filter(i => previousSaleIds.has(i.saleId));

  const prevProfitTotal =
    previousItems.reduce(
      (sum, i) => sum + n(i.profit),
      0
    ) -
    previousExpenses.reduce(
      (sum, e) => sum + n(e.amount),
      0
    ) -
    previousLosses
      .filter(e => e.isSystemCorrection !== true && e.status !== "cancelled")
      .reduce((sum, e) => sum + n(e.amount), 0);

  const prevBasket =
    previousSales.length
      ? prevSalesTotal / previousSales.length
      : 0;

  const prevMargin =
    prevSalesTotal > 0
      ? (prevProfitTotal / prevSalesTotal) * 100
      : 0;

  const calcTrend = (current, previous) => {
    if (!previous || previous <= 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const salesTrendValue = calcTrend(totalSales, prevSalesTotal);
  const profitTrendValue = calcTrend(realProfit, prevProfitTotal);
  const basketTrendValue = calcTrend(basket, prevBasket);
  const marginTrendValue = calcTrend(marginRate, prevMargin);

  $("salesValue")?.textContent = formatMoney(totalSales);
  $("profitValue")?.textContent = formatMoney(realProfit);
  $("basketValue")?.textContent = formatMoney(basket);
  $("marginValue")?.textContent = `${marginRate.toFixed(1)}%`;

  const updateTrend = (id, value) => {
    const el = $(id);
    if (!el) return;

    const v = n(value);
    const positive = v >= 0;

    el.textContent = `${positive ? "+" : ""}${v.toFixed(1)}%`;
    el.className = positive
      ? "kpi-trend trend-up"
      : "kpi-trend trend-down";
  };

  updateTrend("salesTrend", salesTrendValue);
  updateTrend("profitTrend", profitTrendValue);
  updateTrend("basketTrend", basketTrendValue);
  updateTrend("marginTrend", marginTrendValue);
}

function renderProducts() {
  clearNode("topProductsList");
  clearNode("deadProductsList");
  clearNode("criticalStockList");

  const topBox = $("topProductsList");
  const deadBox = $("deadProductsList");
  const criticalBox = $("criticalStockList");

  if (!topBox || !deadBox || !criticalBox) {
    return;
  }

  const salesMap = {};

  state.saleItems.forEach(item => {
    const productId =
      item.productId ||
      item.product_id;

    if (!productId) {
      return;
    }

    salesMap[productId] ??= 0;

    salesMap[productId] += n(
      item.quantity ||
      item.qty ||
      item.stock_out
    );
  });

  const productsWithSales = state.products.map(product => ({
    ...product,
    soldQty: salesMap[product.id] || 0
  }));

  const topProducts = [...productsWithSales]
    .filter(p => p.soldQty > 0)
    .sort((a, b) => b.soldQty - a.soldQty)
    .slice(0, 5);

  topProducts.forEach(product => {
    const item = document.createElement("div");
    item.className = "list-item";

    const left = document.createElement("div");
    left.className = "list-left";

    const title = document.createElement("div");
    title.className = "list-title";
    title.textContent = product.name || "Produit";

    const sub = document.createElement("div");
    sub.className = "list-sub";
    sub.textContent = "Quantité vendue";

    const value = document.createElement("div");
    value.className = "list-value";
    value.textContent = String(product.soldQty);

    left.appendChild(title);
    left.appendChild(sub);

    item.appendChild(left);
    item.appendChild(value);

    topBox.appendChild(item);
  });

  const deadProducts = [...productsWithSales]
    .filter(p => p.soldQty <= 0)
    .sort((a, b) => n(b.stock_current) - n(a.stock_current))
    .slice(0, 5);

  deadProducts.forEach(product => {
    const item = document.createElement("div");
    item.className = "list-item";

    const left = document.createElement("div");
    left.className = "list-left";

    const title = document.createElement("div");
    title.className = "list-title";
    title.textContent = product.name || "Produit";

    const sub = document.createElement("div");
    sub.className = "list-sub";
    sub.textContent = "Aucune vente";

    const value = document.createElement("div");
    value.className = "list-value";
    value.textContent = String(n(product.stock_current));

    left.appendChild(title);
    left.appendChild(sub);

    item.appendChild(left);
    item.appendChild(value);

    deadBox.appendChild(item);
  });

  const criticalProducts = state.products
    .filter(product => {
      const alertLevel = n(product.stock_alert) || 5;
      return n(product.stock_current) <= alertLevel;
    })
    .sort(
      (a, b) =>
        n(a.stock_current) -
        n(b.stock_current)
    )
    .slice(0, 5);

  criticalProducts.forEach(product => {
    const item = document.createElement("div");
    item.className = "list-item";

    const left = document.createElement("div");
    left.className = "list-left";

    const title = document.createElement("div");
    title.className = "list-title";
    title.textContent = product.name || "Produit";

    const sub = document.createElement("div");
    sub.className = "list-sub";
    sub.textContent = "Stock critique";

    const value = document.createElement("div");
    value.className = "list-value";
    value.textContent = String(n(product.stock_current));

    left.appendChild(title);
    left.appendChild(sub);

    item.appendChild(left);
    item.appendChild(value);

    criticalBox.appendChild(item);
  });
}

function renderSellers(sales, saleItems) {
  clearNode("leaderboardList");
  clearNode("weakSellerList");

  const boxTop = $("leaderboardList");
  const boxWeak = $("weakSellerList");
  if (!boxTop || !boxWeak) return;

  const map = {};

  state.users.forEach(u => {
    const id = u.userId || u.id;
    map[id] = { amount: 0, count: 0 };
  });

  const UNKNOWN = "__unknown__";
  map[UNKNOWN] = { amount: 0, count: 0 };

  const itemsBySale = {};

  saleItems.forEach(i => {
    if (!itemsBySale[i.saleId]) itemsBySale[i.saleId] = [];
    itemsBySale[i.saleId].push(i);
  });

  sales.forEach(s => {
    const sellerId = s.sellerId || UNKNOWN;
    const saleKey = s.saleId || s.id;

    const items = itemsBySale[saleKey] || [];

    let saleTotal = 0;
    let saleCount = 0;

    items.forEach(i => {
      saleTotal += n(i.price) * n(i.quantity);
      saleCount += n(i.quantity);
    });

    if (!map[sellerId]) {
      map[sellerId] = { amount: 0, count: 0 };
    }

    map[sellerId].amount += saleTotal;
    map[sellerId].count += saleCount;
  });

  const entries = Object.entries(map);

  const sortedTop =
    [...entries]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 5);

  const sortedWeak =
    [...entries]
      .sort((a, b) => a[1].amount - b[1].amount)
      .slice(0, 5);

  const renderList = (box, data, badge = null) => {
    data.forEach(([id, v]) => {
      const user =
        state.users.find(u =>
          (u.userId || u.id) === id
        );

      const el = document.createElement("div");
      el.className = "list-item";

      const left = document.createElement("div");
      left.className = "list-left";

      const title = document.createElement("div");
      title.className = "list-title";
      title.textContent = user?.name || id;

      const sub = document.createElement("div");
      sub.className = "list-sub";
      sub.textContent = `${v.count} unités vendues`;

      const value = document.createElement("div");
      value.className = "list-value";
      value.textContent = formatMoney(v.amount);

      if (badge) {
        const tag = document.createElement("div");
        tag.className = `badge ${badge}`;
        tag.textContent = badge === "badge-green" ? "TOP" : "LOW";
        left.appendChild(tag);
      }

      left.appendChild(title);
      left.appendChild(sub);

      el.appendChild(left);
      el.appendChild(value);

      box.appendChild(el);
    });
  };

  renderList(boxTop, sortedTop, "badge-green");
  renderList(boxWeak, sortedWeak, "badge-orange");
}

function renderAlerts() {
  const expenseEl = $("expenseAlertText");

  if (expenseEl) {
    const expenses = state.expenses;

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + n(e.amount),
      0
    );

    const avgExpense = expenses.length
      ? totalExpenses / expenses.length
      : 0;

    const abnormalExpenses = expenses.filter(
      e => n(e.amount) > (avgExpense * 2)
    );

    expenseEl.textContent = abnormalExpenses.length
      ? `${abnormalExpenses.length} Dépense(s) supérieure(s) à la moyenne`
      : "Aucune Dépense anormale détectée";
  }

  const businessEl = $("businessAlertText");

  if (businessEl) {
    const lowStockCount = state.products.filter(
      p => n(p.stock_current) <= 5
    ).length;

    const outOfStockCount = state.products.filter(
      p => n(p.stock_current) <= 0
    ).length;

    const debtCount = state.debts.filter(
      e =>
        e.status !== "paid" &&
        n(e.amount_remaining) > 0
    ).length;

    const messages = [];

    if (outOfStockCount > 0) {
      messages.push(`${outOfStockCount} produit(s) en rupture`);
    }

    if (lowStockCount > 0) {
      messages.push(`${lowStockCount} produit(s) à réapprovisionner`);
    }

    if (debtCount > 0) {
      messages.push(`${debtCount} dette(s) à recouvrer`);
    }

    if (state.config?.enableExpiration) {
      const alertDays = state.config?.expirationAlertDays ?? 30;
      const { expiringSoonCount, expiredCount } = getExpiringAlerts(
        state.products,
        state.stockMovements,
        alertDays
      );

      if (expiringSoonCount > 0) {
        messages.push(
          `${expiringSoonCount} produit(s) expirent dans ${alertDays} jours`
        );
      }

      if (expiredCount > 0) {
        messages.push(
          `${expiredCount} lot(s) expiré(s) en stock`
        );
      }
    }

    businessEl.textContent = messages.length
      ? messages.join(" • ")
      : "Aucune opportunité particulière détectée";
  }
}

function renderActivity() {
  const box = $("recentActivityList");
  if (!box) return;

  clearNode("recentActivityList");

  const movements = [...state.stockMovements]
    .sort((a, b) =>
      getDate(b.createdAt) - getDate(a.createdAt)
    )
    .slice(0, 10);

  movements.forEach(m => {
    const el = document.createElement("div");
    el.className = "activity-item";

    const left = document.createElement("div");
    left.className = "activity-left";

    const title = document.createElement("div");
    title.className = "activity-title";

    const product = state.products.find(p => p.id === m.productId);

    const typeLabel =
      m.type === "IN" ? "📥 Entrée stock" :
      m.type === "OUT" ? "📤 Sortie stock" :
      "⚙ Mouvement stock";

    const reasonLabel =
      m.reason ? ` (${m.reason})` : "";

    title.textContent =
      `${typeLabel}${reasonLabel} - ${product?.name || "Produit"}`;

    const meta = document.createElement("div");
    meta.className = "activity-meta";

    const date = getDate(m.createdAt)?.toLocaleString() || "";

    meta.textContent =
      `${date} • Qty: ${m.quantity || 0}`;

    const value = document.createElement("div");
    value.className = "activity-price";
    value.textContent = `${m.quantity || 0} pcs`;

    left.appendChild(title);
    left.appendChild(meta);

    el.appendChild(left);
    el.appendChild(value);

    box.appendChild(el);
  });
}
