# WENARE — temps réel transport

## Besoin et réalisation

L’horaire théorique reste affiché à côté d’un rectangle de dimensions constantes. Le rectangle contient l’estimation exploitable en vert, ou reste vide et vert pâle. À moins de cinq minutes, une seule animation : le théorique sans estimation valide, le rectangle avec une estimation valide. Les informations périmées reviennent automatiquement au repli théorique ; les préférences de réduction des animations sont respectées.

Conception et suivi détaillés conservés dans le [dépôt source](https://github.com/timetogrowup/P-124-wenare-source/blob/main/ETUDES/2026-11-23_TEMPS_REEL_SUIVI.md).

## Stratégie de livraison

Recette isolée sur recette/temps-reel avant intégration dans main. Les exemples sont fictifs et les contrôles navigateur n’appellent pas PRIM. Le registre serveur, les secrets et les données privées ne sont pas copiés ici. Le client V3 contient 19 ressources cohérentes avec leurs versions préparées pour l’actualisation des horaires.

La hauteur des lignes de synthèse suit le contenu afin de laisser voir entièrement les rectangles, y compris les passages suivants. Contrôles à 320/390/768 px, Chromium et WebKit, non-régression des sens et des parcours existants.

## État

Client développé ; dernière correction de visibilité en cours de recette. Aucun nouveau client principal déclaré publié au présent point. Configuration conservatrice : apiBase=null, realtime.enabled=false. La disponibilité d’un serveur ou d’estimations fournisseur ne prouve pas leur rattachement exact aux courses théoriques.

L’application conserve les horaires théoriques tant que cette qualification n’est pas acquise. La [maquette](https://timetogrowup.github.io/P-123-wenare/maquettes/temps-reel/) utilise des situations fictives explicitement annoncées.

## Retour arrière

Point de restauration avant intégration : 96841b0638faf5af3305f3ba59acd28ce60f5361. Restaurer les ressources applicatives cohérentes et les ressources préparées, renouveler le cache PWA ; conserver les données horaires publiées encore valides. Vérifier les horaires, les ressources servies et le comportement hors connexion après toute restauration.
