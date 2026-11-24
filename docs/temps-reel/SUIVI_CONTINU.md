# Temps réel continu — suivi public

24 novembre 2026. État : **client 52 publié et vérifié ; index quotidiens publiés ; affichage temps réel public désactivé**.

La conception, les décisions et les preuves privées sont conservées dans le [journal d'exécution du dépôt source](https://github.com/timetogrowup/P-124-wenare-source/blob/main/ETUDES/2026-11-24_TEMPS_REEL_EXECUTION_CONTINUE.md), avec besoins, spécification et stratégie. La maquette validée est conservée.

## D06/D07 livrés

La [PR n°15](https://github.com/timetogrowup/P-123-wenare/pull/15) a intégré le client 52 : ordonnanceur réseau distinct du tick visuel, cadence et 429 respectés, invalidation de configuration, garde de contexte et conservation des annulations. Contrat V3, 19 ressources racine/release-client synchronisées, cache 52. Les 19 empreintes des ressources servies ont été contrôlées après publication.

Les index factuels GTFS des lignes 6501 et RER A sont produits avec les horaires depuis la même archive vérifiée. Liaison stable versionnée, paquets immuables, limites de taille et conservation bornée des générations valides. Une indisponibilité d'index ne bloque pas la théorie valide. Le pipeline est qualifiable sur branche ; commit de données et Pages restent réservés à main.

## Qualification et publication constatées

- Chromium/WebKit ciblés : [45351758935](https://github.com/timetogrowup/P-123-wenare/actions/runs/45351758935), succès.
- Interfaces transport complètes : [45351758816](https://github.com/timetogrowup/P-123-wenare/actions/runs/45351758816), succès.
- Pipeline sur branche : [45351758989](https://github.com/timetogrowup/P-123-wenare/actions/runs/45351758989), succès, publication ignorée comme prévu.
- Pipeline main : [45353751817](https://github.com/timetogrowup/P-123-wenare/actions/runs/45353751817), terminé avec succès ; données 96fed4c.
- Génération publiée : 20261124T081458081087Z-b49e8447ed10, indexReady=true, activation=false ; 2 122 courses et 71 039 visites, validité 23 novembre 23:00 UTC au 27 novembre 23:00 UTC.
- L'index du jour a été chargé sur le serveur ; ce chargement n'accorde aucune couverture temps réel.

## Limites et suite

La configuration publique reste apiBase=null et realtime.enabled=false. Aucun backend, profil privé, secret ou relevé PRIM n'est publié ici. Le profil source et les observations réelles sont qualifiés dans le dépôt privé ; la correction R1 ne modifie pas le client public. G1 par flux, allocation réelle PRIM, recette physique Samsung S24 et pilote 48 h restent à acquérir. Les mesures mémoire au repos ne prouvent pas la capacité en charge.

Retour arrière du client : référence 51 de 29b87b6, cache à renouveler, configuration désactivée et horaires valides conservés. Ne jamais réinitialiser les quotas ou les annulations pour restaurer une version.

## Reprise du 24 novembre — vérification sans activation

Client 52 inchangé : les 19 ressources HTTP sont de nouveau conformes ; horaires et index de la génération publiée encore valides, configuration temps réel désactivée. Le renouvellement quotidien est configuré dans le pipeline public ; sa prochaine exécution reste à observer.

Les contrôles privés locaux ont réussi : 113 tests Node, 21 Python et démarrage des processus. Une simulation locale a mesuré la mutualisation et la désactivation, sans appel fournisseur ; elle ne prouve pas la capacité du serveur hébergé en charge. Le rejeu des preuves précédentes n'apporte aucune observation source nouvelle.

La campagne de qualification complémentaire n'a pas été exécutée, l'ouverture temporaire du contrôle serveur ayant été refusée par le contrôle automatique d'approbation. Aucun nouveau déploiement serveur, profil qualifié ou pilote activé. Allocation fournisseur, parcours réel complet, recette physique Samsung S24 et pilote de 48 heures restent à acquérir. Le détail et les preuves demeurent dans le dépôt privé.

## Campagne du 24 novembre et état de production

Le client 52 et ses 19 ressources ont été vérifiés sur le site publié. Les horaires et l’index ont la même génération, valable jusqu’au 28 novembre à 00 h 00 (Paris). Le contrôle serveur est refermé et les trois services V2 vérifiés renvoient REALTIME_DISABLED sans départ. Une direction atteint le seuil d’observations en recette privée. Le profil candidat, les observations et les preuves restent dans le dépôt privé. L’activation publique et le pilote de 48 h attendent le budget fournisseur et la qualification opérationnelle.

## Recette du 24 novembre avant le pilote

Une consultation opérateur limitée au bus 6501 de Reine Blanche vers Maison des Insectes a confirmé un passage en direct, rattaché à la visite correspondante de l’horaire publié. Le sens Saint-Germain-en-Laye et le service RER A vers Chessy sont restés fermés. La fenêtre est terminée. Le site public affiche toujours le client 52 en mode théorique.

Le renouvellement réel des horaires et de leur index sera vérifié sur la prochaine génération. L’essai physique sur Samsung S24 et le suivi de 48 h restent à effectuer. Le suivi de 48 h commencera après activation publique effective. Les détails du fournisseur et les preuves de recette sont conservés dans le projet privé.

## 24 novembre 2026 — client 53 publié

Chaque passage présente un chiffre dans un bloc vert. Le noir correspond à l’horaire officiel. Le rouge correspond à une estimation exploitable. Toucher le bloc ouvre les horaires précédent, sélectionné et suivant, et explique l’origine de la valeur. En projection, la consultation reste théorique.

Les 19 ressources publiées correspondent aux empreintes de la version. Fenêtre ouverte depuis l’application publique à Hôtel de Ville, ligne 1 vers Château de Vincennes. Les contrôles du client et les scénarios de navigateur Chromium et WebKit ont réussi ([exécution GitHub](https://github.com/timetogrowup/P-123-wenare/actions/runs/45388964130)). Le service public est en mode théorique. L’essai physique S24 du nouveau client et la vérification d’une nouvelle course après renouvellement précèdent l’ouverture du pilote 6501. Le suivi de 48 h débutera à l’activation effective.

## 24 novembre — affichage mobile, livraison 54

Le badge de ligne et les délais ont la même hauteur de 24 px. Les deux passages d’une direction restent côte à côte. Si la largeur intérieure est de 335 px ou moins, chaque direction dispose d’une rangée. Le contrôle de géométrie du client est passé sur Chromium et WebKit aux largeurs 320, 360, 390, 412 et 768 px ([exécution](https://github.com/timetogrowup/P-123-wenare/actions/runs/45397655383)). Les fichiers de mise en page de la livraison 54 sont servis sur GitHub Pages. Une nouvelle observation sur le téléphone de Patrick reste attendue.

Le 24 novembre, la disposition corrigée des badges et des délais a été validée sur Samsung S24. Le 24 novembre, Patrick confirme également avoir ouvert le bloc 20′ rouge et observé son retour au noir à l’expiration dans le rejeu privé. La recette physique du client 54 est close. Le contrôle de la nouvelle génération est programmé le 25 novembre à 10 h, heure de Paris.
