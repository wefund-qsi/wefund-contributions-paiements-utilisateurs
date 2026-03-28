import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentService } from '../payment/payment.service';

interface CampaignClosedEvent {
  campagneId: string;
  projetId: string;
  porteurId: string;
  statut: string;
  objectif: number;
  montantCollecte: number;
  dateFin: string;
  occurredAt: string;
}

interface CampaignModeratedEvent {
  campagneId: string;
  statut: string;
  occurredAt?: string;
}

@Controller()
export class CampaignEventsConsumer {
  private readonly logger = new Logger(CampaignEventsConsumer.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Story 3 / RG5 — Campagne réussie : transfert des fonds séquestrés.
   * Émis par Projet 1 via closeExpiredCampaigns() → statut REUSSIE.
   */
  @EventPattern('campaign.closed.success')
  async handleCampaignSuccess(@Payload() data: CampaignClosedEvent): Promise<void> {
    this.logger.log(
      `[campaign.closed.success] campagneId=${data?.campagneId} montantCollecte=${data?.montantCollecte}`,
    );
    if (!data?.campagneId) {
      this.logger.warn('[campaign.closed.success] Payload invalide : campagneId manquant');
      return;
    }
    await this.paymentService.captureAllForCampaign(data.campagneId);
  }

  /**
   * Story 3 — Campagne échouée : remboursement automatique des contributeurs.
   * Émis par Projet 1 via closeExpiredCampaigns() → statut ECHOUEE.
   */
  @EventPattern('campaign.closed.failed')
  async handleCampaignFailed(@Payload() data: CampaignClosedEvent): Promise<void> {
    this.logger.log(
      `[campaign.closed.failed] campagneId=${data?.campagneId} montantCollecte=${data?.montantCollecte}`,
    );
    if (!data?.campagneId) {
      this.logger.warn('[campaign.closed.failed] Payload invalide : campagneId manquant');
      return;
    }
    await this.paymentService.refundAllForCampaign(data.campagneId);
  }

  /**
   * RG6 — Modération d'une campagne (acceptée / refusée).
   * Topic réservé pour quand Projet 1 publiera campaign.moderated.
   */
  @EventPattern('campaign.moderated')
  async handleCampaignModerated(@Payload() data: CampaignModeratedEvent): Promise<void> {
    this.logger.log(
      `[campaign.moderated] campagneId=${data?.campagneId} statut=${data?.statut}`,
    );
    if (!data?.campagneId) {
      this.logger.warn('[campaign.moderated] Payload invalide : campagneId manquant');
      return;
    }
    // Si la campagne est REFUSEE, lancer les refunds pour cette campagne
    if (data.statut === 'REFUSEE') {
      this.logger.log(`[campaign.moderated] campagneId=${data.campagneId} -> lancement refunds`);
      await this.paymentService.refundAllForCampaign(data.campagneId);
    }
    // Si ACTIVE on ne fait rien côté refunds (les contributions restent)
  }

  @EventPattern('campaign.submitted')
  async handleCampaignSubmitted(@Payload() data: any): Promise<void> {
    this.logger.log(`[campaign.submitted] campagneId=${data?.campagneId}`);
    if (!data?.campagneId) {
      this.logger.warn('[campaign.submitted] Payload invalide : campagneId manquant');
      return;
    }
    // Optionnel: mettre à jour l'état local, envoyer notifications, etc.
  }
}
