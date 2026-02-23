# WeFund

## Lancer l'application
```bash
npm run start
```

## Démarrer la base de données

```bash
docker compose up -d
```

## Se connecter à la base de données

```bash
docker exec -it we-fund-db psql -U postgres -d wefund_db
```

## Voir les logs de la base de données

```bash
docker compose logs -f postgres
```

## Arrêter la base de données

```bash
docker compose down
```



