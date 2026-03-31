# WeFund — Service Utilisateurs, Contributions & Paiements

Microservice NestJS gérant les utilisateurs, les contributions et les paiements Stripe pour la plateforme WeFund.

**Stories couvertes :** 1 (financer), 2 (consulter), 3 (remboursement auto), 4 (remboursement manuel), 5 (modifier montant), 6 (créer compte), 7 (authentification), 8 (modération admin).

---

## Prérequis

- Node.js >= 18
- Docker & Docker Compose (pour PostgreSQL)
- Un compte Stripe (clés sandbox)

---

## Installation

```bash
npm install
```

---

## Configuration

Créer un fichier `.env` à la racine du dossier `utilisateurs/` :

```bash
# Base de données
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=wefund_db

# JWT
JWT_SECRET=changeme

# Stripe (clés sandbox)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Microservice Projets (Projet 1)
PROJECTS_API_BASE_URL=http://localhost:3000/api
PROJECTS_API_TIMEOUT_MS=5000
PROJECTS_MODERATION_PATH=/campagnes/:id/moderer
PROJECTS_MODERATION_FALLBACK_PATH=/campagnes/:id

# Kafka
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# Optionnel
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**Notes importantes :**
- Si ce service tourne sur le port `3001`, ne pas mettre `PROJECTS_API_BASE_URL=http://localhost:3001/api` (boucle d'appel sur `/campagnes/:id/moderer`).
- Si le microservice Projets expose une autre route de modération, ajuster `PROJECTS_MODERATION_PATH`.
- Si Kafka n'est pas disponible en local, mettre `KAFKA_ENABLED=false` pour lancer uniquement l'API HTTP.
- Si Docker Compose utilise un broker nommé `redpanda`, utiliser `KAFKA_BROKERS=redpanda:9092`.

---

## Lancer l'application

### 1. Démarrer PostgreSQL via Docker

```bash
docker-compose up -d
```

### 2. Lancer le serveur

```bash
# Développement (hot reload)
npm run start:dev

# Production
npm run start:prod
```

Le serveur démarre sur `http://localhost:3000/api`.

---

## Swagger

La documentation interactive est disponible sur :

```
http://localhost:3000/api/docs
```

---

## Tests

```bash
# Tests unitaires
npm run test

# Tests unitaires en watch
npm run test:watch

# Tests d'intégration
npm run test:integration

# Tests e2e
npm run test:e2e

# Couverture
npm run test:cov
```

---

## Documentation API

Voir [API_SPECS.md](./API_SPECS.md) pour la documentation complète des endpoints.
