import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { PaymentService } from '../src/payment/payment.service';
import { Transaction } from '../src/payment/entities/transaction.entity';
import { Contribution } from '../src/contribution/entities/contribution.entity';
import { User } from '../src/auth/entities/user.entity';
import { Auth } from '../src/auth/entities/auth.entity';
import { Role } from '../src/auth/entities/role.entity';
import { ProjectsApiClient } from '../src/projects/projects-api.client';

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_integration_1', client_secret: 'secret_1' }),
      cancel: jest.fn().mockResolvedValue({}),
      capture: jest.fn().mockResolvedValue({}),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({}),
    },
  }));
});

describe('PaymentService (integration)', () => {
  let moduleRef: TestingModule;
  let service: PaymentService;
  let dataSource: DataSource;
  let transactionRepo: Repository<Transaction>;
  let contributionRepo: Repository<Contribution>;
  let userRepo: Repository<User>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DATABASE_HOST || 'localhost',
          port: Number(process.env.DATABASE_PORT || 5432),
          username: process.env.DATABASE_USER || 'postgres',
          password: process.env.DATABASE_PASSWORD || 'password',
          database: process.env.DATABASE_NAME || 'wefund_test',
          entities: [User, Auth, Role, Contribution, Transaction],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Transaction, Contribution, User]),
      ],
      providers: [
        PaymentService,
        {
          provide: ProjectsApiClient,
          useValue: {
            getCampagneById: jest.fn().mockResolvedValue({ id: 'camp-1', statut: 'ACTIVE' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('sk_test_dummy'),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PaymentService);
    dataSource = moduleRef.get(DataSource);
    transactionRepo = moduleRef.get(getRepositoryToken(Transaction));
    contributionRepo = moduleRef.get(getRepositoryToken(Contribution));
    userRepo = moduleRef.get(getRepositoryToken(User));
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE transactions, contributions, "user" RESTART IDENTITY CASCADE;',
      );
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('crée une transaction pending persistée avec createPaymentIntent', async () => {
    const user = await userRepo.save({
      nom: 'Pay',
      prenom: 'User',
      username: 'pay-user-1',
    });

    const contribution = await contributionRepo.save(
      contributionRepo.create({
        montant: 150,
        campagneId: 'camp-1',
        contributeur: user,
      }),
    );

    const result = await service.createPaymentIntent(contribution.id, 150, 'camp-1', user.id);

    expect(result.clientSecret).toBe('secret_1');
    expect(result.transactionId).toBeDefined();

    const tx = await transactionRepo.findOne({ where: { id: result.transactionId } });
    expect(tx).not.toBeNull();
    expect(tx!.statut).toBe('pending');
    expect(tx!.contributionId).toBe(contribution.id);
  });

  it('met la transaction en refunded lors de refundContribution sur une tx authorized', async () => {
    const user = await userRepo.save({
      nom: 'Refund',
      prenom: 'User',
      username: 'refund-user-1',
    });

    const contribution = await contributionRepo.save(
      contributionRepo.create({
        montant: 90,
        campagneId: 'camp-1',
        contributeur: user,
      }),
    );

    const tx = await transactionRepo.save(
      transactionRepo.create({
        paymentIntentId: 'pi_to_refund',
        montant: 90,
        statut: 'authorized',
        contributionId: contribution.id,
        campagneId: 'camp-1',
        contributeurId: user.id,
      }),
    );

    await service.refundContribution(contribution.id, user.id);

    const refreshed = await transactionRepo.findOne({ where: { id: tx.id } });
    expect(refreshed).not.toBeNull();
    expect(refreshed!.statut).toBe('refunded');
  });
});