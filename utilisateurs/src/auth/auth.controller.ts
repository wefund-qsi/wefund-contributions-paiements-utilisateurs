import { Body, Controller, Post, Get, Request, UseGuards, HttpCode, HttpStatus, ConflictException, UnauthorizedException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { CreateUserDto } from './dtos/createuserdto';
import { LoginUserDto } from './dtos/loginuserdto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    async postSignup(@Body() createUserDto: CreateUserDto) {
        try {
            const existingUser = await this.authService.findUsersByUsername(createUserDto.username);
            if (existingUser) {
                throw new ConflictException('Username already exists');
            }

            let userRow = {
                nom: createUserDto.nom,
                prenom: createUserDto.prenom,
                username: createUserDto.username
            };
            let createUserResult = await this.authService.createUser(userRow);

            let authRow = {
                password: createUserDto.password,
                userId: createUserResult.id
            };
            await this.authService.createAuth(authRow);

            let roleRow = {
                role: createUserDto.role,
                userId: createUserResult.id
            };
            await this.authService.createRole(roleRow);

            return {
                statusCode: HttpStatus.CREATED,
                message: 'User, auth and role created successfully',
                data: {
                    id: createUserResult.id,
                    nom: createUserResult.nom,
                    prenom: createUserResult.prenom,
                    username: createUserResult.username,
                    role: createUserDto.role
                },
                timestamp: new Date().toISOString()
            };

        } catch (err) {
            if (err instanceof ConflictException) {
                throw err;
            }
            console.error('[signup] unexpected error:', err);
            throw new InternalServerErrorException('An unexpected error occurred during signup');
        }
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async postLogin(@Body() loginUserDto: LoginUserDto) {
        try {
            const result = await this.authService.signIn(loginUserDto.username, loginUserDto.password);

            return {
                statusCode: HttpStatus.OK,
                message: 'Login successful',
                data: {
                    access_token: result.access_token,
                },
                timestamp: new Date().toISOString()
            };

        } catch (err) {
            if (err instanceof NotFoundException || 
                err instanceof UnauthorizedException || 
                err instanceof InternalServerErrorException) {
                throw err;
            }
            
            throw new InternalServerErrorException('An unexpected error occurred during login');
        }
    }

    @UseGuards(AuthGuard)
    @Get('profile')
    getProfile(@Request() req) {
        return req.user; 
    }
}