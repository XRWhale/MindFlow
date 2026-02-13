export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url).searchParams.get('url');

    if (!url) {
        return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    try {
        new URL(url);
    } catch {
        return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    // Detect source from URL
    let source = 'web';
    if (url.includes('instagram.com')) source = 'instagram';
    else if (url.includes('youtube.com') || url.includes('youtu.be')) source = 'youtube';
    else if (url.includes('twitter.com') || url.includes('x.com')) source = 'twitter';
    else if (url.includes('tiktok.com')) source = 'tiktok';

    try {
        // Use Meta oEmbed API for Instagram URLs
        if (source === 'instagram') {
            const appId = env.META_APP_ID;
            const appSecret = env.META_APP_SECRET;

            if (appId && appSecret) {
                const accessToken = `${appId}|${appSecret}`;
                const oembedUrl = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${accessToken}&maxwidth=658&omitscript=true`;

                const oembedRes = await fetch(oembedUrl);
                if (oembedRes.ok) {
                    const data = await oembedRes.json();
                    if (!data.error) {
                        const image = data.thumbnail_url
                            ? `/api/image-proxy?url=${encodeURIComponent(data.thumbnail_url)}`
                            : '';
                        return jsonResponse({
                            title: data.author_name ? `@${data.author_name}` : '',
                            description: data.title || '',
                            image,
                            source: 'instagram'
                        });
                    }
                }
                // Fall through to OG scraping if oEmbed fails
            }
        }

        // Fallback: OG tag scraping for non-Instagram or if oEmbed failed
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
        let image = extractMeta(html, 'og:image');

        // Proxy Instagram images to avoid CDN 403
        if (source === 'instagram' && image) {
            image = `/api/image-proxy?url=${encodeURIComponent(image)}`;
        }

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
    if (!match) return '';
    const raw = match[1] || match[2] || '';
    return raw.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
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
