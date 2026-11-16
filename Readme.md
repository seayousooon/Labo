# Labo

Bac à sable

Une page web en français pour imaginer, créer et expérimenter, adaptée aux mobiles et prête pour GitHub Pages.

## Fichiers

- `index.html` : page d’accueil avec styles intégrés, sans dépendance ni compilation.
- `Readme.md` : présentation et instructions.
- `.nojekyll` : désactive le traitement Jekyll.

## Utilisation

Ouvrir `index.html` dans un navigateur. Modifier ce fichier pour personnaliser les textes et les couleurs.

## Publication avec GitHub Pages

1. Ouvrir https://github.com/seayousooon/Labo/settings/pages
2. Dans **Build and deployment**, choisir **Deploy from a branch**.
3. Sélectionner **main**, puis **/(root)**.
4. Cliquer sur **Save** et attendre la fin du déploiement.

Adresse prévue après activation : https://seayousooon.github.io/Labo/

Les modifications de la branche publiée seront déployées automatiquement par GitHub Pages.

## Catalogue des outils

Page avec édition et commentaires : https://labo-outils.allonsalaplage.workers.dev/outils.html

### Réglages

| Emplacement | Noms et rôle |
| --- | --- |
| Cloudflare Workers, `labo-outils` | `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` pour la connexion GitHub. |
| Cloudflare Workers, `labo-outils` | `TURNSTILE_SITE_KEY` (clé publique) et `TURNSTILE_SECRET_KEY` (secret d’exécution) pour la validation des écritures. `TURNSTILE_ACTION` et `TURNSTILE_HOSTNAME` paramètrent cette vérification. |
| Cloudflare Workers, `labo-outils` | `ALLOWED_ORIGIN` configure l’origine supplémentaire autorisée. La liaison R2 `DATA` pointe vers le compartiment `labo-outils`. |
| Cloudflare R2, `labo-outils` | Fiches sous `fiches/<outilId>.json` et commentaires sous `commentaires/<outilId>/<commentId>.json`. |
| GitHub Actions | Le déploiement manuel sur `main` lit le secret `CLOUDFLARE_API_TOKEN` et la variable `CLOUDFLARE_ACCOUNT_ID`. Cloudflare émet le jeton. |

### Reproduire les tests

1. Sur la page du Worker, connectez-vous avec le compte GitHub autorisé. Modifiez une fiche de test, y compris son URL, puis rechargez. Vérifiez la persistance, l’identifiant stable et l’absence de changement sur une deuxième fiche.
2. Ajoutez deux commentaires distincts sur la fiche de test. Rechargez et vérifiez dans R2 qu’ils occupent deux objets distincts et que les commentaires précédents sont toujours là.
3. Soumettez directement à l’API un changement avec une URL invalide ou un nom vide (`PUT /api/outils/<outilId>`), puis un commentaire vide (`POST /api/outils/<outilId>/commentaires`). Vérifiez dans le panneau Réseau que le Worker renvoie `400` et contrôlez les objets R2.
4. Rejouez une requête de modification sans session et vérifiez que le Worker renvoie `401` ou `403`. Contrôlez la fiche dans R2.
5. Ouvrez la même fiche dans deux onglets avant d’enregistrer. Enregistrez le premier changement, puis soumettez l’ancien formulaire dans le second onglet. Attendez le message « La fiche a changé » et vérifiez dans R2 que la première modification est conservée.
6. Conservez les preuves sans données personnelles, puis supprimez les commentaires de test identifiés et restaurez les valeurs de test de la fiche. Vérifiez ensuite l’onglet Mesures du compartiment R2.

Les vérifications automatisées sont définies dans `.github/workflows/worker.yml`. En local, depuis `worker/`, lancez `npm ci` puis `npm run check`.
