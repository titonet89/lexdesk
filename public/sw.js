/**
 * Service worker de LexDesk.
 *
 * A propósito NO guarda páginas ni datos del estudio: la información está
 * amparada por el secreto profesional y no debe quedar en el dispositivo (si se
 * pierde el celular, ahí no hay nada). Solo guarda la pantalla "Sin conexión",
 * que se muestra cuando no hay internet.
 */
const CACHE = "lexdesk-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Solo las navegaciones (abrir una pantalla). Todo lo demás va directo a la red.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
