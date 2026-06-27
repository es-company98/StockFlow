// 👁 = mot de passe visible (texte) | 👁 barré = masqué (password)
const ICON_VISIBLE = "👁";
const ICON_HIDDEN = "👁";

function setPasswordVisible(input, button, visible) {
  input.setAttribute("type", visible ? "text" : "password");
  button.setAttribute("aria-pressed", visible ? "true" : "false");
  button.textContent = ICON_VISIBLE;
  button.classList.toggle("is-visible", visible);
  button.classList.toggle("is-masked", !visible);
  button.setAttribute(
    "aria-label",
    visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
  );
}

export function initPasswordToggles(root = document) {
  const buttons = root.querySelectorAll("[data-password-toggle]:not([data-toggle-bound])");

  buttons.forEach(button => {
    const targetId = button.getAttribute("data-password-toggle");
    const input = document.getElementById(targetId);

    if (!input) {
      return;
    }

    button.setAttribute("data-toggle-bound", "true");
    setPasswordVisible(input, button, false);

    button.addEventListener("mousedown", event => {
      event.preventDefault();
    });

    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      const isVisible = button.getAttribute("aria-pressed") === "true";
      setPasswordVisible(input, button, !isVisible);
    });
  });
}
