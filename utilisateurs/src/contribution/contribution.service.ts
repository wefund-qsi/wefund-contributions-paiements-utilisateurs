import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contribution } from './entities/contribution.entity';
import { User } from '../auth/entities/user.entity';
import { PaymentService } from '../payment/payment.service';
import { CreateContributionDto } from './dtos/create-contribution.dto';
import { UpdateContributionDto } from './dtos/update-contribution.dto';
import { ProjectsApiClient } from '../projects/projects-api.client';

@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);

  constructor(
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paymentService: PaymentService,
    private readonly projectsApiClient: ProjectsApiClient,
  ) {}

  async create(userId: string, dto: CreateContributionDto): Promise<Contribution> {
    this.logger.log(`[create] userId=${userId} campagneId=${dto.campagneId} montant=${dto.montant}`);

    const campagne = await this.projectsApiClient.getCampagneById(dto.campagneId);
    this.assertCampagneActive(campagne.statut, dto.campagneId);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const contribution = this.contributionRepository.create({
      montant: dto.montant,
      campagneId: campagne.id,
      contributeur: user,
    });

    const saved = await this.contributionRepository.save(contribution);
    this.logger.log(`[create] Contribution créée id=${saved.id}`);
    return saved;
  }

  async findAllByUser(userId: string): Promise<Contribution[]> {
    this.logger.log(`[findAllByUser] userId=${userId}`);
    return this.contributionRepository.find({
      where: { contributeur: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateContributionDto): Promise<Contribution> {
    this.logger.log(`[update] userId=${userId} contributionId=${id} montant=${dto.montant}`);

    const contribution = await this.contributionRepository.findOne({
      where: { id },
      relations: ['contributeur'],
    });

    if (!contribution) {
      throw new NotFoundException(`Contribution ${id} introuvable`);
    }
    if (contribution.contributeur.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres contributions');
    }
    await this.ensureCampagneActive(contribution.campagneId);

    contribution.montant = dto.montant;
    const saved = await this.contributionRepository.save(contribution);
    this.logger.log(`[update] Contribution ${id} mise à jour`);
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.logger.log(`[remove] userId=${userId} contributionId=${id}`);

    const contribution = await this.contributionRepository.findOne({
      where: { id },
      relations: ['contributeur'],
    });

    if (!contribution) {
      throw new NotFoundException(`Contribution ${id} introuvable`);
    }
    if (contribution.contributeur.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez annuler que vos propres contributions');
    }
    await this.ensureCampagneActive(contribution.campagneId);

    await this.paymentService.refundContribution(contribution.id, userId);
    await this.contributionRepository.remove(contribution);
    this.logger.log(`[remove] Contribution ${id} annulée`);
  }

  private async ensureCampagneActive(campagneId?: string): Promise<void> {
    if (!campagneId) {
      throw new BadRequestException('Contribution invalide: campagneId manquant');
    }

    const campagne = await this.projectsApiClient.getCampagneById(campagneId);
    this.assertCampagneActive(campagne.statut, campagneId);
  }

  private assertCampagneActive(statut: string, campagneId: string): void {
    if (statut !== 'ACTIVE') {
      throw new BadRequestException(
        `La campagne ${campagneId} n'est pas active (statut: ${statut})`,
      );
    }
  }
}
