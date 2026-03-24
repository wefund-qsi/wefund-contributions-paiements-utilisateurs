import { Test, TestingModule } from '@nestjs/testing';
import { CampaignEventsConsumer } from './campaign-events.consumer';
import { PaymentService } from '../payment/payment.service';

describe('CampaignEventsConsumer', () => {
  let consumer: CampaignEventsConsumer;
  let paymentService: jest.Mocked<Pick<PaymentService, 'captureAllForCampaign' | 'refundAllForCampaign'>>;

  const successPayload = {
    campagneId: 'camp-uuid-1',
    projetId: 'proj-uuid-1',
    porteurId: 'porteur-uuid-1',
    statut: 'REUSSIE',
    objectif: 10000,
    montantCollecte: 12000,
    dateFin: '2026-03-01T00:00:00.000Z',
    occurredAt: '2026-03-01T12:00:00.000Z',
  };

  const failedPayload = { ...successPayload, statut: 'ECHOUEE', montantCollecte: 4000 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignEventsConsumer],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            captureAllForCampaign: jest.fn().mockResolvedValue(undefined),
            refundAllForCampaign: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    consumer = module.get(CampaignEventsConsumer);
    paymentService = module.get(PaymentService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── RG5 : campagne réussie ───────────────────────────────────────────────────
  describe('handleCampaignSuccess', () => {
    it('appelle captureAllForCampaign avec le campagneId du payload', async () => {
      await consumer.handleCampaignSuccess(successPayload);

      expect(paymentService.captureAllForCampaign).toHaveBeenCalledWith('camp-uuid-1');
      expect(paymentService.refundAllForCampaign).not.toHaveBeenCalled();
    });

    it('ne lance pas d\'exception si le payload est invalide (campagneId absent)', async () => {
      await expect(consumer.handleCampaignSuccess({} as any)).resolves.toBeUndefined();
      expect(paymentService.captureAllForCampaign).not.toHaveBeenCalled();
    });
  });

  // ── Story 3 : campagne échouée → remboursement auto ─────────────────────────
  describe('handleCampaignFailed', () => {
    it('appelle refundAllForCampaign avec le campagneId du payload', async () => {
      await consumer.handleCampaignFailed(failedPayload);

      expect(paymentService.refundAllForCampaign).toHaveBeenCalledWith('camp-uuid-1');
      expect(paymentService.captureAllForCampaign).not.toHaveBeenCalled();
    });

    it('ne lance pas d\'exception si le payload est invalide (campagneId absent)', async () => {
      await expect(consumer.handleCampaignFailed({} as any)).resolves.toBeUndefined();
      expect(paymentService.refundAllForCampaign).not.toHaveBeenCalled();
    });
  });

  // ── RG6 : modération (log seulement pour l'instant) ─────────────────────────
  describe('handleCampaignModerated', () => {
    it('ne déclenche aucune action de paiement', async () => {
      await consumer.handleCampaignModerated({ campagneId: 'camp-uuid-1', statut: 'ACTIVE' });

      expect(paymentService.captureAllForCampaign).not.toHaveBeenCalled();
      expect(paymentService.refundAllForCampaign).not.toHaveBeenCalled();
    });
  });
});
