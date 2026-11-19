# Suivi des versions de production

Le [journal des versions](https://github.com/timetogrowup/P-123-wenare/blob/suivi-production/VERSIONS_PRODUCTION.json) est mis à jour par GitHub Actions une fois par jour. Un relevé manuel est également possible depuis Actions.

Le relevé part d'un déploiement Pages réussi sur main et compare les fichiers témoins avec le site servi en ligne. Il inventorie les ressources web à la racine, la notice de confidentialité, distribution et vendor. Les scripts de développement, tests, versions préparées dans release-client et documents hors application sont exclus. Les services externes restent hors inventaire.

Un seul chemin ajouté, retiré ou modifié suffit à produire une version. Chaque version référence un commit et un tag Git qui conservent les fichiers, ainsi qu'un inventaire avec une empreinte Git par fichier. Un changement d'horaire compte également. Si les fichiers sont identiques, le journal et les tags restent inchangés. Un relevé en échec n'est jamais assimilé à une absence de changement.

Pour un retour arrière, consulter l'inventaire et le tag, restaurer les fichiers pertinents dans un nouveau commit, et vérifier la compatibilité et la date de validité des horaires avant de republier. Le relevé quotidien ne retient que la version observée lors du passage, même si plusieurs déploiements ont eu lieu depuis la veille.
