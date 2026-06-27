 // NAV
  const currentPage =
  location.pathname.split("/").pop();

document
  .querySelectorAll(".nav-item")
  .forEach(item => {

    if (
      item.dataset.page === currentPage
    ) {
      item.classList.add("active");
    }
  });
