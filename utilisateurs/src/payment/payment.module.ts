import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentProcessor } from './payment.processor';
import { Transaction } from './entities/transaction.entity';
import { Contribution } from '../contribution/entities/contribution.entity';
import { ProjectsApiModule } from '../projects/projects-api.module';

@Module({
  imports: [
    ConfigModule,
    ProjectsApiModule,
    TypeOrmModule.forFeature([Transaction, Contribution]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentProcessor],
  exports: [PaymentService],
})
export class PaymentModule {}
