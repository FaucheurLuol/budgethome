# Base de données

PostgreSQL. Toutes les valeurs monétaires sont stockées en **centimes** (`INTEGER`), jamais en flottant, pour éviter les erreurs d'arrondi.

## Vue d'ensemble des tables

| Table | Rôle |
|---|---|
| `foyers` | Isole les données entre couples/foyers distincts utilisant l'application |
| `utilisateurs` | Comptes de connexion, rattachés optionnellement à un foyer |
| `comptes` | Comptes bancaires (courant, livret, PEA...), favoris |
| `compte_utilisateurs` | Jonction many-to-many compte ↔ utilisateur, porte l'archivage individuel |
| `categories` | Arborescence auto-référencée, typée dépense/revenu, partagée par foyer, récurrente ou non |
| `transactions` | Table unique (single-table inheritance dépense/revenu), porte `est_simulee` |
| `budget_defaut` / `budget_mensuel` | Règle de budget reconductible + application mensuelle éditable |
| `objectifs_epargne` | Objectifs individuels ou communs au foyer |
| `allocations_epargne` | Flèchage d'une transaction vers un objectif |
| `modeles_transactions` | Templates de saisie rapide, avec variante virement épargne automatisé |
| `repartitions_communes` | Simulations de répartition du compte commun, historisées (JSONB) |

---

## Détail des choix de modélisation

### Comptes perso vs partagés : `compte_utilisateurs`

Un compte n'a jamais de colonne `utilisateur_id` directe. L'appartenance passe exclusivement par la table de jonction `compte_utilisateurs` (clé primaire composite `compte_id, utilisateur_id`). Un compte perso a une ligne, un compte partagé en a plusieurs — même structure, aucune branche de code spéciale. `est_archive` vit sur cette table (pas sur `comptes`) pour permettre à chaque copropriétaire d'archiver "sa vue" indépendamment.

### Catégories : arbre auto-référencé + partage par foyer

`categories.parent_id` référence `categories.id` (`ON DELETE SET NULL` : supprimer un parent fait remonter ses enfants au rang de racines plutôt que de les supprimer en cascade). `foyer_id` (nullable) permet le partage entre membres du foyer ; `NULL` signifie "propre au créateur uniquement". Un **trigger** (`verifier_coherence_type_categorie`) garantit qu'une sous-catégorie a le même `type_categorie` que son parent.

### Transactions : single-table inheritance

Une seule table `transactions` porte à la fois les dépenses et les revenus, distingués par `type_transaction`. Ce choix permet un calcul de cashflow en une seule requête (`SUM` sans jointure), au prix de quelques colonnes non utilisées selon le type (compromis jugé acceptable vu le nombre limité de colonnes). Un **trigger** (`verifier_coherence_categorie_transaction`) garantit que la catégorie utilisée correspond au type de la transaction. `est_simulee` permet au mode simulation de cohabiter dans la même table que les données réelles (compté dans les KPI du mois courant, exclu des vues historiques/annuelles).

### Budgets : séparation défaut / mensuel

`budget_defaut` porte la règle reconductible (un montant "par défaut" par compte + catégorie). `budget_mensuel` porte l'application réelle pour un mois donné, générée à la demande (`POST /budgets/mensuel/generer`, idempotent via `ON CONFLICT DO NOTHING`) et modifiable indépendamment sans jamais toucher au défaut.

### Fonction récursive : agrégation des sous-catégories

`categorie_et_descendants(categorie_id)` est une fonction SQL (`WITH RECURSIVE`) qui renvoie une catégorie et toutes ses descendantes. Utilisée via `LEFT JOIN LATERAL` dans le suivi budgétaire, pour qu'un budget posé sur une catégorie parente agrège automatiquement les dépenses de toutes ses sous-catégories.

### Objectifs d'épargne et allocations

Un objectif peut être individuel (`foyer_id IS NULL`) ou commun au foyer (`foyer_id` renseigné). `allocations_epargne` relie une transaction à un objectif avec un `montant_fleche` **toujours positif** — le sens (ajout/retrait) est déterminé par le `type_transaction` de la transaction liée, jamais stocké séparément. Ce choix permet à un virement interne (retrait d'un compte, dépôt sur un autre) de rester cohérent avec une seule règle de calcul.

### Répartition du compte commun : JSONB

`repartitions_communes` stocke `revenus` et `depenses` en `JSONB` plutôt qu'en tables relationnelles strictes, car ce sont des instantanés figés (le nombre de lignes de revenus/dépenses est variable et jamais interrogé finement). Chaque entrée de `revenus` porte un `utilisateur_id` pour permettre le calcul du solde individuel restant à budgétiser. `est_active` désigne la répartition de référence courante (une seule à la fois, garanti par une transaction SQL qui désactive les autres avant d'activer la nouvelle).

### Modèles de transaction

Peuvent représenter soit une transaction classique (catégorie fixe, montant/moyen de paiement par défaut optionnels), soit un virement automatisé vers l'épargne (`est_virement_epargne`, avec compte et objectif cibles). `categorie_id` est nullable pour ce second cas, la vraie catégorie ("Épargne") étant résolue dynamiquement à l'exécution.

---

## Triggers et fonctions

| Nom | Déclencheur | Rôle |
|---|---|---|
| `verifier_coherence_type_categorie` | `BEFORE INSERT OR UPDATE ON categories` | Une sous-catégorie doit avoir le même type que son parent |
| `verifier_coherence_categorie_transaction` | `BEFORE INSERT OR UPDATE ON transactions` | La catégorie doit correspondre au type de la transaction |
| `verifier_coherence_categorie_modele` | `BEFORE INSERT OR UPDATE ON modeles_transactions` | Idem, tolère `categorie_id IS NULL` (virement épargne) |
| `categorie_et_descendants(id)` | Fonction (appelée via `LATERAL`) | Renvoie une catégorie et toutes ses descendantes |

---

## Contraintes de suppression (`ON DELETE`)

- `transactions.categorie_id` / `compte_id` → `RESTRICT` : impossible de supprimer une catégorie ou un compte tant que des transactions y sont rattachées (protection contre la perte d'historique). Un compte se supprime définitivement via une route dédiée qui vide d'abord ses données.
- `categories.parent_id` → `SET NULL` : les enfants remontent au rang de racine.
- `compte_utilisateurs`, `allocations_epargne.transaction_id`, `utilisateurs.foyer_id` → `CASCADE` / `SET NULL` selon le cas, pour ne jamais laisser de références orphelines bloquantes.

Voir `backend/src/migration.sql` pour le schéma SQL complet et exécutable.
