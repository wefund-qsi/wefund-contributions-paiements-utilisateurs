import { RoleEnum } from "../entities/role.entity"

export class CreateUserDto {
    prenom: string
    nom: string
    username: string
    password: string
    role: RoleEnum
}