# WENARE — temps réel transport

## Besoin et réalisation

L’horaire théorique reste affiché à côté d’un rectangle de dimensions constantes. Le rectangle contient l’estimation exploitable en vert, ou reste vide et vert pâle. À moins de cinq minutes, une seule animation : le théorique sans estimation valide, le rectangle avec une estimation valide. Les informations périmées reviennent automatiquement au repli théorique ; les préférences de réduction des animations sont respectées.

Conception et suivi détaillés conservés dans le [dépôt source](https://github.com/timetogrowup/P-124-wenare-source/blob/main/ETUDES/2026-11-23_TEMPS_REEL_SUIVI.md).

## Stratégie de livraison

Recette isolée sur recette/temps-reel avant intégration dans main. Les exemples sont fictifs et les contrôles navigateur n’appellent pas PRIM. Le registre serveur, les secrets et les données privées ne sont pas copiés ici. Le client V3 contient 19 ressources cohérentes avec leurs versions préparées pour l’actualisation des horaires.

La hauteur des lignes de synthèse suit le contenu afin de laisser voir entièrement les rectangles, y compris les passages suivants. Contrôles à 320/390/768 px, Chromium et WebKit, non-régression des sens et des parcours existants.

## État

**Interface client 51 publiée et vérifiée.** Introduction par le commit 615f9810e0cec7905b11e8de60219698af167197 ; Pages et comparaison HTTPS des 19 ressources réussis. Configuration conservatrice : apiBase=null, realtime.enabled=false. La disponibilité d’un serveur ou d’estimations fournisseur ne prouve pas leur rattachement exact aux courses théoriques.

L’application conserve les horaires théoriques tant que cette qualification n’est pas acquise. La [maquette](https://timetogrowup.github.io/P-123-wenare/maquettes/temps-reel/) utilise des situations fictives explicitement annoncées.

## Retour arrière

Point de restauration avant intégration : 96841b0638faf5af3305f3ba59acd28ce60f5361. Restaurer les ressources applicatives cohérentes et les ressources préparées, renouveler le cache PWA ; conserver les données horaires publiées encore valides. Vérifier les horaires, les ressources servies et le comportement hors connexion après toute restauration.

## Qualification de livraison

[Recette dédiée Chromium/WebKit](https://github.com/timetogrowup/P-123-wenare/actions/runs/45282691487), [interfaces générales](https://github.com/timetogrowup/P-123-wenare/actions/runs/45282691451) et [publication Pages](https://github.com/timetogrowup/P-123-wenare/actions/runs/45284095163) réussies. Les transitions sur fixtures, les rectangles entièrement visibles à 320/390/768 px, la conservation du DOM et les parcours existants ont été contrôlés. Une régression de contexte lors du changement de catégorie a été corrigée avant fusion : les contrôles/rayons sont publiés même lorsque les cartes transport ne changent pas. Les captures de la recette dédiée sont conservées dans son exécution.

Les ressources racine et préparées du contrat V3 sont synchronisées ; le workflow d’actualisation des horaires inclut leurs six ressources supplémentaires dans le commit atomique. La publication des données horaires conserve ainsi le client qualifié.

**Le temps réel n’est pas encore activé dans l’application.** Des identités de visites ont été vérifiées côté serveur, mais la fraîcheur et les sémantiques des estimations, ainsi que le rattachement continu des nouvelles courses et générations, restent à qualifier. Les données planifiées ou périmées ne remplissent pas le rectangle. Aucun essai physique Samsung S24 ni couverture générale des lignes n’est revendiqué.

Cette mise à jour du suivi décrit le même client 51 ; elle ne crée pas une nouvelle version applicative. Le mécanisme existant de relevé quotidien des versions est conservé.
