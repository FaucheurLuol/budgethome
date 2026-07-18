# API

Toutes les routes (sauf `/auth/inscription` et `/auth/connexion`) nécessitent un header `Authorization: Bearer <token>`. Les montants sont toujours exprimés en **centimes** (entiers).

## Authentification — `/auth`

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/inscription` | Crée un compte utilisateur (validation stricte nom/email/mot de passe), retourne un token |
| POST | `/auth/connexion` | Authentifie un utilisateur, retourne un token |

Rate limité à 10 tentatives / 15 min par IP.

## Utilisateurs — `/utilisateurs`

| Méthode | Route | Description |
|---|---|---|
| GET | `/utilisateurs` | Liste les utilisateurs du même foyer (ou soi-même seul si pas de foyer) |

## Foyers — `/foyers`

| Méthode | Route | Description |
|---|---|---|
| GET | `/foyers/moi` | Infos du foyer courant (code d'invitation) |
| POST | `/foyers` | Crée un nouveau foyer, génère un code, y rattache l'utilisateur |
| POST | `/foyers/rejoindre` | Rejoint un foyer existant via son code |
| POST | `/foyers/quitter` | Quitte son foyer actuel |

## Comptes — `/comptes`

| Méthode | Route | Description |
|---|---|---|
| GET | `/comptes` | Liste les comptes actifs de l'utilisateur (favoris en premier) |
| GET | `/comptes/archives` | Liste les comptes archivés par l'utilisateur |
| GET | `/comptes/:id` | Détail d'un compte |
| POST | `/comptes` | Création (perso ou partagé via `utilisateurs_associes`) |
| PUT | `/comptes/:id` | Modification (nom, type) |
| PATCH | `/comptes/:id/archiver` | Archive le compte (pour l'utilisateur courant uniquement) |
| PATCH | `/comptes/:id/desarchiver` | Désarchive |
| PATCH | `/comptes/:id/favori` | Bascule le statut favori |
| POST | `/comptes/:id/inviter` | Ajoute un membre du foyer à un compte (le rend partagé) |
| POST | `/comptes/:id/quitter` | Quitte un compte partagé (reste perso pour l'autre) |
| DELETE | `/comptes/:id` | Suppression (refusée si transactions existantes) |
| DELETE | `/comptes/:id/definitif` | Suppression complète (transactions, budgets, modèles associés), refusée si partagé |

## Catégories — `/categories`

| Méthode | Route | Description |
|---|---|---|
| GET | `/categories` | Liste les catégories du foyer (ou propres si pas de foyer) |
| POST | `/categories` | Création (racine ou sous-catégorie, typée dépense/revenu, `est_recurrente` optionnel) |
| PUT | `/categories/:id` | Modification |
| DELETE | `/categories/:id` | Suppression (refusée si transactions/modèles liés) |
| POST | `/categories/epargne-defaut` | Garantit l'existence des catégories "Épargne" (dépense + revenu) |

## Transactions — `/transactions`

| Méthode | Route | Description |
|---|---|---|
| GET | `/transactions?compte_id=X` | Liste les transactions d'un compte (avec allocation d'épargne éventuelle) |
| POST | `/transactions` | Création classique |
| PUT | `/transactions/:id` | Modification |
| DELETE | `/transactions/:id` | Suppression |
| POST | `/transactions/retrait-epargne` | Retrait d'un compte d'épargne, flèchage obligatoire vers un objectif |
| POST | `/transactions/virement-epargne` | Virement automatisé compte courant → épargne (catégorie "Épargne" auto-gérée) |
| POST | `/transactions/virement-vers-courant` | Virement automatisé épargne → compte courant ("Renflouement", flèchage obligatoire) |
| PATCH | `/transactions/:id/valider-simulation` | Transforme une transaction simulée en réelle |

## Budgets — `/budgets`

| Méthode | Route | Description |
|---|---|---|
| GET | `/budgets/defaut?compte_id=X` | Budgets par défaut d'un compte |
| POST | `/budgets/defaut` | Création d'un budget par défaut |
| PUT | `/budgets/defaut/:id` | Modification du montant |
| DELETE | `/budgets/defaut/:id` | Suppression |
| GET | `/budgets/mensuel?compte_id=X&mois=YYYY-MM-01` | Budgets mensuels d'un compte/mois |
| POST | `/budgets/mensuel/generer` | Génère les budgets du mois à partir des défauts (idempotent) |
| GET | `/budgets/mensuel/suivi?compte_id=X&mois=...` | Suivi budget vs dépenses réelles (agrégation récursive des sous-catégories) |
| GET | `/budgets/solde-restant?compte_id=X&mois=...` | Solde perso restant à budgétiser (basé sur la répartition active) |
| PUT | `/budgets/mensuel/:id` | Modification (montant, catégorie) |
| DELETE | `/budgets/mensuel/:id` | Suppression |

## Objectifs d'épargne — `/objectifs`

| Méthode | Route | Description |
|---|---|---|
| GET | `/objectifs` | Liste les objectifs accessibles (miens + communs du foyer), avec progression calculée |
| POST | `/objectifs` | Création (`est_commun` optionnel pour le partager au foyer) |
| PUT | `/objectifs/:id` | Modification |
| DELETE | `/objectifs/:id` | Suppression |
| POST | `/objectifs/:id/allocations` | Flèche une transaction vers l'objectif |
| DELETE | `/objectifs/allocations/:id` | Retire un flèchage |

## Modèles de transaction — `/modeles`

| Méthode | Route | Description |
|---|---|---|
| GET | `/modeles?compte_id=X` | Liste les modèles d'un compte |
| POST | `/modeles` | Création (classique ou virement épargne automatisé) |
| PUT | `/modeles/:id` | Modification |
| DELETE | `/modeles/:id` | Suppression |
| POST | `/modeles/virement-compte-commun` | Crée/remplace le modèle "Virement vers compte commun" à partir d'une répartition |

## Répartition du compte commun — `/repartition`

| Méthode | Route | Description |
|---|---|---|
| POST | `/repartition` | Calcule et historise une répartition (revenus multi-sources par personne, dépenses communes) |
| GET | `/repartition/historique` | Historique des répartitions du foyer |
| GET | `/repartition/active` | Répartition actuellement active |
| PATCH | `/repartition/:id/activer` | Active une répartition (désactive les autres) |
| DELETE | `/repartition/:id` | Supprime une répartition de l'historique |

## Dashboard — `/dashboard`

| Méthode | Route | Description |
|---|---|---|
| GET | `/dashboard/soldes` | Solde réel actuel de chaque compte |
| GET | `/dashboard/evolution-comptes-courants?mois=N` | Solde de fin de mois sur N mois, par compte courant |
| GET | `/dashboard/repartition?type=depense\|revenu&periode=mois\|annee&compte_id=X` | Répartition par catégorie parente (pour les camemberts) |
| GET | `/dashboard/budgets-du-mois` | Suivi budgétaire consolidé, tous comptes confondus |

---

## Codes d'erreur PostgreSQL traduits (`middleware/erreurs.js`)

| Code | Signification | Réponse HTTP |
|---|---|---|
| `23505` | Violation de contrainte UNIQUE | 409 |
| `23503` / `23001` | Violation de clé étrangère (RESTRICT) | 409 |
| `23514` | Violation de contrainte CHECK | 400 |
| `P0001` | Erreur levée par un trigger applicatif | 400 (message du trigger renvoyé tel quel) |
