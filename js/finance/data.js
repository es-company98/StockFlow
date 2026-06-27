import {
  db,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp
} from "../firebase.js";
import { COLLECTIONS, mapDocs } from "./collections.js";

export async function loadFinanceByCollection(collectionName, dateRange = null) {
  const constraints = [];

  if (dateRange?.start) {
    constraints.push(where("createdAt", ">=", dateRange.start));
  }

  if (dateRange?.end) {
    constraints.push(where("createdAt", "<=", dateRange.end));
  }

  constraints.push(orderBy("createdAt", "desc"));

  const snap = await getDocs(
    query(collection(db, collectionName), ...constraints)
  );

  return mapDocs(snap);
}

export async function loadAllFinance(dateRange = null) {
  const [expenses, debts, losses] = await Promise.all([
    loadFinanceByCollection(COLLECTIONS.expenses, dateRange),
    loadFinanceByCollection(COLLECTIONS.debts, dateRange),
    loadFinanceByCollection(COLLECTIONS.losses, dateRange)
  ]);

  return { expenses, debts, losses };
}

export function dateRangeFromInputs(startValue, endValue) {
  if (!startValue && !endValue) return null;

  const range = {};

  if (startValue) {
    range.start = Timestamp.fromDate(new Date(startValue));
  }

  if (endValue) {
    const end = new Date(endValue);
    end.setHours(23, 59, 59, 999);
    range.end = Timestamp.fromDate(end);
  }

  return range;
}
