# Service Utilisateurs - API

## Base URL
- Accès en direct: `http://localhost:3000/api`

> Toutes les routes documentées ci-dessous sont préfixées par `/api`.

## Authentification
- Content-Type attendu dans l'en-tête `Content-Type: application/json` pour tous les routes
- Routes publiques:
    - `POST /auth/signup`
    - `POST /auth/login`
    - `GET /`
    - `POST /payment/webhook`
- Routes protégées
    - `GET /auth/profile`
    - `POST /contribution`
    - `GET /contribution`
    - `PATCH /contribution/:id`
    - `DELETE /contribution/:id`
    - `POST /payment/intent`
    - `GET /payment/contributions`
    - `PATCH /campagnes/:id/moderer`
    - `POST /campagnes/:id/soumettre`

## Modèles JSON

### LoginRequest
```json
{
  "username": "string",
  "password": "string"
}
```

### SignupRequest
```json
{
    "prenom": "string",
    "nom": "string",
    "username": "string",
    "password": "string",
    "role": "string: {'ADMINISTRATEUR' | 'USER'}"
}
```

### SignupResult
```json
{
    "statusCode": 201,
    "message": "string",
    "data": {
        "id": "<uuid>",
        "nom": "string",
        "prenom": "string",
        "username": "string",
        "role": "string"
    },
    "timestamp": "<timestamp>"
}
```

### LoginResult
```json
{
    "statusCode": 200,
    "message": "string",
    "data": {
        "access_token": "string"
    },
    "timestamp": "<timestamp>"
}
```

### ErrorResult
```json
{
    "statusCode": "integer",
    "message": "string",
    "error": "string"
}
```

### CreateContributionRequest
```json
{
    "campagneId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "montant": 50
}
```

### UpdateContributionRequest
```json
{
    "montant": 150
}
```

