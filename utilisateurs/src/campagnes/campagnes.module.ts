import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampagneEntity } from '@projet1/campagnes/domain/campagne.entity';
import { CampagnesController } from './campagnes.controller';
import { CampagnesService } from './campagnes.service';

@Module({
  imports: [TypeOrmModule.forFeature([CampagneEntity])],
  controllers: [CampagnesController],
  providers: [CampagnesService],
})
export class CampagnesModule {}
