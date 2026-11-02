# Labo — Parcours et wireframes UX

## Périmètre validé

Labo est un site web de formation au vibe coding. Son accueil donne accès aux pages des exercices et aux ressources du cours. La consultation est publique, sans compte ni formulaire.

Ce document décrit la cible UX. Il ne certifie pas que tous les critères sont déjà implémentés ou testés. La page 404.html reste à créer lors d’une étape de développement distincte.

Principes : interface claire et responsive, une intention principale par écran, états utiles explicites, accessibilité dès la conception. Conserver une palette lumineuse crème, menthe, vert turquoise et corail, sans violet, sans décor inutile.

## Carte des écrans

| Écran | Fichier | Intention | Destination principale |
| --- | --- | --- | --- |
| Accueil | index.html | Choisir une ressource du cours | outils.html |
| Outils du vibe coding | outils.html | Trouver un outil et accéder à son site officiel | Site officiel de l’outil |
| Page introuvable | 404.html, à créer | Retrouver son chemin | Accueil |

L’accueil et la page Outils sont reliés dans les deux sens. Toute adresse inexistante doit donner accès à la page introuvable, qui ramène à l’accueil.

## Parcours « première action réussie »

1. La personne arrive sur l’accueil et comprend qu’elle consulte le bac à sable de la formation.
2. Elle repère la carte « Outils du vibe coding ».
3. Elle active « Découvrir les outils ».
4. Elle lit le rôle des outils proposés.
5. Elle ouvre le lien officiel de l’outil choisi.

Réussite : l’outil choisi est accessible sans connexion à Labo et son rôle est compréhensible avant de quitter le site. Un service externe peut demander son propre compte.

Test manuel : depuis l’accueil, ouvrir la page Outils, puis un site officiel ; revenir avec le bouton Retour du navigateur ; utiliser « Retour à l’accueil ». Répéter au clavier et sur un écran de téléphone. Aucun traceur nécessaire pour ce test.

## Écran 1 — Accueil

### Intention principale

Choisir une page du cours, avec un accès prioritaire aux outils.

### Wireframe textuel, dans l’ordre de lecture

1. Lien d’évitement « Aller au contenu », visible quand il reçoit le focus au clavier.
2. En-tête : lien « Labo » vers index.html ; navigation « Accueil », indiquée comme page active.
3. Zone principale :
   - Salutation « bonjour les scapiens et scapiennes ».
   - Introduction « Bienvenue dans le bac à sable ».
   - Rubrique « Les pages du cours ».
   - Carte « Outils du vibe coding ».
   - Description « Les outils pour concevoir, développer et publier les exercices du cours. »
   - Action principale « Découvrir les outils », vers ./outils.html.
4. Pied de page « Labo — Projet de formation ».

Ne pas réintroduire le titre visible « Les exercices du cours » ni les trois anciens encarts. Pour structurer la page sans texte supplémentaire, utiliser « Les pages du cours » comme titre h1 ; le titre de la carte devient h2.

### Annotations et critères UX

- Compréhension : le lien vers les outils apparaît directement après sa description.
- Hiérarchie : une seule action principale par carte ; aucun bouton concurrent.
- Responsive : une colonne sous 650 px, jusqu’à deux au-delà ; sans défilement horizontal à 320 px.
- Acceptation : « Découvrir les outils » ouvre outils.html ; « Labo » et « Accueil » ouvrent index.html.
- Acceptation : la salutation et l’introduction restent visibles ; les anciens encarts et le titre supprimé sont absents.
- Acceptation : la navigation fonctionne au clavier, dans l’ordre de lecture, avec focus visible.

## Écran 2 — Outils du vibe coding

### Intention principale

Comprendre le rôle d’un outil et accéder à sa ressource officielle.

### Wireframe textuel, dans l’ordre de lecture

1. Lien d’évitement « Aller au contenu ».
2. En-tête : « Labo » ; lien « Retour à l’accueil » vers ./index.html.
3. Titre h1 « Outils du vibe coding ».
4. Introduction « Les outils utilisés pendant la formation et leur rôle. »
5. Rubrique h2 « Choisir un outil ».
6. Six fiches, chacune avec catégorie, titre h3, explication courte et lien explicite :
   - ChatGPT — clarifier une idée et obtenir de l’aide sur le code — https://chatgpt.com/
   - Figma — préparer et organiser des maquettes — https://www.figma.com/
   - Visual Studio Code — éditer les fichiers du site — https://code.visualstudio.com/
   - GitHub — conserver et partager les versions du code — https://github.com/
   - GitHub Pages — publier un site statique — https://pages.github.com/
   - Outils de développement du navigateur — inspecter et tester une page ; F12 dans Firefox — https://firefox-source-docs.mozilla.org/devtools-user/
7. Rubrique secondaire « Un déroulé simple pour vos exercices » : décrire, préparer, tester, enregistrer et publier.
8. Indication : les liens s’ouvrent dans le même onglet ; le bouton Retour du navigateur permet de revenir.
9. Pied de page « Labo — Projet de formation ».

### Annotations et critères UX

