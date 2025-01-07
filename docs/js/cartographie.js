import { getZoteroObjects, checkForUpdatesItemsOnly } from "./getZoteroObjects.js";

let map;
let tagsProblematiques = [];
let items = []; // Déclarer items ici pour qu'il soit accessible globalement
let markersMap = {}; // Structure pour stocker les marqueurs

/**
 * Fonction asynchrone qui initialise l’application,
 * récupère les items Zotero, leurs notes, les trie et les affiche sur la carte et dans la sidebar.
 *
 * @returns {Promise<void>} Cette fonction n'a pas de valeur de retour, mais elle modifie l'état de l'interface utilisateur.
 */
async function main() {
    try {
        const initialHash = window.location.hash;
        
        // Initialiser la carte avec Leaflet avant d'ajouter les marqueurs
        const data = {
            coords: [45.4533, -72.0],
            zoom_start: 3
        };

        const { coords, zoom_start } = data;

        // Initialiser la carte avec Leaflet
        map = L.map('map').setView(coords, zoom_start);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Maintenant que la carte est initialisée, on peut mettre à jour les items et ajouter des marqueurs
        await updateItems();

        // Créer les marqueurs et sidebar
        creerLesMarqueurs(map, items);
        creerLaSidebar(items);

        // Gérer l'initialisation du hash dans l'URL
        if (initialHash) {
            changeHash(initialHash);
        }

        // Mettre à jour les items toutes les 5 minutes
        setInterval(async () => {
            console.log("Vérification des mises à jour...");
            await updateItems();
        }, 300000); // 5 minutes en millisecondes

    } catch (error) {
        console.error("Erreur lors de l'initialisation de l'application:", error);
    }
}


/**
 * Fonction pour mettre à jour les items en vérifiant s'il y a des mises à jour disponibles.
 * checkForUpdatesItemsOnly() récupère les items dont les tags commencent par un '#' car ce
 * car ce sont ces tags qui sont à afficher sur la carte. Cela évite d'avoir à parser à chaque
 * update toutes les données.
 */
async function updateItems() {
    try {
        // Vérifier si des mises à jour sont disponibles
        let updatedItems = await checkForUpdatesItemsOnly();

        // S'assurer que updatedItems est bien un tableau, même vide
        updatedItems = updatedItems || [];

        // Si des mises à jour sont présentes, on met à jour le cache et on utilise les nouvelles données
        if (updatedItems.length > 0) {
            console.log("Mises à jour détectées:", updatedItems);
            // Mettre à jour les items avec leurs notes
            for (let item of updatedItems) {
                const note = await getNoteForItem(item.key); // Récupérer la note
                item.note = note; // Ajouter la note à l'item
            }
            items = updatedItems; // Mise à jour des items avec les notes
        } else {
            items = getItemsFromCache() || [];
        }

        // Mettre à jour la carte et la sidebar avec les nouvelles données
        creerLesMarqueurs(map, items);
        creerLaSidebar(items);

    } catch (error) {
        console.error("Erreur lors de la mise à jour des items:", error);
    }
}
    

/**
 * Fonction pour récupérer les notes d'un item spécifique via l'API Zotero.
 * 
 * @param {string} itemKey - Clé unique de l'item pour lequel récupérer la note.
 * @returns {Promise<string>} Retourne la note de l'item ou une chaîne vide si aucune note n'est trouvée.
 * 
 * @throws {Error} Si une erreur se produit lors de la récupération des données via l'API Zotero.
 */
