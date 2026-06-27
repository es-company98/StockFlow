const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgIcon(type) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  if (type === "open") {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute(
      "d",
      "M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
    );
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "3");
    svg.appendChild(path);
    svg.appendChild(circle);
    return svg;
  }

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute(
    "d",
    "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
  );
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", "1");
  line.setAttribute("y1", "1");
  line.setAttribute("x2", "23");
  line.setAttribute("y2", "23");
  svg.appendChild(path);
  svg.appendChild(line);
  return svg;
}

function setPasswordVisible(input, button, visible) {
  input.setAttribute("type", visible ? "text" : "password");
  button.setAttribute("aria-pressed", visible ? "true" : "false");
  button.classList.toggle("is-visible", visible);
  button.replaceChildren(createSvgIcon(visible ? "open" : "closed"));
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
