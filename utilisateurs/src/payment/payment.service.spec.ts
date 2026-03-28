import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';
import { Transaction } from './entities/transaction.entity';
import { Contribution } from '../contribution/entities/contribution.entity';
import { CampagneEntity, StatutCampagne } from '@projet1/campagnes/domain/campagne.entity';

// Stub Stripe pour éviter tout appel réseau
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test', client_secret: 'secret_test' }),
      capture: jest.fn().mockResolvedValue({}),
      cancel: jest.fn().mockResolvedValue({}),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({}),
    },
  }));
});

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('PaymentService', () => {
  let service: PaymentService;
  let transactionRepo: ReturnType<typeof mockRepo>;
  let contributionRepo: ReturnType<typeof mockRepo>;
  let campagneRepo: ReturnType<typeof mockRepo>;

  const activeCampagne = {
    id: 'camp-uuid-1',
    statut: StatutCampagne.ACTIVE,
  } as CampagneEntity;

  const closedCampagne = {
    id: 'camp-uuid-2',
    statut: StatutCampagne.ECHOUEE,
  } as CampagneEntity;

  const ownedContribution = {
    id: 'c-1',
    montant: 150,
    campagneId: 'camp-uuid-1',
    campagne: activeCampagne,
    contributeur: { id: 'user-1' },
  } as unknown as Contribution;

  const txAuthorized = {
    id: 'tx-1',
    paymentIntentId: 'pi_1',
    statut: 'authorized',
    contributionId: 'c-1',
    contributeurId: 'user-1',
    campagneId: 'camp-uuid-1',
  } as Transaction;

  const txCaptured = {
    ...txAuthorized,
    id: 'tx-2',
    paymentIntentId: 'pi_2',
    statut: 'captured',
  } as Transaction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Transaction), useFactory: mockRepo },
        { provide: getRepositoryToken(Contribution), useFactory: mockRepo },
        { provide: getRepositoryToken(CampagneEntity), useFactory: mockRepo },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('sk_test_dummy') },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    transactionRepo = module.get(getRepositoryToken(Transaction));
    contributionRepo = module.get(getRepositoryToken(Contribution));
    campagneRepo = module.get(getRepositoryToken(CampagneEntity));
  });

  afterEach(() => jest.clearAllMocks());

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ── RG4 / RG5 : séquestre Stripe ────────────────────────────────────────────
  describe('createPaymentIntent', () => {
    it('lève NotFoundException si la contribution est introuvable', async () => {
      contributionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('c-1', 100, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève ForbiddenException si contribution non propriétaire', async () => {
      contributionRepo.findOne.mockResolvedValue({
        ...ownedContribution,
        contributeur: { id: 'other-user' },
      });

      await expect(
        service.createPaymentIntent('c-1', 100, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lève BadRequestException si la contribution n\'appartient pas à la campagne', async () => {
      contributionRepo.findOne.mockResolvedValue({
        ...ownedContribution,
        campagneId: 'camp-uuid-999',
      });

      await expect(
        service.createPaymentIntent('c-1', 100, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si la campagne est introuvable', async () => {
      contributionRepo.findOne.mockResolvedValue({
        ...ownedContribution,
        campagneId: 'camp-uuid-X',
      });
      campagneRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('c-1', 150, 'camp-uuid-X', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si la campagne n\'est pas ACTIVE', async () => {
      contributionRepo.findOne.mockResolvedValue({
        ...ownedContribution,
        campagneId: 'camp-uuid-2',
      });
      campagneRepo.findOne.mockResolvedValue(closedCampagne);

      await expect(
        service.createPaymentIntent('c-1', 150, 'camp-uuid-2', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si le montant est nul ou négatif', async () => {
      contributionRepo.findOne.mockResolvedValue(ownedContribution);
      campagneRepo.findOne.mockResolvedValue(activeCampagne);

      await expect(
        service.createPaymentIntent('c-1', 0, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si montant différent de la contribution', async () => {
      contributionRepo.findOne.mockResolvedValue(ownedContribution);
      campagneRepo.findOne.mockResolvedValue(activeCampagne);

      await expect(
        service.createPaymentIntent('c-1', 100, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si une transaction est déjà en cours', async () => {
      contributionRepo.findOne.mockResolvedValue(ownedContribution);
      campagneRepo.findOne.mockResolvedValue(activeCampagne);
      transactionRepo.findOne.mockResolvedValue(txAuthorized);

      await expect(
        service.createPaymentIntent('c-1', 150, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée un PaymentIntent et une Transaction en DB (séquestre)', async () => {
      contributionRepo.findOne.mockResolvedValue(ownedContribution);
      campagneRepo.findOne.mockResolvedValue(activeCampagne);
      transactionRepo.findOne.mockResolvedValue(null);
      const tx = { id: 'tx-uuid-1' } as Transaction;
      transactionRepo.create.mockReturnValue(tx);
      transactionRepo.save.mockResolvedValue(tx);

      const result = await service.createPaymentIntent('c-1', 150, 'camp-uuid-1', 'user-1');

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ contributionId: 'c-1', campagneId: 'camp-uuid-1' }),
      );
      expect(transactionRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('transactionId');
    });
  });

  // ── Story 4 : remboursement manuel ──────────────────────────────────────────
  describe('refundContribution', () => {
    it('lève NotFoundException sans transaction remboursable', async () => {
      transactionRepo.findOne.mockResolvedValue(null);

      await expect(service.refundContribution('c-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('rembourse via refundPayment si transaction capturée', async () => {
      transactionRepo.findOne.mockResolvedValue(txCaptured);
      const refundSpy = jest.spyOn(service, 'refundPayment').mockResolvedValue();

      await service.refundContribution('c-1', 'user-1');

      expect(refundSpy).toHaveBeenCalledWith('pi_2');
    });

    it('annule un payment intent non capturé et met la transaction en refunded', async () => {
      transactionRepo.findOne.mockResolvedValue(txAuthorized);
      transactionRepo.update.mockResolvedValue({});
      const cancelSpy = jest.spyOn((service as any).stripe.paymentIntents, 'cancel');

      await service.refundContribution('c-1', 'user-1');

      expect(cancelSpy).toHaveBeenCalledWith('pi_1');
      expect(transactionRepo.update).toHaveBeenCalledWith({ id: 'tx-1' }, { statut: 'refunded' });
    });
  });

  // ── Story 3 : remboursement automatique ─────────────────────────────────────
  describe('refundAllForCampaign', () => {
    it('rembourse les capturées et annule les non capturées', async () => {
      transactionRepo.find.mockResolvedValue([txAuthorized, txCaptured]);
      transactionRepo.update.mockResolvedValue({});
      const refundSpy = jest.spyOn(service, 'refundPayment').mockResolvedValue();
      const cancelSpy = jest.spyOn((service as any).stripe.paymentIntents, 'cancel');

      await service.refundAllForCampaign('camp-uuid-1');

      expect(refundSpy).toHaveBeenCalledWith('pi_2');
      expect(cancelSpy).toHaveBeenCalledWith('pi_1');
    });

    it('ne fait rien si aucune transaction remboursable', async () => {
      transactionRepo.find.mockResolvedValue([]);
      const refundSpy = jest.spyOn(service, 'refundPayment').mockResolvedValue();

      await service.refundAllForCampaign('camp-uuid-1');

      expect(refundSpy).not.toHaveBeenCalled();
    });
  });

  // ── RG5 : capture des fonds (campagne réussie) ───────────────────────────────
  describe('captureAllForCampaign', () => {
    it('capture toutes les transactions authorized de la campagne', async () => {
      transactionRepo.find.mockResolvedValue([txAuthorized]);
      const captureSpy = jest.spyOn(service, 'capturePayment').mockResolvedValue();

      await service.captureAllForCampaign('camp-uuid-1');

      expect(captureSpy).toHaveBeenCalledTimes(1);
      expect(captureSpy).toHaveBeenCalledWith('pi_1');
    });

    it('continue si une capture échoue', async () => {
      transactionRepo.find.mockResolvedValue([txAuthorized]);
      const captureSpy = jest
        .spyOn(service, 'capturePayment')
        .mockRejectedValue(new Error('Stripe capture error'));

      await expect(service.captureAllForCampaign('camp-uuid-1')).resolves.toBeUndefined();
      expect(captureSpy).toHaveBeenCalledTimes(1);
    });
  });
});
