# Temps réel continu — suivi public

24 novembre 2026. État : **client 56 publié, deux générations régionales vérifiées, estimations voyageurs fermées**.

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

## 24 novembre, point d’ouverture de 15 h (Paris)

La version 54 est publiée. Les 19 ressources du client et le renouvellement des horaires ont été vérifiés sur GitHub Pages. Sur le 6501 à Reine Blanche vers Maison des Insectes, cinq courses de la nouvelle génération ont pu être identifiées exactement. Au moment des deux consultations de recette, aucune estimation ne satisfaisait le critère de fraîcheur de moins de 120 secondes. L’application publique continue donc d’afficher les horaires officiels. Le pilote de 48 heures commencera uniquement après une vérification concluante. Un point en heure de pointe est programmé à 17 h aujourd’hui.

## Inventaire régional du 24 novembre 2026 à 15 h 30 (Paris)

Les données publiques de la génération `20261124T133205920626Z-b49e8447ed10` donnent les dénominateurs ci-dessous. Une desserte correspond à un arrêt, une ligne et une direction. La fenêtre de mesure régionale en exploitation n’a pas commencé. Le taux de passages visibles avec estimation fraîche est donc encore indéterminé pour chacun des modes.

| Mode | Lignes du catalogue | Avec desserte | Dessertes |
| --- | ---: | ---: | ---: |
| Métro | 16 | 16 | 940 |
| RER | 5 | 5 | 1594 |
| Bus | 2064 | 1869 | 88151 |
| Navette | 2 | 2 | 12 |
| Funiculaire | 1 | 1 | 2 |
| Train | 9 | 9 | 755 |
| TER | 11 | 10 | 218 |
| Tramway | 15 | 15 | 1086 |
| Câble | 1 | 1 | 8 |
| **Total** | **2 124** | **1 928** | **92 766** |

196 lignes seront réexaminées au renouvellement du catalogue (195 bus, un TER). Parmi les 1 928 lignes avec desserte, une dispose d’une référence directe archivée pour un trajet, le 6501. Les 1 927 autres attendent une preuve de rattachement et de fraîcheur. Les horaires officiels restent affichés pour chaque passage disponible.

### 24 novembre, 15 h 50 (Paris)

Le serveur de découverte régionale est en production. Il a répondu aux 416 décisions attendues lors de 13 consultations portant sur 32 dessertes des neuf modes, alors que le service public était fermé aux estimations. Le client public reste en version 54 à ce point.

Sur le bus 6502 à Poissy vers Les Ouches, quatre visites officiellement identifiées correspondaient à des annulations, avec des observations âgées de 826 à 3 577 secondes. Aucune estimation fraîche affichable. Sur les 2 124 lignes, 196 sont sans desserte dans la génération, 1 926 lignes avec desserte attendent une preuve directe de visite, une ligne (6502) dispose de cette preuve sans estimation exploitable et une ligne (6501) dispose aussi d’une estimation fraîche en recette antérieure. Le taux de couverture des consultations des voyageurs reste à mesurer après ouverture. Les fichiers d’horaires des bus 6502 et 6503, du RER B et du train J ont été vérifiés pour préparer cette qualification.

### 24 novembre, preuve de recette du RER B

À 15 h 57 min 19 s (Paris), à Gare du Nord vers Aéroport Charles de Gaulle 2, les quatre observations examinées sur le RER B correspondent à quatre visites distinctes de la génération du 24 novembre. L’âge des estimations à réception allait de 11,965 à 37,765 secondes. Le registre compte désormais 196 lignes sans desserte, 1 925 lignes avec desserte en attente d’une preuve directe, le bus 6502 avec une identité vérifiée et deux lignes avec une estimation fraîche vérifiée en recette (bus 6501 et RER B). Total : 2 124 lignes, 92 766 dessertes et neuf modes. Cette preuve RER porte sur un seul des 352 trajets arrêt–direction de la ligne. Les estimations voyageurs restent fermées et la période de mesure en exploitation n’a pas commencé. La version 54 continue de présenter les horaires officiels.

[Consulter le registre des 2 124 lignes de la génération du 24 novembre (CSV compressé)](./registre-lignes-20261124T133205920626Z.csv.gz). Chaque ligne indique le nombre de dessertes arrêt–direction, la preuve disponible, le motif du maintien aux horaires officiels et la condition de réexamen. Période de recette des références citées : 24 novembre 2026, jusqu’à 15 h 57 Paris. Aucune période d’exploitation ouverte pour les estimations à ce relevé.

