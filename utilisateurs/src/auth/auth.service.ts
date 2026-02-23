import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
    ) {}

    async createUser(user: Partial<User>) : Promise<User> {
        return this.userRepository.save(user)
    }

    async createAuth(auth: Partial<Auth>) : Promise<Auth> {
        return this.authRepository.save(auth)
    }
    
    async createRole(role: Partial<Role>) : Promise<Role> {
        return this.roleRepository.save(role)
    }

    async findUsersByUsername(username: string): Promise<User> {
        return this.userRepository.query('SELECT * FROM user WHERE username = ?', [username]);
    }

    async findAuthByUserId(userId: string): Promise<Auth> {
        return this.authRepository.query('SELECT * FROM user WHERE userId = ?', [userId]);
    }
}