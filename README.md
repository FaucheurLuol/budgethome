# BudgetHome — Gestion financière pour le foyer

BudgetHome est une application de gestion budgétaire personnelle pensée pour un couple : comptes personnels et partagés, répartition automatique du compte commun au prorata des revenus, budgets par catégorie, objectifs d'épargne (individuels ou communs au foyer), et un tableau de bord consolidé.

Projet développé de bout en bout dans une démarche d'apprentissage du développement web professionnel (architecture, sécurité, modélisation de données).

---

## Stack technique

| Domaine | Choix |
|---|---|
| Frontend | React 18 / Vite (ES Modules) |
| Backend | Node.js / Express (CommonJS) |
| Base de données | PostgreSQL |
| Authentification | JWT + bcrypt |
| Graphiques | Recharts |
| Déploiement | Vercel (frontend) + Railway (backend + BDD) |
| Sécurité | helmet, express-rate-limit, CORS restreint, validation stricte des entrées |

---

## Fonctionnalités principales

- **Comptes** : personnels et partagés (many-to-many via `compte_utilisateurs`), archivage individuel, favoris, invitation/sortie d'un compte partagé
- **Catégories** : arborescence parent/enfant, typées dépense/revenu, partagées par foyer, marquables comme récurrentes
- **Transactions** : saisie type tableur, solde réel vs projeté, mode simulation intégré (`est_simulee`), virements automatisés compte courant ↔ épargne, modèles de transaction réutilisables
- **Budgets** : budget par défaut + déclinaison mensuelle, suivi du dépassement, agrégation récursive des sous-catégories
- **Objectifs d'épargne** : individuels ou communs au foyer, progression calculée automatiquement à partir des flèchages de transactions
- **Répartition du compte commun** : simulateur manuel au prorata des revenus déclarés, historisé, avec activation d'une répartition de référence
- **Dashboard** : soldes, évolution des comptes courants, répartition des dépenses/revenus par catégorie, budgets du mois, objectifs
- **Foyer** : isolation des données entre couples utilisant l'application via un code d'invitation

---

## Structure du projet

```
budgethome/
├── backend/
│   └── src/
│       ├── config/
│       ├── middleware/       (auth, erreurs, rate limiting)
│       ├── routes/           (une ressource = un fichier)
│       ├── services/         (logique métier isolée : répartition)
│       ├── app.js
│       ├── db.js
│       ├── index.js
│       ├── migrate.js
│       └── migration.sql
├── frontend/
│   └── src/
│       ├── api/               (appels HTTP centralisés par ressource)
│       ├── components/        (Layout, Header, Sidebar, RouteProtegee)
│       ├── context/           (AuthContext)
│       ├── pages/
│       └── style/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── base-de-donnees.md
│   ├── repartition-compte-commun.md
│   └── journal.md
└── README.md
```

---

## Installation locale

### Prérequis
- Node.js
- PostgreSQL (local ou distant)

### Backend

```bash
cd backend
npm install
```

Crée un fichier `.env` :
```
DATABASE_URL=postgresql://utilisateur:motdepasse@localhost:5432/budgethome
PORT=5000
JWT_SECRET=une_longue_chaine_aleatoire
FRONTEND_URL=http://localhost:5173
```

Exécute la migration initiale (crée toutes les tables) :
```bash
npm run migrate
```

Lance le serveur :
```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Crée un fichier `.env` :
```
VITE_API_URL=http://localhost:5000
```

Lance le serveur de développement :
```bash
npm run dev
```

---

## Documentation détaillée

- [Architecture](docs/architecture.md)
- [API](docs/api.md)
- [Base de données](docs/base-de-donnees.md)
- [Répartition du compte commun](docs/repartition-compte-commun.md)
- [Journal de développement](docs/journal.md)

---

## Auteur

Lucas Baretzki