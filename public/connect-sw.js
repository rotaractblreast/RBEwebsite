/**
 * RBE Connect Service Worker
 * Scope: /connect/
 * Provides PWA caching, push notification support, and notification click routing.
 */

const CACHE_NAME = "rbe-connect-v1";
const STATIC_ASSETS = [
  "/connect/",
  "/connect-manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/images/site/favicon.png",
];

// Install: pre-cache essential connect assets and activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return Promise.allSettled(
          STATIC_ASSETS.map((url) => cache.add(url).catch(() => null))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key.startsWith("rbe-connect-"))
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first with cache fallback for /connect/
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only manage requests under /connect/ or related static assets
  if (
    url.pathname.startsWith("/connect") ||
    url.pathname === "/connect-manifest.webmanifest" ||
    url.pathname.startsWith("/icons/")
  ) {
    if (event.request.method !== "GET") {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (event.request.mode === "navigate") {
              return caches.match("/connect/");
            }
            return new Response("Offline", {
              status: 503,
              statusText: "Offline",
            });
          });
        })
    );
  }
});

// Push notification event listener
self.addEventListener("push", (event) => {
  let data = {
    title: "New RBE Member Application",
    body: "A new candidate has submitted an application to join RBE.",
    icon: "/icons/icon-192.png",
    badge: "/images/site/favicon.png",
    url: "/connect/",
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = Object.assign(data, payload);
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192.png",
    badge: data.badge || "/images/site/favicon.png",
    vibrate: [150, 80, 150],
    data: { url: data.url || "/connect/" },
    actions: [{ action: "open", title: "Open Connect" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event listener: brings user straight to /connect/
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/connect/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes("/connect") && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// Message listener
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
