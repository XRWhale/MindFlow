import { getItems } from './storage.js';

export function buildReportPayload() {
    const items = getItems();
    return {
        posts: items.map((item) => ({
            url: item.url || '',
            title: item.ogTitle || item.title || '',
            text: item.text || '',
            image: item.ogImage || '',
            caption: item.ogDescription || ''
        })),
        total: items.length,
        date: Date.now()
    };
}

export async function generateReport() {
    const payload = buildReportPayload();
    if (payload.total === 0) throw new Error('No items to analyze');

    const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Report generation failed');
    }

    return res.json();
}
