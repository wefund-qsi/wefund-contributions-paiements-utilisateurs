# Analyse d’implémentation - Projet 2

Date: 17/03/2026  
Périmètre: microservice contributions / paiements / utilisateurs

## Résumé

Le socle Auth + Contributions est bien avancé.  
La partie Paiements est partiellement implémentée (création PaymentIntent, suivi transactionnel, webhook), mais l’orchestration métier de fin de campagne et les remboursements complets ne sont pas finalisés.  
La modération administrateur n’est pas implémentée.

En plus, la compilation ne passe pas dans l’état actuel (main.ts et dépendances résolues côté environnement).

## Vérification technique rapide

- Build exécuté: npm run build
- Résultat: échec
- Causes relevées:
  - erreur de syntaxe dans src/main.ts
  - modules Swagger et Stripe non résolus dans l’environnement au moment du build

## User Stories: état d’implémentation

### Story 1
En tant que contributeur, je peux financer une campagne afin de soutenir un projet.

Statut: Partiellement implémentée

Implémenté:
- création de contribution: POST /contribution
- création de PaymentIntent Stripe: POST /payment/intent
- vérification campagne active dans contribution et paiement

Manquant:
- orchestration fiable contribution <-> paiement
- validation forte de cohérence (contributionId, campagneId, montant, propriétaire)
- garantie transactionnelle bout en bout

### Story 2
En tant que contributeur, je peux consulter mes contributions afin de suivre mes engagements.

Statut: Implémentée

Implémenté:
- GET /contribution (liste des contributions utilisateur)
- GET /payment/contributions (historique transactions côté paiement)

### Story 3
En tant que système, je peux déclencher un remboursement si la campagne échoue.

Statut: Non implémentée en flux complet

Constat:
- PaymentProcessor existe mais méthodes TODO
- méthode refundPayment existe, mais pas branchée sur un vrai événement de clôture de campagne échouée

### Story 4
En tant que contributeur, je peux demander un remboursement de ma contribution afin de retirer mon soutien du projet.

Statut: Partiellement implémentée

Implémenté:
- DELETE /contribution/:id supprime la contribution si campagne active

Manquant:
- pas d’appel au remboursement Stripe lors de cette demande
- pas de traçabilité complète du remboursement demandé par utilisateur

### Story 5
En tant que contributeur, je peux modifier le montant de ma contribution tant que la campagne est active afin d’ajuster mon soutien au projet.

Statut: Implémentée

Implémenté:
- PATCH /contribution/:id
- contrôle propriétaire
- contrôle campagne active
- validation montant positif

### Story 6
En tant qu’utilisateur, je peux créer un compte afin d’utiliser la plateforme.

Statut: Implémentée

Implémenté:
- POST /auth/signup
- création User + Auth + Role
- mot de passe hashé

### Story 7
En tant qu’utilisateur, je peux m’authentifier afin d’accéder à mes fonctionnalités.

Statut: Implémentée

Implémenté:
- POST /auth/login
- émission JWT
- Guard Bearer pour routes protégées

### Story 8
En tant qu’administrateur, je peux modérer une campagne afin d’assurer la conformité.

Statut: Non implémentée

Constat:
- rôle ADMINISTRATEUR existe
- aucune route de modération
- aucun contrôle d’autorisation basé sur le rôle admin
- pas de flux acceptée/refusée côté campagne dans ce microservice

## Règles de gestion: couverture

### RG1
Une contribution est associée à un utilisateur, une campagne, un montant.

Statut: Couverte

### RG2
Une contribution est toujours datée.

Statut: Couverte (champ timestamp)

### RG3
Modification et annulation de contribution seulement si campagne active.

Statut: Couverte pour contribution (update/remove) et vérifiée aussi lors du paiement intent

### RG4
Les paiements et remboursements doivent être tracés.

Statut: Partiellement couverte

Implémenté:
- entité Transaction avec statuts
- webhooks Stripe qui mettent à jour les statuts

Manquant:
- traçabilité complète des remboursements déclenchés par les cas métier non connectés

### RG5
Les contributions restent en séquestre jusqu’au succès de campagne.

Statut: Partiellement couverte

Implémenté:
- capture_method manual (séquestre)

Manquant:
- capture automatique à la réussite campagne
- remboursement automatique à l’échec campagne

### RG6
Modération simple POC: acceptée ou refusée.

Statut: Non couverte

## Qualité et tests

- Peu de tests métier sur Auth et Controller (tests mostly should be defined)
- Quelques tests utiles sur ContributionService
- Pas de tests dédiés Paiement
- e2e minimal (route racine seulement)

## Écart documentation

Le fichier API_SPECS.md documente surtout Auth et Contribution, mais pas les endpoints Paiement présents dans le code.

## Ce qu’il reste à faire (priorité)

1. Corriger la compilation (main.ts + dépendances environnement)
2. Finaliser PaymentProcessor (success/failed campaign)
3. Brancher remboursement réel sur annulation/remboursement de contribution
4. Implémenter Story 8 et RG6 (modération admin acceptée/refusée)
5. Renforcer la cohérence contribution-paiement (intégrité des IDs, ownership, montants)
6. Ajouter tests unitaires et e2e sur Auth, Paiement et scénarios métier critiques
7. Mettre à jour API_SPECS.md pour aligner doc et implémentation
