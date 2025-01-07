// URL de base de l'API Zotero pour un groupe spécifique
const baseUrl = "https://api.zotero.org/groups/5813957";
// Endpoint pour récupérer les items
const urlItems = "/items";
// Endpoint pour récupérer les tags
const urlTags = "/tags";

/**
 * Fonction pour récupérer les objets de l'API Zotero avec pagination.
 * Cette fonction récupère tous les objets d'une ressource spécifique (par exemple, les items ou les tags) 
 * en effectuant des requêtes paginées.
 *
 * @param {string} object - Le chemin de l'API pour récupérer les objets (par exemple, '/items' ou '/tags').
 * @returns {Promise<Array>} Un tableau contenant tous les objets récupérés.
 */
export async function getZoteroObjects(object) {
    const limit = 100;  // Limite de 100 éléments par requête
    let offset = 0;  // Décalage pour la pagination
    let allItems = [];  // Tableau pour stocker les éléments récupérés

    try {
        // Boucle pour récupérer les éléments paginés
        while (true) {
            const url = `${baseUrl}${object}?limit=${limit}&start=${offset}`;
            const response = await fetch(url);

            // Vérification si la réponse HTTP est correcte (code 200)
            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            // Conversion de la réponse en JSON
            const data = await response.json();  
            allItems.push(...data);  // Ajouter les éléments récupérés au tableau

            // Si le nombre d'éléments récupérés est inférieur à la limite, cela signifie que nous avons atteint la fin des données
            if (data.length < limit) {
                break;
            }

            // Incrémentation de l'offset pour récupérer la page suivante
            offset += limit;
        }

        // Retourne tous les éléments récupérés
        return allItems;
    } catch (error) {
        // Gestion des erreurs et retour de null en cas d'échec
        console.error('Erreur lors de la récupération des données:', error);
        return null;  // Retourner null en cas d'erreur
    }
}

/**
 * Fonction pour vérifier si les données dans le cache ont changé (expirées).
 * Vérifie si les données mises en cache sont obsolètes en se basant sur un timestamp stocké dans `localStorage`.
 *
 * @param {string} cacheName - Le nom du cache (par exemple, 'zoteroItems' ou 'zoteroTags').
 * @returns {boolean} Retourne `true` si le cache est expiré, sinon `false`.
 */
function isCacheExpired(cacheName) {
    const cacheTimestamp = localStorage.getItem(`${cacheName}Timestamp`);  // Récupération de l'horodatage du cache
    const now = Date.now();  // Récupération de l'heure actuelle

    // Si le cache n'existe pas ou si l'âge du cache dépasse 24 heures (86400000 ms)
    return !cacheTimestamp || now - cacheTimestamp > 86400000;
}

/**
 * Fonction pour récupérer les items avec cache et vérification des mises à jour.
 * Cette fonction vérifie si les items sont dans le cache et si le cache est expiré. Si le cache est expiré,
 * elle effectue une nouvelle requête pour récupérer les items depuis l'API Zotero.
 *
 * @returns {Promise<Array>} Un tableau contenant les items, soit depuis le cache soit récupérés depuis Zotero.
 */
export async function getItemsWithCache() {
    // Si le cache des items n'a pas expiré, on les récupère depuis le cache
    if (!isCacheExpired('zoteroItems')) {
        const cachedData = localStorage.getItem('zoteroItems');
        if (cachedData) {
            // Retourner les données mises en cache si elles ne sont pas expirées
            return JSON.parse(cachedData);
        }
    }

    // Si le cache est expiré ou inexistant, on récupère les nouvelles données depuis Zotero
    const newItems = await getZoteroObjects(urlItems);
    if (newItems) {
        // Mettre en cache les nouvelles données et l'horodatage de mise à jour
        localStorage.setItem('zoteroItems', JSON.stringify(newItems));
        localStorage.setItem('zoteroItemsTimestamp', Date.now().toString());
        return newItems;
    }

    // Si aucune donnée n'a été récupérée, retourner un tableau vide
    return [];  
}

/**
 * Fonction pour récupérer les tags depuis Zotero.
 * Cette fonction récupère tous les tags et les filtre pour exclure ceux qui sont invalides 
 * (comme ceux commençant par `#` ou `_`). Elle retourne également les tags triés par ordre alphabétique.
 *
 * @returns {Promise<Array>} Un tableau contenant les tags triés.
 */
export async function getTagsList() {
    try {
        // Récupérer les données de l'API pour les tags
        const data = await getZoteroObjects(urlTags);
        if (!data) return [];  // Si aucune donnée n'a été récupérée, retourner un tableau vide

        // Utilisation d'un Set pour éviter les doublons et filtrer les tags invalides
        const tags = [...new Set(data.map(item => item.tag)
            .filter(tag => tag && !tag.startsWith('#') && !tag.startsWith('_')))]
            .sort();  // Tri des tags par ordre alphabétique

        // Retourner les tags triés
        return tags;  
    } catch (error) {
        // Gestion des erreurs lors de la récupération des tags
        console.error('Erreur lors de la récupération des tags :', error);
        return [];  // Retourner un tableau vide en cas d'erreur
    }
}

/**
 * Fonction pour vérifier si des mises à jour sont disponibles pour les items et les tags.
 * Vérifie si le cache des items et des tags est expiré et, si c'est le cas, met à jour ces données.
 */
export async function checkForUpdatesItemsAndTags() {
    // Vérification de l'expiration du cache pour les items et les tags
    const itemsOutOfDate = isCacheExpired('zoteroItems');
    const tagsOutOfDate = isCacheExpired('zoteroTags');

    // Si les items sont expirés, on les met à jour
    if (itemsOutOfDate) {
        console.log("Les items ont été mis à jour, actualisation des données...");
        const newItems = await getItemsWithCache();  // Récupérer les nouveaux items
        // Mettre à jour le cache avec les nouvelles données
        localStorage.setItem('zoteroItems', JSON.stringify(newItems));
        localStorage.setItem('zoteroItemsTimestamp', Date.now().toString());
    }

    // Si les tags sont expirés, on les met à jour
    if (tagsOutOfDate) {
        console.log("Les tags ont été mis à jour, actualisation des données...");
        const newTags = await getTagsList();  // Récupérer les nouveaux tags
        // Mettre à jour le cache avec les nouveaux tags
        localStorage.setItem('zoteroTags', JSON.stringify(newTags));
        localStorage.setItem('zoteroTagsTimestamp', Date.now().toString());
    }
}

/**
 * Fonction pour vérifier les mises à jour uniquement pour les items.
 * Cette fonction récupère les items et filtre ceux qui ont des tags commençant par `#`.
 *
 * @returns {Promise<Array>} Un tableau contenant uniquement les items avec des tags commençant par `#`.
 */
export async function checkForUpdatesItemsOnly() {
    try {
        // Récupérer les items mis à jour depuis Zotero ou le cache
        const updatedItems = await getItemsWithCache();
        
        // Vérifier si les updatedItems sont bien un tableau
        if (!Array.isArray(updatedItems)) {
            return [];
        }

        // Filtrer les items dont les tags commencent par '#'
        const filteredItems = updatedItems.filter(item => {
            const tags = item['data']['tags'] || [];
            // Vérifier si un tag commence par '#'
            return tags.some(tag => tag.tag.startsWith('#'));
        });

        // Retourner les items filtrés
        return filteredItems;
    } catch (error) {
        // Gestion des erreurs lors de la mise à jour des items
        console.error('Erreur lors de la mise à jour des items:', error);
        return [];  // Retourner un tableau vide en cas d'erreur
    }
}
