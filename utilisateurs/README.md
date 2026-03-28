# WeFund - Service utilisateur

## Configuration

Cette application appelle le microservice Projets via HTTP.

Variables d'environnement utilisees:

```bash
PROJECTS_API_BASE_URL=http://localhost:3000/api
PROJECTS_API_TIMEOUT_MS=5000
PROJECTS_MODERATION_PATH=/campagnes/:id/moderer
PROJECTS_MODERATION_FALLBACK_PATH=/campagnes/:id
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKAJS_NO_PARTITIONER_WARNING=1
```

Notes:
- Si le service utilisateurs tourne sur `3001`, ne mettez pas `PROJECTS_API_BASE_URL=http://localhost:3001/api` (boucle d'appel vers lui-meme sur /campagnes/:id/moderer).
- Si votre microservice Projets expose une autre route de moderation, ajustez `PROJECTS_MODERATION_PATH` (ex: `/campagnes/:id`).
- Si Kafka n'est pas disponible en local, mettez `KAFKA_ENABLED=false` pour lancer uniquement l'API HTTP.
- Si vous lancez le service dans Docker compose avec un broker nommé `redpanda`, utilisez `KAFKA_BROKERS=redpanda:9092`.

## Lancer l'application
```bash
npm run start
```