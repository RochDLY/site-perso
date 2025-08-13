const baseUrl = "https://api.zotero.org/groups/5813957";
const endpoints = {
  items: "/items",
  tags: "/tags"
};

const CACHE_DURATION = 86400000; // 24h en ms

// 🔹 Vérifie si le cache est expiré
function isCacheExpired(cacheName) {
  const timestamp = localStorage.getItem(`${cacheName}Timestamp`);
  return !timestamp || Date.now() - Number(timestamp) > CACHE_DURATION;
}

// 🔹 Lit les données du cache
function readCache(cacheName) {
  const data = localStorage.getItem(cacheName);
  return data ? JSON.parse(data) : null;
}

// 🔹 Écrit les données dans le cache
function writeCache(cacheName, data) {
  localStorage.setItem(cacheName, JSON.stringify(data));
  localStorage.setItem(`${cacheName}Timestamp`, Date.now().toString());
}

// 🔹 Récupère les objets Zotero avec pagination
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

// 🔹 Récupère les items avec cache
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

// 🔹 Récupère les tags avec cache et filtrage
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

// 🔹 Vérifie et met à jour les caches si nécessaire
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

// 🔹 Récupère uniquement les items avec tags commençant par #
export async function checkForUpdatesItemsOnly() {
  const items = await getItemsWithCache();
  if (!Array.isArray(items)) return [];

  return items.filter(item =>
    item.data.tags?.some(tag => tag.tag.startsWith('#'))
  );
}
