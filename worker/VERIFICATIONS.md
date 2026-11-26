# Validation de la console Access

Console : https://labo-outils.allonsalaplage.workers.dev/edition/outils.html

Après fusion et déploiement :
1. Ouvrir la console en navigation privée : Access doit demander un code OTP envoyé à l’adresse autorisée.
2. Après connexion, `/api/etat` doit annoncer `ecriture: true` et l’adresse signée. La console affiche « Connecté : … Vous pouvez modifier les fiches et commenter. »
3. Les boutons de modification et de commentaire deviennent utilisables. Le catalogue de ce projet contient 71 fiches, et non les 68 de l’exemple du cours.
4. Si des fiches manquent, la console appelle l’initialisation par lots. Les insertions conditionnelles ne remplacent jamais une fiche existante. Le bucket contient déjà des données : ne pas le vider.
5. Modifier une description et enregistrer : une fiche sans numéro de révision commence à la version 2. Recharger et vérifier la persistance. Les ETag continuent de prévenir les écrasements concurrents. Vérifier aussi l’ajout et la relecture d’un commentaire.
6. https://seayousooon.github.io/Labo/outils.html reste en lecture seule et propose le lien vers la console. Cette page statique n’est pas automatiquement réécrite par une modification dans R2.

`ACCESS_TEAM_DOMAIN` et `ACCESS_AUD` sont non secrets et configurés dans wrangler.jsonc. La signature RS256, l’émetteur, l’audience, l’expiration et les champs d’identité sont vérifiés avec les clés publiques Access. Un e-mail fourni seul ne donne aucun droit. Une configuration ou signature invalide ferme l’écriture ; GitHub ne fournit pas d’alternative quand Access est configuré.

Les secrets existants restent configurés dans Cloudflare. Les écritures conservent le contrôle d’origine et Turnstile. `/api/fiches` expose seulement les champs publics, par lots de 20 ; les commentaires et champs personnalisés sont exclus. Sans R2 ou en cas de panne de lecture, cette route renvoie 503.

Attention : la protection Access de tout le Worker couvre aussi `/contact` et les API. Leur utilisation anonyme depuis le site public nécessite une architecture distincte.

Dans worker : `npm ci`, puis `npm run check` (tests et compilation sans déploiement). Ces contrôles ne remplacent pas les essais OTP, Turnstile et de persistance en production après fusion.

La proposition D1 en attente utilise également `/api/fiches` ; son contrat doit être concilié avant fusion.
