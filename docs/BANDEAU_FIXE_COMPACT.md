# Bandeau fixe et compact — client 47

19 novembre 2026.

Le bandeau principal et son trait inférieur restent visibles pendant le défilement. Sa disposition est plus compacte et laisse davantage de place aux résultats. Le mode téléportation utilise un fond sombre et des textes lumineux, avec le tremblement continu et le signal accessible existants.

Les messages de position ne présentent plus de coordonnées. Un repère proche est nommé lorsqu’il est fiable, sinon « Lieu non identifié ». Un point libre de la carte devient « Point sélectionné sur la carte ». Les anciens favoris restent utilisables.

Qualification source : https://github.com/timetogrowup/P-124-wenare-source/actions/runs/44586960447 — 25 tests ciblés, parcours RER A et bus 6501, six suites navigateur réussies sur Chromium et WebKit. Encombrement mesuré à 390 px : 180,2 → 128,5 px en GPS et 206,1 → 148 px en projection, marges comprises. Douze thèmes, zoom 200 %, défilement, focus et anciens favoris contrôlés.

Recette physique Samsung S24 à effectuer. Le suivi détaillé est conservé dans le dépôt source. Retour : branche rollback/bandeau-fixe-compact-20261119, avant client 47 ; renouveler la version de cache et conserver les horaires compatibles lors d’une restauration.
