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

-- 4. Catégories (auto-référencée + propre à chaque utilisateur + typée dépense/revenu)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type_categorie VARCHAR(10) NOT NULL DEFAULT 'depense' CHECK (type_categorie IN ('depense', 'revenu'))
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
    est_recurrente BOOLEAN NOT NULL DEFAULT FALSE,
    est_simulee BOOLEAN NOT NULL DEFAULT FALSE
    -- est_simulee : transaction hypothétique (mode simulation). Comptée dans les
    -- KPI/budgets du mois courant pour anticiper la fin de mois, mais à exclure
    -- des vues historiques/annuelles (WHERE est_simulee = FALSE).
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
    montant_cible INTEGER NOT NULL CHECK (montant_cible > 0),
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- 9. Allocations d'épargne (flèchage d'une transaction vers un objectif)
CREATE TABLE allocations_epargne (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    objectif_id INTEGER NOT NULL REFERENCES objectifs_epargne(id) ON DELETE RESTRICT,
    montant_fleche INTEGER NOT NULL CHECK (montant_fleche > 0)
    -- Le sens (ajout/retrait) est déterminé par le type_transaction de la transaction liée
);

-- 10. Modèles de transactions (templates pour saisie rapide des dépenses récurrentes)
CREATE TABLE modeles_transactions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    compte_id INTEGER NOT NULL REFERENCES comptes(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    categorie_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    montant INTEGER,
    type_transaction VARCHAR(10) NOT NULL CHECK (type_transaction IN ('depense', 'revenu')),
    moyen_paiement VARCHAR(30) CHECK (moyen_paiement IN ('CB', 'Virement', 'Especes', 'Prelevement', 'Cheque')),
    -- Virement automatisé vers l'épargne : categorie_id devient inutile (la vraie
    -- transaction utilisera la catégorie "Épargne (auto)"), remplacé par ces champs.
    est_virement_epargne BOOLEAN NOT NULL DEFAULT FALSE,
    compte_epargne_id INTEGER REFERENCES comptes(id) ON DELETE SET NULL,
    objectif_id INTEGER REFERENCES objectifs_epargne(id) ON DELETE SET NULL
);

-- 11. Répartitions du compte commun (simulateur manuel, historisé)
-- Module indépendant : ne lit aucune donnée des tables ci-dessus, sert d'outil
-- de simulation pour déterminer les virements à faire vers le compte commun.
CREATE TABLE repartitions_communes (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
    mois DATE NOT NULL,
    revenus JSONB NOT NULL,
    depenses JSONB NOT NULL,
    resultat JSONB NOT NULL,
    est_active BOOLEAN NOT NULL DEFAULT FALSE,
    cree_le TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Triggers de cohérence sur le type de catégorie
-- ============================================================

-- Une sous-catégorie doit avoir le même type_categorie que son parent
CREATE OR REPLACE FUNCTION verifier_coherence_type_categorie()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF (SELECT type_categorie FROM categories WHERE id = NEW.parent_id) != NEW.type_categorie THEN
      RAISE EXCEPTION 'Le type de la sous-catégorie doit correspondre au type de sa catégorie parente.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_coherence_type_categorie
BEFORE INSERT OR UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION verifier_coherence_type_categorie();

-- Le type_categorie de la catégorie liée doit correspondre au type_transaction
CREATE OR REPLACE FUNCTION verifier_coherence_categorie_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT type_categorie FROM categories WHERE id = NEW.categorie_id) != NEW.type_transaction THEN
    RAISE EXCEPTION 'Le type de la catégorie ne correspond pas au type de la transaction.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_coherence_categorie_transaction
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION verifier_coherence_categorie_transaction();

-- Le type_categorie de la catégorie liée doit correspondre au type_transaction du modèle
-- (ignoré si categorie_id est NULL, cas d'un modèle de virement automatisé vers l'épargne)
CREATE OR REPLACE FUNCTION verifier_coherence_categorie_modele()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.categorie_id IS NOT NULL THEN
    IF (SELECT type_categorie FROM categories WHERE id = NEW.categorie_id) != NEW.type_transaction THEN
      RAISE EXCEPTION 'Le type de la catégorie ne correspond pas au type du modèle.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_coherence_categorie_modele
BEFORE INSERT OR UPDATE ON modeles_transactions
FOR EACH ROW
EXECUTE FUNCTION verifier_coherence_categorie_modele();

-- ============================================================
-- Fonction récursive : une catégorie et toutes ses descendantes
-- Utilisée pour agréger les dépenses des sous-catégories dans le
-- suivi budgétaire (un budget posé sur une catégorie parente doit
-- inclure les dépenses de ses sous-catégories).
-- ============================================================

CREATE OR REPLACE FUNCTION categorie_et_descendants(categorie_id_arg INTEGER)
RETURNS TABLE(id INTEGER) AS $$
  WITH RECURSIVE arbre AS (
    SELECT id FROM categories WHERE id = categorie_id_arg
    UNION ALL
    SELECT c.id FROM categories c JOIN arbre a ON c.parent_id = a.id
  )
  SELECT id FROM arbre;
$$ LANGUAGE sql STABLE;