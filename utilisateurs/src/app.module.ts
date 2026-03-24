import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContributionModule } from './contribution/contribution.module';
import { PaymentModule } from './payment/payment.module';
import { KafkaConsumerModule } from './kafka/kafka-consumer.module';
import { CampagnesModule } from './campagnes/campagnes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    JwtModule.register({
      global: true,
      secret:
        process.env.JWT_SECRET ||
        'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
      signOptions: { expiresIn: '1h' },
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST') || 'localhost',
        port: parseInt(config.get<string>('DATABASE_PORT') || '5432'),
        username: config.get<string>('DATABASE_USER') || 'postgres',
        password: config.get<string>('DATABASE_PASSWORD') || 'password',
        database: config.get<string>('DATABASE_NAME') || 'wefund_db',
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),

    AuthModule,
    ContributionModule,
    PaymentModule,
    KafkaConsumerModule,
    CampagnesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
