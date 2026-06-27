window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    const swUrl = new URL("service-worker.js", window.location.href);
    navigator.serviceWorker.register(swUrl.pathname);
  }
});
