import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Auth } from './entities/auth.entity';
import { Role } from './entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Auth, Role])
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {}