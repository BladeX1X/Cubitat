export function isDevelopmentServiceWorkerRequest(requestUrl: string | undefined): boolean {
  return requestUrl?.split('?', 1)[0] === '/sw.js'
}

export const DEVELOPMENT_SERVICE_WORKER_CLEANUP_SCRIPT = `
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    await self.registration.unregister();

    const windowClients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(windowClients.map((client) => client.navigate(client.url)));
  })());
});
`.trim()
