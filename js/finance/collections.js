export const COLLECTIONS = {
  expenses: "expenses",
  debts: "debts",
  losses: "losses"
};

export function mapDocs(snap) {
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
