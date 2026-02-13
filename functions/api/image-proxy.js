export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url).searchParams.get('url');

    if (!url) {
        return new Response('Missing url', { status: 400 });
    }

    // Only allow Instagram/Facebook CDN domains
    try {
        const parsed = new URL(url);
        const allowed = ['cdninstagram.com', 'fbcdn.net', 'instagram.com'];
        if (!allowed.some((d) => parsed.hostname.endsWith(d))) {
            return new Response('Domain not allowed', { status: 403 });
        }
    } catch {
        return new Response('Invalid url', { status: 400 });
    }

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MindFlowBot/1.0)'
            }
        });

        if (!res.ok) {
            return new Response('Upstream error', { status: res.status });
        }

        const body = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/jpeg';

        return new Response(body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch {
        return new Response('Proxy error', { status: 500 });
    }
}
