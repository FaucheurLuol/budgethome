-- ============================================================
-- Application Finance Personnelle - Lucas & Chloé
-- Schéma SQL - Modules 1 & 2 (Modélisation + Implémentation)
-- Ordre de création respectant les dépendances de clés étrangères
-- ============================================================

-- 1. Utilisateurs
CREATE TABLE utilisateurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL
);

-- 2. Comptes
CREATE TABLE comptes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    type_compte VARCHAR(30) NOT NULL CHECK (
        type_compte IN ('Compte courant', 'Livret A', 'PEL', 'LDD', 'Action', 'Crypto')
    ),
    solde_initial INTEGER NOT NULL,
    est_archive BOOLEAN NOT NULL DEFAULT FALSE
);

-- 3. Jonction Compte <-> Utilisateur (many-to-many : gère comptes perso ET partagés)
CREATE TABLE compte_utilisateurs (
    compte_id INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    PRIMARY KEY (compte_id, utilisateur_id)
);

-- 4. Catégories (auto-référencée pour gérer les sous-catégories à profondeur illimitée)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- 5. Transactions (single-table inheritance : dépense / revenu)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    montant INTEGER NOT NULL,
    description VARCHAR(255),
    moyen_paiement VARCHAR(30) NOT NULL CHECK (
        moyen_paiement IN ('CB', 'Virement', 'Especes', 'Prelevement', 'Cheque')
    ),
    categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    compte_id INTEGER NOT NULL REFERENCES comptes(id) ON DELETE RESTRICT,
    type_transaction VARCHAR(10) NOT NULL CHECK (type_transaction IN ('depense', 'revenu')),
    type_revenu VARCHAR(30) CHECK (type_revenu IN ('salaire', 'prime', 'caf', 'remboursement')),
    est_recurrente BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT coherence_type_revenu CHECK (
        (type_transaction = 'revenu' AND type_revenu IS NOT NULL)
        OR
        (type_transaction = 'depense' AND type_revenu IS NULL)
    )
);

-- 6. Budget par défaut (règle reconductible, par compte + catégorie)
CREATE TABLE budget_defaut (
    id SERIAL PRIMARY KEY,
    compte_id INTEGER NOT NULL REFERENCES comptes(id) ON DELETE RESTRICT,
    categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    montant_par_defaut INTEGER NOT NULL,

    CONSTRAINT unique_budget_defaut UNIQUE (compte_id, categorie_id)
);

-- 7. Budget mensuel (application réelle du défaut, modifiable mois par mois)
CREATE TABLE budget_mensuel (
    id SERIAL PRIMARY KEY,
    compte_id INTEGER NOT NULL REFERENCES comptes(id) ON DELETE RESTRICT,
    categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    mois DATE NOT NULL, -- convention : toujours le 1er jour du mois (ex: 2026-07-01)
    montant INTEGER NOT NULL,

    CONSTRAINT unique_budget_mensuel UNIQUE (compte_id, categorie_id, mois)
);

-- 8. Objectifs d'épargne
CREATE TABLE objectifs_epargne (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    montant_cible INTEGER NOT NULL CHECK (montant_cible > 0)
);

-- 9. Allocations d'épargne (flèchage d'une transaction vers un objectif)
CREATE TABLE allocations_epargne (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    objectif_id INTEGER NOT NULL REFERENCES objectifs_epargne(id) ON DELETE RESTRICT,
    montant_fleche INTEGER NOT NULL CHECK (montant_fleche > 0)
    -- Le sens (ajout/retrait) est déterminé par le type_transaction de la transaction liée
);

-- 10. Transactions simulées (mode projection, strictement séparé des données réelles)
CREATE TABLE transactions_simulees (
    id SERIAL PRIMARY KEY,
    compte_id INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
    categorie_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    date_prevue DATE NOT NULL,
    montant INTEGER NOT NULL,
    description VARCHAR(255),
    type_transaction VARCHAR(10) NOT NULL CHECK (type_transaction IN ('depense', 'revenu'))
);