const CACHE_NAME = 'mindflow-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

// Install: cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: handle share target POST + offline cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Handle share target
  if (url.pathname === '/share' && e.request.method === 'POST') {
    e.respondWith(Response.redirect('/?shared=true', 303));
    e.waitUntil(handleShare(e.request));
    return;
  }

  // Serve from cache, fallback to network
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

async function handleShare(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  const files = formData.getAll('media') || [];

  // Store shared data for the client to pick up
  const sharedData = { title, text, url, files: [] };

  for (const file of files) {
    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      sharedData.files.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: Array.from(new Uint8Array(buffer))
      });
    }
  }

  // Send shared data to all open clients
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'SHARED_CONTENT', payload: sharedData });
  }

  // Also store in cache for when the page loads
  const cache = await caches.open(CACHE_NAME);
  await cache.put('/shared-data', new Response(JSON.stringify(sharedData)));
}
