import { getWeeklyItems } from './storage.js';

export function buildWeeklyPayload() {
    const items = getWeeklyItems();
    return {
        items: items.map((item) => ({
            id: item.id,
            title: item.title || '',
            summary: item.summary || '',
            category: item.category || '',
            tags: item.tags || [],
            intent: item.intent || '',
            viewCount: item.viewCount || 0,
            createdAt: item.createdAt
        })),
        total: items.length,
        date: Date.now()
    };
}

export async function generateWeeklyReport() {
    const payload = buildWeeklyPayload();
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
