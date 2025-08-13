const markersMap = {};

function creerLesMarqueurs(map, items) {
    if (!map) {
        console.error("La carte n'est pas initialisée.");
        return;
    }
    const tagsProblematiques = [];
    items.forEach(item => {
        const tags = item['data']['tags'];
        tags.forEach(t => {
            const { tag } = t;
            if (!tag.startsWith('#')) return;
            const coordRegex = /\((-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)\)/;
            const matches = tag.trim().match(coordRegex);
            if (matches) {
                const lat = parseFloat(matches[1]);
                const long = parseFloat(matches[3]);

                if (!isNaN(lat) && !isNaN(long)) {
                    try {
                        const marker = L.marker([lat, long]);
                        marker.addTo(map)
                            .bindPopup(`
                                <h2>${item['data']['title'] || '(sans titre)'}</h2>
                            `);
                        markersMap[item.key] = marker;
                        marker.on('click', ev => {
                            changeHash(`entree-${item.key}`);
                            ouvrirPopupMarqueur(item.key);
                        });
                    } catch (error) {
                        console.error("Erreur lors de l'ajout du marqueur à la carte:", error);
                    }
                } else {
                    console.warn(`Coordonnées invalides dans le tag : \"${tag}\"`);
                    tagsProblematiques.push(item.key);
                }
            } else {
                console.warn(`Tag non parsé : \"${tag}\"`);
                tagsProblematiques.push(item.key);
            }
        });
    });
}

function ouvrirPopupMarqueur(itemKey) {
    const marker = markersMap[itemKey];
    if (marker) {
        marker.openPopup();
    } else {
        console.error(`Marqueur non trouvé pour l'item avec la clé ${itemKey}`);
    }
}

function changeHash(newHash) {
    const currentUrl = window.location.href;
    const newUrl = new URL(currentUrl);
    newUrl.hash = newHash;
    window.location = newUrl.href;
}

export { creerLesMarqueurs, ouvrirPopupMarqueur, changeHash };