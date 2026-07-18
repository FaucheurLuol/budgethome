# Journal de développement

Résumé chronologique des grandes étapes et décisions structurantes du projet BudgetHome, dans l'esprit d'un journal d'apprentissage plutôt que d'un changelog exhaustif.

## Module 1-2 — Modélisation et implémentation SQL

Modélisation UML par questions-réponses guidées : identification du besoin de comptes many-to-many (perso vs partagé), catégories auto-référencées, single-table inheritance pour les transactions, séparation budget par défaut / mensuel, allocations d'épargne avec sens porté par le type de transaction, isolation stricte simulation/réel (finalement fusionnée avec un flag plutôt qu'une table séparée, voir plus bas).

Apprentissages clés : contrainte `NOT NULL` sur colonne ajoutée après coup, transactions SQL (`BEGIN`/`COMMIT`/`ROLLBACK`), triggers PostgreSQL, fonction récursive (`WITH RECURSIVE`), `LATERAL JOIN`.

## Module 3 — Setup du projet

Repo unique (contrairement à RunTrack qui séparait un repo privé pour l'algorithme propriétaire) — pas de logique jugée sensible à isoler ici. Structure de dossiers reprise à l'identique de RunTrack.

## Backend complet

Construction ressource par ressource : auth (JWT + bcrypt), comptes, catégories, transactions, budgets, objectifs, modèles, répartition, dashboard. Découverte progressive de règles métier en cours de route (ex : un virement vers l'épargne n'est pas budgétisable comme une catégorie classique, un retrait d'épargne doit obligatoirement être fléché vers un objectif pour ne pas fausser sa progression).

## Frontend complet

Vitrine publique → authentification → layout adaptatif (header public / sidebar connectée) → pages métier une par une. Design system construit dès le départ (palette ardoise/doré, typographie Fraunces/Work Sans) plutôt qu'ajouté a posteriori.

## Refonte : simulations fusionnées dans `transactions`

Décision initiale : table `transactions_simulees` séparée, jamais mélangée aux données réelles. Revu en cours de route : le besoin réel était de voir l'impact d'une simulation sur les KPI **du mois courant** (anticipation de fin de mois), tout en l'excluant des vues historiques/annuelles. Solution retenue : un flag `est_simulee` sur `transactions`, plutôt qu'une table séparée — compromis entre isolation et utilité.

## Refonte : foyer et cloisonnement multi-couples

Problème identifié tardivement (avant déploiement) : sans notion de foyer, tout utilisateur inscrit sur l'application verrait la liste complète des autres utilisateurs (`GET /utilisateurs`), ouvrant une fuite d'information et un risque d'ajout non consenti à des comptes partagés. Solution : système de foyer avec code d'invitation généré aléatoirement, rejoint après inscription via une page Profil. Catégories et objectifs d'épargne étendus au même principe de partage (`foyer_id` nullable, repli sur `utilisateur_id` seul si pas de foyer).

## Import de données historiques

Import ponctuel d'un relevé bancaire de ~600 lignes (Excel), avec construction assistée d'un arbre de catégories à partir des libellés bruts, puis simplification a posteriori (35+ catégories jugées trop nombreuses, ramenées à 21). Détection et correction d'erreurs de saisie de date dans le fichier source (inversions jour/mois, année erronée sur un lot de lignes) par analyse de cohérence chronologique.

## Sécurité et déploiement

Ajout d'une couche de sécurité avant mise en production : validation stricte côté serveur (ne jamais faire confiance au frontend seul), rate limiting sur l'authentification, en-têtes de sécurité (`helmet`), restriction CORS à l'origine du frontend, externalisation des secrets et de l'URL d'API en variables d'environnement. Déploiement Railway (backend + PostgreSQL) / Vercel (frontend), avec script de migration versionné (`migrate.js`) plutôt qu'une exécution manuelle ponctuelle.

## Bonnes pratiques retenues tout au long du projet

- Toujours dupliquer la validation critique côté serveur, même si elle existe déjà côté client.
- Une contrainte `RESTRICT` protège contre la suppression accidentelle ; une route de suppression définitive dédiée gère le cas volontaire (avec confirmation utilisateur).
- Isoler la logique métier pure (calcul de répartition) de l'accès aux données, pour la garder testable indépendamment.
- Committer à chaque étape validée, pas en fin de session — historique Git qui reflète la progression réelle plutôt qu'un état final opaque.
