const CACHE_NAME = 'mindflow-v10';
const ASSETS = ['/', '/index.html', '/home.html', '/report.html', '/detail.html', '/manifest.json', '/js/storage.js', '/js/collect.js', '/js/report.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Handle share target POST
  if (url.pathname === '/share' && e.request.method === 'POST') {
    e.respondWith(handleShare(e.request));
    return;
  }

  // Never cache API calls or external requests
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});

async function handleShare(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const rawUrl = formData.get('url') || '';

  // JSON-safe strings for inline script
  const safeTitle = JSON.stringify(title);
  const safeText = JSON.stringify(text);
  const safeUrl = JSON.stringify(rawUrl);

  // Respond with minimal page that saves to localStorage and closes
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<script>
try {
  var KEY = 'mindflow_items';
  var items = JSON.parse(localStorage.getItem(KEY)) || [];
  var title = ${safeTitle};
  var text = ${safeText};
  var rawUrl = ${safeUrl};
  var match = text.match(/https?:\\/\\/[^\\s]+/);
  var url = rawUrl || (match ? match[0] : '');
  if (title || url) {
    if (url) items = items.filter(function(i) { return i.url !== url; });
    items.unshift({
      id: crypto.randomUUID(),
      title: title,
      url: url,
      createdAt: Date.now(),
      thumbnail: '',
      source: '',
      summary: '',
      category: '',
      tags: [],
      intent: '',
      resolved: false,
      viewCount: 0
    });
    localStorage.setItem(KEY, JSON.stringify(items));
  }
} catch(e) {}
window.close();
</script></head><body></body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}
