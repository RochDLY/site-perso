document.addEventListener('DOMContentLoaded', function () {
    // Sélectionner tous les hyperliens avec la classe 'load-content'
    const links = document.querySelectorAll('a.load-content');

    // Ajouter un gestionnaire d'événements pour chaque lien
    links.forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Empêcher le comportement par défaut du lien

            const url = this.href; // Récupérer l'URL du lien

            // Créer une nouvelle iframe
            const iframe = document.createElement('iframe');
            iframe.src = url;

            // Vider la div 'contentDiv' et y ajouter la nouvelle iframe
            const contentDiv = document.getElementById('contentIframe');
            contentDiv.innerHTML = ''; // Effacer le contenu précédent
            contentDiv.appendChild(iframe);
            contentDiv.classList.add('has-iframe');
        });
    });
});