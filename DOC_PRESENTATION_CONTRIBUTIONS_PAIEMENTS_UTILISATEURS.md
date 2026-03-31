# WeFund - Dossier de presentation
## Projet Contributions / Paiements / Utilisateurs

Version: 30/03/2026

---

## 1) Resume executif

Le projet **Contributions / Paiements / Utilisateurs** est le microservice qui couvre:
- l'inscription et l'authentification des utilisateurs,
- la gestion des contributions aux campagnes,
- l'orchestration des paiements Stripe (mode sequestre/capture manuelle),
- la communication inter-services autour du cycle de vie des campagnes.

Le socle fonctionnel est deja exploitable pour un POC, avec une base solide sur Auth, Contributions, et une partie Paiements. Les flux automatiques de fin de campagne sont presents dans le code (capture/remboursement), mais il reste des chantiers de consolidation pour un passage production.

---

## 2) Contexte produit

### Objectif metier
Permettre a des contributeurs de financer des campagnes en toute securite, avec:
- un parcours utilisateur simple,
- une tracabilite des transactions,
- des regles metier pour proteger les fonds tant que la campagne n'est pas validee/reussie.

### Place dans l'ecosysteme WeFund
Ce service travaille avec:
- le microservice Projets (etat de campagne, moderation, soumission),
- l'infrastructure de persistence PostgreSQL,
- Stripe Sandbox pour les paiements,
- Kafka pour les evenements inter-services.

---

## 3) Proposition de valeur

- **Fiabilite metier**: controle des statuts de campagne avant contribution/paiement.
- **Securite**: JWT, hashage des mots de passe, routes protegees.
- **Conformite POC**: stories principales d'authentification et contribution couvertes.
- **Scalabilite**: architecture modulaire NestJS + communication event-driven (Kafka).

---

## 4) Perimetre fonctionnel

### Parcours couverts
1. Creation de compte utilisateur (`signup`)
2. Connexion (`login`) + recuperation de profil (`profile`)
3. Creation d'une contribution
4. Consultation des contributions
5. Modification d'une contribution
6. Annulation d'une contribution
7. Creation d'un PaymentIntent Stripe
8. Consultation des transactions de paiement
9. Reception des webhooks Stripe
10. Moderation/soumission de campagne (admin via proxy vers service Projets)

### User Stories (etat)
- US1 Financer une campagne: **partiellement couverte** (contribution + payment intent OK)
- US2 Consulter ses contributions: **couverte**
- US3 Remboursement auto campagne echouee: **couverte dans le flux code (Kafka + service paiement), a valider en E2E**
- US4 Demander remboursement: **partiellement couverte** (annulation + tentative remboursement)
- US5 Modifier montant contribution: **couverte**
- US6 Creer un compte: **couverte**
- US7 Authentification: **couverte**
- US8 Moderation admin: **couverte cote endpoint/service, dependante du contrat service Projets**

---

## 5) Architecture technique

### Stack
- Langage: TypeScript
- Runtime: Node.js 24
- Framework: NestJS
- ORM: TypeORM
- Base de donnees: PostgreSQL
- Paiements: Stripe
- Messaging: Kafka (transport Nest microservices)
- Documentation API: Swagger (`/api/docs`)

### Architecture logique
- `auth`: inscription, login, JWT, profil
- `contribution`: CRUD metier des contributions
- `payment`: creation intent, suivi transactions, webhooks, remboursements/captures
- `campagnes`: moderation/soumission (orientation admin)
- `projects`: client HTTP vers microservice Projets
- `kafka`: consommation des evenements de cloture/moderation

### Flux de bout en bout (simplifie)
1. L'utilisateur cree une contribution
2. L'utilisateur initialise le paiement Stripe (`capture_method = manual`)
3. Les transactions sont suivies en base (`pending`, `authorized`, `captured`, `refunded`, `failed`)
4. En fin de campagne:
- succes -> capture des fonds
- echec/refus -> remboursement (refund/cancel)

---



## 7) Pratiques de code adoptees

