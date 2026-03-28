import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ProjectsApiClient } from '../projects/projects-api.client';

type StatutCampagne = 'EN_ATTENTE' | 'ACTIVE' | 'REFUSEE' | 'ECHOUEE' | 'REUSSIE' | 'BROUILLON';
type CampagneRow = { id: string; statut: StatutCampagne | string };

@Injectable()
export class CampagnesService {
  private readonly logger = new Logger(CampagnesService.name);

  constructor(private readonly projectsApiClient: ProjectsApiClient) {}

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
    authorizationHeader?: string,
  ): Promise<CampagneRow> {
    if (userRole !== 'ADMINISTRATEUR') {
      throw new ForbiddenException('Seul un administrateur peut modérer une campagne');
    }

    const saved = await this.projectsApiClient.modererCampagne(
      campagneId,
      decision,
      authorizationHeader,
    );

    this.logger.log(
      `[moderer] campagneId=${campagneId} decision=${decision} → statut=${saved.statut}`,
    );
    return saved;
  }
}
