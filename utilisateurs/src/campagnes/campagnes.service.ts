import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampagneEntity, StatutCampagne } from '@projet1/campagnes/domain/campagne.entity';

@Injectable()
export class CampagnesService {
  private readonly logger = new Logger(CampagnesService.name);

  constructor(
    @InjectRepository(CampagneEntity)
    private readonly campagneRepository: Repository<CampagneEntity>,
  ) {}

  /**
   * Story 8 / RG6 — Modération admin.
   * Seul un ADMINISTRATEUR peut appeler cette méthode.
   * EN_ATTENTE + ACCEPTEE → ACTIVE
   * EN_ATTENTE + REFUSEE  → REFUSEE
   */
  async moderer(
    campagneId: string,
    decision: 'ACCEPTEE' | 'REFUSEE',
    userRole: string,
  ): Promise<CampagneEntity> {
    if (userRole !== 'ADMINISTRATEUR') {
      throw new ForbiddenException('Seul un administrateur peut modérer une campagne');
    }

    const campagne = await this.campagneRepository.findOne({ where: { id: campagneId } });
    if (!campagne) {
      throw new NotFoundException(`Campagne ${campagneId} introuvable`);
    }

    if (campagne.statut !== StatutCampagne.EN_ATTENTE) {
      throw new ForbiddenException(
        `La campagne doit être EN_ATTENTE pour être modérée (statut actuel : ${campagne.statut})`,
      );
    }

    campagne.statut = decision === 'ACCEPTEE' ? StatutCampagne.ACTIVE : StatutCampagne.REFUSEE;
    const saved = await this.campagneRepository.save(campagne);

    this.logger.log(
      `[moderer] campagneId=${campagneId} decision=${decision} → statut=${saved.statut}`,
    );
    return saved;
  }
}
