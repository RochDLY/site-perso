const baseUrl = "https://api.zotero.org/groups/5813957";
const endpoints = {
  items: "/items",
  tags: "/tags"
};

const CACHE_DURATION = 86400000; // 24h en ms

// --- 🔹 Fonctions de cache ---
function isCacheExpired(cacheName) {
  const timestamp = localStorage.getItem(`${cacheName}Timestamp`);
  return !timestamp || Date.now() - Number(timestamp) > CACHE_DURATION;
}

function readCache(cacheName) {
  const data = localStorage.getItem(cacheName);
  return data ? JSON.parse(data) : null;
}

function writeCache(cacheName, data) {
  localStorage.setItem(cacheName, JSON.stringify(data));
  localStorage.setItem(`${cacheName}Timestamp`, Date.now().toString());
}

// --- 🔹 API Zotero ---
export async function getZoteroObjects(path) {
  const limit = 100;
  let offset = 0;
  let allItems = [];

  try {
    while (true) {
      const url = `${baseUrl}${path}?limit=${limit}&start=${offset}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

      const data = await response.json();
      allItems.push(...data);

      if (data.length < limit) break;
      offset += limit;
    }

    return allItems;
  } catch (error) {
    console.error("Erreur lors de la récupération des données:", error);
    return null;
  }
}

// --- 🔹 Items & Tags avec cache ---
export async function getItemsWithCache() {
  const cacheName = "zoteroItems";
  if (!isCacheExpired(cacheName)) {
    const cached = readCache(cacheName);
    if (cached) return cached;
  }

  const items = await getZoteroObjects(endpoints.items);
  if (items) writeCache(cacheName, items);
  return items || [];
}

export async function getTagsList() {
  const cacheName = "zoteroTags";
  if (!isCacheExpired(cacheName)) {
    const cached = readCache(cacheName);
    if (cached) return cached;
  }

  const data = await getZoteroObjects(endpoints.tags);
  if (!data) return [];

  const tags = [...new Set(
    data.map(item => item.tag).filter(tag => tag && !tag.startsWith('#') && !tag.startsWith('_'))
  )].sort();

  writeCache(cacheName, tags);
  return tags;
}

export async function checkForUpdatesItemsAndTags() {
  if (isCacheExpired("zoteroItems")) {
    const items = await getItemsWithCache();
    writeCache("zoteroItems", items);
  }

  if (isCacheExpired("zoteroTags")) {
    const tags = await getTagsList();
    writeCache("zoteroTags", tags);
  }
}

export async function checkForUpdatesItemsOnly() {
  const items = await getItemsWithCache();
  if (!Array.isArray(items)) return [];

  return items.filter(item =>
    item.data.tags?.some(tag => tag.tag.startsWith('#'))
  );
}

// --- 🔹 Notes spécifiques ---
export async function getNoteForItem(itemKey) {
  try {
    const noteData = await getZoteroObjects(`/items/${itemKey}/children`);
    if (noteData && Array.isArray(noteData)) {
      const noteItem = noteData.find(child => child.data.itemType === 'note');
      return noteItem ? noteItem.data.note : '';
    } else {
      console.warn(`Aucune donnée trouvée pour l'item ${itemKey}`);
      return '';
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération de la note pour l'item ${itemKey}:`, error);
    return '';
  }
}