### 24 novembre, essai de capacité à 16 h 24 (Paris)

Sur l’instance de production de 512 Mio, un processus de recette a traité des réponses synthétiques comportant 16 visites exactes. Parmi 32 demandes simultanées du même service, une demande amont simulée a suffi. Les 32 lectures suivantes ont utilisé le cache. Sur huit services distincts sollicités à la fois, quatre ont été servis et quatre ont reçu une réponse de limitation 429. Latence au 95e centile dans le traitement : 97,17 ms à froid, 25,63 ms en cache, 71,66 ms pour les huit services. Aucun appel fournisseur. Il s’agit d’un essai de capacité sur la machine existante ; la latence réseau des voyageurs et le taux de passages rouges en exploitation seront mesurés séparément.

### 24 novembre vers 16 h 45, heure de Paris — client régional 55

Le site public sert le cache v55 et la configuration de découverte à la demande. Les estimations voyageurs restent fermées. À Hôtel de Ville sur le métro 1 vers Château de Vincennes, le détail consulté indiquait 16 h 45, 16 h 47 et 16 h 50 pour les passages précédent, sélectionné et suivant. Le passage sélectionné affichait 2′ en noir avec son horaire officiel et la raison du repli. Ce contrôle opérateur est exclu des mesures voyageurs. L’inventaire comprend 2 124 lignes et 92 766 dessertes. La part des passages affichés en rouge en exploitation reste à mesurer après ouverture.

À 17 h 03 min 37 s–17 h 03 min 41 s Paris, un navigateur sur Pages a consulté neuf dessertes visibles en un seul POST. Neuf décisions conformes, HTTP 200, zéro lecture de départ. Le relevé serveur de 17 h 04 min 15 s totalise les mêmes neuf dessertes sur quatre lignes. La mesure de demande voyageurs commence après ce relevé, à 17 h 04 min 16 s (Europe/Paris). Exclure les futures fenêtres de recette identifiables. La demande compte des dessertes consultées, et le taux d’estimations affichées nécessite une période d’ouverture avec son propre dénominateur. [Contrôle sur Pages](https://github.com/timetogrowup/P-123-wenare/actions/runs/45432332734).


### 24 novembre, première période de demande régionale

Du 24 novembre 2026 à 17 h 04 min 16 s à 17 h 18 incluses (Paris), le journal applicatif de l’instance ne contient aucun agrégat de consultation régionale après la recette. Zéro desserte observée sur cet intervalle. Avec un dénominateur nul, le pourcentage de passages affichés en rouge est indéterminé. Les horaires officiels restent disponibles. Le [statut du premier paquet régional](../../distribution/realtime-identities-regional/status.json) a été vérifié sur Pages pour le 6501, le RER A et le RER B ; il indique que l’index est disponible et que l’activation est fermée. Quatre visites du RER B ont été retrouvées lors d’un rejeu isolé sur cette génération publiée.

### 24 novembre 2026, contrôle de distribution à 18 h 21 (Paris)

Le [registre par ligne](../../distribution/realtime-coverage/lignes.csv.gz) et son [manifeste par mode](../../distribution/realtime-coverage/manifest.json) ont été téléchargés depuis Pages. Chaque ligne dispose d'un état de preuve et d'une condition de réexamen. Les totaux du CSV concordent avec ceux du manifeste pour la génération 20261124T162752772358Z-b49e8447ed10.

| Mode | Lignes | Avec desserte | Combinaisons ligne–arrêt–direction |
|---|---:|---:|---:|
| Bus | 2 064 | 1 869 | 88 151 |
| Navette | 2 | 2 | 12 |
| Métro | 16 | 16 | 940 |
| Funiculaire | 1 | 1 | 2 |
| Tramway | 15 | 15 | 1 086 |
| RER | 5 | 5 | 1 594 |
| Train | 9 | 9 | 755 |
| TER | 11 | 10 | 218 |
| Câble | 1 | 1 | 8 |
| **Total** | **2 124** | **1 928** | **92 766** |

Les deux générations du [statut régional](../../distribution/realtime-identities-regional/status.json) ont chacune trois index vérifiés. Ces effectifs décrivent les horaires publiés. Les estimations voyageurs restent fermées. Le taux de passages affichés en rouge reste indéterminé pour la période de demande indiquée ci-dessus.
