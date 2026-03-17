import { IsString, IsNotEmpty, IsIn } from 'class-validator'
import type { RoleEnum } from "../entities/role.entity"

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    prenom: string

    @IsString()
    @IsNotEmpty()
    nom: string

    @IsString()
    @IsNotEmpty()
    username: string

    @IsString()
    @IsNotEmpty()
    password: string

    @IsIn(['ADMINISTRATEUR', 'USER'])
    role: RoleEnum
}
