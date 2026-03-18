import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthController } from './auth/auth.controller';
import { ContributionModule } from './contribution/contribution.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST')  || 'localhost',
        port: parseInt(config.get<string>('DATABASE_PORT') || '5432'),
        username: config.get<string>('DATABASE_USER') || 'postgres',
        password: config.get<string>('DATABASE_PASSWORD') || 'password',
        database: config.get<string>('DATABASE_NAME') || 'wefund_db',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // À désactiver en production
      }),
    }),
    AuthModule,
    ContributionModule,
    PaymentModule,
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
