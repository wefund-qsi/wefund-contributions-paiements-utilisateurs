import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ContributionController } from './contribution.controller';
import { ContributionService } from './contribution.service';
import { AuthGuard } from '../auth/auth.guard';

describe('ContributionController', () => {
  let controller: ContributionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionController],
      providers: [
        {
          provide: ContributionService,
          useValue: {
            create: jest.fn(),
            findAllByUser: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ContributionController>(ContributionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
