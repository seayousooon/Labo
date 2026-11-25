# Déploiement avec Workers Builds

Le Worker `labo-outils` est relié au dépôt `seayousooon/Labo`.

- Branche de production : `main`.
- Répertoire racine : `worker`.
- Commande de build : `npm ci && npm run check`.
- Commande de déploiement : `npx wrangler deploy`.
- Builds des branches d’aperçu : désactivés.
- Liaison R2 : `OUTILS`, compartiment `labo-outils`, juridiction `eu`.

`npm run check` vérifie la compilation sans déployer ; cette commande ne remplace pas des tests de non-régression.

Après chaque modification de main, vérifier dans Cloudflare le résultat du build et son identifiant de commit. Relancer un ancien build peut redéployer son ancien commit.