async function getNoteForItem(itemKey) {
    try {
        const noteData = await getZoteroObjects(`/items/${itemKey}/children`);
        
        // Vérifier si noteData n'est pas null et contient des éléments
        if (noteData && Array.isArray(noteData)) {
            const noteItem = noteData.find(child => child.data.itemType === 'note');
            return noteItem ? noteItem.data.note : ''; // Retourner la note si trouvée, sinon une chaîne vide
        } else {
            console.warn(`Aucune donnée trouvée pour l'item ${itemKey}`);
            return ''; // Retourner une chaîne vide si aucune note n'est trouvée
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération de la note pour l'item ${itemKey}:`, error);
        return ''; // Retourner une chaîne vide en cas d'erreur
    }
}

/**
 * Fonction pour récupérer les items depuis le cache (localStorage).
 * @returns {Array|null} Liste des items ou null si aucun cache.
 */
function getItemsFromCache() {
    const cachedData = localStorage.getItem('zoteroItems');
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    return null;
}

/**
 * Fonction pour créer et afficher les marqueurs sur la carte Leaflet.
 * Chaque item doit avoir un tag contenant des coordonnées géographiques valides.
 *
 * @param {Object<LeafletMap>} map - Instance de la carte Leaflet.
 * @param {Array<Object>} items - Liste des items Zotero à afficher sur la carte. Chaque item doit contenir des tags de coordonnées.
 * les tags de coordonnées doivent être formatés comme dans cet exemple : '#Saint-Élie-d'Orford : Mont Orford (45.29972, -72.2307)'
 * Le '#' est utilisé uniquement pour déclarer des coordonnées et les coordonnées sont déclarées en (latitude, longitude).
 */
function creerLesMarqueurs(map, items) {
    // Vérifiez si 'map' est défini avant de continuer
    if (!map) {
        console.error("La carte n'est pas initialisée.");
        return;
    }

    items.forEach(item => {
        const tags = item['data']['tags'];

        tags.forEach(t => {
            const { tag } = t;
            if (!tag.startsWith('#')) return; // Filtrer uniquement les tags commençant par '#'

            const coordRegex = /\((.+)\)$/;
            const validCoord = /^\-?\d{1,3}(\.\d{1,20})?$/;
            const matches = tag.trim().match(coordRegex);

            if (matches) {
                const rawCoords = matches[1].split(',');
                const coords = rawCoords.map(elem => elem.trim());
                const lat = coords[0];
                const long = coords[1];

                if (validCoord.test(lat) && validCoord.test(long)) {
                    // Vérifier que lat et long sont bien des coordonnées valides avant d'ajouter le marqueur
                    try {
                        const marker = L.marker([lat, long]);

                        // Ajouter le marqueur à la carte
                        marker.addTo(map)
                            .bindPopup(`
                                <h2>${item['data']['title'] || '(sans titre)'}</h2>
                            `);

                        // Ajouter le marqueur à la map des marqueurs pour pouvoir y accéder plus tard
                        markersMap[item.key] = marker; // Associer la clé de l'item au marqueur

                        // Ajouter un gestionnaire d'événements pour le clic sur le marqueur
                        marker.on('click', ev => {
                            changeHash(`entree-${item.key}`);
                        });

                    } catch (error) {
                        console.error("Erreur lors de l'ajout du marqueur à la carte:", error);
                    }
                } else {
                    console.warn(`Ce tag n’a pas été ajouté, car il comporte des données invalides: "${tag}"`);
                    tagsProblematiques.push(item.key);
                }
            } else {
                console.warn(`Le tag "${tag}" n’a pas été ajouté, car il n’a pu être parsé.`);
                tagsProblematiques.push(item.key);
            }
        });
    });
}
    

/**
 * Fonction pour générer la sidebar avec les items et leurs informations.
 * 
 * @param {Array<Object>} items - Liste des items à afficher dans la sidebar.
 * Chaque item doit contenir des informations telles que `title`, `date`, `tags`, et `note`.
 */
function creerLaSidebar(items) {
    const list = document.querySelector('.liste-entrees');
    let htmlContent = '';

    items.forEach(item => {
        const tags = item['data']['tags'] || [];

        // Filtrer les tags qui commencent par '#'
        const filteredTags = tags.filter(t => t.tag.startsWith('#'));

        // Si au moins un tag valide existe, ajouter l'item à la sidebar
        if (filteredTags.length > 0) {
            htmlContent += sidebarElemTemplate(item);
        }
    });

    list.innerHTML = htmlContent;

    // Gestion du clic dans la sidebar
    document.querySelector('.liste-entrees').addEventListener('click', (event) => {
        const itemElement = event.target.closest('.entree');
        if (itemElement) {
            const itemId = itemElement.id.replace('entree-', '');
            const item = items.find(i => i.key === itemId);
            if (item) {
                changeHash(`entree-${itemId}`);
                ouvrirPopupMarqueur(item.key); // Ouvrir le popup du marqueur correspondant
            }
        }
    });
}
    
/**
 * Fonction template pour créer le contenu HTML d'un item dans la sidebar.
 *
 * @param {Object} item - L'item à afficher dans la sidebar.
 * @returns {string} - HTML représentant l'élément de la sidebar pour l'item.
 */
function sidebarElemTemplate(item) {
    const tags = item['data']['tags'] || [];
    const creators = item['data']['creators'] || [];
    const creatorList = Array.isArray(creators) ? creators.map(creator => `${creator.firstName} ${creator.lastName}`).join(', ') : 'Aucun créateur disponible';

    if (item['data']['url'].length > 0) {
        return `
        <li class="entree" id="entree-${item.key}" style="cursor: pointer;">
            <h2 class="entree-titre">${item['data']['title'] || '(sans titre)'}</h2>
            <div class="entree-contenu">
                <b class="entree-key">Présentateur(s):</b> ${creatorList}
                <br />
                <b class="entree-key">Date:</b> ${item['data']['date']}
                <br/>
                <b class="entree-key">Lieu:</b> ${tags[0] ? tags[0]['tag'] : 'Lieu non spécifié'}  
                <br/>
                <b class="entree-key">Média associé:</b> <a href="${item['data']['url']}" target="_blank">Lien</a>
                <br/>
                <b class="entree-key">Note :</b> ${item['note'] || 'Aucune note disponible'}
                ${tagsProblematiques.indexOf(item.key) !== -1 ? '<div class="entree-warning"><strong>Note: il y a eu un problème en analysant ce tag.</strong></div>' : ''}
            </div>
        </li>
    `;
    } else {
        return `
        <li class="entree" id="entree-${item.key}" style="cursor: pointer;">
            <h2 class="entree-titre">${item['data']['title'] || '(sans titre)'}</h2>
            <div class="entree-contenu">
                <b class="entree-key">Présentateur(s):</b> ${creatorList}
                <br />
                <b class="entree-key">Date:</b> ${item['data']['date']}
                <br/>
                <b class="entree-key">Lieu:</b> ${tags[0] ? tags[0]['tag'] : 'Lieu non spécifié'}  
                <br/>
                <b class="entree-key">Note :</b> ${item['note'] || 'Aucune note disponible'}
                ${tagsProblematiques.indexOf(item.key) !== -1 ? '<div class="entree-warning"><strong>Note: il y a eu un problème en analysant ce tag.</strong></div>' : ''}
            </div>
        </li>
    `;
    }
}
    

/**
 * Fonction pour changer l'URL avec un nouveau hash.
 */
function changeHash(newHash) {
    const currentUrl = window.location.href;
    const newUrl = new URL(currentUrl);
    newUrl.hash = newHash;
    window.location = newUrl.href;
}

/**
 * Fonction pour ouvrir la popup du marqueur (utilisée pour ouvrir la popup au clic d'un item dans la sidebar).
 *
 * @param {string} itemKey - La clé unique de l'item pour lequel ouvrir le popup du marqueur associé.
 */
function ouvrirPopupMarqueur(itemKey) {
    // Chercher le marqueur correspondant à l'item
    const marker = markersMap[itemKey]; // Vous devrez créer un tableau ou un objet `markersMap` pour associer les clés des items aux marqueurs

    if (marker) {
        marker.openPopup(); // Ouvrir le popup du marqueur
    } else {
        console.error(`Marqueur non trouvé pour l'item avec la clé ${itemKey}`);
    }
}
    
// Appel de la fonction principale
main();
