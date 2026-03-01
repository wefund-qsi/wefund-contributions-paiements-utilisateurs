# Service Utilisateurs - API

## Base URL
- Accès en direct: `http://localhost:3000`

## Authentification
- Content-Type attendu dans l'en-tête `Content-Type: application/json` pour tous les routes
- Routes publiques:
  - `POST /auth/signp`
  - `POST /auth/login`
  - `GET /`
- Routes protégées
  - Aucune pour l'instant

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

## Endpoints

### `POST /auth/signup`
Crée un utilisateur avec le rôle par défaut `VISITEUR`.

Request body:
```json
{
    "prenom": "alice",
    "nom": "duval",
    "username": "alice",
    "password": "secret"
}
```

Responses:
- `201 OK`
```json
{
    "statusCode":201,
    "message":"User, auth and role created successfully",
    "data":{
        "id":"<uuid>",
        "nom":"duval",
        "prenom":"alice",
        "username":"alice",
        "role":"VISITEUR"
    },
    "timestamp":"<timestamp>"
}
```
- `4xx/5xx`: erreurs (ex: données invalides, username déjà existant)

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

### `GET /`
Endpoint de test.

Responses:
- `200 OK`: `Hello World!`