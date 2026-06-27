const cartDom =
  document.querySelector(".cart");

const toggleCartBtn =
  document.getElementById("toggleCart");

/* ================================
   OUVRIR / FERMER
================================ */

toggleCartBtn?.addEventListener(
  "click",
  (e) => {

    e.stopPropagation();

    cartDom?.classList.toggle(
      "hidden"
    );

  }
);

/* ================================
   BLOQUER FERMETURE
   SI CLICK DANS PANIER
================================ */

cartDom?.addEventListener(
  "pointerdown",
  (e) => {

    e.stopPropagation();

  }
);

/* ================================
   FERMETURE EXTERNE
================================ */

document.addEventListener(
  "pointerdown",
  (e) => {

    if (
      !cartDom ||
      !toggleCartBtn
    ) {
      return;
    }

    const target = e.target;

    const clickedCart =
      cartDom.contains(target);

    const clickedToggle =
      toggleCartBtn.contains(target);

    if (
      clickedCart ||
      clickedToggle
    ) {
      return;
    }
    cartDom.classList.add(
      "hidden"
    );
  }
);
