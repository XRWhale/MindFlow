import { getItems, updateItem } from './storage.js';

export async function resolveUrl(url) {
    const res = await fetch(`/api/resolve?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Failed to resolve');
    return res.json();
}

export async function resolveAndUpdate(itemId, url) {
    try {
        const meta = await resolveUrl(url);
        if (meta.error) return null;
        updateItem(itemId, {
            ogTitle: meta.title || '',
            ogDescription: meta.description || '',
            ogImage: meta.image || '',
            ogSource: meta.source || '',
            resolved: true,
            resolveV: 4
        });
        return meta;
    } catch {
        return null;
    }
}
