# AGENTS.md — WENARE

## Portée et objectif

Ce fichier s'applique à l'ensemble du dépôt `timetogrowup/P-123-wenare`.
Il doit être lu avant toute intervention et conservé à jour au fil des évolutions.

WENARE répond à la question : « Je suis à un endroit, qu'est-ce qui s'offre à moi ? »
Le projet permet notamment de consulter les transports et les lieux proches, ainsi que de se projeter dans un autre lieu et à un autre moment.

## Méthode obligatoire de gestion des projets de Patrick

Pour toute création ou évolution d’un projet, appliquer systématiquement la méthode suivante :

1. Reprendre l’existant : consulter le dépôt GitHub, son fichier AGENTS.md, les documents de suivi, les développements en cours et la dernière version fonctionnelle. Si le fichier AGENTS.md est absent ou inaccessible, le signaler explicitement.
2. Rédiger ou actualiser l’expression de besoin : objectif, usages, périmètre et critères d’acceptation.
3. Rédiger ou actualiser la spécification technique : fonctionnement, données nécessaires, sources disponibles, contraintes et impacts.
4. Définir la stratégie de développement : étapes, dépendances, tests, publication et possibilité de retour arrière.
5. Conserver ces documents dans le dépôt GitHub du projet avant de commencer les développements.
6. Réaliser les développements autorisés, puis exécuter les tests et corriger les anomalies.
7. Publier et qualifier la version, lorsque cela entre dans l’autorisation donnée.
8. Actualiser le suivi dans GitHub : travaux réalisés, résultats des tests, version publiée, limites et actions restantes.

À la création de tout dépôt GitHub, créer systématiquement un fichier AGENTS.md à sa racine. Ce fichier doit contenir la présente méthode obligatoire de gestion de projet et les consignes propres au projet. Le conserver à jour au fil des évolutions.

Une étape déjà documentée doit être vérifiée et actualisée plutôt que recréée. Toute information manquante ou tout blocage doit être consigné explicitement.

Lorsque Patrick dit « OK DEV », cela autorise l’exécution de cette méthode jusqu’à la livraison, dans le périmètre convenu. Ne pas demander une validation à chaque étape, sauf demande explicite de Patrick ou décision majeure indispensable.

Ne jamais annoncer comme réalisé un travail qui n’a pas été effectivement exécuté et vérifié.

## Organisation des dépôts WENARE

