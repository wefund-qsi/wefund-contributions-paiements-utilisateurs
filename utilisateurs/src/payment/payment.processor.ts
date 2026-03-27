import { Injectable, Logger } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(private readonly paymentService: PaymentService) {}

  async handleCampaignSuccess(campagneId: string): Promise<void> {
    this.logger.log(`[handleCampaignSuccess] campagneId=${campagneId} — capture des fonds (RG5)`);
    await this.paymentService.captureAllForCampaign(campagneId);
  }

  async handleCampaignFailed(campagneId: string): Promise<void> {
    this.logger.log(`[handleCampaignFailed] campagneId=${campagneId} — remboursement (Story 3)`);
    await this.paymentService.refundAllForCampaign(campagneId);
  }
}
