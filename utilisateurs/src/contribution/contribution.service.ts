import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contribution } from './entities/contribution.entity';
import { Campagne } from './entities/campagne.entity';
import { User } from '../auth/entities/user.entity';
import { CreateContributionDto } from './dtos/create-contribution.dto';
import { UpdateContributionDto } from './dtos/update-contribution.dto';

@Injectable()
export class ContributionService {
    constructor(
        @InjectRepository(Contribution)
        private readonly contributionRepository: Repository<Contribution>,
        @InjectRepository(Campagne)
        private readonly campagneRepository: Repository<Campagne>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    private async findOrMockCampagne(campagneId: number): Promise<Campagne> {
        const existingCampagne = await this.campagneRepository.findOne({ where: { id: campagneId } });
        if (existingCampagne) {
            return existingCampagne;
        }

        if (process.env.MOCK_CONTRIBUTION_CAMPAIGN !== 'true') {
            throw new NotFoundException(`Campagne ${campagneId} introuvable`);
        }

        // Local-only fallback to decouple contribution tests from the campaigns microservice.
        const mockedCampagne = this.campagneRepository.create({
            id: campagneId,
            nom: `Mock campagne ${campagneId}`,
            statut: 'active',
            dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });

        return this.campagneRepository.save(mockedCampagne);
    }

    async create(userId: string, dto: CreateContributionDto): Promise<Contribution> {
        const campagne = await this.findOrMockCampagne(dto.campagneId);
        if (campagne.statut !== 'active') {
            throw new BadRequestException('La campagne n\'est pas active');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('Utilisateur introuvable');
        }

        const contribution = this.contributionRepository.create({
            montant: dto.montant,
            campagne,
            contributeur: user,
            timestamp: new Date(),
        });

        return this.contributionRepository.save(contribution);
    }

    async findAllByUser(userId: string): Promise<Contribution[]> {
        return this.contributionRepository.find({
            where: { contributeur: { id: userId } },
            relations: ['campagne', 'campagne.projet'],
        });
    }

    async update(userId: string, id: number, dto: UpdateContributionDto): Promise<Contribution> {
        const contribution = await this.contributionRepository.findOne({
            where: { id },
            relations: ['contributeur', 'campagne'],
        });

        if (!contribution) {
            throw new NotFoundException(`Contribution ${id} introuvable`);
        }
        if (contribution.contributeur.id !== userId) {
            throw new ForbiddenException('Vous ne pouvez modifier que vos propres contributions');
        }
        if (contribution.campagne.statut !== 'active') {
            throw new BadRequestException('La campagne n\'est plus active, modification impossible');
        }

        contribution.montant = dto.montant;
        return this.contributionRepository.save(contribution);
    }

    async remove(userId: string, id: number): Promise<void> {
        const contribution = await this.contributionRepository.findOne({
            where: { id },
            relations: ['contributeur', 'campagne'],
        });

        if (!contribution) {
            throw new NotFoundException(`Contribution ${id} introuvable`);
        }
        if (contribution.contributeur.id !== userId) {
            throw new ForbiddenException('Vous ne pouvez annuler que vos propres contributions');
        }
        if (contribution.campagne.statut !== 'active') {
            throw new BadRequestException('La campagne n\'est plus active, annulation impossible');
        }

        await this.contributionRepository.remove(contribution);
    }
}
