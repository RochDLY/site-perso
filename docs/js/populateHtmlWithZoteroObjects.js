import {
  getTagsList,
  checkForUpdatesItemsAndTags,
  getItemsWithCache
} from "./getZoteroObjects.js";

let itemsFiltered = [];
let filteredCache = {};

// 🔹 Affiche les publications dans le tableau
function displayItems(items) {
  const tbody = document.querySelector('#publicationTable tbody');
  tbody.innerHTML = '';

  items.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.type}</td>
      <td>${item.title}</td>
      <td>${item.date}</td>
    `;
    tr.onclick = () => showItemDetails(item);
    tbody.appendChild(tr);
  });
}

// 🔹 Transforme les tags d’un item en HTML interactif
function displayItemTags(tags) {
  if (!Array.isArray(tags)) return '<em>Aucun tag</em>';

  return tags
    .filter(t => t.tag && !t.tag.startsWith('_') && !t.tag.startsWith('#'))
    .map(t => `<span class=\"tag clickable\" data-tag=\"${t.tag}\">${t.tag}</span>`)
    .join(' ');
}

// 🔹 Affiche les détails d’un item sélectionné
function showItemDetails(item) {
  const detailsContainer = document.getElementById('itemDetails');
  const tagsHTML = displayItemTags(item.tags);

  detailsContainer.innerHTML = `
    <h2>${item.title}</h2>
    <p><strong>Type:</strong> ${item.type}</p>
    <p><strong>Auteur(s):</strong> ${item.authors}</p>
    <p><strong>Contributeur(s):</strong> ${item.creators}</p>
    <p><strong>Date:</strong> ${item.date}</p>
    <p><strong>Résumé:</strong> ${item.abstract}</p>
    <p><strong>Tags:</strong> ${tagsHTML}</p>
  `;

  // 🔸 Ajoute le filtrage par clic sur les tags
  detailsContainer.querySelectorAll('.tag.clickable').forEach(tagEl => {
    tagEl.onclick = () => filterItemsByTag(tagEl.dataset.tag);
  });
}

// 🔹 Affiche la liste des tags globaux avec comptage
function displayTagsInHTML(tags) {
  const tagCounts = {};

  itemsFiltered.forEach(item => {
    item.tags?.forEach(tag => {
      const tagName = tag.tag;
      if (!tagName.startsWith('_') && !tagName.startsWith('#')) {
        tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
      }
    });
  });

  const tagList = document.getElementById('tagList');
  tagList.innerHTML = '';

  const allTag = document.createElement('li');
  allTag.textContent = 'Tous les tags';
  allTag.onclick = () => filterItemsByTag('All');
  tagList.appendChild(allTag);

  tags.forEach(tag => {
    const li = document.createElement('li');
    li.textContent = `${tag} (${tagCounts[tag] || 0})`;
    li.onclick = () => filterItemsByTag(tag);
    tagList.appendChild(li);
  });
}

// 🔹 Filtre les publications par tag
function filterItemsByTag(tag) {
  if (filteredCache[tag]) {
    displayItems(filteredCache[tag]);
    return;
  }

  const filtered = tag === 'All'
    ? itemsFiltered
    : itemsFiltered.filter(item =>
        item.tags?.some(t => t.tag === tag)
      );

  filteredCache[tag] = filtered;
  displayItems(filtered);
}

// 🔹 Récupère et formate les publications Zotero
async function getFilteredItems() {
  await checkForUpdatesItemsAndTags();
  const items = await getItemsWithCache();

  const allowedItemTypes = [
    'annotation', 'artwork', 'audioRecording', 'bill', 'blogPost', 'book', 'bookSection', 'case', 'computerProgram',
    'conferencePaper', 'dictionaryEntry', 'document', 'email', 'encyclopediaArticle', 'film', 'forumPost', 'hearing',
    'instantMessage', 'interview', 'journalArticle', 'letter', 'magazineArticle', 'manuscript', 'map', 'newspaperArticle',
    'patent', 'podcast', 'radioBroadcast', 'report', 'statute', 'thesis', 'tvBroadcast', 'videoRecording', 'webpage'
  ];

  return items
    .filter(item => allowedItemTypes.includes(item.data.itemType))
    .map(item => ({
      title: item.data.title || "Titre non spécifié",
      authors: item.data.creators
        ? item.data.creators
            .filter(c => c.creatorType === "author")
            .map(c => `${c.firstName} ${c.lastName}`)
            .join(', ')
        : "Auteur inconnu",
      creators: item.data.creators
        ? item.data.creators
            .filter(c => c.creatorType === "contributor")
            .map(c => `${c.firstName} ${c.lastName}`)
            .join(', ')
        : "Contributeur inconnu",
      date: item.data.date || "Date non spécifiée",
      abstract: item.data.abstractNote || "Aucun abstract disponible",
      tags: item.data.tags,
      type: item.data.itemType,
      description: item.data.extra || ""
    }));
}

// 🔹 Initialise l’application
async function init() {
  try {
    itemsFiltered = await getFilteredItems();
    const tagList = await getTagsList();

    displayTagsInHTML(tagList);
    filterItemsByTag('All');

    setInterval(async () => {
      console.log("Vérification des mises à jour...");
      itemsFiltered = await getFilteredItems();
      filteredCache = {};
      filterItemsByTag('All');
    }, 300000);
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error);
  }
}

init();