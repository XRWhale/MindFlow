import { updateItem } from './storage.js';

export async function collectUrl(url) {
    const res = await fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error('Failed to collect');
    return res.json();
}

export async function collectAndUpdate(itemId, url) {
    try {
        const result = await collectUrl(url);
        if (result.error) return null;
        updateItem(itemId, {
            title: result.title || '',
            summary: result.summary || '',
            category: result.category || '',
            tags: result.tags || [],
            intent: result.intent || '',
            thumbnail: result.thumbnail || '',
            source: result.source || '',
            resolved: true
        });
        return result;
    } catch {
        return null;
    }
}