### CreatePaymentIntentRequest
```json
{
    "contributionId": "d4f7f9aa-7d11-4f38-9f4a-9b0d01a7f112",
    "montant": 50,
    "campagneId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### ContributionResult
```json
{
    "statusCode": 201,
    "message": "Contribution créée avec succès",
    "data": {
        "id": "<uuid>",
        "montant": 50,
        "campagneId": "<uuid>",
        "createdAt": "<timestamp>"
    },
    "timestamp": "<timestamp>"
}
```

### ContributionListResult
```json
{
    "statusCode": 200,
    "message": "Contributions récupérées avec succès",
    "data": [
        {
            "id": "<uuid>",
            "montant": 50,
            "campagneId": "<uuid>",
            "createdAt": "<timestamp>"
        }
    ],
    "timestamp": "<timestamp>"
}
```

### PaymentIntentResult
```json
{
    "clientSecret": "<stripe_client_secret>",
    "transactionId": "<uuid>"
}
```

### TransactionListResult
```json
[
    {
        "id": "<uuid>",
        "paymentIntentId": "<stripe_payment_intent_id>",
        "montant": 50,
        "statut": "pending",
        "contributionId": "<uuid>",
        "contributeurId": "<uuid>",
        "createdAt": "<timestamp>",
        "updatedAt": "<timestamp>"
    }
]
```

### WebhookResult
```json
{
    "received": true
}
```

### ModererCampagneRequest
```json
{
    "decision": "ACCEPTEE"
}
```

## Endpoints

### `POST /auth/signup`
Crée un utilisateur avec le rôle spécifié. Le champ `role` est obligatoire.

Request body:
```json
{
    "prenom": "alice",
    "nom": "duval",
    "username": "alice",
    "password": "secret",
    "role": "USER"
}
```

Responses:
- `201 Created`
```json
{
    "statusCode": 201,
    "message": "User, auth and role created successfully",
    "data": {
        "id": "<uuid>",
        "nom": "duval",
        "prenom": "alice",
        "username": "alice",
        "role": "USER"
    },
    "timestamp": "<timestamp>"
}
```
- `409 Conflict`: username déjà existant
- `500 Internal Server Error`: erreur inattendue

### `POST /auth/login`
Authentifie l'utilisateur et retourne un JWT.

Request body:
```json
{
  "username": "alice",
  "password": "secret"
}
```

Responses:
- `200 OK`
```json
{
    "statusCode": 200,
    "message": "Login successful",
    "data": {
        "access_token": "<jwt>"
    },
    "timestamp": "<timestamp>"
}
```
- `401 Unauthorized`: mot de passe incorrect
- `404 Not Found`: username introuvable
- `500 Internal Server Error`: erreur sur le serveur

### `GET /auth/profile`
Retourne le payload JWT de l'utilisateur connecté (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Responses:
- `200 OK`
```json
{
    "sub": "<uuid>",
    "username": "alice",
    "role": "USER",
    "iat": 1234567890,
    "exp": 1234567890
}
```
- `401 Unauthorized`: token manquant ou invalide

### `GET /`
Endpoint de test.

Responses:
- `200 OK`: `Hello World!`

### `POST /contribution`
Crée une contribution pour une campagne active (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Request body:
```json
{
    "campagneId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "montant": 50
}
```

Responses:
- `201 Created`
```json
{
    "statusCode": 201,
    "message": "Contribution créée avec succès",
    "data": {
        "id": "<uuid>",
        "montant": 50,
        "campagneId": "<uuid>",
        "createdAt": "<timestamp>"
    },
    "timestamp": "<timestamp>"
}
```
- `400 Bad Request`: montant invalide ou campagne non active
- `401 Unauthorized`: token manquant ou invalide
- `404 Not Found`: campagne ou utilisateur introuvable

### `GET /contribution`
Retourne toutes les contributions de l'utilisateur connecté (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Responses:
- `200 OK`
```json
{
    "statusCode": 200,
    "message": "Contributions récupérées avec succès",
    "data": [
        {
            "id": "<uuid>",
            "montant": 50,
            "campagneId": "<uuid>",
            "createdAt": "<timestamp>"
        }
    ],
    "timestamp": "<timestamp>"
}
```
- `401 Unauthorized`: token manquant ou invalide

### `PATCH /contribution/:id`
Modifie le montant d'une contribution existante (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Request body:
```json
{
    "montant": 150
}
```

Responses:
- `200 OK`
```json
{
    "statusCode": 200,
    "message": "Contribution mise à jour avec succès",
    "data": {
        "id": "<uuid>",
        "montant": 150,
        "campagneId": "<uuid>",
        "createdAt": "<timestamp>"
    },
    "timestamp": "<timestamp>"
}
```
- `400 Bad Request`: montant invalide ou campagne non active
- `401 Unauthorized`: token manquant ou invalide
- `403 Forbidden`: contribution non propriétaire
- `404 Not Found`: contribution introuvable

### `DELETE /contribution/:id`
Annule (supprime) une contribution existante (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Responses:
- `200 OK`
```json
{
    "statusCode": 200,
    "message": "Contribution annulée avec succès",
    "timestamp": "<timestamp>"
}
```
- `400 Bad Request`: campagne non active
- `401 Unauthorized`: token manquant ou invalide
- `403 Forbidden`: contribution non propriétaire
- `404 Not Found`: contribution introuvable

### `POST /payment/intent`
Crée un PaymentIntent Stripe en capture manuelle et enregistre une transaction (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Request body:
```json
{
    "contributionId": "d4f7f9aa-7d11-4f38-9f4a-9b0d01a7f112",
    "montant": 50,
    "campagneId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

Responses:
- `201 Created`
```json
{
    "clientSecret": "<stripe_client_secret>",
    "transactionId": "<uuid>"
}
```
- `400 Bad Request`: montant invalide ou campagne non active
- `401 Unauthorized`: token manquant ou invalide
- `404 Not Found`: campagne introuvable

### `GET /payment/contributions`
Retourne l'historique des transactions de l'utilisateur connecté (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Responses:
- `200 OK`
```json
[
    {
        "id": "<uuid>",
        "paymentIntentId": "<stripe_payment_intent_id>",
        "montant": 50,
        "statut": "pending",
        "contributionId": "<uuid>",
        "contributeurId": "<uuid>",
        "createdAt": "<timestamp>",
        "updatedAt": "<timestamp>"
    }
]
```
- `401 Unauthorized`: token manquant ou invalide

### `POST /payment/webhook`
Endpoint Stripe public pour les notifications webhook. Traite les événements `payment_intent.succeeded` et `payment_intent.canceled` pour déclencher les remboursements automatiques ou manuels.

> Ne pas appeler manuellement. Requiert la signature Stripe dans l'en-tête `stripe-signature`.

Responses:
- `200 OK`
```json
{
    "received": true
}
```

### `PATCH /campagnes/:id/moderer`
Modère une campagne en attente (admin uniquement). Accepte ou refuse la campagne (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Request body:
```json
{
    "decision": "ACCEPTEE"
}
```

> `decision` : `ACCEPTEE` → campagne passe à `ACTIVE` | `REFUSEE` → campagne passe à `REFUSEE`

Responses:
- `200 OK`: campagne modérée avec succès
- `401 Unauthorized`: token manquant ou invalide
- `403 Forbidden`: non administrateur ou campagne pas en état `EN_ATTENTE`
- `404 Not Found`: campagne introuvable

### `POST /campagnes/:id/soumettre`
Soumet une campagne pour modération. La campagne passe de `BROUILLON` à `EN_ATTENTE` (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Responses:
- `200 OK`: campagne soumise avec succès
- `401 Unauthorized`: token manquant ou invalide
- `403 Forbidden`: non autorisé à soumettre cette campagne
- `404 Not Found`: campagne introuvable
