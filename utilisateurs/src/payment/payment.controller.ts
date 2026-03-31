import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto';
import { AuthGuard } from '../auth/auth.guard';
import { Transaction } from './entities/transaction.entity';

@ApiTags('Paiements')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  // POST /payment/intent — Crée un PaymentIntent Stripe (séquestre)
  @UseGuards(AuthGuard)
  @Post('intent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un PaymentIntent Stripe (Story 1)', description: 'Crée un intent de paiement Stripe en séquestre pour une contribution. Le montant est capturé uniquement si la campagne atteint son objectif.' })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiResponse({ status: 201, description: 'PaymentIntent créé — retourne clientSecret Stripe' })
  @ApiResponse({ status: 400, description: 'Données invalides ou contribution introuvable' })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: Request & { user: { sub: string } },
  ) {
    const contributeurId = req.user.sub;
    return this.paymentService.createPaymentIntent(
      dto.contributionId,
      dto.montant,
      dto.campagneId,
      contributeurId,
    );
  }

  // GET /payment/contributions — Historique des transactions de l'utilisateur (Story 2)
  @UseGuards(AuthGuard)
  @Get('contributions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des transactions (Story 2)', description: 'Retourne toutes les transactions Stripe de l\'utilisateur connecté.' })
  @ApiResponse({ status: 200, description: 'Liste des transactions', type: [Transaction] })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  async getMesContributions(
    @Req() req: Request & { user: { sub: string } },
  ) {
    const contributeurId = req.user.sub;
    return this.paymentService.getTransactionsByContributeur(contributeurId);
  }

  // POST /payment/webhook — Notifications Stripe (public, pas de AuthGuard)
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook Stripe (Story 3 & 4)', description: 'Endpoint public appelé par Stripe. Traite les événements payment_intent.succeeded / canceled pour déclencher les remboursements automatiques ou manuels. Ne pas appeler manuellement.' })
  @ApiResponse({ status: 200, description: 'Événement reçu et traité' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(@Req() req: any) {
    const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    const stripeKey = this.configService.getOrThrow<string>('STRIPE_SECRET_KEY');
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-02-25.clover' });

    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    } catch {
      return { received: false };
    }

    await this.paymentService.handleWebhookEvent(event);
    return { received: true };
  }
}

