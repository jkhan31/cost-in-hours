const CACHE_NAME = "cost-in-hours-v1";
const URLS_TO_CACHE = [
  "./",
  "index.html",
  "manifest.json",
  "icon-192.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // We use addAll but handle failures gracefully to prevent SW install block
      return cache.addAll(URLS_TO_CACHE).catch(err => {
        console.warn("Some assets failed to cache during SW install:", err);
      });
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached response or fetch from network
      return response || fetch(event.request).catch(() => {
        // Optional: return a fallback for offline if fetch fails
      });
    })
  );
});