| Dépôt | Rôle |
| --- | --- |
| [P-123-wenare](https://github.com/timetogrowup/P-123-wenare) | Client public, données publiables, automatisations publiques et publication GitHub Pages. |
| [P-124-wenare-source](https://github.com/timetogrowup/P-124-wenare-source) | Sources privées, conception, qualification et suivi détaillé du projet. |
| [P-120-w-catalogue](https://github.com/timetogrowup/P-120-w-catalogue) | Catalogue des lieux et traitement de ses sources. |

Avant d'intervenir dans un dépôt associé, lire également son propre AGENTS.md et ses documents de suivi. Signaler explicitement tout fichier absent ou inaccessible.
Respecter la répartition existante entre sources privées et fichiers publiables. Ne pas publier de secrets ni de données privées dans ce dépôt public.

Conserver la conception détaillée et les décisions dans le dépôt source, selon l'organisation existante, et référencer ces documents depuis le suivi public lorsque cela est pertinent. Conserver les informations propres au catalogue dans son dépôt. Ne pas créer plusieurs documents contradictoires pour un même sujet.

## Reprise de l'existant

Avant tout développement :

- Examiner les branches, derniers commits, pull requests et exécutions GitHub Actions concernés.
- Lire le README, le suivi détaillé et les documents de conception de l'évolution.
- Identifier séparément la version développée, la version qualifiée et celle effectivement servie par GitHub Pages.
- Vérifier la dernière version fonctionnelle à partir des preuves disponibles ; ne pas figer cette référence sur un ancien numéro de client.
- Vérifier l'état réel des données et des services externes. Un ancien compte rendu ou reçu de publication ne prouve pas leur disponibilité actuelle.
- Préserver les travaux en cours et les points de restauration existants.

Points d'entrée utiles :

- [README de l'application](README.md).
- [README et références de conception du dépôt source](https://github.com/timetogrowup/P-124-wenare-source/blob/main/README.md).
- [Journal détaillé du dépôt source](https://github.com/timetogrowup/P-124-wenare-source/blob/main/MINUTE.md).
- [Suivi de la desserte des courses](docs/desserte-course/SUIVI.md).
- [Suivi du bandeau dans le dépôt source](https://github.com/timetogrowup/P-124-wenare-source/blob/main/docs/teleportation/SUIVI_BANDEAU.md).
- [Suivi des versions de production](docs/VERSIONS_PRODUCTION.md).
- [Journal des versions relevées](https://github.com/timetogrowup/P-123-wenare/blob/suivi-production/VERSIONS_PRODUCTION.json).

## Consignes fonctionnelles et données

- Respecter le besoin validé et ses critères d'acceptation ; consigner toute décision fonctionnelle nouvelle.
- Préserver la consultation à partir de la position réelle, les transports proches, les lieux habituels et le retour à la position et à l'heure actuelles.
- Distinguer clairement la position réelle de la téléportation et l'heure actuelle de l'heure projetée.
- Afficher des noms de lieux compréhensibles dans les messages de position.
- Respecter les identifiants, modes, sens, terminus et couleurs officielles des lignes.
- Ne pas inventer d'horaires, d'arrêts, de services ou de couverture absents des sources.
- Distinguer les horaires théoriques du temps réel ; n'annoncer le temps réel que s'il est effectivement disponible et vérifié.
- Contrôler la validité des horaires et rendre explicites les données expirées, indisponibles ou incomplètes.
- Documenter les sources, formats, dates de validité et impacts d'une évolution des données.

## Tests, publication et retour arrière

Adapter les vérifications au changement et utiliser les tests et workflows existants.

Pour une modification applicative, vérifier les comportements concernés, les non-régressions et, lorsque pertinent, les parcours Chromium et WebKit, l'affichage mobile, le défilement, les thèmes, le clavier et l'accessibilité. Une validation automatique ne constitue pas une recette physique sur Samsung S24.

Avant publication, identifier un point de restauration et documenter les fichiers, versions de données et étapes nécessaires au retour arrière. Préserver la cohérence du client, des schémas, des données, des ressources et du cache PWA. Lors d'une restauration, vérifier la validité des horaires et renouveler la version du cache selon le mécanisme existant.

Publier uniquement dans le périmètre autorisé. Vérifier ensuite les résultats GitHub Actions et la version effectivement servie à l'adresse [WENARE](https://timetogrowup.github.io/P-123-wenare/). Vérifier aussi les anciennes adresses si l'intervention touche aux accès ou aux redirections.

Respecter le mécanisme existant de relevé quotidien : un changement de fichier applicatif produit une nouvelle version ; l'absence de changement n'en produit pas. Un relevé en échec doit être traité comme un échec, et non comme une absence de changement.

## Suivi et compte rendu

Consigner dans GitHub :

- Le besoin couvert et les décisions prises.
- Les fichiers et dépôts modifiés, branches et commits.
- Les tests exécutés, leurs résultats et les liens vers les preuves.
- La version réellement publiée et le résultat des contrôles après publication.
- Le point et la procédure de retour arrière.
- Les limites, blocages et actions restantes, dont toute recette physique non réalisée.

Employer des états explicites : prévu, documenté, développé, testé, publié, vérifié ou bloqué. Ne pas confondre ces étapes.

## Création de ce fichier — 19 novembre 2026

**Besoin :** rendre la méthode de Patrick et les consignes WENARE directement accessibles aux intervenants dans le dépôt de l'application.

**Spécification :** fichier Markdown UTF-8 `AGENTS.md` à la racine, contenant la méthode complète, la signification de « OK DEV », les références des dépôts et les consignes propres au projet.

**Stratégie :** consulter l'existant, rédiger et enregistrer le fichier, puis relire son contenu depuis GitHub. Cette intervention est documentaire. Le retour arrière consiste à annuler le commit de création de ce fichier.

**Constat de reprise :** AGENTS.md absent des racines de P-123-wenare et P-124-wenare-source lors de la consultation. La création demandée ici concerne P-123-wenare.
