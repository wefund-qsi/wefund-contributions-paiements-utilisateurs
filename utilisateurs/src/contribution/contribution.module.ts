import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContributionController } from './contribution.controller';
import { ContributionService } from './contribution.service';
import { Contribution } from './entities/contribution.entity';
import { CampagneEntity } from '@projet1/campagnes/domain/campagne.entity';
import { Project } from '@projet1/projects/domain/project.entity';
import { User } from '../auth/entities/user.entity';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contribution, CampagneEntity, Project, User]),
    PaymentModule,
  ],
  controllers: [ContributionController],
  providers: [ContributionService],
  exports: [ContributionService],
})
export class ContributionModule {}
