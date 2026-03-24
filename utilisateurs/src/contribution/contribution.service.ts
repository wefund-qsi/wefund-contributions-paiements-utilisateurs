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
import { CampagneEntity, StatutCampagne } from '@projet1/campagnes/domain/campagne.entity';
import { User } from '../auth/entities/user.entity';
import { CreateContributionDto } from './dtos/create-contribution.dto';
import { UpdateContributionDto } from './dtos/update-contribution.dto';

@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);

  constructor(
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    @InjectRepository(CampagneEntity)
    private readonly campagneRepository: Repository<CampagneEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateContributionDto): Promise<Contribution> {
    this.logger.log(`[create] userId=${userId} campagneId=${dto.campagneId} montant=${dto.montant}`);

    const campagne = await this.campagneRepository.findOne({ where: { id: dto.campagneId } });
    if (!campagne) {
      throw new NotFoundException(`Campagne ${dto.campagneId} introuvable`);
    }
    if (campagne.statut !== StatutCampagne.ACTIVE) {
      throw new BadRequestException(`La campagne n'est pas active (statut: ${campagne.statut})`);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const contribution = this.contributionRepository.create({
      montant: dto.montant,
      campagne,
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
      relations: ['campagne'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(userId: string, id: string, dto: UpdateContributionDto): Promise<Contribution> {
    this.logger.log(`[update] userId=${userId} contributionId=${id} montant=${dto.montant}`);

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
    if (contribution.campagne.statut !== StatutCampagne.ACTIVE) {
      throw new BadRequestException('La campagne n\'est plus active, modification impossible (RG3)');
    }

    contribution.montant = dto.montant;
    const saved = await this.contributionRepository.save(contribution);
    this.logger.log(`[update] Contribution ${id} mise à jour`);
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    this.logger.log(`[remove] userId=${userId} contributionId=${id}`);

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
    if (contribution.campagne.statut !== StatutCampagne.ACTIVE) {
      throw new BadRequestException('La campagne n\'est plus active, annulation impossible (RG3)');
    }

    await this.contributionRepository.remove(contribution);
    this.logger.log(`[remove] Contribution ${id} annulée`);
  }
}
