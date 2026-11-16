# WENARE — Note d'étude concurrentielle
**Date :** 16 novembre 2026  
**Objet :** Applications proches de la raison d'être de WENARE et opportunités de différenciation  
**Statut :** note de veille et d'orientation stratégique — hypothèses à tester, non décisions produit  
**Périmètre :** expérience de découverte géolocalisée, transports proches, services, lieux, événements, exploration d'une autre position.

## 1. Synthèse exécutive

**Raison d'être de WENARE : « Je suis à un endroit, qu'est-ce qui s'offre à moi ? »**

Le besoin existe et il est déjà servi, en partie ou largement, par des applications installées : Google Maps, Paris je t'aime, Paris ma Ville, AroundMe, Where To? / Où Trouver ?, Transit, Moovit, Île-de-France Mobilités, À Deux Pas, Mapstr, Fever et Spotted by Locals.

La différenciation de WENARE **ne peut pas reposer sur la seule géolocalisation, ni sur la seule recherche à proximité, ni sur les départs de transports sans destination** : ces fonctions existent ailleurs. La piste à éprouver est une expérience plus immédiatement exploitable et transversale, réunissant **« où suis-je ? », « que puis-je faire ici ? », « dans quel délai ? » et « comment y accéder ? »**, sans exiger d'intention prédéfinie.

**Point de vigilance :** il est incorrect de présenter l'agrégation de services de WENARE comme entièrement future. Le dépôt contient déjà un module d'opportunités géolocalisées, neuf domaines hors transport, une carte et des données ouvertes. Le manque éventuel porte sur la couverture, la fiabilité, l'ergonomie, la fraîcheur et la preuve de valeur face aux concurrents, à mesurer.

## 2. État WENARE vérifié dans le dépôt

Selon les documents projet consultés le 16/11/2026 :

- **Transports :** recherche des points et départs proches ; gestion des lignes et directions ; couverture documentée de plusieurs modes IDFM ; **horaires théoriques**, pas une promesse générale de temps réel. Le suivi embarqué est limité au métro dans le README.
- **Opportunités :** neuf domaines ajoutés aux transports : manger, sorties, découverte, besoins immédiats, sport, commerces/services, lieux où se poser, hébergement, pharmacies. Les résultats sont sourcés mais **ne garantissent pas une disponibilité réelle**.
- **Rayon / proximité :** rayons et filtrage géographique ; détail de lieux ; carte interactive et accès au guidage piéton.
- **Données :** DATAtourisme Île-de-France, OpenStreetMap, sources de la Ville de Paris / Eau de Paris ; règles documentées de licences, de dates, d'expiration et d'actualisation.
- **Événements et horaires :** les fiches indiquent les limites des sources ; aucune heure de séance n'est inventée quand la source ne la fournit pas.
- **Limites de validation :** des tests automatisés sont décrits ; ils ne constituent pas une comparaison terrain avec des applications concurrentes ni une recette GPS physique universelle.