- Lecture : le rôle de chaque outil précède son lien ; éviter les termes techniques sans explication.
- Navigation : libellés « Accéder à ChatGPT », « Accéder à Figma », etc. ; pour Firefox, « Consulter le guide des outils de Firefox ».
- Responsive : six fiches sur une colonne sous 650 px et deux au-delà.
- Acceptation : les six fiches sont présentes, avec un lien HTTPS vers le domaine officiel indiqué.
- Acceptation : le lien de retour ouvre l’accueil ; aucun compte Labo n’est demandé.
- Acceptation : tous les liens sont accessibles au clavier ; le retour du navigateur permet de retrouver la liste.
- Acceptation : les textes restent lisibles avec un agrandissement à 200 %.

## Écran 3 — Page introuvable

### Intention principale

Permettre de revenir à l’accueil après une adresse incorrecte.

### Wireframe textuel, dans l’ordre de lecture

1. Lien d’évitement « Aller au contenu ».
2. En-tête : « Labo », lien vers /Labo/.
3. Titre h1 « Cette page est introuvable ».
4. Message « L’adresse est peut-être incorrecte ou la page a été déplacée. »
5. Action principale « Revenir à l’accueil », vers /Labo/.
6. Pied de page « Labo — Projet de formation ».

Utiliser /Labo/ pour le retour : un chemin relatif pourrait pointer au mauvais endroit depuis une adresse inexistante comportant plusieurs sous-dossiers.

### Annotations et critères UX

- Message : expliquer le problème sans jargon ni reproche à la personne.
- Action : un lien principal de retour, sans redirection automatique.
- Acceptation : une URL inexistante, y compris dans un sous-dossier, présente cette page après déploiement.
- Acceptation : « Revenir à l’accueil » rejoint bien la racine du site Labo.
- Acceptation : le titre et le lien restent accessibles au lecteur d’écran et au clavier.
- Acceptation : tester en ligne après publication ; ouvrir simplement le fichier local ne vérifie pas le traitement des erreurs de l’hébergement.

## États à prévoir

| Situation | Comportement attendu |
| --- | --- |
| Aucune page de cours disponible | Sur l’accueil : « Les premières pages du cours seront bientôt disponibles. » Aucun lien désactivé trompeur. |
| Aucun outil disponible | Sur la page Outils : « Aucun outil disponible pour le moment. » Conserver le retour à l’accueil. |
| Chargement normal | HTML et CSS légers ; affichage natif du navigateur, sans chargement artificiel. |
| Page inexistante | Page 404 avec retour à l’accueil. |
| Site externe indisponible | L’erreur dépend du site externe ou du navigateur ; le bouton Retour permet de revenir à Labo. Ne pas prétendre détecter cette erreur sans mécanisme dédié. |
| Première action réussie | La destination choisie s’ouvre. Aucun message de succès superflu pour un simple lien. |

Les états vides sont des règles pour une future suppression de contenu ; ne pas les afficher tant que les fiches existent.

## Mini-charte et composants

- Police système : system-ui, -apple-system, Segoe UI, sans-serif ; texte courant au moins 16 px, interligne proche de 1,6.
- Couleurs : crème #FFFDF4, menthe #D9F7ED, jaune doux #FFF4BD ; texte #263E3C, titres et boutons #006B63, accent corail #AD3C26.
- Réserver les couleurs claires aux fonds ; vérifier les contrastes sur le fond effectivement affiché.
- Espacements : 8, 16, 24, 32 et 48 px ; marges latérales de 20 px sur téléphone et 24 px sur grand écran.
- Largeur de contenu maximale : 1000 px. Fiches avec bordure discrète, coins arrondis de 12 px.
- Composants : en-tête, navigation, lien d’évitement, carte de ressource, lien principal, pied de page.
- Actions de navigation : liens HTML, même avec une apparence de bouton.
- Cibles tactiles : au moins 44 × 44 px ; focus visible de 3 px avec un décalage de 4 px.

## Checklist de validation

- [ ] Langue française déclarée avec lang="fr" ; titre d’onglet propre à chaque page.
- [ ] Un titre h1 pertinent par écran et niveaux de titres cohérents.
- [ ] Contraste du texte courant au moins 4,5:1 ; grands textes au moins 3:1.
- [ ] Indicateurs de focus et composants identifiables avec un contraste suffisant.
- [ ] Tous les liens fonctionnent avec Tab, Maj+Tab et Entrée ; aucun piège au clavier.
- [ ] Lien d’évitement utilisable ; ordre du focus conforme à l’ordre visuel.
- [ ] Libellés compréhensibles hors contexte ; aucune information portée uniquement par la couleur.
- [ ] En-tête, navigation, contenu principal et pied de page identifiables au lecteur d’écran.
- [ ] Cibles tactiles d’au moins 44 × 44 px.
- [ ] Pas de débordement horizontal à 320 px ; contenu utilisable à 200 % de zoom.
- [ ] Vérification du parcours complet et de la page 404 sur le site publié.

## Sécurité, confidentialité et mise en œuvre

Prérequis : accès en écriture au dépôt Labo. Fichier de cette étape : docs/ux.md uniquement. Aucune installation ni commande nécessaire pour consulter ce document dans GitHub.

Aucun secret, clé API, mot de passe ou donnée personnelle ne doit être ajouté au dépôt public. Les liens externes conduisent à des services ayant leurs propres règles de confidentialité ; ne pas y transmettre de contenu sensible pendant les exercices. Aucun compte, formulaire, suivi de visite ni script tiers n’est nécessaire au périmètre décrit.

La réalisation de 404.html et les corrections d’accessibilité décrites sont à faire dans une étape ultérieure, après validation. Ce document ne modifie pas les pages HTML.
