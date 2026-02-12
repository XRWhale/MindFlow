const STORAGE_KEY = 'mindflow_items';

export function getItems() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

export function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function addItem(title, text, url) {
    const items = getItems();
    const filtered = url ? items.filter((item) => item.url !== url) : items;
    filtered.unshift({
        id: crypto.randomUUID(),
        title,
        text,
        url,
        createdAt: Date.now()
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
