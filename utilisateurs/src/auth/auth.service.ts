import { Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { Auth } from './entities/auth.entity';
import { Role } from './entities/role.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private userRepository: Repository<User>,
        @InjectRepository(Auth) private authRepository: Repository<Auth>,
        @InjectRepository(Role) private roleRepository: Repository<Role>,
        private jwtService: JwtService,
    ) {}

    async createUser(user: Partial<User>) : Promise<User> {
        return this.userRepository.save(user);
    }

    async createAuth(auth: { password: string; userId: string }): Promise<Auth> {
        const hashedPassword = await bcrypt.hash(auth.password, 10);
        return this.authRepository.save({ ...auth, password: hashedPassword });
    }
    
    async createRole(role: Partial<Role>) : Promise<Role> {
        return this.roleRepository.save(role);
    }

    async findUsersByUsername(username: string): Promise<User | null> {
        return this.userRepository
            .createQueryBuilder('user')
            .where('user.username = :username', { username })
            .getOne();
    }

    async findAuthByUserId(userId: string): Promise<Auth | null> {
        return this.authRepository
            .createQueryBuilder('auth')
            .where('auth.userId = :userId', { userId })
            .getOne();
    }

    async findRoleByUserId(userId: string): Promise<Role | null> {
        return this.roleRepository
            .createQueryBuilder('role')
            .where('role.userId = :userId', { userId })
            .getOne();
    }

    async signIn(username: string, pwd: string): Promise<{ access_token: string }> {
        const user = await this.findUsersByUsername(username);
        if (!user) {
            throw new NotFoundException('Username not found');
        }
        const auth = await this.findAuthByUserId(user.id);
        if (!auth) {
            throw new InternalServerErrorException('Authentication data not found');
        }
        const isMatch = await bcrypt.compare(pwd, auth.password);
        if (!isMatch) {
            throw new UnauthorizedException('Password incorrect');
        }
        const role = await this.findRoleByUserId(user.id);
        const payload = { sub: user.id, username: user.username, role: role?.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
}