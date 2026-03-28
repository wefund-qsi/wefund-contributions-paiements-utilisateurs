import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  process.env.KAFKAJS_NO_PARTITIONER_WARNING = process.env.KAFKAJS_NO_PARTITIONER_WARNING || '1';

  const kafkaEnabled = (process.env.KAFKA_ENABLED || 'true').toLowerCase() === 'true';
  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (kafkaEnabled) {
    // Kafka consumer — écoute campaign.closed.success, campaign.closed.failed, campaign.moderated
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'wefund-contributions-service',
          brokers: kafkaBrokers,
        },
        consumer: {
          groupId: 'wefund-contributions-consumer',
        },
      },
    });
  }

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('WeFund — Contributions & Paiements API')
    .setDescription(
      'Microservice utilisateurs, contributions et paiements WeFund.\n\n' +
      '**Stories couvertes :** 1 (financer), 2 (consulter), 3 (remboursement auto), ' +
      '4 (remboursement manuel), 5 (modifier montant), 6 (créer compte), ' +
      '7 (authentification), 8 (modération admin).',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  if (kafkaEnabled) {
    try {
      await app.startAllMicroservices();
      logger.log(`Kafka consumer connecté à : ${kafkaBrokers.join(', ')}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.warn(`Kafka indisponible, API HTTP démarrée sans consumer (${message})`);
    }
  } else {
    logger.warn('Kafka désactivé via KAFKA_ENABLED=false');
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Microservice Projet 2 démarré sur : http://localhost:${port}/api`);
  logger.log(`Swagger disponible sur : http://localhost:${port}/api/docs`);
}
bootstrap();
