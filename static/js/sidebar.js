import { changeHash, ouvrirPopupMarqueur } from './mapMarkers.js';

function creerLaSidebar(items) {
    const list = document.querySelector('.liste-entrees');
    let htmlContent = '';
    items.forEach(item => {
        const tags = item['data']['tags'] || [];
        const filteredTags = tags.filter(t => t.tag.startsWith('#'));
        if (filteredTags.length > 0) {
            htmlContent += sidebarElemTemplate(item);
        }
    });
    list.innerHTML = htmlContent;
    document.querySelector('.liste-entrees').addEventListener('click', (event) => {
        const itemElement = event.target.closest('.entree');
        if (itemElement) {
            const itemId = itemElement.id.replace('entree-', '');
            const item = items.find(i => i.key === itemId);
            if (item) {
                changeHash(`entree-${itemId}`);
                ouvrirPopupMarqueur(item.key);
            }
        }
    });
}

function sidebarElemTemplate(item) {
    const tags = item['data']['tags'] || [];
    const creators = item['data']['creators'] || [];
    const creatorList = Array.isArray(creators) ? creators.map(creator => `${creator.firstName} ${creator.lastName}`).join(', ') : 'Aucun créateur disponible';
    if (item['data']['url'].length > 0) {
        return `
            <li class=\"entree\" id=\"entree-${item.key}\" style=\"cursor: pointer;\">
                <h2 class=\"entree-titre\">${item['data']['title'] || '(sans titre)'}</h2>
                <div class=\"entree-contenu\">
                    <b class=\"entree-key\">Présentateur(s):</b> ${creatorList}
                    <br />
                    <b class=\"entree-key\">Date:</b> ${item['data']['date']}
                    <br/>
                    <b class=\"entree-key\">Lieu:</b> ${tags[0] ? tags[0]['tag'] : 'Lieu non spécifié'}  
                    <br/>
                    <b class=\"entree-key\">Média associé:</b> <a href=\"${item['data']['url']}\" target=\"_blank\">Lien</a>
                    <br/>
                    <b class=\"entree-key\">Note :</b> ${item['note'] || 'Aucune note disponible'}
                </div>
            </li>
        `;
    } else {
        return `
            <li class=\"entree\" id=\"entree-${item.key}\" style=\"cursor: pointer;\">
                <h2 class=\"entree-titre\">${item['data']['title'] || '(sans titre)'}</h2>
                <div class=\"entree-contenu\">
                    <b class=\"entree-key\">Présentateur(s):</b> ${creatorList}
                    <br />
                    <b class=\"entree-key\">Date:</b> ${item['data']['date']}
                    <br/>
                    <b class=\"entree-key\">Lieu:</b> ${tags[0] ? tags[0]['tag'] : 'Lieu non spécifié'}  
                    <br/>
                    <b class=\"entree-key\">Note :</b> ${item['note'] || 'Aucune note disponible'}
                </div>
            </li>
        `;
    }
}

export { creerLaSidebar, sidebarElemTemplate };