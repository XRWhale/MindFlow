// Shared utilities for Cloudflare Workers API functions

export function detectSource(url) {
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('tiktok.com')) return 'tiktok';
    return 'web';
}

export function extractMeta(html, property) {
    const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']` +
        `|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        'i'
    );
    const match = html.match(regex);
    if (!match) return '';
    const raw = match[1] || match[2] || '';
    return raw
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
}

export async function fetchInstagramOEmbed(url, env) {
    const appId = env.META_APP_ID;
    const appSecret = env.META_APP_SECRET;
    if (!appId || !appSecret) return null;

    const accessToken = `${appId}|${appSecret}`;
    const oembedUrl = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${accessToken}&maxwidth=658&omitscript=true`;

    const res = await fetch(oembedUrl);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) return null;

    return {
        title: data.author_name ? `@${data.author_name}` : '',
        description: data.title || '',
        image: data.thumbnail_url
            ? `/api/image-proxy?url=${encodeURIComponent(data.thumbnail_url)}`
            : '',
        source: 'instagram'
    };
}

export async function fetchOgMeta(url, source) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MindFlowBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
        },
        redirect: 'follow'
    });

    if (!res.ok) return null;

    const html = await res.text();
    const title = extractMeta(html, 'og:title');
    const description = extractMeta(html, 'og:description');
    let image = extractMeta(html, 'og:image');

    if (source === 'instagram' && image) {
        image = `/api/image-proxy?url=${encodeURIComponent(image)}`;
    }

    return { title, description, image, source, html };
}
