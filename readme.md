# 💳 WeFund — Microservice Contributions / Paiements / Utilisateurs

> **Projet 2** du POC WeFund — Gestion des contributions financières, paiements et comptes utilisateurs.  
> Stack : **TypeScript · Node.js 24 · NestJS · PostgreSQL · RabbitMQ · Stripe Sandbox**

---

## 📦 Stack technique

| Couche | Technologie |
|---|---|
| Langage | TypeScript (strict) |
| Runtime | Node.js 24 |
| Framework | **NestJS** |
| Base de données | PostgreSQL |
| ORM | Prisma / TypeORM *(recommandé)* |
| Message broker | RabbitMQ |
| Paiements | Stripe Sandbox |
| Conteneurisation | Docker / Docker Compose |
| Déploiement | Render.com *(recommandé)* |

---

## ✅ Checklist — Fonctionnalités (User Stories)

### 👤 Gestion des utilisateurs
- [X] **US6** — Créer un compte utilisateur (inscription)
- [X] **US7** — S'authentifier (login / JWT)
- [X] Hachage sécurisé des mots de passe (bcrypt ou argon2)
- [X] Middleware d'authentification (guard JWT)
- [X] Gestion des rôles : `contributeur`, `porteur_de_projet`, `administrateur`

### 💰 Contributions
- [ ] **US1** — Financer une campagne (créer une contribution)
- [ ] **US2** — Consulter ses contributions (historique personnel)
- [ ] **US4** — Demander le remboursement d'une contribution
- [ ] **US5** — Modifier le montant d'une contribution (si campagne active)

### 🤖 Automatisation système
- [ ] **US3** — Déclencher automatiquement les remboursements si la campagne échoue
- [ ] Écoute des événements RabbitMQ `campaign.closed.failed` → remboursement en masse
- [ ] Écoute des événements RabbitMQ `campaign.closed.success` → libération des fonds séquestre

### 🛡️ Modération (Admin)
- [ ] **US8** — Accepter ou refuser une campagne (modération simple)
- [ ] Publier un événement RabbitMQ `campaign.moderated` vers le microservice projets

---

## ✅ Checklist — Règles de gestion

- [ ] **RG1** — Une contribution est associée à un utilisateur, une campagne et un montant
- [ ] **RG2** — Une contribution est toujours horodatée (`created_at`)
- [ ] **RG3** — Modification / annulation bloquées si la campagne n'est pas `active`
- [ ] **RG4** — Tous les paiements et remboursements sont tracés (table `payment_logs`)
- [ ] **RG5** — Les fonds restent en séquestre jusqu'au succès de la campagne (le porteur ne reçoit rien avant)
- [ ] **RG6** — Modération simple : `accepted` ou `refused` (pas de commentaire ni notification)

---

## ✅ Checklist — Architecture & Qualité

### 🏗️ Architecture
- [ ] Architecture hexagonale (domain / application / infrastructure)
- [ ] Approche **contract-first** : fichier OpenAPI (`openapi.yaml`) défini avant le code
- [ ] Communication **synchrone** via API REST (routes publiques/protégées)
- [ ] Communication **asynchrone** via RabbitMQ pour les événements inter-services
- [ ] Séparation claire des couches : controllers → use cases → repositories

### 🧪 Tests
- [ ] Tests unitaires (use cases / domain logic)
- [ ] Tests d'intégration (endpoints REST)
- [ ] Coverage minimum documenté

### 🔒 Sécurité
- [ ] Variables d'environnement via `.env` (jamais de secrets dans le code)
- [ ] Validation des entrées (DTO + class-validator ou zod)
- [ ] Typage strict TypeScript (`strict: true` dans `tsconfig.json`)

### 📊 Observabilité
- [ ] Logging structuré (JSON) avec niveaux `info`, `warn`, `error`
- [ ] Logs des événements RabbitMQ publiés / consommés
- [ ] Logs des transactions Stripe (sandbox)

### 🐳 Infrastructure
- [ ] `Dockerfile` pour le service
- [ ] `docker-compose.yml` incluant PostgreSQL + RabbitMQ
- [ ] Variables d'environnement documentées dans `.env.example`
- [ ] Service déployé sur Render.com (ou équivalent) avec URL accessible

---

## ✅ Checklist — Livrables

- [ ] Repository Git public (GitHub ou GitLab)
- [ ] `README.md` à jour avec instructions de démarrage local
- [ ] Fichier `openapi.yaml` / Swagger UI accessible sur `/api-docs`
- [ ] `.env.example` renseigné
- [ ] URL de déploiement fonctionnelle communiquée au client
- [ ] Documentation des prompts IA utilisés (si applicable)

---

## 🚀 Démarrage local

```bash
# 1. Cloner le repo
git clone <url-du-repo>
cd projet2-contributions

# 2. Configurer les variables d'environnement
cp .env.example .env
# Renseigner DATABASE_URL, STRIPE_SECRET_KEY, RABBITMQ_URL, JWT_SECRET

# 3. Lancer l'infrastructure
docker compose up -d

# 4. Appliquer les migrations
npx prisma migrate dev   # ou équivalent ORM

# 5. Démarrer le service NestJS
npm run start:dev
```

---

## 🐘 Base de données

Démarrer la base de données

```bash
docker compose up -d
```

Se connecter à la base de données

```bash
docker exec -it we-fund-db psql -U postgres -d wefund_db
```

Voir les logs de la base de données

```bash
docker compose logs -f postgres
```

Arrêter la base de données

```bash
docker compose down
```

---

## 📡 Événements RabbitMQ

| Événement | Direction | Description |
|---|---|---|
| `campaign.moderated` | **Publié** | Résultat de la modération admin |
| `campaign.closed.success` | **Consommé** | Libère les fonds vers le porteur |
| `campaign.closed.failed` | **Consommé** | Déclenche les remboursements |

---

## 🗃️ Schéma de base de données (aperçu)

```
users            contributions       payment_logs
─────────        ─────────────       ────────────
id               id                  id
email            user_id (FK)        contribution_id (FK)
password_hash    campaign_id         type (payment|refund)
role             amount              amount
created_at       status              stripe_ref
                 created_at          created_at
```

---

*POC WeFund — Date cible : fin mars 2026 | MVP : septembre 2026*
