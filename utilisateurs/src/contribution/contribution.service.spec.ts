import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Campagne } from './entities/campagne.entity';
import { Contribution } from './entities/contribution.entity';
import { ContributionService } from './contribution.service';

const createRepositoryMock = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
});

describe('ContributionService', () => {
  let service: ContributionService;
  let contributionRepository: ReturnType<typeof createRepositoryMock>;
  let campagneRepository: ReturnType<typeof createRepositoryMock>;
  let userRepository: ReturnType<typeof createRepositoryMock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionService,
        {
          provide: getRepositoryToken(Contribution),
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(Campagne),
          useValue: createRepositoryMock(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: createRepositoryMock(),
        },
      ],
    }).compile();

    service = module.get<ContributionService>(ContributionService);
    contributionRepository = module.get(getRepositoryToken(Contribution));
    campagneRepository = module.get(getRepositoryToken(Campagne));
    userRepository = module.get(getRepositoryToken(User));

    delete process.env.MOCK_CONTRIBUTION_CAMPAIGN;
  });

  afterEach(() => {
    delete process.env.MOCK_CONTRIBUTION_CAMPAIGN;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create success', async () => {
    const dto = { campagneId: 1, montant: 50 };
    const campagne = { id: 1, statut: 'active' } as Campagne;
    const user = { id: 'user-1', username: 'alice' } as User;
    const createdContribution = {
      montant: 50,
      campagne,
      contributeur: user,
      timestamp: new Date(),
    } as Contribution;
    const savedContribution = { id: 10, ...createdContribution } as Contribution;

    campagneRepository.findOne.mockResolvedValue(campagne);
    userRepository.findOne.mockResolvedValue(user);
    contributionRepository.create.mockReturnValue(createdContribution);
    contributionRepository.save.mockResolvedValue(savedContribution);

    const result = await service.create('user-1', dto);

    expect(campagneRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    expect(contributionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        montant: 50,
        campagne,
        contributeur: user,
        timestamp: expect.any(Date),
      }),
    );
    expect(contributionRepository.save).toHaveBeenCalledWith(createdContribution);
    expect(result).toEqual(savedContribution);
  });

  it('create campagne inexistante', async () => {
    campagneRepository.findOne.mockResolvedValue(null);

    await expect(service.create('user-1', { campagneId: 1, montant: 50 })).rejects.toThrow(
      new NotFoundException('Campagne 1 introuvable'),
    );
    expect(userRepository.findOne).not.toHaveBeenCalled();
    expect(contributionRepository.save).not.toHaveBeenCalled();
  });

  it('create utilisateur introuvable', async () => {
    const campagne = { id: 1, statut: 'active' } as Campagne;

    campagneRepository.findOne.mockResolvedValue(campagne);
    userRepository.findOne.mockResolvedValue(null);

    await expect(service.create('user-1', { campagneId: 1, montant: 50 })).rejects.toThrow(
      new NotFoundException('Utilisateur introuvable'),
    );
    expect(contributionRepository.save).not.toHaveBeenCalled();
  });

  it('update mauvais proprietaire', async () => {
    const contribution = {
      id: 5,
      montant: 50,
      contributeur: { id: 'other-user' },
      campagne: { statut: 'active' },
    } as Contribution;

    contributionRepository.findOne.mockResolvedValue(contribution);

    await expect(service.update('user-1', 5, { montant: 150 })).rejects.toThrow(
      ForbiddenException,
    );
    expect(contributionRepository.save).not.toHaveBeenCalled();
  });

  it('update contribution inexistante', async () => {
    contributionRepository.findOne.mockResolvedValue(null);

    await expect(service.update('user-1', 5, { montant: 150 })).rejects.toThrow(
      new NotFoundException('Contribution 5 introuvable'),
    );
    expect(contributionRepository.save).not.toHaveBeenCalled();
  });

  it('remove campagne inactive', async () => {
    const contribution = {
      id: 5,
      montant: 50,
      contributeur: { id: 'user-1' },
      campagne: { statut: 'closed' },
    } as Contribution;

    contributionRepository.findOne.mockResolvedValue(contribution);

    await expect(service.remove('user-1', 5)).rejects.toThrow(BadRequestException);
    expect(contributionRepository.remove).not.toHaveBeenCalled();
  });

  it('remove mauvais proprietaire', async () => {
    const contribution = {
      id: 5,
      montant: 50,
      contributeur: { id: 'other-user' },
      campagne: { statut: 'active' },
    } as Contribution;

    contributionRepository.findOne.mockResolvedValue(contribution);

    await expect(service.remove('user-1', 5)).rejects.toThrow(ForbiddenException);
    expect(contributionRepository.remove).not.toHaveBeenCalled();
  });

  it('findAllByUser success', async () => {
    const contributions = [{ id: 1 }, { id: 2 }] as Contribution[];
    contributionRepository.find.mockResolvedValue(contributions);

    const result = await service.findAllByUser('user-1');

    expect(contributionRepository.find).toHaveBeenCalledWith({
      where: { contributeur: { id: 'user-1' } },
      relations: ['campagne', 'campagne.projet'],
    });
    expect(result).toEqual(contributions);
  });
});
