# Service Utilisateurs - API

## Base URL
- Accès en direct: `http://localhost:3000`

## Authentification
- Content-Type attendu dans l'en-tête `Content-Type: application/json` pour tous les routes
- Routes publiques:
    - `POST /auth/signup`
  - `POST /auth/login`
  - `GET /`
- Routes protégées
    - `GET /auth/profile`
    - `POST /contribution`
    - `GET /contribution`
    - `PATCH /contribution/:id`
    - `DELETE /contribution/:id`

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
    "role": "string: {'PORTEUR DE PROJET' | 'CONTRIBUTEUR' | 'ADMINISTRATEUR' | 'VISITEUR'}"
}
```

### SignupResult
```json
{
    "statusCode":"integer",
    "message":"string",
    "data":{
        "id":"string",
        "nom":"string",
        "prenom":"string",
        "username":"string",
        "role":"string"
    },
    "timestamp":"timestamp"
}
```

### LoginResult
```json
{
    "statusCode":"integer",
    "message":"string",
    "data":{
        "access_token":"string"
    },
    "timestamp":"timestamp"
}
```

### ErrorResult
```json
{
    "statusCode":"integer",
    "message":"string",
    "error":"string"
}
```

### CreateContributionRequest
```json
{
    "campagneId": 1,
    "montant": 50
}
```

### UpdateContributionRequest
```json
{
    "montant": 150
}
```

### ContributionResult
```json
{
    "statusCode":201,
    "message":"Contribution créée avec succès",
    "data":{
        "id":1,
        "montant":50,
        "campagne":{
            "id":1,
            "nom":"Campagne test",
            "statut":"active"
        },
        "contributeur":{
            "id":"<uuid>",
            "username":"alice"
        },
        "timestamp":"<timestamp>"
    },
    "timestamp":"<timestamp>"
}
```

### ContributionListResult
```json
{
    "statusCode":200,
    "message":"Contributions récupérées avec succès",
    "data":[
        {
            "id":1,
            "montant":50,
            "campagne":{
                "id":1,
                "nom":"Campagne test",
                "statut":"active"
            },
            "timestamp":"<timestamp>"
        }
    ],
    "timestamp":"<timestamp>"
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
    "role": "CONTRIBUTEUR"
}
```

Responses:
- `201 Created`
```json
{
    "statusCode":201,
    "message":"User, auth and role created successfully",
    "data":{
        "id":"<uuid>",
        "nom":"duval",
        "prenom":"alice",
        "username":"alice",
        "role":"CONTRIBUTEUR"
    },
    "timestamp":"<timestamp>"
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
    "statusCode":200,
    "message":"Login successful",
    "data":{
        "access_token":"<jwt>"
    },
    "timestamp":"<timestamp>"
}
```
- `401 Unauthorized`: identifiants invalides
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
    "role": "CONTRIBUTEUR",
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
    "campagneId": 1,
    "montant": 50
}
```

Responses:
- `201 Created`
```json
{
    "statusCode":201,
    "message":"Contribution créée avec succès",
    "data":{
        "id":1,
        "montant":50,
        "campagne":{
            "id":1,
            "nom":"Campagne test",
            "statut":"active",
            "dateEcheance":"<timestamp>"
        },
        "contributeur":{
            "id":"<uuid>",
            "username":"alice"
        },
        "timestamp":"<timestamp>"
    },
    "timestamp":"<timestamp>"
}
```
- `400 Bad Request`: montant invalide ou campagne non active
- `401 Unauthorized`: token manquant ou invalide
- `404 Not Found`: campagne ou utilisateur introuvable

> **Note dev** : en local, si la variable d'environnement `MOCK_CONTRIBUTION_CAMPAIGN=true` est définie, une campagne mock active est créée automatiquement si elle n'existe pas en base. À ne pas utiliser en production.

### `GET /contribution`
Retourne toutes les contributions de l'utilisateur connecté (token JWT requis).

Request headers:
- `Authorization: Bearer <jwt>`

Responses:
- `200 OK`
```json
{
    "statusCode":200,
    "message":"Contributions récupérées avec succès",
    "data":[
        {
            "id":1,
            "montant":50,
            "campagne":{
                "id":1,
                "nom":"Campagne test",
                "statut":"active",
                "projet":{
                    "id":1,
                    "nom":"Projet test"
                }
            },
            "timestamp":"<timestamp>"
        }
    ],
    "timestamp":"<timestamp>"
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
    "statusCode":200,
    "message":"Contribution mise à jour avec succès",
    "data":{
        "id":1,
        "montant":150
    },
    "timestamp":"<timestamp>"
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
    "statusCode":200,
    "message":"Contribution annulée avec succès",
    "timestamp":"<timestamp>"
}
```
- `400 Bad Request`: campagne non active
- `401 Unauthorized`: token manquant ou invalide
- `403 Forbidden`: contribution non propriétaire
- `404 Not Found`: contribution introuvable