# Décisions de réalisation — 18 novembre 2026

- Source brute téléchargée et contrôlée : instantané plus récent que le jeu public initial. Régénération cohérente du métro et des autres modes avant export des dessertes.
- Identité Reine Blanche confirmée par le GTFS : IDFM:23052 (sens vers Saint-Germain) ; le même nom existe sur plusieurs points distincts, conservés par leur identifiant.
- Événements à six champs conservés, sans réécrire les paquets pour y ajouter generationId. Les métadonnées de génération sont liées aux octets réellement validés par leur manifeste et leur SHA. Cela remplit le contrat de version sans dupliquer tous les paquets.
- Partitions compressées en gzip déterministe, extension .bin pour éviter toute décompression HTTP implicite. Descripteur encoding=gzip-json et decodedBytes ; SHA des octets compressés, limite également appliquée après décompression. DecompressionStream est requis pour cette fenêtre, sans modifier la consultation des passages des autres clients.
- Les manifestes et index restent en JSON. Environ 52,7 Mo de fichiers au lieu de 268,5 Mo de représentation JSON non compressée lors de la première génération de qualification ; les mesures exactes sont dans le rapport.
- Une génération identique est réutilisée si source, bornes et empreintes des paquets/catalogues concordent. Les générations précédentes sont conservées jusqu’à leur expiration et la fin des courses, plus 24 h.
- Client préparé sous release-client et activé par le workflow seulement après génération et qualification. Publication du client et des données correspondantes dans un même commit.
- Mesures Node sur fichiers locaux distinctes de performances réseau mobile. Recette GPS physique non revendiquée.

- La vérification statique privée attendait encore les boutons GPS/manuels du prototype ; elle contrôle désormais les ressources de l’accueil publié et leur syntaxe. Les recettes navigateur de l’ancien écran manuel sont remplacées par celles de l’accueil courant, des couleurs, de la proximité et de la nouvelle desserte. Les tests unitaires du proxy sont conservés.
- Focus du bouton de ligne conservé lors du rendu périodique après fermeture du dialogue ; vérification navigateur étendue au rendu suivant.
- Réutilisation de génération vérifiée après suppression des métadonnées que les générateurs de passages remplacent : les anciennes générations sont recherchées par leurs empreintes et les manifestes sont reliés de nouveau.

## Contraste des thèmes
La recette visuelle a révélé un titre blanc sur fond clair hérité du style des en-têtes. La fenêtre emploie désormais la variable de texte existante `--wenare-ink` pour son titre et son corps. La recette navigateur mesure un contraste minimal de 4,5 dans tous les thèmes. CSS de livraison versionné v42.
