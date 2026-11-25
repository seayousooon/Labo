# Vérifications avant Cloudflare Access

Sur le Worker labo-outils :
- GET /api/etat renvoie {"ecriture":false,"edition":"/edition/outils.html"}.
- GET /api/fiches lit réellement OUTILS avec le préfixe fiches/ (20 objets par page, curseur next si nécessaire). Un bucket vide renvoie {"fiches":{}} ; un bucket existant renvoie les champs publics des fiches.
- GET /edition/outils.html affiche les fiches en lecture seule, avec la mention « Modification désactivée » et les boutons d’écriture désactivés.

Ces routes ne donnent aucun droit d’écriture. La page reste volontairement en lecture seule jusqu’à une future intégration Access avec validation côté serveur. Les protections GitHub et Turnstile des routes existantes sont conservées. Une simple présence d’en-tête Access ne constitue pas une preuve d’identité.

La lecture exclut les contacts, commentaires, e-mails et champs personnalisés. L’absence de liaison ou une panne R2 produit une erreur 503, jamais un succès vide trompeur. Les méthodes autres que GET sur ces trois adresses sont refusées avec 405.

npm test exécute les tests de ces routes avec un stockage simulé. npm run check exécute ces tests puis la compilation Wrangler sans déployer. Ces tests ne remplacent pas les trois contrôles en production après fusion et déploiement.

Attention : la proposition D1 en attente utilisant aussi /api/fiches devra être conciliée avec ce contrat R2 avant fusion ; cette modification ne l’intègre pas.