Références internes :
- [README — application et transports](https://github.com/timetogrowup/WENARE/blob/main/README.md)
- [README_OPPORTUNITES — neuf domaines et sources](https://github.com/timetogrowup/WENARE/blob/main/README_OPPORTUNITES.md)
- [CARTE_LIEUX — carte et parcours utilisateur](https://github.com/timetogrowup/WENARE/blob/main/CARTE_LIEUX.md)

## 3. Panorama des concurrents et applications comparables

Échelles qualitatives : **très forte** = approche proche du cœur WENARE ; **forte** = recouvrement d'un pan important ; **moyenne** = spécialiste ou usage adjacent. Ce classement est une appréciation documentaire, **pas un benchmark produit testé**.

| Application | Proximité de la vision WENARE | Forces identifiées | Point à examiner pour WENARE |
|---|---|---|---|
| **Google Maps** | Très forte | « Explorer », lieux, catégories, recommandations dépendant de la position et parfois du moment | Distinguer l'expérience WENARE de l'étendue des données Google |
| **Paris je t'aime** | Très forte | Points d'intérêt, services, événements, carte géolocalisée, filtres, parfois réservation | Concurrent transversal particulièrement direct sur Paris |
| **AroundMe** | Très forte | Démarrage rapide par catégorie, services proches et distance | Vitesse d'accès à un besoin immédiat |
| **Where To? / Où Trouver ?** | Très forte | Catégories, distance, carte, réalité augmentée, détails et navigation | Clarté de découverte multi-catégories |
| **Transit** | Forte | Lignes proches et prochains départs depuis l'écran initial ; changement de sens | Qualité UX des transports sans destination |
| **Moovit** | Forte | Carte des stations proches, prochains passages et exploration d'une autre zone | La « téléportation » transport n'est pas un concept exclusif |
| **Île-de-France Mobilités** | Forte | Fonctionnalité « autour de moi » transport en IDF, gares/arrêts et mobilités | Concurrence locale et source de référence transports |
| **Paris ma Ville** | Très forte sur Paris | Carte des services et équipements, loisirs de proximité, horaires et événements | Offre transverse de proximité pour les habitants, pas seulement les touristes |
| **À Deux Pas — Paris Events** | Forte | Activités qui commencent bientôt, distance, horaire, choix d'adresse et hors ligne | L'axe « maintenant / près de moi » est déjà explicitement exploité |
| **Mapstr** | Moyenne | Carte personnelle, favoris, recommandations et alertes de proximité | Personnalisation et redécouverte des favoris |
| **Fever** | Moyenne | Événements et expériences, filtres dates, billetterie, recommandations | Conversion de la découverte en réservation |
| **Spotted by Locals** | Moyenne | Lieux et bonnes adresses sélectionnés par des habitants | Qualité éditoriale et caractère singulier des propositions |

### Notes sur les cinq références de tête

**Google Maps.** Le plus important concurrent de substitution au quotidien : volumétrie des lieux, ergonomie de carte, informations pratiques, notes et exploration. L'opportunité WENARE doit être démontrée en termes de simplicité et de pertinence contextuelle, pas en promesse de catalogue plus exhaustif.

**Paris je t'aime.** L'un des concurrents **les plus proches du concept transversal** : carte interactive, filtres multiples, tourisme, services, agenda et activités. Attention à ne pas le réduire à une simple application touristique statique ; sa couverture et ses fonctions sont significatives.

**Paris ma Ville.** Concurrent public à suivre de près : lieux utiles (eau, toilettes, équipements sportifs, services), événements et proximité. Il recouvre plusieurs domaines du catalogue WENARE, sur un périmètre parisien.

**Transit.** Référence de l'expérience « ouvrir et voir ce qui passe autour de moi ». Le produit WENARE doit rechercher une qualité comparable d'affichage des directions, compte à rebours et hiérarchie de lecture, sans présenter ses horaires théoriques comme du temps réel.

**À Deux Pas.** Concurrence très intéressante pour la dimension temporelle. Le fait d'afficher des activités qui commencent bientôt avec une distance et un horaire correspond précisément à un usage envisagé pour WENARE.

## 4. Où se situe l'espace de différenciation possible ?

Il s'agit d'**hypothèses à valider**, et non d'avantages démontrés :

1. **Découverte avant recherche.** Ouvrir l'application et recevoir des possibilités utiles, même sans saisir une destination ou une catégorie.
2. **Interface transversale.** Transports, lieux utiles et sorties partagent un même moteur de proximité et un même rayon ; un usage de type « quoi faire / quoi utiliser ici ? ».
3. **Temporalité honnête.** Afficher une disponibilité « maintenant » uniquement si elle est réellement étayée ; distinguer les prochains départs théoriques, les plages horaires connues et l'absence de données.
4. **Exploration d'une autre position (« téléportation »).** Choisir un autre point pour explorer **toutes les catégories**, pas seulement les arrêts de transport. Les concurrents savent déjà consulter d'autres lieux ; c'est l'unification de l'expérience qui reste à vérifier.
5. **Faible friction.** Découverte accessible sans créer de compte, avec choix GPS ou lieu manuel, filtres simples et affichage lisible.
6. **Données ouvertes et provenance.** L'utilisateur doit comprendre la source, la date de mise à jour et le niveau de certitude des fiches.

**Risque principal :** une promesse « universelle » peut se traduire par une interface trop dense et des données incomplètes. La pertinence du premier écran, la confiance dans la disponibilité et le passage à l'action priment sur le nombre brut de catégories.

## 5. Priorisation des expériences concurrentielles à examiner

| Priorité | Application | Pourquoi un test terrain ? |
|---|---|---|
| P0 | Google Maps | Référence de substitution ; explorer lieux et catégories sans destination |
| P0 | Paris je t'aime | Concurrent transversal direct sur une partie importante de l'IDF |
| P0 | Paris ma Ville | Équipements et services publics de proximité, événements |
| P0 | Transit | Départs proches, directions, lisibilité temporelle |
| P0 | À Deux Pas | Filtre temporel « maintenant / bientôt », position manuelle |
| P1 | AroundMe | Simplicité d'accès par catégorie |
| P1 | Moovit | Consultation autour d'une autre localisation |
| P1 | Où Trouver ? | Exploration multi-catégories, ergonomie |
| P2 | Mapstr / Fever / Spotted by Locals | Personnalisation, conversion et curation |

## 6. Protocole de benchmark terrain proposé

**Deux points tests :** La Défense et Saint-Germain-en-Laye, Île-de-France.  
**Rayons :** 250 m et 500 m lorsque paramétrables ; sinon noter la limite applicative.  
**Conditions :** mêmes jours et créneaux, même appareil ou comparabilité documentée, GPS autorisé puis test de recherche manuelle.  
**Parcours à reproduire :**

1. Ouvrir l'application sans chercher de destination : voir les possibilités les plus proches.
2. Trouver le prochain départ d'une ligne dans chaque sens et comprendre la nature (théorique/temps réel) de l'information.
3. Trouver une pharmacie, une bibliothèque, un distributeur ou des toilettes publiques et vérifier la qualité des données.
4. Trouver une sortie ou activité accessible **maintenant / bientôt**, avec preuve d'horaire si elle existe.
5. Changer de point géographique sans s'y déplacer et refaire les parcours (téléportation).
6. Ouvrir une fiche, vérifier source/horaire, puis accéder au guidage.

**Mesures recommandées :** nombre d'actions, temps pour la première réponse utile, catégories effectivement couvertes, taux de fiches complètes, clarté des limitations, présence ou non de données temporelles vérifiables, effort de changement de zone, erreurs/vides, mode hors connexion, accessibilité et confidentialité. Les mesures et captures doivent être datées et reproductibles.

**Livrable attendu :** tableau de résultats par application et parcours, captures autorisées, irritants UX et recommandations priorisées selon valeur utilisateur / coût / risque. Aucun avantage chiffré WENARE n'est attribué avant la campagne de tests.

## 7. Recommandations pour la feuille de route WENARE

- **P0 — Qualité de l'accueil** : démontrer que le premier écran répond en quelques gestes à « qu'est-ce qui s'offre à moi ? » ; mesurer, ne pas présumer.
- **P0 — Fiabilité** : rendre explicites fraîcheur, source, limites de couverture et absence de confirmation d'ouverture / séance / temps réel.
- **P0 — Cohérence des catégories** : un rayon, des listes et une carte synchronisés, avec un niveau de détail stable par domaine.
- **P1 — Téléportation transverse** : cadrer et prototyper la recherche autour d'un point arbitraire, puis comparer aux parcours des concurrents.
- **P1 — Contexte temporel** : étudier une couche « maintenant / bientôt » uniquement sur données compatibles.
- **P2 — Personnalisation et activation** : favoris, suggestions, événements, guidage, réservation/partenaire selon données et droits.
- **P2 — Modèle économique** : explorer publicité, affiliation et partenariats dans une étude séparée ; la veille concurrentielle seule ne valide aucune recette.

**Décision proposée :** lancer un benchmark P0 factuel et consigner les résultats avant de choisir des développements. Ne pas considérer la téléportation ou la découverte autour de soi comme des inventions exclusives de WENARE.

## 8. Sources publiques consultées le 16 novembre 2026

Sources prioritaires officielles, éditeurs ou fiches de distribution ; les fonctionnalités peuvent évoluer :

1. Google Maps — [Aide officielle, onglet Explorer](https://support.google.com/maps/answer/10014587)
2. Paris je t'aime — [App géolocalisée](https://parisjetaime.com/article/myparisjetaime-a1679)
3. Paris je t'aime — [Applications utiles à Paris](https://parisjetaime.com/article/applications-utiles-a-paris-a658)
4. Paris ma Ville — [Présentation officielle](https://www.paris.fr/pages/paris-ma-ville-l-application-qui-vous-simplifie-la-ville-31976)
5. Transit — [Guide officiel d'utilisation](https://help.transitapp.com/article/93-how-to-use-transit)
6. Moovit — [Stations et options autour de soi](https://support.moovitapp.com/hc/en-us/articles/211393049-On-the-Map-See-all-options-around-you)
7. Île-de-France Mobilités — [Fonction « autour de moi »](https://www.iledefrance-mobilites.fr/actualites/evolution-application-vianavigo-octobre-2020) (source historique, à revalider sur la version actuelle)
8. AroundMe — [Fiche App Store](https://apps.apple.com/fr/app/aroundme/id290051590)
9. Where To? / Où Trouver ? — [Éditeur FutureTap](https://www.futuretap.com/fr/apps/whereto)
10. À Deux Pas — [Fiche Google Play](https://play.google.com/store/apps/details?id=com.jackofalltrades.adeuxpas)
11. Mapstr — [Site officiel](https://mapstr.com/)
12. Fever — [Site officiel](https://feverup.com/en)
13. Spotted by Locals — [Application officielle](https://www.spottedbylocals.com/app/)
14. Île-de-France Mobilités PRIM — [Périmètre des données temps réel](https://prim.iledefrance-mobilites.fr/fr/jeux-de-donnees/perimetre-des-donnees-tr-disponibles-plateforme-idfm)

## 9. Conclusion

WENARE opère dans un marché dense. **La concurrence la plus forte n'est pas forcément une application identique, mais la combinaison des habitudes Google Maps, applications de mobilité et agendas d'événements.**

Le projet dispose déjà d'une base transverse vérifiable dans son dépôt. La prochaine question n'est donc pas « l'idée existe-t-elle ? », mais **« WENARE permet-il, plus simplement et plus fiablement, de découvrir puis d'utiliser ce qui est possible autour de soi ou d'un autre lieu ? »**. Seuls des tests comparatifs permettront de le démontrer.

---
*Rédaction : note issue de la veille du 16/11/2026, enrichie d'une vérification des documents actuels du dépôt WENARE. Aucun test terrain ni mesure de performance concurrentielle n'a été réalisé pour cette note.*
