export const FILTERS = {

  genre: [
    { value: "all", label: "Tous genres" },
    { value: "expense", label: "Dépenses" },
    { value: "debt", label: "Dettes" },
    { value: "loss", label: "Pertes" }
  ],

  status: [
    { value: "all", label: "Tous statuts" },
    { value: "partial", label: "Partiel" },
    { value: "paid", label: "Payé" },
    { value: "cancelled", label: "Corrigé" }
  ]
};

export function injectOptions(
  selectId,
  options
) {

  const select =
    document.getElementById(selectId);

  if (!select) return;

  select.replaceChildren();

  const frag =
    document.createDocumentFragment();

  options.forEach(opt => {

    const option =
      document.createElement("option");

    option.value =
      opt.value;

    option.textContent =
      opt.label;

    frag.appendChild(option);
  });

  select.appendChild(frag);
}