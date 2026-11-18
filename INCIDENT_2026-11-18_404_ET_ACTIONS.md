# Incident WENARE du 18 novembre 2026
## Signalement et diagnostic
Patrick signale un HTTP 404 à l'ouverture et des notifications d'échecs GitHub Actions.
- Ancienne adresse https://timetogrowup.github.io/WENARE/ : HTTP 404 confirmé.
- Adresse actuelle https://timetogrowup.github.io/P-123-wenare/ : HTTP 200 confirmé (index, service worker et trois manifestes).
- Le renommage du dépôt public en P-123-wenare a changé le chemin GitHub Pages sans redirection.
- Pages 44321733828 a réussi à 15 h 13, heure de Paris. Le problème d'accès ne provient pas d'un échec de ce déploiement.
- Surveillance 44376314242 ignorée : garde github.repository encore sur l'ancien nom. Les publications de données et d'opportunités omettaient aussi leurs étapes de publication/reconstruction conditionnées à cet ancien nom.
- Manifestes transport servis : referenceDate 2026-11-18, validFromUtc 2026-11-17T23:00:00+00:00, validUntilUtc 2026-11-21T23:00:00+00:00. Ne jamais prolonger ces dates sans données GTFS.

## Interventions de cette session
1. Lecture des deux dépôts, derniers workflows, jobs et journaux ; aucun traitement sain annulé.
2. Ouverture du suivi privé : https://github.com/timetogrowup/P-124-wenare-source/issues/4.
3. Tentative de restauration du nom technique WENARE dans les paramètres GitHub : refusée par le contrôle automatique d'autorisation avant application. Le motif est l'impact sur les URL et intégrations sans autorisation explicite de cette opération. Le dépôt reste P-123-wenare. Aucun contournement. Restauration de l'ancienne URL en attente de décision de Patrick.
4. Solution applicable à l'adresse actuelle : conditions des workflows et URL du contrôle HTTPS adaptées à P-123-wenare, dans les deux dépôts. Les gardes du privé sont conservées : il ne publie pas les données publiques.
5. Échec privé opportunités 44325977096 : test tests/test_nearby.cjs utilisant les dates des données versionnées pour l'horloge serveur mais l'horloge réelle pour le repli hors connexion ; les données privées sont anciennes. Correction du test : Date.now fixé au même instant valide du jeu d'essai et restauré dans finally. Aucun contournement de la validation d'expiration dans l'application.
6. Échec privé géographique 44319064872 : Chromium passe, WebKit échoue au démarrage (libicudata.so.74 absente), avant toute publication. Workflow fixé sur Ubuntu 24.04 et clé de cache Playwright spécifique à cette image. Opportunités privé également fixé sur Ubuntu 24.04.
7. Échec privé Verification V1 43944988488 : contrôle de fraîcheur des anciennes données versionnées. Le contrôle n'est pas désactivé. La régénération qualifiée du référentiel doit mettre à jour ces données avant validation finale.
8. Vérification locale : sept tests Python de surveillance/résilience réussis ; contrôles Node des seuils, cache hors ligne et états de l'interface réussis ; syntaxe des sept workflows YAML modifiés valide.
9. Publication des corrections sur main pour déclencher la surveillance et les qualifications. Les statuts finaux seront consignés après observation.

## Limites et suites
- L'ancienne URL /WENARE/ et les installations PWA qui la ciblent restent concernées par le 404 tant qu'une restauration de cette origine n'est pas autorisée.
- L'adresse actuelle est utilisable. La vérification fonctionnelle et les nouvelles exécutions doivent être observées avant clôture.
- Le contrôle approfondi HTTPS vérifie des fichiers échantillonnés avec leurs empreintes ; il ne constitue pas un contrôle exhaustif de toutes les lignes.
- Aucun changement PRIM/Render, secret, autorisation GPS ou règle métier. Aucun contact support.
