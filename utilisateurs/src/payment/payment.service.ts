import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Transaction } from './entities/transaction.entity';
import { Contribution } from '../contribution/entities/contribution.entity';
import { Campagne } from '../contribution/entities/campagne.entity';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Contribution)
    private readonly contributionRepository: Repository<Contribution>,
    @InjectRepository(Campagne)
    private readonly campagneRepository: Repository<Campagne>,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2026-02-25.clover',
    });
  }

  async createPaymentIntent(
    contributionId: number,
    montant: number,
    campagneId: number,
    contributeurId: string,
  ): Promise<{ clientSecret: string; transactionId: string }> {
    // RG3 : vérifier que la campagne est active
    const campagne = await this.campagneRepository.findOne({
      where: { id: campagneId },
    });
    if (!campagne) {
      throw new NotFoundException(`Campagne ${campagneId} introuvable`);
    }
    if (campagne.statut !== 'active') {
      throw new BadRequestException(
        `La campagne n'est pas active (statut: ${campagne.statut})`,
      );
    }

    // Valider le montant
    if (montant <= 0) {
      throw new BadRequestException('Le montant doit être positif');
    }

    // Idempotency key basée sur contribution + contributeur
    const idempotencyKey = `contribution-${contributionId}-user-${contributeurId}`;

    // Créer le PaymentIntent en mode séquestre (capture manuelle)
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: Math.round(montant * 100), // Stripe attend des centimes
        currency: 'eur',
        capture_method: 'manual',
        metadata: {
          contributionId: String(contributionId),
          campagneId: String(campagneId),
          contributeurId,
        },
      },
      { idempotencyKey },
    );

    // Tracer la transaction en base (RG4)
    const transaction = this.transactionRepository.create({
      paymentIntentId: paymentIntent.id,
      montant,
      statut: 'pending',
      contributionId,
      contributeurId,
    });
    await this.transactionRepository.save(transaction);

    return {
      clientSecret: paymentIntent.client_secret!,
      transactionId: transaction.id,
    };
  }

  async capturePayment(paymentIntentId: string): Promise<void> {
    await this.stripe.paymentIntents.capture(paymentIntentId);
    await this.transactionRepository.update(
      { paymentIntentId },
      { statut: 'captured' },
    );
  }

  async refundPayment(paymentIntentId: string): Promise<void> {
    await this.stripe.refunds.create({ payment_intent: paymentIntentId });
    await this.transactionRepository.update(
      { paymentIntentId },
      { statut: 'refunded' },
    );
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.amount_capturable_updated': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.transactionRepository.update(
          { paymentIntentId: pi.id },
          { statut: 'authorized' },
        );
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.transactionRepository.update(
          { paymentIntentId: pi.id },
          { statut: 'captured' },
        );
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await this.transactionRepository.update(
            { paymentIntentId: String(charge.payment_intent) },
            { statut: 'refunded' },
          );
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.transactionRepository.update(
          { paymentIntentId: pi.id },
          { statut: 'failed' },
        );
        break;
      }
    }
  }

  async getTransactionsByContributeur(contributeurId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { contributeurId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAuthorizedTransactionsByCampagne(campagneId: number): Promise<Transaction[]> {
    return this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.contribution', 'c')
      .innerJoin('c.campagne', 'camp')
      .where('camp.id = :campagneId', { campagneId })
      .andWhere('t.statut = :statut', { statut: 'authorized' })
      .getMany();
  }
}
