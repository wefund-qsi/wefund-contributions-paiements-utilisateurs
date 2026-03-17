import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  // POST /payment/intent — Crée un PaymentIntent Stripe (séquestre)
  @UseGuards(AuthGuard)
  @Post('intent')
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
  async getMesContributions(
    @Req() req: Request & { user: { sub: string } },
  ) {
    const contributeurId = req.user.sub;
    return this.paymentService.getTransactionsByContributeur(contributeurId);
  }

  // POST /payment/webhook — Notifications Stripe (public, pas de AuthGuard)
  @Post('webhook')
  @HttpCode(200)
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

