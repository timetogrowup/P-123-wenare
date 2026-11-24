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
