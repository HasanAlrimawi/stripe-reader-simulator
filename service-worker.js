const CACHE_NAME = "stripe-card-reader-pwa-v1";
const urlsToCache = [
  "index.html",
  "/assets/logo192.png",
  "/assets/logo512.png",
  "/constants/stripe-connection.js",
  "/styles/shared-style.css",
  "/communicator.js",
  "/main-controller.js",
  "/main-view.js",
  "/readers-model.js",
  "/manifest.json",
  "/service-worker.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
