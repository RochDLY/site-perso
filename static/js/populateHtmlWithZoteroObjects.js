// Importer les données triées depuis getItems.js
import { getTagsList, checkForUpdatesItemsAndTags, getItemsWithCache } from "./getZoteroObjects.js";
import { w2layout, w2sidebar, w2grid, query } from '/js/w2ui/w2ui.es6.min.js';

// Déclarez itemsFiltered comme une variable globale
let itemsFiltered = [];
let filteredCache = {};  // Cache pour les résultats filtrés par tag

// w2ui configuration
let config = {
    layout: {
        name: 'layout',
        padding: 8,
        panels: [
            { type: 'left', size: '15%', minSize: 150, resizable: true },
            { type: 'main', size: '50%', overflow: 'hidden' },
            { type: 'right', size: '50%', resizable: true }
        ]
    },
    sidebar: {
        name: 'sidebar',
        nodes: [
            { id: 'general', text: 'Tags', group: true, expanded: true, nodes: [] }
        ],
        onClick(event) {
            if (event.target !== 'general') {
                filterItemsByTag(event.target);
            }
        }
    },
    grid1: {
        name: 'grid1',
        header: 'Liste des publications',
        reorderRows: false,
        limit: 50,
        show: {
            header: true,
            footer: true,
            toolbar: true,
            lineNumbers: true
        },
        columns: [
            //{ field: 'fname', text: 'Prénom', size: '15%' },
            //{ field: 'lname', text: 'Nom', size: '15%' },
            { field: 'type', text: 'Type', size: '15%' },
            { field: 'title', text: 'Titre', size: '70%' },
            { field: 'date', text: 'Date', size: '15%' }
        ],
        searches: [
            { type: 'int', field: 'recid', label: 'ID' },
            { type: 'text', field: 'fname', label: 'Prénom' },
            { type: 'text', field: 'lname', label: 'Nom' },
            { type: 'text', field: 'title', label: 'Titre' },
            { type: 'date', field: 'date', label: 'Date' }
        ],
        records: [],
        onClick(event) {
            let record = this.get(event.detail.recid);
            showItemDetails(record);
        }
    }
};

let layout = new w2layout(config.layout);
let sidebar = new w2sidebar(config.sidebar);
let grid1 = new w2grid(config.grid1);

// Fonction d'affichage des tags dans la sidebar de w2ui
function displayTagsInHTML(tags) {
    const tagCounts = {};

    itemsFiltered.forEach(item => {
        if (item.tags) {
            item.tags.forEach(tag => {
                const tagName = tag.tag;
                if (!tagName.startsWith('_') && !tagName.startsWith('#')) {
                    tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
                }
            });
        }
    });

    if (sidebar) {
        sidebar.add('general', { id: 'All', text: 'Tous les tags' });

        tags.forEach(tag => {
            const count = tagCounts[tag] || 0;
            sidebar.add('general', { id: tag, text: `${tag}`, count: `${count}` });
        });

        sidebar.refresh();
    } else {
        setTimeout(() => displayTagsInHTML(tags), 100);
    }
}

// Fonction d'affichage des items dans la grille
function displayItems(items) {
    const records = items.map((item, index) => {
        //const creator = item.creators && item.creators[0] ? item.creators[0] : null;
        //const firstName = creator && creator.firstName ? creator.firstName : "Prénom inconnu";
        //const lastName = creator && creator.lastName ? creator.lastName : "Nom inconnu";
        
        return {
            recid: index + 1,
            //fname: firstName,
            //lname: lastName,
            creators: item.creators 
                ? item.creators
                    .filter(creator => creator.creatorType === "author")  // Filtrer uniquement les auteurs
                    .map(creator => `${creator.firstName} ${creator.lastName}`)  // Créer une chaîne avec le prénom et le nom
                    .join(', ')  // Joindre les noms avec une virgule
                : 'Auteur inconnu',
            title: item.title || 'Sans titre',
            date: item.date || 'Date inconnue',
            abstract: item.abstract || 'Aucun résumé',
            type: item.type || 'Aucun type de document déclaré',
            tags: item.tags ? item.tags.filter(tag => !tag.tag.startsWith('_') && !tag.tag.startsWith('#')).map(tag => tag.tag).join(', ') : 'Aucun tag',
        };
    });

    setTimeout(() => {
        grid1.render('#layout-container .main');
        grid1.clear();
        grid1.add(records);
        grid1.refresh();
    }, 100);
}

