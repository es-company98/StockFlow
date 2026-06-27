export const ITEMS_PER_PAGE = 10;
export const STALE_DEBT_DAYS = 7;

export function n(v) {
  return Number(v) || 0;
}

export function getDebtDueInfo(debt) {
  if (!debt || debt.status === "paid" || n(debt.amount_remaining) <= 0) {
    return { level: "paid", days: null, label: "Payé", sortKey: 99 };
  }

  if (!debt.DueDate?.toDate) {
    const created = debt.createdAt?.toDate?.();
    if (created) {
      const daysSince = Math.floor((Date.now() - created.getTime()) / 86400000);
      if (daysSince >= 7) {
        return {
          level: "stale",
          days: daysSince,
          label: `Ouverte (${daysSince} j)`,
          sortKey: 3
        };
      }
    }
    return { level: "open", days: null, label: "Sans échéance", sortKey: 4 };
  }

  const due = debt.DueDate.toDate();
  due.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days = Math.ceil((due - now) / 86400000);

  if (days < 0) {
    return {
      level: "overdue",
      days,
      label: `Retard ${Math.abs(days)} j`,
      sortKey: 0
    };
  }

  if (days === 0) {
    return { level: "today", days: 0, label: "Échéance aujourd'hui", sortKey: 1 };
  }

  if (days <= 3) {
    return { level: "soon", days, label: `Échéance ${days} j`, sortKey: 2 };
  }

  return { level: "ok", days, label: `Échéance ${days} j`, sortKey: 5 };
}

export function sortDebtsByPriority(debts) {
  return [...debts].sort((a, b) => {
    const pa = getDebtDueInfo(a);
    const pb = getDebtDueInfo(b);

    if (pa.sortKey !== pb.sortKey) {
      return pa.sortKey - pb.sortKey;
    }

    return n(b.amount_remaining) - n(a.amount_remaining);
  });
}

export function summarizeDebts(debts) {
  const open = debts.filter(
    d => d.status !== "paid" && d.status !== "cancelled" && n(d.amount_remaining) > 0
  );

  const summary = {
    total: open.length,
    overdue: 0,
    today: 0,
    soon: 0,
    stale: 0,
    open: 0,
    amountRemaining: 0
  };

  open.forEach(debt => {
    summary.amountRemaining += n(debt.amount_remaining);
    const info = getDebtDueInfo(debt);
    if (info.level === "overdue") summary.overdue += 1;
    else if (info.level === "today") summary.today += 1;
    else if (info.level === "soon") summary.soon += 1;
    else if (info.level === "stale") summary.stale += 1;
    else if (info.level === "open") summary.open += 1;
  });

  return summary;
}

export function debug(msg, boxId = "debug") {
  const box = document.getElementById(boxId);
  if (!box) return;

  box.textContent = msg;
  setTimeout(() => {
    box.textContent = "";
  }, 5000);
}

export function setLoading(listEl, state) {
  if (!listEl) return;
  listEl.replaceChildren();

  if (state) {
    const div = document.createElement("div");
    div.textContent = "Chargement...";
    listEl.appendChild(div);
  }
}

export function resetInputs(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else {
      el.value = "";
    }
  });
}

export function bindDateLimits(startDate, endDate) {
  if (!startDate || !endDate) return;

  const today = new Date().toISOString().split("T")[0];
  startDate.max = today;
  endDate.max = today;

  const validate = () => {
    if (startDate.value && startDate.value > today) {
      startDate.value = today;
    }
    if (endDate.value && endDate.value > today) {
      endDate.value = today;
    }
    if (
      startDate.value &&
      endDate.value &&
      endDate.value < startDate.value
    ) {
      endDate.value = startDate.value;
    }
  };

  startDate.addEventListener("change", validate);
  endDate.addEventListener("change", validate);
  validate();
}

export function renderPagination(listEl, total, currentPage, onPage) {
  const old = document.getElementById("pagination");
  if (old) old.remove();

  const pages = Math.ceil(total / ITEMS_PER_PAGE);
  if (pages <= 1) return;

  const container = document.createElement("div");
  container.id = "pagination";
  container.style.display = "flex";
  container.style.gap = "6px";
  container.style.justifyContent = "center";
  container.style.marginTop = "10px";

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(i);
    btn.style.padding = "6px 10px";
    btn.style.border = "none";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";

    if (i === currentPage) {
      btn.style.background = "#0B5FFF";
      btn.style.color = "#fff";
    }

    btn.addEventListener("click", () => onPage(i));
    container.appendChild(btn);
  }

  listEl.after(container);
}

export function closeActionModal(modal, errorEl) {
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  if (errorEl) errorEl.textContent = "";
}

export function formatItemDate(createdAt) {
  if (!createdAt?.toDate) return "";

  const d = createdAt.toDate();
  return (
    d.toLocaleDateString("fr-FR") +
    " • " +
    d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    })
  );
}
