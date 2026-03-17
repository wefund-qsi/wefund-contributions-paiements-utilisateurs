import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ContributionController } from './contribution.controller';
import { ContributionService } from './contribution.service';
import { Contribution } from './entities/contribution.entity';
import { Campagne } from './entities/campagne.entity';
import { Projet } from './entities/projet.entity';
import { User } from '../auth/entities/user.entity';
import { jwtConstants } from '../auth/constants';

@Module({
    imports: [
        TypeOrmModule.forFeature([Contribution, Campagne, Projet, User]),
        JwtModule.register({ secret: jwtConstants.secret, signOptions: { expiresIn: '1d' } }),
    ],
    controllers: [ContributionController],
    providers: [ContributionService],
})
export class ContributionModule {}
