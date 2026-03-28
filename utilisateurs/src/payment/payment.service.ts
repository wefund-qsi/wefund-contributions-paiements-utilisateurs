import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Transaction } from './entities/transaction.entity';
import { Contribution } from '../contribution/entities/contribution.entity';
import { CampagneEntity, StatutCampagne } from '@projet1/campagnes/domain/campagne.entity';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    @InjectRepository(CampagneEntity)
    private readonly campagneRepository: Repository<CampagneEntity>,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY') || 'sk_test_dummy';
    this.stripe = new Stripe(stripeKey, { apiVersion: '2026-02-25.clover' });
  }

  async createPaymentIntent(
    contributionId: string,
    montant: number,
    campagneId: string,
    contributeurId: string,
  ): Promise<{ clientSecret: string; transactionId: string }> {
    this.logger.log(`[createPaymentIntent] contributionId=${contributionId} campagneId=${campagneId} montant=${montant}`);

    const contribution = await this.contributionRepository.findOne({
      where: { id: contributionId },
      relations: ['contributeur', 'campagne'],
    });
    if (!contribution) {
      throw new NotFoundException(`Contribution ${contributionId} introuvable`);
    }
    if (contribution.contributeur?.id !== contributeurId) {
      throw new ForbiddenException('Vous ne pouvez payer que vos propres contributions');
    }

    const contributionCampagneId = contribution.campagneId || contribution.campagne?.id;
    if (contributionCampagneId !== campagneId) {
      throw new BadRequestException('La contribution ne correspond pas à la campagne demandée');
    }

    const campagne = await this.campagneRepository.findOne({ where: { id: campagneId } });
    if (!campagne) {
      throw new NotFoundException(`Campagne ${campagneId} introuvable`);
    }
    if (campagne.statut !== StatutCampagne.ACTIVE) {
      throw new BadRequestException(`La campagne n'est pas active (statut: ${campagne.statut})`);
    }
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être positif');
    }

    if (Number(contribution.montant) !== Number(montant)) {
      throw new BadRequestException('Le montant du paiement doit correspondre au montant de la contribution');
    }

    const existingTransaction = await this.transactionRepository.findOne({
      where: {
        contributionId,
        contributeurId,
        statut: In(['pending', 'authorized']),
      },
      order: { createdAt: 'DESC' },
    });
    if (existingTransaction) {
      throw new BadRequestException('Une transaction est déjà en cours pour cette contribution');
    }

    const idempotencyKey = `contribution-${contributionId}-user-${contributeurId}`;
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: Math.round(montant * 100),
        currency: 'eur',
        capture_method: 'manual',
        metadata: { contributionId, campagneId, contributeurId },
      },
      { idempotencyKey },
    );

    const transaction = this.transactionRepository.create({
      paymentIntentId: paymentIntent.id,
      montant,
      statut: 'pending',
      contributionId,
      campagneId,
      contributeurId,
    });
    await this.transactionRepository.save(transaction);
    this.logger.log(`[createPaymentIntent] Transaction créée id=${transaction.id} pi=${paymentIntent.id}`);

    return {
      clientSecret: paymentIntent.client_secret!,
      transactionId: transaction.id,
    };
  }

  async capturePayment(paymentIntentId: string): Promise<void> {
    this.logger.log(`[capturePayment] pi=${paymentIntentId}`);
    await this.stripe.paymentIntents.capture(paymentIntentId);
    await this.transactionRepository.update({ paymentIntentId }, { statut: 'captured' });
  }

  async refundPayment(paymentIntentId: string): Promise<void> {
    this.logger.log(`[refundPayment] pi=${paymentIntentId}`);
    await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    await this.transactionRepository.update({ paymentIntentId }, { statut: 'refunded' });
  }

  async refundContribution(contributionId: string, contributeurId: string): Promise<void> {
    this.logger.log(`[refundContribution] contributionId=${contributionId} contributeurId=${contributeurId}`);

    const transaction = await this.transactionRepository.findOne({
      where: {
        contributionId,
        contributeurId,
        statut: In(['pending', 'authorized', 'captured']),
      },
      order: { createdAt: 'DESC' },
    });

    if (!transaction) {
      throw new NotFoundException('Aucune transaction remboursable trouvée pour cette contribution');
    }

    if (transaction.statut === 'captured') {
      await this.refundPayment(transaction.paymentIntentId);
      return;
    }

    await this.stripe.paymentIntents.cancel(transaction.paymentIntentId);
    await this.transactionRepository.update({ id: transaction.id }, { statut: 'refunded' });
  }

  async captureAllForCampaign(campagneId: string): Promise<void> {
    this.logger.log(`[captureAllForCampaign] campagneId=${campagneId} — RG5: transfert des fonds (succès)`);
    const transactions = await this.getAuthorizedTransactionsByCampagne(campagneId);
    this.logger.log(`[captureAllForCampaign] ${transactions.length} transaction(s) à capturer`);
    for (const tx of transactions) {
      try {
        await this.capturePayment(tx.paymentIntentId);
        this.logger.log(`[captureAllForCampaign] Transaction ${tx.id} capturée`);
      } catch (err) {
        this.logger.error(`[captureAllForCampaign] Echec capture transaction ${tx.id}: ${err.message}`);
      }
    }
  }

  async refundAllForCampaign(campagneId: string): Promise<void> {
    this.logger.log(`[refundAllForCampaign] campagneId=${campagneId} — Story 3 / RG5: remboursement (échec)`);
    const transactions = await this.getRefundableTransactionsByCampagne(campagneId);
    this.logger.log(`[refundAllForCampaign] ${transactions.length} transaction(s) à rembourser`);
    for (const tx of transactions) {
      try {
        if (tx.statut === 'captured') {
          await this.refundPayment(tx.paymentIntentId);
        } else {
          await this.stripe.paymentIntents.cancel(tx.paymentIntentId);
          await this.transactionRepository.update({ id: tx.id }, { statut: 'refunded' });
        }
        this.logger.log(`[refundAllForCampaign] Transaction ${tx.id} remboursée`);
      } catch (err) {
        this.logger.error(`[refundAllForCampaign] Echec remboursement transaction ${tx.id}: ${err.message}`);
      }
    }
  }

  async getAuthorizedTransactionsByCampagne(campagneId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        campagneId,
        statut: 'authorized',
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getRefundableTransactionsByCampagne(campagneId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        campagneId,
        statut: In(['pending', 'authorized', 'captured']),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionsByContributeur(contributeurId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { contributeurId },
      order: { createdAt: 'DESC' },
    });
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.transactionRepository.update({ paymentIntentId: pi.id }, { statut: 'authorized' });
        this.logger.log(`[webhook] payment_intent.amount_capturable_updated pi=${pi.id}`);
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.transactionRepository.update({ paymentIntentId: pi.id }, { statut: 'captured' });
        this.logger.log(`[webhook] payment_intent.succeeded pi=${pi.id}`);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await this.transactionRepository.update(
            { paymentIntentId: String(charge.payment_intent) },
            { statut: 'refunded' },
          );
          this.logger.log(`[webhook] charge.refunded pi=${charge.payment_intent}`);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.transactionRepository.update({ paymentIntentId: pi.id }, { statut: 'failed' });
        this.logger.log(`[webhook] payment_intent.payment_failed pi=${pi.id}`);
        break;
      }
    }
  }
}
