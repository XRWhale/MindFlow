const STORAGE_KEY = 'mindflow_items';

export function getItems() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

export function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem({ title, url, summary, category, tags, intent, thumbnail, source } = {}) {
    const items = getItems();
    const filtered = url ? items.filter((item) => item.url !== url) : items;
    filtered.unshift({
        id: crypto.randomUUID(),
        title: title || '',
        url: url || '',
        createdAt: Date.now(),
        thumbnail: thumbnail || '',
        source: source || '',
        summary: summary || '',
        category: category || '',
        tags: tags || [],
        intent: intent || '',
        resolved: !!summary,
        viewCount: 0
    });
    saveItems(filtered);
    return filtered;
}

export function deleteItem(id) {
    const items = getItems().filter((item) => item.id !== id);
    saveItems(items);
    return items;
}

export function updateItem(id, updates) {
    const items = getItems();
    const idx = items.findIndex((item) => item.id === id);
    if (idx !== -1) Object.assign(items[idx], updates);
    saveItems(items);
    return items;
}

export function getItemById(id) {
    return getItems().find((item) => item.id === id) || null;
}

export function getWeeklyItems() {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return getItems().filter((item) => item.createdAt >= weekAgo);
}

export function incrementViewCount(id) {
    const items = getItems();
    const idx = items.findIndex((item) => item.id === id);
    if (idx !== -1) {
        items[idx].viewCount = (items[idx].viewCount || 0) + 1;
        saveItems(items);
    }
    return items;
}

export function migrateItems() {
    const migrated = localStorage.getItem('mindflow_migrated_v2');
    if (migrated) return;

    const items = getItems();
    let changed = false;

    for (const item of items) {
        // Migrate old ogTitle/ogDescription/ogImage/ogSource fields
        if (item.ogTitle !== undefined || item.ogDescription !== undefined || item.ogImage !== undefined) {
            item.title = item.ogTitle || item.title || '';
            item.thumbnail = item.ogImage || item.thumbnail || '';
            item.source = item.ogSource || item.source || '';
            item.summary = item.summary || item.ogDescription || item.text || '';
            delete item.ogTitle;
            delete item.ogDescription;
            delete item.ogImage;
            delete item.ogSource;
            delete item.text;
            delete item.resolveV;
            changed = true;
        }
        // Ensure new fields exist
        if (item.category === undefined) { item.category = ''; changed = true; }
        if (item.tags === undefined) { item.tags = []; changed = true; }
        if (item.intent === undefined) { item.intent = ''; changed = true; }
        if (item.viewCount === undefined) { item.viewCount = 0; changed = true; }
        if (item.thumbnail === undefined) { item.thumbnail = ''; changed = true; }
        if (item.source === undefined) { item.source = ''; changed = true; }
        if (item.summary === undefined) { item.summary = ''; changed = true; }
    }

    if (changed) saveItems(items);
    localStorage.setItem('mindflow_migrated_v2', '1');
}

export function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return '방금 전';
    if (diff < 60) return `${diff}초 전`;
    const min = Math.floor(diff / 60);
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}일 전`;
    const mon = Math.floor(day / 30);
    if (mon < 12) return `${mon}개월 전`;
    return `${Math.floor(mon / 12)}년 전`;
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
