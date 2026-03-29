import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ContributionService } from '../src/contribution/contribution.service';
import { Contribution } from '../src/contribution/entities/contribution.entity';
import { User } from '../src/auth/entities/user.entity';
import { Auth } from '../src/auth/entities/auth.entity';
import { Role } from '../src/auth/entities/role.entity';
import { PaymentService } from '../src/payment/payment.service';
import { ProjectsApiClient } from '../src/projects/projects-api.client';

describe('ContributionService (integration)', () => {
  let moduleRef: TestingModule;
  let service: ContributionService;
  let dataSource: DataSource;
  let contributionRepo: Repository<Contribution>;
  let userRepo: Repository<User>;
  let paymentService: { refundContribution: jest.Mock };
  let projectsApiClient: { getCampagneById: jest.Mock };

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
          entities: [User, Auth, Role, Contribution],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Contribution, User]),
      ],
      providers: [
        ContributionService,
        {
          provide: PaymentService,
          useValue: {
            refundContribution: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProjectsApiClient,
          useValue: {
            getCampagneById: jest.fn().mockResolvedValue({ id: 'camp-1', statut: 'ACTIVE' }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ContributionService);
    dataSource = moduleRef.get(DataSource);
    contributionRepo = moduleRef.get(getRepositoryToken(Contribution));
    userRepo = moduleRef.get(getRepositoryToken(User));
    paymentService = moduleRef.get(PaymentService);
    projectsApiClient = moduleRef.get(ProjectsApiClient);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (dataSource?.isInitialized) {
      await dataSource.query('TRUNCATE TABLE contributions, "user" RESTART IDENTITY CASCADE;');
    }
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('persiste une contribution en DB pour une campagne active', async () => {
    const user = await userRepo.save({
      nom: 'Doe',
      prenom: 'Jane',
      username: 'jane-contrib',
    });

    const created = await service.create(user.id, { campagneId: 'camp-1', montant: 120 });

    expect(projectsApiClient.getCampagneById).toHaveBeenCalledWith('camp-1');
    expect(created.id).toBeDefined();

    const persisted = await contributionRepo.findOne({
      where: { id: created.id },
      relations: ['contributeur'],
    });

    expect(persisted).not.toBeNull();
    expect(Number(persisted!.montant)).toBe(120);
    expect(persisted!.contributeur.id).toBe(user.id);
  });

  it('supprime la contribution et appelle le remboursement lors de remove', async () => {
    const user = await userRepo.save({
      nom: 'Doe',
      prenom: 'John',
      username: 'john-remove',
    });

    const contribution = await contributionRepo.save(
      contributionRepo.create({
        montant: 80,
        campagneId: 'camp-1',
        contributeur: user,
      }),
    );

    await service.remove(user.id, contribution.id);

    expect(paymentService.refundContribution).toHaveBeenCalledWith(contribution.id, user.id);

    const stillThere = await contributionRepo.findOne({ where: { id: contribution.id } });
    expect(stillThere).toBeNull();
  });
});