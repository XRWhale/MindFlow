export async function onRequestGet(context) {
    const { request } = context;
    const url = new URL(request.url).searchParams.get('url');

    if (!url) {
        return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    try {
        new URL(url);
    } catch {
        return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MindFlowBot/1.0)',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            },
            redirect: 'follow'
        });

        if (!res.ok) {
            return jsonResponse({ error: 'Failed to fetch URL' }, 502);
        }

        const html = await res.text();

        const title = extractMeta(html, 'og:title');
        const description = extractMeta(html, 'og:description');
        const image = extractMeta(html, 'og:image');

        // Detect source from URL
        let source = 'web';
        if (url.includes('instagram.com')) source = 'instagram';
        else if (url.includes('youtube.com') || url.includes('youtu.be')) source = 'youtube';
        else if (url.includes('twitter.com') || url.includes('x.com')) source = 'twitter';
        else if (url.includes('tiktok.com')) source = 'tiktok';

        return jsonResponse({ title, description, image, source });

    } catch (err) {
        return jsonResponse({ error: 'Fetch error: ' + err.message }, 500);
    }
}

function extractMeta(html, property) {
    // Match both property="og:..." and name="og:..."
    const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']` +
        `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        'i'
    );
    const match = html.match(regex);
    return match ? (match[1] || match[2] || '') : '';
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}
