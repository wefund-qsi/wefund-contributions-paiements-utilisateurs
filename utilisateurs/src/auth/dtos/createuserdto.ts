import { IsString, IsNotEmpty, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import type { RoleEnum } from "../entities/role.entity"

export class CreateUserDto {
    @ApiProperty({ example: 'Jean', description: 'Prénom de l\'utilisateur' })
    @IsString()
    @IsNotEmpty()
    prenom: string

    @ApiProperty({ example: 'Dupont', description: 'Nom de l\'utilisateur' })
    @IsString()
    @IsNotEmpty()
    nom: string

    @ApiProperty({ example: 'jdupont', description: 'Nom d\'utilisateur unique' })
    @IsString()
    @IsNotEmpty()
    username: string

    @ApiProperty({ example: 'motdepasse123', description: 'Mot de passe' })
    @IsString()
    @IsNotEmpty()
    password: string

    @ApiProperty({ example: 'USER', enum: ['ADMINISTRATEUR', 'USER'], description: 'Rôle de l\'utilisateur' })
    @IsIn(['ADMINISTRATEUR', 'USER'])
    role: RoleEnum
}
