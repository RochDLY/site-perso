async function getNoteForItem(itemKey) {
    try {
        const noteData = await getZoteroObjects(`items/${itemKey}/children`);
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

function getItemsFromCache() {
    const cachedData = localStorage.getItem('zoteroItems');
    if (cachedData) {
        return JSON.parse(cachedData);
    }
    return null;
}

export { getNoteForItem, getItemsFromCache };