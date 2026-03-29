import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { User } from '../src/auth/entities/user.entity';
import { Auth } from '../src/auth/entities/auth.entity';
import { Role } from '../src/auth/entities/role.entity';
import { Contribution } from '../src/contribution/entities/contribution.entity';

describe('Auth flow (integration)', () => {
  let moduleRef: TestingModule;
  let controller: AuthController;
  let dataSource: DataSource;
  let userRepo: Repository<User>;
  let authRepo: Repository<Auth>;
  let roleRepo: Repository<Role>;

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
        TypeOrmModule.forFeature([User, Auth, Role]),
        JwtModule.register({ secret: 'integration-test-secret' }),
      ],
      controllers: [AuthController],
      providers: [AuthService],
    }).compile();

    controller = moduleRef.get(AuthController);
    dataSource = moduleRef.get(DataSource);
    userRepo = moduleRef.get(getRepositoryToken(User));
    authRepo = moduleRef.get(getRepositoryToken(Auth));
    roleRepo = moduleRef.get(getRepositoryToken(Role));
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'TRUNCATE TABLE contributions, auth, role, "user" RESTART IDENTITY CASCADE;',
      );
    }
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('signup persiste user/auth/role avec mot de passe hashé', async () => {
    const response = await controller.postSignup({
      prenom: 'Alice',
      nom: 'Martin',
      username: 'alice-integration',
      password: 'S3cret!',
      role: 'USER',
    });

    expect(response.statusCode).toBe(201);
    expect(response.data.username).toBe('alice-integration');

    const user = await userRepo.findOne({ where: { username: 'alice-integration' } });
    expect(user).not.toBeNull();

    const auth = await authRepo.findOne({ where: { userId: user!.id } });
    expect(auth).not.toBeNull();
    expect(auth!.password).not.toBe('S3cret!');

    const passwordMatches = await bcrypt.compare('S3cret!', auth!.password);
    expect(passwordMatches).toBe(true);

    const role = await roleRepo.findOne({ where: { userId: user!.id } });
    expect(role).not.toBeNull();
    expect(role!.role).toBe('USER');
  });

  it('login retourne un access_token valide après signup', async () => {
    await controller.postSignup({
      prenom: 'Bob',
      nom: 'Durand',
      username: 'bob-integration',
      password: 'P@ssw0rd',
      role: 'ADMINISTRATEUR',
    });

    const login = await controller.postLogin({
      username: 'bob-integration',
      password: 'P@ssw0rd',
    });

    expect(login.statusCode).toBe(200);
    expect(typeof login.data.access_token).toBe('string');
    expect(login.data.access_token.length).toBeGreaterThan(20);
  });

  it('refuse signup si le username existe deja', async () => {
    const payload = {
      prenom: 'Same',
      nom: 'User',
      username: 'duplicate-signup',
      password: 'P@ssw0rd',
      role: 'USER' as const,
    };

    await controller.postSignup(payload);

    await expect(controller.postSignup(payload)).rejects.toThrow(ConflictException);
  });
});