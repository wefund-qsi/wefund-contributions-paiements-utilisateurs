import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentProcessor } from './payment.processor';
import { Transaction } from './entities/transaction.entity';
import { Contribution } from '../contribution/entities/contribution.entity';
import { Campagne } from '../contribution/entities/campagne.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Transaction, Contribution, Campagne]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProcessor],
})
export class PaymentModule {}
