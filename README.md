# Sondage QR code — post-conférence

Sondage gratuit accessible par QR code, hébergé sur GitHub Pages, avec enregistrement
des réponses dans une Google Sheet et envoi automatique des résultats à la clôture.

```
QR code ─► Site GitHub Pages (accueil → 10 questions → e-mail facultatif → merci)
                     │
                     ▼
      Script Google Apps Script ─► Google Sheet (Réponses / E-mails / Questions)
                     │
                     └─ toutes les heures : si le sondage est clos →
                          • rapport complet envoyé à vous
                          • résultats globaux envoyés aux participants volontaires
                          • adresses e-mail effacées
```

Coût : 0 €. Il faut seulement un compte GitHub et un compte Google (Gmail).

## Contenu

| Fichier | Rôle |
|---|---|
| `docs/config.js` | **Textes et questions du sondage** (le seul fichier à modifier côté site) |
| `docs/index.html`, `app.js`, `style.css` | Le sondage lui-même |
| `docs/admin.html` | Page statistiques (protégée par une clé) |
| `apps-script/Code.gs` | Script Google : stockage, statistiques, envois automatiques. **Dates d'ouverture/fermeture** dans son bloc `CONFIG` |
| `qrcode-sondage.png` / `.svg` | QR code vers `https://edumontet.github.io/sondage-qr-code/` |

---

## Installation (environ 15 minutes, une seule fois)

### Étape 1 — Le site sur GitHub (déjà fait par Claude si le dépôt existe)

1. Le dépôt `sondage-qr-code` doit être **public** (GitHub Pages gratuit l'exige ; aucune donnée
   personnelle n'y est stockée, les réponses vont dans votre Google Sheet privée).
2. Sur GitHub : **Settings → Pages → Build and deployment**
   - Source : *Deploy from a branch*
   - Branch : `main`, dossier `/docs` → **Save**
3. Après 1 à 2 minutes, le sondage est en ligne sur
   **https://edumontet.github.io/sondage-qr-code/** (en « mode démo » tant que l'étape 3 n'est pas faite).

### Étape 2 — La Google Sheet et son script

1. Allez sur <https://sheets.new> (crée une feuille vide) et nommez-la « Sondage IA ».
2. Menu **Extensions → Apps Script**.
3. Effacez le contenu de `Code.gs` et collez **tout** le fichier `apps-script/Code.gs`.
4. En haut du script, réglez les dates dans `CONFIG` :
   ```js
   OUVERTURE: "2026-11-23T08:00:00+01:00",
   FERMETURE: "2026-11-30T18:00:00+01:00",
   ```
   (`+01:00` = heure de Paris en hiver, `+02:00` en été). Enregistrez (icône disquette).
5. Dans la liste des fonctions en haut, choisissez **installer** puis cliquez **Exécuter**.
   - Google demande des autorisations : *Examiner les autorisations* → votre compte →
     *Paramètres avancés* → *Accéder à Sondage IA (non sécurisé)* → *Autoriser*.
     (L'avertissement est normal : c'est votre propre script, non vérifié par Google.)
   - Vous recevez un e-mail avec votre **clé administrateur**. Gardez-la.
6. **Déployer → Nouveau déploiement** → roue dentée → **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
   - **Déployer**, puis copiez l'**URL de l'application Web** (elle finit par `/exec`).

### Étape 3 — Relier le site au script

Dans `docs/config.js`, collez l'URL :
```js
scriptUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",
```
(ou envoyez simplement l'URL à Claude, qui fera la modification). Une minute plus tard,
le bandeau « Mode démo » disparaît : le sondage est opérationnel.

### Étape 4 — Tester

1. Scannez le QR code avec votre téléphone, répondez en laissant votre adresse.
2. La réponse apparaît dans l'onglet **Réponses** de la Google Sheet.
3. Ouvrez `https://edumontet.github.io/sondage-qr-code/admin.html` et saisissez la clé : les statistiques s'affichent.
4. Dans Apps Script, exécutez **testerEmailResultats** pour recevoir un aperçu de l'e-mail
   qu'auront les participants (envoyé à vous seul).
5. Avant la conférence, supprimez vos lignes de test dans les onglets **Réponses** et **E-mails**.

> Après un test, votre téléphone affiche « Vous avez déjà répondu ». Pour répondre à nouveau,
> ajoutez `?refaire` à l'adresse : `https://edumontet.github.io/sondage-qr-code/?refaire`.

---

## Utilisation au quotidien

- **Le QR code** : insérez `qrcode-sondage.png` sur votre dernier slide (assez grand :
  au moins un quart de l'écran pour être scanné du fond de la salle).
- **Pendant la semaine** : statistiques en direct sur `admin.html`, ou directement dans la Google Sheet.
- **À la clôture** (dans l'heure qui suit la date `FERMETURE`), sans intervention :
  - vous recevez le rapport complet, commentaires libres inclus ;
  - chaque personne ayant laissé son adresse reçoit les résultats globaux (pourcentages) ;
  - les adresses sont effacées de la feuille.
- **Après la clôture**, le site affiche « Le sondage est fermé ».

## Modifier les questions

Dans `docs/config.js`, section `questions`. Types disponibles : `ouinon`, `choix`,
`multiple`, `note` (1 à 5 étoiles), `texte`. Gardez des `id` uniques et ne les changez plus
une fois le sondage ouvert. Les statistiques s'adaptent toutes seules.

## Réutiliser pour une autre conférence

1. Créez une nouvelle Google Sheet et refaites l'étape 2 (nouvelles dates, nouvelle URL).
2. Mettez la nouvelle URL dans `config.js`. Le même QR code continue de fonctionner.

## Modifier les dates après coup

Changez `OUVERTURE` / `FERMETURE` dans le script, enregistrez, puis
**Déployer → Gérer les déploiements → crayon → Version : Nouvelle version → Déployer**.
Si les résultats étaient déjà partis et que vous prolongez, exécutez aussi `reinitialiserEnvois`.

## RGPD

- Les réponses sont anonymes ; les adresses e-mail sont stockées dans un onglet séparé,
  sans lien avec les réponses.
- L'adresse n'est demandée que si la personne veut les résultats, avec case de consentement explicite.
- Elle sert à un seul envoi, puis est effacée automatiquement (`EFFACER_EMAILS_APRES_ENVOI`).
- Les commentaires libres ne sont pas envoyés aux participants (`COMMENTAIRES_POUR_PARTICIPANTS: false`).

## Limites (gratuites)

- Gmail personnel : 100 e-mails par jour via le script. Au-delà, la suite part
  automatiquement le lendemain (Google Workspace : 1 500 par jour).
- Le blocage « déjà répondu » repose sur le navigateur : il évite les doublons involontaires,
  pas une fraude volontaire (suffisant pour un retour de conférence).
