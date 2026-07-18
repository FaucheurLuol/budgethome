# Architecture

## Vue d'ensemble

BudgetHome suit une architecture classique client/serveur découplée :

```
Frontend (React/Vite, Vercel)  <--HTTP/JSON-->  Backend (Express, Railway)  <-->  PostgreSQL (Railway)
```

Le frontend ne communique jamais directement avec la base de données : tous les accès passent par l'API REST du backend, qui applique l'authentification, la validation et les règles métier.

---

## Backend

### Organisation des dossiers

- `routes/` : un fichier par ressource métier (comptes, transactions, budgets, objectifs, catégories, modèles, répartition, foyers, utilisateurs, dashboard, auth). Chaque fichier expose un `express.Router()`.
- `services/` : logique métier isolée et testable, indépendante des routes HTTP. Contient `repartitionCompteCommun.js`, le calcul pur de répartition au prorata (aucun accès base de données, juste une fonction de calcul).
- `middleware/` :
  - `auth.js` : vérifie le token JWT (header `Authorization: Bearer ...`) et attache `req.utilisateur`.
  - `erreurs.js` : gestionnaire d'erreurs centralisé, traduit les codes d'erreur PostgreSQL (`23505` doublon, `23503`/`23001` clé étrangère, `23514` contrainte CHECK, `P0001` trigger applicatif) en réponses HTTP lisibles.
  - `limiteurAuth.js` : rate limiting sur les routes d'authentification.
- `db.js` : instancie le `Pool` de connexions PostgreSQL, avec un correctif de fuseau horaire sur les colonnes `DATE` (`types.setTypeParser(1082, ...)`).
- `app.js` : configuration Express (helmet, CORS restreint, parsing JSON, montage des routes, middleware d'erreurs en dernier).
- `index.js` : point d'entrée, charge les variables d'environnement et démarre le serveur.

### Authentification

JWT signé avec un secret aléatoire de 64 octets, payload minimal (`id`, `nom`), expiration 7 jours. Mots de passe hachés avec bcrypt (coût 10). Toute route protégée utilise le middleware `verifierToken`.

### Isolation des données

Trois niveaux d'isolation, du plus large au plus fin :

1. **Foyer** : un utilisateur ne voit les autres utilisateurs (`GET /utilisateurs`) que s'ils appartiennent au même foyer (rejoint via un code d'invitation généré aléatoirement). Sans foyer, un utilisateur ne voit que lui-même.
2. **Compte** : l'accès à un compte passe systématiquement par la table de jonction `compte_utilisateurs` (many-to-many), qu'il soit personnel (1 propriétaire) ou partagé (plusieurs propriétaires).
3. **Catégorie / Objectif** : partagés par foyer si `foyer_id` est renseigné, sinon propres au créateur (`utilisateur_id`).

### Transactions SQL

Toute opération touchant plusieurs tables de façon atomique (création d'un compte partagé, virement automatisé compte courant ↔ épargne, activation d'une répartition) utilise `client.query('BEGIN')` / `COMMIT` / `ROLLBACK` via `pool.connect()`, pour garantir qu'aucune opération ne reste à moitié faite en cas d'erreur.

---

## Frontend

### Organisation des dossiers

- `api/` : un fichier par ressource, chaque fonction fait un `fetch` vers le backend, gère le header d'authentification (`getAuthHeader()`) et la gestion d'erreur uniforme.
- `context/` : `AuthContext` (état de connexion, token, fonctions `connexion()`/`deconnexion()`), séparé en trois fichiers (`authContext.js`, `AuthContext.jsx`, `useAuth.js`) pour respecter la contrainte Fast Refresh de Vite (un fichier `.jsx` ne doit exporter que des composants).
- `components/` : `Layout.jsx` bascule entre `Header` (visiteur non connecté) et `Sidebar` (utilisateur connecté), avec gestion du menu mobile (burger).
- `pages/` : une page par route, chacune autonome (état, appels API, rendu).
- `style/` : CSS découpé par domaine (`landing.css`, `auth.css`, `app.css`, `sidebar.css`, `tableur.css`, `dashboard.css`), avec des variables CSS globales dans `index.css` (couleurs, polices).

### Design system

- Couleurs : fond ardoise (`--color-bg`), accent doré (`--color-accent`), accent secondaire sauge (`--color-accent-soft`).
- Typographie : `Fraunces` (titres, serif) + `Work Sans` (corps de texte).
- Base `16px` avec tailles en `rem`, `clamp()` pour la typographie fluide sur les grandes pages (Accueil, titres).

### Modèle de données du solde (page Transactions)

Chaque transaction porte un flag `est_simulee`. Le solde **réel** n'inclut que les transactions non simulées ; le solde **projeté** inclut tout. Les simulations sont toujours affichées en tête du tableau, visuellement distinguées (italique, fond teinté), et peuvent être validées (transformées en transactions réelles) sans ressaisie.

---

## Points de vigilance connus / dette technique

- Les catégories et objectifs partagés par foyer reposent sur une jointure conditionnelle (`foyer_id = X OR (utilisateur_id = moi AND foyer_id IS NULL)`) répétée dans plusieurs routes — pourrait être factorisée en une fonction SQL ou un helper commun si le nombre de routes concernées augmente encore.
- Le calcul du solde de fin de mois (évolution des comptes courants sur le Dashboard) itère mois par mois côté Node plutôt qu'en une seule requête SQL agrégée — suffisant à l'échelle actuelle, à revoir si le nombre de mois affichés grandit significativement.
