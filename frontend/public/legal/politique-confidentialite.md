# Politique de confidentialité

**Dernière mise à jour : juillet 2026**

## Responsable du traitement

Lucas Baretzki, en tant que particulier, développeur et éditeur de l'application BudgetHome.
Contact : luol.baretzki@gmail.com

## Données collectées

BudgetHome collecte et traite les données suivantes, saisies volontairement par vous :

- **Compte utilisateur** : nom, adresse email, mot de passe (haché, jamais stocké en clair)
- **Données financières** : comptes bancaires (nom, type, solde), transactions (date, montant, description, catégorie), budgets, objectifs d'épargne, simulations de répartition du foyer
- **Préférences** : thème d'affichage (clair/sombre)
- **Foyer** : appartenance à un foyer (code d'invitation) permettant le partage de certaines données avec les membres du même foyer

Aucune donnée de paiement (carte bancaire, IBAN) n'est collectée : BudgetHome n'est pas connecté à vos comptes bancaires réels, vous saisissez manuellement les montants.

## Finalité du traitement

Ces données sont utilisées exclusivement pour le fonctionnement de l'application : afficher vos comptes et transactions, calculer vos budgets et la progression de vos objectifs d'épargne, et permettre le partage de certaines données avec les membres de votre foyer si vous le choisissez.

## Partage des données

Vos données ne sont **jamais partagées avec des tiers**, ne sont **jamais vendues**, et ne servent à aucune finalité publicitaire. Seules les données que vous choisissez explicitement de partager (comptes communs, catégories et objectifs marqués comme "communs") sont visibles par les membres de votre foyer.

## Sous-traitants techniques

Vos données transitent et sont stockées chez :
- **Railway** (hébergement de la base de données et du serveur applicatif, États-Unis)
- **Vercel** (hébergement de l'interface, États-Unis)
- **Sentry** (suivi technique des erreurs applicatives — ne reçoit que des informations techniques sur les bugs, jamais vos données financières)

## Durée de conservation

Vos données sont conservées tant que votre compte existe. Vous pouvez à tout moment demander leur export ou leur suppression définitive (voir ci-dessous).

## Vos droits (RGPD)

Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :

- **Droit d'accès** : exporter l'intégralité de vos données personnelles au format JSON, depuis la page Profil de l'application.
- **Droit à l'effacement** : supprimer définitivement votre compte et toutes les données associées, depuis la page Profil de l'application (confirmation par mot de passe et saisie explicite requise).
- **Droit de rectification** : modifier à tout moment vos informations (mot de passe, thème) et vos données financières directement depuis l'application.
- **Droit à la portabilité** : l'export JSON fourni est structuré et réutilisable.

**Limite technique connue** : si vous possédez un compte partagé ou un objectif d'épargne commun avec un autre membre de votre foyer, la suppression de votre compte est bloquée tant que ces liens n'ont pas été rompus (en quittant le compte partagé, ou en supprimant/rendant individuel l'objectif concerné), afin de ne pas perturber les données de l'autre personne.

Pour toute question relative à vos droits, contactez : luol.baretzki@gmail.com

## Sécurité

BudgetHome met en œuvre les mesures de sécurité suivantes : mots de passe hachés (bcrypt), authentification par cookie sécurisé (httpOnly, Secure), limitation du nombre de tentatives de connexion, validation stricte des données saisies, isolation stricte des données entre foyers différents.

## Cookies

BudgetHome utilise un unique cookie technique, strictement nécessaire au fonctionnement du service : un cookie de session (httpOnly, sécurisé) permettant de vous maintenir connecté. Aucun cookie de mesure d'audience ou publicitaire n'est utilisé.