// Fonction d'affichage des détails d'un item sélectionné
function showItemDetails(item) {
    const detailsDiv = document.getElementById('itemDetails');
    detailsDiv.innerHTML = '';

    const title = document.createElement('h3');
    title.textContent = item.title || 'Sans titre';
    detailsDiv.appendChild(title);

    if (item.date) {
        const date = document.createElement('p');
        date.textContent = 'Date: ' + item.date;
        detailsDiv.appendChild(date);
    }

    const authors = document.createElement('p');
    authors.textContent = 'Auteur(s): ' + item.creators;
    detailsDiv.appendChild(authors);

    const abstract = document.createElement('p');
    abstract.textContent = 'Résumé: ' + (item.abstract || 'Aucun résumé disponible');
    detailsDiv.appendChild(abstract);

    if (item.tags) {
        const tagsDiv = document.createElement('p');
        tagsDiv.textContent = 'Tags: ' + (item.tags || 'Aucun tag disponible');
        detailsDiv.appendChild(tagsDiv);
    }
}

// Fonction de filtrage des items par tag
function filterItemsByTag(tag) {
    if (filteredCache[tag]) {
        displayItems(filteredCache[tag]);
        return;
    }

    let filteredItems = [];

    if (tag === 'All') {
        filteredItems = itemsFiltered;
    } else {
        filteredItems = itemsFiltered.filter(item => {
            return item.tags && item.tags.some(itemTag => itemTag.tag === tag);
        });
    }

    filteredCache[tag] = filteredItems;

    displayItems(filteredItems);
}

// Nouvelle version de getFilteredItems avec les updates
async function getFilteredItems() {
    // Vérifier les mises à jour des items et des tags
    await checkForUpdatesItemsAndTags();

    // Récupérer les items filtrés à partir de la cache
    const items = await getItemsWithCache();

    // Liste des types d'items autorisés : on supprime les types "snapshot", "presentation", "note"
    const allowedItemTypes = [
        'annotation', 'artwork', 'audioRecording', 'bill', 'blogPost', 'book', 'bookSection', 'case', 'computerProgram',
        'conferencePaper', 'dictionaryEntry', 'document', 'email', 'encyclopediaArticle', 'film', 'forumPost', 'hearing',
        'instantMessage', 'interview', 'journalArticle', 'letter', 'magazineArticle', 'manuscript', 'map', 'newspaperArticle',
        'patent', 'podcast', 'radioBroadcast', 'report', 'statute', 'thesis', 'tvBroadcast', 'videoRecording', 'webpage'
    ];

    // Filtrer et transformer les items pour ne garder que les informations nécessaires
    return items
        .filter(item => allowedItemTypes.includes(item.data.itemType))  // Filtrer par type d'item
        .map(item => ({
            title: item.data.title || "Titre non spécifié",  // Titre de l'item
            creators: item.data.creators || "Auteur inconnu",  // Auteur(s) de l'item
            date: item.data.date || "Date non spécifiée",  // Date de l'item
            abstract: item.data.abstractNote || "Aucun abstract disponible",  // Abstract de l'item
            tags: item.data.tags,  // Tags associés à l'item
            type: item.data.itemType// Type de document
        }));
}

// Fonction pour mettre à jour les items en vérifiant s'il y a des mises à jour
async function updateItems() {
    try {
        // Vérifier les mises à jour des items et des tags
        await checkForUpdatesItemsAndTags();  // Met à jour les items et les tags

        // Récupérer les items filtrés après les mises à jour
        itemsFiltered = await getFilteredItems();  // Utilisation de la fonction filtrée pour récupérer les items mis à jour

        // Mettre à jour l'affichage des items dans la grille
        filterItemsByTag('All');
    } catch (error) {
        console.error("Erreur lors de la mise à jour des items:", error);
    }
}

// Fonction d'initialisation pour récupérer les données et afficher les tags
async function init() {
    try {
        // Vérifier les mises à jour des items avant de les afficher au lancement
        await updateItems();

        const tagList = await getTagsList();
        
        layout.render('#main');
        layout.html('left', sidebar);
        layout.html('main', grid1);
        layout.html('right', '<div id="itemDetails"></div>');

        displayTagsInHTML(tagList);

        sidebar.select('All');
        filterItemsByTag('All');

        // Mise à jour périodique des items (toutes les 5 minutes)
        setInterval(async () => {
            console.log("Vérification des mises à jour...");
            await updateItems();
        }, 300000); // 5 minutes
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
}

// Initialiser l'application
init();