### Pratiques deja en place
- Separation claire `controller -> service -> persistence`
- Validation des entrees par DTO et pipes globaux
- Gestion d'erreurs explicite avec exceptions NestJS (`BadRequestException`, `ForbiddenException`, etc.)
- Configuration externalisee via variables d'environnement

### Pratiques de robustesse
- Verification de la propriete utilisateur avant update/delete
- Verification de coherence entre contribution, campagne et paiement
- Gestion des statuts transactionnels explicites (`pending`, `authorized`, `captured`, `refunded`, `failed`)

### Pratiques a renforcer (recommande)
- Standardiser les conventions de reponse API sur tous les modules
- Ajouter des revues de code ciblees sur la dette technique
- Renforcer les controles d'idempotence sur tous les parcours de paiement

---

## 8) Design patterns utilises

### Patterns principaux identifies
- **Dependency Injection** (natif NestJS): injection des services/repositories pour reduire le couplage
- **Repository Pattern** (TypeORM): acces aux entites via repositories
- **Adapter Pattern**: `projects-api.client` adapte les contrats HTTP externes au domaine interne
- **Facade de module**: chaque module Nest expose une surface claire (Auth, Contribution, Payment, Campagnes)
- **Event-Driven Pattern**: consommation d'evenements Kafka pour orchestrer capture/remboursement

### Benefices
- Code plus testable et maintenable
- Remplacement plus simple des integrations externes
- Evolution fonctionnelle plus rapide sans refonte globale

---

## 9) API exposee (pour slide "Capacites API")

