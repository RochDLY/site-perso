import { getTagsList, checkForUpdatesItemsAndTags, getItemsWithCache } from "./getZoteroObjects.js";

let itemsFiltered = [];
let filteredCache = {};

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

function displayItems(items) {
  const tbody = document.querySelector('#publicationTable tbody');
  tbody.innerHTML = '';

  items.forEach((item, index) => {
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

function showItemDetails(item) {
  const detailsDiv = document.getElementById('itemDetails');
  detailsDiv.innerHTML = `
    <h3>${item.title}</h3>
    <p><strong>Date:</strong> ${item.date}</p>
    <p><strong>Auteur(s):</strong> ${item.creators}</p>
    <p><strong>Résumé:</strong> ${item.abstract}</p>
    <p><strong>Tags:</strong> ${item.tags}</p>
  `;
}

function filterItemsByTag(tag) {
  if (filteredCache[tag]) {
    displayItems(filteredCache[tag]);
    return;
  }

  let filteredItems = tag === 'All'
    ? itemsFiltered
    : itemsFiltered.filter(item =>
        item.tags?.some(t => t.tag === tag)
      );

  filteredCache[tag] = filteredItems;
  displayItems(filteredItems);
}

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
      creators: item.data.creators
        ? item.data.creators
            .filter(c => c.creatorType === "author")
            .map(c => `${c.firstName} ${c.lastName}`)
            .join(', ')
        : "Auteur inconnu",
      date: item.data.date || "Date non spécifiée",
      abstract: item.data.abstractNote || "Aucun abstract disponible",
      tags: item.data.tags,
      type: item.data.itemType
    }));
}

async function updateItems() {
  try {
    await checkForUpdatesItemsAndTags();
    itemsFiltered = await getFilteredItems();
    filterItemsByTag('All');
  } catch (error) {
    console.error("Erreur lors de la mise à jour des items:", error);
  }
}

async function init() {
  try {
    await updateItems();
    const tagList = await getTagsList();
    displayTagsInHTML(tagList);
    filterItemsByTag('All');

    setInterval(async () => {
      console.log("Vérification des mises à jour...");
      await updateItems();
    }, 300000);
  } catch (error) {
    console.error("Erreur lors de l'initialisation:", error);
  }
}

init();
