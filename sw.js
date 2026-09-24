var CACHE_NAME = "pvc-chat-v1";
var CORE_ASSETS = ["./", "./index.html", "./app.js", "./firebase-config.js", "./manifest.json", "./pvc-team-logo.png"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(CORE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Hanya cache file statis dari situs sendiri. Semua request ke Firebase/Firestore
// (domain lain) sengaja dibiarkan lewat apa adanya, supaya chat realtime tidak terganggu.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function (resp) {
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
        return resp;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});