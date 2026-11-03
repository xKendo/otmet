/* Sortowanie paczek · Otmęt — obsługa offline i aktualizacji v1.2 */
const CACHE_NAME = 'otmet-paczki-v1.2';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Dodatkowe pliki są opcjonalne – ich brak nie blokuje użycia offline.
    await Promise.allSettled(['./manifest.webmanifest','./ikona-192.png','./ikona-512.png']
      .map(url => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('otmet-paczki-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const isPage = request.mode === 'navigate' || new URL(request.url).pathname.endsWith('/index.html');
  if (isPage) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // Każde wejście online sprawdza nowy kod, ale bez internetu działa wersja zapisana.
        const response = await fetch(request, {cache:'no-store'});
        if (response.ok) await cache.put('./index.html', response.clone());
        return response;
      } catch (error) {
        return await cache.match('./index.html') || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request);
    if (response.ok) await cache.put(request,response.clone());
    return response;
  })());
});
