import { Injectable } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentProcessor {
  constructor(private readonly paymentService: PaymentService) {}

  // Écoute campaign.closed.success → capture des paiements en séquestre
  async handleCampaignSuccess(data: { campagneId: number }): Promise<void> {
    // TODO: implémenter à l'étape 7 (PaymentProcessor)
  }

  // Écoute campaign.closed.failed → remboursements automatiques
  async handleCampaignFailed(data: { campagneId: number }): Promise<void> {
    // TODO: implémenter à l'étape 7 (PaymentProcessor)
  }
}
