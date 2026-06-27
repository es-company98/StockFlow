import { db, doc, getDoc } from "./firebase.js";

/* =========================
   CACHE MEMORY + LOCAL
========================= */

let memoryCache = null;

const STORAGE_KEY = "appConfig_cache_v1";

/* =========================
   LOAD CONFIG (FAST SMART)
========================= */

export async function getAppConfig(forceRefresh = false) {

  // 1. MEMORY (ultra fast)
  if (memoryCache && !forceRefresh) {
    return memoryCache;
  }

  // 2. LOCAL STORAGE (fast offline)
  if (!forceRefresh) {
    const local = localStorage.getItem(STORAGE_KEY);

    if (local) {
      try {
        memoryCache = JSON.parse(local);
        return memoryCache;
      } catch (e) {
        console.warn("Corrupted cache");
      }
    }
  }

  // 3. FIREBASE (source of truth)
  try {

    const ref = doc(db, "appConfig", "main");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error("appConfig introuvable");
    }

    const data = snap.data();

    memoryCache = {
      shopName: data.shopName || "Shop",
      shopAddress: data.shopAddress || "",
      shopPhone: data.shopPhone || "",
      currency: data.currency || "$",
      currencySymbol: data.currencySymbol || "$",
      logoUrl: data.logoUrl || "",
      lowStockLimit: data.lowStockLimit ?? 5,
      enableOffline: data.enableOffline ?? true,
      enableExpiration: data.enableExpiration ?? false,
      expirationAlertDays: data.expirationAlertDays ?? 30,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    };

    // cache local
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(memoryCache)
    );

    return memoryCache;

  } catch (err) {
    console.error("Config load failed", err);

    // 4. fallback local even if error
    return memoryCache || {
      shopName: "Shop",
      shopAddress: "",
      shopPhone: "",
      currency: "$",
      currencySymbol: "$",
      enableExpiration: false,
      expirationAlertDays: 30
    };
  }
}

/* =========================
   GETTERS SIMPLES (PRO UX)
========================= */
export async function getShopName() {
  return (await getAppConfig()).shopName;
}

export async function getCurrency() {
  return (await getAppConfig()).currency;
}

export async function getCurrencySymbol() {
  return (await getAppConfig()).currencySymbol;
}

export async function getShopPhone() {
  return (await getAppConfig()).shopPhone;
}
