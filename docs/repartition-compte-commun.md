# Répartition du compte commun

Module métier central de BudgetHome, équivalent en importance au générateur de plans d'entraînement de RunTrack — logique la plus spécifique au projet, isolée dans son propre service pour rester testable et évolutive.

## Principe

Un couple qui alimente un compte commun a besoin de savoir combien chacun doit y verser chaque mois. La règle retenue : **chacun contribue au prorata de ses revenus**.

```
part_a_verser(personne) = (revenu(personne) / revenu_total_foyer) × depenses_totales_communes
```

## Ce que ce module n'est pas

Contrairement à l'intuition initiale du projet, ce n'est **pas** un calcul automatique basé sur l'historique réel des transactions. C'est un **simulateur manuel** : le couple saisit lui-même les revenus (par personne, potentiellement plusieurs sources : salaire, CAF, prime...) et les dépenses communes prévues, et le module renvoie la répartition. Ce choix a été fait après réflexion : automatiser le calcul à partir des transactions réelles aurait nécessité une définition rigide et anticipée de "revenu du foyer" et "dépense commune", alors que le couple veut pouvoir ajuster librement ses hypothèses avant que le mois ne soit passé.

## Service isolé : `repartitionCompteCommun.js`

```js
function calculerRepartition(revenus, depenses) {
  // revenus : [{ utilisateur_id, personne, source, montant }, ...]
  // depenses : [{ nom, montant }, ...]
  // -> { revenu_total, depenses_totales, repartition: [{ nom, revenu, part_a_verser }, ...] }
}
```

Fonction **pure**, sans aucun accès base de données — testable unitairement, indépendante du reste de l'application. Les revenus sont d'abord **regroupés par personne** (une même personne peut avoir plusieurs sources : Salaire + CAF), puis le prorata s'applique sur le total consolidé de chacun.

## Historisation et activation

Chaque calcul est stocké dans `repartitions_communes` (JSONB pour `revenus`/`depenses`/`resultat`), avec un flag `est_active` : une seule répartition peut être "active" à la fois pour le foyer (celle qui sert de référence courante, affichée en tête de page et utilisée par les modules qui en dépendent). L'activation désactive atomiquement les autres via une transaction SQL.

## Modules dépendants

- **Solde restant à budgétiser** (`GET /budgets/solde-restant`) : à partir de la répartition active, calcule combien il reste à une personne sur son compte perso une fois sa part versée au compte commun et ses budgets déjà posés déduits. Recalculé à chaque ajout de budget.
- **Création de modèle depuis la répartition** : un bouton par personne (actif uniquement pour l'utilisateur connecté, par cloisonnement d'accès aux comptes) crée ou met à jour un modèle de transaction "Virement vers compte commun" avec le montant `part_a_verser` calculé, prêt à être appliqué en un clic sur la page Transactions.

## Lien avec le foyer et les revenus par personne

Chaque entrée de `revenus` porte un `utilisateur_id` réel (sélectionné dans un menu déroulant des membres du foyer, plutôt qu'un champ texte libre) — ce lien permet au module de solde restant de savoir précisément quels revenus appartiennent à l'utilisateur connecté, sans ambiguïté de nom.

## Historique de conception

Ce module a évolué en plusieurs étapes au fil du développement :
1. Calcul automatique basé sur les transactions réelles du compte commun (abandonné)
2. Simulateur manuel simple (une ligne de revenu par personne)
3. Ajout du multi-source (plusieurs revenus par personne, ex. Salaire + CAF)
4. Ajout de l'historisation et de l'activation
5. Lien vers un utilisateur réel plutôt qu'un nom en texte libre (pour le calcul du solde restant)
6. Bouton de création automatique de modèle de virement depuis une répartition active
