import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  createQueryBuilder: jest.fn(),
});

describe('PaymentService', () => {
  let service: PaymentService;
  let transactionRepo: ReturnType<typeof mockRepo>;
  let campagneRepo: ReturnType<typeof mockRepo>;

  const activeCampagne = {
    id: 'camp-uuid-1',
    statut: StatutCampagne.ACTIVE,
  } as CampagneEntity;

  const closedCampagne = {
    id: 'camp-uuid-2',
    statut: StatutCampagne.ECHOUEE,
  } as CampagneEntity;

  const tx1 = { id: 'tx-1', paymentIntentId: 'pi_1', statut: 'authorized' } as Transaction;
  const tx2 = { id: 'tx-2', paymentIntentId: 'pi_2', statut: 'authorized' } as Transaction;

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
    campagneRepo = module.get(getRepositoryToken(CampagneEntity));
  });

  afterEach(() => jest.clearAllMocks());

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ── RG4 / RG5 : séquestre Stripe ────────────────────────────────────────────
  describe('createPaymentIntent', () => {
    it('lève NotFoundException si la campagne est introuvable', async () => {
      campagneRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent('c-1', 100, 'camp-uuid-X', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lève BadRequestException si la campagne n\'est pas ACTIVE', async () => {
      campagneRepo.findOne.mockResolvedValue(closedCampagne);

      await expect(
        service.createPaymentIntent('c-1', 100, 'camp-uuid-2', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lève BadRequestException si le montant est nul ou négatif', async () => {
      campagneRepo.findOne.mockResolvedValue(activeCampagne);

      await expect(
        service.createPaymentIntent('c-1', 0, 'camp-uuid-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('crée un PaymentIntent et une Transaction en DB (séquestre)', async () => {
      campagneRepo.findOne.mockResolvedValue(activeCampagne);
      const tx = { id: 'tx-uuid-1' } as Transaction;
      transactionRepo.create.mockReturnValue(tx);
      transactionRepo.save.mockResolvedValue(tx);

      const result = await service.createPaymentIntent('c-1', 150, 'camp-uuid-1', 'user-1');

      expect(transactionRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('clientSecret');
      expect(result).toHaveProperty('transactionId');
    });
  });

  // ── Story 3 : remboursement automatique ─────────────────────────────────────
  describe('refundAllForCampaign', () => {
    const buildQb = (results: Transaction[]) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(results),
    });

    it('rembourse toutes les transactions authorized de la campagne', async () => {
      transactionRepo.createQueryBuilder.mockReturnValue(buildQb([tx1, tx2]));
      transactionRepo.update.mockResolvedValue({});
      const refundSpy = jest.spyOn(service, 'refundPayment').mockResolvedValue();

      await service.refundAllForCampaign('camp-uuid-1');

      expect(refundSpy).toHaveBeenCalledTimes(2);
      expect(refundSpy).toHaveBeenCalledWith('pi_1');
      expect(refundSpy).toHaveBeenCalledWith('pi_2');
    });

    it('ne fait rien si aucune transaction n\'est autorisée', async () => {
      transactionRepo.createQueryBuilder.mockReturnValue(buildQb([]));
      const refundSpy = jest.spyOn(service, 'refundPayment').mockResolvedValue();

      await service.refundAllForCampaign('camp-uuid-1');

      expect(refundSpy).not.toHaveBeenCalled();
    });

    it('continue si une transaction échoue au remboursement', async () => {
      transactionRepo.createQueryBuilder.mockReturnValue(buildQb([tx1, tx2]));
      const refundSpy = jest
        .spyOn(service, 'refundPayment')
        .mockRejectedValueOnce(new Error('Stripe error'))
        .mockResolvedValueOnce(undefined);

      await expect(service.refundAllForCampaign('camp-uuid-1')).resolves.toBeUndefined();
      expect(refundSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ── RG5 : capture des fonds (campagne réussie) ───────────────────────────────
  describe('captureAllForCampaign', () => {
    const buildQb = (results: Transaction[]) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(results),
    });

    it('capture toutes les transactions authorized de la campagne', async () => {
      transactionRepo.createQueryBuilder.mockReturnValue(buildQb([tx1, tx2]));
      transactionRepo.update.mockResolvedValue({});
      const captureSpy = jest.spyOn(service, 'capturePayment').mockResolvedValue();

      await service.captureAllForCampaign('camp-uuid-1');

      expect(captureSpy).toHaveBeenCalledTimes(2);
      expect(captureSpy).toHaveBeenCalledWith('pi_1');
      expect(captureSpy).toHaveBeenCalledWith('pi_2');
    });

    it('continue si une capture échoue', async () => {
      transactionRepo.createQueryBuilder.mockReturnValue(buildQb([tx1]));
      const captureSpy = jest
        .spyOn(service, 'capturePayment')
        .mockRejectedValue(new Error('Stripe capture error'));

      await expect(service.captureAllForCampaign('camp-uuid-1')).resolves.toBeUndefined();
      expect(captureSpy).toHaveBeenCalledTimes(1);
    });
  });
});
