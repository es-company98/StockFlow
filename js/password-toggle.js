export function initPasswordToggles(root = document) {
  const buttons = root.querySelectorAll("[data-password-toggle]");

  buttons.forEach(button => {
    const targetId = button.getAttribute("data-password-toggle");
    const input = document.getElementById(targetId);

    if (!input) {
      return;
    }

    button.addEventListener("click", () => {
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "👁" : "🙈";
      button.setAttribute(
        "aria-label",
        visible ? "Afficher le mot de passe" : "Masquer le mot de passe"
      );
    });
  });
}
