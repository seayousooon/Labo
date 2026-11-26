# Catalogue public depuis R2

La console labo-outils reste protégée par Access. Le nouveau Worker labo-catalogue-public lit le même bucket EU, sans accès public direct au bucket. Seule GET /api/fiches est implémentée. Identités, contacts, commentaires, champs personnalisés et révisions sont exclus. Aucun code d’écriture n’est inclus. Le binding R2 autorise techniquement lecture/écriture : la restriction en lecture seule est assurée par le code public.

La page publique charge toutes les pages avant d’actualiser les lignes connues. Rendu textContent, URL HTTP(S), aucun cookie Access envoyé, boutons toujours désactivés. En panne, le catalogue statique reste affiché avec un avertissement explicite. Recharger la page publique après une modification ; pas de synchronisation instantanée entre onglets. Les commentaires restent privés.

## Mise en service après fusion

La fusion seule ne publie pas le nouveau Worker. Dans Cloudflare > Workers et Pages > Créer une application > Importer un dépôt GitHub : seayousooon/Labo, branche main, nom labo-catalogue-public.

- Répertoire racine : worker
- Build : npm ci && npm run check
- Déploiement : npx wrangler deploy --config wrangler.public.jsonc
- Aperçus désactivés. Aucun secret Access, GitHub ou Turnstile à recopier.
- Vérifier les droits du jeton de build sur le nouveau Worker et le bucket existant. Ne pas créer de nouveau bucket.

Vérifier que le Worker public n’est pas couvert par une politique Access de compte. Ne pas désactiver Access sur labo-outils.

API attendue : https://labo-catalogue-public.allonsalaplage.workers.dev/api/fiches
Page publique : https://seayousooon.github.io/Labo/outils.html
Console : https://labo-outils.allonsalaplage.workers.dev/edition/outils.html

## Contrôles après déploiement

1. API publique en navigation privée : JSON sans connexion ; suivre next pour les pages suivantes.
2. Page publique : message « Lecture seule — fiches actualisées depuis le stockage. »
3. Modifier une description dans la console, enregistrer, recharger la page publique : description actualisée, boutons toujours désactivés, commentaires absents.
4. Console toujours protégée sans session. API publique : POST/PUT/DELETE refusés (405), commentaires inconnus (404).

npm ci puis npm run check dans worker : tests et compilation des deux Workers sans déploiement. Les tests couvrent filtrage des données privées, écritures et routes privées refusées avant R2, pagination, URL dangereuses, rendu textuel et pannes. Les essais réels restent à effectuer après déploiement.