### Auth
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/profile` (JWT)

### Contributions (JWT)
- `POST /api/contribution`
- `GET /api/contribution`
- `PATCH /api/contribution/:id`
- `DELETE /api/contribution/:id`

### Paiements
- `POST /api/payment/intent` (JWT)
- `GET /api/payment/contributions` (JWT)
- `POST /api/payment/webhook` (public Stripe)

### Campagnes (admin/JWT)
- `PATCH /api/campagnes/:id/moderer`
- `POST /api/campagnes/:id/soumettre`

---

## 10) Donnees et modele

### Entites principales
- `User`: identite utilisateur (nom, prenom, username)
- `Auth`: credentiel et mot de passe hashe
- `Role`: role metier (ex: ADMINISTRATEUR, USER)
- `Contribution`: montant, campagne cible, contributeur, date
- `Transaction`: paymentIntent Stripe, statut, lien contribution, campagne, contributeur

### Regles metier importantes
- Une contribution est liee a un utilisateur + campagne + montant
- Modification/annulation reservees au proprietaire
- Actions conditionnees par le statut de campagne
- Paiement en sequestre via capture manuelle Stripe
- Historique transactionnel conserve

---

## 11) Securite, qualite, observabilite

### Securite
- JWT pour les routes protegees
- Hashage des mots de passe (`bcrypt`)
- Validation d'entrees (DTO + validation globale)
- CORS configurable

### Qualite
- Tests unitaires et integration presents (auth, contribution, payment)
- Jest en outillage principal
- Scenarios d'integration DB PostgreSQL disponibles

### Observabilite
- Logs applicatifs sur les flux critiques (paiement, evenements campagne)
- Swagger pour exploration et validation API

---

## 12) Qualite de code (detail)

### Standards de developpement
- TypeScript en mode strict pour limiter les erreurs a l'execution
- Architecture modulaire NestJS pour separer clairement les responsabilites
- DTO + validation pour securiser les entrees API
- Conventions de nommage homogenes sur modules, services et controllers

### Outils qualite
- ESLint pour detecter les anti-patterns et erreurs statiques
- Prettier pour uniformiser le style de code
- Scripts NPM dedies: `npm run lint`, `npm run format`, `npm run build`


---

## 13) Strategie de tests (detail)

### Approche
- Tests unitaires pour valider la logique metier des services
- Tests d'integration pour valider les parcours API + base PostgreSQL
- Tests end-to-end pour verifier les parcours critiques utilisateur

### Zones deja couvertes
- Authentification: signup, login, controle des erreurs
- Contributions: creation, modification, suppression, regles de propriete
- Paiements: creation de transaction, protections anti incoherences, remboursement

### Scenarios critiques a presenter
- Refus d'une contribution si campagne non active
- Blocage des modifications si utilisateur non proprietaire
- Prevention des doubles transactions pour une meme contribution
- Mise a jour du statut transactionnel via webhooks Stripe

### Plan de renforcement tests
- Ajouter des tests E2E sur les evenements Kafka de cloture de campagne
- Ajouter des tests de resilience sur indisponibilite service Projets
- Mettre un seuil de couverture minimal et suivi dans la CI

### Commandes utiles
- `npm run test`
- `npm run test:integration`
- `npm run test:cov`

---

## 14) Dependances externes et variables d'environnement

### Infrastructures minimales
- PostgreSQL (local: `5432`)
- Stripe Sandbox (secret key + webhook secret)
- Kafka (optionnel via `KAFKA_ENABLED=false` en local)

### Variables clefs
- DB: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`
- Auth: `JWT_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Projets API: `PROJECTS_API_BASE_URL`, `PROJECTS_API_TIMEOUT_MS`, `PROJECTS_MODERATION_PATH`, `PROJECTS_MODERATION_FALLBACK_PATH`, `PROJECTS_SUBMIT_PATH`
- Kafka: `KAFKA_ENABLED`, `KAFKA_BROKERS`, `KAFKAJS_NO_PARTITIONER_WARNING`

---

## 15) Points d'attention / risques a presenter

1. **Coherence documentaire**
- Certaines docs haut niveau mentionnent RabbitMQ, alors que le code actif utilise Kafka.

2. **Maturite POC vs production**
- Le noyau fonctionnel est bon pour demo/POC.
- Le hardening production (contrats inter-services stabilises, couverture E2E complete, supervision avancee) reste a finaliser.

3. **Dependance au service Projets**
- Les parcours moderation/soumission et verifications de campagne dependent du contrat HTTP expose par Projets.

4. **Gestion des secrets**
- Les secrets Stripe/JWT doivent etre externalises via un coffre de secrets en environnement reel.

---

## 16) Roadmap recommandee (prochain sprint)

### Priorite 1 (stabilisation)
- Aligner toute la documentation sur Kafka (retirer ambiguite RabbitMQ)
- Verrouiller les contrats API avec le service Projets
- Renforcer les tests E2E sur flux de fin de campagne (success/failed)

### Priorite 2 (fiabilisation)
- Ajouter tableaux de bord de suivi transactions et erreurs webhooks
- Renforcer la gestion des erreurs/reprises sur consommateurs Kafka
- Ajouter controles anti-double paiement et idempotence globale

### Priorite 3 (preparation production)
- Pipeline CI/CD complet (lint, tests, build, securite)
- Strategie de migration DB et versioning API
- Monitoring, alerting, runbook incidents

---

## 17) Materiel pret-a-slides (structure PowerPoint conseilee)

1. Vision et objectif du microservice
2. Probleme metier adresse
3. Parcours utilisateur principal
4. Architecture globale et integrations
5. Capacites API exposees
6. Securite et conformite
7. Etat d'avancement (stories)
8. Demo technique (happy path)


---

## 18) Script de demo (5-7 minutes)

1. Signup + Login
2. Creation d'une contribution
3. Creation d'un PaymentIntent
4. Visualisation des contributions/transactions
5. Exemple de moderation admin (si service Projets disponible)
6. Navigation Swagger (`/api/docs`)

Message final a passer:
- "Le service est deja operationnel pour les parcours coeur du POC et structure pour evoluer rapidement vers un niveau production."

---

## 19) Annexes (commande utiles)

```bash
# Installation
npm install

# Demarrage dev
npm run start:dev

# Build
npm run build

# Tests
npm run test
npm run test:integration

# Lint
npm run lint
```

```bash
# Infra PostgreSQL/pgAdmin (depuis la racine du projet contributions-paiements-utilisateurs)
docker compose up -d
```

---

## 20) Conclusion

Le projet Contributions / Paiements / Utilisateurs est bien positionne pour une presentation client/interne: il demontre de vraies capacites metier, une architecture propre et des integrations concretes. Les prochaines iterations doivent surtout viser la standardisation documentaire, la robustesse inter-services et la preparation production.
