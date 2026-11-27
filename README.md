# LexoGPT

Lexo propose des corrections pendant la saisie dans Chrome et Firefox. L’interface est en français. Les dictionnaires français, anglais et espagnol sont embarqués. Le texte reste sur l’appareil, sans compte, abonnement ni clé API.

## Installation depuis les sources

Avec Node.js 22.12 ou ultérieur, lancer `npm ci` puis `npm run build` depuis le dépôt. Le dossier `dist` contient les deux extensions décompressées et leurs archives ZIP.

- **Chrome** — Ouvrir `chrome://extensions`, activer le mode développeur, choisir **Charger l’extension non empaquetée**, puis sélectionner `dist/chrome`.
- **Firefox 140 ou ultérieur** — Ouvrir `about:debugging#/runtime/this-firefox`, choisir **Charger un module complémentaire temporaire**, puis sélectionner `dist/firefox/manifest.json`. Cette installation dure jusqu’au redémarrage du navigateur. Une installation permanente sur Firefox standard nécessite une version signée.

Recharger les pages déjà ouvertes. Sur Firefox, accorder l’accès aux sites à corriger si le navigateur le demande.

## Utilisation

Écrire par exemple « Je vien de finir » dans une zone de texte. Après une courte pause, le bouton **Lexo** affiche le nombre de suggestions. Ouvrir le bouton et choisir **Je viens** pour appliquer uniquement cette modification. **Suivante** parcourt les propositions. Échap masque le panneau.

Dans le menu de l’extension, désactiver Lexo, choisir une langue ou masquer les reformulations. En mode automatique, Lexo utilise le détecteur du navigateur, puis des indices locaux. Pour les textes ambigus, elle utilise la langue déclarée du champ ou, à défaut, le français.

## Couverture

- Orthographe avec nspell et dictionnaires Hunspell. Les règles de grammaire et de reformulation ciblent des tournures fréquentes et restent limitées. Les variantes proposées sont à relire en contexte.
- Fonctionne dans les champs texte, les zones multiligne et les éditeurs HTML standard sur les pages HTTP(S). Dans un éditeur riche, Lexo analyse le nœud de texte du curseur afin de préserver la mise en forme. Les éditeurs dessinés dans un canvas et les pages internes du navigateur sortent de cette couverture.
- Analyse bornée autour du curseur et traitement du dictionnaire en arrière-plan. Le premier chargement d’une langue peut prendre un instant. Les mots de passe, champs de paiement identifiés et zones avec correction désactivée sont exclus.
- Seules les préférences sont enregistrées. Aucun service distant, modèle génératif ou quota.

## Développement

`npm test` vérifie la détection de secours, les règles et leurs positions. `npm run build` construit les paquets depuis les dépendances verrouillées. Les dictionnaires et bibliothèques conservent leurs licences dans le dossier `licenses` de chaque extension.

