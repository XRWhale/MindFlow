import { detectSource, fetchInstagramOEmbed, fetchOgMeta, jsonResponse } from './_helpers.js';

// Legacy endpoint - kept for backward compatibility
// New clients should use POST /api/collect instead
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

    const source = detectSource(url);

    try {
        if (source === 'instagram') {
            const oembedResult = await fetchInstagramOEmbed(url, env);
            if (oembedResult) return jsonResponse(oembedResult);
        }

        const ogResult = await fetchOgMeta(url, source);
        if (!ogResult) {
            return jsonResponse({ error: 'Failed to fetch URL' }, 502);
        }

        return jsonResponse({
            title: ogResult.title,
            description: ogResult.description,
            image: ogResult.image,
            source: ogResult.source
        });

    } catch (err) {
        return jsonResponse({ error: 'Fetch error: ' + err.message }, 500);
    }
}
