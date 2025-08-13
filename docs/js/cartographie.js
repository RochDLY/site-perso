import { creerLaSidebar, sidebarElemTemplate } from './sidebar.js';
import { creerLesMarqueurs, ouvrirPopupMarqueur, changeHash } from './mapMarkers.js';
import { getNoteForItem, checkForUpdatesItemsOnly } from './zoteroService.js';

async function main() {
    try {
        const initialHash = window.location.hash;
        const data = {
            coords: [45.4533, -72.0],
            zoom_start: 3
        };
        const { coords, zoom_start } = data;
        const map = L.map('map').setView(coords, zoom_start);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href=\"http://www.openstreetmap.org/copyright\">OpenStreetMap</a>'
        }).addTo(map);
        const items = await checkForUpdatesItemsOnly();
        creerLesMarqueurs(map, items);
        creerLaSidebar(items);
        if (initialHash) {
            changeHash(initialHash);
        }
        setInterval(async () => {
            console.log('Vérification des mises à jour...');
            const items = await checkForUpdatesItemsOnly();
            creerLesMarqueurs(map, items);
            creerLaSidebar(items);
        }, 300000);

    } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'application:', error);
    }
}

main();