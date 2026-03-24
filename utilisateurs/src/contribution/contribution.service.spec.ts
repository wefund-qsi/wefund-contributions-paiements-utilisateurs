import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContributionService } from './contribution.service';
import { Contribution } from './entities/contribution.entity';
import { CampagneEntity, StatutCampagne } from '@projet1/campagnes/domain/campagne.entity';
import { User } from '../auth/entities/user.entity';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('ContributionService', () => {
  let service: ContributionService;
  let contributionRepo: ReturnType<typeof mockRepo>;
  let campagneRepo: ReturnType<typeof mockRepo>;
  let userRepo: ReturnType<typeof mockRepo>;

  const activeCampagne = { id: 'camp-uuid-1', statut: StatutCampagne.ACTIVE } as CampagneEntity;
  const closedCampagne = { id: 'camp-uuid-2', statut: StatutCampagne.ECHOUEE } as CampagneEntity;
  const user = { id: 'user-uuid-1' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionService,
        { provide: getRepositoryToken(Contribution), useFactory: mockRepo },
        { provide: getRepositoryToken(CampagneEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(User), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get(ContributionService);
    contributionRepo = module.get(getRepositoryToken(Contribution));
    campagneRepo = module.get(getRepositoryToken(CampagneEntity));
    userRepo = module.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  // ── Story 1 : financer une campagne ─────────────────────────────────────────
  describe('create', () => {
    const dto = { campagneId: 'camp-uuid-1', montant: 100 };

    it('crée une contribution pour une campagne ACTIVE', async () => {
      const contrib = { id: 'c-uuid-1', montant: 100 } as Contribution;
      campagneRepo.findOne.mockResolvedValue(activeCampagne);
      userRepo.findOne.mockResolvedValue(user);
      contributionRepo.create.mockReturnValue(contrib);
      contributionRepo.save.mockResolvedValue(contrib);

      const result = await service.create('user-uuid-1', dto);

      expect(campagneRepo.findOne).toHaveBeenCalledWith({ where: { id: 'camp-uuid-1' } });
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
      expect(contributionRepo.save).toHaveBeenCalled();
      expect(result).toEqual(contrib);
    });

    it('lève NotFoundException si la campagne est introuvable', async () => {
      campagneRepo.findOne.mockResolvedValue(null);

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(NotFoundException);
      expect(contributionRepo.save).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si la campagne n\'est pas ACTIVE (RG3)', async () => {
      campagneRepo.findOne.mockResolvedValue(closedCampagne);

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('lève NotFoundException si l\'utilisateur est introuvable', async () => {
      campagneRepo.findOne.mockResolvedValue(activeCampagne);
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Story 5 : modifier le montant ───────────────────────────────────────────
  describe('update', () => {
    const existingContrib = {
      id: 'c-uuid-1',
      montant: 50,
      contributeur: user,
      campagne: activeCampagne,
    } as unknown as Contribution;

    it('met à jour le montant si campagne ACTIVE et contributeur owner', async () => {
      contributionRepo.findOne.mockResolvedValue(existingContrib);
      contributionRepo.save.mockResolvedValue({ ...existingContrib, montant: 200 } as Contribution);

      const result = await service.update('user-uuid-1', 'c-uuid-1', { montant: 200 });

      expect(result.montant).toBe(200);
    });

    it('lève NotFoundException si la contribution est introuvable', async () => {
      contributionRepo.findOne.mockResolvedValue(null);

      await expect(service.update('user-uuid-1', 'c-uuid-X', { montant: 200 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lève ForbiddenException si l\'utilisateur n\'est pas le propriétaire', async () => {
      contributionRepo.findOne.mockResolvedValue(existingContrib);

      await expect(service.update('autre-user', 'c-uuid-1', { montant: 200 })).rejects.toThrow(
        ForbiddenException,
      );
      expect(contributionRepo.save).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si la campagne n\'est plus ACTIVE (RG3)', async () => {
      const contrib = { ...existingContrib, campagne: closedCampagne } as unknown as Contribution;
      contributionRepo.findOne.mockResolvedValue(contrib);

      await expect(service.update('user-uuid-1', 'c-uuid-1', { montant: 200 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── Story 4 / RG3 : annuler une contribution ────────────────────────────────
  describe('remove', () => {
    const existingContrib = {
      id: 'c-uuid-1',
      contributeur: user,
      campagne: activeCampagne,
    } as unknown as Contribution;

    it('annule la contribution si campagne ACTIVE et owner', async () => {
      contributionRepo.findOne.mockResolvedValue(existingContrib);
      contributionRepo.remove.mockResolvedValue(existingContrib);

      await expect(service.remove('user-uuid-1', 'c-uuid-1')).resolves.toBeUndefined();
      expect(contributionRepo.remove).toHaveBeenCalledWith(existingContrib);
    });

    it('lève ForbiddenException si non propriétaire', async () => {
      contributionRepo.findOne.mockResolvedValue(existingContrib);

      await expect(service.remove('autre-user', 'c-uuid-1')).rejects.toThrow(ForbiddenException);
      expect(contributionRepo.remove).not.toHaveBeenCalled();
    });

    it('lève BadRequestException si campagne non ACTIVE (RG3)', async () => {
      const contrib = { ...existingContrib, campagne: closedCampagne } as unknown as Contribution;
      contributionRepo.findOne.mockResolvedValue(contrib);

      await expect(service.remove('user-uuid-1', 'c-uuid-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── Story 2 : consulter ses contributions ───────────────────────────────────
  describe('findAllByUser', () => {
    it('retourne les contributions triées par date DESC', async () => {
      const contributions = [{ id: 'c1' }, { id: 'c2' }] as Contribution[];
      contributionRepo.find.mockResolvedValue(contributions);

      const result = await service.findAllByUser('user-uuid-1');

      expect(contributionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contributeur: { id: 'user-uuid-1' } },
          order: { createdAt: 'DESC' },
        }),
      );
      expect(result).toHaveLength(2);
    });
  });
});
