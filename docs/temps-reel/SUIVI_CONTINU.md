# Temps réel continu — suivi public candidat

24 novembre 2026. Référence publiée à la reprise : client 51, temps réel public désactivé.

Conception et autorisation OK DEV conservées dans le dépôt privé : [journal d'exécution](https://github.com/timetogrowup/P-124-wenare-source/blob/feature/temps-reel-continu/ETUDES/2026-11-24_TEMPS_REEL_EXECUTION_CONTINUE.md), spécification et stratégie associées. Maquette validée, aucune modification visuelle prévue.

Lot D06/D07 prévu sur cette branche : ordonnanceur distinct du tick visuel, configuration revalidée, cadence et erreurs 429 respectées, annulations conservées, index GTFS factuels produits avec les horaires. Une indisponibilité d'index ne bloque pas la théorie valide. Seuls producteur, tests synthétiques et index redistribuables sont publiables ; aucun backend, profil privé, secret ou preuve PRIM ici.

Qualification prévue : tests unitaires, Chromium/WebKit puis pipeline complet sur branche, sans commit de données ni publication Pages hors main. Les ressources racine/release-client/manifeste/cache sont synchronisées avant publication. Retour arrière : client 51 de 29b87b6 comme référence, cache à renouveler, configuration désactivée et horaires valides conservés.

État : documenté, développement et qualification en cours. Indexation ne vaut pas couverture temps réel. G1, quotas réels, profilage Render, recette physique et pilote ne sont pas acquis.
